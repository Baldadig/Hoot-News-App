import SwiftUI

// Kiezen zoals in het welkom op de website (src/styles.css → .ob__tile, .ob__chip). Eén grammatica
// voor "gekozen", op web en iOS gelijk (brandboard: de ambacht): in rust een haarlijn `rule` zonder
// vlak, gewicht 600; gekozen rood zacht met een rode rand van 1 pt en een vinkje vooraan, in hetzelfde
// gewicht, zodat het niet alleen aan de kleur hangt en niets verspringt. Zo in de chip, de tegel en het
// ronde vinkje bij de bronnen. Voor VoiceOver telt "geselecteerd".

// Keuzeknoppen die doorlopen naar de volgende regel. Een knop die breder is dan de regel krijgt
// de hele breedte en breekt zijn tekst af (grote tekst).
struct Flow: SwiftUI.Layout {
    var spacing: CGFloat = Space.s2

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal.width ?? .infinity, subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let frames = arrange(bounds.width, subviews).frames
        for (view, frame) in zip(subviews, frames) {
            view.place(at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), proposal: ProposedViewSize(frame.size))
        }
    }

    private func arrange(_ width: CGFloat, _ subviews: Subviews) -> (frames: [CGRect], size: CGSize) {
        var frames: [CGRect] = []
        var x: CGFloat = 0, y: CGFloat = 0, line: CGFloat = 0, widest: CGFloat = 0
        for view in subviews {
            var size = view.sizeThatFits(.unspecified)
            if size.width > width { size = view.sizeThatFits(ProposedViewSize(width: width, height: nil)) }
            if x > 0 && x + size.width > width {
                x = 0
                y += line + spacing
                line = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            x += size.width + spacing
            line = max(line, size.height)
            widest = max(widest, x - spacing)
        }
        return (frames, CGSize(width: widest, height: y + line))
    }
}

// Even indrukken, zoals :active op de website.
struct ChoicePress: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

// Eén onderwerp om aan te tikken (.ob__chip).
struct ChoiceChip: View {
    let label: String
    let on: Bool
    let action: () -> Void
    @Environment(\.accessibilityReduceMotion) private var still

    var body: some View {
        Button {
            withAnimation(still ? nil : .easeOut(duration: 0.14)) { action() } // het vinkje schuift rustig in
        } label: {
            HStack(spacing: Space.s1) {
                if on {
                    Image(systemName: "checkmark")
                        .font(.caption.weight(.heavy))
                        .transition(.opacity)
                        .accessibilityHidden(true)
                }
                Text(label).multilineTextAlignment(.leading)
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(on ? Theme.accent : Theme.ink)
            .padding(.horizontal, Space.s4)
            .padding(.vertical, Space.s2)
            .frame(minHeight: Space.tap)
            .background(on ? Theme.accentSoft : Color.clear, in: Capsule()) // in rust geen vlak: alleen de haarlijn
            .overlay(Capsule().strokeBorder(on ? Theme.accent : Theme.rule, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(ChoicePress())
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// Een interesse als tegel (.ob__tile): icoon boven, naam onder. Het icoon blijft rood (het
// onderwerp, niet de keuze); gekozen krijgt de naam een vinkje ervoor, zoals de chip.
struct ChoiceTile: View {
    let label: String
    let icon: String
    let on: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: Space.s4) {
                Image(systemName: icon)
                    .font(.system(size: 34))
                    .foregroundStyle(Theme.accent)
                    .accessibilityHidden(true)
                Spacer(minLength: 0)
                HStack(alignment: .firstTextBaseline, spacing: Space.s1) {
                    if on {
                        Image(systemName: "checkmark")
                            .font(.caption.weight(.heavy))
                            .transition(.opacity)
                            .accessibilityHidden(true)
                    }
                    Text(label).multilineTextAlignment(.leading)
                }
                .font(.headline.weight(.heavy))
                .foregroundStyle(on ? Theme.accent : Theme.ink)
            }
            .frame(maxWidth: .infinity, minHeight: 112 - Space.s4 * 2, alignment: .leading) // 112 met de rand erbij, zoals op het web
            .padding(Space.s4)
            .background(on ? Theme.accentSoft : Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(on ? Theme.accent : Theme.rule, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: Radius.md))
        }
        .buttonStyle(ChoicePress())
        .animation(.easeOut(duration: 0.14), value: on)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// De onderwerpen van één interesse als keuzeknoppen, op de volgorde van de website.
struct TopicChips: View {
    let rubriek: Rubriek
    let picked: [String]
    let toggle: (String) -> Void

    var body: some View {
        Flow {
            ForEach(rubriek.topics, id: \.self) { t in
                ChoiceChip(label: Taste.label(t), on: picked.contains(t)) { toggle(t) }
            }
        }
    }
}

// De kop boven een groep keuzes (.ob__gtitle): klein, in kapitalen en ink3, eventueel met een
// icoon in accent. Hoofdletters lezen slecht in grote tekst (zoals Kicker): dan gewoon. Boven een
// sectie in Instellingen in inkt (`FormHeader`).
struct GroupTitle: View {
    let text: String
    var icon: String? = nil
    var tone: Color = Theme.ink3
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        HStack(spacing: Space.s2) {
            if let icon { Image(systemName: icon).foregroundStyle(Theme.accent).accessibilityHidden(true) }
            if typeSize.isAccessibilitySize {
                Text(text).font(.caption.weight(.bold))
            } else {
                Text(text.uppercased()).font(.caption.weight(.heavy)).tracking(0.6)
            }
        }
        .foregroundStyle(tone)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
        .accessibilityAddTraits(.isHeader)
    }
}

// Wat precies? Per gekozen interesse een kop (icoon en naam) met zijn onderwerpen (.ob__group).
struct TopicsPicker: View {
    let interests: [String]
    @Binding var picked: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            ForEach(Rubriek.alle.filter { interests.contains($0.id) }) { r in
                VStack(alignment: .leading, spacing: Space.s3) {
                    GroupTitle(text: r.label, icon: r.icon)
                    TopicChips(rubriek: r, picked: picked) { t in
                        picked = picked.contains(t) ? picked.filter { $0 != t } : picked + [t]
                    }
                }
            }
        }
    }
}
