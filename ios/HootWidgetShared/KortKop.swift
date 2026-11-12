import Foundation

// De korte kop van een plek in de Editie, voor de widgets. Spiegel van shared/kort-kop.mjs (de server zet
// hem als `kortKop` op elke plek; daar staat de regel uitgelegd); de app gebruikt deze kopie alleen als de
// server hem niet gaf (een Editie van dit toestel, of een oudere server). Dezelfde gevallen als het web:
// tests/fixtures/kort-kop.json (KortKopTests). Alles telt zoals JavaScript: in UTF-16-eenheden, met dezelfde
// reguliere expressies (ICU).
// De regel is dicht (besluit Alex "korte kop dicht", bij twijfel geen korte vorm; keuring 9): een kop wordt nooit
// ingekort. Past hij, dan de kop zelf; anders nil, en staat de hele kop in de widget met de regels die hij nodig
// heeft (WidgetZet.pas). Geen woord valt weg, dus ook geen woordgrenzen of grafemen om het over oneens te zijn.
enum KortKop {
    static let max = 60

    private static func vervang(_ p: String, _ s: String, _ door: String) -> String {
        let r = try! NSRegularExpression(pattern: p)
        return r.stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: door)
    }
    private static func lengte(_ s: String) -> Int { (s as NSString).length }

    // Onzichtbare tekens eruit; witruimte (ook U+0085) wordt één spatie, zoals op het web.
    static func schoon(_ s: String) -> String {
        vervang("^ +| +$", vervang("[\\s\\u0085]+", vervang("[\\u200B-\\u200D\\uFEFF]", s, ""), " "), "")
    }

    // De bewaking: alleen de kop zelf (gelijk zoals in JavaScript: teken voor teken in UTF-16). Een ingekorte kop
    // van een oudere server telt niet.
    static func veilig(_ kop: String, _ kort: String?) -> Bool {
        guard let kort else { return false }
        return (kort as NSString).isEqual(to: schoon(kop))
    }

    // De kop als hij in `max` past; nil: hij past niet, dan staat de hele kop in de widget.
    static func kort(_ title: String?, max: Int = KortKop.max) -> String? {
        let t = schoon(title ?? "")
        return lengte(t) <= max ? t : nil
    }

    // Wat de widget mag zetten (WidgetZet.pas): altijd de hele kop. Er is geen kortere versie; past hij niet in zijn
    // regels, dan krijgt hij er meer, of maakt de plek ruimte (de kop eronder valt weg). iOS kapt nooit af.
    static func trap(_ kop: String, kort: String?) -> [String] {
        [schoon(kop)]
    }
}
