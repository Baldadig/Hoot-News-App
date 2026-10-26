import SwiftUI

// Editie: drie keer per dag tien verhalen, met een einde. Het hoofdverhaal heeft altijd een
// scherp beeld (anders schuift het eerste verhaal mét goed beeld naar voren, net als op het web).
struct EditionRowModel: Identifiable {
    let id: String
    let item: Item
    let story: Story?
    let label: String?
    let desk: String?
}

enum Desk {
    static let labels = ["binnenland": "Binnenland", "buitenland": "Buitenland", "vs": "VS", "middenoosten": "Midden-Oosten", "oekraine": "Oekraïne", "wetenschap": "Wetenschap", "tech": "Tech", "economie": "Economie", "bubbel": "Buiten je bubbel", "extern": "Buiten je bronnen"]
    static let slots = ["ochtend": "Ochtendeditie", "middag": "Middageditie", "avond": "Avondeditie"]

    static func label(_ e: EditionEntry, followed: Bool) -> String? {
        let base: String?
        if e.desk == "breed" { base = "Waar iedereen over schrijft · \(e.sourceCount ?? 0) bronnen" } else { base = e.desk.flatMap { labels[$0] } }
        if followed || ["bubbel", "extern", "breed"].contains(e.desk ?? "") { return base }
        return [base, "Buiten je bronnen"].compactMap { $0 }.joined(separator: " · ")
    }
}

extension HootStore {
    var editionRows: [EditionRowModel] {
        guard let edition else { return [] }
        let published = Dictionary((edition.items ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let on = Set(followed.map(\.id))
        let rows: [EditionRowModel] = edition.entries.filter { bubble || $0.desk != "bubbel" }.compactMap { e in
            let leadId = e.kind == "story" ? (e.leadId ?? e.id) : e.id
            guard let item = published[leadId] ?? itemsById[leadId] else { return nil }
            let story = e.kind == "story" ? storiesById[e.id] : item.storyId.flatMap { storiesById[$0] }
            return EditionRowModel(id: e.id, item: item, story: story, label: Desk.label(e, followed: on.contains(item.source)), desk: e.desk)
        }
        // Hoofdverhaal met scherp beeld (geen bubbel of "waar iedereen over schrijft").
        let ok: (EditionRowModel) -> Bool = { ImageURL.fitsHero($0.item.image) && !["bubbel", "breed"].contains($0.desk ?? "") }
        guard let first = rows.first, !ok(first), let i = rows.firstIndex(where: ok) else { return rows }
        var out = rows
        out.insert(out.remove(at: i), at: 0)
        return out
    }
}

struct EditionView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.isWide) private var wide
    private var title: String { store.edition?.slot.flatMap { Desk.slots[$0] } ?? "Editie" }
    private var dateLine: String {
        guard let d = store.edition?.date, let date = HootDate.day(d) else { return "" }
        return date.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide))).capitalizedFirst
    }

    @State private var path: [Story] = []

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    let rows = store.editionRows
                    if store.status == .loading && rows.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    } else if rows.isEmpty {
                        if store.status == .failed {
                            EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Hoot heeft nog geen editie op deze iPhone. Zodra je verbinding hebt, verschijnt hij hier.", retry: store.load)
                        } else {
                            EmptyState(title: "Er is nog geen editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.")
                        }
                    } else {
                        StaleNotice()
                        Text("\(dateLine) · De editie voor iedereen")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                            .padding(.bottom, 16)
                        LeadCard(item: rows[0].item, label: rows[0].label, story: rows[0].story)
                        if wide {
                            // Breed: de rest in twee kolommen, elk verhaal met een lijn erboven.
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 32, alignment: .top), GridItem(.flexible(), spacing: 32, alignment: .top)], alignment: .leading, spacing: 8) {
                                ForEach(rows.dropFirst()) { row in
                                    VStack(alignment: .leading, spacing: 0) {
                                        Divider().padding(.vertical, 8)
                                        ItemRow(item: row.item, label: row.label, story: row.story)
                                    }
                                }
                            }
                        } else {
                            ForEach(rows.dropFirst()) { row in
                                Divider().padding(.vertical, 8)
                                ItemRow(item: row.item, label: row.label, story: row.story)
                            }
                        }
                        Text("Dat was de editie. De volgende verschijnt om \(store.edition?.next ?? "") uur.")
                            .font(.footnote)
                            .foregroundStyle(Theme.muted)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                    }
                }
                .padding(.horizontal)
                .column(wide ? Layout.wide : Layout.readable)
            }
            .debugScroll()
            .background(Theme.paper)
            .navigationTitle(title)
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .refreshable { await store.load() }
            .settingsButton()
            .task(id: store.editionRows.count) {
                // `-HootScreen verhaal`: het eerste verhaal met de meeste bronnen, om te vergelijken.
                if DebugLaunch.screen("verhaal"), path.isEmpty, let story = store.editionRows.compactMap(\.story).max(by: { ($0.sourceCount ?? 1) < ($1.sourceCount ?? 1) }) { path = [story] }
            }
        }
    }
}

// Een verhaal: alle publicaties, nieuwste eerst — vergelijken hoe bronnen het brengen.
struct StoryView: View {
    @Environment(HootStore.self) private var store
    let story: Story
    @State private var items: [Item] = []

    var body: some View {
        List {
            Section {
                Text("\(story.sourceCount ?? items.count) bronnen schrijven hierover")
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
            }
            .listRowBackground(Color.clear)
            ForEach(items) { item in
                ItemRow(item: item, label: store.isOn(store.source(item.source) ?? Source(id: item.source, name: "")) ? nil : "Buiten je bronnen")
                    .listRowBackground(Theme.surface)
            }
        }
        .scrollContentBackground(.hidden)
        .contentMargins(.horizontal, 0, for: .scrollContent)
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .navigationTitle("Verhaal")
        .navigationBarTitleDisplayMode(.inline)
        .task { items = await store.storyItems(story) }
    }
}

extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
