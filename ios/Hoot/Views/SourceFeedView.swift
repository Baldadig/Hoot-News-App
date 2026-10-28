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
                Text(String(source.name.prefix(1))).font(.headline).foregroundStyle(Theme.ink3).frame(maxWidth: .infinity, maxHeight: .infinity).background(.quaternary)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Theme.rule, lineWidth: 1))
        .accessibilityHidden(true)
    }
}

// De rij met je bronnen: klein en rustig, voorkeursbronnen vooraan, dan wie nu het meest brengt.
// Eén tik = alleen die bron in de Stroom, nog een tik = weer alles (zoals op de website). De
// gekozen bron in kleur met een ring in `accent`, de rest in grijs en gedimd. Alles van één bron
// met uitleg en ster: tik op de bronnaam bij een bericht.
struct SourceStrip: View {
    @Environment(HootStore.self) private var store
    @Binding var pick: String?
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
                HStack(spacing: 0) {
                    ForEach(list) { s in
                        let on = pick == s.id
                        Button { withAnimation(.easeOut(duration: 0.14)) { pick = on ? nil : s.id } } label: {
                            SourceAvatar(source: s, size: 30)
                                .grayscale(on ? 0 : 1)
                                .opacity(pick == nil ? 0.9 : on ? 1 : 0.45)
                                .padding(2)
                                .overlay(Circle().strokeBorder(on ? Theme.accent : .clear, lineWidth: 1.5))
                                .frame(width: Space.tap, height: Space.tap) // aanraakvlak 44 pt, het logo zelf klein
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Alleen \(s.name)")
                        .accessibilityAddTraits(on ? .isSelected : [])
                    }
                }
            }
            .scrollClipDisabled()
            .padding(.leading, -Space.s2)
            .padding(.bottom, Space.s1)
            // Welke bron je filtert, in woorden, met een weg terug (niet alleen een logo dat kleurt).
            if let p = pick, let s = list.first(where: { $0.id == p }) {
                HStack(spacing: Space.s2) {
                    Text("Alleen \(Text(s.name).foregroundStyle(Theme.ink).fontWeight(.semibold))")
                        .foregroundStyle(Theme.ink3)
                    Spacer()
                    Button("Alle bronnen") { withAnimation(.easeOut(duration: 0.14)) { pick = nil } }
                        .fontWeight(.semibold)
                        .frame(minHeight: Space.tap)
                }
                .font(.subheadline)
            }
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
