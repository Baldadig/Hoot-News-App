import SwiftUI
import UIKit

// Kleuren, letters, ruimte en het zetten van koppen in de widgets. Alleen bestaande tokens uit
// docs/design-system/tokens.json, plus `widget-kop` (16/18,4), goedgekeurd voor de widgets (11 november 2026).
// De widget volgt licht en donker van het systeem; Nacht kan iOS in een widget niet kiezen.

extension UIColor {
    fileprivate convenience init(widgetHex hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
    }
}

enum WidgetKleur {
    private static func licht(_ l: UInt32, donker d: UInt32) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(widgetHex: d) : UIColor(widgetHex: l) })
    }
    static let paper = licht(0xF5F1E8, donker: 0x151310) // paper
    static let ink = licht(0x1A1814, donker: 0xF1ECE2) // ink
    static let ink3 = licht(0x6B6457, donker: 0xA39B8D) // ink-3
    static let rule = licht(0xDED5C4, donker: 0x34302A) // rule
    static let accent = licht(0x9A3324, donker: 0xEC7A70) // accent: alleen het nummer 01
}

// De ruimteschaal (s1–s5) en de hoek van een beeld (`radius`).
enum WidgetRuimte {
    static let s0: CGFloat = 2
    static let s1: CGFloat = 4
    static let s2: CGFloat = 8
    static let s3: CGFloat = 12
    static let s4: CGFloat = 16 // binnenmarge: nooit minder (en nooit minder dan de marge van iOS zelf)
    static let s5: CGFloat = 24
    static let hoek: CGFloat = 12
}

enum WidgetLetter {
    static let kopNaam = "NewsreaderKop-ExtraBold"
    static let uiNaam = ["regular": "SchibstedGrotesk-Regular", "semibold": "SchibstedGrotesk-SemiBold", "heavy": "SchibstedGrotesk-ExtraBold"]

    // Een kopmaat: grootte, regelhoogte en letterafstand (em).
    struct Maat: Sendable {
        let grootte: CGFloat
        let regel: CGFloat
        let spatie: CGFloat
        var kern: CGFloat { grootte * spatie }
    }
    static let widgetKop = Maat(grootte: 16, regel: 18.4, spatie: -0.005) // widget-kop
    static let item = Maat(grootte: 20, regel: 24, spatie: -0.01) // t4-item
    static let lead = Maat(grootte: 30, regel: 36, spatie: -0.018) // kaart-kop-lead (het getal van Voortgang)

    static func kop(_ m: Maat) -> Font { .custom(kopNaam, fixedSize: m.grootte) }
    static let nummer = Font.custom(kopNaam, fixedSize: 16) // edition-number
    static let kicker = Font.custom("SchibstedGrotesk-ExtraBold", fixedSize: 12) // kicker 12/16, +0,06em, kapitalen
    static let meta = Font.custom("SchibstedGrotesk-Regular", fixedSize: 13) // t1-meta
}

// Koppen zetten zonder dat iOS midden in een woord afkapt: per plek de langste versie (de korte kop van de
// server, dan steeds korter op een woordgrens, KortKop.trap) die in het aantal regels past.
enum WidgetZet {
    // Hoeveel regels een kop nodig heeft in deze breedte (gemeten met de letter van de widget).
    static func regels(_ tekst: String, _ m: WidgetLetter.Maat, breedte: CGFloat) -> Int {
        let font = UIFont(name: WidgetLetter.kopNaam, size: m.grootte) ?? .systemFont(ofSize: m.grootte, weight: .heavy)
        let p = NSMutableParagraphStyle()
        p.minimumLineHeight = m.regel
        p.maximumLineHeight = m.regel
        p.lineBreakMode = .byWordWrapping
        let a = NSAttributedString(string: tekst, attributes: [.font: font, .kern: m.kern, .paragraphStyle: p])
        // Twee punt speling: SwiftUI en UIKit breken een fractie verschillend.
        let r = a.boundingRect(with: CGSize(width: max(1, breedte - 2), height: 10_000), options: [.usesLineFragmentOrigin], context: nil)
        return max(1, Int((r.height / m.regel - 0.05).rounded(.up)))
    }

    struct Gezet: Hashable, Sendable {
        let tekst: String
        let regels: Int
    }

