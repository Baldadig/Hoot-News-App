import Foundation

// De korte kop van een plek in de Editie, voor de widgets. Spiegel van shared/kort-kop.mjs (de server zet
// hem als `kortKop` op elke plek; daar staan de regels uitgelegd); de app gebruikt deze kopie alleen als de
// server hem niet gaf (een Editie van dit toestel, of een oudere server), en de widget om nog korter te gaan
// als een kop niet past. Dezelfde gevallen als het web: tests/fixtures/kort-kop.json (KortKopTests).
// Alles telt en knipt zoals JavaScript: in UTF-16-eenheden, met dezelfde reguliere expressies (ICU).
// De regel is dicht (keuring 8): een korte vorm bestaat alleen als de kop één bewering is. Dan vallen alleen
// woorden aan het eind weg, met "…". Anders nil, en staat de hele kop in de widget.
enum KortKop {
    static let max = 60

    static let losseEindes: Set<String> = [
        "de", "het", "een", "en", "of", "maar", "van", "in", "op", "aan", "met", "voor", "naar", "bij", "om", "te", "tot",
        "door", "over", "uit", "na", "als", "dat", "die", "dit", "deze", "wie", "wat", "is", "zijn", "wordt", "worden", "heeft",
        "hebben", "moet", "moeten", "kan", "kunnen", "wil", "willen", "zal", "zullen", "gaat", "gaan", "nog",
        "zo", "zó", "er", "ook", "want", "omdat", "toen", "tegen", "onder", "tussen", "zonder", "via", "per", "sinds",
        "rond", "rondom", "langs", "binnen", "buiten", "nabij", "jegens", "achter", "boven", "naast", "vanaf", "volgens",
        "tijdens", "wegens", "vanwege", "zoals", "dan", "hoe", "waar", "waarom", "wanneer", "nadat", "terwijl", "doordat",
        "zodat", "opdat", "hoewel", "indien", "waarna", "waardoor", "zich", "hun", "ze", "zij", "hij", "we", "wij", "je",
        "jij", "ik", "mijn", "onze", "ons", "jouw", "uw", "meer", "minder", "vol", "wel", "heel", "zeer", "zelfs",
        "the", "a", "an", "and", "or", "but", "of", "to", "for", "on", "at", "by", "with", "from", "as", "is", "are", "was",
        "were", "be", "has", "have", "will", "can", "that", "this", "its", "his", "her", "their", "into", "after", "over",
        "about", "amid", "against", "than", "who", "what", "which", "how", "why", "when", "where", "more", "our", "your", "my",
        "could", "would", "should", "may", "might", "must", "does", "do", "did", "had", "been", "being", "if", "he", "she",
        "they", "you", "it", "there", "i",
    ]
    // Ontkenningen en bijna-ontkenningen: in wat wegvalt nooit (zonder hen keert de betekenis om).
    static let ontkenningen: Set<String> = [
        "niet", "geen", "nooit", "niets", "niks", "niemand", "nergens", "nee", "noch", "nimmer", "geenszins", "allerminst",
        "amper", "nauwelijks", "zelden", "evenmin", "zonder", "non", "allesbehalve",
        "not", "no", "never", "nothing", "none", "nobody", "nowhere", "neither", "nor", "cannot", "hardly", "barely", "scarcely",
        "rarely", "seldom", "without", "cant", "dont", "doesnt", "didnt", "wont", "isnt", "arent", "wasnt", "werent", "hasnt",
        "havent", "hadnt", "shouldnt", "wouldnt", "couldnt", "aint", "mustnt", "neednt", "shant", "mightnt", "oughtnt",
        // Ontkennen zonder ontkenningswoord.
        "ontkent", "ontkennen", "ontkende", "ontkenden", "onwaar", "onjuist", "deny", "denies", "denied", "false",
        // Bijna, ten onrechte, vals (keuring 8). "op een haar na" staat in inkortbaar.
        "bijna", "vrijwel", "haast", "tevergeefs", "almost", "nearly", "onrechte", "onterecht", "onterechte", "wrongly",
        "falsely", "vals", "valse",
    ]
    // Een voorwaarde of uitzondering: zonder haar wordt een voorbehoud een feit (keuring 8).
    static let voorwaarden: Set<String> = [
        "tenzij", "behalve", "als", "mits", "indien", "zolang", "unless", "except", "if", "provided", "providing",
    ]
    // Een tegenwoord begint een eigen bewering, met of zonder komma (keuring 8).
    static let tegenwoorden: Set<String> = [
        "maar", "terwijl", "hoewel", "ofschoon", "doch", "echter", "but", "while", "whereas", "although", "though", "yet",
        "however",
    ]

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
    private static func vervang(_ p: String, _ s: String, _ door: String) -> String {
        re(p).stringByReplacingMatches(in: s, range: NSRange(location: 0, length: ns(s).length), withTemplate: door)
    }
    private static func lengte(_ s: String) -> Int { ns(s).length }
    private static func delen(_ s: String) -> [String] { s.components(separatedBy: " ") }

