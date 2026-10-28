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
        if e.desk == "breed" { base = e.sourceCount.map { "Waar iedereen over schrijft · \($0) bronnen" } ?? "Waar iedereen over schrijft" } else { base = e.desk.flatMap { labels[$0] } }
        if followed || ["bubbel", "extern", "breed"].contains(e.desk ?? "") { return base }
        return [base, "Buiten je bronnen"].compactMap { $0 }.joined(separator: " · ")
    }
}

extension HootStore {
    var editionRows: [EditionRowModel] {
        guard let edition = shownEdition else { return [] }
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
    @Environment(\.openTab) private var openTab
    @Environment(\.isWide) private var wide
    private var title: String { store.edition?.slot.flatMap { Desk.slots[$0] } ?? "Editie" }
    private var dateLine: String {
        guard let d = store.edition?.date, let date = HootDate.day(d) else { return "" }
        return date.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide))).capitalizedFirst
    }

    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    let rows = store.editionRows
                    if store.status == .loading && rows.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    } else if rows.isEmpty {
                        if store.status == .failed {
                            EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Hoot heeft nog geen editie op dit toestel. Zodra je verbinding hebt, verschijnt hij hier.", retry: store.load)
                        } else {
                            EmptyState(title: "Er is nog geen editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.")
                        }
                    } else {
                        StaleNotice()
                        Text([dateLine, store.isPersonal ? "Jouw editie" : "De editie voor iedereen"].filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                            .padding(.bottom, Space.s4)
                        LeadCard(item: rows[0].item, label: rows[0].label, story: rows[0].story)
                        if wide {
                            // Breed: de rest in twee kolommen, elk verhaal met een lijn erboven.
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.s6, alignment: .top), GridItem(.flexible(), spacing: Space.s6, alignment: .top)], alignment: .leading, spacing: Space.s2) {
                                ForEach(rows.dropFirst()) { row in
                                    VStack(alignment: .leading, spacing: 0) {
                                        Rule().padding(.vertical, Space.s2)
                                        ItemRow(item: row.item, label: row.label, story: row.story)
                                    }
                                }
                            }
                        } else {
                            ForEach(rows.dropFirst()) { row in
                                Rule().padding(.vertical, Space.s2)
                                ItemRow(item: row.item, label: row.label, story: row.story)
                            }
                        }
                        // Het einde: een merkmoment in merkrood, zoals op de website. Je bent bij,
                        // en wanneer de volgende er is.
                        VStack(spacing: Space.s3) {
                            Text("h\(Text(".").foregroundStyle(Theme.onBrandRed))")
                                .font(.system(size: 40, weight: .heavy, design: .serif))
                                .accessibilityHidden(true)
                            Text("Je bent bij.").font(Theme.headline(.title))
                            Text("Dit was de \(title.lowercased())\(dateLine.isEmpty ? "" : " van \(dateLine.lowercased())").\(store.edition?.next.map { " De volgende staat klaar om \($0)." } ?? "")")
                                .font(.subheadline)
                                .multilineTextAlignment(.center)
                            Button("Toch verder lezen in de Stroom") { openTab(.stroom) }
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, Space.s5)
                                .frame(minHeight: Space.tap)
                                .overlay(Capsule().strokeBorder(Theme.onBrandRed, lineWidth: 1))
                                .padding(.top, Space.s2)
                        }
                        .foregroundStyle(Theme.onBrandRed)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, Space.s5)
                        .padding(.vertical, Space.s7)
                        .background(Theme.brandRed, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                        .padding(.top, Space.s6)
                        .padding(.bottom, Space.s4)
                    }
                }
                .padding(.horizontal)
                .column(wide ? Layout.wide : Layout.readable)
            }
            .debugScroll()
            .background(Theme.paper)
            .navigationTitle(title)
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .refreshable { await store.load() }
            .toolbar {
                // Het woordmerk, klein linksboven: je ziet waar je bent, zonder dat het de krant overneemt.
                ToolbarItem(placement: .topBarLeading) { Wordmark() }
                    .sharedBackgroundVisibility(.hidden)
            }
            .settingsButton()
            .task(id: store.editionRows.count) {
                // `-HootScreen verhaal`: het eerste verhaal met de meeste bronnen, om te vergelijken.
                if DebugLaunch.screen("verhaal"), path.isEmpty, let story = store.editionRows.compactMap(\.story).max(by: { ($0.sourceCount ?? 1) < ($1.sourceCount ?? 1) }) { path.append(story) }
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
        let sources = Set(items.map(\.source)).count
        List {
            // Waar het over gaat (de kop van het hoofdbericht), en eerlijk geteld: bronnen zijn
            // uitgevers, niet artikelen; drie stukken van één krant zijn geen drie bevestigingen.
            Section {
                VStack(alignment: .leading, spacing: Space.s2) {
                    if let lead = items.first(where: { $0.id == story.leadId }) ?? items.first {
                        Text(lead.title).font(Theme.headline(.title2)).fixedSize(horizontal: false, vertical: true)
                    }
                    if !items.isEmpty {
                        Text(sources == items.count ? "\(sources == 1 ? "1 bron" : "\(sources) bronnen"), nieuwste eerst" : "\(sources == 1 ? "1 bron" : "\(sources) bronnen"), \(items.count) artikelen, nieuwste eerst")
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                    }
                }
            }
            .listRowBackground(Color.clear)
            ForEach(items) { item in
                // In een lijst maakt een link in de rij de hele rij tot link: hier geen bronlink.
                ItemRow(item: item, label: label(item), linkSource: false)
                    .listRowBackground(Theme.surface)
            }
        }
        .scrollContentBackground(.hidden)
        .contentMargins(.horizontal, 0, for: .scrollContent)
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .navigationTitle("Vergelijken")
        .navigationBarTitleDisplayMode(.inline)
        .task { items = await store.storyItems(story) }
    }

    // Wie het eerst had, en wat uit een bron komt die je niet volgt.
    private func label(_ item: Item) -> String? {
        let first = items.count > 1 && item.id == items.last?.id ? "Eerste bericht" : nil
        let outside = store.isOn(store.source(item.source) ?? Source(id: item.source, name: "")) ? nil : "Buiten je bronnen"
        let parts = [first, outside].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}
