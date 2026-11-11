import Foundation

// De korte kop van een plek in de Editie, voor de widgets. Spiegel van shared/kort-kop.mjs (de server zet
// hem als `kortKop` op elke plek); de app gebruikt deze kopie alleen als de server hem niet gaf (een Editie
// van dit toestel, of een oudere server), en de widget om nog korter te gaan als een kop niet past.
// Dezelfde gevallen als het web: tests/fixtures/kort-kop.json (KortKopTests). Lengtes tellen zoals
// JavaScript: in UTF-16-eenheden.
enum KortKop {
    static let max = 60
    static let kernMin = 24

    static let losseEindes: Set<String> = [
        "de", "het", "een", "en", "of", "maar", "van", "in", "op", "aan", "met", "voor", "naar", "bij", "om", "te", "tot",
        "door", "over", "uit", "na", "als", "dat", "die", "dit", "deze", "wie", "wat", "is", "zijn", "wordt", "worden", "heeft",
        "hebben", "moet", "moeten", "kan", "kunnen", "wil", "willen", "zal", "zullen", "gaat", "gaan", "nog", "niet", "geen",
        "zo", "zó", "er", "ook", "want", "omdat", "toen", "tegen", "onder", "tussen", "zonder", "via", "per", "sinds",
        "the", "a", "an", "and", "or", "but", "of", "to", "for", "on", "at", "by", "with", "from", "as", "is", "are", "was",
        "were", "be", "has", "have", "will", "can", "that", "this", "its", "his", "her", "their", "into", "after", "over",
    ]

    private static func lengte(_ s: String) -> Int { s.utf16.count }
    private static func woorden(_ s: String) -> Int { s.split(separator: " ").count }
    private static func schoon(_ s: String) -> String {
        s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    // Leestekens die aan het eind van een ingekorte kop niets meer doen.
    private static let staartTekens: Set<Character> = [" ", ",", ";", ":", "–", "—", "-", "‘", "“", "'", "\"", "("]
    private static func staart(_ s: String) -> String {
        var s = s
        while let last = s.last, staartTekens.contains(last) || last.isWhitespace { s.removeLast() }
        return s
    }
    private static func kern(_ s: String, _ min: Int) -> Bool { lengte(s) >= kernMin && woorden(s) >= min }

    // Het begin van `s`: de eerste `n` UTF-16-eenheden (JavaScript: s.slice(0, n)).
    private static func begin(_ s: String, _ n: Int) -> String {
        String(decoding: Array(s.utf16.prefix(n)), as: UTF16.self)
    }
    private static func teken(_ s: String, _ i: Int) -> String? {
        let u = Array(s.utf16)
        return i < u.count ? String(decoding: [u[i]], as: UTF16.self) : nil
    }

    static func kort(_ title: String?, max: Int = KortKop.max) -> String {
        let t = schoon(title ?? "")
        if lengte(t) <= max { return t }

        // Toevoeging na een gedachtestreep of tussen haakjes aan het eind.
        if let m = t.wholeMatch(of: /(.+?)\s[–—-]\s.+/) {
            let voor = staart(String(m.1))
            if lengte(voor) <= max, kern(voor, 3) { return voor }
        }
        if let m = t.wholeMatch(of: /(.+?)\s*\([^()]*\)/) {
            let voor = staart(String(m.1))
            if lengte(voor) <= max, kern(voor, 3) { return voor }
        }
        // Dubbele punt: een lange kern ervoor blijft, de uitwerking erna valt weg.
        if let m = t.wholeMatch(of: /([^:]+):\s.+/) {
            let voor = staart(String(m.1))
            if lengte(voor) <= max, kern(voor, 4) { return voor }
        }
        // Afkappen op een woordgrens, met ruimte voor het beletselteken.
        let ruimte = max - 1
        var delen = begin(t, ruimte).components(separatedBy: " ")
        if teken(t, ruimte) != " " { delen.removeLast() }
        while delen.count > 1, losseEindes.contains(String(delen[delen.count - 1].lowercased().filter(\.isLetter))) { delen.removeLast() }
        var uit = staart(delen.joined(separator: " "))
        if uit.isEmpty { uit = begin(t, ruimte) }
        return uit + "…"
    }

    // Steeds kortere versies van een kop, voor een plek waar de korte kop van de server niet past: de widget
    // kiest de eerste die past (ViewThatFits), zodat iOS nooit midden in een woord afkapt.
    static func trap(_ kop: String, kort: String?) -> [String] {
        var uit: [String] = []
        for k in [kort ?? self.kort(kop)] + [52, 44, 36, 30, 24].map({ self.kort(kop, max: $0) })
        where !k.isEmpty && !uit.contains(k) && (uit.last.map { lengte(k) < lengte($0) } ?? true) {
            uit.append(k)
        }
        return uit
    }
}
