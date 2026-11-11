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
private struct WNummer: View {
    let nummer: Int
    var gelezen = false
    var body: some View {
        let tekst = Text(String(format: "%02d", nummer)).font(WidgetLetter.nummer).monospacedDigit()
        if gelezen {
            tekst.foregroundStyle(WidgetKleur.ink3)
        } else if nummer == 1 {
            tekst.foregroundStyle(WidgetKleur.accent).widgetAccentable()
        } else {
            tekst.foregroundStyle(WidgetKleur.ink)
        }
    }
}

private struct WKop: View {
    let gezet: WidgetZet.Gezet
    let m: WidgetLetter.Maat
    var gelezen = false
    var body: some View {
        Text(gezet.tekst).widgetKop(m, regels: gezet.regels)
            .multilineTextAlignment(.leading)
            .foregroundStyle(gelezen ? WidgetKleur.ink3 : WidgetKleur.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                // Alleen in toetsen: de breedte die deze kop echt kreeg (WidgetRenderTests).
                if let opname = WidgetZetMeting.opname {
                    GeometryReader { p in
                        let _ = opname(gezet, m, p.size.width)
                        Color.clear
                    }
                }
            }
    }
}

private struct WBron: View {
    let naam: String
    var body: some View {
        Text(naam).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).lineLimit(1)
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

// Middel · Top 3: naam en voortgang, dan 01–03. Elke regel opent dat verhaal; de kopregel de Editie.
struct MiddelTop3: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat

    static let nummerKolom: CGFloat = 24
    static let tussen = WidgetRuimte.s2 + WidgetRuimte.s1 // 12: lucht tussen twee koppen

    // De koppen van 01–03 gezet: in de kolom naast de nummers, binnen de hoogte onder de kopregel, min een
    // beetje extra lucht onderaan (s1, boven de marge). Ook gebruikt door WidgetTests.
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat) -> (gezet: [WidgetZet.Gezet], breedte: CGFloat, hoogte: CGFloat) {
        let breedte = maat.width - 2 * marge - nummerKolom - WidgetRuimte.s2
        let hoogte = maat.height - 2 * marge - 16 - WidgetRuimte.s3 - WidgetRuimte.s1
        let gezet = WidgetZet.rijen(Array(editie.verhalen.prefix(3)), WidgetLetter.widgetKop, breedte: breedte, hoogte: hoogte, tussen: tussen, eersteVoorrang: true)
        return (gezet, breedte, hoogte)
    }

    var body: some View {
        let drie = Array(editie.verhalen.prefix(3))
        let gezet = Self.zet(editie, maat: maat, marge: marge).gezet
        let gelezen = editie.leesSet
        // De kopregel bovenaan, de koppen verdeeld over wat overblijft: de lucht valt tussen de koppen, niet
        // onderaan.
        VStack(alignment: .leading, spacing: 0) {
            Link(destination: HootLink.editie) {
                HStack(alignment: .firstTextBaseline) {
                    WKopregel(naam: editie.naam)
                    Spacer(minLength: WidgetRuimte.s2)
                    Text(stand.label).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3).lineLimit(1)
                }
                .frame(height: 16)
            }
            ForEach(Array(zip(drie.prefix(gezet.count), gezet).enumerated()), id: \.element.0.id) { i, paar in
                let (v, g) = paar
                let lees = v.gelezen(in: gelezen)
                Spacer(minLength: i == 0 ? WidgetRuimte.s3 : Self.tussen)
                Link(destination: HootLink.verhaal(v.itemId)) {
                    HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                        WNummer(nummer: v.nummer, gelezen: lees).frame(width: Self.nummerKolom, alignment: .leading)
                        WKop(gezet: g, m: WidgetLetter.widgetKop, gelezen: lees)
                    }
                }
                .accessibilityLabel("Verhaal \(v.nummer) van \(editie.verhalen.count): \(v.kop)")
            }
        }
        .padding(.bottom, WidgetRuimte.s1)
        .padding(marge)
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
    }
}

