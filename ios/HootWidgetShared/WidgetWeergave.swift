import SwiftUI
import WidgetKit

// De widgets van Hoot (voorstel widget/VOORSTEL.md, keuzes van Alex 11 november 2026; bladeren 13 november 2026):
// Klein en Middel · Bladeren (de standaard), Middel · Top 3, Klein · Kop 01 of Voortgang, Middel · Kop 01, Groot ·
// bladeren per drie (WidgetBladeren.swift) en het vergrendelscherm (rechthoekig, rond, inline). Achtergrond `paper`, koppen in Newsreader 800, labels in Schibsted Grotesk; het enige rood is het
// nummer 01. Ruime marges: minstens `s4` (16), en nooit minder dan de marge van iOS zelf.
// Dezelfde views draaien in de widgetextensie en (voor de toetsen en opnamen) in de app.

enum WidgetToon: String, Codable, Sendable, CaseIterable {
    case bladeren, top3, kop01, voortgang
}

extension WidgetToon {
    // Wat in een maat past: Top 3 alleen in Middel (in Klein wordt het Voortgang), Voortgang alleen in Klein (in Middel
    // wordt het Top 3). Bladeren en Kop 01 in beide. Groot bladert altijd per drie; het vergrendelscherm kent geen keuze.
    static func passend(_ t: WidgetToon, in family: WidgetFamily) -> WidgetToon {
        switch (t, family) {
        case (.top3, .systemSmall): .voortgang
        case (.voortgang, .systemMedium): .top3
        default: t
        }
    }
}

struct HootWidgetEntry: TimelineEntry {
    let date: Date
    let editie: WidgetEditie?
    var toon: WidgetToon = .bladeren
    var metBeeld = true
    // De bladerplek van dit toestel (WidgetBlader), gelezen toen de tijdlijn werd gemaakt; nil = het begin.
    var blader: WidgetBlader.Stand? = nil

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
                    VergrendelRechthoek(editie: editie, stand: stand, maat: CGSize(width: maat.width - systeemMarges.leading - systeemMarges.trailing,
                                                                                    height: maat.height - systeemMarges.top - systeemMarges.bottom))
                        .padding(systeemMarges)
                case .accessoryCircular: VergrendelRond(editie: editie, stand: stand).padding(systeemMarges)
                case .accessoryInline: VergrendelRegel(editie: editie, stand: stand)
                case .systemSmall:
                    if entry.toon == .bladeren {
                        KleinBladeren(editie: editie, maat: maat, marge: marge, plek: WidgetBlader.enkel(entry.blader, editie))
                    } else if entry.toon == .voortgang {
                        KleinVoortgang(editie: editie, stand: stand, maat: maat, marge: marge)
                    } else {
                        KleinKop(editie: editie, stand: stand, maat: maat, marge: marge, metBeeld: entry.metBeeld)
                    }
                case .systemLarge, .systemExtraLarge:
                    GrootBladeren(editie: editie, maat: maat, marge: marge, groep: WidgetBlader.groep(entry.blader, editie))
                default:
                    if entry.toon == .bladeren {
                        MiddelBladeren(editie: editie, maat: maat, marge: marge, plek: WidgetBlader.enkel(entry.blader, editie))
                    } else if entry.toon == .kop01 {
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

// "MIDDAGEDITIE" in de kicker; met het nummer ervoor bij Kop 01. Vooraf gemeten in de breedte die er is: past
// de hele naam niet, dan zonder "editie" ("01 OCHTEND"), anders alleen het nummer. Nooit afgekapt (keuring 11).
struct WKopregel: View {
    let naam: String
    var nummer: Int? = nil
    var gelezen = false
    let breedte: CGFloat
    var body: some View {
        let ruimte = breedte - (nummer.map { WidgetZet.nummerBreedte($0) + WidgetRuimte.s2 } ?? 0)
        let tekst = WidgetZet.kicker(naam, breedte: ruimte)
        HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
            if let nummer { WNummer(nummer: nummer, gelezen: gelezen) }
            if !tekst.isEmpty { Text(tekst).widgetKicker().foregroundStyle(WidgetKleur.ink3).widgetMeting(.kicker(tekst)) }
        }
    }
}

// De kopregel van Middel · Top 3 en Groot: de naam links, de stand rechts ("4 van 10"). De naam krijgt wat de
// stand overlaat; de stand zelf is kort en past altijd.
private struct WKopregelMetStand: View {
    let naam: String
    let stand: String
    let breedte: CGFloat
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
            WKopregel(naam: naam, breedte: breedte - WidgetZet.metaBreedte(stand) - WidgetRuimte.s2)
            Spacer(minLength: WidgetRuimte.s2)
            Text(stand).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).fixedSize().widgetMeting(.stand(stand))
        }
        .frame(height: 16)
    }
}

