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
    static let voegwoorden: Set<String> = ["en", "of", "maar", "want", "dus", "and", "or", "but"]
    // Een ontkenning is nooit een los einde, en valt nooit weg (veilig). Ook wat bijna ontkent ("amper", "zelden",
    // "evenmin", "hardly", "rarely") en "zonder"/"without"; "non" voor samenstellingen ("non-profit").
    static let ontkenningen: Set<String> = [
        "niet", "geen", "nooit", "niets", "niks", "niemand", "nergens", "nee", "noch", "nimmer", "geenszins", "allerminst",
        "amper", "nauwelijks", "zelden", "evenmin", "zonder", "non",
        "rarely", "seldom",
        "not", "no", "never", "nothing", "none", "nobody", "nowhere", "neither", "nor", "cannot", "hardly", "barely", "scarcely",
        "without", "cant", "dont", "doesnt", "didnt", "wont", "isnt", "arent", "wasnt", "werent", "hasnt", "havent", "hadnt",
        "shouldnt", "wouldnt", "couldnt", "aint", "mustnt", "neednt", "shant", "mightnt", "oughtnt",
        // Ontkennen zonder ontkenningswoord ("…; premier ontkent dat", "…; his office denies it").
        "ontkent", "ontkennen", "ontkende", "ontkenden", "onwaar", "onjuist", "deny", "denies", "denied", "false",
    ]
    // Een deel dat met een voorzetsel of voegwoord begint, heeft geen eigen onderwerp vooraan.
    static let openers: Set<String> = [
        "van", "in", "op", "aan", "met", "voor", "naar", "bij", "om", "te", "tot", "door", "over", "uit", "na", "als", "tegen",
        "onder", "tussen", "zonder", "via", "per", "sinds", "rond", "rondom", "langs", "binnen", "buiten", "nabij", "achter",
        "boven", "naast", "vanaf", "volgens", "tijdens", "wegens", "vanwege", "zoals", "ondanks", "dankzij", "namens", "richting",
        "en", "of", "maar", "want", "dus", "omdat", "toen", "nadat", "terwijl", "doordat", "zodat", "hoewel", "indien", "mits",
        "to", "for", "on", "at", "by", "with", "from", "into", "after", "before", "about", "amid", "against",
        "as", "than", "through", "since", "until", "under", "between", "despite", "without", "during", "towards", "toward",
        "and", "or", "but", "if", "because", "while", "although", "though", "unless", "whether",
    ]
    // Een B die zo begint, is geen kop op zichzelf ("it will not be the last", "that is not true"); "Dit is …" wel.
    static let voornaamwoord: Set<String> = [
        "it", "he", "she", "they", "we", "i", "that", "which", "so", "hij", "zij", "ze", "wij", "ik", "dat", "zo",
    ]
    // Woorden waarmee een nieuwe (bij)zin begint; geen "en", "of", "and" of "or".
    static let bijzin: Set<String> = [
        "maar", "want", "omdat", "als", "terwijl", "doordat", "zodat", "hoewel", "nadat", "toen", "dat", "die", "wie",
        "waar", "waardoor", "waarna", "waarin", "waarmee", "indien", "tenzij", "zolang", "zodra",
        "but", "as", "while", "because", "although", "though", "that", "which", "who", "when", "where", "unless", "whereas", "yet",
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
    private static func schoon(_ s: String) -> String {
        vervang("^ +| +$", vervang("\\s+", vervang("[\\u200B-\\u200D\\uFEFF]", s, ""), " "), "")
    }
    private static func staart(_ s: String) -> String { vervang("[\\s,;:–—\\-‘“'\"(]+$", s, "") }
    private static func kern(_ s: String, _ min: Int) -> Bool { lengte(s) >= kernMin && woorden(s) >= min }
    private static func hoofdletter(_ s: String) -> String {
        guard test("^\\p{Ll}\\p{Ll}", s), let eerste = s.first else { return s }
        return eerste.uppercased() + s.dropFirst()
    }
    // Accenten tellen niet ("níét" is "niet"): NFD, dan de tekens zonder eigen letter eruit, zoals het web.
    private static func zonderAccent(_ w: String) -> String { vervang("\\p{M}", w.decomposedStringWithCanonicalMapping, "") }
    private static func letters(_ w: String) -> String { vervang("[^\\p{L}]", zonderAccent(w.lowercased()), "") }
    // Een woord uit ontkenningen, ook als deel van een samenstelling met een streepje ("niet-ontvankelijk",
    // "not-guilty"), of een Engelse samentrekking op n't ("mustn't", "needn’t", "canʼt" met U+02BC).
    static func ontkenning(_ w: String) -> Bool {
        let a = vervang("[’ʼ`´]", w.lowercased(), "'")
        return ontkenningen.contains(letters(a))
            || a.components(separatedBy: CharacterSet(charactersIn: "-‐‑–—")).contains { ontkenningen.contains(letters($0)) }
            || test("\\p{L}n't(?![\\p{L}])", a)
    }
    private static func heeftOntkenning(_ s: String) -> Bool { delen(s).contains { ontkenning($0) } }
    private static func opent(_ s: String) -> Bool { openers.contains(letters(delen(s).first ?? "")) }
    // Begint bij woord `i` een nieuwe zin of bijzin: na een leesteken, bij een gedachtestreep of een bijzinswoord.
    private static func zinsbegin(_ alle: [String], _ i: Int) -> Bool {
        i > 0 && i < alle.count && (test("[,;:.?!]$", alle[i - 1]) || test("^[–—-]$", alle[i]) || bijzin.contains(letters(alle[i])))
    }
    // MARK: De bewaking (zie veilig in kort-kop.mjs)

    private static func sleutel(_ w: String) -> String { vervang("[^\\p{L}\\p{N}]", zonderAccent(w.lowercased()), "") }
    private static func gelijk(_ a: String, _ b: String) -> Bool { ns(a).isEqual(to: b) }
    // Welke woorden van de kop (index in `alle`) staan in de korte kop, met zo weinig mogelijk weggevallen stukken?
    private static func gelegd(_ alle: [String], _ kort: String) -> Set<Int>? {
        let idx = alle.indices.filter { !sleutel(alle[$0]).isEmpty }
        let sk = idx.map { sleutel(alle[$0]) }
        let k = delen(vervang("…$", kort, "")).map { sleutel($0) }.filter { !$0.isEmpty }
        let n = idx.count, m = k.count
        let groot = 1_000_000_000
        for prefix in [false, true] {
            func past(_ i: Int, _ j: Int) -> Bool { gelijk(sk[i], k[j]) || (prefix && j == m - 1 && ns(sk[i]).hasPrefix(k[j])) }
            var f = [[[Int]]](repeating: [[Int]](repeating: [Int](repeating: groot, count: m + 1), count: n + 1), count: 2)
            f[0][n][m] = 0
            f[1][n][m] = 0
            if n > 0 {
                for i in stride(from: n - 1, through: 0, by: -1) {
                    for j in stride(from: m, through: 0, by: -1) {
                        for d in 0 ... 1 {
                            let weg = (d == 1 ? 0 : 1) + f[1][i + 1][j]
                            let mee = j < m && past(i, j) ? f[0][i + 1][j + 1] : groot
                            f[d][i][j] = Swift.min(mee, weg)
                        }
                    }
                }
            }
            if f[0][0][0] >= groot { continue }
            var uit = Set<Int>()
            var j = 0, d = 0
            for i in 0 ..< n {
                if j < m && past(i, j) && f[0][i + 1][j + 1] <= (d == 1 ? 0 : 1) + f[1][i + 1][j] {
                    uit.insert(idx[i]); j += 1; d = 0
                } else { d = 1 }
            }
            return uit
        }
        return nil
    }
    // Valt er een ontkenning weg, waar ook in de kop? Dan is deze korte kop niet veilig. Geen uitzondering: ook een
    // bijzin, zin of citaat die helemaal wegvalt, kan het blijvende deel tegenspreken (keuring 6).
    static func veilig(_ kop: String, _ kort: String?) -> Bool {
        guard let kort else { return false }
        let alle = delen(schoon(kop))
        guard let mee = gelegd(alle, kort) else { return false }
        return !alle.indices.contains { !mee.contains($0) && ontkenning(alle[$0]) }
    }

    private static let openCitaat = "^[‘’“'\"„«‚]"
    private static let sluitCitaat = "[’”'\"»]$"

    private static func zonderLosEinde(_ d: [String], _ set: Set<String> = losseEindes) -> [String] {
        var d = d
        while d.count > 1, let w = d.last, test("\\p{L}$", w), set.contains(letters(w)) { d.removeLast() }
        return d
    }

    // Afkappen; niet veilig, dan steeds eerder (terug naar het begin van een zin); anders nil.
    private static func afkappen(_ t: String, _ max: Int, _ kop: String) -> String? {
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
        if veilig(kop, uit + "…") { return uit + "…" }
        var j = d.count - 1
        while j > 0 {
            if zinsbegin(alle, j) {
                let terug = staart(zonderLosEinde(Array(d.prefix(j))).joined(separator: " "))
                if kern(terug, 2), veilig(kop, terug + "…") { return terug + "…" }
            }
            j -= 1
        }
        return nil
    }

    private static func isCitaat(_ s: String) -> Bool { test(openCitaat, s) && test(sluitCitaat, s) && woorden(s) >= 2 }
    // `metEerste`: ook het eerste woord, als het een afkorting is ("PSV aast op …").
    private static func benoemd(_ s: String, metEerste: Bool = false) -> Bool {
        let w = delen(s)
        let eerste = metEerste && test("^[‘’“'\"„«‚(]?\\p{Lu}[\\p{Lu}\\d]+(?![\\p{L}\\p{N}])", w.first ?? "")
        return test("\\d", s) || w.dropFirst(eerste ? 0 : 1).contains { test("^[‘’“'\"„«‚(]?\\p{Lu}", $0) }
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

    // nil: op deze maat is er geen veilige korte kop (er zou een ontkenning wegvallen).
    static func kort(_ title: String?, max: Int = KortKop.max) -> String? {
        let t = schoon(title ?? "")
        return kort(t, max, t)
    }

    // De korte kop van `t` (de hele kop of een deel), elke uitkomst getoetst tegen de hele `kop` (veilig).
    private static func kort(_ t: String, _ max: Int, _ kop: String) -> String? {
        func goed(_ k: String?) -> String? { if let k, lengte(k) <= max, veilig(kop, k) { return k }; return nil }
        if lengte(t) <= max { return t == kop ? t : goed(t) }

        // De eerste zin, als die zelf een kop is.
        if let z = match("^(.+?(?:[?!]|\\s\\p{Ll}{3,}\\.))\\s+\\S", t), kern(z[1], 4), let k = goed(z[1]) { return k }

        // Dubbele punt, of een citaat vooraan zonder dubbele punt.
        // Zonder dubbele punt telt een citaat vooraan pas vanaf drie woorden ("‘Little Britain’ Star …" is een titel).
        let vooraan = match("^([‘“'\"„«‚][^’”'\"»]+[’”'\"»])\\s(\\p{Lu}.+)$", t).flatMap { woorden($0[1]) >= 3 ? $0 : nil }
        if let p = match("^([^:]+):\\s(.+)$", t) ?? vooraan {
            let a = staart(zonderLosEinde(delen(p[1]), voegwoorden).joined(separator: " "))
            let b = vervang("^\\s+|\\s+$", p[2], "")
            let toevoegingB = woorden(b) <= kortToevoeging || test(openCitaat, b) || b.hasSuffix("?")
            let bKop = kern(b, 4) && !opent(b) && !voornaamwoord.contains(letters(delen(b).first ?? ""))
            let alsB = { bKop && !titleCase(b) ? kort(hoofdletter(b), max, kop) : nil }
            if isCitaat(a) {
                if bKop, let k = kort(hoofdletter(b), max, kop) { return k }
            } else if kern(a, 4), !titelOverPunt(a, b) {
                // Noemt B niets, dan blijft A (ook het eerste woord van A telt, als afkorting); zonder veilige kop op
                // deze maat het andere deel, maar B alleen als B een eigen kop is.
                let wilB = !toevoegingB && bKop && (test("^\\p{Lu}", b) || opent(a) || (!benoemd(a, metEerste: true) && benoemd(b)))
                // B in Title Case: twijfel, de hele kop inkorten.
                if !wilB || !titleCase(b) {
                    if let k = wilB ? alsB() : kort(a, max, kop) { return k }
                    if let k = wilB ? kort(a, max, kop) : (toevoegingB ? nil : alsB()) { return k }
                }
            }
            // Een titel over de dubbele punt: de hele kop inkorten.
        }

        // Toevoeging na een gedachtestreep, of tussen haakjes.
        if let m = match("^(.+?)\\s[–—-]\\s.+$", t) {
            let voor = staart(m[1])
            if kern(voor, 3), let k = goed(voor) { return k }
        }
        if let m = match("^(.+?)\\s*\\(([^()]*)\\)$", t), !heeftOntkenning(m[2]) {
            let voor = staart(m[1])
            if kern(voor, 3), let k = goed(voor) { return k }
        }
        // Haakjes met een ontkenning erin ("Kabinet stemt (niet) in") blijven altijd staan.
        var zonderHaakjes = t
        for m in re("\\s+\\(([^()]*)\\)(?=\\s|$)").matches(in: t, range: NSRange(location: 0, length: lengte(t))).reversed()
        where !heeftOntkenning(ns(t).substring(with: m.range(at: 1))) {
            zonderHaakjes = ns(zonderHaakjes).replacingCharacters(in: m.range, with: "")
        }
        if zonderHaakjes != t, kern(zonderHaakjes, 3), let k = goed(zonderHaakjes) { return k }
        let basis = zonderHaakjes != t && kern(zonderHaakjes, 3) ? zonderHaakjes : t

        // Een bijzin na een komma.
        let r = ns(begin(basis, max - 1)).range(of: ", ", options: .backwards)
        if r.location != NSNotFound, r.location > 0 {
            let voor = staart(zonderLosEinde(delen(begin(basis, r.location))).joined(separator: " "))
            if kern(voor, 4), Double(lengte(voor)) >= Double(max - 1) / 2, !isCitaat(voor), !opent(voor), let k = goed(voor + "…") { return k }
        }

        return afkappen(basis, max, kop)
    }

    // Steeds kortere versies van een kop, voor een plek waar de korte kop van de server niet past: de widget
    // kiest de eerste die past (WidgetZet.pas), zodat iOS nooit midden in een woord afkapt. Een maat zonder
    // veilige kop (er zou een ontkenning wegvallen) wordt overgeslagen; is er geen enkele, dan de kop zelf, en dan
    // krijgt hij in de widget de regels die hij nodig heeft (WidgetZet.pas).
    static func trap(_ kop: String, kort: String?) -> [String] {
        var uit: [String] = []
        // Een korte kop van de server telt alleen als hij veilig is (een oudere server kende de bewaking nog niet).
        let vanServer = kort.flatMap { veilig(kop, $0) ? $0 : nil }
        for k in ([vanServer ?? self.kort(kop)] + [56, 52, 48, 44, 40, 36, 32, 28, 24].map({ self.kort(kop, max: $0) })).compactMap({ $0 })
        where !k.isEmpty && !uit.contains(k) && (uit.last.map { lengte(k) < lengte($0) } ?? true) {
            uit.append(k)
        }
        return uit.isEmpty ? [schoon(kop)] : uit
    }
}
