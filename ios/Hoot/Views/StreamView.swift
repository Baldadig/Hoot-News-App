import SwiftUI

// Stroom: alles van je bronnen, nieuwste eerst. Bovenaan de lijn met rubrieken en de bronnenstapel
// (StreamLine): Alles, je rubrieken en Buiten je bubbel. Bluesky staat bij Instellingen.
struct StreamView: View {
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(HootStore.self) private var store
    @Environment(\.scenePhase) private var phase
    @Environment(Reader.self) private var reader
    @State private var lines = LoadLinesModel() // de laadstrepen bij het eerste laden (LoadLines.swift)
    @State private var behindReader = false // de lezer ligt eroverheen: dat is geen vertrek uit de Stroom
    @State private var showSources = DebugLaunch.screen("bronnen")
    @State private var categoryTask: Task<Void, Never>?
    @State private var viewportHeight: CGFloat = 0
    @State private var headerHeight: CGFloat = 0
    @State private var limit = 60
    @State private var picks: Set<String> = Set(DebugLaunch.picks) // de bronnen uit de stapel (leeg = alle)
    @State private var lijn = LijnStand()
    @State private var knopAs: CGFloat? // de knop rechtsboven: het voorste logo van de stapel ligt eronder
    // De rubriek: "" is Alles; "bubbel" is een eigen lijst, de rest een van de gekozen rubrieken.
    @SceneStorage("streamRubriek") private var rubriek = DebugLaunch.startRubriek ?? ""
    @State private var debugStart = true // Debug: het startargument voor de rubriek is nog niet gebruikt

    // Koos je geen interesses, dan alle acht (rubriekRij op het web).
    static func tabs(interests: [String], bubble: Bool) -> [(id: String, label: String)] {
        let chosen = Rubriek.alle.filter { interests.contains($0.id) }
        return [("", "Alles")]
            + (chosen.isEmpty ? Rubriek.alle : chosen).map { (id: $0.id, label: $0.label) }
            + (bubble ? [("bubbel", "Buiten je bubbel")] : [])
    }

