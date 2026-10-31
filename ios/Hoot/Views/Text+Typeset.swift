import Foundation

// Eén typografische hand (T6, D3): een kop zoals de krant hem zet. Een letterlijke spiegel van
// shared/typeset.mjs; de server zet koppen in lijsten al zo, het toestel doet het alleen waar het zelf
// tekst haalt (de kop in de lezer). TypesetTests draait dezelfde gevallen uit tests/fixtures/typeset.json
// als het web. Verander je hier iets, dan daar ook.
//
// - Alleen Nederlands en Engels; elke andere taal (en geen taal) blijft letterlijk, zoals op het web.
// - Nooit binnen een URL: een woord met :// of www. erin gaat er eerst uit en komt ongewijzigd terug.
// - Gekrulde apostrof, aanhalen met enkele gekrulde ‘ ’ (binnen "…" met al een ‘…’ blijft de buitenste
//   dubbel), kastlijntje in een jaartalbereik en als gedachtestreepje, beletselteken, geen dubbele
//   spaties, een vaste spatie tussen getal en eenheid.
// - Idempotent: twee keer zetten is één keer zetten.
func typeset(_ s: String, lang: String?) -> String {
    guard !s.isEmpty, let lang, lang == "nl" || lang == "en" else { return s }
    var urls: [String] = []
    var t = Typeset.replace(s, Typeset.urlToken) { m, ns in
        let u = ns.substring(with: m.range)
        guard urls.count < 0xEFF else { return u }
        urls.append(u)
        return Typeset.holder(urls.count - 1)
    }

    t = Typeset.sub(t, #"[ \t]{2,}"#, " ")
    t = Typeset.sub(t, #"\.\.\."#, "…")
    // Apostrof binnen een woord (d'r, intro's, it's) en aan het begin van een weglating.
    t = Typeset.sub(t, #"(\p{L})'(?=\p{L})"#, "$1’")
    t = Typeset.sub(t, #"(^|[\s(])'(?=(?:s|t|n|k|m|r|em|er)(?![\p{L}\p{N}])|\d{2}(?!\d))"#, "$1’")
    // Aanhalen, van binnen naar buiten, tot er niets meer te paren valt.
    for _ in 0 ..< 4 {
        let before = t
        t = Typeset.singlePair.stringByReplacingMatches(in: t, range: NSRange(location: 0, length: (t as NSString).length), withTemplate: "$1‘$2’")
        t = Typeset.replace(t, Typeset.doublePair) { m, ns in
            let pre = ns.substring(with: m.range(at: 1)), body = ns.substring(with: m.range(at: 2))
            return body.contains("‘") ? "\(pre)“\(body)”" : "\(pre)‘\(body)’"
        }
        if t == before { break }
    }
    // Wat overblijft na een meervouds-s is een bezitsapostrof (the players' union).
    t = Typeset.sub(t, #"(\p{L}[sS])'(?=[\s,.;:!?]|$)"#, "$1’")
    t = Typeset.sub(t, #"(?<![\d-])((?:1\d{3}|20\d{2}))-((?:1\d{3}|20\d{2}))(?![\d-])"#, "$1–$2")
    t = Typeset.sub(t, #"(?<= )-(?= )"#, "–")
    t = Typeset.sub(t, #"(\d) (%|km|kg|°C|°|euro|€|uur|min)(?![\p{L}\p{N}])"#, "$1\u{00A0}$2")
    t = Typeset.sub(t, #"€ (?=\d)"#, "€\u{00A0}")

    guard !urls.isEmpty else { return t }
    return Typeset.replace(t, Typeset.held) { m, ns in
        let c = Int(ns.character(at: m.range(at: 1).location)) - 0xE100
        return urls.indices.contains(c) ? urls[c] : ns.substring(with: m.range)
    }
}

enum Typeset {
    static let urlToken = try! NSRegularExpression(pattern: #"\S*(?:://|www\.)\S*"#, options: [.caseInsensitive])
    // Plaatshouder zonder cijfers of letters (U+E000 plus U+E100 + i), zodat geen regel erop aanslaat.
    static func holder(_ i: Int) -> String { "\u{E000}" + String(UnicodeScalar(UInt32(0xE100 + i))!) }
    static let held = try! NSRegularExpression(pattern: "\u{E000}([\u{E100}-\u{EFFF}])")

    // Een paar aanhalingstekens (pairOf in shared/typeset.mjs).
    static func pair(_ q: String) -> NSRegularExpression {
        try! NSRegularExpression(pattern: #"(^|[\s(\[—–"“‘])"# + q + #"(?=[^\s"# + q + #"])([^"# + q + #"]*?[^\s"# + q + #"])"# + q + #"(?=$|[\s.,;:!?)\]—–"”’-])"#)
    }
    static let singlePair = pair("'")
    static let doublePair = pair("\"")

    static func sub(_ s: String, _ pattern: String, _ template: String) -> String {
        let re = try! NSRegularExpression(pattern: pattern)
        return re.stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: template)
    }

    // Vervangen met een functie, zoals String.replace(re, fn) in JavaScript.
    static func replace(_ s: String, _ re: NSRegularExpression, _ fn: (NSTextCheckingResult, NSString) -> String) -> String {
        let ns = s as NSString
        var out = ""
        var last = 0
        for m in re.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
            out += fn(m, ns)
            last = m.range.location + m.range.length
        }
        return out + ns.substring(from: last)
    }
}
