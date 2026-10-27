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

    // Voorkeuren (bewaard op het toestel)
    var muted: Set<String> { didSet { save("hoot.muted", Array(muted)) } }
    var enabled: Set<String> { didSet { save("hoot.enabled", Array(enabled)) } }
    var digestFields: [String] { didSet { save("hoot.digestFields", digestFields) } }
    // Bewaard en gelezen: in een eigen bestand (Application Support), niet in UserDefaults; gelezen
    // op volgorde, zodat we bij de grens van 2.000 de oudste vergeten en niet een willekeurige.
    private(set) var saved: [Item] { didSet { Self.write(saved, to: "saved.json") } }
    private var readOrder: [String] { didSet { Self.write(readOrder, to: "read.json") } }
    private var readSet: Set<String> = []

    // Weergave en lezen (zelfde namen en waarden als de web-app, voor het synchroniseren later)
    var images: String { didSet { save("hoot.images", images) } } // aan | hoofd | uit
    var bubble: Bool { didSet { save("hoot.bubble", bubble) } } // "Buiten je bubbel" in de Editie
    var openInSafari: Bool { didSet { save("hoot.openInSafari", openInSafari) } } // vóór 0.12; nu `openWith`
    // Waar artikelen openen: "lezer" (de Hoot-lezer), "web" (de website, in Hoot) of "safari".
    var openWith: String { didSet { save("hoot.openWith", openWith) } }
    var readerFirst: Bool { didSet { save("hoot.readerFirst", readerFirst) } } // meteen de Lezer
    var paidInSafari: Bool { didSet { save("hoot.paidInSafari", paidInSafari) } } // betaalde bronnen in Safari (daar ben je ingelogd)
    var preview: Int { didSet { save("hoot.preview", preview) } } // regels intro bij een bericht; 0 = de hele intro
    // Jouw editie: je interesses (src/lib/topics.js), voorkeursbronnen (ster) en smaak (wat je leest).
    var interests: [String] { didSet { save("hoot.interests", interests); refreshPersonal() } }
    var favorites: [String] { didSet { save("hoot.favorites", favorites); refreshPersonal() } }
    private(set) var affinity: Affinity { didSet { save("hoot.affinity", affinity) } }
    private(set) var personal: Edition? { didSet { Self.write(personal, to: "edition.json") } }
    private var personalBasis: String { didSet { save("hoot.personalBasis", personalBasis) } }
    // Bluesky als eigen tabblad, met de vaste accounts van Hoot en wie je zelf toevoegt.
    var bluesky: Bool { didSet { save("hoot.bluesky", bluesky); if bluesky { reloadParts(); Task { await loadOwnPosts() } } } }
    private(set) var ownBluesky: [BlueskyAccount] { didSet { save("hoot.ownBluesky", ownBluesky) } }
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
        digestFields = Self.load("hoot.digestFields") ?? ["paid-social", "ux", "design", "ai", "ecommerce"]
        // Eenmalig overzetten uit UserDefaults (versie 0.3 en eerder).
        let oldSaved: [Item]? = Self.load("hoot.saved")
        let oldRead: [String]? = Self.load("hoot.read")
        let savedNow: [Item] = Self.read("saved.json") ?? oldSaved ?? []
        let readNow: [String] = Self.read("read.json") ?? oldRead ?? []
        saved = savedNow
        readOrder = readNow
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
        openWith = Self.load("hoot.openWith") ?? (Self.load("hoot.openInSafari") == true ? "safari" : "lezer")
        readerFirst = Self.load("hoot.readerFirst") ?? false
        paidInSafari = Self.load("hoot.paidInSafari") ?? true
        streamSeen = Self.load("hoot.streamSeen") ?? nil
        preview = Self.load("hoot.preview") ?? 2
        interests = Self.load("hoot.interests") ?? []
        favorites = Self.load("hoot.favorites") ?? []
        affinity = Self.load("hoot.affinity") ?? Affinity()
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
            enum CodingKeys: String, CodingKey { case muted, enabled, vak, images, bubble, bluesky, preview, interests, favorites }
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
                // Op de website is het 1, 2, 3 of "alles".
                preview = (try? c.decodeIfPresent(Int.self, forKey: .preview)) ?? ((try? c.decodeIfPresent(String.self, forKey: .preview)) == "alles" ? 0 : nil)
            }
        }
        var prefs: Prefs?
        var social: [BlueskyAccount]?
    }
    private func importSettings() {
        guard let file = Self.folder?.appendingPathComponent("import.json"), let data = try? Data(contentsOf: file) else { return }
        try? FileManager.default.removeItem(at: file)
        guard let found = try? JSONDecoder().decode(Import.self, from: data) else { return }
        let p = found.prefs
        if let v = p?.muted { muted = Set(v); save("hoot.muted", v) }
        if let v = p?.enabled { enabled = Set(v); save("hoot.enabled", v) }
        if let v = p?.vak { digestFields = v; save("hoot.digestFields", v) }
        if let v = p?.images, ["aan", "hoofd", "uit"].contains(v) { images = v; save("hoot.images", v) }
        if let v = p?.bubble { bubble = v; save("hoot.bubble", v) }
        if let v = p?.bluesky { bluesky = v; save("hoot.bluesky", v) }
        if let v = p?.preview, (0 ... 3).contains(v) { preview = v; save("hoot.preview", v) }
        if let v = found.social { ownBluesky = v; save("hoot.ownBluesky", v) }
        if let v = p?.interests { interests = v; save("hoot.interests", v) }
        if let v = p?.favorites { favorites = v; save("hoot.favorites", v) }
    }

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
        return (itemsById.values.filter { $0.isPost } + ownPosts).filter { on.contains($0.source) }.sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
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
        let accounts = ownBluesky.filter { !muted.contains($0.id) }
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
    func load() async {
        if status == .loading { return }
        status = itemsById.isEmpty ? .loading : status
        do {
            let (start, fromCache) = try await HootAPI.start()
            sources = start.sources
            storiesById = Dictionary(start.stories.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            edition = start.edition
            updatedAt = start.meta.updatedAt.flatMap(HootDate.parse)
            relatedVersion = start.meta.related
            parts = start.meta.parts ?? [:]
            reloadParts()
            async let own: Void = loadOwnPosts()
            await partsTask?.value
            await own
            stale = fromCache
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
            let lists = await withTaskGroup(of: [Item].self) { group in
                for id in wanted {
                    guard let version = versions[id] else { continue }
                    group.addTask { (try? await HootAPI.part(id, version: version).items) ?? [] }
                }
                var all: [[Item]] = []
                for await list in group { all.append(list) }
                return all
            }
            guard !Task.isCancelled, generation == partsGeneration else { return }
            var map: [String: Item] = [:]
            for item in lists.joined() { map[item.id] = item }
            itemsById = map
            rebuildStream()
        }
    }

    private func rebuildStream() {
        let on = Set(followed.map(\.id))
        stream = itemsById.values
            .filter { $0.kind == "article" && on.contains($0.source) }
            .sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
    }

    // ---- Verhalen ----
    func story(of item: Item) -> Story? { item.storyId.flatMap { storiesById[$0] } }
    func storyItems(_ story: Story) async -> [Item] {
        if related.isEmpty, let v = relatedVersion, let r = try? await HootAPI.related(version: v) {
            related = Dictionary(grouping: r.related.filter { $0.storyId != nil }, by: { $0.storyId! })
        }
        let list = related[story.id] ?? story.itemIds.compactMap { itemsById[$0] }
        return list.sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
    }

    // ---- Jouw editie ----
    // De editie die je ziet: jouw editie van dit dagdeel als die er is, anders die voor iedereen.
    var shownEdition: Edition? { personal?.id == edition?.id && personal != nil ? personal : edition }
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
        let body = PersonalRequest(followed: followed.map(\.id), interests: interests, favorites: favorites, affinity: affinity.n > 0 ? affinity : nil, previous: previous)
        guard let mine = try? await HootAPI.personal(body), mine.id == global.id else { return }
        personal = mine
        personalBasis = basis
    }

    private func previousOf(_ e: Edition) -> PreviousEdition? {
        guard let lead = e.entries.first else { return nil }
        let stories = e.entries.filter { $0.kind == "story" }
        var items = Set(e.entries.map { $0.leadId ?? $0.id })
        for s in stories { items.formUnion(storiesById[s.id]?.itemIds ?? []) }
        return PreviousEdition(storyIds: stories.map(\.id), itemIds: Array(items), leadIds: [lead.leadId ?? lead.id], leadStoryId: lead.kind == "story" ? lead.id : nil, at: (e.builtAt.flatMap(HootDate.parse)?.timeIntervalSince1970 ?? 0) * 1000)
    }

    // ---- Digest ----
    // Levert de server dit vak? Zolang de Digest niet geladen is: ja.
    func offersField(_ id: String) -> Bool { digest.map { $0.fields.contains { $0.id == id } } ?? true }
    func loadDigest(force: Bool = false) async {
        if digestStatus == .loading || (!force && digest != nil) { return }
        digestStatus = .loading
        do {
            digest = try await HootAPI.digest()
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
        return try? JSONDecoder().decode(T.self, from: data)
    }
}
