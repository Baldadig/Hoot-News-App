import SwiftUI
import WidgetKit

// De widgets van Hoot (voorstel widget/VOORSTEL.md, keuzes van Alex 11 november 2026): Middel · Top 3,
// Klein · Kop 01 of Voortgang, Middel · Kop 01, Groot · Editie en het vergrendelscherm (rechthoekig, rond,
// inline). Achtergrond `paper`, koppen in Newsreader 800, labels in Schibsted Grotesk; het enige rood is het
// nummer 01. Ruime marges: minstens `s4` (16), en nooit minder dan de marge van iOS zelf.
// Dezelfde views draaien in de widgetextensie en (voor de toetsen en opnamen) in de app.

enum WidgetToon: String, Codable, Sendable, CaseIterable {
    case top3, kop01, voortgang
}

struct HootWidgetEntry: TimelineEntry {
    let date: Date
    let editie: WidgetEditie?
    var toon: WidgetToon = .top3
    var metBeeld = true

    var stand: WidgetStand? { editie.map { WidgetStand.van($0, op: date) } }
}

// De inhoud van een widget, zonder achtergrond (die zet de widget met containerBackground).
struct HootWidgetInhoud: View {
    let entry: HootWidgetEntry
    let family: WidgetFamily
    let maat: CGSize

    @Environment(\.widgetContentMargins) private var systeemMarges
    @Environment(\.accessibilityReduceMotion) private var stil

    // De marge rondom: minstens 16, of meer als iOS zelf meer neemt.
    private var marge: CGFloat {
        max(WidgetRuimte.s4, systeemMarges.leading, systeemMarges.top, systeemMarges.trailing, systeemMarges.bottom)
    }

    var body: some View {
        Group {
            if let editie = entry.editie, !editie.verhalen.isEmpty, let stand = entry.stand {
                switch family {
                case .accessoryRectangular:
                    // Op het vergrendelscherm de marges van iOS zelf.
                    VergrendelRechthoek(editie: editie, stand: stand, maat: CGSize(width: maat.width - systeemMarges.leading - systeemMarges.trailing, height: maat.height))
                        .padding(systeemMarges)
                case .accessoryCircular: VergrendelRond(editie: editie, stand: stand).padding(systeemMarges)
                case .accessoryInline: VergrendelRegel(editie: editie, stand: stand)
                case .systemSmall:
                    if entry.toon == .voortgang {
                        KleinVoortgang(editie: editie, stand: stand, maat: maat, marge: marge)
                    } else {
                        KleinKop(editie: editie, stand: stand, maat: maat, marge: marge, metBeeld: entry.metBeeld)
                    }
                case .systemLarge, .systemExtraLarge:
                    GrootEditie(editie: editie, stand: stand, maat: maat, marge: marge)
                default:
                    if entry.toon == .kop01 {
                        MiddelKop(editie: editie, stand: stand, maat: maat, marge: marge, metBeeld: entry.metBeeld)
                    } else {
                        MiddelTop3(editie: editie, stand: stand, maat: maat, marge: marge)
                    }
                }
            } else {
                LeegWidget(family: family, marge: marge)
            }
        }
        .contentTransition(stil ? .identity : .opacity)
        .coordinateSpace(.named(WidgetZetMeting.ruimte))
    }
}

// MARK: - Onderdelen

// "MIDDAGEDITIE" in de kicker; met het nummer ervoor bij Kop 01.
private struct WKopregel: View {
    let naam: String
    var nummer: Int? = nil
    var gelezen = false
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
            if let nummer { WNummer(nummer: nummer, gelezen: gelezen) }
            Text(naam).widgetKicker().foregroundStyle(WidgetKleur.ink3)
        }
    }
}

// Het nummer van de plek (edition-number): 01 in accent zolang hij ongelezen is, de rest inkt; gelezen ink-3.
// Staat de kop ernaast kleiner gezet, dan het nummer even groot (nooit groter dan 16).
private struct WNummer: View {
    let nummer: Int
    var gelezen = false
    var grootte: CGFloat = 16
    // De regelhoogte van de kop ernaast: zo maakt het nummer de rij nooit hoger dan de kop (keuring 10).
    var regel: CGFloat? = nil
    var body: some View {
        let tekst = Text(String(format: "%02d", nummer)).font(.custom(WidgetLetter.kopNaam, fixedSize: min(16, grootte))).monospacedDigit()
            .lineHeight(.exact(points: regel ?? WidgetLetter.widgetKop.regel))
        if gelezen {
            tekst.foregroundStyle(WidgetKleur.ink3)
        } else if nummer == 1 {
            tekst.foregroundStyle(WidgetKleur.accent).widgetAccentable()
        } else {
            tekst.foregroundStyle(WidgetKleur.ink)
        }
    }
}