    // Gelijk zoals in JavaScript: teken voor teken (UTF-16), niet volgens Unicode-equivalentie.
    private static func gelijk(_ a: String, _ b: String) -> Bool { ns(a).isEqual(to: b) }
    private static func woorden(_ s: String) -> Int { delen(s).filter { !$0.isEmpty }.count }
    private static func schoon(_ s: String) -> String {
        vervang("^ +| +$", vervang("[\\s\\u0085]+", vervang("[\\u200B-\\u200D\\uFEFF]", s, ""), " "), "")
    }
    private static func staart(_ s: String) -> String { vervang("[\\s,;:–—\\-‘“'\"(]+$", s, "") }
    // Accenten tellen niet ("níét" is "niet"): NFD, dan de tekens zonder eigen letter eruit, zoals het web.
    private static func zonderAccent(_ w: String) -> String { vervang("\\p{M}", w.decomposedStringWithCanonicalMapping, "") }
    private static func letters(_ w: String) -> String { vervang("[^\\p{L}]", zonderAccent(w.lowercased()), "") }
    // Een woord uit ontkenningen, ook als deel van een samenstelling met een streepje ("niet-ontvankelijk",
    // "not-guilty"), of een Engelse samentrekking op n't ("mustn't", "needn’t", "canʼt" met U+02BC).
    static func ontkenning(_ w: String) -> Bool {
        let a = vervang("[’ʼ`´＇‘]", w.lowercased(), "'")
        return ontkenningen.contains(letters(a))
            || a.components(separatedBy: CharacterSet(charactersIn: "-‐‑–—")).contains { ontkenningen.contains(letters($0)) }
            || test("\\p{L}n't(?![\\p{L}])", a)
    }

    // MARK: Eén bewering (zie inkortbaar in kort-kop.mjs)

    // Leestekens die een eigen bewering kunnen beginnen: overal in een woord, of aan het eind ervan; of een los streepje.
    private static func grens(_ w: String) -> Bool {
        test("[…/\\[\\]()–—]", w) || test("[.?!;:,][^\\p{L}\\p{N}]*$", w) || test("^-+$", w)
    }
    // Een grens, voorwaarde of tegenwoord waar ook; een ontkenning alleen als ze wegvalt, en een sluitend
    // aanhalingsteken op of na het laatste woord dat blijft, met nog woorden erna (een toeschrijving: "‘…’ zegt X").
    private static func zwaar(_ w: String, valtWeg: Bool, sluitVoorRest: Bool) -> Bool {
        grens(w) || voorwaarden.contains(letters(w)) || tegenwoorden.contains(letters(w))
            || (valtWeg && ontkenning(w)) || (sluitVoorRest && test("[’”»\"'][^\\p{L}\\p{N}]*$", w))
    }
    // Een label vooraan van één woord ("Nepnieuws:", "VIDEO –"): telt niet als bewering en blijft altijd staan.
    private static func label(_ alle: [String]) -> Int {
        if alle.count > 2, test("^\\p{L}[\\p{L}\\p{N}-]*:$", alle[0]) { return 1 }
        if alle.count > 3, test("^\\p{L}[\\p{L}\\p{N}-]*$", alle[0]), test("^[–—-]$", alle[1]) { return 2 }
        return 0
    }
    // Mogen de woorden vanaf `n` wegvallen? Alleen als de kop (na een label) één bewering is.
    private static func inkortbaar(_ alle: [String], _ n: Int) -> Bool {
        let l = label(alle)
        if n - l < 2 || n >= alle.count { return false }
        if (l ..< alle.count).contains(where: { zwaar(alle[$0], valtWeg: $0 >= n, sluitVoorRest: $0 >= n - 1 && $0 < alle.count - 1) }) { return false }
        return !test("(?:^| )op een haar na(?: |$)", alle[Swift.max(0, n - 3)...].map { letters($0) }.joined(separator: " "))
    }

