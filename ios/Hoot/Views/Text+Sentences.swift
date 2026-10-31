import Foundation

// De intro van een bericht in hele zinnen, nooit midden in een woord (T2). De knip moet gelijk worden
// aan die van het web; dat is nog af te stemmen met het web (er is nog geen gedeelde fixture), tot dan
// toetst SentencesTests de regels hieronder.
//
// - Zolang de hele tekst past en niet op een beletselteken eindigt: de tekst zelf.
// - Anders zoveel hele zinnen als er binnen `max` passen. Een zin eindigt op . ! of ? (eventueel met
//   een aanhalingsteken of haakje erachter), gevolgd door een spatie en een hoofdletter, cijfer of
//   aanhalingsteken. Een afkorting ("o.a.", "dr.", "bijv.") of een initiaal ("J. Smit") is geen einde.
// - Past er geen hele zin: tot de laatste komma binnen `max`, en anders niets (""). Alleen een komma
//   met een spatie of het einde erachter telt: de decimale komma in "3,5 procent" is geen zinsdeel.
// - Hoot eindigt nooit met een beletselteken.
// Lengtes tellen in UTF-16, zoals `length` in JavaScript, zodat web en app op dezelfde plek knippen.
func wholeSentences(_ text: String, max: Int = 240) -> String {
    let clean = text.replacing(/\s+/, with: " ").trimmingCharacters(in: .whitespaces)
    let cut = clean.hasSuffix("…") || clean.hasSuffix("...")
    if !cut && clean.utf16.count <= max { return clean }

    var out = ""
    var start = clean.startIndex
    for end in Sentences.ends(in: clean) {
        let next = String(clean[start ..< end]).trimmingCharacters(in: .whitespaces)
        let joined = out.isEmpty ? next : out + " " + next
        if joined.utf16.count > max { break }
        out = joined
        start = end
    }
    if !out.isEmpty { return out }

    // Geen hele zin die past: tot de laatste komma binnen de maat, zonder de komma zelf. Een komma
    // tussen twee cijfers ("3,5", "2,4 miljard") telt niet: daar knippen maakt van 3,5 procent 3.
    let commas = clean.matches(of: /,(?=\s|$)/).map(\.range.lowerBound)
    if let comma = commas.last(where: { clean.utf16.distance(from: clean.startIndex, to: $0) < max }) {
        let part = clean[..<comma].trimmingCharacters(in: .whitespaces)
        if !part.isEmpty && !part.hasSuffix("…") && !part.hasSuffix("...") { return part }
    }
    return ""
}

// Hoeveel tekens een intro mag hebben bij de regelinstelling (Instellingen › Intro): 1 regel ≈ 60,
// 2 ≈ 130, 3 ≈ 200, 0 = de hele intro. Naast een miniatuur is de kolom smaller: 20 procent minder.
func introMax(lines: Int, thumb: Bool) -> Int {
    let base: Int
    switch lines {
    case 0: return Int.max
    case 1: base = 60
    case 2: base = 130
    default: base = 200
    }
    return thumb ? base * 8 / 10 : base
}

enum Sentences {
    // Woorden met een punt die geen zin beëindigen (kleine letters, zonder de laatste punt).
    // Nog af te stemmen met het web.
    static let abbreviations: Set<String> = [
        "dr", "drs", "ir", "ing", "mr", "mrs", "ms", "mevr", "dhr", "prof", "st", "jr", "sr",
        "bijv", "bv", "ca", "nr", "jl", "vs", "etc", "resp", "evt", "incl", "excl", "mln", "mld", "mrd",
        "o.a", "m.n", "d.w.z", "e.d", "a.s", "i.p.v", "t.o.v", "m.b.t", "n.a.v", "z.g", "e.g", "i.e", "u.s", "u.k",
    ]

    // De plekken (direct na het leesteken en een eventueel aanhalingsteken of haakje) waar een zin eindigt.
    static func ends(in text: String) -> [String.Index] {
        var out: [String.Index] = []
        for match in text.matches(of: /[.!?]["”’)]?(?=\s+["“‘(]?[\p{Lu}\d]|$)/) {
            if text[match.range].first == "." {
                let before = text[..<match.range.lowerBound]
                // Een beletselteken van drie punten is geen einde, en een afkorting ook niet.
                if before.hasSuffix(".") || isAbbreviation(before) { continue }
            }
            out.append(match.range.upperBound)
        }
        return out
    }

    // Het woord vóór de punt: een afkorting uit de lijst, of één letter (een initiaal).
    private static func isAbbreviation(_ before: Substring) -> Bool {
        let word = before.split(separator: " ").last.map { $0.trimmingCharacters(in: CharacterSet(charactersIn: "(\"“‘")) } ?? ""
        if word.count == 1, word.first?.isLetter == true { return true }
        return abbreviations.contains(word.lowercased())
    }
}
