import Foundation

// Eén typografische hand (T6, D3): een kop zoals de krant hem zet. Spiegel van shared/typeset.mjs;
// de server zet koppen in lijsten al zo, het toestel doet het alleen waar het zelf tekst haalt (de
// kop in de lezer). Getoetst in TypesetTests, met de gedeelde fixture zodra die er is.
//
// - Alleen Nederlands en Engels (geen taal: Nederlands); een andere taal blijft zoals hij is.
// - Nooit in een URL: een link (http…, www.…) blijft letterlijk staan.
// - Idempotent: twee keer zetten is één keer zetten.
//
// De regels, in deze volgorde:
// - dubbele spaties weg (ook aan begin en eind)
// - `...` wordt …
// - een los streepje tussen woorden (` - `) wordt een kastlijntje (` – `)
// - een koppelteken tussen jaartallen (1940-2026, 2025-26) wordt –; een datum (2026-10-31) niet
// - een apostrof binnen een woord (z'n, Trump's) of vooraan ('s, 't, 'n, '90) wordt ’
// - aanhalingstekens ' en " worden ‘ en ’: openend aan het begin of na een spatie of haakje,
//   anders sluitend
// - een vaste spatie tussen getal en eenheid (5 km, 20 °C, 3 kWh)
func typeset(_ s: String, lang: String?) -> String {
    let taal = (lang ?? "nl").lowercased().prefix(2)
    guard taal == "nl" || taal == "en", !s.isEmpty else { return s }
    // Links knippen we eruit en zetten we ongewijzigd terug; alleen de tekst ertussen wordt gezet.
    var out = ""
    var rest = s[...]
    while let link = rest.firstMatch(of: Typeset.link) {
        out += Typeset.text(String(rest[..<link.range.lowerBound]))
        out += rest[link.range]
        rest = rest[link.range.upperBound...]
    }
    out += Typeset.text(String(rest))
    return out.replacing(/\ {2,}/, with: " ").trimmingCharacters(in: .whitespaces)
}

private enum Typeset {
    nonisolated(unsafe) static let link = /(?i)\b(?:https?:\/\/|www\.)[^\s<>"']+/

    static func text(_ input: String) -> String {
        var s = input
        s = s.replacing(/\ {2,}/, with: " ")
        s = s.replacing("...", with: "…")
        s = s.replacing(" - ", with: " – ")
        // Jaartallen: 1940-2026, 2025-26. Geen deel van een langere reeks (een datum of telefoonnummer).
        s = sub(s, #"(?<![\d\-])((?:1[5-9]|20)\d\d)-((?:1[5-9]|20)\d\d|\d\d)(?![\d\-])"#, "$1–$2")
        // Apostrof binnen een woord: z'n, Trump's, rock-'n-roll blijft bij de letters.
        s = s.replacing(/(\p{L})'(\p{L})/) { m in "\(m.output.1)’\(m.output.2)" }
        // Apostrof vooraan: 's, 't, 'n (ook 's-Hertogenbosch) en een jaartal als '90.
        s = sub(s, #"(?<![\p{L}\p{N}])'((?:s|t|n|k)(?!\p{L})|\d\d(?!\d))"#, "’$1")
        // De overige aanhalingstekens: openend na het begin, een spatie of een haakje, anders sluitend.
        var quoted = ""
        var before: Character? = nil
        for c in s {
            if c == "'" || c == "\"" {
                let opens = before.map { $0.isWhitespace || "([{—–-/‘“".contains($0) } ?? true
                quoted.append(opens ? "‘" : "’")
            } else {
                quoted.append(c)
            }
            before = quoted.last
        }
        s = quoted
        // Vaste spatie tussen getal en eenheid.
        s = s.replacing(/(\d) ((?:km\/u|km|cm|mm|m|kg|mg|g|ml|l|kWh|MWh|GWh|kW|MW|GW|°C|°|%)(?![\p{L}\p{N}]))/) { m in "\(m.output.1)\u{00A0}\(m.output.2)" }
        return s
    }

    // Met NSRegularExpression: de regex-literals van Swift kennen nog geen terugkijken (lookbehind).
    private static func sub(_ s: String, _ pattern: String, _ template: String) -> String {
        guard let re = try? NSRegularExpression(pattern: pattern) else { return s }
        return re.stringByReplacingMatches(in: s, range: NSRange(s.startIndex..., in: s), withTemplate: template)
    }
}
