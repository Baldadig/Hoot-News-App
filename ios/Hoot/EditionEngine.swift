import Foundation
import JavaScriptCore
import os

// De Redacteur op de iPhone: dezelfde rekenkern als de website (src/lib/editionCore.js, gebundeld
// in Resources/edition-core.js) in één JavaScriptCore-context. Uit dezelfde invoer komt zo op web en
// telefoon byte voor byte dezelfde Editie (bouwspec §9; ios/HootTests/EditionParityTests.swift).
//
// Alles gaat als JSON heen en terug (Data, dus Sendable): Swift kent geen Set of Map, en zo blijft
// de grens tussen Swift en JavaScript één regel. De context laadt de bundel één keer, lui, en al het
// rekenwerk loopt op een eigen seriële wachtrij: nooit op de main actor, want zonder JIT duurt
// samenstellen op een toestel ongeveer een seconde (EditionParityTests meet het).
final class EditionEngine: @unchecked Sendable {
    static let shared = EditionEngine()

    enum Failure: LocalizedError {
        case bundleMissing // Resources/edition-core.js zit niet in de app (npm run build:core vergeten?)
        case bundleBroken(String) // de bundel laadt niet of zet HootCore niet
        case script(String) // een fout in het samenstellen zelf
        case noResult // HootCore gaf niets terug (null: geen algemene Editie in de invoer)

        var errorDescription: String? {
            switch self {
            case .bundleMissing: "De rekenkern (edition-core.js) ontbreekt in de app."
            case .bundleBroken(let s): "De rekenkern laadt niet: \(s)"
            case .script(let s): "De rekenkern gaf een fout: \(s)"
            case .noResult: "De rekenkern gaf geen Editie terug."
            }
        }
    }

    private let queue: DispatchQueue
    private var context: JSContext? // alleen op `queue`
    private var loadFailure: Failure? // idem: één keer mislukt laden blijft mislukt
    private var exception: String? // de laatste JavaScript-fout, gezet door de exceptionHandler
    private static let log = Logger(subsystem: "nl.hootnews.Hoot", category: "edition-core")
    private static let signposter = OSSignposter(subsystem: "nl.hootnews.Hoot", category: "edition-core")

    // De laatste meting, voor wie het wil weten (Instellingen, tests). In seconden.
    private(set) var lastComposeTime: TimeInterval = 0

