import Foundation

// De korte kop van een plek in de Editie, voor de bladerwidget. Spiegel van shared/kort-kop.mjs (de server zet hem als
// `kortKop` op elke plek; daar staat de regel uitgelegd); de app rekent zelf alleen als de server hem niet gaf (een
// Editie van dit toestel, of een oudere server). Dezelfde gevallen als het web: tests/fixtures/kort-kop.json
// (WidgetTests). Alles telt zoals JavaScript: in UTF-16-eenheden, met dezelfde reguliere expressies (ICU).
// De regel (besluit Alex 13 november 2026, "bijschrijven mag"): een kop wordt nooit ingekort. Past hij in 45 tekens,
// dan de kop zelf. Anders mag de server hem herschrijven (achter HOOT_KORTE_KOP_AI); de app neemt zo'n kop alleen over
// als hij door dezelfde controle komt als op de server (`controle`). Anders staat in de widget de hele kop.
enum KortKop {
    static let max = 45

    private static func regex(_ p: String, _ opties: NSRegularExpression.Options = []) -> NSRegularExpression {
        try! NSRegularExpression(pattern: p, options: opties)
    }
    private static func vervang(_ p: String, _ s: String, _ door: String) -> String {
        regex(p).stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: door)
    }
    private static func bevat(_ r: NSRegularExpression, _ s: String) -> Bool {
        r.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil
    }
    private static func treffers(_ p: String, _ s: String) -> [String] {
        let ns = s as NSString
        return regex(p).matches(in: s, range: NSRange(location: 0, length: ns.length)).map { ns.substring(with: $0.range) }
    }
    static func lengte(_ s: String) -> Int { (s as NSString).length }

    // Onzichtbare tekens eruit; witruimte (ook U+0085) wordt één spatie, zoals op het web.
    static func schoon(_ s: String) -> String {
        vervang("^ +| +$", vervang("[\\s\\u0085]+", vervang("[\\u200B-\\u200D\\uFEFF]", s, ""), " "), "")
    }

    private static let ontkenning = regex("(?<![\\p{L}\\p{N}])(niet|geen|nooit|zonder|noch|niemand|niets|nergens|not|no|never|without|nor|none|nobody|nothing|nowhere)(?![\\p{L}\\p{N}])|n['’]t(?![\\p{L}\\p{N}])", [.caseInsensitive])
    static func ontkent(_ s: String) -> Bool { bevat(ontkenning, s) }
    private static func getallen(_ s: String) -> [String] { treffers("[0-9]+", s) }
    // De woorden met een hoofdletter, behalve het eerste van de kop of van een zinsdeel na ": " (zoals op het web).
    private static func namen(_ s: String) -> [String] {
        var uit: [String] = []
        let delen = vervang("[:.!?]\\s+", s, "\u{1}").components(separatedBy: "\u{1}")
        let hoofdletter = regex("\\p{Lu}")
        for deel in delen {
            let woorden = treffers("[\\p{L}\\p{N}]+", deel)
            for w in woorden.dropFirst() where bevat(hoofdletter, w) { uit.append(w) }
        }
        return uit
    }

    // De controle op een herschreven korte kop (gelijk aan het web): lengte, geen beletselteken, niet het begin van de
    // kop, geen nieuwe getallen of namen, ontkenning gelijk.
    static func controle(_ kop: String, _ kort: String?) -> Bool {
        guard let kort else { return false }
        let t = schoon(kop), k = schoon(kort)
        guard !k.isEmpty, lengte(k) <= max else { return false }
        if (k as NSString).isEqual(to: t) { return true }
        if lengte(t) <= max { return false }
        let puntjes = regex("…|\\.\\.\\.")
        if bevat(puntjes, k), !bevat(puntjes, t) { return false }
        let stam = vervang("[\\s\\p{P}]+$", k, "").lowercased()
        if !stam.isEmpty, (t.lowercased() as NSString).hasPrefix(stam) { return false }
        let tGetallen = Set(getallen(t))
        if getallen(k).contains(where: { !tGetallen.contains($0) }) { return false }
        let tLaag = t.lowercased() as NSString
        if namen(k).contains(where: { tLaag.range(of: $0.lowercased(), options: .literal).location == NSNotFound }) { return false }
        return ontkent(t) == ontkent(k)
    }

    // De bewaking: de kop zelf (als hij past), of een herschreven kop die door de controle komt. Een ingekorte kop van
    // een oudere server ("…") telt niet.
    static func veilig(_ kop: String, _ kort: String?) -> Bool {
        guard let kort else { return false }
        if (kort as NSString).isEqual(to: schoon(kop)), lengte(kort) <= max { return true }
        return controle(kop, kort)
    }

    // De kop als hij in `max` past; nil: hij past niet.
    static func kort(_ title: String?, max: Int = KortKop.max) -> String? {
        let t = schoon(title ?? "")
        return lengte(t) <= max ? t : nil
    }

    // Wat de widget als korte kop bewaart: de veilige korte kop van de server, anders de kop zelf als hij past, anders
    // de hele kop (dan is er geen korte vorm, en toont de widget de hele kop).
    static func voorWidget(_ kop: String, kort: String?) -> String {
        if let kort, veilig(kop, kort) { return schoon(kort) }
        return schoon(kop)
    }

    // Wat de oudere widgetvormen (Top 3, Kop 01, het vergrendelscherm) zetten: altijd de hele kop.
    static func trap(_ kop: String, kort: String?) -> [String] {
        [schoon(kop)]
    }
}
