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

    /// Duo 1.2, punt 1: de inhoudsopgave groeit mee met de ruimte onder. Vlak liggend is die `tafelOnder` hoog: de
    /// gewone rij. Als laptop is de onderste helft veel hoger: dan de ruime rij (groter beeld, kop en intro), zodat
    /// die helft niet leeg blijft. De grens groeit mee met de tekstgrootte (`tafelOnder` is geschaald).
    static func ruim(hoogte: CGFloat, tafelOnder: CGFloat) -> Bool { hoogte >= tafelOnder + ruimMarge }
    static let ruimMarge: CGFloat = 64

    /// Een kop in de rij heeft altijd drie regels ruimte (dezelfde hoogte in elke cel: gelijke ritmiek).
    static let kopRegels = 3

    /// De rij staat op hele plekken (zoals de planken in de App Store): er passen precies `aantal` cellen naast elkaar
    /// tussen de marges, elk minstens `minCel` breed, en de rij snapt per cel. Zo staat er nooit een half verhaal aan
    /// een rand. `breedte` is het zichtbare deel van de rij (vóór de balk opzij), `marge` de marge aan elke kant.
    static func plekken(breedte: CGFloat, minCel: CGFloat, tussen: CGFloat, marge: CGFloat) -> (aantal: Int, cel: CGFloat) {
        let ruimte = breedte - 2 * marge
        guard ruimte > minCel, minCel > 0 else { return (1, max(minCel, ruimte)) }
        let aantal = max(1, Int(((ruimte + tussen) / (minCel + tussen)).rounded(.down)))
        return (aantal, (ruimte - tussen * CGFloat(aantal - 1)) / CGFloat(aantal))
    }
    static let celTussen: CGFloat = Space.s5
    static let rijMarge: CGFloat = Space.s4

    /// Welke plek vooraan staat. Staat het gekozen verhaal in de eerste `zichtbaar`, dan 01 vooraan; anders zo dat het
    /// gekozen verhaal in beeld staat, en nooit voorbij het einde (de laatste plekken vullen dan de rij).
    static func eerste(gekozen: Int?, totaal: Int, zichtbaar: Int) -> Int {
        guard let gekozen, zichtbaar > 0, totaal > zichtbaar, gekozen >= zichtbaar else { return 0 }
        return max(0, min(gekozen - (zichtbaar - 1) / 2, totaal - zichtbaar))
    }

    /// Waar de rij naartoe gaat als het verhaal boven wisselt. Staat het nieuwe verhaal in de rij, dan in beeld (zoals
    /// `eerste`). Staat het er niet in (een stuk uit de Stroom), dan blijft de rij staan waar je hem liet: geen sprong
    /// terug naar 01.
    static func naar(gekozen: Int?, totaal: Int, zichtbaar: Int) -> Int? {
        gekozen.map { eerste(gekozen: $0, totaal: totaal, zichtbaar: zichtbaar) }
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
    @ScaledMetric(relativeTo: .body) private var tafelOnder = KrantIndeling.tafelOnder
    @State private var hoogte: CGFloat = 0 // de hoogte van de onderste helft (binnen de veilige zone)
    @State private var rijHoogte: CGFloat = 0 // de ruime rij: zo hoog is elke cel
    @State private var rijBreedte: CGFloat = 0 // het zichtbare deel van de rij: vóór de balk opzij
    @ScaledMetric(relativeTo: .subheadline) private var minCel: CGFloat = TafelCel.minBreedte
    @ScaledMetric(relativeTo: .subheadline) private var minCelRuim: CGFloat = TafelCel.minBreedteRuim

    private var ruim: Bool { TafelEditie.ruim(hoogte: hoogte, tafelOnder: tafelOnder) }

    private var titel: String { store.edition?.slot.flatMap { Slots.all[$0]?.naam } ?? "Editie" }
    private var datum: String {
        guard let d = store.edition?.date, let date = HootDate.day(d) else { return "" }
        return date.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide))).capitalizedFirst
    }

    var body: some View {
        let rij = TafelEditie.rij(store.editionRows)
        let boven = TafelEditie.gekozen(open: reader?.item, rij: rij)
        let gemarkeerd = TafelEditie.gemarkeerd(open: reader?.item, rij: rij)
        let plekken = TafelEditie.plekken(breedte: rijBreedte, minCel: ruim ? minCelRuim : minCel,
                                          tussen: TafelEditie.celTussen, marge: TafelEditie.rijMarge)
        let ids: [AnyHashable] = rij.map { AnyHashable($0.id) } + [AnyHashable("einde")]
        let vooraan = { (gekozen: EditionRowModel.ID?) -> AnyHashable in
            let k = gekozen.flatMap { g in rij.firstIndex { $0.id == g } }
            return ids[TafelEditie.eerste(gekozen: k, totaal: ids.count, zichtbaar: plekken.aantal)]
        }
        VStack(alignment: .leading, spacing: 0) {
            Rule().padding(.horizontal, TafelEditie.rijMarge)
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Text(titel).font(.kop(.headline)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                if !datum.isEmpty { Text(datum).font(.ui(.footnote)).foregroundStyle(Theme.ink3) }
            }
            .lineLimit(1)
            .padding(.horizontal, TafelEditie.rijMarge)
            .padding(.top, Space.s3)
            ScrollViewReader { proxy in
                ScrollView(.horizontal) {
                    HStack(alignment: .top, spacing: TafelEditie.celTussen) {
                        ForEach(rij) { row in
                            TafelCel(row: row, gekozen: row.id == gemarkeerd, hoogte: ruim ? rijHoogte : nil, breedte: plekken.cel) { kies(row.item) }
                                .id(row.id)
                        }
                        // Het einde neemt ook een hele plek: zo eindigt de rij op een rand, niet op een half verhaal.
                        TafelEinde(regel: EditionEnd.line(date: store.edition?.date, slot: store.edition?.slot), aantal: rij.count)
                            .frame(width: plekken.cel, alignment: .leading)
                            .id("einde")
                    }
                    .padding(.vertical, Space.s3)
                    .scrollTargetLayout()
                }
                // De marges horen bij de scroll, niet bij de inhoud: dan snapt elke plek op dezelfde lijn als de kop.
                .contentMargins(.horizontal, TafelEditie.rijMarge, for: .scrollContent)
                .scrollIndicators(.hidden)
                // De ruime rij vult de onderste helft: de cellen zijn zo hoog als de ruimte tussen de kop en de bediening.
                .frame(maxHeight: ruim ? .infinity : nil, alignment: .top)
                .onGeometryChange(for: CGSize.self) { $0.size } action: {
                    rijHoogte = max(0, $0.height - 2 * Space.s3)
                    rijBreedte = $0.width
                }
                .scrollTargetBehavior(.viewAligned)
                // De rij stopt vóór de balk opzij, net als de lijn erboven: niets loopt eronder door.
                .clipped()
                // Je plek in de rij: het verhaal boven staat in beeld, op hele plekken, ook na draaien of vouwen.
                .onAppear { proxy.scrollTo(vooraan(gemarkeerd), anchor: .leading) }
                .onChange(of: plekken.aantal) { proxy.scrollTo(vooraan(gemarkeerd), anchor: .leading) }
                .onChange(of: gemarkeerd) { _, nieuw in
                    // Een stuk dat niet in de Editie staat (nil): de rij blijft staan.
                    let k = nieuw.flatMap { g in rij.firstIndex { $0.id == g } }
                    guard let plek = TafelEditie.naar(gekozen: k, totaal: ids.count, zichtbaar: plekken.aantal) else { return }
                    withAnimation(.snappy) { proxy.scrollTo(ids[plek], anchor: .leading) }
                }
            }
            if !ruim { Spacer(minLength: 0) }
            if let boven { TafelBediening(item: boven).padding(.horizontal, TafelEditie.rijMarge).padding(.bottom, Space.s2) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { hoogte = $0 }
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

/// Een plek in de rij: nummer, kop, beeld. Het verhaal boven heeft een rode lijn: waar je bent.
/// - Gewoon (vlak liggend): nummer en klein beeld, de kop in drie regels.
/// - Ruim (`hoogte`, als laptop): het beeld vult de cel, daaronder nummer, kop (drie regels) en de intro in hele zinnen.
/// De kop heeft in elke cel drie regels ruimte, ook als hij korter is: zo staan nummers en koppen op één lijn.
struct TafelCel: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    /// De kleinste breedte van een cel (meegeschaald met de tekstgrootte); de rij maakt ze breder tot ze precies passen.
    static let minBreedte: CGFloat = 248
    static let minBreedteRuim: CGFloat = 300
    @ScaledMetric(relativeTo: .subheadline) private var breedteMin: CGFloat = TafelCel.minBreedte
    @ScaledMetric(relativeTo: .subheadline) private var breedteRuimMin: CGFloat = TafelCel.minBreedteRuim
    let row: EditionRowModel
    let gekozen: Bool
    var hoogte: CGFloat? = nil
    /// De breedte van de plek in de rij (TafelEditie.plekken); zonder rij de kleinste breedte.
    var breedte: CGFloat? = nil
    let kies: () -> Void
    @State private var mislukt = false

    static let introRegels = 3

    private var beeld: URL? {
        guard store.showsImage(lead: false) else { return nil }
        return row.item.pictureURL(hoogte == nil ? .thumb : .large) ?? row.item.videoPosterURL
    }

    var body: some View {
        Button(action: kies) {
            Group {
                if let hoogte { ruim(hoogte) } else { gewoon }
            }
            .padding(.top, Space.s3)
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

    private var gewoon: some View {
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
            kop(.subheadline)
        }
        .frame(width: breedte ?? breedteMin, alignment: .topLeading)
    }

    private func ruim(_ hoogte: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            if store.showsImage(lead: false) {
                // Het beeld vult wat er boven de tekst overblijft (de tekst heeft een vaste hoogte, dus nummers en
                // koppen staan in elke cel op één lijn). Geen of een mislukt beeld: het beeldloze vak, zoals overal.
                GeometryReader { g in
                    if let beeld, !mislukt {
                        RemoteImage(url: beeld, measure: row.item.measure) { mislukt = true }
                            .frame(width: g.size.width, height: g.size.height)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                    } else {
                        BeeldloosView(item: row.item, kind: .lead, height: g.size.height)
                    }
                }
                .frame(minHeight: 0, maxHeight: .infinity)
                .padding(.top, Space.s1)
            }
            // Nummer en rubriek, en het waarom, zoals in de dichte rij.
            VStack(alignment: .leading, spacing: 0) {
                Kicker(text: row.label, number: row.number, read: store.isRead(row.item) && !gekozen).lineLimit(1)
                WhyLine(text: row.why, compact: true).lineLimit(1)
            }
            kop(.headline)
            Group {
                if let intro = row.item.summary.map({ wholeSentences($0, max: 400) }), !intro.isEmpty {
                    IntroText(text: intro, style: .footnote, lines: introRegels(hoogte))
                }
            }
            .frame(height: IntroText.limit(lines: introRegels(hoogte), style: .footnote, typeSize: typeSize), alignment: .top)
            if !store.showsImage(lead: false) { Spacer(minLength: 0) } // zonder beelden: de tekst bovenaan
            bronregel
        }
        .frame(width: breedte ?? breedteRuimMin, height: max(0, hoogte - Space.s3), alignment: .topLeading)
    }

    /// Bron, tijd en het aantal bronnen, stil onderaan de ruime cel ("NOS · 3 uur geleden · 4 bronnen").
    private var bronregel: some View {
        let bron = row.item.sourceName ?? store.source(row.item.source)?.name ?? row.item.source
        let delen = [bron, row.item.date.map { HootDate.ago($0) }, row.story?.sourceCount.flatMap { $0 > 1 ? "\($0) bronnen" : nil }]
        return Text(delen.compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")) // geen tijd: geen losse punt
            .font(.ui(.footnote))
            .foregroundStyle(Theme.ink3)
            .lineLimit(1)
    }

    /// Met beelden drie regels intro onder het beeld. Zonder beelden (instelling: geen of alleen het hoofdverhaal)
    /// vult de intro de cel: zoveel hele regels als er onder de kop passen.
    private func introRegels(_ hoogte: CGFloat) -> Int {
        guard !store.showsImage(lead: false) else { return Self.introRegels }
        let kop = KopZet.font(.headline, typeSize: typeSize).lineHeight * CGFloat(TafelEditie.kopRegels)
        let nummer = KopZet.pointSize(.subheadline, typeSize: typeSize) * 1.5
        let regel = KopZet.pointSize(.footnote, typeSize: typeSize) * 1.4 // het waarom en de bronregel
        let rest = hoogte - Space.s3 - kop - nummer - 2 * regel - 4 * Space.s2
        var n = Self.introRegels
        while n < 12, IntroText.limit(lines: n + 1, style: .footnote, typeSize: typeSize) <= rest { n += 1 }
        return n
    }

    private func kop(_ stijl: Font.TextStyle) -> some View {
        Text(typeset(row.item.title, lang: store.source(row.item.source)?.lang))
            .font(.kop(stijl))
            .foregroundStyle(Theme.ink)
            .lineLimit(TafelEditie.kopRegels, reservesSpace: true)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
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