// Een hele kop in de regels die hij nodig heeft (vooraf gemeten), in de maat van zijn plek.
private struct WKop: View {
    let gezet: WidgetZet.Gezet
    let m: WidgetLetter.Maat
    var gelezen = false
    var body: some View {
        Text(gezet.tekst).widgetKop(m, regels: gezet.regels)
            .multilineTextAlignment(.leading)
            .foregroundStyle(gelezen ? WidgetKleur.ink3 : WidgetKleur.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetMeting(gezet, m)
    }
}

// De bronregel: hoort bij zijn rij. Past de rij niet met bronregel, dan valt de hele rij weg (nooit alleen de bron).
private struct WBron: View {
    let naam: String
    var body: some View {
        Text(naam).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).lineLimit(1)
            .frame(height: 16, alignment: .leading)
            .widgetMeting(.bron(naam))
    }
}

// Tien streepjes: gelezen in inkt (en in de tint van iOS), de rest `rule`.
private struct WStreepjes: View {
    let gelezen: Int
    let van: Int
    var body: some View {
        HStack(spacing: WidgetRuimte.s1) {
            ForEach(0..<max(van, 1), id: \.self) { i in
                if i < gelezen {
                    Capsule().fill(WidgetKleur.ink).frame(height: WidgetRuimte.s1).widgetAccentable()
                } else {
                    Capsule().fill(WidgetKleur.rule).frame(height: WidgetRuimte.s1)
                }
            }
        }
        .accessibilityHidden(true)
    }
}

// Het beeld van een verhaal, verkleind in de App Group; anders het Hoot-placeholderbeeld.
struct WidgetBeeld: View {
    let verhaal: WidgetVerhaal
    var body: some View {
        if let naam = verhaal.beeld, let ui = UIImage(contentsOfFile: WidgetBron.beeld(naam).path) {
            Image(uiImage: ui)
                .resizable()
                .widgetAccentedRenderingMode(.desaturated)
                .scaledToFill()
                .accessibilityHidden(true)
        } else {
            WidgetBeeldloos(id: verhaal.itemId)
        }
    }
}

private extension WidgetEditie {
    var leesZin: String {
        let n = verhalen.count
        let woorden = [1: "Eén", 2: "Twee", 3: "Drie", 4: "Vier", 5: "Vijf", 6: "Zes", 7: "Zeven", 8: "Acht", 9: "Negen", 10: "Tien"]
        return n == 1 ? "Eén verhaal" : "\(woorden[n] ?? String(n)) verhalen"
    }
    var leesSet: Set<String> { Set(gelezen) }
}

// MARK: - Beginscherm

// Middel · Top 3: naam en voortgang, dan van boven af zoveel hele koppen als er passen (tot drie), in
// Editie-volgorde (WidgetZet.vul). Past er geen enkele, dan de rustige voortgang. Elke regel opent dat verhaal;
// de kopregel de Editie.
struct MiddelTop3: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat

    static let nummerKolom: CGFloat = 24
    static let tussen = WidgetRuimte.s2 + WidgetRuimte.s1 // 12: lucht tussen twee koppen

    // De koppen gezet: in de kolom naast de nummers, binnen de hoogte onder de kopregel, min een beetje extra lucht
    // onderaan (s1, boven de marge). Ook gebruikt door WidgetTests.
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat) -> (plekken: [WidgetZet.Plek], breedte: CGFloat, hoogte: CGFloat) {
        let breedte = maat.width - 2 * marge - nummerKolom - WidgetRuimte.s2
        let hoogte = maat.height - 2 * marge - 16 - WidgetRuimte.s3 - WidgetRuimte.s1
        let plekken = WidgetZet.vul(editie.verhalen, WidgetLetter.widgetKop, breedte: breedte, hoogte: hoogte, tussen: tussen, max: 3)
        return (plekken, breedte, hoogte)
    }

    var body: some View {
        let plekken = Self.zet(editie, maat: maat, marge: marge).plekken
        let gelezen = editie.leesSet
        if plekken.isEmpty {
            KleinVoortgang(editie: editie, stand: stand, maat: maat, marge: marge)
        } else {
            // De kopregel bovenaan, de koppen er direct onder; wat overblijft, valt rustig onderaan.
            VStack(alignment: .leading, spacing: 0) {
                Link(destination: HootLink.editie) {
                    HStack(alignment: .firstTextBaseline) {
                        WKopregel(naam: editie.naam)
                        Spacer(minLength: WidgetRuimte.s2)
                        Text(stand.label).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).lineLimit(1)
                    }
                    .frame(height: 16)
                }
                ForEach(Array(plekken.enumerated()), id: \.element.index) { i, p in
                    let v = editie.verhalen[p.index]
                    let lees = v.gelezen(in: gelezen)
                    Link(destination: HootLink.verhaal(v.itemId)) {
                        HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                            WNummer(nummer: v.nummer, gelezen: lees, grootte: p.m.grootte, regel: p.m.regel).frame(width: Self.nummerKolom, alignment: .leading)
                            WKop(gezet: p.gezet, m: p.m, gelezen: lees)
                        }
                    }
                    .padding(.top, i == 0 ? WidgetRuimte.s3 : Self.tussen)
                    .accessibilityLabel("Verhaal \(v.nummer) van \(editie.verhalen.count): \(v.kop)")
                }
                Spacer(minLength: 0)
            }
            .padding(marge)
            .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        }
    }
}