    var body: some View {
        NavigationStack {
            let bubble = store.bubbleItems
            // De rij: alleen Alles en de hoofdrubrieken die je koos, in de vaste volgorde van Rubriek.alle
            // (Politiek, Binnenland, Wereld, Economie, Tech, Wetenschap, Cultuur, Sport), en Buiten je
            // bubbel als laatste. Geen onderwerpen of andere tabs; gelijk aan het web.
            let tabs = Self.tabs(interests: store.interests, bubble: !bubble.isEmpty)
            let lezen = Array(tabs.prefix(1)), rubrieken = Array(tabs.dropFirst())
            // Een rubriek die er niet (meer) is, valt terug op Alles: niet meer gekozen, of geen bubbel in deze editie.
            let rub = rubrieken.contains { $0.id == rubriek } ? rubriek : ""
            let sources = store.stripSources
            // "Buiten je bubbel" komt juist uit bronnen die je niet volgt: daar telt de bronkeuze niet.
            let cats = Dictionary(store.followed.map { ($0.id, $0.cat) }, uniquingKeysWith: { a, _ in a })
            // Hetzelfde stuk bij twee van je bronnen (zusterkranten) één keer; kies je één bron, dan alles van die bron.
            let items = rub == "bubbel" ? bubble : store.withoutCopies(store.stream.filter { item in
                (picks.isEmpty || picks.contains(item.source)) && (rub.isEmpty || Rubriek.past(item, rub, cat: cats[item.source] ?? nil))
            })
            ScrollViewReader { scroll in
            ScrollView {
                VStack(spacing: 0) {
                    Color.clear.frame(height: 0).id("stroom-boven")
                    VStack(spacing: 0) {
                    // De kopregel en de schermtitel in de scroll (C7), op de kolomlijn boven de rubriekenlijn.
                    VStack(alignment: .leading, spacing: 0) {
                        HootKop(gearX: { knopAs = $0 }) {
                            HootKopButton(label: "Bronnen", systemImage: "dot.radiowaves.up.forward") {
                                lijn.open = false // ook met VoiceOver, waar geen echte tik naast de lijn valt
                                showSources = true
                            }
                        }
                        ScreenTitle("Stroom")
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .column()
                    StreamLine(
                        announcesRubriek: false,
                        rubriek: Binding(get: { rub }, set: { next in
                            categoryTask?.cancel()
                            guard next != rub else { return }
                            let incoming = next == "bubbel" ? bubble : store.withoutCopies(store.stream.filter { item in
                                (picks.isEmpty || picks.contains(item.source)) && (next.isEmpty || Rubriek.past(item, next, cat: cats[item.source] ?? nil))
                            })
                            categoryTask = Task {
                                if !still { await RubriekWissel.preload(RubriekWissel.images(incoming, enabled: store.images == "aan", kind: store.layout == "krant" ? .thumb : .large)) }
                                guard !Task.isCancelled else { return }
                                // Zelf een rubriek kiezen begint bovenaan, zoals concept A.
                                var transaction = Transaction(); transaction.disablesAnimations = true
                                withTransaction(transaction) { scroll.scrollTo("stroom-boven", anchor: .top) }
                                rubriek = next
                                AccessibilityNotification.Announcement("Rubriek \(tabs.first(where: { $0.id == next })?.label ?? "Alles").").post()
                            }
                        }),
                        picks: $picks,
                        open: $lijn.open,
                        lezen: lezen,
                        rubrieken: rubrieken,
                        bronnen: sources,
                        stapel: sources.count > 1 || !picks.isEmpty,
                        knopAs: knopAs
                    )
                    // De rubriekenlijn groeit mee tot de eerste accessibility-maat: groter past "Buiten je
                    // bubbel" niet meer naast Alles en de stapel (zoals de bovenregel van het welkom).
                    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
                    .padding(.bottom, Space.s2) // samen met de ruimte boven het eerste bericht 16
                    .padding(.horizontal)
                    .column()
                    }
                    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { headerHeight = $0 }
                    RubriekVlak(id: rub, minimumHeight: max(0, viewportHeight - headerHeight)) {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        // Het grote lege scherm gaat over de hele Stroom, los van rubriek en bronkeuze
                        // (die blijven bewaard): offline of zonder bronnen zie je het altijd.
                        let niets = items.isEmpty && store.stream.isEmpty
                        if store.status == .loading && niets {
                            LoadLinesBox()
                        } else if niets {
                            Group {
                                if store.status == .failed {
                                    EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Zodra je verbinding hebt, verschijnen hier de berichten van je bronnen.", retry: store.load)
                                } else {
                                    EmptyState(title: "Al je bronnen staan uit.", systemImage: "water.waves", action: (label: "Naar Bronnen", systemImage: nil, run: { showSources = true }))
                                }
                            }
                            .loadLinesError(lines)
                        } else {
                            Group {
                            StaleNotice().padding(.top, Space.s2) // 16 onder de lijn, net als een bericht
                            if items.isEmpty { quiet(rub, sources: sources) }
                            // Waar je de vorige keer was: alleen in de hele Stroom (die telt `newInStream`).
                            let fresh = picks.isEmpty && rub.isEmpty ? store.newInStream : 0
                            ForEach(Array(items.prefix(limit).enumerated()), id: \.element.id) { i, item in
                                // Daaronder heb je alles al gezien.
                                if fresh > 0 && i == fresh { SeenMarker() }
                                Group {
                                    if item.isPost { PostRow(item: item) }
                                    else { ItemRow(item: item, story: store.story(of: item)) }
                                }
                                    .transition(.identity)
                                if !(fresh > 0 && i == fresh - 1) { Rule() }
                            }
                            if items.count > limit {
                                Button("Meer berichten") { limit += 60 }
                                    .buttonStyle(.glass)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, Space.s5)
                            }
                            }
                            .loadLinesText(lines)
                        }
                    }
                    .loadLines(lines, loading: store.status == .loading && items.isEmpty && store.stream.isEmpty, ok: !store.stream.isEmpty)
                    .padding(.horizontal)
                    .column()
                    }
                }
            }
            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { viewportHeight = $0 }
            .debugScroll()
            .background(Theme.paper)
            // Scrollen klapt de stapel dicht (ernaast tikken doet de lijn zelf).
            .onScrollPhaseChange { _, now in if now == .interacting, lijn.open { lijn.open = false } }
            .navigationTitle("Stroom") // de rode streep zegt al welke rubriek
            .hootKopScreen()
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .hootRefresh(indicator: !store.stream.isEmpty) { await store.load() }
            .sheet(isPresented: $showSources) { SourcesView().debugAppearance() }
            .settingsButton()
            }
        }
        .onAppear {
            if behindReader { behindReader = false } else { store.openStream() }
            // Debug: het startargument gaat vóór de rubriek die iOS uit de vorige sessie terugzet.
            if debugStart, let r = DebugLaunch.startRubriek { rubriek = r }
            debugStart = false
        }
        .onDisappear { categoryTask?.cancel(); if reader.item != nil { behindReader = true } else { store.leaveStream() } }
        // Een bron die je uitzet, kan geen filter blijven (anders een lege lijst zonder uitweg).
        .onChange(of: store.followed.map(\.id)) { _, ids in
            let kept = picks.intersection(ids)
            if kept != picks { picks = kept }
        }
        .onChange(of: rubriek) { limit = 60 }
        .onChange(of: picks) { categoryTask?.cancel(); limit = 60 }
        .onChange(of: phase) { _, now in if now == .background { store.leaveStream() } }
    }

    // Een rubriek of bronnen zonder berichten: een stille regel, geen groot leeg scherm.
    private func quiet(_ rub: String, sources: [Source]) -> some View {
        let names = StreamLine.opsomming(sources.filter { picks.contains($0.id) }.map(\.name))
        let place = rub.isEmpty ? "vandaag" : "in \(Rubriek.byId[rub]?.label ?? rub)"
        return VStack(alignment: .leading, spacing: Space.s1) {
            Text(picks.isEmpty || rub == "bubbel" ? "Nog niets \(place)." : "Nog niets van \(names) \(place).")
                .foregroundStyle(Theme.ink2)
            if !picks.isEmpty && rub != "bubbel" {
                Button {
                    picks = []
                    AccessibilityNotification.Announcement("Alle bronnen.").post()
                } label: {
                    // Het tikvlak is het label: daar hoort de 44, niet om de knop heen.
                    Text("Toon alle bronnen")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Theme.accent)
                        .frame(minHeight: Space.tap)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, Space.s4) // met de 8 onder de lijn 24, zoals in het prototype
        .padding(.bottom, Space.s5)
        .overlay(alignment: .bottom) { Rule() }
    }
}