    private static func zonderLosEinde(_ d: [String]) -> [String] {
        var d = d
        while d.count > 1, let w = d.last, test("\\p{L}$", w), losseEindes.contains(letters(w)) { d.removeLast() }
        return d
    }

    // De bewaking: de kop zelf, of de eerste woorden met "…" van een kop die inkortbaar is (ook voor de server).
    static func veilig(_ kop: String, _ kort: String?) -> Bool {
        guard let kort else { return false }
        let t = schoon(kop)
        if gelijk(kort, t) { return true }
        guard kort.hasSuffix("…") else { return false }
        let alle = delen(t)
        let k = delen(ns(kort).substring(to: lengte(kort) - 1))
        guard k.count < alle.count else { return false }
        for (i, w) in k.enumerated() {
            if i < k.count - 1 ? !gelijk(w, alle[i]) : (!gelijk(w, staart(alle[i])) || w.isEmpty) { return false }
        }
        return inkortbaar(alle, k.count)
    }

    // MARK: De korte kop

    // nil: op deze maat is er geen korte vorm; dan staat de hele kop in de widget.
    static func kort(_ title: String?, max: Int = KortKop.max) -> String? {
        let t = schoon(title ?? "")
        if lengte(t) <= max { return t }
        let alle = delen(t)
        // Zoveel hele woorden als er passen, met ruimte voor het beletselteken.
        var n = 0, l = -1
        while n < alle.count, l + 1 + lengte(alle[n]) <= max - 1 { l += 1 + lengte(alle[n]); n += 1 }
        var d = zonderLosEinde(Array(alle.prefix(n)))
        // Een bijvoeglijk naamwoord zonder zijn zelfstandig naamwoord ("voor verouderde…"): eraf.
        while true {
            let laatste = d.last ?? ""
            let volgende = d.count < alle.count ? alle[d.count] : ""
            if d.count <= 2 || !test("^\\p{Ll}[\\p{L}-]{2,}e$", laatste) || !test("^[(‘’“'\"]?\\p{L}", volgende) || losseEindes.contains(letters(volgende)) { break }
            let korter = zonderLosEinde(Array(d.dropLast()))
            if Double(lengte(korter.joined(separator: " "))) < Double(max - 1) / 3 { break }
            d = korter
        }
        let uit = staart(d.joined(separator: " "))
        guard inkortbaar(alle, woorden(uit)) else { return nil }
        return uit + "…"
    }

    // Steeds kortere versies van een kop, voor een plek waar de korte kop van de server niet past: de widget
    // kiest de eerste die past (WidgetZet.pas), zodat iOS nooit midden in een woord afkapt. Een maat zonder
    // korte vorm wordt overgeslagen; is er geen enkele (de kop is meer dan één bewering), dan de kop zelf, en dan
    // krijgt hij in de widget de regels die hij nodig heeft (WidgetZet.pas).
    static func trap(_ kop: String, kort: String?) -> [String] {
        var uit: [String] = []
        // Een korte kop van de server telt alleen als hij veilig is (een oudere server kende de dichte regel nog niet).
        let vanServer = kort.flatMap { veilig(kop, $0) ? $0 : nil }
        for k in ([vanServer ?? self.kort(kop)] + [56, 52, 48, 44, 40, 36, 32, 28, 24].map({ self.kort(kop, max: $0) })).compactMap({ $0 })
        where !k.isEmpty && !uit.contains(k) && (uit.last.map { lengte(k) < lengte($0) } ?? true) {
            uit.append(k)
        }
        return uit.isEmpty ? [schoon(kop)] : uit
    }
}
