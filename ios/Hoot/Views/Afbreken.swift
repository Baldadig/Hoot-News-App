import SwiftUI

// Woorden breken nooit midden in een woord zonder streepje (1.1.1, CONTROLE-48 P2-2 en P3-1).
//
// SwiftUI breekt een woord dat breder is dan de regel op een willekeurige letter ("Rijkswaterstaa / t",
// "Abonnement / en"). Bij de toegankelijkheidsmaten (AX1–AX5) zetten we daarom in lange woorden zachte
// afbreekstreepjes (U+00AD) op de Nederlandse lettergrepen (KopZet.hyphenate, CFStringGetHyphenation…
// met de taal nl); iOS breekt daar dan met een streepje ("Abonne- / menten"), en toont niets als het
// woord past. Onder AX1 passen deze woorden altijd, en blijft de tekst zoals hij is.
// Alleen woorden van minstens `lang` letters: een kort woord past altijd op een regel, en zo breekt een
// gewone zin niet vaker af dan nodig. De koppen (Kop.swift) doen dit al, met meten; dit is de lichte
// vorm voor lopende tekst en de rijen van Instellingen.
enum Afbreken {
    static let lang = 11
    static let nl = Locale(identifier: "nl")

    // Samenstellingen die op de naad breken, niet op elke lettergreep: "morgen-/ochtend", niet "mor-/genochtend"
    // (de eindkaart van de Editie, EINDKEURING punt 10).
    static let naden = ["morgenochtend": "morgen\u{00AD}ochtend"]

    static func tekst(_ s: String, typeSize: DynamicTypeSize) -> String {
        typeSize.isAccessibilitySize ? woorden(s) : s
    }

    static func woorden(_ s: String, locale: Locale = nl) -> String {
        guard s.count >= lang else { return s }
        return s.split(separator: " ", omittingEmptySubsequences: false).map { token -> String in
            let word = String(token)
            if let naad = naden[word] { return naad }
            guard word.count >= lang, !word.contains(KopZet.shy), !word.contains("/"), !word.contains("@") else { return word }
            return KopZet.hyphenate(word, locale: locale)
        }.joined(separator: " ")
    }
}

extension Text {
    // Een tekst die bij de toegankelijkheidsmaten op de lettergrepen afbreekt (Afbreken). VoiceOver leest
    // het woord zonder streepjes.
    init(afgebroken s: String, typeSize: DynamicTypeSize) {
        self.init(verbatim: Afbreken.tekst(s, typeSize: typeSize))
    }
}