// Klein · Kop 01: 01 en de naam, de kop en de bron; met beeld het beeld bovenaan, tot de rand.
struct KleinKop: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat
    let metBeeld: Bool

    static let beeldHoogte: CGFloat = 56

    var body: some View {
        let v = editie.verhalen[0]
        let breedte = maat.width - 2 * marge
        let lees = v.gelezen(in: editie.leesSet)
        if metBeeld {
            let hoogte = maat.height - Self.beeldHoogte - WidgetRuimte.s3 - marge - 16 - WidgetRuimte.s1
            let g = WidgetZet.pas(v.kop, kort: v.kortKop, WidgetLetter.widgetKop, breedte: breedte, max: max(1, Int(hoogte / WidgetLetter.widgetKop.regel)))
            VStack(alignment: .leading, spacing: 0) {
                WidgetBeeld(verhaal: v)
                    .frame(width: maat.width, height: Self.beeldHoogte)
                    .clipped()
                VStack(alignment: .leading, spacing: WidgetRuimte.s1) {
                    WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees).frame(height: 16)
                    WKop(gezet: g, m: WidgetLetter.widgetKop, gelezen: lees)
                }
                .padding(.horizontal, marge)
                .padding(.top, WidgetRuimte.s3)
                Spacer(minLength: 0)
            }
            .frame(width: maat.width, height: maat.height, alignment: .topLeading)
            .widgetURL(HootLink.verhaal(v.itemId))
            .accessibilityElement(children: .combine)
        } else {
            let hoogte = maat.height - 2 * marge - 16 - WidgetRuimte.s2 - WidgetRuimte.s2 - 16
            let g = WidgetZet.pas(v.kop, kort: v.kortKop, WidgetLetter.widgetKop, breedte: breedte, max: max(1, min(5, Int(hoogte / WidgetLetter.widgetKop.regel))))
            VStack(alignment: .leading, spacing: WidgetRuimte.s2) {
                WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees).frame(height: 16)
                WKop(gezet: g, m: WidgetLetter.widgetKop, gelezen: lees)
                Spacer(minLength: 0)
                WBron(naam: v.bron)
            }
            .padding(marge)
            .frame(width: maat.width, height: maat.height, alignment: .topLeading)
            .widgetURL(HootLink.verhaal(v.itemId))
            .accessibilityElement(children: .combine)
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
struct MiddelKop: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat
    let metBeeld: Bool

    static let beeldBreedte: CGFloat = 150

    var body: some View {
        let v = editie.verhalen[0]
        let lees = v.gelezen(in: editie.leesSet)
        let tekstBreedte = maat.width - 2 * marge - (metBeeld ? Self.beeldBreedte : 0)
        let hoogte = maat.height - 2 * marge - 16 - WidgetRuimte.s2 - WidgetRuimte.s2 - 16
        let g = WidgetZet.pas(v.kop, kort: v.kortKop, WidgetLetter.item, breedte: tekstBreedte, max: max(1, min(4, Int(hoogte / WidgetLetter.item.regel))))
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: WidgetRuimte.s2) {
                WKopregel(naam: editie.naam, nummer: v.nummer, gelezen: lees).frame(height: 16)
                WKop(gezet: g, m: WidgetLetter.item, gelezen: lees)
                Spacer(minLength: 0)
                WBron(naam: v.bron)
            }
            .padding(marge)
            .frame(width: maat.width - (metBeeld ? Self.beeldBreedte - marge : 0), height: maat.height, alignment: .topLeading)
            if metBeeld {
                WidgetBeeld(verhaal: v)
                    .frame(width: Self.beeldBreedte - marge, height: maat.height)
                    .clipped()
            }
        }
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        .widgetURL(HootLink.verhaal(v.itemId))
        .accessibilityElement(children: .combine)
    }
}

// Groot · Editie: naam en voortgang, het beeld en de kop van 01 met bron, daaronder 02 en 03 met bron.
struct GrootEditie: View {
    let editie: WidgetEditie
    let stand: WidgetStand
    let maat: CGSize
    let marge: CGFloat

    static let beeldHoogte: CGFloat = 88

    var body: some View {
        let breedte = maat.width - 2 * marge
        // De koppen staan naast de nummerkolom: meten op de breedte die ze echt krijgen (keuring 1: anders kapt
        // iOS midden in een woord af).
        let kolom = breedte - MiddelTop3.nummerKolom - WidgetRuimte.s2
        let gelezen = editie.leesSet
        let eerste = editie.verhalen[0]
        let rest = Array(editie.verhalen.dropFirst().prefix(2))
        let g1 = WidgetZet.pas(eerste.kop, kort: eerste.kortKop, WidgetLetter.item, breedte: kolom, max: 2)
        // Wat er na 01 nog over is voor 02 en 03 (elk met een bronregel en een haarlijn ervoor).
        let bovenaan = 16 + WidgetRuimte.s3 + Self.beeldHoogte + WidgetRuimte.s3 + CGFloat(g1.regels) * WidgetLetter.item.regel + WidgetRuimte.s1 + 16
        let over = maat.height - 2 * marge - bovenaan
        let rij = 2 * WidgetRuimte.s2 + 1 + WidgetRuimte.s1 + 16 // haarlijn met lucht, ruimte en bronregel per rij
        let gezet = WidgetZet.rijen(rest, WidgetLetter.widgetKop, breedte: kolom, hoogte: over, tussen: 0, extra: rij)
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
                    // 01 naast de kop, net als 02 en 03: geen eigen regel, meer lucht voor de rest.
                    HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                        WNummer(nummer: 1, gelezen: eerste.gelezen(in: gelezen)).frame(width: MiddelTop3.nummerKolom, alignment: .leading)
                        WKop(gezet: g1, m: WidgetLetter.item, gelezen: eerste.gelezen(in: gelezen))
                    }
                    WBron(naam: eerste.bron).padding(.leading, MiddelTop3.nummerKolom + WidgetRuimte.s2)
                }
            }
            .padding(.top, WidgetRuimte.s3)
            ForEach(Array(zip(rest.prefix(gezet.count), gezet)), id: \.0.id) { v, g in
                let lees = v.gelezen(in: gelezen)
                Rectangle().fill(WidgetKleur.rule).frame(height: 1).padding(.vertical, WidgetRuimte.s2)
                Link(destination: HootLink.verhaal(v.itemId)) {
                    VStack(alignment: .leading, spacing: WidgetRuimte.s1) {
                        HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                            WNummer(nummer: v.nummer, gelezen: lees).frame(width: MiddelTop3.nummerKolom, alignment: .leading)
                            WKop(gezet: g, m: WidgetLetter.widgetKop, gelezen: lees)
                        }
                        WBron(naam: v.bron).padding(.leading, MiddelTop3.nummerKolom + WidgetRuimte.s2)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(marge)
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
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
    var body: some View {
        let v = editie.verhalen[0]
        let g = WidgetZet.pas(v.kop, kort: v.kortKop, WidgetLetter.widgetKop, breedte: maat.width, max: 2)
        VStack(alignment: .leading, spacing: WidgetRuimte.s0) {
            Text(editie.naam).widgetKicker().foregroundStyle(.secondary).widgetAccentable()
            Text(g.tekst).widgetKop(WidgetLetter.widgetKop, regels: g.regels).multilineTextAlignment(.leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(HootLink.verhaal(v.itemId))
        .accessibilityElement(children: .combine)
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