// Of de bronnenstapel open is. Een eigen object, zodat open en dicht alleen de lijn opnieuw tekent:
// StreamView leest het niet in zijn body, dus de hele lijst wordt er niet opnieuw voor berekend.
@MainActor
@Observable
private final class LijnStand {
    var open = DebugLaunch.screen("stroom-bronnen") // de stapel is uitgewaaierd
}

extension HootStore {
    // Buiten je bubbel voor de Stroom: alleen de bubbelverhalen van de editie die je ziet, zonder
    // de hele editie op te bouwen (zie editionRows).
    var bubbleItems: [Item] {
        guard bubble, let edition = shownEdition else { return [] }
        let entries = edition.entries.filter { $0.desk == "bubbel" }
        guard !entries.isEmpty else { return [] }
        return entries.compactMap { e in
            let leadId = e.kind == "story" ? (e.leadId ?? e.id) : e.id
            return edition.items?.first { $0.id == leadId } ?? itemsById[leadId]
        }
    }
}

// De grens tussen nieuw en al gezien.
private struct SeenMarker: View {
    var body: some View {
        HStack(spacing: Space.s3) {
            Rectangle().fill(Theme.accent).frame(height: 1)
            Text("Hier was je gebleven").font(.system(.footnote, design: .serif)).foregroundStyle(Theme.ink2).fixedSize()
            Rectangle().fill(Theme.accent).frame(height: 1)
        }
        .padding(.vertical, Space.s3)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

// Bronnen aan- en uitzetten, per soort. Als blad (vanuit de Stroom) en als pagina in Instellingen.
struct SourcesView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            SourcesList()
                .navigationTitle("Bronnen")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) { Button("Klaar") { dismiss() } } // tekst in inkt, zoals Instellingen
                }
        }
        .presentationDetents([.large]) // een rustig, dicht blad: geen feed die erdoorheen schijnt
    }
}

