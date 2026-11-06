import SwiftUI

// Duo stap 4: de tafelblad-Editie (besluit Alex, 6 november). Open liggend (vlak) en half gevouwen als laptop
// dezelfde opmaak: boven het verhaal dat je leest, onder de Editie als inhoudsopgave en de bediening. Zo wil Apple
// het tafelblad: boven kijken, onder bedienen (ONDERZOEK §2.5, TT463, TT466).
//
// - Boven: de Hoot-lezer, één brede rustige kolom (680, ± 58 tekens), scrollend. Geen eigen werkbalk: de bediening
//   staat onder. Zonder gekozen verhaal staat 01 boven.
// - Onder: een rustige rij 01–10 (nummer, korte kop, klein beeld), horizontaal scrollend; het verhaal boven is
//   gemarkeerd met het enige rood; de laatste plek is het einde van de Editie. Daaronder bewaren en delen.
// - Tik in de rij: boven wisselt het verhaal. Het gekozen verhaal is `Reader.item`, dus vouw je dicht of houd je
//   het toestel staand, dan blijft hetzelfde artikel open, op dezelfde alinea (Reader bewaart artikel en plek).
//
// Alleen de Editie: tien verhalen passen als inhoudsopgave in één rij. De Stroom (open einde) en de Selectie
// (groepen per onderwerp) houden liggend de A-opmaak: de lijst links, het verhaal rechts.

/// De pure keuzes van het tafelblad, getoetst in TafelTests.
enum TafelEditie {
    /// De tien van de Editie, genummerd; Buiten je bubbel staat buiten de telling en buiten de rij.
    static func rij(_ rows: [EditionRowModel]) -> [EditionRowModel] {
        EditionNumbering.rows(rows).filter { $0.number != nil }
    }

    /// Het verhaal boven: wat je koos (de lezer), anders 01.
    static func gekozen(open: Item?, rij: [EditionRowModel]) -> Item? {
        open ?? rij.first?.item
    }

    /// De cel in de rij die gemarkeerd is: het verhaal boven, als het in de Editie staat (een stuk uit de Stroom niet).
    static func gemarkeerd(open: Item?, rij: [EditionRowModel]) -> EditionRowModel.ID? {
        guard let item = gekozen(open: open, rij: rij) else { return nil }
        return rij.first { $0.item.id == item.id || ($0.story?.itemIds.contains(item.id) ?? false) }?.id
    }
}

struct TafelLezerKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    /// De lezer staat boven op het tafelblad: geen eigen werkbalk, de bediening staat onder.
    var tafelLezer: Bool { get { self[TafelLezerKey.self] } set { self[TafelLezerKey.self] = newValue } }
}

/// Boven: het verhaal dat je leest. Is er een verhaal vergeleken (open uit een andere houding), dan dat.
struct TafelBoven: View {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader: Reader?
    @Environment(KrantStaat.self) private var staat: KrantStaat?
    let tab: RootView.Destination

    var body: some View {
        let rij = TafelEditie.rij(store.editionRows)
        Group {
            if reader?.item == nil, let story = staat?.verhaal[tab] {
                NavigationStack {
                    StoryView(story: story)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Sluit", systemImage: "xmark") { staat?.verhaal[tab] = nil }.tint(Theme.ink3)
                            }
                        }
                }
                .id(story.id)
            } else if let item = TafelEditie.gekozen(open: reader?.item, rij: rij) {
                LeesBlad(item: item).id(item.id)
            } else {
                KrantRust()
            }
        }
        .background(Theme.paper)
        .clipped() // de lezer loopt niet door onder de inhoudsopgave
    }
}

/// Onder: de Editie als inhoudsopgave, en de bediening.
struct TafelOnder: View {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader: Reader?
    @Environment(KrantStaat.self) private var staat: KrantStaat?
    @Environment(\.dynamicTypeSize) private var typeSize

