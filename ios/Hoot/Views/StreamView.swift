import SwiftUI

// Stroom: alles van je bronnen, nieuwste eerst. Bovenaan de lijn met rubrieken en de bronnenstapel
// (StreamLine). Bluesky is daar een rubriek, naast Alles en Buiten je bubbel: een eigen tabblad zou
// de zesde worden, en dan verstopt iOS Bewaard en Zoeken achter "Meer".
struct StreamView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.scenePhase) private var phase
    @Environment(Reader.self) private var reader
    @State private var behindReader = false // de lezer ligt eroverheen: dat is geen vertrek uit de Stroom
    @State private var showSources = DebugLaunch.screen("bronnen")
    @State private var showAccounts = false
    @State private var limit = 60
    @State private var picks: Set<String> = Set(DebugLaunch.picks) // de bronnen uit de stapel (leeg = alle)
    @State private var lijn = LijnStand()
    @State private var knopAs: CGFloat? // de knop rechtsboven: het voorste logo van de stapel ligt eronder
    // De rubriek: "" is Alles; "bubbel" en "bluesky" zijn eigen lijsten, de rest een van de acht.
    @SceneStorage("streamRubriek") private var rubriek = DebugLaunch.startRubriek ?? ""
    @State private var debugStart = true // Debug: het startargument voor de rubriek is nog niet gebruikt

    var body: some View {
        NavigationStack {
            let bubble = store.bubbleItems
            let lezen: [(id: String, label: String)] = [("", "Alles")]
                + (bubble.isEmpty ? [] : [("bubbel", "Buiten je bubbel")])
                + (store.bluesky ? [("bluesky", "Bluesky")] : [])
            // Een rubriek die er niet (meer) is, valt terug op Alles: Bluesky uit, of geen bubbel in deze editie.
            let rub = lezen.contains { $0.id == rubriek } || Rubriek.byId[rubriek] != nil ? rubriek : ""
            let social = rub == "bluesky"
            let sources = store.stripSources
            // "Buiten je bubbel" komt juist uit bronnen die je niet volgt: daar telt de bronkeuze niet.
            let cats = Dictionary(store.followed.map { ($0.id, $0.cat) }, uniquingKeysWith: { a, _ in a })
            let items = rub == "bubbel" ? bubble : store.stream.filter { item in
                (picks.isEmpty || picks.contains(item.source)) && (rub.isEmpty || Rubriek.past(item, rub, cat: cats[item.source] ?? nil))
            }
            ScrollView {
                VStack(spacing: 0) {
                    StreamLine(
                        rubriek: Binding(get: { rub }, set: { rubriek = $0 }),
                        picks: $picks,
                        open: $lijn.open,
                        lezen: lezen,
                        rubrieken: Rubriek.alle.map { (id: $0.id, label: $0.label) },
                        bronnen: sources,
                        stapel: !social && (sources.count > 1 || !picks.isEmpty),
                        knopAs: knopAs
                    )
                    .padding(.bottom, Space.s2) // samen met de ruimte boven het eerste bericht 16
                    .padding(.horizontal)
                    .column()
                    if social {
                        BlueskyFeed().padding(.horizontal).column()
                    } else {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            // Het grote lege scherm gaat over de hele Stroom, los van rubriek en bronkeuze
                            // (die blijven bewaard): offline of zonder bronnen zie je het altijd.
                            let niets = items.isEmpty && store.stream.isEmpty
                            if store.status == .loading && niets {
                                ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                            } else if niets {
                                if store.status == .failed {
                                    EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Zodra je verbinding hebt, verschijnen hier de berichten van je bronnen.", retry: store.load)
                                } else {
                                    EmptyState(title: "Nog niets", systemImage: "water.waves", text: "Zet bronnen aan via Bronnen rechtsboven.")
                                }
                            } else {
                                StaleNotice().padding(.top, Space.s2) // 16 onder de lijn, net als een bericht
                                if items.isEmpty { quiet(rub, sources: sources) }
                                // Waar je de vorige keer was: alleen in de hele Stroom (die telt `newInStream`).
                                let fresh = picks.isEmpty && rub.isEmpty ? store.newInStream : 0
                                ForEach(Array(items.prefix(limit).enumerated()), id: \.element.id) { i, item in
                                    // Daaronder heb je alles al gezien.
                                    if fresh > 0 && i == fresh { SeenMarker() }
                                    ItemRow(item: item, story: store.story(of: item))
                                    if !(fresh > 0 && i == fresh - 1) { Rule() }
                                }
                                if items.count > limit {
                                    Button("Meer berichten") { limit += 60 }
                                        .buttonStyle(.glass)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, Space.s5)
                                }
                            }
                        }
                        .padding(.horizontal)
                        .column()
                    }
                }
            }
            .debugScroll()
            .background(Theme.paper)
            // Scrollen klapt de stapel dicht (ernaast tikken doet de lijn zelf).
            .onScrollPhaseChange { _, now in if now == .interacting, lijn.open { lijn.open = false } }
            .navigationTitle("Stroom") // de rode streep zegt al welke rubriek, ook bij Bluesky
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .refreshable { await store.load() }
            .toolbar {
                // Bediening is stil (design system): grijs en zonder glazen rondje, zoals het tandwiel.
                // Eén vaste knop waarvan alleen het icoon wisselt: zo blijft het tandwiel ernaast op zijn plek
                // als je tussen de rubrieken en Bluesky wisselt. Bij Bluesky een plus: iemand toevoegen.
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        lijn.open = false // ook met VoiceOver, waar geen echte tik naast de lijn valt
                        if social { showAccounts = true } else { showSources = true }
                    } label: {
                        Image(systemName: social ? "plus" : "dot.radiowaves.up.forward")
                            .contentTransition(.symbolEffect(.replace))
                            .frame(width: 24, height: 24)
                    }
                    .accessibilityLabel(social ? "Bluesky-account toevoegen" : "Bronnen")
                    .tint(Theme.ink3)
                    // Op de knop zelf meten, niet op het icoon: dat zou de werkbalk anders opmaken.
                    .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).midX } action: { knopAs = $0 }
                }
                .sharedBackgroundVisibility(.hidden)
            }
            .sheet(isPresented: $showSources) { SourcesView().debugAppearance() }
            .sheet(isPresented: $showAccounts) { BlueskyAccountsView().debugAppearance() }
            .settingsButton()
        }
        .onAppear {
            if behindReader { behindReader = false } else { store.openStream() }
            // Debug: het startargument gaat vóór de rubriek die iOS uit de vorige sessie terugzet.
            if debugStart, let r = DebugLaunch.startRubriek { rubriek = r }
            debugStart = false
        }
        .onDisappear { if reader.item != nil { behindReader = true } else { store.leaveStream() } }
        // Een bron die je uitzet, kan geen filter blijven (anders een lege lijst zonder uitweg).
        .onChange(of: store.followed.map(\.id)) { _, ids in
            let kept = picks.intersection(ids)
            if kept != picks { picks = kept }
        }
        .onChange(of: rubriek) { limit = 60 }
        .onChange(of: picks) { limit = 60 }
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
            Text("Hier was je gebleven").font(.caption.weight(.bold)).foregroundStyle(Theme.accent).fixedSize()
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
                    ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { dismiss() } }
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
                Text("Gratis: alles is te lezen. Abonnement: veel artikelen alleen met een abonnement bij de uitgever. Een bron aanzetten sluit geen abonnement af.")
                    .font(.footnote)
                    .foregroundStyle(Theme.ink3)
            }
            .listRowBackground(Color.clear)
            ForEach(Self.cats, id: \.0) { cat, label in
                let list = store.newsSources.filter { $0.cat == cat }
                if !list.isEmpty {
                    Section(label) {
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
                    }
                    .id(cat)
                }
            }
        }
        .debugJump(proxy, to: last, when: store.newsSources.count)
        }
    }
}