// Klein · Kop 01: 01 en de naam, de kop en de bron; met beeld het beeld bovenaan, tot de rand (dan zonder bron).
// Past de hele kop niet onder het beeld, dan wijkt het beeld; past hij ook dan niet met zijn bron, dan kleiner
// (tot de ondergrens); anders de volgende kop die wel heel past, met zijn eigen nummer; anders de voortgang.
struct KleinKop: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat
    let metBeeld: Bool

    static let beeldHoogte: CGFloat = 56

    struct Zet { let index: Int; let gezet: WidgetZet.Gezet; let m: WidgetLetter.Maat; let metBeeld: Bool }
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat, metBeeld: Bool) -> Zet? {
        let breedte = maat.width - 2 * marge
        let onderBeeld = maat.height - beeldHoogte - WidgetRuimte.s3 - 16 - WidgetRuimte.s1 - marge
        let metBron = maat.height - 2 * marge - 16 - WidgetRuimte.s2 - WidgetRuimte.s2 - 16
        for (i, v) in editie.verhalen.enumerated() {
            if metBeeld {
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, WidgetLetter.widgetKop, breedte: breedte, max: .max)
                if CGFloat(g.regels) * WidgetLetter.widgetKop.regel <= onderBeeld { return Zet(index: i, gezet: g, m: WidgetLetter.widgetKop, metBeeld: true) }
            }
            for m in WidgetZet.trap(WidgetLetter.widgetKop) {
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, m, breedte: breedte, max: .max)
                if CGFloat(g.regels) * m.regel <= metBron { return Zet(index: i, gezet: g, m: m, metBeeld: false) }
            }
        }
        return nil
    }

    var body: some View {
        if let z = Self.zet(editie, maat: maat, marge: marge, metBeeld: metBeeld) {
            let v = editie.verhalen[z.index]
            let lees = v.gelezen(in: editie.leesSet)
            if z.metBeeld {
                VStack(alignment: .leading, spacing: 0) {
                    WidgetBeeld(verhaal: v)
                        .frame(width: maat.width, height: Self.beeldHoogte)
                        .clipped()
                    VStack(alignment: .leading, spacing: WidgetRuimte.s1) {
                        WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees).frame(height: 16)
                        WKop(gezet: z.gezet, m: z.m, gelezen: lees)
                    }
                    .padding(.horizontal, marge)
                    .padding(.top, WidgetRuimte.s3)
                    Spacer(minLength: 0)
                }
                .frame(width: maat.width, height: maat.height, alignment: .topLeading)
                .widgetURL(HootLink.verhaal(v.itemId))
                .accessibilityElement(children: .combine)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees).frame(height: 16)
                    WKop(gezet: z.gezet, m: z.m, gelezen: lees).padding(.top, WidgetRuimte.s2)
                    Spacer(minLength: WidgetRuimte.s2)
                    WBron(naam: v.bron)
                }
                .padding(marge)
                .frame(width: maat.width, height: maat.height, alignment: .topLeading)
                .widgetURL(HootLink.verhaal(v.itemId))
                .accessibilityElement(children: .combine)
            }
        } else {
            KleinVoortgang(editie: editie, stand: stand, maat: maat, marge: marge)
        }
    }
}

