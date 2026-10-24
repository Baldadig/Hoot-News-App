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
    private(set) var saved: [Item] { didSet { save("hoot.saved", saved) } }
    private(set) var read: Set<String> { didSet { save("hoot.read", Array(read.suffix(2000))) } }

    // Weergave en lezen (zelfde namen en waarden als de web-app, voor het synchroniseren later)
    var theme: String { didSet { save("hoot.theme", theme) } } // system | light | dark
    var images: String { didSet { save("hoot.images", images) } } // aan | hoofd | uit
    var bubble: Bool { didSet { save("hoot.bubble", bubble) } } // "Buiten je bubbel" in de Editie
    var openInSafari: Bool { didSet { save("hoot.openInSafari", openInSafari) } }
    var readerFirst: Bool { didSet { save("hoot.readerFirst", readerFirst) } } // meteen de Lezer

    init() {
        muted = Set(Self.load("hoot.muted") ?? [String]())
        enabled = Set(Self.load("hoot.enabled") ?? [String]())
        digestFields = Self.load("hoot.digestFields") ?? ["paid-social", "ux", "design"]
        saved = Self.load("hoot.saved") ?? []
        read = Set(Self.load("hoot.read") ?? [String]())
        theme = Self.load("hoot.theme") ?? "system"
        images = Self.load("hoot.images") ?? "aan"
        bubble = Self.load("hoot.bubble") ?? true
        openInSafari = Self.load("hoot.openInSafari") ?? false
        readerFirst = Self.load("hoot.readerFirst") ?? false
    }

    // Beeld tonen? `lead`: het hoofdverhaal of het eerste stuk van een vak.
    func showsImage(lead: Bool) -> Bool { images == "aan" || (images == "hoofd" && lead) }
    func clearRead() { read = [] }
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
        Task { await loadParts() }
    }
    var newsSources: [Source] { sources.filter { $0.kind != "sociaal" } }
    var followed: [Source] { newsSources.filter(isOn) }
    func source(_ id: String) -> Source? { sources.first { $0.id == id } }

    // ---- Laden ----
    func load() async {
        if status == .loading { return }
        status = itemsById.isEmpty ? .loading : status
        do {
            let start = try await HootAPI.start()
            sources = start.sources
            storiesById = Dictionary(start.stories.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            edition = start.edition
            updatedAt = start.meta.updatedAt.flatMap(HootDate.parse)
            relatedVersion = start.meta.related
            parts = start.meta.parts ?? [:]
            await loadParts()
            status = .ready
        } catch {
            status = itemsById.isEmpty ? .failed : .ready
        }
    }

    private var parts: [String: String] = [:]
    private func loadParts() async {
        let wanted = followed.map(\.id).filter { parts[$0] != nil }
        let versions = parts
        let lists = await withTaskGroup(of: [Item].self) { group in
            for id in wanted {
                group.addTask { (try? await HootAPI.part(id, version: versions[id]!).items) ?? [] }
            }
            var all: [[Item]] = []
            for await list in group { all.append(list) }
            return all
        }
        var map: [String: Item] = [:]
        for item in lists.joined() { map[item.id] = item }
        itemsById = map
    }

    // De Stroom: alles van je bronnen, nieuwste eerst.
    var stream: [Item] {
        let on = Set(followed.map(\.id))
        return itemsById.values
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

    // ---- Digest ----
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
        if let i = saved.firstIndex(where: { $0.id == item.id }) { saved.remove(at: i) } else { saved.insert(item, at: 0) }
    }
    func removeSaved(at offsets: IndexSet) { saved.remove(atOffsets: offsets) }
    func markRead(_ item: Item) { read.insert(item.id) }
    func isRead(_ item: Item) -> Bool { read.contains(item.id) }

    // ---- Opslag ----
    private func save<T: Encodable>(_ key: String, _ value: T) {
        UserDefaults.standard.set(try? JSONEncoder().encode(value), forKey: key)
    }
    private static func load<T: Decodable>(_ key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
}
