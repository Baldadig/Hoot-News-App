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

extension HootStore {
    // De volgorde van de bronrij: voorkeursbronnen vooraan, dan wie nu het meest brengt. Ook de
    // volgorde van de namen in de statusregel, zodat die met de rij overeenkomt.
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

// Filter op bron: "Alle" vooraan, dan je bronnen als logo met naam. Tik zet een bron erbij of
// eraf (meer tegelijk kan); niets gekozen is alles. Wat aan staat is in één oogopslag te zien:
// in kleur, met een rode ring, een vinkje en de naam in rood. Zodra je kiest, worden de andere
// grijs en gedimd (maar blijven leesbaar). Wat je filtert staat in woorden in de statusregel
// eronder, met "Wis". Alles van één bron met uitleg en ster: tik op de bronnaam bij een bericht.
struct SourceStrip: View {
    @Environment(HootStore.self) private var store
    @Binding var picks: Set<String>
    static let logo: CGFloat = 36
    static let cell: CGFloat = 60 // breder dan het logo: ruimte voor de naam, aanraakvlak ruim 44 pt

    var body: some View {
        let list = store.stripSources
        if list.count > 1 {
            VStack(alignment: .leading, spacing: Space.s2) {
                Text("Filter op bron")
                    .font(.caption.weight(.heavy))
                    .tracking(0.6)
                    .textCase(.uppercase)
                    .foregroundStyle(Theme.ink3)
                    .accessibilityAddTraits(.isHeader)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 0) {
                        SourceChip(name: "Alle", on: picks.isEmpty, dim: false) {
                            withAnimation(.easeOut(duration: 0.14)) { picks = [] }
                        } logo: {
                            Circle().fill(Theme.rule)
                                .overlay(Image(systemName: "square.3.layers.3d").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink2))
                        }
                        .accessibilityLabel("Alle bronnen")
                        ForEach(list) { s in
                            let on = picks.contains(s.id)
                            SourceChip(name: s.name, on: on, dim: !picks.isEmpty && !on) {
                                withAnimation(.easeOut(duration: 0.14)) { if on { picks.remove(s.id) } else { picks.insert(s.id) } }
                            } logo: {
                                SourceAvatar(source: s, size: Self.logo)
                            }
                            .accessibilityLabel(s.name)
                        }
                    }
                }
                .scrollClipDisabled()
                // Het eerste rondje (niet zijn vak) op de kolomlijn, gelijk met het label en de lijst.
                .padding(.leading, -(Self.cell - Self.logo) / 2)
                .sensoryFeedback(.selection, trigger: picks)
            }
        }
    }
}

// Eén knop in de bronrij: rond logo met de naam eronder.
private struct SourceChip<Logo: View>: View {
    let name: String
    let on: Bool
    let dim: Bool
    let action: () -> Void
    @ViewBuilder let logo: Logo
    var body: some View {
        Button(action: action) {
            VStack(spacing: Space.s1) {
                logo
                    .frame(width: SourceStrip.logo, height: SourceStrip.logo)
                    .grayscale(dim ? 1 : 0)
                    .opacity(dim ? 0.5 : 1)
                    // De ring met een smalle rand papier ertussen; het vinkje rechtsonder snijdt
                    // met een rand papier door de ring heen, zodat beide scherp blijven.
                    .frame(width: SourceStrip.logo + 2 * Space.s1, height: SourceStrip.logo + 2 * Space.s1)
                    .overlay { if on { Circle().strokeBorder(Theme.accent, lineWidth: 2) } }
                    .overlay(alignment: .bottomTrailing) {
                        if on {
                            Image(systemName: "checkmark")
                                .font(.system(size: 8, weight: .black))
                                .foregroundStyle(Theme.onAccent)
                                .frame(width: 16, height: 16)
                                .background(Theme.accent, in: Circle())
                                .padding(Space.s0)
                                .background(Theme.paper, in: Circle())
                                .offset(x: Space.s0, y: Space.s0)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                Text(name)
                    .font(.caption2.weight(on ? .semibold : .regular))
                    .foregroundStyle(on ? Theme.accent : Theme.ink3)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .dynamicTypeSize(...DynamicTypeSize.xxLarge) // de rij blijft een rij; de volle naam leest VoiceOver
                    .padding(.horizontal, Space.s0)
            }
            .frame(width: SourceStrip.cell)
            .padding(.bottom, Space.s1)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
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
