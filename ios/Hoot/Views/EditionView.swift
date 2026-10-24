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
        return [base, "Volg je niet"].compactMap { $0 }.joined(separator: " · ")
    }
}

extension HootStore {
    var editionRows: [EditionRowModel] {
        guard let edition else { return [] }
        let published = Dictionary((edition.items ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let on = Set(followed.map(\.id))
        let rows: [EditionRowModel] = edition.entries.compactMap { e in
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
    @State private var showSources = false

    private var title: String { store.edition?.slot.flatMap { Desk.slots[$0] } ?? "Editie" }
    private var dateLine: String {
        guard let d = store.edition?.date, let date = ISO8601DateFormatter.ymd.date(from: d) else { return "" }
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "nl_NL"))).capitalizedFirst
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    let rows = store.editionRows
                    if store.status == .loading && rows.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    } else if rows.isEmpty {
                        EmptyState(title: store.status == .failed ? "Geen verbinding" : "Er is nog geen editie", systemImage: store.status == .failed ? "wifi.slash" : "newspaper", text: store.status == .failed ? "Trek omlaag om het opnieuw te proberen." : "In de Stroom staat alles wat er wél is.")
                    } else {
                        Text("\(dateLine) · De editie voor iedereen")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.bottom, 16)
                        LeadCard(item: rows[0].item, label: rows[0].label, story: rows[0].story)
                        ForEach(rows.dropFirst()) { row in
                            Divider().padding(.vertical, 8)
                            ItemRow(item: row.item, label: row.label, story: row.story)
                        }
                        Text("Dat was de editie. De volgende verschijnt om \(store.edition?.next ?? "") uur.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                    }
                }
                .padding(.horizontal)
            }
            .background(Theme.paper)
            .navigationTitle(title)
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .refreshable { await store.load() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Bronnen", systemImage: "dot.radiowaves.up.forward") { showSources = true }
                }
            }
            .sheet(isPresented: $showSources) { SourcesView() }
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
                    .foregroundStyle(.secondary)
            }
            .listRowBackground(Color.clear)
            ForEach(items) { item in
                ItemRow(item: item, label: store.isOn(store.source(item.source) ?? Source(id: item.source, name: "")) ? nil : "Volg je niet")
                    .listRowBackground(Theme.surface)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle("Verhaal")
        .navigationBarTitleDisplayMode(.inline)
        .task { items = await store.storyItems(story) }
    }
}

extension ISO8601DateFormatter {
    static let ymd: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()
}

extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
