import Foundation

// Begrippen uit het nieuws, kort uitgelegd: dezelfde lijst als het web (shared/glossary.json; build:core houdt de
// kopie in Resources bytegelijk). termsIn vindt precies wat src/lib/glossary.js vindt, met dezelfde grens per
// bericht; de gedeelde voorbeeldkoppen in tests/fixtures/glossary-cases.json houden dat zo (GlossaryTests).
struct Begrip: Decodable, Identifiable, Hashable, Sendable {
    let term: String
    let pattern: String // een JavaScript-RegExp, zoals het web hem gebruikt
    let flags: String
    let text: String
    let source: String // Wikipedia, om verder te lezen
    var id: String { term }
    var wikipedia: URL? { URL(string: source) }
}

enum Glossary {
    private struct File: Decodable { let terms: [Begrip] }
    static var resourceURL: URL? { Bundle.main.url(forResource: "glossary", withExtension: "json") }
    static let all: [Begrip] = load(resourceURL)

    static func load(_ url: URL?) -> [Begrip] {
        guard let url, let data = try? Data(contentsOf: url), let file = try? JSONDecoder().decode(File.self, from: data) else { return [] }
        return file.terms
    }

    private static let compiled: [(Begrip, NSRegularExpression)] = all.compactMap { b in
        (try? NSRegularExpression(pattern: native(b.pattern), options: b.flags.contains("i") ? [.caseInsensitive] : [])).map { (b, $0) }
    }

    // De begrippen die in een tekst voorkomen, in volgorde van de lijst; hooguit `max` (zoals termsIn op het web).
    static func termsIn(_ text: String, max: Int = 2) -> [Begrip] {
        var found: [Begrip] = []
        let range = NSRange(location: 0, length: (text as NSString).length)
        for (b, re) in compiled {
            if found.count >= max { break }
            if re.firstMatch(in: text, range: range) != nil { found.append(b) }
        }
        return found
    }

    // De tekst van een bericht zoals het web hem doorzoekt: kop en intro.
    static func text(of item: Item) -> String { "\(item.title) \(item.summary ?? "")" }

    // Een JavaScript-patroon in de taal van NSRegularExpression. In JavaScript (zonder u-vlag) zijn \b en \w
    // alleen ASCII: een é telt niet als letter. ICU telt die wel mee, dus "caféNAVO" zou in de app geen NAVO
    // geven en op het web wel. Daarom hier \b en \w uitgeschreven in ASCII, en zonder hoofdletterongevoeligheid
    // (de Kelvin-K is in ICU anders een k).
    private static let word = "[A-Za-z0-9_]"
    static func native(_ js: String) -> String {
        var out = ""
        var inClass = false
        var chars = Array(js)[...]
        while let c = chars.popFirst() {
            if c == "\\", let next = chars.popFirst() {
                switch (next, inClass) {
                case ("b", false): out += "(?-i:(?<=\(word))(?!\(word))|(?<!\(word))(?=\(word)))"
                case ("B", false): out += "(?-i:(?<=\(word))(?=\(word))|(?<!\(word))(?!\(word)))"
                case ("w", false): out += "(?-i:\(word))"
                case ("W", false): out += "(?-i:[^A-Za-z0-9_])"
                case ("w", true): out += "A-Za-z0-9_"
                default: out += "\\\(next)"
                }
                continue
            }
            if c == "[" { inClass = true } else if c == "]" { inClass = false }
            out.append(c)
        }
        return out
    }
}
