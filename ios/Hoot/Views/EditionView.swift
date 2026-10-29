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
        #if DEBUG
        // App Store-opnamen: gekozen echte verhalen (neutraal of positief) in de gegeven volgorde.
        if !DebugLaunch.feature.isEmpty {
            return DebugLaunch.feature.compactMap { f in
                // Een los bericht (geen verhaal): dat bericht zelf.
                if storiesById[f.id] == nil, let item = itemsById[f.id] {
                    return EditionRowModel(id: item.id, item: item, story: item.storyId.flatMap { storiesById[$0] }, label: f.label, desk: nil)
                }
                // Gratis bronnen voorrang (Nederlandstalig eerst), anders het hoofdstuk van het verhaal.
                guard let story = storiesById[f.id] else { return nil }
                let all = ([story.leadId].compactMap { $0 } + story.itemIds).compactMap { itemsById[$0] }
                let free = { (i: Item) in self.source(i.source).map { $0.paid != true } ?? false }
                guard let item = all.first(where: { free($0) && self.source($0.source)?.lang == "nl" }) ?? all.first(where: free) ?? all.first else { return nil }
                return EditionRowModel(id: story.id, item: item, story: story, label: f.label, desk: nil)
            }
        }
        #endif
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
    // `-HootScroll slot`: het voorlaatste verhaal bovenaan, zodat het einde met twee verhalen erboven in beeld staat.
    static func slotTarget(_ rows: [EditionRowModel]) -> String? {
        #if DEBUG
        if UserDefaults.standard.string(forKey: "HootScroll") == "slot", rows.count >= 2 { return rows[rows.count - 2].id }
        #endif
        return nil
    }
    @Environment(HootStore.self) private var store
    @Environment(\.openTab) private var openTab
    @Environment(\.isWide) private var wide
    private var title: String { store.edition?.slot.flatMap { Desk.slots[$0] } ?? "Editie" }
    private var dateLine: String {
        guard let d = store.edition?.date, let date = HootDate.day(d) else { return "" }
        return date.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide))).capitalizedFirst
    }

    @State private var path = NavigationPath()
    @State private var nudge = false // "Maak Hoot van jou", na even rondkijken
    @State private var setup = false

    // Een plek in de Editie: het verhaal met meer of minder hiervan in het menu (lang drukken), of
    // ingeklapt tot één regel als je er minder van wilde.
    @ViewBuilder private func slot<Content: View>(_ row: EditionRowModel, @ViewBuilder content: () -> Content) -> some View {
        let items = [row.item] + (row.story?.itemIds ?? []).filter { $0 != row.item.id }.compactMap { store.itemsById[$0] }
        if store.less.contains(row.id) {
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Text("Je ziet minder over \(Taste.about(items)).")
                    .font(.subheadline)
                    .foregroundStyle(Theme.ink3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Button("Ongedaan maken") { withAnimation(.snappy) { store.undoLess(row.id, items: items) } }
                    .font(.subheadline.weight(.semibold))
                    .tint(Theme.accent)
                    .frame(minHeight: Space.tap)
            }
            .transition(.opacity)
        } else {
            content()
                .environment(\.tasteVote) { up in
                    withAnimation(.snappy) { store.vote(row.id, items: items, up: up) }
                    UIAccessibility.post(notification: .announcement, argument: up ? "Je ziet meer over \(Taste.about(items))" : "Je ziet minder over \(Taste.about(items))")
                }
        }
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    let rows = store.editionRows
                    if store.status == .loading && rows.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    } else if rows.isEmpty {
                        if store.status == .failed {
                            EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Hoot heeft nog geen Editie op dit toestel. Zodra je verbinding hebt, verschijnt hij hier.", retry: store.load)
                        } else {
                            EmptyState(title: "Er is nog geen Editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.")
                        }
                    } else {
                        StaleNotice()
                        Text([dateLine, store.isPersonal ? "Jouw Editie" : "De Editie voor iedereen"].filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                            .padding(.bottom, Space.s4)
                        slot(rows[0]) { LeadCard(item: rows[0].item, label: rows[0].label, story: rows[0].story) }
                        if wide {
                            // Breed: de rest in twee kolommen, elk verhaal met een lijn erboven.
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.s6, alignment: .top), GridItem(.flexible(), spacing: Space.s6, alignment: .top)], alignment: .leading, spacing: Space.s2) {
                                ForEach(rows.dropFirst()) { row in
                                    VStack(alignment: .leading, spacing: 0) {
                                        Rule().padding(.vertical, Space.s2)
                                        slot(row) { ItemRow(item: row.item, label: row.label, story: row.story) }
                                    }
                                }
                            }
                        } else {
                            ForEach(rows.dropFirst()) { row in
                                Rule().padding(.vertical, Space.s2)
                                slot(row) { ItemRow(item: row.item, label: row.label, story: row.story) }
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
                            // Het einde is leidend; verder lezen mag, als rustige link in plaats van een knop.
                            Button { openTab(.stroom) } label: {
                                Text("Of lees verder in de Stroom").underline()
                            }
                            .font(.subheadline.weight(.semibold))
                            .opacity(0.85)
                            .frame(minHeight: Space.tap)
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
            .debugJump(proxy, to: Self.slotTarget(store.editionRows), when: store.editionRows.count)
            // Wie eerst even rondkijkt: na ongeveer een derde van de editie één keer de vraag.
            .onScrollGeometryChange(for: Bool.self) { g in
                let room = g.contentSize.height - g.containerSize.height
                return room > 0 && (g.contentOffset.y + g.contentInsets.top) / room > 0.35
            } action: { _, past in
                if past, store.browsing, !nudge { withAnimation(.easeOut(duration: 0.3)) { nudge = true } }
            }
            }
            .safeAreaInset(edge: .bottom) {
                if nudge && store.browsing { MakeItYours(choose: { setup = true }, later: { withAnimation { store.browsing = false } }) }
            }
            .sheet(isPresented: $setup) {
                NavigationStack {
                    SetupSteps { store.browsing = false; setup = false }
                        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Annuleer", role: .cancel) { setup = false } } }
                }
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
                    let lead = items.first(where: { $0.id == story.leadId }) ?? items.first
                    // Een beeld bij het verhaal: dat van het hoofdbericht, of anders het eerste scherpe.
                    if store.showsImage(lead: true), let image = ([lead].compactMap { $0 } + items).lazy.compactMap(\.image).first(where: { ImageURL.fitsHero($0) }) {
                        FramedImage(url: ImageURL.url(image, .large), ratio: 16 / 9).padding(.bottom, Space.s1)
                    }
                    if let lead {
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
            .contentShape(Rectangle())
            .opensArticle(items.first(where: { $0.id == story.leadId }) ?? items.first)
            // Het hoofdbericht staat al bovenaan (tik op de kop): niet nog eens in de lijst.
            ForEach(items.filter { $0.id != (items.first(where: { $0.id == story.leadId }) ?? items.first)?.id }) { item in
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

// Na even rondkijken: de uitnodiging om Hoot van jezelf te maken. Zweeft onderaan (net als
// "Ongedaan maken" in Bewaard), één keer; "Later" is ook een antwoord.
struct MakeItYours: View {
    var choose: () -> Void
    var later: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Text("Maak Hoot van jou").font(Theme.headline(.title3))
            Text("Je leest nu een keuze uit gratis Nederlandse bronnen. Kies je eigen bronnen en interesses, dan wordt dit echt jouw Editie.")
                .font(.subheadline)
                .foregroundStyle(Theme.ink2)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Space.s4) {
                Button(action: choose) {
                    Text("Kies je bronnen").font(.headline).padding(.horizontal, Space.s5).frame(minHeight: Space.tap)
                }
                .foregroundStyle(.white)
                .background(Theme.accent, in: Capsule())
                Button("Later", action: later)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.ink2)
                    .frame(minHeight: Space.tap)
            }
            .padding(.top, Space.s1)
        }
        .padding(Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 2) // zweeft, zoals de melding in Bewaard
        .padding(.horizontal)
        .padding(.bottom, Space.s2)
        .column()
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .accessibilityElement(children: .contain)
    }
}