// Klein · Voortgang: de naam, "4 van 10" met tien streepjes en wat er nog komt. Klaar: de eindzin van díe Editie.
struct KleinVoortgang: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat

    var body: some View {
        let n = editie.verhalen.count
        let g = editie.aantalGelezen
        VStack(alignment: .leading, spacing: 0) {
            WKopregel(naam: editie.naam).frame(height: 16)
            Spacer(minLength: WidgetRuimte.s2)
            Group {
                if g >= n {
                    Text(editie.eindzin).widgetKop(WidgetLetter.item, regels: 2)
                } else if g == 0 {
                    Text("Ligt klaar").widgetKop(WidgetLetter.item, regels: 1)
                } else {
                    (Text("\(g)").font(WidgetLetter.kop(WidgetLetter.lead)).foregroundStyle(WidgetKleur.ink)
                        + Text(" van \(n)").font(WidgetLetter.kop(WidgetLetter.item)).foregroundStyle(WidgetKleur.ink3))
                        .lineLimit(1)
                }
            }
            .foregroundStyle(WidgetKleur.ink)
            WStreepjes(gelezen: g, van: n).padding(.top, WidgetRuimte.s3)
            Text(voet(n: n, g: g))
                .font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).lineLimit(1).minimumScaleFactor(0.85)
                .padding(.top, WidgetRuimte.s2)
        }
        .padding(marge)
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        .widgetURL(editie.eersteOngelezen.map { HootLink.verhaal($0.itemId) } ?? HootLink.editie)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(editie.naam): \(g >= n ? editie.eindzin : "\(g) van \(n) gelezen")")
    }

    private func voet(n: Int, g: Int) -> String {
        if case let .oud(volgende) = stand { return "Tik voor de \(volgende)" }
        if g >= n { return WidgetDagdeel.volgendeZin(na: editie.dagdeel) }
        if g == 0 { return editie.leesZin }
        return n - g == 1 ? "Nog één verhaal" : "Nog \(n - g) verhalen"
    }
}

// Middel · Kop 01: 01 en de naam, de kop groot (t4-item) en de bron; met beeld het beeld rechts, tot de rand.
// Past de hele kop niet, dan wijkt het beeld, dan wordt hij kleiner (widget-kop, tot de ondergrens); anders de
// volgende kop die wel heel past, met zijn eigen nummer; anders de voortgang. De bron staat er altijd bij.
struct MiddelKop: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat
    let metBeeld: Bool

    static let beeldBreedte: CGFloat = 150

    struct Zet { let index: Int; let gezet: WidgetZet.Gezet; let m: WidgetLetter.Maat; let metBeeld: Bool }
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat, metBeeld: Bool) -> Zet? {
        let hoogte = maat.height - 2 * marge - 16 - WidgetRuimte.s2 - WidgetRuimte.s2 - 16
        for (i, v) in editie.verhalen.enumerated() {
            var vormen: [(WidgetLetter.Maat, Bool)] = metBeeld ? [(WidgetLetter.item, true)] : []
            vormen += WidgetZet.trap(WidgetLetter.item).map { ($0, false) }
            for (m, beeld) in vormen {
                let breedte = maat.width - 2 * marge - (beeld ? beeldBreedte : 0)
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, m, breedte: breedte, max: .max)
                if CGFloat(g.regels) * m.regel <= hoogte { return Zet(index: i, gezet: g, m: m, metBeeld: beeld) }
            }
        }
        return nil
    }

    var body: some View {
        if let z = Self.zet(editie, maat: maat, marge: marge, metBeeld: metBeeld) {
            let v = editie.verhalen[z.index]
            let lees = v.gelezen(in: editie.leesSet)
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees).frame(height: 16)
                    WKop(gezet: z.gezet, m: z.m, gelezen: lees).padding(.top, WidgetRuimte.s2)
                    Spacer(minLength: WidgetRuimte.s2)
                    WBron(naam: v.bron)
                }
                .padding(marge)
                .frame(width: maat.width - (z.metBeeld ? Self.beeldBreedte - marge : 0), height: maat.height, alignment: .topLeading)
                if z.metBeeld {
                    WidgetBeeld(verhaal: v)
                        .frame(width: Self.beeldBreedte - marge, height: maat.height)
                        .clipped()
                }
            }
            .frame(width: maat.width, height: maat.height, alignment: .topLeading)
            .widgetURL(HootLink.verhaal(v.itemId))
            .accessibilityElement(children: .combine)
        } else {
            KleinVoortgang(editie: editie, stand: stand, maat: maat, marge: marge)
        }
    }
}