// Het nummer van de plek (edition-number): 01 in accent zolang hij ongelezen is, de rest inkt; gelezen ink-3.
// Staat de kop ernaast kleiner gezet, dan het nummer even groot (nooit groter dan 16).
struct WNummer: View {
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
struct WKop: View {
    let gezet: WidgetZet.Gezet
    let m: WidgetLetter.Maat
    var gelezen = false
    var body: some View {
        Text(gezet.tekst).widgetKop(m, regels: gezet.regels)
            .multilineTextAlignment(.leading)
            .foregroundStyle(gelezen ? WidgetKleur.ink3 : WidgetKleur.ink)
            // De kop breekt in dezelfde breedte als gemeten (WidgetZet.regels: twee punt speling), zodat een letter
            // aan het eind van een regel (de "f") niet over de kantlijn uitsteekt (keuring 11).
            .padding(.trailing, WidgetRuimte.s0)
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetMeting(gezet, m)
    }
}

// De bronregel: hoort bij zijn rij. Past de rij niet met bronregel, dan valt de hele rij weg (nooit alleen de bron).
// Geen lineLimit: een lange naam loopt door op een volgende regel (WidgetZet.bronRegels rekent die mee), iOS kapt
// hem nooit af (keuring 11).
struct WBron: View {
    let naam: String
    var body: some View {
        Text(naam).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3)
            .lineHeight(.exact(points: WidgetZet.bronRegel))
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
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
                    WKopregelMetStand(naam: editie.naam, stand: stand.label, breedte: maat.width - 2 * marge)
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
        let metBron = maat.height - 2 * marge - 16 - WidgetRuimte.s2 - WidgetRuimte.s2 - WidgetZet.bronRegel
        for (i, v) in editie.verhalen.enumerated() {
            let bronExtra = WidgetZet.bronExtra(v.bron, breedte: breedte)
            if metBeeld {
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, WidgetLetter.widgetKop, breedte: breedte, max: .max)
                if CGFloat(g.regels) * WidgetLetter.widgetKop.regel <= onderBeeld { return Zet(index: i, gezet: g, m: WidgetLetter.widgetKop, metBeeld: true) }
            }
            for m in WidgetZet.trap(WidgetLetter.widgetKop) {
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, m, breedte: breedte, max: .max)
                if CGFloat(g.regels) * m.regel + bronExtra <= metBron { return Zet(index: i, gezet: g, m: m, metBeeld: false) }
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
                        WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees, breedte: maat.width - 2 * marge).frame(height: 16)
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
                    WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees, breedte: maat.width - 2 * marge).frame(height: 16)
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
            WKopregel(naam: editie.naam, breedte: maat.width - 2 * marge).frame(height: 16)
            Spacer(minLength: WidgetRuimte.s2)
            Group {
                if g >= n {
                    // De eindzin heel, in de ruimte die er is: zo nodig kleiner (iPad mini, keuring 11).
                    let ruimte = maat.height - 2 * marge - 16 - WidgetRuimte.s2 - WidgetRuimte.s3 - WidgetRuimte.s1 - WidgetRuimte.s2 - WidgetZet.bronRegel
                    let m = WidgetZet.trap(WidgetLetter.item).first {
                        CGFloat(WidgetZet.regels(editie.eindzin, $0, breedte: maat.width - 2 * marge)) * $0.regel <= ruimte
                    } ?? WidgetLetter.widgetKop.op(WidgetZet.ondergrens)
                    Text(editie.eindzin).widgetKop(m, regels: 2)
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
            // Vooraf gemeten, zonder lineLimit: past "Tik voor de Ochtendeditie" niet op één regel, dan zonder "editie"
            // ("Tik voor de Ochtend"), net als de kicker. iOS kapt hem nooit af (keuring 11).
            let tekst = WidgetZet.voet(voet(n: n, g: g), breedte: maat.width - 2 * marge)
            Text(tekst)
                .font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3)
                .lineHeight(.exact(points: WidgetZet.bronRegel))
                .fixedSize(horizontal: false, vertical: true)
                .widgetMeting(.voet(tekst))
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
                if CGFloat(g.regels) * m.regel + WidgetZet.bronExtra(v.bron, breedte: breedte) <= hoogte { return Zet(index: i, gezet: g, m: m, metBeeld: beeld) }
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
                    WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees, breedte: maat.width - 2 * marge - (z.metBeeld ? Self.beeldBreedte : 0)).frame(height: 16)
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
    // Onder de laatste regel blijft de daalhoogte vrij (de staarten van g, j en y vallen onder de regelhoogte):
    // anders steken ze 1 tot 2 punt onder de rand van het vergrendelscherm uit (keuring 11).
    static let daal = WidgetRuimte.s1
    static func zet(_ editie: WidgetEditie, maat: CGSize) -> Zet? {
        let naam = !WidgetZet.kicker(editie.naam, breedte: maat.width).isEmpty
        for v in editie.verhalen {
            for m in WidgetZet.trap(WidgetLetter.widgetKop) {
                let g = WidgetZet.pas(v.kop, kort: v.kortKop, m, breedte: maat.width, max: .max)
                let h = CGFloat(g.regels) * m.regel + daal
                if naam, naamHoogte + h <= maat.height { return Zet(verhaal: v, gezet: g, m: m, metNaam: true) }
                if h <= maat.height { return Zet(verhaal: v, gezet: g, m: m, metNaam: false) }
            }
        }
        return nil
    }

    var body: some View {
        if let z = Self.zet(editie, maat: maat) {
            VStack(alignment: .leading, spacing: WidgetRuimte.s0) {
                if z.metNaam {
                    let naam = WidgetZet.kicker(editie.naam, breedte: maat.width)
                    Text(naam).widgetKicker().foregroundStyle(.secondary).widgetAccentable().frame(height: 16).widgetMeting(.kicker(naam))
                }
                Text(z.gezet.tekst).widgetKop(z.m, regels: z.gezet.regels).multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .widgetMeting(z.gezet, z.m)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(HootLink.verhaal(z.verhaal.itemId))
            .accessibilityElement(children: .combine)
        } else {
            VStack(alignment: .leading, spacing: WidgetRuimte.s0) {
                Text(WidgetZet.kicker(editie.naam, breedte: maat.width)).widgetKicker().foregroundStyle(.secondary).widgetAccentable().frame(height: 16)
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
