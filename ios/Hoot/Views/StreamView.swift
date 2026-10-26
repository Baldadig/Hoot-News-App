import SwiftUI

// Stroom: alles van je bronnen, nieuwste eerst.
struct StreamView: View {
    @Environment(HootStore.self) private var store
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
                            Text("Bijgewerkt om \(at.formatted(date: .omitted, time: .shortened))")
                                .font(.footnote)
                                .foregroundStyle(Theme.muted)
                                .padding(.bottom, 8)
                        }
                        ForEach(items.prefix(limit)) { item in
                            ItemRow(item: item, story: store.story(of: item))
                            Divider()
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
            .sheet(isPresented: $showSources) { SourcesView() }
            .settingsButton()
        }
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
        .presentationDetents([.medium, .large])
    }
}

struct SourcesList: View {
    @Environment(HootStore.self) private var store
    private static let cats: [(String, String)] = [("nl", "Nederland"), ("int", "Internationaal"), ("vl", "Vlaanderen"), ("regio", "Regio"), ("economie", "Economie"), ("tech", "Tech"), ("wetenschap", "Wetenschap"), ("sport", "Sport"), ("cultuur", "Cultuur"), ("games", "Games")]

    var body: some View {
        let last = Self.cats.last { cat in store.newsSources.contains { $0.cat == cat.0 } }?.0
        ScrollViewReader { proxy in
        List {
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
                if q.count >= 2 && hits.isEmpty { ContentUnavailableView.search(text: query) }
            }
            .navigationTitle("Zoeken")
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .searchable(text: $query, prompt: "Zoek in je bronnen")
        }
    }
}