// Groot · Editie: naam en voortgang, het beeld en de kop van 01 met bron, daaronder van boven af zoveel rijen
// (hele kop met bron) als er passen, in Editie-volgorde. Een rij die niet heel past, valt weg; een latere die wel
// past, schuift op met zijn eigen nummer. Nooit een rij erin forceren.
struct GrootEditie: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat

    static let beeldHoogte: CGFloat = 88
    static let rij = 2 * WidgetRuimte.s2 + 1 + WidgetRuimte.s1 + 16 // haarlijn met lucht, ruimte en bronregel per rij
    // Boven de rijen, naast de kop van 01: kopregel, lucht, beeld, lucht, ruimte en de bronregel van 01.
    static let vast = 16 + WidgetRuimte.s3 + beeldHoogte + WidgetRuimte.s3 + WidgetRuimte.s1 + 16

    struct Zet { let held: WidgetZet.Plek; let rijen: [WidgetZet.Plek] }
    // Gemeten op de breedte die de koppen echt krijgen: naast de nummerkolom (keuring 1).
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat) -> Zet? {
        let kolom = maat.width - 2 * marge - MiddelTop3.nummerKolom - WidgetRuimte.s2
        let binnen = maat.height - 2 * marge
        guard let held = WidgetZet.vul(editie.verhalen, WidgetLetter.item, breedte: kolom, hoogte: binnen - vast, tussen: 0, max: 1).first else { return nil }
        let over = binnen - vast - held.hoogte
        let rijen = WidgetZet.vul(editie.verhalen, WidgetLetter.widgetKop, breedte: kolom, hoogte: over, tussen: 0, extra: rij,
                                  vanaf: held.index + 1, eersteKleiner: false)
        return Zet(held: held, rijen: rijen)
    }

    var body: some View {
        if let z = Self.zet(editie, maat: maat, marge: marge) {
            let breedte = maat.width - 2 * marge
            let gelezen = editie.leesSet
            let eerste = editie.verhalen[z.held.index]
            VStack(alignment: .leading, spacing: 0) {
                Link(destination: HootLink.editie) {
                    HStack(alignment: .firstTextBaseline) {
                        WKopregel(naam: editie.naam)
                        Spacer(minLength: WidgetRuimte.s2)
                        Text(stand.label).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).lineLimit(1)
                    }
                    .frame(height: 16)
                }
                Link(destination: HootLink.verhaal(eerste.itemId)) {
                    VStack(alignment: .leading, spacing: WidgetRuimte.s1) {
                        WidgetBeeld(verhaal: eerste)
                            .frame(width: breedte, height: Self.beeldHoogte)
                            .clipShape(RoundedRectangle(cornerRadius: WidgetRuimte.hoek, style: .continuous))
                            .padding(.bottom, WidgetRuimte.s3 - WidgetRuimte.s1)
                        // Het nummer naast de kop, net als in de rijen: geen eigen regel, meer lucht voor de rest.
                        HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                            WNummer(nummer: eerste.nummer, gelezen: eerste.gelezen(in: gelezen), grootte: z.held.m.grootte, regel: z.held.m.regel).frame(width: MiddelTop3.nummerKolom, alignment: .leading)
                            WKop(gezet: z.held.gezet, m: z.held.m, gelezen: eerste.gelezen(in: gelezen))
                        }
                        WBron(naam: eerste.bron).padding(.leading, MiddelTop3.nummerKolom + WidgetRuimte.s2)
                    }
                }
                .padding(.top, WidgetRuimte.s3)
                ForEach(z.rijen, id: \.index) { p in
                    let v = editie.verhalen[p.index]
                    let lees = v.gelezen(in: gelezen)
                    Rectangle().fill(WidgetKleur.rule).frame(height: 1).padding(.vertical, WidgetRuimte.s2)
                    Link(destination: HootLink.verhaal(v.itemId)) {
                        VStack(alignment: .leading, spacing: WidgetRuimte.s1) {
                            HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                                WNummer(nummer: v.nummer, gelezen: lees, grootte: p.m.grootte, regel: p.m.regel).frame(width: MiddelTop3.nummerKolom, alignment: .leading)
                                WKop(gezet: p.gezet, m: p.m, gelezen: lees)
                            }
                            WBron(naam: v.bron).padding(.leading, MiddelTop3.nummerKolom + WidgetRuimte.s2)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(marge)
            .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        } else {
            KleinVoortgang(editie: editie, stand: stand, maat: maat, marge: marge)
        }
    }
}