struct SourcesList: View {
    @Environment(HootStore.self) private var store
    private static let cats: [(String, String)] = [("nl", "Nederland"), ("int", "Internationaal"), ("vl", "Vlaanderen"), ("regio", "Regio"), ("economie", "Economie"), ("tech", "Tech"), ("wetenschap", "Wetenschap"), ("sport", "Sport"), ("cultuur", "Cultuur"), ("games", "Games")]

    var body: some View {
        let last = Self.cats.last { cat in store.newsSources.contains { $0.cat == cat.0 } }?.0
        ScrollViewReader { proxy in
        List {
            Section {
                Text("Abonnement: hele artikelen alleen voor abonnees. Aanzetten kost niets.")
                    .font(.footnote)
                    .foregroundStyle(Theme.ink3)
            }
            .listRowBackground(Color.clear)
            ForEach(Self.cats, id: \.0) { cat, label in
                let list = store.newsSources.filter { $0.cat == cat }
                if !list.isEmpty {
                    Section {
                        ForEach(list) { s in
                            HStack(spacing: Space.s1) {
                            if store.isOn(s) {
                                // Voorkeursbron: weegt zwaarder in je editie en staat vooraan in de Stroom.
                                Button { store.setFavorite(s.id, !store.isFavorite(s.id)) } label: {
                                    Image(systemName: store.isFavorite(s.id) ? "star.fill" : "star").foregroundStyle(store.isFavorite(s.id) ? Theme.accent : Theme.ink3).frame(width: Space.tap, height: Space.tap)
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel(store.isFavorite(s.id) ? "\(s.name): voorkeursbron" : "Maak \(s.name) een voorkeursbron")
                            } else {
                                // Plek van de ster vrijhouden: alle namen op één lijn, aan of uit.
                                Color.clear.frame(width: Space.tap, height: Space.tap).accessibilityHidden(true)
                            }
                            Toggle(isOn: Binding(get: { store.isOn(s) }, set: { store.setOn(s, $0) })) {
                                VStack(alignment: .leading, spacing: Space.s0) {
                                    HStack(spacing: Space.s2) {
                                        Text(s.name)
                                        if s.paid == true { Text("abonnement").font(.caption).foregroundStyle(Theme.ink3) } else { Text("gratis").font(.caption.weight(.semibold)).foregroundStyle(Theme.accent) }
                                    }
                                    if let about = s.about { Text(about).font(.caption).foregroundStyle(Theme.ink3) }
                                }
                            }
                            }
                        }
                    } header: {
                        FormHeader(label)
                    }
                    .hootRows()
                    .id(cat)
                }
            }
        }
        .hootForm()
        .debugJump(proxy, to: last, when: store.newsSources.count)
        }
    }
}

// Bewaard: wat je voor later bewaarde, op dit toestel. Verwijderen gaat meteen, met even de
// mogelijkheid het ongedaan te maken (zoals op de website).
struct SavedView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.openTab) private var openTab
    @State private var removed: (index: Int, item: Item)?
    var body: some View {
        NavigationStack {
            Group {
                if store.saved.isEmpty {
                    // Dezelfde woorden als op het web, met de Editie als vervolgstap.
                    VStack(alignment: .leading, spacing: 0) {
                        ScreenTitle("Bewaard").padding(.horizontal)
                        EmptyState(title: "Nog niets bewaard", systemImage: "bookmark", text: "Tik op de bladwijzer bij een verhaal. Het staat hier tot je het hebt gelezen, ook zonder verbinding.", action: (label: "Naar de Editie", systemImage: nil, run: { openTab(.editie) }))
                    }
                    .column()
                } else {
                    List {
                        Section {
                            ForEach(store.saved) { item in
                                ItemRow(item: item, linkSource: false).listRowBackground(Theme.surface)
                            }
                            .onDelete { offsets in
                                if let i = offsets.first { removed = (i, store.saved[i]) }
                                store.removeSaved(at: offsets)
                            }
                        } header: {
                            // De schermtitel als kop van de lijst (C7), op de lijn van de rijen.
                            ScreenTitle("Bewaard").textCase(nil).listRowInsets(EdgeInsets())
                        }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .safeAreaInset(edge: .bottom) {
                if let r = removed {
                    HStack {
                        Text("Verwijderd uit Bewaard").foregroundStyle(Theme.ink2)
                        Spacer()
                        Button("Ongedaan maken") { store.restoreSaved(r.item, at: r.index); removed = nil }
                            .fontWeight(.semibold)
                            .frame(minHeight: Space.tap)
                    }
                    .font(.subheadline)
                    .padding(.horizontal, Space.s4)
                    .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                    .shadow(color: .black.opacity(0.12), radius: 8, y: 2) // zweeft: de enige plek met schaduw
                    .padding(.horizontal)
                    .padding(.bottom, Space.s2)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .accessibilityElement(children: .contain)
                    .task(id: r.item.id) {
                        AccessibilityNotification.Announcement("Verwijderd uit Bewaard").post()
                        try? await Task.sleep(for: .seconds(6))
                        if removed?.item.id == r.item.id { withAnimation { removed = nil } }
                    }
                }
            }
            .animation(.easeOut(duration: 0.2), value: removed?.item.id)
            .background(Theme.paper)
            .navigationTitle("Bewaard")
            .hootBrandHeader()
            .hootScreenTitle()
            .settingsButton(toolbar: true)
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
        }
    }
}

// Zoeken: in alles wat Hoot nu van je bronnen heeft.
struct SearchView: View {
    @Environment(HootStore.self) private var store
    @State private var query = DebugLaunch.query ?? ""
    var body: some View {
        NavigationStack {
            // Zonder hoofdletters en accenten: "Oekraine" vindt ook "Oekraïne", "Israel" ook "Israël".
            let fold = { (s: String) in s.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil) }
            let q = fold(query.trimmingCharacters(in: .whitespaces))
            let hits = q.count < 2 ? [] : store.withoutCopies(store.stream.filter { fold("\($0.title) \($0.summary ?? "")").contains(q) })
            List {
                Section {
                    ForEach(hits.prefix(80)) { item in
                        // Zonder "+N bronnen": een link in een lijstrij maakt de hele rij tot die link.
                        ItemRow(item: item, story: nil, linkSource: false).listRowBackground(Theme.surface)
                    }
                } header: {
                    // Dezelfde schermtitel als Bewaard, Stroom en Selectie (t5-screen), niet de grote
                    // systeemtitel: die stond groter en lager (B2).
                    ScreenTitle("Zoeken").textCase(nil).listRowInsets(EdgeInsets())
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.paper)
            .overlay {
                if q.count < 2 {
                    EmptyState(title: "Zoek in je nieuws", systemImage: "magnifyingglass", text: "In koppen en intro’s van je Stroom.")
                } else if hits.isEmpty {
                    EmptyState(title: "Niets gevonden voor ‘\(query.trimmingCharacters(in: .whitespaces))’", systemImage: "magnifyingglass", text: "Hoot zoekt in koppen en intro’s van je Stroom.")
                }
            }
            .navigationTitle("Zoeken")
            .hootBrandHeader()
            .hootScreenTitle()
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .searchable(text: $query, prompt: "Zoek in koppen en intro’s")
        }
    }
}
