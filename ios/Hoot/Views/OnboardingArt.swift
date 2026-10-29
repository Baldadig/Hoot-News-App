import SwiftUI

// De kleine animaties van het welkom: de punt van "hoot." als zon boven één horizonlijn. Rustig,
// klein in het midden, en hij ademt. Editie: de zon komt op. Stroom en Selectie: een ademende halo,
// met eronder wat voorbij stroomt of de ringen van je week. Met "Verminder beweging" staat alles stil.
struct OnboardingArt: View {
    enum Kind { case intro, editie, stroom, digest }
    let kind: Kind
    var active = true // alleen de pagina in beeld beweegt; de rest staat stil (batterij)
    @Environment(\.accessibilityReduceMotion) private var still

    static let size = CGSize(width: 168, height: 140)

    var body: some View {
        // Elk beeld van het scherm (60 of 120 Hz), zodat het nergens hapert.
        TimelineView(.animation(paused: still || !active)) { timeline in
            let t = still ? 1.6 : timeline.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in draw(ctx, size, t) }
        }
        .frame(width: Self.size.width, height: Self.size.height)
        .accessibilityHidden(true)
    }

    // Maten uit het ontwerp (eenheden van 1,25 pt), gemeten vanaf het midden van de horizon.
    private let k: CGFloat = 1.25

    private func draw(_ ctx: GraphicsContext, _ size: CGSize, _ t: TimeInterval) {
        let cx = size.width / 2
        let horizon = size.height * 0.72
        let half = 56 * k
        let line = Path { $0.move(to: CGPoint(x: cx - half, y: horizon)); $0.addLine(to: CGPoint(x: cx + half, y: horizon)) }
        let breathe = 0.975 + 0.075 * sin(t / 5.5 * 2 * .pi) // in en uit, 5,5 s per adem
        // Alles van de zon blijft boven de horizon, ook de ringen: een zonsopkomst, geen schietschijf.
        var sky = ctx
        sky.clip(to: Path(CGRect(x: 0, y: 0, width: size.width, height: horizon)))

        switch kind {
        case .intro:
            break // zie IntroMark

        case .editie:
            // Opkomen in 6 s, dan weer zakken: een zachte heen-en-weer, nooit een sprong.
            let p = ease(triangle(t / 6))
            let r = 22 * k * breathe
            let cy = horizon - 10 * k + (1 - p) * 30 * k
            sky.fill(circle(cx, cy, r), with: .color(Theme.accent))
            ctx.stroke(line, with: .color(Theme.ink), lineWidth: 1.5)

        case .stroom:
            let cy = horizon - 24 * k
            halo(sky, cx, cy, t)
            ctx.fill(circle(cx, cy, 12 * k), with: .color(Theme.accent))
            ctx.stroke(line, with: .color(Theme.ink.opacity(0.6)), lineWidth: 1.5)
            // Wat voorbij stroomt: twee rijen streepjes die rustig naar links schuiven.
            var water = ctx
            water.clip(to: Path(CGRect(x: cx - half, y: horizon + 4, width: half * 2, height: 28 * k)))
            // Doorlopend, zonder terugsprong: de verschuiving loopt rond over een hele patroonlengte.
            let shift = (t / 5 * 36 * k).truncatingRemainder(dividingBy: 140 * k)
            dashes(water, from: cx - half - shift, y: horizon + 11 * k, opacity: 0.3, pattern: [(0, 20), (28, 28), (64, 16), (88, 24), (120, 20)])
            dashes(water, from: cx - half + 10 * k - shift, y: horizon + 20 * k, opacity: 0.18, pattern: [(0, 14), (26, 22), (60, 12), (84, 18), (120, 16)])

        case .digest:
            let cy = horizon - 22 * k
            sky.stroke(circle(cx, cy, 30 * k), with: .color(Theme.accent.opacity(0.12)), lineWidth: 1)
            sky.stroke(circle(cx, cy, 22 * k), with: .color(Theme.accent.opacity(0.25)), lineWidth: 1)
            halo(sky, cx, cy, t)
            ctx.fill(circle(cx, cy, 12 * k * breathe), with: .color(Theme.accent))
            ctx.stroke(line, with: .color(Theme.ink), lineWidth: 1.5)
        }
    }

    // Een dunne ring om de zon die mee ademt: groter en vager, kleiner en duidelijker.
    private func halo(_ ctx: GraphicsContext, _ cx: CGFloat, _ cy: CGFloat, _ t: TimeInterval) {
        let p = (1 - cos(t / 5.5 * 2 * .pi)) / 2
        let r = (20 + 7 * p) * k
        ctx.stroke(circle(cx, cy, r), with: .color(Theme.accent.opacity(0.35 - 0.27 * p)), lineWidth: 1)
    }

    private func dashes(_ ctx: GraphicsContext, from x0: CGFloat, y: CGFloat, opacity: Double, pattern: [(CGFloat, CGFloat)]) {
        let period: CGFloat = 140 * k
        var path = Path()
        for rep in 0 ..< 4 {
            for (start, length) in pattern {
                let x = x0 + CGFloat(rep) * period + start * k
                path.move(to: CGPoint(x: x, y: y))
                path.addLine(to: CGPoint(x: x + length * k, y: y))
            }
        }
        ctx.stroke(path, with: .color(Theme.ink.opacity(opacity)), style: StrokeStyle(lineWidth: 2, lineCap: .round))
    }

    private func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat) -> Path {
        Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
    }
    // 0 → 1 → 0 over twee perioden; daarmee gaat de zon op en weer onder.
    private func triangle(_ x: Double) -> Double {
        let f = x.truncatingRemainder(dividingBy: 2)
        return f < 1 ? f : 2 - f
    }
    private func ease(_ x: Double) -> Double { x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2 }
}

