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
    var suffix: (String) -> String = { $0 } // bijvoorbeeld " — via X" achter elke kandidaat
    var color: Color = Theme.ink2
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        if let lines {
            CapHeight(limit: Self.limit(lines: lines, style: style, typeSize: typeSize)) {
                ViewThatFits(in: .vertical) {
                    ForEach(Array(Self.candidates(text).enumerated()), id: \.offset) { _, candidate in
                        line(candidate)
                    }
                    Color.clear.frame(height: 0) // geen enkele hele zin past: geen intro
                }
            }
        } else {
            line(text)
        }
    }

    private func line(_ s: String) -> some View {
        Text(suffix(s)).font(.system(style)).foregroundStyle(color).fixedSize(horizontal: false, vertical: true)
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
    static func limit(lines: Int, style: Font.TextStyle, typeSize: DynamicTypeSize) -> CGFloat {
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(typeSize))
        let line = UIFont.preferredFont(forTextStyle: style.uiKit, compatibleWith: traits).lineHeight
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

extension Font.TextStyle {
    var uiKit: UIFont.TextStyle {
        switch self {
        case .largeTitle: .largeTitle
        case .title: .title1
        case .title2: .title2
        case .title3: .title3
        case .headline: .headline
        case .subheadline: .subheadline
        case .callout: .callout
        case .footnote: .footnote
        case .caption: .caption1
        case .caption2: .caption2
        default: .body
        }
    }
}
