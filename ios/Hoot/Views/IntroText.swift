import SwiftUI
import UIKit

// Een intro die nooit wordt afgekapt (huisregel: hele zinnen, nooit een beletselteken). wholeSentences
// kiest de zinnen op een schatting in tekens; die klopt niet altijd (lange woorden, grote tekst, smalle
// kolom). Een .lineLimit zou dan midden in een zin knippen en "…" tonen. Hier meet SwiftUI wat er in de
// echte breedte, met de echte letter en Dynamische tekst, binnen `lines` regels past: eerst de hele intro,
// dan steeds één zin minder, en past er geen enkele hele zin, dan geen intro.
struct IntroText: View {
    let text: String // de intro in hele zinnen (uit wholeSentences)
    let style: Font.TextStyle
    var lines: Int? // nil: geen grens
    var suffix: (String) -> String = { $0 } // bijvoorbeeld " · via X" achter elke kandidaat
    // Past er van `text` geen hele zin, dan deze (de reserve-intro uit hetzelfde verhaal, met zijn eigen " · via X"),
    // zoals op het web (kaartkwaliteit): liever de reserve dan een leeg vlak, liever niets dan een afgeknipte zin.
    var fallback: (text: String, suffix: (String) -> String)? = nil
    var color: Color = Theme.ink2
    var size: CGFloat? = nil // een eigen maat en regelhoogte (kaart A+: 18/28, hoofdverhaal 20/30)
    var line: CGFloat? = nil
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        if let lines {
            // Breekt een lang woord bij de toegankelijkheidsmaten op zijn lettergrepen (Afbreken), dan kost dat
            // hooguit een regel extra: die krijgt de intro erbij, in plaats van een zin te laten vallen.
            let afgebroken = typeSize.isAccessibilitySize && Afbreken.woorden(text) != text
            CapHeight(limit: Self.limit(lines: lines + (afgebroken ? 1 : 0), style: style, typeSize: typeSize, size: size, line: line)) {
                ViewThatFits(in: .vertical) {
                    ForEach(Array(shown.enumerated()), id: \.offset) { _, candidate in
                        line(candidate)
                    }
                    Color.clear.frame(height: 0) // geen enkele hele zin past: geen intro
                }
            }
        } else {
            line(suffix(text))
        }
    }

    // Alle kandidaten, al met hun " · via X": eerst de eigen intro, dan de reserve.
    private var shown: [String] {
        Self.candidates(text).map(suffix) + (fallback.map { f in Self.candidates(f.text).map(f.suffix) } ?? [])
    }

    private func line(_ s: String) -> some View {
        Text(afgebroken: s, typeSize: typeSize).leestekst(style, size: size, line: line).foregroundStyle(color).fixedSize(horizontal: false, vertical: true)
    }

    // De hele intro, en dan steeds één hele zin minder (de kortste is de eerste zin).
    static func candidates(_ text: String) -> [String] {
        let s = text as NSString
        var out = [text]
        for end in Sentences.ends(in: s).reversed() {
            let piece = s.substring(to: end).trimmingCharacters(in: .whitespacesAndNewlines)
            if !piece.isEmpty, piece != out.last { out.append(piece) }
        }
        return out
    }

    // Zoveel punten hoog zijn `lines` regels in deze letter bij deze tekstgrootte, met een halve regel speling.
    static func limit(lines: Int, style: Font.TextStyle, typeSize: DynamicTypeSize, size own: CGFloat? = nil, line ownLine: CGFloat? = nil) -> CGFloat {
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
        // Newsreader (leestekst): de letter staat op 1,193 van de maat, de rest is lineSpacing (Letters.leesSpacing).
        let size = UIFontMetrics(forTextStyle: style.uiKit).scaledValue(for: own.map(Letters.maat) ?? Letters.size(style), compatibleWith: traits)
        let line = size * 1.193 + Letters.leesSpacing(style, typeSize: typeSize, size: own, line: ownLine)
        return line * (CGFloat(lines) + 0.5)
    }
}

// Biedt het kind precies `limit` punten hoogte aan (zodat ViewThatFits weet wat past), maar neemt zelf
// alleen de hoogte die het gekozen kind nodig heeft.
private struct CapHeight: SwiftUI.Layout { // SwiftUI.Layout: Hoot heeft zelf een enum Layout
    let limit: CGFloat
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        guard let child = subviews.first else { return .zero }
        let size = child.sizeThatFits(ProposedViewSize(width: proposal.width, height: limit))
        return CGSize(width: proposal.width ?? size.width, height: min(size.height, limit))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(width: bounds.width, height: limit))
    }
}
