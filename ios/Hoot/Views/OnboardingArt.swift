import SwiftUI

// De punt van "hoot." als zon boven één horizonlijn: het welkom (onboarding-plan, ‘De zon, precies
// volgens de spec’; op het web SunArt.jsx). Kader 168 × 140, eenheid k = 1,25, horizon op 72 %, lijn
// 140 breed en 1,5 dik; alles onder de horizon is geknipt. Vier varianten:
//   intro    de zon in papier op de rode intro: komt één keer op (6 s), dan adem
//   editie   de grote zon gaat op en onder, 6 s op en 6 s onder, en ademt
//   stroom   een kleine zon met halo boven stromend water, 9 pt/s
//   selectie een kleine zon die ademt tussen twee ringen
// De tekeningen lopen op één klok (de tijd van het toestel): een pagina komt binnen midden in zijn
// lus. Alleen de pagina in beeld beweegt (`active`). Met "Verminder beweging" een stilbeeld: de
// intro staat op, de Editie op t = 4 (genoeg zon), de rest op t = 1,6.
struct OnboardingArt: View {
    enum Kind { case intro, editie, stroom, selectie }
    let kind: Kind
    var onRed = false // op merkrood is alles papier
    var active = true
    var scale: CGFloat = 1 // kleiner op een lage iPhone
    @Environment(\.accessibilityReduceMotion) private var still
    var since: Date? = nil // intro: sinds wanneer hij opkomt; zonder staat hij nog achter de horizon

    static let size = CGSize(width: 168, height: 140)

    var body: some View {
        TimelineView(.animation(paused: still || !active)) { timeline in
            let now = timeline.date
            Canvas { ctx, _ in
                ctx.scaleBy(x: scale, y: scale)
                draw(ctx, t: now.timeIntervalSinceReferenceDate, local: since.map { now.timeIntervalSince($0) } ?? 0)
            }
        }
        .frame(width: Self.size.width * scale, height: Self.size.height * scale)
        .accessibilityHidden(true)
    }

    // Maten uit de spec, in punten van het kader.
    private let k: CGFloat = 1.25
    private var w: CGFloat { Self.size.width }
    private var horizon: CGFloat { Self.size.height * 0.72 }
    private var cx: CGFloat { w / 2 }
    private var sun: Color { onRed ? SplashView.paperWhite : Theme.accent }
    private var ink: Color { onRed ? SplashView.paperWhite : Theme.ink }

    private func draw(_ ctx: GraphicsContext, t now: TimeInterval, local: TimeInterval) {
        let stillT: TimeInterval = kind == .editie ? 4 : 1.6
        let t = still ? stillT : now
        let line = Path { $0.move(to: CGPoint(x: cx - 56 * k, y: horizon)); $0.addLine(to: CGPoint(x: cx + 56 * k, y: horizon)) }
        var sky = ctx
        sky.clip(to: Path(CGRect(x: -20, y: -20, width: w + 40, height: horizon + 20)))

        switch kind {
        case .intro:
            // Eén keer op in 6 s (easeInOutQuad), daarna blijft hij staan en ademt.
            let p = still ? 1 : Self.quad(min(max(local / 6, 0), 1))
            let r = 22 * k * (still ? 1 : Self.breathe(t))
            let cy = Self.lerp(horizon + 23 * k, horizon - 10 * k, p)
            sky.fill(circle(cx, cy, r), with: .color(sun))
            ctx.stroke(line, with: .color(ink), lineWidth: 1.5)

        case .editie:
            let p = Self.quad(Self.triangle(t / 6))
            let cy = horizon - 10 * k + (1 - p) * 30 * k
            sky.fill(circle(cx, cy, 22 * k * Self.breathe(t)), with: .color(sun))
            ctx.stroke(line, with: .color(ink), lineWidth: 1.5)

        case .stroom:
            let cy = horizon - 24 * k
            halo(sky, cy, t)
            sky.fill(circle(cx, cy, 12 * k), with: .color(sun))
            ctx.stroke(line, with: .color(ink.opacity(0.6)), lineWidth: 1.5)
            // Het water: twee rijen streepjes die doorlopend naar links schuiven, zonder terugsprong.
            var water = ctx
            water.clip(to: Path(CGRect(x: cx - 70, y: horizon + 4, width: 140, height: 35)))
            let shift = (t / 5 * 36 * k).truncatingRemainder(dividingBy: 140 * k)
            dashes(water, y: horizon + 13.75, opacity: 0.3, offset: -shift, pattern: [(0, 20), (28, 28), (64, 16), (88, 24), (120, 20)])
            dashes(water, y: horizon + 25, opacity: 0.18, offset: 12.5 - shift, pattern: [(0, 14), (26, 22), (60, 12), (84, 18), (120, 16)])

        case .selectie:
            let cy = horizon - 22 * k
            sky.stroke(circle(cx, cy, 30 * k), with: .color(sun.opacity(0.12)), lineWidth: 1)
            sky.stroke(circle(cx, cy, 22 * k), with: .color(sun.opacity(0.25)), lineWidth: 1)
            halo(sky, cy, t)
            sky.fill(circle(cx, cy, 12 * k * Self.breathe(t)), with: .color(sun))
            ctx.stroke(line, with: .color(ink), lineWidth: 1.5)
        }
    }

    // De halo dijt uit en vervaagt: r 20k → 27k, dekking 35 % → 8 %, 5,5 s.
    private func halo(_ ctx: GraphicsContext, _ cy: CGFloat, _ t: TimeInterval) {
        let p = (1 - cos(2 * .pi * t / 5.5)) / 2
        ctx.stroke(circle(cx, cy, (20 + 7 * p) * k), with: .color(sun.opacity(0.35 - 0.27 * p)), lineWidth: 1)
    }

    private func dashes(_ ctx: GraphicsContext, y: CGFloat, opacity: Double, offset: CGFloat, pattern: [(CGFloat, CGFloat)]) {
        var path = Path()
        for rep in 0 ..< 4 {
            for (start, length) in pattern {
                let x = cx - 70 + offset + CGFloat(rep) * 140 * k + start * k
                path.move(to: CGPoint(x: x, y: y))
                path.addLine(to: CGPoint(x: x + length * k, y: y))
            }
        }
        ctx.stroke(path, with: .color(ink.opacity(opacity)), style: StrokeStyle(lineWidth: 2, lineCap: .round))
    }

    private func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat) -> Path {
        Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
    }

    // Adem: 0,975 + 0,075 · sin(2πt / 5,5).
    static func breathe(_ t: Double) -> Double { 0.975 + 0.075 * sin(2 * .pi * t / 5.5) }
    // 0 → 1 → 0 over twee perioden; daarmee gaat de zon op en weer onder.
    static func triangle(_ x: Double) -> Double {
        let m = (x.truncatingRemainder(dividingBy: 2) + 2).truncatingRemainder(dividingBy: 2)
        return m < 1 ? m : 2 - m
    }
    static func quad(_ p: Double) -> Double { p < 0.5 ? 2 * p * p : 1 - pow(-2 * p + 2, 2) / 2 }
    static func lerp(_ a: CGFloat, _ b: CGFloat, _ p: Double) -> CGFloat { a + (b - a) * p }
}
