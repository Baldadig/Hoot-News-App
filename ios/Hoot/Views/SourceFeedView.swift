import SwiftUI

// Naar één bron: door op de naam van een bron te tikken.
struct SourceRoute: Hashable { let id: String }

// Een bron als rond logo (de bronnenstapel in de Stroom en bovenaan het bronscherm).
struct SourceAvatar: View {
    let source: Source
    var size: CGFloat = 44
    var body: some View {
        AsyncImage(url: source.avatar.flatMap(URL.init(string:))) { phase in
            if let image = phase.image {
                // Altijd op wit: uitgevers maken hun logo voor een lichte achtergrond, en een
                // doorzichtig logo (zoals de zwarte P van Het Parool) verdwijnt anders in donker.
                image.resizable().scaledToFill().background(Color.white)
            } else {
                Text(String(source.name.prefix(1))).font(.headline).foregroundStyle(Theme.ink3).frame(maxWidth: .infinity, maxHeight: .infinity).background(.quaternary)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Theme.rule, lineWidth: 1))
        .accessibilityHidden(true)
    }
}

extension HootStore {
    // De volgorde van de bronnen in de Stroom: voorkeursbronnen vooraan, dan wie nu het meest brengt.
    // De eerste drie vormen de stapel; de namen van een keuze staan in dezelfde volgorde.
    var stripSources: [Source] {
        let counts = Dictionary(grouping: stream, by: \.source).mapValues(\.count)
        return followed.sorted { a, b in
            let fa = favorites.firstIndex(of: a.id), fb = favorites.firstIndex(of: b.id)
            if let fa, let fb { return fa < fb }
            if (fa != nil) != (fb != nil) { return fa != nil }
            return (counts[a.id] ?? 0) > (counts[b.id] ?? 0)
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
                    HStack(spacing: Space.s3) {
                        SourceAvatar(source: source, size: 52)
                        VStack(alignment: .leading, spacing: Space.s0) {
                            Text(source.name).font(Theme.headline(.title2))
                            if let about = source.about { Text(about).font(.subheadline).foregroundStyle(Theme.ink3) }
                            Text(source.paid == true ? "Abonnement" : "Gratis").font(.caption.weight(.semibold)).foregroundStyle(source.paid == true ? Theme.ink3 : Theme.accent)
                        }
                    }
                    .padding(.bottom, Space.s4)
                }
                if !store.isOn(source ?? Source(id: id, name: "")) {
                    EmptyState(title: "Deze bron staat uit", systemImage: "dot.radiowaves.up.forward", text: "Zet hem aan bij Bronnen om zijn berichten hier en in je Stroom te zien.")
                } else if items.isEmpty {
                    EmptyState(title: "Nu niets", systemImage: "tray", text: "Deze bron heeft op dit moment geen berichten.")
                } else {
                    ForEach(items.prefix(limit)) { item in
                        ItemRow(item: item, story: store.story(of: item), linkSource: false)
                        Rule()
                    }
                    if items.count > limit {
                        Button("Meer berichten") { limit += 60 }.buttonStyle(.glass).frame(maxWidth: .infinity).padding(.vertical, Space.s5)
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
