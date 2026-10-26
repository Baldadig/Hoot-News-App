import SwiftUI

// Stroom: alles van je bronnen, nieuwste eerst.
struct StreamView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.scenePhase) private var phase
    @State private var showSources = DebugLaunch.screen("bronnen")
    @State private var limit = 60

    var body: some View {
        NavigationStack {
            let items = store.stream
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
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
                                .foregroundStyle(Theme.muted)
                                .padding(.bottom, 8)
                        }
                        let fresh = store.newInStream
                        ForEach(Array(items.prefix(limit).enumerated()), id: \.element.id) { i, item in
                            // Waar je de vorige keer was: daaronder heb je alles al gezien.
                            if fresh > 0 && i == fresh { SeenMarker() }
                            ItemRow(item: item, story: store.story(of: item))
                            if !(fresh > 0 && i == fresh - 1) { Divider() }
                        }
                        if items.count > limit {
                            Button("Meer berichten") { limit += 60 }
                                .buttonStyle(.glass)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 24)
                        }
                    }
                }
                .padding(.horizontal)
                .column()
            }
            .debugScroll()
            .background(Theme.paper)
            .navigationTitle("Stroom")
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .refreshable { await store.load() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Bronnen", systemImage: "dot.radiowaves.up.forward") { showSources = true }
                }
            }
            .sheet(isPresented: $showSources) { SourcesView().debugAppearance() }
            .settingsButton()
        }
        .onAppear { store.openStream() }
        .onDisappear { store.leaveStream() }
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
        HStack(spacing: 10) {
            Rectangle().fill(Theme.accent).frame(height: 1)
            Text("Hier was je gebleven").font(.caption.weight(.bold)).foregroundStyle(Theme.accent).fixedSize()
            Rectangle().fill(Theme.accent).frame(height: 1)
        }
        .padding(.vertical, 10)
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
                    .foregroundStyle(Theme.muted)
            }
            .listRowBackground(Color.clear)
            ForEach(Self.cats, id: \.0) { cat, label in
                let list = store.newsSources.filter { $0.cat == cat }
                if !list.isEmpty {
                    Section(label) {
                        ForEach(list) { s in
                            Toggle(isOn: Binding(get: { store.isOn(s) }, set: { store.setOn(s, $0) })) {
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack(spacing: 6) {
                                        Text(s.name)
                                        if s.paid == true { Text("abonnement").font(.caption).foregroundStyle(Theme.muted) } else { Text("gratis").font(.caption.weight(.semibold)).foregroundStyle(Theme.accent) }
                                    }
                                    if let about = s.about { Text(about).font(.caption).foregroundStyle(Theme.muted) }
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
                    EmptyState(title: "Nog niets bewaard", systemImage: "bookmark", text: "Tik op het bladwijzer-icoon bij een bericht om het hier te bewaren.")
                } else {
                    List {
                        ForEach(store.saved) { item in
                            ItemRow(item: item).listRowBackground(Theme.surface)
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
        }
    }
}

// Zoeken: in alles wat Hoot nu van je bronnen heeft.
struct SearchView: View {
    @Environment(HootStore.self) private var store
    @State private var query = DebugLaunch.query ?? ""
    var body: some View {
        NavigationStack {
            let q = query.trimmingCharacters(in: .whitespaces).lowercased()
            let hits = q.count < 2 ? [] : store.stream.filter { "\($0.title) \($0.summary ?? "")".lowercased().contains(q) }
            List {
                ForEach(hits.prefix(80)) { item in
                    ItemRow(item: item, story: store.story(of: item)).listRowBackground(Theme.surface)
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
            .searchable(text: $query, prompt: "Zoek in koppen en intro's")
        }
    }
}
