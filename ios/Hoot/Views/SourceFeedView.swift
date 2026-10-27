import SwiftUI

// Naar één bron: via de rij logo's bovenaan de Stroom, of door op de naam van een bron te tikken.
struct SourceRoute: Hashable { let id: String }

// Een bron als rond logo (de bronnen in de Stroom-rij en bovenaan het bronscherm).
struct SourceAvatar: View {
    let source: Source
    var size: CGFloat = 44
    var body: some View {
        AsyncImage(url: source.avatar.flatMap(URL.init(string:))) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Text(String(source.name.prefix(1))).font(.headline).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, maxHeight: .infinity).background(.quaternary)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(.separator, lineWidth: 0.5))
        .accessibilityHidden(true)
    }
}

// De rij met je bronnen: voorkeursbronnen vooraan, dan wie nu het meest brengt. Eén tik = die bron.
struct SourceStrip: View {
    @Environment(HootStore.self) private var store
    var body: some View {
        let counts = Dictionary(grouping: store.stream, by: \.source).mapValues(\.count)
        let list = store.followed.sorted { a, b in
            let fa = store.favorites.firstIndex(of: a.id), fb = store.favorites.firstIndex(of: b.id)
            if let fa, let fb { return fa < fb }
            if (fa != nil) != (fb != nil) { return fa != nil }
            return (counts[a.id] ?? 0) > (counts[b.id] ?? 0)
        }
        if list.count > 1 {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(list) { s in
                        NavigationLink(value: SourceRoute(id: s.id)) {
                            SourceAvatar(source: s, size: 44)
                                .overlay(alignment: .bottomTrailing) {
                                    if store.isFavorite(s.id) {
                                        Image(systemName: "star.fill").font(.system(size: 9, weight: .bold)).foregroundStyle(.white).padding(3).background(Theme.accent, in: Circle())
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Alles van \(s.name)")
                    }
                }
                .padding(.vertical, 4)
            }
            .scrollClipDisabled()
            .padding(.bottom, 12)
        }
    }
}

// Alles van één bron, nieuwste eerst, met de ster om er een voorkeursbron van te maken.
struct SourceFeedView: View {
    @Environment(HootStore.self) private var store
    let id: String
    @State private var limit = 60

    var body: some View {
        let source = store.source(id)
        let items = store.stream.filter { $0.source == id }
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                if let source {
                    HStack(spacing: 12) {
                        SourceAvatar(source: source, size: 52)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(source.name).font(Theme.headline(.title2))
                            if let about = source.about { Text(about).font(.subheadline).foregroundStyle(Theme.muted) }
                            Text(source.paid == true ? "Abonnement" : "Gratis").font(.caption.weight(.semibold)).foregroundStyle(source.paid == true ? Theme.muted : Theme.accent)
                        }
                    }
                    .padding(.bottom, 16)
                }
                if !store.isOn(source ?? Source(id: id, name: "")) {
                    EmptyState(title: "Deze bron staat uit", systemImage: "dot.radiowaves.up.forward", text: "Zet hem aan bij Bronnen om zijn berichten hier en in je Stroom te zien.")
                } else if items.isEmpty {
                    EmptyState(title: "Nu niets", systemImage: "tray", text: "Deze bron heeft op dit moment geen berichten.")
                } else {
                    ForEach(items.prefix(limit)) { item in
                        ItemRow(item: item, story: store.story(of: item), linkSource: false)
                        Divider()
                    }
                    if items.count > limit {
                        Button("Meer berichten") { limit += 60 }.buttonStyle(.glass).frame(maxWidth: .infinity).padding(.vertical, 24)
                    }
                }
            }
            .padding(.horizontal)
            .column()
        }
        .background(Theme.paper)
        .navigationTitle(source?.name ?? "Bron")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if source != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    let on = store.isFavorite(id)
                    Button(on ? "Geen voorkeursbron" : "Maak voorkeursbron", systemImage: on ? "star.fill" : "star") { store.setFavorite(id, !on) }
                        .tint(Theme.accent)
                }
            }
        }
    }
}