    // De langste versie die in `max` regels past. Past geen enkele veilige versie (een kop zonder veilige korte
    // kop, besluit Alex 12 november 2026), dan de kortste veilige versie met de regels die hij nodig heeft
    // (`regels` > `max`): nooit afkappen door iOS, want dan kan een ontkenning wegvallen. De plek maakt er ruimte
    // voor (een regel extra, of de kop eronder valt weg).
    static func pas(_ kop: String, kort: String?, _ m: WidgetLetter.Maat, breedte: CGFloat, max: Int) -> Gezet {
        let trap = KortKop.trap(kop, kort: kort)
        var kortste: Gezet?
        for t in trap {
            let n = regels(t, m, breedte: breedte)
            if n <= max { return Gezet(tekst: t, regels: n) }
            kortste = Gezet(tekst: t, regels: n)
        }
        return kortste ?? Gezet(tekst: kop, regels: regels(kop, m, breedte: breedte))
    }

    // Middel · Top 3 (besluit Alex 12 november 2026): 01 en 02 volle koppen, tot twee regels (of meer, als een kop
    // geen veilige kortere vorm heeft); 01 wordt nooit tot één regel ingekort. 03 staat er als er ruimte is: met
    // twee regels, of met één als hij daarbij genoeg van zijn tekst houdt (stompGrens). Anders valt 03 weg. Heeft
    // 01 een regel extra nodig en past 02 dan niet meer, dan 02 op één regel (zelfde grens), anders 01 alleen.
    static func top3(_ verhalen: [WidgetVerhaal], _ m: WidgetLetter.Maat, breedte: CGFloat, hoogte: CGFloat, tussen: CGFloat) -> [Gezet] {
        func totaal(_ g: [Gezet]) -> CGFloat {
            g.isEmpty ? 0 : g.reduce(0) { $0 + CGFloat($1.regels) * m.regel } + tussen * CGFloat(g.count - 1)
        }
        let v = Array(verhalen.prefix(3))
        let vol = v.map { pas($0.kop, kort: $0.kortKop, m, breedte: breedte, max: 2) }
        if vol.count == 3 {
            if totaal(vol) <= hoogte { return vol }
            if vol[2].regels > 1 {
                let g3 = pas(v[2].kop, kort: v[2].kortKop, m, breedte: breedte, max: vol[2].regels - 1)
                let blijft = Double(g3.tekst.utf16.count) / Double(Swift.max(1, vol[2].tekst.utf16.count))
                let drie = [vol[0], vol[1], g3]
                if g3.regels < vol[2].regels, blijft >= stompGrens, totaal(drie) <= hoogte { return drie }
            }
        }
        if vol.count >= 2, totaal(Array(vol.prefix(2))) <= hoogte { return Array(vol.prefix(2)) }
        // Heeft 01 een regel extra nodig, dan liever 02 op één regel (als hij genoeg houdt) dan 01 alleen.
        if vol.count >= 2, vol[1].regels > 1 {
            let g2 = pas(v[1].kop, kort: v[1].kortKop, m, breedte: breedte, max: vol[1].regels - 1)
            let blijft = Double(g2.tekst.utf16.count) / Double(Swift.max(1, vol[1].tekst.utf16.count))
            if g2.regels < vol[1].regels, blijft >= stompGrens, totaal([vol[0], g2]) <= hoogte { return [vol[0], g2] }
        }
        return Array(vol.prefix(1))
    }

