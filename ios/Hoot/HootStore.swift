import Foundation
import Observation
import os

// De staat van de app: wat de server gaf, welke bronnen je volgt, wat je bewaarde en las.
// Voorkeuren in dezelfde vorm als de web-app (muted / enabled), zodat synchroniseren met je
// account later één op één kan.
@MainActor
@Observable
final class HootStore {
    enum Status: Equatable { case idle, loading, ready, failed }

    private(set) var status: Status = .idle
    private(set) var sources: [Source] = []
    private(set) var storiesById: [String: Story] = [:]
    private(set) var edition: Edition?
    private(set) var itemsById: [String: Item] = [:]
    private(set) var updatedAt: Date?
    private(set) var digest: Digest?
    private(set) var digestStatus: Status = .idle
    private var relatedVersion: String?
    private var related: [String: [Item]] = [:]
    private var relatedLoaded: String? // de versie waarmee `related` geladen is

    // Voorkeuren (bewaard op het toestel)
    var muted: Set<String> { didSet { save("hoot.muted", Array(muted)); synced() } }
    var enabled: Set<String> { didSet { save("hoot.enabled", Array(enabled)); synced() } }
    var digestFields: [String] { didSet { save("hoot.digestFields", digestFields); synced() } }
    // Bewaard en gelezen: in een eigen bestand (Application Support), niet in UserDefaults; gelezen
    // op volgorde, zodat we bij de grens van 2.000 de oudste vergeten en niet een willekeurige.
    private(set) var saved: [Item] { didSet { Self.write(saved, to: "saved.json"); synced() } }
    private var readOrder: [String] { didSet { Self.write(readOrder, to: "read.json"); synced() } }
    private var readSet: Set<String> = []

    // Weergave en lezen (zelfde namen en waarden als de web-app, voor het synchroniseren later)
    var images: String { didSet { save("hoot.images", images); synced() } } // aan | hoofd | uit
    // Lees de Stroom als: tijdlijn (kop, intro, beeld over de volle breedte) of krant (klein beeld rechts).
    var layout: String { didSet { save("hoot.layout", layout); synced() } } // tijdlijn | krant
    var bubble: Bool { didSet { save("hoot.bubble", bubble); synced() } } // "Buiten je bubbel" in de Editie
    var openInSafari: Bool { didSet { save("hoot.openInSafari", openInSafari) } } // vóór 0.12; nu `openWith`
    // Waar artikelen openen: "lezer" (de Hoot-lezer) of "safari" (de Safari-app, waar je al bent ingelogd).
    var openWith: String { didSet { save("hoot.openWith", openWith) } }
    var preview: Int { didSet { save("hoot.preview", preview); synced() } } // regels intro bij een bericht; 0 = de hele intro
    var onboarded: Bool { didSet { save("hoot.onboarded", onboarded) } } // het welkom is gezien
    // Het welkom opnieuw, vanuit Instellingen: het begint bij je huidige keuzes. Niet bewaard.
    var welcomeAgain = false
    // Een seintje bij een nieuwe Editie (EditionAlerts), per dagdeel aan of uit. Alleen op dit
    // toestel: niet `synced()`, want toestemming geldt per toestel.
    var notify: Bool { didSet { save("hoot.notify", notify) } }
    var notifySlots: [String] { didSet { save("hoot.notifySlots", notifySlots) } }
    // Jouw editie: je interesses (src/lib/topics.js), voorkeursbronnen (ster) en smaak (wat je leest).
    var interests: [String] { didSet { save("hoot.interests", interests); refreshPersonal(); synced() } }
    // Wat precies? De onderwerpen die je volgt, opgelost zoals op de website (prefs.topics): per
    // interesse wat je aantikte, of alle als je daar niets koos. Leeg = alles binnen je interesses.
    var topics: [String] { didSet { save("hoot.topics", topics); refreshPersonal(); synced() } }
    var favorites: [String] { didSet { save("hoot.favorites", favorites); refreshPersonal(); synced() } }
    private(set) var affinity: Affinity { didSet { save("hoot.affinity", affinity) } }
    // Meer of minder hiervan (Models.swift: Taste): gaat mee met je account.
    var taste: Taste { didSet { save("hoot.taste", taste); synced() } }
    // Verhalen waar je "minder" op zei: in deze Editie ingeklapt (alleen op dit toestel).
    private(set) var less: [String] { didSet { save("hoot.less", less) } }
    // Jouw Editie van dit dagdeel (De Redacteur), vastgelegd in edition.json: `personal` is de vorm
    // voor de schermen, `personalRaw` de JSON zoals de rekenkern hem gaf (met alles wat de website
    // ook bewaart, zoals `history`) — die gaat ongewijzigd naar je account.
    private(set) var personal: Edition?
    private var personalRaw: [String: Any]?
    // Je account (Account.swift), voor de eigenaar van je Editie en user_state.edition.
    weak var account: Account?
    // Bluesky als eigen tabblad, met de vaste accounts van Hoot en wie je zelf toevoegt.
    var bluesky: Bool { didSet { save("hoot.bluesky", bluesky); synced(); if bluesky { reloadParts(); Task { await loadOwnPosts() } } } }
    private(set) var ownBluesky: [BlueskyAccount] { didSet { save("hoot.ownBluesky", ownBluesky); synced() } }
    private var ownPosts: [Item] = []

    // Laatste verversing mislukt: je ziet de versie van `updatedAt`.
    private(set) var stale = false
    // De Stroom, gesorteerd: één keer per laadactie of bronwijziging, niet bij elke weergave.
    private(set) var stream: [Item] = []
    // Tot waar je de Stroom zag (het nieuwste bericht toen je hem verliet), en de grens voor dit
    // bezoek: die schuift niet mee terwijl je leest, pas als je de Stroom opnieuw opent.
    private var streamSeen: Date? { didSet { save("hoot.streamSeen", streamSeen) } }
    private(set) var streamMark: Date?
    func openStream() { streamMark = DebugLaunch.seenMinutes.map { Date.now.addingTimeInterval(-$0 * 60) } ?? streamSeen }
    func leaveStream() { if let newest = stream.first?.date, newest > (streamSeen ?? .distantPast) { streamSeen = newest } }
    // Geteld zoals de Stroom ze toont: een stuk bij twee zusterkranten is één bericht (anders staat
    // de streep 'Daaronder heb je alles al gezien' te laag).
    var newInStream: Int { streamMark.map { mark in withoutCopies(stream).prefix { ($0.date ?? .distantPast) > mark }.count } ?? 0 }

