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

    static func pas(_ kop: String, kort: String?, _ m: WidgetLetter.Maat, breedte: CGFloat, max: Int) -> Gezet {
        let trap = KortKop.trap(kop, kort: kort)
        for t in trap {
            let n = regels(t, m, breedte: breedte)
            if n <= max { return Gezet(tekst: t, regels: n) }
        }
        return Gezet(tekst: trap.last ?? kop, regels: max)
    }

    // Middel · Top 3 en de rijen van Groot: hoeveel regels elke kop krijgt binnen `hoogte`. Eerst elke kop tot
    // `max` regels; past dat niet (met lucht `tussen` ertussen), dan krijgt een kop met twee regels er één: de kop
    // die daarbij het minst verliest (keuring 1: liever "Honderden scholen in Europa doelwit…" op één regel dan
    // "Sluiting dreigt…"). Met `eersteVoorrang` houdt 01 zijn twee regels, tenzij een andere kop anders minder
    // dan `eersteGrens` van zijn tekst overhoudt.
    // Past het dan nog niet, dan valt de onderste weg: liever minder tekst dan krap.
    static let eersteGrens = 0.45
    static func rijen(_ verhalen: [WidgetVerhaal], _ m: WidgetLetter.Maat, breedte: CGFloat, hoogte: CGFloat, tussen: CGFloat, max: Int = 2, extra: CGFloat = 0, eersteVoorrang: Bool = false) -> [Gezet] {
        var gezet = verhalen.map { pas($0.kop, kort: $0.kortKop, m, breedte: breedte, max: max) }
        func totaal(_ g: [Gezet]) -> CGFloat {
            g.isEmpty ? 0 : g.reduce(0) { $0 + CGFloat($1.regels) * m.regel + extra } + tussen * CGFloat(g.count - 1)
        }
        while totaal(gezet) > hoogte {
            let kandidaten = gezet.indices.filter { gezet[$0].regels > 1 }
            // Per kandidaat: de kop met een regel minder, en welk deel van zijn tekst er blijft staan.
            let opties = kandidaten.map { i -> (i: Int, g: Gezet, blijft: Double) in
                let g = pas(verhalen[i].kop, kort: verhalen[i].kortKop, m, breedte: breedte, max: gezet[i].regels - 1)
                let blijft = Double(g.tekst.utf16.count) / Double(Swift.max(1, gezet[i].tekst.utf16.count))
                return (i, g, eersteVoorrang && i == 0 ? Swift.min(blijft, eersteGrens) : blijft)
            }
            // Het meeste over; bij gelijk de onderste.
            if let beste = opties.max(by: { $0.blijft < $1.blijft || ($0.blijft == $1.blijft && $0.i < $1.i) }) {
                gezet[beste.i] = beste.g
            } else if gezet.count > 1 {
                gezet.removeLast()
            } else {
                break
            }
        }
        return gezet
    }
}

extension Text {
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
