import SwiftUI

// Stroom: alles van je bronnen, nieuwste eerst. Met Bluesky aan kies je bovenaan tussen het nieuws
// en de posts van wie je volgt (een eigen tabblad zou de zesde worden, en dan verstopt iOS
// Bewaard en Zoeken achter "Meer").
struct StreamView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.scenePhase) private var phase
    @Environment(Reader.self) private var reader
    @State private var behindReader = false // de lezer ligt eroverheen: dat is geen vertrek uit de Stroom
    @State private var showSources = DebugLaunch.screen("bronnen")
    @State private var showAccounts = false
    @State private var limit = 60
    @State private var pick: String? // de bron uit de rij bovenaan (nil = alles)
    @SceneStorage("streamMode") private var mode = DebugLaunch.screen("bluesky") ? "bluesky" : "nieuws"
    private var social: Bool { store.bluesky && mode == "bluesky" }

    var body: some View {
        NavigationStack {
            let items = pick.map { p in store.stream.filter { $0.source == p } } ?? store.stream
            ScrollView {
                if store.bluesky {
                    Picker("Wat je ziet", selection: $mode) {
                        Text("Nieuws").tag("nieuws")
                        Text("Bluesky").tag("bluesky")
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.bottom, Space.s3)
                    .column()
                }
                if social {
                    BlueskyFeed().padding(.horizontal).column()
                } else {
                LazyVStack(alignment: .leading, spacing: 0) {
                    SourceStrip(pick: $pick)
                    if store.status == .loading && items.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    } else if items.isEmpty {
                        if store.status == .failed {
                            EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Zodra je verbinding hebt, verschijnen hier de berichten van je bronnen.", retry: store.load)
                        } else {
                            EmptyState(title: "Nog niets", systemImage: "water.waves", text: "Zet bronnen aan via Bronnen rechtsboven.")
                        }
                    } else {
                        StaleNotice()
                        if let at = store.updatedAt, !store.stale {
                            Text(subtitle(at))
                                .font(.footnote)
                                .foregroundStyle(Theme.ink3)
                                .padding(.bottom, Space.s2)
                        }
                        let fresh = pick == nil ? store.newInStream : 0
                        ForEach(Array(items.prefix(limit).enumerated()), id: \.element.id) { i, item in
                            // Waar je de vorige keer was: daaronder heb je alles al gezien.
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
            .debugScroll()
            .background(Theme.paper)
            .navigationTitle(social ? "Bluesky" : "Stroom")
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .refreshable { await store.load() }
            .toolbar {
                // Bediening is stil (design system): grijs en zonder glazen rondje, zoals het tandwiel.
                ToolbarItem(placement: .topBarTrailing) {
                    Group {
                        if social {
                            Button("Accounts", systemImage: "person.2") { showAccounts = true }
                        } else {
                            Button("Bronnen", systemImage: "dot.radiowaves.up.forward") { showSources = true }
                        }
                    }
                    .tint(Theme.ink3)
                }
                .sharedBackgroundVisibility(.hidden)
            }
            .sheet(isPresented: $showSources) { SourcesView().debugAppearance() }
            .sheet(isPresented: $showAccounts) { BlueskyAccountsView().debugAppearance() }
            .settingsButton()
        }
        .onAppear { if behindReader { behindReader = false } else { store.openStream() } }
        .onDisappear { if reader.item != nil { behindReader = true } else { store.leaveStream() } }
        // Een bron die je uitzet, kan geen filter blijven (anders een lege lijst zonder uitweg).
        .onChange(of: store.followed.map(\.id)) { _, ids in if let p = pick, !ids.contains(p) { pick = nil } }
        .onChange(of: phase) { _, now in if now == .background { store.leaveStream() } }
    }

    private func subtitle(_ at: Date) -> String {
        let time = "Bijgewerkt om \(at.formatted(date: .omitted, time: .shortened))"
        switch store.newInStream {
        case 0: return store.streamMark == nil ? "De laatste berichten van je bronnen, nieuwste eerst. \(time)." : "\(time) · niets nieuws sinds je vorige bezoek"
        case 1: return "\(time) · 1 nieuw sinds je vorige bezoek"
        case let n: return "\(time) · \(n) nieuw sinds je vorige bezoek"
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

// Bewaard: wat je voor later bewaarde, op dit toestel.
struct SavedView: View {
    @Environment(HootStore.self) private var store
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
                        .onDelete { store.removeSaved(at: $0) }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
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
