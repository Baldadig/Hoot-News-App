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
    struct Maat: Hashable, Sendable {
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

// Koppen zetten (besluit Alex 12 november 2026, definitief): een kop wordt nooit ingekort en nooit afgekapt.
// Elke widget vult zich van boven af met zoveel HELE koppen als er binnen de marges passen, in Editie-volgorde.
// Past een kop niet heel, dan slaat de widget hem over en mag een latere kop die wel heel past opschuiven, met
// zijn eigen nummer (01, 04 …). Past op de eerste plek zelfs 01 niet, dan wordt hij kleiner gezet, tot een vaste
// ondergrens; past hij dan nog niet, dan de volgende kop die wel past. Past er geen enkele: de rustige voortgang.
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

    // De hele kop met de regels die hij nodig heeft. Er is geen kortere versie (KortKop.trap is altijd de hele kop);
    // `max` blijft voor de vorm, de plek beslist of hij past.
    static func pas(_ kop: String, kort: String?, _ m: WidgetLetter.Maat, breedte: CGFloat, max: Int) -> Gezet {
        let tekst = KortKop.trap(kop, kort: kort).first ?? kop
        return Gezet(tekst: tekst, regels: regels(tekst, m, breedte: breedte))
    }

    // Een kop op zijn plek: welk verhaal (index in de Editie), de hele kop en de maat waarin hij staat.
    struct Plek: Hashable, Sendable {
        let index: Int
        let gezet: Gezet
        let m: WidgetLetter.Maat
        var hoogte: CGFloat { CGFloat(gezet.regels) * m.regel }
    }

    // De maten waarin een kop op de eerste plek mag staan: zijn eigen maat, dan widget-kop, dan kleiner in vaste
    // stappen van een punt tot de ondergrens. Nooit kleiner (iOS zet niets zelf kleiner).
    static let ondergrens: CGFloat = 13
    static func trap(_ m: WidgetLetter.Maat) -> [WidgetLetter.Maat] {
        var t = [m]
        if m.grootte > WidgetLetter.widgetKop.grootte { t.append(WidgetLetter.widgetKop) }
        var g = min(m.grootte, WidgetLetter.widgetKop.grootte) - 1
        while g >= ondergrens { t.append(WidgetLetter.widgetKop.op(g)); g -= 1 }
        return t
    }

    // Slim vullen: van boven af, in Editie-volgorde, zoveel hele koppen als er in `hoogte` passen. `tussen` is de
    // lucht tussen twee rijen, `extra` wat elke rij naast zijn kop nog nodig heeft (bronregel, haarlijn). Een kop die
    // niet heel past, wordt overgeslagen; een latere die wel past, schuift op. Alleen op de eerste plek mag een kop
    // kleiner (tot de ondergrens), zodat de widget niet leeg blijft als een kop er kleiner wel in past.
    static func vul(_ verhalen: [WidgetVerhaal], _ m: WidgetLetter.Maat, breedte: CGFloat, hoogte: CGFloat, tussen: CGFloat,
                    extra: CGFloat = 0, max aantal: Int = .max, vanaf: Int = 0, eersteKleiner: Bool = true) -> [Plek] {
        var plekken: [Plek] = []
        var gebruikt: CGFloat = 0
        for i in verhalen.indices where i >= vanaf && plekken.count < aantal {
            let v = verhalen[i]
            let voor = plekken.isEmpty ? 0 : tussen
            for mm in (plekken.isEmpty && eersteKleiner ? trap(m) : [m]) {
                let g = pas(v.kop, kort: v.kortKop, mm, breedte: breedte, max: .max)
                let h = CGFloat(g.regels) * mm.regel + extra
                if gebruikt + voor + h <= hoogte {
                    plekken.append(Plek(index: i, gezet: g, m: mm))
                    gebruikt += voor + h
                    break
                }
            }
        }
        return plekken
    }

    // De hoogte van gevulde rijen (voor toetsen en de rekensom van een widget).
    static func totaal(_ p: [Plek], tussen: CGFloat, extra: CGFloat = 0) -> CGFloat {
        p.isEmpty ? 0 : p.reduce(0) { $0 + $1.hoogte + extra } + tussen * CGFloat(p.count - 1)
    }
}

extension WidgetLetter.Maat {
    // Dezelfde letter op een kleinere grootte: regelhoogte in dezelfde verhouding, letterafstand gelijk (em).
    func op(_ g: CGFloat) -> WidgetLetter.Maat {
        WidgetLetter.Maat(grootte: g, regel: ((regel / grootte) * g * 10).rounded() / 10, spatie: spatie)
    }
}

extension View {
    // Alleen in toetsen: waar deze kop staat en welke breedte hij echt kreeg (WidgetRenderTests).
    func widgetMeting(_ gezet: WidgetZet.Gezet, _ m: WidgetLetter.Maat) -> some View {
        widgetMeting(.kop(gezet, m))
    }
    func widgetMeting(_ soort: WidgetZetMeting.Soort) -> some View {
        background {
            if let opname = WidgetZetMeting.opname {
                GeometryReader { p in
                    let _ = opname(soort, p.frame(in: .named(WidgetZetMeting.ruimte)))
                    Color.clear
                }
            }
        }
    }
}

extension Text {
    // Een kop in Newsreader 800 op een vaste regelhoogte (iOS 26: exact). Zonder lineLimit: iOS kan dus nooit "…"
    // zetten. De plek is vooraf gemeten (WidgetZet.regels); WidgetRenderTests bewaakt dat hij er ook in de weergave
    // in past.
    func widgetKop(_ m: WidgetLetter.Maat, regels: Int) -> some View {
        self.font(WidgetLetter.kop(m))
            .kerning(m.kern)
            .lineHeight(.exact(points: m.regel))
            .fixedSize(horizontal: false, vertical: true)
    }
    func widgetKicker() -> some View {
        self.font(WidgetLetter.kicker).tracking(12 * 0.06).textCase(.uppercase).lineLimit(1)
    }
}

// Alleen voor toetsen: elke kop en elke bronregel meldt waar hij in de widget staat (en dus de breedte die hij
// echt kreeg), zodat een toets kan nagaan dat een kop in zijn regels past, dat elke rij zijn bronregel heeft en
// dat de eerste rij bovenaan staat. In de app en de extensie nil.
enum WidgetZetMeting {
    enum Soort { case kop(WidgetZet.Gezet, WidgetLetter.Maat), bron(String) }
    static let ruimte = "hoot-widget"
    nonisolated(unsafe) static var opname: ((Soort, CGRect) -> Void)?
}