    init() {
        muted = Set(Self.load("hoot.muted") ?? [String]())
        enabled = Set(Self.load("hoot.enabled") ?? [String]())
        quickPending = Self.load("hoot.quickPending") ?? false
        browsing = Self.load("hoot.browsing") ?? false
        digestFields = Self.load("hoot.digestFields") ?? [] // een nieuwe lezer kiest zijn vak zelf (of later)
        // Eenmalig overzetten uit UserDefaults (versie 0.3 en eerder).
        let oldSaved: [Item]? = Self.load("hoot.saved")
        let oldRead: [String]? = Self.load("hoot.read")
        let savedNow: [Item] = Self.read("saved.json") ?? oldSaved ?? []
        let readNow: [String] = Self.read("read.json") ?? oldRead ?? []
        saved = savedNow
        readOrder = readNow
        // Bewaard onleesbaar: dan niet doen alsof je alles verwijderde. Zonder basis vult je account
        // het weer aan, in plaats van het daar ook te wissen (Account.pull).
        if Self.unreadable.contains("saved.json") { UserDefaults.standard.removeObject(forKey: "hoot.savedBase") }
        readSet = Set(readNow)
        if oldSaved != nil || oldRead != nil {
            // Pas uit UserDefaults weghalen als het bestand er echt staat.
            Self.write(savedNow, to: "saved.json")
            Self.write(readNow, to: "read.json")
            if Self.read("saved.json") as [Item]? != nil { UserDefaults.standard.removeObject(forKey: "hoot.saved") }
            if Self.read("read.json") as [String]? != nil { UserDefaults.standard.removeObject(forKey: "hoot.read") }
        }
        images = Self.load("hoot.images") ?? "aan"
        layout = DebugLaunch.layout ?? Self.load("hoot.layout") ?? "tijdlijn"
        bubble = Self.load("hoot.bubble") ?? true
        openInSafari = Self.load("hoot.openInSafari") ?? false
        // Twee keuzes: de lezer of Safari. Wie "Op de website" had (tot 1.0.1), gaat naar Safari.
        let was: String = Self.load("hoot.openWith") ?? (Self.load("hoot.openInSafari") == true ? "safari" : "lezer")
        openWith = was == "web" ? "safari" : was
        streamSeen = Self.load("hoot.streamSeen") ?? nil
        preview = Self.load("hoot.preview") ?? 2
        // Het welkom alleen bij een verse installatie: wie al instellingen of gelezen stukken heeft
        // (bijvoorbeeld van vóór het welkom), heeft het niet nodig.
        let knownOnboarded: Bool? = Self.load("hoot.onboarded")
        let seen = knownOnboarded ?? UserDefaults.standard.dictionaryRepresentation().keys.contains { $0.hasPrefix("hoot.") }
        onboarded = seen
        // Meteen vastleggen: sluit iemand de app tijdens het eerste welkom, dan komt het de volgende keer terug.
        if knownOnboarded == nil { UserDefaults.standard.set(try? JSONEncoder().encode(seen), forKey: "hoot.onboarded") }
        #if DEBUG
        // Opnamen met een startargument (screenshots.sh, device-screens.sh) slaan het welkom over.
        if UserDefaults.standard.string(forKey: "HootStartTab") != nil { onboarded = true }
        // `-HootOnboarded YES`: het welkom overslaan maar wel het opstartscherm (de overgang naar de Editie).
        if UserDefaults.standard.bool(forKey: "HootOnboarded") { onboarded = true }
        // `-HootFresh YES` of `-HootWelcomeStep …`: het welkom als nieuwe gebruiker.
        if DebugLaunch.fresh { onboarded = false }
        #endif
        notify = Self.load("hoot.notify") ?? false
        notifySlots = Self.load("hoot.notifySlots") ?? EditionAlerts.slots.map(\.id)
        interests = Self.load("hoot.interests") ?? []
        topics = Self.load("hoot.topics") ?? []
        favorites = Self.load("hoot.favorites") ?? []
        affinity = Self.load("hoot.affinity") ?? Affinity()
        taste = Self.load("hoot.taste") ?? Taste()
        less = Self.load("hoot.less") ?? []
        personal = Self.read("edition.json")
        personalRaw = Self.readRaw("edition.json")
        bluesky = Self.load("hoot.bluesky") ?? false
        ownBluesky = Self.load("hoot.ownBluesky") ?? []
        importSettings()
    }