// Bewaard: wat je voor later bewaarde, op dit toestel. Verwijderen gaat meteen, met even de
// mogelijkheid het ongedaan te maken (zoals op de website).
struct SavedView: View {
    @Environment(HootStore.self) private var store
    @State private var removed: (index: Int, item: Item)?
    var body: some View {
        NavigationStack {
            Group {
                if store.saved.isEmpty {
                    EmptyState(title: "Nog niets bewaard", systemImage: "bookmark", text: "Tik op het bladwijzericoon bij een bericht om het hier te bewaren.")
                } else {
                    List {
                        ForEach(store.saved) { item in
                            ItemRow(item: item, linkSource: false).listRowBackground(Theme.surface)
                        }
                        .onDelete { offsets in
                            if let i = offsets.first { removed = (i, store.saved[i]) }
                            store.removeSaved(at: offsets)
                        }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
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
            .settingsButton()
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
            let hits = q.count < 2 ? [] : store.stream.filter { fold("\($0.title) \($0.summary ?? "")").contains(q) }
            List {
                ForEach(hits.prefix(80)) { item in
                    // Zonder "+N bronnen": een link in een lijstrij maakt de hele rij tot die link.
                    ItemRow(item: item, story: nil, linkSource: false).listRowBackground(Theme.surface)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.paper)
            .overlay {
                if q.count < 2 {
                    ContentUnavailableView("Zoek in je nieuws", systemImage: "magnifyingglass", description: Text("Hoot zoekt in de koppen en intro's van alles wat nu in je Stroom staat."))
                } else if hits.isEmpty {
                    ContentUnavailableView("Niets gevonden voor ‘\(query.trimmingCharacters(in: .whitespaces))’", systemImage: "magnifyingglass", description: Text("Hoot zoekt alleen in de koppen en intro's van wat nu in je Stroom staat, niet in hele artikelen of oudere berichten."))
                }
            }
            .navigationTitle("Zoeken")
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .searchable(text: $query, prompt: "Zoek in koppen en intro's")
        }
    }
}