// "hoot." groot, met de ademende punt: de eerste pagina van het welkom en het inlogscherm. Het
// meldt waar het woord en de punt staan (`BrandHandoff`), zodat het opstartscherm er precies naartoe
// kan bewegen: het rood krimpt tot deze punt, het woordmerk schuift naar dit woord.
struct IntroMark: View {
    @Environment(\.brandHandoff) private var handoff
    @Environment(\.accessibilityReduceMotion) private var still

    var body: some View {
        // Ademen pas als het rood geland is: anders is de punt net kleiner of groter dan waar het rood
        // op uitkomt, en verspringt hij als het opstartscherm weggaat.
        let breathing = !still && handoff?.landed != false
        HStack(alignment: .lastTextBaseline, spacing: 3) {
            Text("hoot")
                .font(.system(size: 58, weight: .heavy, design: .serif))
                .foregroundStyle(Theme.ink)
                .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { handoff?.word = $0 }
            Circle()
                .fill(Theme.accent)
                .frame(width: 15, height: 15)
                .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { handoff?.dot = $0 }
                .phaseAnimator(breathing ? [1.0, 1.06, 0.92] : [1.0]) { dot, s in dot.scaleEffect(s) } animation: { _ in .easeInOut(duration: 2.75) }
                .id(breathing) // begint op ware grootte, precies waar het rood eindigde
        }
        .fixedSize()
        .dynamicTypeSize(.large) // het merk heeft één maat
        .accessibilityElement()
        .accessibilityLabel("Hoot")
    }
}

// Waar "hoot." in het welkom staat (in schermcoördinaten), voor de overgang vanaf het opstartscherm.
@MainActor
@Observable
final class BrandHandoff {
    var word: CGRect?
    var dot: CGRect?
    var leaving = false // het opstartscherm beweegt erheen: het rood krimpt tot de punt
    var landed = false // het opstartscherm is weg; de punt mag ademen
    var duration = 0.7 // hoe lang die overgang duurt
}
private struct BrandHandoffKey: EnvironmentKey { static let defaultValue: BrandHandoff? = nil }
extension EnvironmentValues {
    var brandHandoff: BrandHandoff? {
        get { self[BrandHandoffKey.self] }
        set { self[BrandHandoffKey.self] = newValue }
    }
}