    // ---- De bundel ----
    private func loaded() throws -> JSContext {
        dispatchPrecondition(condition: .onQueue(queue))
        if let context { return context }
        if let loadFailure { throw loadFailure }
        guard let url = Bundle.main.url(forResource: "edition-core", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else {
            loadFailure = .bundleMissing
            throw Failure.bundleMissing
        }
        guard let ctx = JSContext() else {
            loadFailure = .bundleBroken("geen JSContext")
            throw loadFailure!
        }
        ctx.name = "HootCore"
        ctx.exceptionHandler = { [weak self] _, value in
            // Stack erbij als die er is: zo wijst een fout naar de regel in de bundel.
            let text = value?.toString() ?? "onbekende fout"
            let stack = value?.forProperty("stack")?.toString()
            self?.exception = stack.map { $0.isEmpty || $0 == "undefined" ? text : "\(text)\n\($0)" } ?? text
        }
        let state = Self.signposter.beginInterval("laden")
        let t0 = Date()
        exception = nil
        ctx.evaluateScript(source, withSourceURL: url)
        Self.signposter.endInterval("laden", state)
        if let exception {
            loadFailure = .bundleBroken(exception)
            throw loadFailure!
        }
        guard let core = ctx.objectForKeyedSubscript("HootCore"), core.isObject, core.forProperty("composeEdition").isObject || core.forProperty("composeEdition").toBool() else {
            loadFailure = .bundleBroken("HootCore ontbreekt na het laden")
            throw loadFailure!
        }
        Self.log.info("rekenkern geladen in \(Int(Date().timeIntervalSince(t0) * 1000)) ms (versie \(core.forProperty("CORE_VERSION")?.toInt32() ?? 0))")
        context = ctx
        geladen.withLock { $0 = true }
        return ctx
    }

    // Roept HootCore.<name>(...) aan en geeft de uitkomst als tekst (JSON) terug. Op `queue`.
    private func callNow(_ name: String, _ args: [any Sendable]) throws -> String {
        let ctx = try loaded()
        exception = nil
        guard let core = ctx.objectForKeyedSubscript("HootCore"), let result = core.invokeMethod(name, withArguments: args.map { $0 as Any }) else {
            throw Failure.script(exception ?? "\(name) gaf niets terug")
        }
        if let exception { throw Failure.script(exception) }
        if result.isNull || result.isUndefined { throw Failure.noResult }
        return result.toString()
    }

    // Dezelfde aanroep, maar vanaf elke wachtrij: het werk gebeurt op `queue`, de aanroeper wacht.
    private func call(_ name: String, _ args: [any Sendable]) async throws -> String {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String, Error>) in
            queue.async {
                cont.resume(with: Result { try self.callNow(name, args) })
            }
        }
    }

    // ---- Samenstellen ----
    // De invoer is één JSON-object (zie src/lib/editionCore.js voor de sleutels: global, stories, items,
    // sources, followed, interests, topics, favorites, affinity, taste, readIds, previous, now, builtAt,
    // owner); de uitkomst is de Editie als JSON met per plek het waarom, `basis` en `owner`.
    func compose(input: Data) async throws -> Data {
        let text = try await compose(inputJSON: String(decoding: input, as: UTF8.self))
        return Data(text.utf8)
    }

    func compose(inputJSON: String) async throws -> String {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String, Error>) in
            queue.async {
                cont.resume(with: Result { try self.composeNow(inputJSON: inputJSON) })
            }
        }
    }

    // Blokkerend, voor de tests (measure {}) — nooit vanaf de main actor in de app.
    func composeNow(inputJSON: String) throws -> String {
        let run = { () throws -> String in
            let state = Self.signposter.beginInterval("samenstellen")
            let t0 = Date()
            defer {
                Self.signposter.endInterval("samenstellen", state)
                self.lastComposeTime = Date().timeIntervalSince(t0)
                Self.log.info("Editie samengesteld in \(Int(self.lastComposeTime * 1000)) ms")
            }
            return try self.callNow("composeEdition", [inputJSON])
        }
        if DispatchQueue.getSpecific(key: queueKey) != nil { return try run() }
        return try queue.sync { try run() }
    }
    private let queueKey = DispatchSpecificKey<Bool>() // per rekenkern: elke heeft zijn eigen wachtrij en context

    // ---- Het voorstel van de bronnenstap (1.1.1, shared/voorstel.mjs) ----
    // Uit je interesses (en je eigen onderwerpen) de drie tot vijf bronnen bovenaan de bronnenstap, met per bron
    // een korte reden. Nil zonder interesses: dan de vaste Basis. Dezelfde regels als het web.
    // `on`: alvast gevolgd. Alleen een gratis bron (keuze r5-voorstel-betaald); een betaalde staat erbij, uit.
    struct VoorstelBron: Codable, Hashable, Sendable { let id: String; let why: String; var on: Bool = true }
    // `english`: de lezer volgt al een Engelstalige bron (opnieuw kiezen); anders alleen Nederlandse bronnen (Week · 4).
    func voorstel(sources: [Source], interests: [String], topics: [String], english: Bool = false) async throws -> [VoorstelBron]? {
        struct In: Encodable { let sources: [Source]; let interests: [String]; let topics: [String]; let english: Bool }
        let json = String(decoding: try JSONEncoder().encode(In(sources: sources, interests: interests, topics: topics, english: english)), as: UTF8.self)
        let out = try await call("voorstelJSON", [json])
        return try JSONDecoder().decode([VoorstelBron]?.self, from: Data(out.utf8))
    }

    // ---- Hulpstappen uit dezelfde bundel ----
    // De afdruk van bronnen en interesses (editionBasis, djb2): precies die van de website.
    func basis(followed: [String], interests: [String], topics: [String], favorites: [String]) async throws -> String {
        try await call("basisOf", [followed, interests, topics, favorites])
    }

    // De samenvatting van een vastgelegde Editie voor `history` (aanvulling H5), als JSON.
    func history(of editionJSON: String) async throws -> String {
        try await call("historyJSON", [editionJSON])
    }

    // De geschiedenis die bij het vastleggen van een Editie meegaat: de samenvattingen van de Edities
    // ervóór (nieuwste eerst, de laatste drie), nooit de Editie zelf — de vorm van het web (H5).
    func nextHistory(prior priorJSON: String, edition editionJSON: String) async throws -> String {
        try await call("nextHistoryJSON", [priorJSON, editionJSON])
    }

    // De Edities van vóór dit dagdeel uit wat dit toestel (`local`) en je account (`account`) vastlegden,
    // als JSON-lijst (Edities en/of history-regels, nieuwste eerst, de laatste drie): precies
    // earlierEditions op het web. Wat lokaal van een andere lezer is, telt niet mee. "null" voor niets.
    func earlier(local localJSON: String, account accountJSON: String, id: String, owner: String) async throws -> String {
        try await call("earlierEditionsJSON", [localJSON, accountJSON, id, owner])
    }

    // Het `previous` dat de rekenkern uit een lijst Edities en/of history-regels maakt (H3), plat als
    // JSON (atOf per verhaal als object), om na te kijken wat zij van toen kent — voor de tests.
    func previous(of listJSON: String) async throws -> String {
        try await call("previousJSON", [listJSON])
    }

    // De samenvatting van je leesprofiel die mee gaat naar de server (readingSummary in src/lib/affinity.js),
    // als JSON: precies wat het web stuurt. "null" zolang lezen nog niet meetelt.
    func readingSummary(_ affinityJSON: String) async throws -> String {
        try await call("readingSummaryJSON", [affinityJSON])
    }

    // Wat Hoot van je leerde (profileSummary, bouwspec §8): hetzelfde profiel als De Redacteur gebruikt,
    // uit dezelfde bundel, zodat Instellingen op web en app hetzelfde zeggen. Invoer als JSON (interests,
    // topics, affinity, taste, favorites, followed, sources, items).
    func profileSummary(input: Data) async throws -> ProfileSummary {
        let text = try await call("profileSummaryJSON", [String(decoding: input, as: UTF8.self)])
        return try JSONDecoder().decode(ProfileSummary.self, from: Data(text.utf8))
    }

    // ---- Volgen 1.5 (shared/volgzaak-weergave.mjs, in dezelfde bundel als het web) ----
    // Alle volgregels per lezer met JSON heen en terug, byte voor byte gelijk aan node (VolgzaakParityTests, uit
    // tests/fixtures/volgzaak-golden.json). `name`: volgzaakVoorrangJSON, volgzaakViewJSON, erSpeeldeAlJSON,
    // rubriekRegelJSON of volgtVanJSON.
    func volg(_ name: String, _ args: [String]) async throws -> String { try await call(name, args) }

    // Blokkerend, voor de Stroom: de voorrang ligt vast op het moment dat de grens vastgaat (StreamView), in dezelfde
    // tekenronde, zodat er niets verspringt. Klein werk (een lijst ids), maar de eerste keer laadt de bundel; daarom warmt
    // de app hem voor (`warm`) zodra je iets volgt. Nooit aangeroepen met de vlag uit of zonder gevolgde volgzaak.
    func volgNu(_ name: String, _ args: [String]) throws -> String {
        if DispatchQueue.getSpecific(key: queueKey) != nil { return try callNow(name, args) }
        return try queue.sync { try callNow(name, args) }
    }

    // De bundel alvast laden, op de eigen wachtrij (niet op de main actor).
    func warm() async {
        _ = try? await withCheckedThrowingContinuation { (cont: CheckedContinuation<Bool, Error>) in
            queue.async { cont.resume(with: Result { _ = try self.loaded(); return true }) }
        }
    }
    // Zonder te wachten: is de bundel al geladen? (Nooit queue.sync: dan wacht de main actor op het laden.)
    var isLoaded: Bool { geladen.withLock { $0 } }
    private let geladen = OSAllocatedUnfairLock(initialState: false)

    // De voorrang in de Stroom (volgzaakVoorrang): per stuk het label, en de stukken die bovenaan staan.
    struct Voorrang: Decodable, Equatable, Sendable {
        var labels: [String: StoryVolgzaak] = [:]
        var voorrang: [String] = []
        static let leeg = Voorrang()
    }
    func voorrangNu(_ invoer: Data) throws -> Voorrang {
        let out = try volgNu("volgzaakVoorrangJSON", [String(decoding: invoer, as: UTF8.self)])
        return try JSONDecoder().decode(Voorrang.self, from: Data(out.utf8))
    }

    // De pagina per lezer (volgzaakView) en "Er speelde al" (erSpeeldeAl).
    struct VolgVerhaal: Codable, Hashable, Sendable, Identifiable {
        var verhaal: String
        var kop: String
        var bron: String
        var url: String?
        var bronnen: Int
        var at: String?
        var buiten: Bool
        var id: String { verhaal }
    }
    struct VolgWeek: Decodable, Hashable, Sendable { var week: String; var verhalen: [VolgVerhaal] }
    struct VolgPagina: Decodable, Hashable, Sendable {
        var nieuw: [VolgVerhaal] = []
        var eerder: [VolgWeek] = []
        var aantal = 0
    }
    func volgzaakView(_ invoer: Data) async throws -> VolgPagina {
        let out = try await volg("volgzaakViewJSON", [String(decoding: invoer, as: UTF8.self)])
        return try JSONDecoder().decode(VolgPagina.self, from: Data(out.utf8))
    }
    func erSpeeldeAl(_ invoer: Data) async throws -> [VolgVerhaal] {
        let out = try await volg("erSpeeldeAlJSON", [String(decoding: invoer, as: UTF8.self)])
        return try JSONDecoder().decode([VolgVerhaal].self, from: Data(out.utf8))
    }

    // Een tweede rekenkern met een eigen context en wachtrij, voor de kleine volgregels (Volgen 1.5): de Stroom wacht zo
    // nooit op het samenstellen van een Editie (ongeveer een seconde zonder JIT) op de gewone wachtrij.
    static let volg = EditionEngine(label: "nl.hootnews.Hoot.volg-core")

    private init(label: String = "nl.hootnews.Hoot.edition-core") {
        queue = DispatchQueue(label: label, qos: .userInitiated)
        queue.setSpecific(key: queueKey, value: true)
    }
}