    private var titel: String { store.edition?.slot.flatMap { Slots.all[$0]?.naam } ?? "Editie" }
    private var datum: String {
        guard let d = store.edition?.date, let date = HootDate.day(d) else { return "" }
        return date.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide))).capitalizedFirst
    }

    var body: some View {
        let rij = TafelEditie.rij(store.editionRows)
        let boven = TafelEditie.gekozen(open: reader?.item, rij: rij)
        let gemarkeerd = TafelEditie.gemarkeerd(open: reader?.item, rij: rij)
        VStack(alignment: .leading, spacing: 0) {
            Rule().padding(.horizontal)
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Text(titel).font(.kop(.headline)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                if !datum.isEmpty { Text(datum).font(.ui(.footnote)).foregroundStyle(Theme.ink3) }
            }
            .lineLimit(1)
            .padding(.horizontal)
            .padding(.top, Space.s3)
            ScrollViewReader { proxy in
                ScrollView(.horizontal) {
                    HStack(alignment: .top, spacing: Space.s5) {
                        ForEach(rij) { row in
                            TafelCel(row: row, gekozen: row.id == gemarkeerd) { kies(row.item) }
                                .id(row.id)
                        }
                        TafelEinde(regel: EditionEnd.line(date: store.edition?.date, slot: store.edition?.slot), aantal: rij.count)
                            .id("einde")
                    }
                    .padding(.horizontal)
                    .padding(.vertical, Space.s3)
                    .scrollTargetLayout()
                }
                .scrollIndicators(.hidden)
                .scrollTargetBehavior(.viewAligned)
                // Je plek in de rij: het verhaal boven staat in beeld, ook na draaien of vouwen.
                .onAppear { if let gemarkeerd { proxy.scrollTo(gemarkeerd, anchor: .center) } }
                .onChange(of: gemarkeerd) { _, nieuw in
                    guard let nieuw else { return }
                    withAnimation(.snappy) { proxy.scrollTo(nieuw, anchor: .center) }
                }
            }
            Spacer(minLength: 0)
            if let boven { TafelBediening(item: boven).padding(.horizontal).padding(.bottom, Space.s2) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.paper)
    }

    /// Tik = boven wisselt het verhaal (altijd in de Hoot-lezer: het tafelblad is het lezen zelf).
    private func kies(_ item: Item) {
        guard item.link != nil else { return }
        store.markRead(item)
        staat?.verhaal[.editie] = nil
        var t = Transaction(); t.disablesAnimations = true
        withTransaction(t) { reader?.item = item }
    }
}

/// Een plek in de rij: nummer, korte kop, klein beeld. Het verhaal boven heeft een rode lijn: waar je bent.
struct TafelCel: View {
    @Environment(HootStore.self) private var store
    @ScaledMetric(relativeTo: .subheadline) private var breedte: CGFloat = 208
    let row: EditionRowModel
    let gekozen: Bool
    let kies: () -> Void

    private var beeld: URL? {
        guard store.showsImage(lead: false) else { return nil }
        return row.item.pictureURL(.thumb) ?? row.item.videoPosterURL
    }

    var body: some View {
        Button(action: kies) {
            VStack(alignment: .leading, spacing: Space.s2) {
                HStack(alignment: .top, spacing: Space.s2) {
                    EditionNumber(number: row.number, read: store.isRead(row.item) && !gekozen)
                    Spacer(minLength: Space.s2)
                    if let beeld {
                        RemoteImage(url: beeld, measure: row.item.measure)
                            .frame(width: Layout.thumbDicht, height: Layout.thumbDicht * 2 / 3)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                    }
                }
                Text(typeset(row.item.title, lang: store.source(row.item.source)?.lang))
                    .font(.kop(.subheadline))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, Space.s3)
            .frame(width: breedte, alignment: .topLeading)
            .overlay(alignment: .top) {
                // De lijn boven elke plek; boven het gekozen verhaal rood en dikker (zoals de streep in de kantlijn).
                Rectangle().fill(gekozen ? Theme.accent : Theme.rule).frame(height: gekozen ? 3 : 1)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text("\(row.number.map { "\($0). " } ?? "")\(row.item.title)"))
        .accessibilityHint(gekozen ? Text("Staat boven") : Text("Zet het boven"))
        .accessibilityAddTraits(gekozen ? [.isButton, .isSelected] : .isButton)
    }
}

/// De laatste plek: het einde van de Editie, klein, in merkrood (zoals het einde onder de Editie).
struct TafelEinde: View {
    @Environment(\.nachtActief) private var nacht
    @ScaledMetric(relativeTo: .subheadline) private var breedte: CGFloat = 176
    let regel: String
    let aantal: Int
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            Kop(regel, .title3)
            if aantal > 0 { Text("\(aantal) van \(aantal)").font(.ui(.footnote)).monospacedDigit().opacity(0.85) }
        }
        .foregroundStyle(nacht ? Theme.ink : Theme.onBrandRed)
        .padding(Space.s4)
        .frame(width: breedte, alignment: .leading)
        .background(nacht ? EditionView.nachtEndRed : Theme.brandRed, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .padding(.top, Space.s3)
        .accessibilityElement(children: .combine)
    }
}

/// De bediening onder: bewaren en delen, met symbool en titel.
struct TafelBediening: View {
    @Environment(HootStore.self) private var store
    let item: Item
    var body: some View {
        let bewaard = store.isSaved(item)
        HStack(spacing: Space.s5) {
            Button { store.toggleSave(item) } label: {
                Label(bewaard ? "Bewaard" : "Bewaar", systemImage: bewaard ? "bookmark.fill" : "bookmark")
            }
            .foregroundStyle(bewaard ? Theme.accent : Theme.ink)
            .sensoryFeedback(.selection, trigger: bewaard)
            .accessibilityLabel(bewaard ? "Bewaard, tik om te verwijderen" : "Bewaar")
            if let link = item.link {
                ShareItemLink(item: item, link: link).foregroundStyle(Theme.ink)
            }
            Spacer(minLength: 0)
        }
        .font(.ui(.subheadline, .semibold))
        .labelStyle(.titleAndIcon)
        .buttonStyle(.plain)
        .frame(minHeight: Space.tap)
    }
}