    // Eenmalig instellingen overnemen (van je account op hootnews.nl), uit een bestand dat
    // `import.json` heet in de map van de app (Application Support/Hoot). Daarna weg.
    private struct Import: Decodable {
        struct Prefs: Decodable {
            var muted: [String]?
            var enabled: [String]?
            var vak: [String]?
            var images: String?
            var layout: String?
            var bubble: Bool?
            var bluesky: Bool?
            var preview: Int?
            var interests: [String]?
            var topics: [String]?
            var favorites: [String]?
            var social: [BlueskyAccount]? // eigen Bluesky-accounts, zoals op de website
            var taste: Taste?
            enum CodingKeys: String, CodingKey { case muted, enabled, vak, images, layout, bubble, bluesky, preview, interests, topics, favorites, social, taste }
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                muted = try? c.decodeIfPresent([String].self, forKey: .muted)
                enabled = try? c.decodeIfPresent([String].self, forKey: .enabled)
                vak = try? c.decodeIfPresent([String].self, forKey: .vak)
                images = try? c.decodeIfPresent(String.self, forKey: .images)
                layout = try? c.decodeIfPresent(String.self, forKey: .layout)
                bubble = try? c.decodeIfPresent(Bool.self, forKey: .bubble)
                bluesky = try? c.decodeIfPresent(Bool.self, forKey: .bluesky)
                interests = try? c.decodeIfPresent([String].self, forKey: .interests)
                topics = try? c.decodeIfPresent([String].self, forKey: .topics)
                favorites = try? c.decodeIfPresent([String].self, forKey: .favorites)
                social = try? c.decodeIfPresent([BlueskyAccount].self, forKey: .social)
                taste = try? c.decodeIfPresent(Taste.self, forKey: .taste)
                // Op de website is het 1, 2, 3 of "alles".
                preview = (try? c.decodeIfPresent(Int.self, forKey: .preview)) ?? ((try? c.decodeIfPresent(String.self, forKey: .preview)) == "alles" ? 0 : nil)
            }
        }
        var prefs: Prefs?
        var social: [BlueskyAccount]?
    }
    private func importSettings() {
        guard let file = Self.folder?.appendingPathComponent("import.json"), let data = try? Data(contentsOf: file) else { return }
        guard let found = try? JSONDecoder().decode(Import.self, from: data) else { return } // kapot: laten staan
        try? FileManager.default.removeItem(at: file)
        if let v = found.social { ownBluesky = v; save("hoot.ownBluesky", v) }
        apply(found.prefs)
    }
    // Alleen wat echt anders is: elke toewijzing laadt opnieuw (Bluesky, jouw editie), en dat zou
    // anders na elke synchronisatie gebeuren, ook als er niets veranderde.
    private func apply(_ p: Import.Prefs?, unite: Bool = false) {
        if let v = p?.muted, Set(v) != muted { muted = Set(v); save("hoot.muted", v) }
        if let v = p?.enabled, Set(v) != enabled { enabled = Set(v); save("hoot.enabled", v) }
        if let v = p?.vak, v != digestFields { digestFields = v; save("hoot.digestFields", v) }
        if let v = p?.images, v != images, ["aan", "hoofd", "uit"].contains(v) { images = v; save("hoot.images", v) }
        if let v = p?.layout, v != layout, ["tijdlijn", "krant"].contains(v) { layout = v; save("hoot.layout", v) }
        if let v = p?.bubble, v != bubble { bubble = v; save("hoot.bubble", v) }
        if let v = p?.bluesky, v != bluesky { bluesky = v; save("hoot.bluesky", v) }
        if let v = p?.preview, v != preview, (0 ... 3).contains(v) { preview = v; save("hoot.preview", v) }
        if let v = p?.interests, v != interests { interests = v; save("hoot.interests", v) }
        if let v = p?.topics, v != topics { topics = v; save("hoot.topics", v) }
        if let v = p?.favorites, v != favorites { favorites = v; save("hoot.favorites", v) }
        if let v = p?.taste, v != taste { taste = v; save("hoot.taste", v) }
        if let v = p?.social {
            // De eerste keer met een account (`unite`): wat hier al stond blijft erbij. Daarna gaat je
            // account voor, zodat ook weghalen op een ander toestel meekomt.
            let next = unite ? v + ownBluesky.filter { a in !v.contains { $0.handle == a.handle } } : v
            if next != ownBluesky { ownBluesky = next; Task { await loadOwnPosts() } }
        }
    }

    // ---- Synchroniseren met je account (Account.swift) ----
    // Elke wijziging die met je account meegaat, telt hier op; het account schrijft ze dan weg.
    // Wat van de server komt, telt niet mee (anders gaat het meteen weer terug).
    private(set) var syncTick = 0
    private var applyingRemote = false
    private func synced() { if !applyingRemote { syncTick &+= 1 } }

    // Je instellingen in de vorm van de website (SYNCED_PREFS in src/lib/sync.js), `layout` erbij.
    var syncedPrefs: [String: Any] {
        [
            "muted": muted.sorted(), "enabled": enabled.sorted(), "vak": digestFields, "images": images, "layout": layout,
            "bubble": bubble, "bluesky": bluesky, "preview": preview == 0 ? "alles" as Any : preview as Any,
            "interests": interests, "topics": topics, "favorites": favorites, "onboarded": true,
            "taste": ["topics": taste.topics, "sources": taste.sources],
            "social": ownBluesky.map { ["handle": $0.handle, "name": $0.name, "avatar": $0.avatar as Any] },
        ]
    }
    var readIds: [String] { readOrder }

    // Wat je account heeft: instellingen (als die er zijn), gelezen erbij, Bewaard zoals berekend.
    func applyRemote(prefs: Data?, read: [String], saved list: [Item]?, unite: Bool = false) {
        applyingRemote = true
        defer { applyingRemote = false }
        let following = followingIds
        if let prefs, let p = try? JSONDecoder().decode(Import.Prefs.self, from: prefs) {
            apply(p, unite: unite)
            onboarded = true
            browsing = false // je eigen keuzes staan er al
        }
        let new = read.filter { !readSet.contains($0) }
        if !new.isEmpty {
            readOrder = Array((new + readOrder).suffix(2000))
            readSet = Set(readOrder)
        }
        if let list, list != saved { saved = list }
        // Alleen opnieuw laden als je bronnen veranderden: synchroniseren gebeurt na elk geopend stuk.
        if followingIds != following {
            rebuildStream()
            reloadParts()
        }
        refreshPersonal()
    }
    private var followingIds: Set<String> { Set((followed + (bluesky ? followedSocial : [])).map(\.id)) }

    // Beeld tonen? `lead`: het hoofdverhaal of het eerste stuk van een vak.
    func showsImage(lead: Bool) -> Bool { images == "aan" || (images == "hoofd" && lead) }
    func clearRead() { readOrder = []; readSet = [] }
    func clearSaved() { saved = [] }

    // ---- Bronnen ----
    // Uit = wat je zelf uitzette, plus optionele bronnen die je (nog) niet aanzette.
    func isOn(_ s: Source) -> Bool { !muted.contains(s.id) && !((s.optional ?? false) && !enabled.contains(s.id)) }
    func setOn(_ s: Source, _ on: Bool) {
        if s.optional ?? false {
            if on { enabled.insert(s.id) } else { enabled.remove(s.id) }
            muted.remove(s.id)
        } else {
            if on { muted.remove(s.id) } else { muted.insert(s.id) }
        }
        rebuildStream()
        reloadParts()
        refreshPersonal()
    }
    // "Begin met lezen": een zachte landing. Alleen Nederlandse bronnen, allemaal gratis, dus elk
    // stuk is helemaal te lezen: nieuws, sport, tech en cultuur. Zelfde set als de website
    // (STARTER in src/lib/topics.js); later aan te passen bij Bronnen.
    static let starterGroups: [(label: String, ids: [String])] = [
        ("Nieuws", ["nos", "nu", "rtl"]), ("Sport", ["nos-sport", "vi"]), ("Tech", ["tweakers"]), ("Cultuur", ["nos-cultuur", "3voor12"]),
    ]
    static let starter = starterGroups.flatMap(\.ids)
    func quickStart(ids: [String] = HootStore.starter) {
        let set = Set(ids)
        enabled = set
        if sources.isEmpty {
            quickPending = true // nog geen bronnen geladen: bij het laden alsnog
        } else {
            muted = Set(newsSources.map(\.id).filter { !set.contains($0) })
            quickPending = false
            rebuildStream()
            reloadParts()
            refreshPersonal()
        }
        browsing = true
        onboarded = true
    }
    private var quickPending: Bool { didSet { save("hoot.quickPending", quickPending) } }
    // Eerst even rondgekeken (zachte start): na een stukje editie één keer de vraag of je zelf
    // je bronnen kiest. Weg zodra je dat doet, "Later" zegt of inlogt.
    var browsing: Bool { didSet { save("hoot.browsing", browsing) } }

    // ---- Interesses en Wat precies? ----
    // Beide tegelijk, zodat de onderwerpen altijd bij je interesses horen: wat je aantikte binnen
    // een interesse die je uitzet, valt weg. Interesses op de volgorde van de rubrieken.
    func setInterests(_ ids: [String], picked: [String]) {
        let next = Rubriek.alle.map(\.id).filter(ids.contains)
        let mine = Rubriek.resolve(next, picked: picked)
        if next != interests { interests = next }
        if mine != topics { topics = mine }
    }
    // Het voorstel in het welkom (onboarding-plan): altijd NOS, NU.nl en RTL Nieuws, en per gekozen
    // interesse een of twee gratis bronnen, Nederlands eerst. Een betaalde bron staat nooit vooraf
    // aan; die kies je zelf bij Aanpassen of later bij Bronnen. Nog niets geladen: de lijst zoals hij
    // is (bij het laden valt weg wat niet bestaat).
    static let always = ["nos", "nu", "rtl"]
    static let pickFor: [String: [String]] = [
        "wereld": ["bbc"], "tech": ["tweakers"], "wetenschap": ["quanta"], "cultuur": ["nos-cultuur", "3voor12"], "sport": ["nos-sport", "vi"],
    ]
    // Wat er bij Aanpassen onder ‘Ook bij je interesses’ staat (aan te zetten, niet vooraf aan).
    static let alsoFor: [String: [String]] = [
        "politiek": ["nrc", "volkskrant", "ftm", "politico-eu"], "binnenland": ["ad", "parool", "trouw"],
        "wereld": ["guardian", "aljazeera", "nyt", "economist"], "economie": ["fd", "ft", "economist"],
        "tech": ["theverge", "ars"], "wetenschap": ["nature"], "cultuur": ["variety", "pitchfork"], "sport": ["wielerflits", "sporza"],
    ]
    func suggested(interests: [String]) -> [String] {
        var ids = Self.always
        for r in Rubriek.alle where interests.contains(r.id) {
            for id in Self.pickFor[r.id] ?? [] where !ids.contains(id) { ids.append(id) }
        }
        guard !newsSources.isEmpty else { return ids }
        return ids.filter { id in newsSources.contains { $0.id == id && $0.paid != true } }
    }
    // De andere bronnen bij je interesses, voor Aanpassen: eerst wat het voorstel niet aanzette.
    func alsoSuggested(interests: [String]) -> [String] {
        var ids: [String] = []
        for r in Rubriek.alle where interests.contains(r.id) {
            for id in (Self.alsoFor[r.id] ?? []) + (Self.pickFor[r.id] ?? []) where !ids.contains(id) { ids.append(id) }
        }
        return ids.filter { id in newsSources.contains { $0.id == id } }
    }
    // Welkom klaar (applyWelcome in src/lib/welcome.js): interesses, onderwerpen en bronnen worden je
    // instellingen. Alleen de bronnen die in het welkom te kiezen waren (`shown`) veranderen.
    func applyWelcome(interests ids: [String], topics mine: [String], sources on: [String], shown: [Source], vak: [String]? = nil) {
        let ids = Rubriek.alle.map(\.id).filter(ids.contains)
        let on = Set(on), seen = Set(shown.map(\.id))
        if ids != interests { interests = ids }
        if mine != topics { topics = mine }
        if let vak, vak != digestFields { digestFields = vak }
        // Nog geen bronnen geladen: alleen wat je koos staat aan, zodra ze er zijn (zoals quickStart).
        if shown.isEmpty { enabled = on; quickPending = true }
        muted = muted.filter { !seen.contains($0) }.union(shown.filter { !($0.optional ?? false) && !on.contains($0.id) }.map(\.id))
        enabled = enabled.filter { !seen.contains($0) }.union(shown.filter { ($0.optional ?? false) && on.contains($0.id) }.map(\.id))
        browsing = false
        rebuildStream()
        reloadParts()
        refreshPersonal()
    }

    // Uitgelogd: de persoonlijke keuzes gaan van het toestel, zodat wie hierna leest neutraal begint.
    // Interesses, onderwerpen, voorkeursbronnen, vak, smaak en je eigen Bluesky-accounts weg; de
    // bronnen terug naar het gratis Nederlandse begin (de startset). Ook Bewaard en wat je las gaan
    // weg: dat is persoonlijk (in je account blijft het staan). Weergave en lezen blijven, die horen
    // bij het toestel.
    func forgetChoices() {
        clearSaved()
        clearRead()
        interests = []
        topics = []
        favorites = []
        digestFields = []
        taste = Taste()
        less = []
        affinity = Affinity()
        ownBluesky = []
        let start = Set(Self.starter)
        enabled = start
        if sources.isEmpty {
            quickPending = true
        } else {
            muted = Set(newsSources.map(\.id).filter { !start.contains($0) })
            rebuildStream()
            reloadParts()
        }
        refreshPersonal()
    }

    var newsSources: [Source] { sources.filter { $0.kind != "sociaal" } }
    var followed: [Source] { newsSources.filter(isOn) }
    // Bluesky: de vaste accounts van Hoot, plus wie je zelf toevoegde.
    var socialSources: [Source] {
        let server = sources.filter { $0.kind == "sociaal" }
        let known = Set(server.map(\.id))
        return server + ownBluesky.filter { !known.contains($0.id) }.map { Source(id: $0.id, name: $0.name, kind: "sociaal", avatar: $0.avatar, brandColor: Bluesky.brand) }
    }
    var followedSocial: [Source] { socialSources.filter(isOn) }
    func isOwn(_ id: String) -> Bool { ownBluesky.contains { $0.id == id } }
    var posts: [Item] {
        let on = Set(followedSocial.map(\.id))
        // Op de echte tijd: eigen posts hebben soms een tijdzone in de tekst (+02:00). Elke datum één
        // keer lezen, niet bij elke vergelijking (dat waren er duizenden per weergave).
        return (itemsById.values.filter { $0.isPost } + ownPosts).filter { on.contains($0.source) }
            .map { ($0, $0.date ?? .distantPast) }
            .sorted { $0.1 > $1.1 }
            .map(\.0)
    }
    func addBluesky(_ input: String) async throws {
        let account = try await Bluesky.profile(input)
        if !ownBluesky.contains(where: { $0.handle == account.handle }) && !sources.contains(where: { $0.id == account.id }) { ownBluesky.append(account) }
        muted.remove(account.id)
        reloadParts()
        await loadOwnPosts()
    }
    func removeBluesky(_ id: String) {
        ownBluesky.removeAll { $0.id == id }
        ownPosts.removeAll { $0.source == id }
    }
    func loadOwnPosts() async {
        let accounts = ownBluesky.filter { a in !muted.contains(a.id) && !sources.contains { $0.id == a.id } }
        guard bluesky, !accounts.isEmpty else { return }
        let lists = await withTaskGroup(of: [Item].self) { group in
            for a in accounts { group.addTask { (try? await Bluesky.posts(of: a)) ?? [] } }
            var all: [[Item]] = []
            for await list in group { all.append(list) }
            return all
        }
        ownPosts = lists.flatMap { $0 }
    }
    func source(_ id: String) -> Source? { sources.first { $0.id == id } }

    // ---- Laden ----
    // Eén laadactie tegelijk: trekken om te verversen, terugkomen in de app en "Opnieuw" wachten op
    // dezelfde. Los van wie erom vroeg: een afgebroken trekgebaar breekt het laden niet half af (dan
    // zag je ten onrechte "Verversen lukt nu niet").
    private var loadTask: Task<Void, Never>?
    func load() async {
        if let loadTask { return await loadTask.value }
        let task = Task { await fetchAll() }
        loadTask = task
        await task.value
        loadTask = nil
    }

    private func fetchAll() async {
        status = itemsById.isEmpty ? .loading : status
        do {
            let (start, fromCache) = try await HootAPI.start()
            sources = start.sources
            if quickPending { muted = Set(newsSources.map(\.id).filter { !enabled.contains($0) }); quickPending = false }
            storiesById = Dictionary(start.stories.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            edition = start.edition
            updatedAt = start.meta.updatedAt.flatMap(HootDate.parse)
            relatedVersion = start.meta.related
            parts = start.meta.parts ?? [:]
            stale = false // een mislukt deel zet hem hieronder weer aan
            reloadParts()
            // Eigen Bluesky-accounts los ophalen: een trage Bluesky houdt de editie niet op.
            Task { await loadOwnPosts() }
            // Op de nieuwste ronde: zet je tijdens het laden een bron om, dan begint er een nieuwe.
            var round: Int
            repeat { round = partsGeneration; await partsTask?.value } while round != partsGeneration
            stale = stale || fromCache
            status = .ready
            if !fromCache { Task.detached(priority: .background) { HootAPI.Offline.prune() } }
            await loadPersonal()
        } catch {
            stale = !itemsById.isEmpty
            status = itemsById.isEmpty ? .failed : .ready
        }
    }

    // Eén laadtaak voor de berichten per bron: een nieuwe breekt de vorige af, en alleen de
    // nieuwste mag het resultaat wegschrijven (ook als een oudere later terugkomt).
    private var parts: [String: String] = [:]
    private var partsTask: Task<Void, Never>?
    private var partsGeneration = 0

    private func reloadParts() {
        partsTask?.cancel()
        partsGeneration += 1
        let generation = partsGeneration
        let wanted = (followed + (bluesky ? followedSocial : [])).map(\.id).filter { parts[$0] != nil }
        let versions = parts
        partsTask = Task {
            let lists = await withTaskGroup(of: (String, [Item]?).self) { group in
                for id in wanted {
                    guard let version = versions[id] else { continue }
                    group.addTask { (id, try? await HootAPI.part(id, version: version).items) }
                }
                var all: [(String, [Item]?)] = []
                for await list in group { all.append(list) }
                return all
            }
            guard !Task.isCancelled, generation == partsGeneration else { return }
            // Lukt een deel niet (geen verbinding, time-out), dan blijven de stukken van die bron staan
            // die we al hadden, en zegt de app dat hij niet helemaal bij is.
            let failed = Set(lists.filter { $0.1 == nil }.map(\.0))
            var map: [String: Item] = [:]
            for item in itemsById.values where failed.contains(item.source) { map[item.id] = item }
            for item in lists.compactMap(\.1).joined() { map[item.id] = item }
            itemsById = map
            if !failed.isEmpty { stale = true }
            rebuildStream()
        }
    }

    private func rebuildStream() {
        let on = Set(followed.map(\.id))
        stream = itemsById.values
            .filter { $0.kind == "article" && on.contains($0.source) && $0.editionOnly != true }
            .sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
        copyKeys = Dictionary(stream.map { ($0.id, Self.keys(of: $0)) }, uniquingKeysWith: { a, _ in a })
        #if DEBUG
        // App Store-opnamen: de gekozen verhalen bovenaan.
        let picked = DebugLaunch.feature.map(\.id)
        if !picked.isEmpty {
            let rank = { (i: Item) in i.storyId.flatMap { picked.firstIndex(of: $0) } ?? Int.max }
            stream = stream.enumerated().sorted { (rank($0.element), $0.offset) < (rank($1.element), $1.offset) }.map(\.element)
        }
        #endif
    }

    // Zusterkranten (AD, Tubantia, De Stentor …) brengen vaak hetzelfde stuk. De server laat elke
    // bron al zijn eigen berichten houden; wat je samen ziet ontdubbelen we hier: dezelfde link of
    // dezelfde kop staat er één keer (het nieuwste exemplaar). Zoals shared/dedupe.mjs op de
    // website. `stream` zelf houdt alles, zodat één bron apart al zijn eigen berichten toont.
    @ObservationIgnored private var copyKeys: [String: [String]] = [:] // per bericht, één keer per rebuildStream (verandert met `stream`)
    func withoutCopies(_ items: [Item]) -> [Item] {
        var seen = Set<String>()
        return items.filter { item in
            let keys = copyKeys[item.id] ?? Self.keys(of: item)
            if keys.contains(where: seen.contains) { return false }
            seen.formUnion(keys)
            return true
        }
    }
    private static func keys(of item: Item) -> [String] {
        let title = titleKey(item.title)
        return ["u|" + item.url] + (title.isEmpty ? [] : ["t|" + title])
    }
    // De kop zonder hoofdletters en leestekens (zoals normTitle op de server).
    static func titleKey(_ title: String) -> String {
        var out = String.UnicodeScalarView()
        var gap = false
        for c in title.lowercased().unicodeScalars {
            let keep = (0x61...0x7A).contains(c.value) || (0x30...0x39).contains(c.value) || (0xE0...0xFF).contains(c.value)
            if !keep { gap = true; continue }
            if gap && !out.isEmpty { out.append(" ") }
            out.append(c)
            gap = false
        }
        return String(out)
    }

    // ---- Verhalen ----
    func story(of item: Item) -> Story? { item.storyId.flatMap { storiesById[$0] } }
    func storyItems(_ story: Story) async -> [Item] {
        if let v = relatedVersion, v != relatedLoaded, let r = try? await HootAPI.related(version: v) {
            related = Dictionary(grouping: r.related.filter { $0.storyId != nil }, by: { $0.storyId! })
            relatedLoaded = v
        }
        let list = related[story.id] ?? story.itemIds.compactMap { itemsById[$0] }
        return list.sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
    }

    // ---- Jouw Editie ----
    // Toon alleen jouw samengestelde Editie. De algemene feed kent jouw interesses niet en mag
    // tijdens het laden niet kort langs de buitenland-/sportgrens of Nederlandse opening gaan.
    var shownEdition: Edition? { Self.visiblePersonal(personal, id: edition?.id, owner: ownerNow) }
    static func visiblePersonal(_ candidate: Edition?, id: String?, owner: String) -> Edition? {
        guard let candidate, let id, candidate.id == id, candidate.owner == owner else { return nil }
        return candidate
    }
    var isPersonal: Bool { shownEdition?.personal == true }
    func isFavorite(_ id: String) -> Bool { favorites.contains(id) }
    func setFavorite(_ id: String, _ on: Bool) { favorites = on ? Array(Set(favorites + [id])).sorted() : favorites.filter { $0 != id } }

    // Van wie jouw Editie is: je gebruikers-id als lid, anders "anon" (die gaat nooit naar je account).
    private var ownerNow: String { account?.uid ?? "anon" }
    private var personalTask: Task<Void, Never>?
    func refreshPersonal() {
        guard edition != nil else { return }
        personalTask?.cancel()
        personalTask = Task { try? await Task.sleep(for: .milliseconds(600)); if !Task.isCancelled { await loadPersonal() } }
    }
    private static let log = Logger(subsystem: "nl.hootnews.Hoot", category: "editie")

    // Jouw Editie, één keer per dagdeel per lezer, in de volgorde van waarheid van de website
    // (bouwspec-aanvulling P8-1): (a) al vastgelegd op dit toestel, (b) al vastgelegd in je account
    // (een ander toestel was eerder), (c) anders nu zelf samenstellen met de rekenkern (EditionEngine,
    // dezelfde code als de website) en vastleggen, waarbij de eerste schrijver wint (P8-3). Faalt de
    // rekenkern, dan de server (P8-6; die Editie gaat nooit naar je account). Als lid pas na de
    // eerste sync-pull (P8-2): anders rekent een vers toestel met instellingen die je account nog
    // niet gaf. De afdruk (`basis`) komt uit de rekenkern, dezelfde djb2 als editionBasis op het web.
    private var personalPending = ""
    // Past deze vastgelegde Editie bij dit dagdeel, deze lezer en deze bronnen en interesses (P8-1)?
    static func fits(_ e: Edition?, id: String, owner: String, basis: String) -> Bool {
        e?.id == id && e?.owner == owner && e?.basis == basis
    }
    // Als lid pas samenstellen na één geslaagde pull, of als die mislukte (zoals het web: `pulled ||
    // sync === 'failed'`); zolang je account laadt, wachten. Zonder sessie: meteen, als "anon".
    static func mayCompose(status: Account.Status?, uid: String?, pulled: Bool, sync: Account.SyncState) -> Bool {
        if status == .loading { return false }
        if uid != nil, !pulled, sync != .failed { return false }
        return true
    }
    func loadPersonal() async {
        guard let global = edition, !sources.isEmpty, !itemsById.isEmpty else { return }
        if let a = account, !Self.mayCompose(status: a.status, uid: a.uid, pulled: a.pulled, sync: a.sync) { return }
        let owner = ownerNow
        let followedIds = followed.map(\.id)
        let basis: String
        do {
            basis = try await EditionEngine.shared.basis(followed: followedIds, interests: interests, topics: topics, favorites: favorites)
        } catch {
            Self.log.error("rekenkern faalt bij de afdruk: \(error.localizedDescription, privacy: .public)")
            await fallbackPersonal(global, owner: owner, basis: nil)
            return
        }
        let fits = { (e: Edition?) in Self.fits(e, id: global.id, owner: owner, basis: basis) }
        // `-HootEngine YES` (Debug): altijd zelf samenstellen, voor het keuren van de rekenkern.
        let force = DebugLaunch.engine && !forced.contains(global.id)
        if fits(personal), !force { return } // (a)
        let task = "\(global.id)|\(owner)|\(basis)"
        if personalPending == task { return }
        personalPending = task
        defer { if personalPending == task { personalPending = "" } }

        var theirs: [String: Any]?
        if account?.uid != nil, let a = account {
            // Een verse lezing; lukt die niet (kolom ontbreekt nog, geen verbinding), dan wat de pull gaf.
            theirs = (try? await a.fetchEdition()) ?? a.remoteEdition
            if let theirs, fits(Self.decodeEdition(theirs)), !force { await adopt(theirs, owner: owner); return } // (b)
        }
        do {
            // (c) De Edities van vóór deze (H3/H5), precies als earlierEditions op het web: wat dit toestel
            // vastlegde (als het van deze lezer is) en wat in je account staat, elk met haar `history`, en
            // de Editie zelf voluit als zij van een ander dagdeel is — ook die uit je account, want dit
            // toestel kan een dagdeel overgeslagen hebben dat het web wél vastlegde (P8-1). Samen de
            // laatste drie dagdelen; de rekenkern voegt ze samen tot `previous` en vat ze samen tot de
            // nieuwe `history` (nextHistory): de Edities ervóór, nooit deze zelf, zoals het web schrijft.
            let prior = Self.rows(try await EditionEngine.shared.earlier(local: Self.json(personalRaw), account: Self.json(theirs), id: global.id, owner: owner))
            forced.insert(global.id)
            let input = try composeInput(global: global, owner: owner, previous: prior)
            let out = try await EditionEngine.shared.compose(input: input)
            guard var mine = try JSONSerialization.jsonObject(with: out) as? [String: Any], mine["id"] as? String == global.id else { throw EditionEngine.Failure.noResult }
            // Veranderde er intussen iets (bron gedempt, uitgelogd)? Dan komt er zo een nieuwe ronde.
            guard followed.map(\.id) == followedIds, ownerNow == owner else { return }
            mine["history"] = Self.rows(try await EditionEngine.shared.nextHistory(prior: Self.json(prior), edition: String(decoding: out, as: UTF8.self)))
            keep(mine)
            if DebugLaunch.engine { return } // gedwongen samengesteld: niet naar je account
            if account?.uid != nil, let a = account, let claim = try? await a.claimEdition(mine, id: global.id), !claim.won {
                // Een ander toestel was eerder: dan die Editie, ook hier, zodat beide hetzelfde `previous` hebben (P8-5).
                if let w = claim.edition, fits(Self.decodeEdition(w)) { await adopt(w, owner: owner) }
            }
        } catch {
            Self.log.error("rekenkern faalt: \(error.localizedDescription, privacy: .public)")
            await fallbackPersonal(global, owner: owner, basis: basis)
        }
    }

    // Welke dagdelen al gedwongen zijn samengesteld (`-HootEngine`): daarna gewoon weer (a).
    private var forced: Set<String> = []

    // De Editie van een ander toestel overnemen, en vastleggen alsof hij hier gemaakt is: dan is hij
    // ook hier het `previous` van het volgende dagdeel (P8-5). Haar `history` wordt die van het web bij
    // overnemen: de Edities van toen van beide toestellen (zijn geschiedenis plus wat dit toestel van
    // deze lezer vastlegde), samengevat, nieuwste eerst, zonder haarzelf. Heeft dit toestel niets nieuws,
    // dan komt een door het web geschreven geschiedenis ongewijzigd terug.
    private func adopt(_ raw: [String: Any], owner: String) async {
        var e = raw
        e["owner"] = owner
        if let id = e["id"] as? String, let prior = try? await EditionEngine.shared.earlier(local: Self.json(personalRaw), account: Self.json(raw), id: id, owner: owner),
           let h = try? await EditionEngine.shared.nextHistory(prior: prior, edition: Self.json(e)) {
            e["history"] = Self.rows(h)
        }
        keep(e)
    }

    // Een JSON-lijst van objecten (regels, Edities) terug naar Swift.
    private static func rows(_ json: String) -> [[String: Any]] {
        (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [[String: Any]] ?? []
    }

    private func keep(_ raw: [String: Any]) {
        personalRaw = raw
        personal = Self.decodeEdition(raw)
        Self.writeRaw(raw, to: "edition.json")
    }
    private static func decodeEdition(_ raw: [String: Any]) -> Edition? {
        guard let data = try? JSONSerialization.data(withJSONObject: raw) else { return nil }
        return try? JSONDecoder().decode(Edition.self, from: data)
    }
    // Als JSON-tekst voor de rekenkern; niets (nil, of geen geldig object) wordt "null".
    private static func json(_ object: Any?) -> String {
        guard let object, JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object) else { return "null" }
        return String(decoding: data, as: UTF8.self)
    }
    private static func encoded<T: Encodable>(_ value: T) -> Any {
        (try? JSONEncoder().encode(value)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? NSNull()
    }

    // De invoer voor de rekenkern (src/lib/editionCore.js): zo veel mogelijk de ruwe antwoorden van de
    // server zoals HootAPI ze bewaarde, want dat is precies wat de website krijgt, ook velden die de
    // app zelf niet kent (wide, near). Ontbreekt een bestand, dan wat de app in het geheugen heeft.
    // Geen `now` of `builtAt`: de rekenkern neemt global.builtAt, net als de website.
    private func composeInput(global: Edition, owner: String, previous: [[String: Any]]) throws -> Data {
        let start = HootAPI.cached("api/feed", ["deel": "start"]).flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] }
        var globalRaw = start?["edition"] as? [String: Any]
        if globalRaw?["id"] as? String != global.id { globalRaw = Self.encoded(global) as? [String: Any] }
        guard let globalRaw else { throw EditionEngine.Failure.noResult }
        let stories: Any = start?["stories"] as? [[String: Any]] ?? Self.encoded(Array(storiesById.values))
        let sourcesRaw: Any = start?["sources"] as? [[String: Any]] ?? Self.encoded(sources)
        var items: [Any] = []
        for s in followed {
            if let v = parts[s.id], let data = HootAPI.cached("api/feed", ["bron": s.id, "v": v]), let part = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let list = part["items"] as? [Any] {
                items += list
            } else if let list = Self.encoded(itemsById.values.filter { $0.source == s.id }) as? [Any] {
                items += list
            }
        }
        let input: [String: Any] = [
            "global": globalRaw, "stories": stories, "items": items, "sources": sourcesRaw,
            "followed": followed.map(\.id), "interests": interests, "topics": topics, "favorites": favorites,
            "affinity": affinity.n > 0 ? Self.encoded(affinity) : NSNull(), "taste": taste.isEmpty ? NSNull() : Self.encoded(taste),
            "readIds": Array(readIds.suffix(1500)), "previous": previous, "owner": owner,
        ]
        return try JSONSerialization.data(withJSONObject: input)
    }

    // De terugval (P8-6): de server stelt samen, zonder affinity (die blijft op het toestel) maar met
    // wat je las en wat er in je vorige Edities stond. Het antwoord draagt `fallback: true` en gaat
    // nooit naar je account.
    private func fallbackPersonal(_ global: Edition, owner: String, basis: String?) async {
        let body = PersonalRequest(followed: followed.map(\.id), interests: interests, topics: topics, favorites: favorites, taste: taste.isEmpty ? nil : taste, readIds: Array(readIds.suffix(1500)), previous: previousForServer(global, owner: owner))
        guard let data = try? await HootAPI.postData("api/edition", body),
              var mine = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any])?["edition"] as? [String: Any],
              mine["id"] as? String == global.id else { return }
        mine["personal"] = true
        mine["fallback"] = true
        mine["owner"] = owner
        if mine["basis"] == nil, let basis { mine["basis"] = basis }
        keep(mine)
    }

    // `previous` voor de server: de vereniging van wat dit toestel vastlegde (de vorige Editie en de
    // geschiedenis), in de platte vorm die POST /api/edition leest. Alleen wat van deze lezer is: na
    // uitloggen rekent "anon" niet met de geschiedenis van het lid (zoals earlierEditions op het web).
    private func previousForServer(_ global: Edition, owner: String) -> PreviousEdition? {
        guard personalRaw?["owner"] as? String == owner else { return nil }
        var rows = personalRaw?["history"] as? [[String: Any]] ?? []
        if let p = personal, p.id != global.id, let lead = p.entries.first {
            let stories = p.entries.filter { $0.kind == "story" }
            let byId = Dictionary((p.items ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            rows.insert([
                "id": p.id, "builtAt": p.builtAt ?? "",
                "storyIds": stories.flatMap { [$0.id, $0.formerId].compactMap { $0 } },
                "itemIds": p.entries.map { $0.leadId ?? $0.id } + stories.flatMap { $0.itemIds ?? [] },
                "leadIds": [lead.leadId ?? lead.id],
                "titles": p.entries.compactMap { $0.title ?? byId[$0.leadId ?? $0.id]?.title },
            ], at: 0)
        }
        guard !rows.isEmpty else { return nil }
        let strings = { (k: String) in Array(Set(rows.flatMap { $0[k] as? [String] ?? [] })).sorted() }
        let at = rows.compactMap { ($0["builtAt"] as? String).flatMap(HootDate.parse)?.timeIntervalSince1970 }.max() ?? 0
        return PreviousEdition(storyIds: strings("storyIds"), itemIds: strings("itemIds"), leadIds: strings("leadIds"), leadStoryId: nil, at: at * 1000, titles: strings("titles"))
    }

    // ---- Digest ----
    // Levert de server dit vak? Zolang de Digest niet geladen is: ja.
    private var digestLoadedAt: Date?
    // Meer of minder hiervan bij een plek in de Editie (`id`: verhaal of bericht). Minder klapt hem in.
    func vote(_ id: String, items: [Item], up: Bool) {
        taste.vote(items, up: up)
        if !up { less = Array(([id] + less.filter { $0 != id }).prefix(200)) }
    }
    func undoLess(_ id: String, items: [Item]) {
        taste.vote(items, up: true)
        less.removeAll { $0 == id }
    }
    func clearTaste() { taste = Taste(); less = [] }

    // ---- Wat Hoot van je leerde (bouwspec §8) ----
    // Hetzelfde profiel als De Redacteur gebruikt, uit de bundel (profileSummary): gekozen, geleerd en
    // minder. Het aanbod komt uit de berichten van je bronnen; daarvan gaan alleen soort, bron en
    // onderwerpen mee (de rest heeft het profiel niet nodig).
    func profileSummary() async -> ProfileSummary {
        let on = Set(followed.map(\.id))
        let pool: [[String: Any]] = itemsById.values.filter { $0.kind == "article" && on.contains($0.source) && $0.streamOnly != true }.map { ["kind": "article", "source": $0.source, "topics": $0.topics ?? []] }
        let input: [String: Any] = [
            "interests": interests, "topics": topics, "favorites": favorites, "followed": Array(on),
            "affinity": affinity.n > 0 ? Self.encoded(affinity) : NSNull(), "taste": taste.isEmpty ? NSNull() : Self.encoded(taste),
            "sources": Self.encoded(sources), "items": pool,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: input) else { return ProfileSummary() }
        return (try? await EditionEngine.shared.profileSummary(input: data)) ?? ProfileSummary()
    }
    // "Vergeet dit": het onderwerp valt uit je leesprofiel, de teller blijft (forgetTopic op het web).
    func forgetTopic(_ topic: String) {
        guard affinity.topics[topic] != nil else { return }
        affinity.topics.removeValue(forKey: topic)
        refreshPersonal()
    }
    // "Minder" terugdraaien: het onderwerp weer op nul, niet gewist (zo blijft in je account te zien dat
    // je het ooit zei, en het telt niet meer mee), zoals het web.
    func restoreLess(_ topic: String) {
        taste.topics[topic] = 0
        refreshPersonal()
    }

    func offersField(_ id: String) -> Bool { digest.map { $0.fields.contains { $0.id == id } } ?? true }
    func loadDigest(force: Bool = false) async {
        let due = digest?.next.flatMap(HootDate.parse).map { $0 < .now } ?? false
        let old = digestLoadedAt.map { Date.now.timeIntervalSince($0) > 3600 } ?? false
        if digestStatus == .loading || (!force && digest != nil && !due && !old) { return }
        digestStatus = .loading
        do {
            digest = try await HootAPI.digest()
            digestLoadedAt = .now
            digestStatus = .ready
        } catch {
            digestStatus = digest == nil ? .failed : .ready
        }
    }

    // ---- Bewaard en gelezen ----
    func isSaved(_ item: Item) -> Bool { saved.contains { $0.id == item.id } }
    func toggleSave(_ item: Item) {
        if let i = saved.firstIndex(where: { $0.id == item.id }) { saved.remove(at: i) } else {
            saved.insert(item, at: 0)
            affinity.learn(item, weight: 3) // bewaren zegt meer over je smaak dan openen
        }
    }
    func removeSaved(at offsets: IndexSet) { saved.remove(atOffsets: offsets) }
    // "Ongedaan maken" na verwijderen: terug op zijn oude plek.
    func restoreSaved(_ item: Item, at index: Int) { if !isSaved(item) { saved.insert(item, at: min(index, saved.count)) } }
    func markRead(_ item: Item) {
        guard !readSet.contains(item.id) else { return }
        affinity.learn(item, weight: 1)
        readSet.insert(item.id)
        readOrder.append(item.id)
        if readOrder.count > 2000 {
            let drop = readOrder.prefix(readOrder.count - 2000)
            readSet.subtract(drop)
            readOrder.removeFirst(drop.count)
        }
    }
    func isRead(_ item: Item) -> Bool { readSet.contains(item.id) }

    // ---- Opslag ----
    private func save<T: Encodable>(_ key: String, _ value: T) {
        UserDefaults.standard.set(try? JSONEncoder().encode(value), forKey: key)
    }
    private static func load<T: Decodable>(_ key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    // Bestanden in Application Support (gaan mee in de back-up; atomisch geschreven).
    private static let folder: URL? = {
        let url = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return url?.appendingPathComponent("Hoot", isDirectory: true)
    }()
    private static func write<T: Encodable>(_ value: T, to name: String) {
        guard let folder, let data = try? JSONEncoder().encode(value) else { return }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try? data.write(to: folder.appendingPathComponent(name), options: .atomic)
    }
    // Dezelfde bestanden als ruwe JSON (voor jouw Editie: wat de rekenkern gaf, gaat zo door naar je account).
    private static func writeRaw(_ object: Any, to name: String) {
        guard let folder, JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object) else { return }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try? data.write(to: folder.appendingPathComponent(name), options: .atomic)
    }
    private static func readRaw(_ name: String) -> [String: Any]? {
        guard let folder, let data = try? Data(contentsOf: folder.appendingPathComponent(name)) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
    private static func read<T: Decodable>(_ name: String) -> T? {
        guard let folder, let data = try? Data(contentsOf: folder.appendingPathComponent(name)) else { return nil }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            // Onleesbaar (beschadigd): opzij als `.kapot`, zodat het niet stil overschreven wordt.
            try? data.write(to: folder.appendingPathComponent(name + ".kapot"), options: .atomic)
            unreadable.insert(name)
            return nil
        }
    }
    private static var unreadable: Set<String> = []
}
