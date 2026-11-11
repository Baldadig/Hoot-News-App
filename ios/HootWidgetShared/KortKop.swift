import Foundation

// De korte kop van een plek in de Editie, voor de widgets. Spiegel van shared/kort-kop.mjs (de server zet
// hem als `kortKop` op elke plek; daar staan de regels uitgelegd); de app gebruikt deze kopie alleen als de
// server hem niet gaf (een Editie van dit toestel, of een oudere server), en de widget om nog korter te gaan
// als een kop niet past. Dezelfde gevallen als het web: tests/fixtures/kort-kop.json (KortKopTests).
// Alles telt en knipt zoals JavaScript: in UTF-16-eenheden, met dezelfde reguliere expressies (ICU).
enum KortKop {
    static let max = 60
    static let kernMin = 24
    static let kortToevoeging = 4

    static let losseEindes: Set<String> = [
        "de", "het", "een", "en", "of", "maar", "van", "in", "op", "aan", "met", "voor", "naar", "bij", "om", "te", "tot",
        "door", "over", "uit", "na", "als", "dat", "die", "dit", "deze", "wie", "wat", "is", "zijn", "wordt", "worden", "heeft",
        "hebben", "moet", "moeten", "kan", "kunnen", "wil", "willen", "zal", "zullen", "gaat", "gaan", "nog", "niet", "geen",
        "zo", "zó", "er", "ook", "want", "omdat", "toen", "tegen", "onder", "tussen", "zonder", "via", "per", "sinds",
        "rond", "rondom", "langs", "binnen", "buiten", "nabij", "jegens", "achter", "boven", "naast", "vanaf", "volgens",
        "tijdens", "wegens", "vanwege", "zoals", "dan", "hoe", "waar", "waarom", "wanneer", "nadat", "terwijl", "doordat",
        "zodat", "opdat", "hoewel", "indien", "waarna", "waardoor", "zich", "hun", "ze", "zij", "hij", "we", "wij", "je",
        "jij", "ik", "mijn", "onze", "ons", "jouw", "uw", "meer", "minder", "vol", "wel", "heel", "zeer", "zelfs",
        "the", "a", "an", "and", "or", "but", "of", "to", "for", "on", "at", "by", "with", "from", "as", "is", "are", "was",
        "were", "be", "has", "have", "will", "can", "that", "this", "its", "his", "her", "their", "into", "after", "over",
        "about", "amid", "against", "than", "who", "what", "which", "how", "why", "when", "where", "not", "more", "our", "your", "my",
        "could", "would", "should", "may", "might", "must", "does", "do", "did", "had", "been", "being", "if", "he", "she",
        "they", "you", "it", "there", "i",
    ]
    static let voegwoorden: Set<String> = ["en", "of", "maar", "want", "dus", "and", "or", "but"]

    // MARK: Zoals JavaScript

    nonisolated(unsafe) private static var cache: [String: NSRegularExpression] = [:]
    private static let slot = NSLock()
    private static func re(_ p: String) -> NSRegularExpression {
        slot.lock(); defer { slot.unlock() }
        if let r = cache[p] { return r }
        let r = try! NSRegularExpression(pattern: p)
        cache[p] = r
        return r
    }
    private static func ns(_ s: String) -> NSString { s as NSString }
    private static func test(_ p: String, _ s: String) -> Bool {
        re(p).firstMatch(in: s, range: NSRange(location: 0, length: ns(s).length)) != nil
    }
    // De groepen van de eerste treffer (0 is alles), of nil.
    private static func match(_ p: String, _ s: String) -> [String]? {
        guard let m = re(p).firstMatch(in: s, range: NSRange(location: 0, length: ns(s).length)) else { return nil }
        return (0 ..< m.numberOfRanges).map { m.range(at: $0).location == NSNotFound ? "" : ns(s).substring(with: m.range(at: $0)) }
    }
    private static func vervang(_ p: String, _ s: String, _ door: String) -> String {
        re(p).stringByReplacingMatches(in: s, range: NSRange(location: 0, length: ns(s).length), withTemplate: door)
    }
    private static func lengte(_ s: String) -> Int { ns(s).length }
    private static func begin(_ s: String, _ n: Int) -> String { ns(s).substring(to: Swift.min(n, ns(s).length)) }
    private static func delen(_ s: String) -> [String] { s.components(separatedBy: " ") }

    private static func woorden(_ s: String) -> Int { delen(s).filter { !$0.isEmpty }.count }
    private static func schoon(_ s: String) -> String { vervang("^ +| +$", vervang("\\s+", s, " "), "") }
    private static func staart(_ s: String) -> String { vervang("[\\s,;:–—\\-‘“'\"(]+$", s, "") }
    private static func kern(_ s: String, _ min: Int) -> Bool { lengte(s) >= kernMin && woorden(s) >= min }
    private static func hoofdletter(_ s: String) -> String {
        guard test("^\\p{Ll}\\p{Ll}", s), let eerste = s.first else { return s }
        return eerste.uppercased() + s.dropFirst()
    }
    private static func letters(_ w: String) -> String { vervang("[^\\p{L}]", w.lowercased(), "") }

    private static let openCitaat = "^[‘’“'\"„«‚]"
    private static let sluitCitaat = "[’”'\"»]$"

    private static func zonderLosEinde(_ d: [String], _ set: Set<String> = losseEindes) -> [String] {
        var d = d
        while d.count > 1, let w = d.last, test("\\p{L}$", w), set.contains(letters(w)) { d.removeLast() }
        return d
    }

