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

    private let queue = DispatchQueue(label: "nl.hootnews.Hoot.edition-core", qos: .userInitiated)
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
        if DispatchQueue.getSpecific(key: Self.queueKey) != nil { return try run() }
        return try queue.sync { try run() }
    }
    private static let queueKey = DispatchSpecificKey<Bool>()

    // ---- Hulpstappen uit dezelfde bundel ----
    // De afdruk van bronnen en interesses (editionBasis, djb2): precies die van de website.
    func basis(followed: [String], interests: [String], topics: [String], favorites: [String]) async throws -> String {
        try await call("basisOf", [followed, interests, topics, favorites])
    }

    // De samenvatting van een vastgelegde Editie voor `history` (aanvulling H5), als JSON.
    func history(of editionJSON: String) async throws -> String {
        try await call("historyJSON", [editionJSON])
    }

    // De geschiedenis na het vastleggen van een Editie: deze voorop, de laatste drie.
    func nextHistory(prior priorJSON: String, edition editionJSON: String) async throws -> String {
        try await call("nextHistoryJSON", [priorJSON, editionJSON])
    }

    // Het `previous` dat de rekenkern uit een lijst Edities en/of history-regels maakt (H3), plat als
    // JSON (atOf per verhaal als object), om na te kijken wat zij van toen kent — voor de tests.
    func previous(of listJSON: String) async throws -> String {
        try await call("previousJSON", [listJSON])
    }

    // Wat Hoot van je leerde (profileSummary, bouwspec §8): hetzelfde profiel als De Redacteur gebruikt,
    // uit dezelfde bundel, zodat Instellingen op web en app hetzelfde zeggen. Invoer als JSON (interests,
    // topics, affinity, taste, favorites, followed, sources, items).
    func profileSummary(input: Data) async throws -> ProfileSummary {
        let text = try await call("profileSummaryJSON", [String(decoding: input, as: UTF8.self)])
        return try JSONDecoder().decode(ProfileSummary.self, from: Data(text.utf8))
    }

    private init() {
        queue.setSpecific(key: Self.queueKey, value: true)
    }
}
