import Foundation
import Observation

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
    var bubble: Bool { didSet { save("hoot.bubble", bubble); synced() } } // "Buiten je bubbel" in de Editie
    var openInSafari: Bool { didSet { save("hoot.openInSafari", openInSafari) } } // vóór 0.12; nu `openWith`
    // Waar artikelen openen: "lezer" (de Hoot-lezer) of "safari" (de Safari-app, waar je al bent ingelogd).
    var openWith: String { didSet { save("hoot.openWith", openWith) } }
    var preview: Int { didSet { save("hoot.preview", preview); synced() } } // regels intro bij een bericht; 0 = de hele intro
    var onboarded: Bool { didSet { save("hoot.onboarded", onboarded) } } // het welkom is gezien
    // Jouw editie: je interesses (src/lib/topics.js), voorkeursbronnen (ster) en smaak (wat je leest).
    var interests: [String] { didSet { save("hoot.interests", interests); refreshPersonal(); synced() } }
    var favorites: [String] { didSet { save("hoot.favorites", favorites); refreshPersonal(); synced() } }
    private(set) var affinity: Affinity { didSet { save("hoot.affinity", affinity) } }
    // Meer of minder hiervan (Models.swift: Taste): gaat mee met je account.
    var taste: Taste { didSet { save("hoot.taste", taste); synced() } }
    // Verhalen waar je "minder" op zei: in deze Editie ingeklapt (alleen op dit toestel).
    private(set) var less: [String] { didSet { save("hoot.less", less) } }
    private(set) var personal: Edition? { didSet { Self.write(personal, to: "edition.json") } }
    private var personalBasis: String { didSet { save("hoot.personalBasis", personalBasis) } }
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
    var newInStream: Int { streamMark.map { mark in stream.prefix { ($0.date ?? .distantPast) > mark }.count } ?? 0 }

    init() {
        muted = Set(Self.load("hoot.muted") ?? [String]())
        enabled = Set(Self.load("hoot.enabled") ?? [String]())
        quickPending = Self.load("hoot.quickPending") ?? false
        browsing = Self.load("hoot.browsing") ?? false
        digestFields = Self.load("hoot.digestFields") ?? ["paid-social", "ux", "design", "ai", "ecommerce"]
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
        #endif
        interests = Self.load("hoot.interests") ?? []
        favorites = Self.load("hoot.favorites") ?? []
        affinity = Self.load("hoot.affinity") ?? Affinity()
        taste = Self.load("hoot.taste") ?? Taste()
        less = Self.load("hoot.less") ?? []
        personal = Self.read("edition.json")
        personalBasis = Self.load("hoot.personalBasis") ?? ""
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
            var bubble: Bool?
            var bluesky: Bool?
            var preview: Int?
            var interests: [String]?
            var favorites: [String]?
            var social: [BlueskyAccount]? // eigen Bluesky-accounts, zoals op de website
            var taste: Taste?
            enum CodingKeys: String, CodingKey { case muted, enabled, vak, images, bubble, bluesky, preview, interests, favorites, social, taste }
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                muted = try? c.decodeIfPresent([String].self, forKey: .muted)
                enabled = try? c.decodeIfPresent([String].self, forKey: .enabled)
                vak = try? c.decodeIfPresent([String].self, forKey: .vak)
                images = try? c.decodeIfPresent(String.self, forKey: .images)
                bubble = try? c.decodeIfPresent(Bool.self, forKey: .bubble)
                bluesky = try? c.decodeIfPresent(Bool.self, forKey: .bluesky)
                interests = try? c.decodeIfPresent([String].self, forKey: .interests)
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
        if let v = p?.bubble, v != bubble { bubble = v; save("hoot.bubble", v) }
        if let v = p?.bluesky, v != bluesky { bluesky = v; save("hoot.bluesky", v) }
        if let v = p?.preview, v != preview, (0 ... 3).contains(v) { preview = v; save("hoot.preview", v) }
        if let v = p?.interests, v != interests { interests = v; save("hoot.interests", v) }
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

    // Je instellingen in de vorm van de website (SYNCED_PREFS in src/lib/sync.js).
    var syncedPrefs: [String: Any] {
        [
            "muted": muted.sorted(), "enabled": enabled.sorted(), "vak": digestFields, "images": images,
            "bubble": bubble, "bluesky": bluesky, "preview": preview == 0 ? "alles" as Any : preview as Any,
            "interests": interests, "favorites": favorites, "onboarded": true,
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
    static let starter = ["nos", "nu", "rtl", "nos-sport", "vi", "tweakers", "nos-cultuur", "3voor12"]
    func quickStart() {
        let set = Set(Self.starter)
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
            if quickPending { muted = Set(newsSources.map(\.id).filter { !Self.starter.contains($0) }); quickPending = false }
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
            .filter { $0.kind == "article" && on.contains($0.source) }
            .sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
        #if DEBUG
        // App Store-opnamen: de gekozen verhalen bovenaan.
        let picked = DebugLaunch.feature.map(\.id)
        if !picked.isEmpty {
            let rank = { (i: Item) in i.storyId.flatMap { picked.firstIndex(of: $0) } ?? Int.max }
            stream = stream.enumerated().sorted { (rank($0.element), $0.offset) < (rank($1.element), $1.offset) }.map(\.element)
        }
        #endif
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

    // ---- Jouw editie ----
    // De editie die je ziet: jouw editie van dit dagdeel als die er is, anders die voor iedereen.
    // Alleen als hij past bij je huidige bronnen en interesses; anders (bijvoorbeeld als het opnieuw
    // samenstellen na het dempen van een bron mislukte) die voor iedereen, zoals op de website.
    var shownEdition: Edition? { personal != nil && personal?.id == edition?.id && personalBasis == basisNow ? personal : edition }
    var isPersonal: Bool { shownEdition?.personal == true }
    func isFavorite(_ id: String) -> Bool { favorites.contains(id) }
    func setFavorite(_ id: String, _ on: Bool) { favorites = on ? Array(Set(favorites + [id])).sorted() : favorites.filter { $0 != id } }

    // Afdruk van wat je editie bepaalt: verandert die (bronnen, interesses, voorkeuren), dan opnieuw.
    private var basisNow: String { [followed.map(\.id).sorted().joined(separator: ","), interests.sorted().joined(separator: ","), favorites.sorted().joined(separator: ",")].joined(separator: "|") }
    private var personalTask: Task<Void, Never>?
    private func refreshPersonal() {
        guard edition != nil else { return }
        personalTask?.cancel()
        personalTask = Task { try? await Task.sleep(for: .milliseconds(600)); if !Task.isCancelled { await loadPersonal() } }
    }

    // Eén keer per dagdeel (en opnieuw als je bronnen, interesses of voorkeuren veranderen) vraagt
    // de app jouw editie op bij de server: hetzelfde selectiewerk als de website. Lukt dat niet,
    // dan de editie voor iedereen.
    func loadPersonal() async {
        guard let global = edition, !sources.isEmpty else { return }
        let basis = basisNow
        if let p = personal, p.id == global.id, personalBasis == basis { return }
        let previous = personal.flatMap { $0.id != global.id ? previousOf($0) : nil }
        let body = PersonalRequest(followed: followed.map(\.id), interests: interests, favorites: favorites, affinity: affinity.n > 0 ? affinity : nil, taste: taste.isEmpty ? nil : taste, previous: previous)
        guard let mine = try? await HootAPI.personal(body), mine.id == global.id, basis == basisNow else { return }
        personal = mine
        personalBasis = basis
    }

    private func previousOf(_ e: Edition) -> PreviousEdition? {
        guard let lead = e.entries.first else { return nil }
        let stories = e.entries.filter { $0.kind == "story" }
        // Alleen de stukken die toen in de editie stonden, zoals de website: wat er sindsdien bij een
        // verhaal kwam, telt de server als "vers" (een verhaal dat zich ontwikkelt, zakt minder ver).
        let items = Set(e.entries.map { $0.leadId ?? $0.id })
        return PreviousEdition(storyIds: stories.flatMap { [$0.id, $0.formerId].compactMap { $0 } }, itemIds: Array(items), leadIds: [lead.leadId ?? lead.id], leadStoryId: lead.kind == "story" ? lead.id : nil, at: (e.builtAt.flatMap(HootDate.parse)?.timeIntervalSince1970 ?? 0) * 1000)
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