    private static func afkappen(_ t: String, _ max: Int) -> String {
        let ruimte = max - 1
        let alle = delen(t)
        var d = delen(begin(t, ruimte))
        if ruimte >= lengte(t) || ns(t).character(at: ruimte) != 0x20 { d.removeLast() }
        // Een beletselteken in de kop zelf komt niet dubbel.
        if d.count > 1 { d[d.count - 1] = vervang("…+$", d[d.count - 1], "") }
        if d.count > 1, d[d.count - 1].isEmpty { d.removeLast() }
        d = zonderLosEinde(d)
        while true {
            let laatste = d.last ?? ""
            let volgende = d.count < alle.count ? alle[d.count] : ""
            if d.count <= 2 || !test("^\\p{Ll}[\\p{L}-]{2,}e$", laatste) || !test("^[(‘’“'\"]?\\p{L}", volgende) || losseEindes.contains(letters(volgende)) { break }
            let korter = zonderLosEinde(Array(d.dropLast()))
            if Double(lengte(korter.joined(separator: " "))) < Double(ruimte) / 3 { break }
            d = korter
        }
        var uit = staart(d.joined(separator: " "))
        if uit.isEmpty { uit = begin(t, ruimte) }
        return uit + "…"
    }

    private static func isCitaat(_ s: String) -> Bool { test(openCitaat, s) && test(sluitCitaat, s) && woorden(s) >= 2 }
    private static func benoemd(_ s: String) -> Bool {
        test("\\d", s) || delen(s).dropFirst().contains { test("^[‘’“'\"„«‚(]?\\p{Lu}", $0) }
    }
    // Title Case: na het eerste woord meestal een hoofdletter, ook op een klein woord ("It's", "Been").
    private static func titleCase(_ s: String) -> Bool {
        let w = delen(s).dropFirst().filter { test("\\p{L}", $0) }
        let groot = w.filter { test("^[‘’“'\"„«‚(]?\\p{Lu}", $0) }
        return w.count >= 3 && Double(groot.count) / Double(w.count) >= 0.6 && groot.contains { losseEindes.contains(letters($0)) }
    }
    // Een titel of naam over de dubbele punt: A eindigt op een naam of getal, B begint met een naam.
    private static func titelOverPunt(_ a: String, _ b: String) -> Bool {
        test("^[‘’“'\"„«‚(]?(?:\\p{Lu}|\\d)", delen(a).last ?? "") && test("^(?:\\p{Lu}|\\d)", b)
    }

    // MARK: De korte kop

    static func kort(_ title: String?, max: Int = KortKop.max) -> String {
        let t = schoon(title ?? "")
        if lengte(t) <= max { return t }

        // De eerste zin, als die zelf een kop is.
        if let z = match("^(.+?(?:[?!]|\\p{Ll}{3}\\.))\\s+\\S", t), lengte(z[1]) <= max, kern(z[1], 4) { return z[1] }

        // Dubbele punt, of een citaat vooraan zonder dubbele punt.
        if let p = match("^([^:]+):\\s(.+)$", t) ?? match("^([‘“'\"„«‚][^’”'\"»]+[’”'\"»])\\s(\\p{Lu}.+)$", t) {
            let a = staart(zonderLosEinde(delen(p[1]), voegwoorden).joined(separator: " "))
            let b = vervang("^\\s+|\\s+$", p[2], "")
            let toevoegingB = woorden(b) <= kortToevoeging || test(openCitaat, b) || b.hasSuffix("?")
            if isCitaat(a) {
                if kern(b, 4) { return kort(hoofdletter(b), max: max) }
            } else if kern(a, 4), !titelOverPunt(a, b) {
                let wilB = !toevoegingB && kern(b, 4) && (test("^\\p{Lu}", b) || !benoemd(a))
                if !wilB { return kort(a, max: max) }
                if !titleCase(b) { return kort(hoofdletter(b), max: max) }
                // B in Title Case: twijfel, de hele kop inkorten.
            }
            // Een titel over de dubbele punt: de hele kop inkorten.
        }

        // Toevoeging na een gedachtestreep, of tussen haakjes.
        if let m = match("^(.+?)\\s[–—-]\\s.+$", t) {
            let voor = staart(m[1])
            if lengte(voor) <= max, kern(voor, 3) { return voor }
        }
        if let m = match("^(.+?)\\s*\\([^()]*\\)$", t) {
            let voor = staart(m[1])
            if lengte(voor) <= max, kern(voor, 3) { return voor }
        }
        let zonderHaakjes = vervang("\\s+\\([^()]*\\)(?=\\s|$)", t, "")
        if zonderHaakjes != t, lengte(zonderHaakjes) <= max, kern(zonderHaakjes, 3) { return zonderHaakjes }
        let basis = zonderHaakjes != t && kern(zonderHaakjes, 3) ? zonderHaakjes : t

        // Een bijzin na een komma.
        let r = ns(begin(basis, max - 1)).range(of: ", ", options: .backwards)
        if r.location != NSNotFound, r.location > 0 {
            let voor = staart(zonderLosEinde(delen(begin(basis, r.location))).joined(separator: " "))
            if kern(voor, 4), Double(lengte(voor)) >= Double(max - 1) / 2, !isCitaat(voor) { return voor + "…" }
        }

        return afkappen(basis, max)
    }

    // Steeds kortere versies van een kop, voor een plek waar de korte kop van de server niet past: de widget
    // kiest de eerste die past (WidgetZet.pas), zodat iOS nooit midden in een woord afkapt.
    static func trap(_ kop: String, kort: String?) -> [String] {
        var uit: [String] = []
        for k in [kort ?? self.kort(kop)] + [56, 52, 48, 44, 40, 36, 32, 28, 24].map({ self.kort(kop, max: $0) })
        where !k.isEmpty && !uit.contains(k) && (uit.last.map { lengte(k) < lengte($0) } ?? true) {
            uit.append(k)
        }
        return uit
    }
}