// Nog geen Editie op dit toestel (de app is nog niet geopend).
private struct LeegWidget: View {
    let family: WidgetFamily
    let marge: CGFloat
    var body: some View {
        switch family {
        case .accessoryInline:
            Label("Open Hoot voor je Editie", systemImage: "newspaper")
        case .accessoryCircular:
            ZStack { AccessoryWidgetBackground(); Image(systemName: "newspaper").font(.title3) }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: WidgetRuimte.s0) {
                Text("Editie").widgetKicker().widgetAccentable()
                Text("Open Hoot, dan staat je Editie hier.").font(WidgetLetter.kop(WidgetLetter.widgetKop)).lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(alignment: .leading, spacing: WidgetRuimte.s2) {
                Text("Editie").widgetKicker().foregroundStyle(WidgetKleur.ink3)
                Text("Open Hoot, dan staat je Editie hier.").widgetKop(WidgetLetter.widgetKop, regels: 3).foregroundStyle(WidgetKleur.ink)
                Spacer(minLength: 0)
            }
            .padding(marge)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(HootLink.editie)
        }
    }
}

// MARK: - Vergrendelscherm (de kleuren doet iOS: alleen primair en secundair, geen eigen kleur)

struct VergrendelRechthoek: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize

    // Wat er staat: de hele kop van 01, met de naam erboven. Past hij zo niet, dan wijkt de naam; past hij ook dan
    // niet, dan kleiner (tot de ondergrens); anders de volgende kop die wel heel past; anders de naam en de stand
    // ("4 van 10"). Nooit afgekapt.
    struct Zet { let verhaal: WidgetVerhaal; let gezet: WidgetZet.Gezet; let m: WidgetLetter.Maat; let metNaam: Bool }
    static let naamHoogte: CGFloat = 16 + WidgetRuimte.s0
    static func zet(_ editie: WidgetEditie, maat: CGSize) -> Zet? {
        for v in editie.verhalen {
            for m in WidgetZet.trap(WidgetLetter.widgetKop) {
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, m, breedte: maat.width, max: .max)
                let h = CGFloat(g.regels) * m.regel
                if naamHoogte + h <= maat.height { return Zet(verhaal: v, gezet: g, m: m, metNaam: true) }
                if h <= maat.height { return Zet(verhaal: v, gezet: g, m: m, metNaam: false) }
            }
        }
        return nil
    }

    var body: some View {
        if let z = Self.zet(editie, maat: maat) {
            VStack(alignment: .leading, spacing: WidgetRuimte.s0) {
                if z.metNaam { Text(editie.naam).widgetKicker().foregroundStyle(.secondary).widgetAccentable().frame(height: 16) }
                Text(z.gezet.tekst).widgetKop(z.m, regels: z.gezet.regels).multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .widgetMeting(z.gezet, z.m)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(HootLink.verhaal(z.verhaal.itemId))
            .accessibilityElement(children: .combine)
        } else {
            VStack(alignment: .leading, spacing: WidgetRuimte.s0) {
                Text(editie.naam).widgetKicker().foregroundStyle(.secondary).widgetAccentable().frame(height: 16)
                Text(stand.label).font(WidgetLetter.kop(WidgetLetter.widgetKop)).fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(HootLink.editie)
            .accessibilityElement(children: .combine)
        }
    }
}

struct VergrendelRond: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    var body: some View {
        let n = max(editie.verhalen.count, 1)
        let g = min(editie.aantalGelezen, n)
        Gauge(value: Double(g), in: 0...Double(n)) {
            Text(editie.naam)
        } currentValueLabel: {
            switch stand {
            case .klaar:
                Text("h.").font(.custom(WidgetLetter.kopNaam, fixedSize: 22))
            case .onderweg:
                VStack(spacing: -2) {
                    Text("\(g)").font(.custom(WidgetLetter.kopNaam, fixedSize: 22))
                    Text("van \(n)").font(.custom("SchibstedGrotesk-SemiBold", fixedSize: 10))
                }
            case .ligtKlaar, .oud:
                Image(systemName: "newspaper").font(.system(size: 18, weight: .semibold))
            }
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetURL(HootLink.editie)
        .accessibilityLabel("\(editie.naam): \(stand.label)")
    }
}

struct VergrendelRegel: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    var body: some View {
        ViewThatFits {
            Label("\(editie.naam) · \(stand.label)", systemImage: "newspaper")
            Label(stand.label, systemImage: "newspaper")
        }
        .widgetURL(HootLink.editie)
    }
}
