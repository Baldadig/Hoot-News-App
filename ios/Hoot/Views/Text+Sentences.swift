import Foundation

// De intro van een bericht in hele zinnen, nooit midden in een woord (T2, D2). Een letterlijke spiegel van
// wholeSentences in shared/zinnen.mjs; SentencesTests draait dezelfde gevallen uit tests/fixtures/zinnen.json
// als het web. Verander je hier iets, dan daar ook.
//
// - Past de hele tekst (en eindigt hij niet op een beletselteken): de tekst zelf.
// - Anders zoveel hele zinnen als er binnen `max` passen. Past er geen, dan de eerste zin als die binnen
//   `rek` blijft (een regel meer). Anders een stuk tot een komma dat zelf iets zegt, anders "".
// - Een afgekapt slot ("…", "...", "[…]") gaat eraf met het halve stuk ervoor. Hoot eindigt nooit met een
//   beletselteken.
// Lengtes tellen in UTF-16, zoals `length` in JavaScript, zodat web en app op dezelfde plek knippen.
// `Int.max` is "alles" (Infinity op het web); zonder `rek` is rek gelijk aan max.
func wholeSentences(_ text: String, max: Int = 240, rek: Int? = nil) -> String {
    let rek = rek ?? max
    var s = EditionDisplay.cleanIntro(text) as NSString
    if s.length == 0 { return "" }
    var cut = false
    if let m = Sentences.trailingEllipsis.firstMatch(in: s as String, range: NSRange(location: 0, length: s.length)) {
        s = (s.substring(to: m.range.location) as NSString).trimmingCharacters(in: .whitespacesAndNewlines) as NSString
        cut = true
    }
    let ends = Sentences.ends(in: s)
    // Het halve stuk na de laatste hele zin is weg; zonder hele zin blijft het over voor de komma.
    let whole: String = cut ? (ends.last.map { s.substring(to: $0) } ?? "") : s as String
    let wholeLength = (whole as NSString).length
    if wholeLength > 0 && wholeLength <= max { return whole }
    if let fit = ends.last(where: { $0 <= max }) { return s.substring(to: fit) }
    if let first = ends.first, first <= rek { return s.substring(to: first) }
    return Sentences.commaPiece(s, max: max)
}

// Hoeveel tekens er op `lines` regels passen, in een kolom van `width` pt met een intro van `font` pt
// (lineFit in shared/zinnen.mjs): een teken is gemiddeld hooguit 0,58 × de lettermaat breed, en de eerste
// regel verliest ± 6 tekens aan het afbreken op woorden.
func lineFit(lines: Int, width: Double, font: Double) -> Int {
    Swift.max(0, Int(((width / (font * 0.58)) * Double(lines)).rounded(.down)) - 6)
}

// De maat van een intro bij een regelinstelling (1 tot 4, 0 = alles) in een kolom (introMax in
// shared/zinnen.mjs): max voor de hele zinnen, rek voor één eerste zin die een regel doorloopt.
func introMax(lines: Int, width: Double, font: Double) -> (max: Int, rek: Int) {
    if lines == 0 { return (Int.max, Int.max) }
    let n = (1 ... 4).contains(lines) ? lines : 2
    return (lineFit(lines: n, width: width, font: font), lineFit(lines: n + 1, width: width, font: font))
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
    // Einde van een zin (SENTENCE_END in shared/zinnen.mjs): . ! of ?, eventueel met een sluitende
    // aanhaling of haakje, en dan witruimte of het eind. Niet na een losse hoofdletter (een initiaal:
    // "Jan G. uit") en niet na een afkorting; wel na een letterwoord ("tegen NEC.").
    static let sentenceEnd = try! NSRegularExpression(pattern: #"(?<!\b[A-Z])(?<!\b(?:Mr|Mrs|Ms|Dr|St|vs|dr|mr|drs|prof|bijv|ca|nr|o\.a|d\.w\.z))[.!?]["'’”)]?(?=\s|$)"#)
    // Een beletselteken aan het eind van de bron (ook "..." en "[…]"): daar is de feed afgekapt.
    static let trailingEllipsis = try! NSRegularExpression(pattern: #"\s*[\[(]?(?:…|\.{3,})[\])]?$"#)
    // Een bijzin die op zijn hoofdzin wacht is geen intro ("Nu alle stemmen zijn geteld").
    static let bijzin = try! NSRegularExpression(pattern: #"^(?:als|nu|toen|terwijl|omdat|doordat|hoewel|nadat|voordat|sinds|zodra|wanneer|indien|zodat|tenzij|ook al|with|after|before|from|whether|when|while|although|though|as|since|if|because|once|despite|amid|ahead|even|unlike|like|to)\b"#, options: [.caseInsensitive])
    static let minPiece = 30

    // Witruimte wordt één spatie, zonder witruimte aan de randen (zoals JS \s+ en trim()).
    static func squeeze(_ text: String) -> String {
        let re = try! NSRegularExpression(pattern: #"\s+"#)
        let ns = text as NSString
        return re.stringByReplacingMatches(in: text, range: NSRange(location: 0, length: ns.length), withTemplate: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // Waar de zinnen eindigen (UTF-16-index ná het teken). "..." telt niet: de laatste punt van drie is een beletselteken.
    static func ends(in s: NSString) -> [Int] {
        sentenceEnd.matches(in: s as String, range: NSRange(location: 0, length: s.length)).compactMap { m in
            let i = m.range.location
            if s.character(at: i) == 0x2E, i > 0, s.character(at: i - 1) == 0x2E { return nil }
            return i + m.range.length
        }
    }

    private static func isDigit(_ s: NSString, _ i: Int) -> Bool {
        guard i >= 0, i < s.length else { return false }
        let c = s.character(at: i)
        return c >= 0x30 && c <= 0x39
    }

    private static func count(_ s: String, _ chars: Set<Character>) -> Int { s.filter { chars.contains($0) }.count }

    // Een stuk tot een komma dat zelf iets zegt (commaPiece in shared/zinnen.mjs): niet te kort (minstens
    // twee derde van max en 30 tekens), niet midden in een getal, geen open aanhaling en geen bijzin.
    static func commaPiece(_ s: NSString, max: Int) -> String {
        let head = s.substring(to: Swift.min(max, s.length)) as NSString
        var i = head.range(of: ",", options: .backwards).location
        let minimum = max == Int.max ? Double(minPiece) : Swift.max(2.0 * Double(max) / 3.0, Double(minPiece))
        while i != NSNotFound && i > 0 {
            defer { i = i - 1 >= 0 ? s.range(of: ",", options: .backwards, range: NSRange(location: 0, length: i)).location : NSNotFound }
            if isDigit(s, i - 1) && isDigit(s, i + 1) { continue } // komma in een getal
            let piece = s.substring(to: i).trimmingCharacters(in: .whitespacesAndNewlines)
            if Double((piece as NSString).length) < minimum { return "" }
            let open = count(piece, ["„", "“", "‘", "\""]) - count(piece, ["”", "’", "\""])
            let isBijzin = bijzin.firstMatch(in: piece, range: NSRange(location: 0, length: (piece as NSString).length)) != nil
            if isBijzin || open > 0 { return "" }
            return piece
        }
        return ""
    }
}