    // Middel · Top 3 en de rijen van Groot: hoeveel regels elke kop krijgt binnen `hoogte`. Eerst elke kop tot
    // `max` regels; past dat niet (met lucht `tussen` ertussen), dan krijgt een kop met twee regels er één: de kop
    // die daarbij het minst verliest (keuring 1: liever "Honderden scholen in Europa doelwit…" op één regel dan
    // "Sluiting dreigt…"). Past het dan nog niet, dan valt de onderste weg: liever minder tekst dan krap.
    // Met `eersteVoorrang` (Top 3) levert 01 nooit als eerste in (keuring 2: 01 is het belangrijkste verhaal):
    // eerst 03 en 02, de kop die het minst verliest (bij gelijk 03), en pas daarna 01. Zou een kop daarbij minder
    // dan `stompGrens` van zijn tekst overhouden ("Sluiting dreigt…"), dan valt liever de onderste kop weg en
    // krijgen de andere hun ruimte terug.
    static let stompGrens = 0.45
    static func rijen(_ verhalen: [WidgetVerhaal], _ m: WidgetLetter.Maat, breedte: CGFloat, hoogte: CGFloat, tussen: CGFloat, max: Int = 2, extra: CGFloat = 0, eersteVoorrang: Bool = false) -> [Gezet] {
        func totaal(_ g: [Gezet]) -> CGFloat {
            g.isEmpty ? 0 : g.reduce(0) { $0 + CGFloat($1.regels) * m.regel + extra } + tussen * CGFloat(g.count - 1)
        }
        // Regels inleveren tot het past (of niets meer kan). `stomp`: een kop hield minder dan stompGrens over.
        func inleveren(_ v: [WidgetVerhaal]) -> (gezet: [Gezet], stomp: Bool) {
            let vol = v.map { pas($0.kop, kort: $0.kortKop, m, breedte: breedte, max: max) }
            var gezet = vol
            while totaal(gezet) > hoogte {
                var kandidaten = gezet.indices.filter { gezet[$0].regels > 1 }
                if eersteVoorrang, kandidaten.contains(where: { $0 > 0 }) { kandidaten.removeAll { $0 == 0 } }
                // Per kandidaat: de kop met een regel minder, en welk deel van zijn tekst er blijft staan.
                // Alleen een kop die echt een regel minder kan (een kop zonder veilige kortere vorm kan dat niet).
                let opties = kandidaten.map { i -> (i: Int, g: Gezet, blijft: Double) in
                    let g = pas(v[i].kop, kort: v[i].kortKop, m, breedte: breedte, max: gezet[i].regels - 1)
                    return (i, g, Double(g.tekst.utf16.count) / Double(Swift.max(1, gezet[i].tekst.utf16.count)))
                }.filter { $0.g.regels < gezet[$0.i].regels }
                // Het meeste over; bij gelijk de onderste.
                guard let beste = opties.max(by: { $0.blijft < $1.blijft || ($0.blijft == $1.blijft && $0.i < $1.i) }) else { break }
                gezet[beste.i] = beste.g
            }
            let stomp = zip(gezet, vol).contains { Double($0.tekst.utf16.count) / Double(Swift.max(1, $1.tekst.utf16.count)) < stompGrens }
            return (gezet, stomp)
        }
        var n = verhalen.count
        while n > 0 {
            let (gezet, stomp) = inleveren(Array(verhalen.prefix(n)))
            let past = totaal(gezet) <= hoogte
            if past && (!eersteVoorrang || !stomp || n == 1) { return gezet }
            if n == 1 { return gezet }
            n -= 1
        }
        return []
    }
}

extension View {
    // Alleen in toetsen: de breedte die deze kop echt kreeg (WidgetRenderTests).
    func widgetMeting(_ gezet: WidgetZet.Gezet, _ m: WidgetLetter.Maat) -> some View {
        background {
            if let opname = WidgetZetMeting.opname {
                GeometryReader { p in
                    let _ = opname(gezet, m, p.size.width)
                    Color.clear
                }
            }
        }
    }
}

extension Text {
    // Het uiterste: een hele kop die ook met een regel extra niet past. Kleiner zetten, nooit afkappen.
    func widgetKopPassend(_ m: WidgetLetter.Maat, regels: Int) -> some View {
        self.font(WidgetLetter.kop(m))
            .kerning(m.kern)
            .lineLimit(regels)
            .minimumScaleFactor(0.5)
    }
    // Een kop in Newsreader 800 op een vaste regelhoogte (iOS 26: exact), zonder dat iOS kan afkappen.
    func widgetKop(_ m: WidgetLetter.Maat, regels: Int) -> some View {
        self.font(WidgetLetter.kop(m))
            .kerning(m.kern)
            .lineHeight(.exact(points: m.regel))
            .lineLimit(regels)
            .fixedSize(horizontal: false, vertical: true)
    }
    func widgetKicker() -> some View {
        self.font(WidgetLetter.kicker).tracking(12 * 0.06).textCase(.uppercase).lineLimit(1)
    }
}

// Alleen voor toetsen: elke kop meldt de breedte die hij in de weergave echt kreeg, zodat een toets kan nagaan
// dat hij daar in zijn regels past (en iOS dus nergens midden in een woord afkapt). In de app en de extensie nil.
enum WidgetZetMeting {
    nonisolated(unsafe) static var opname: ((WidgetZet.Gezet, WidgetLetter.Maat, CGFloat) -> Void)?
}
