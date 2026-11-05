import SwiftUI
import UIKit

// "Tien en de bubbel · je eerste Editie" (goedgekeurd door Alex op woensdag 4 november: "Akkoord, zo
// bouwen"; Hoot-design, woensdag-2026-11-04/tien-concept). Eén keer, na de laatste stap van het welkom:
// Hoot stelt je eerste Editie samen. Spiegel van src/lib/tien.js: TienTests rekent
// tests/fixtures/tien.json na (web = app, tot op 0,01 pt).
//
// Vlak 240 × 128, het hart op (120, 72). Tien punten van Ø 8 komen een voor een op de kring (r 48),
// punt k op 36° × k met de klok mee vanaf boven (140 ms, 4 pt van buiten), achter elke punt groeit de
// haarlijn (1 pt, 200 ms), alles in inkt 3. Snel om de 120 ms; zolang de Editie er nog niet is volgen
// punt 1–9 de bronnen (600) en wacht punt 10, zijn lege plek ademt (2750). De kring sluit (260), wordt
// inkt (140), één zachte tik. Negen lossen op, punt 10 stapt 24 pt naar buiten en wordt rood (280).
// 400 stil. De iris: r 48 → 200 in 560, weg na 400. De Editie komt per blok binnen (200, om de 80,
// 8 pt omhoog) vanaf iris + 280. Fout: punten terug (140, om de 80), lijn terug (400), dan "Geen
// verbinding" (200), geen rood. Verminder beweging: stilstaande kring; 350 naar het eindbeeld, 800
// stil, 350 naar de Editie. Tijden in ms na de tik; R = de Editie is er, F = het laden mislukte.
enum Tien {
    static let w: CGFloat = 240, h: CGFloat = 128, cx: CGFloat = 120, cy: CGFloat = 72
    static let r: CGFloat = 48, out: CGFloat = 72, dot: CGFloat = 8, hair: CGFloat = 1, iris: CGFloat = 200, nudge: CGFloat = 4
    static let first: Double = 200, fast: Double = 120, slow: Double = 600
    static let dotIn: Double = 140, lineIn: Double = 200, close: Double = 260, shut: Double = 140, merge: Double = 280, still: Double = 400
    static let irisMs: Double = 560, irisGone: Double = 400, redAfter: Double = 200, redOut: Double = 140
    static let edAfter: Double = 280, block: Double = 200, blockStep: Double = 80, rise: CGFloat = 8
    static let sentenceAt: Double = 120, sentence: Double = 200, slowNote: Double = 6000, breath: Double = 2750
    static let failDot: Double = 140, failStep: Double = 80, failLine: Double = 400, errAfter: Double = 480, errIn: Double = 200
    static let reduceFade: Double = 350, reduceHold: Double = 800, reduceMin: Double = 600
    static let welcomeFade: Double = 200, gap: CGFloat = 16, line: CGFloat = 24, area: CGFloat = 400

    static let line1 = "Je eerste Editie"
    static let line2 = "Even kijken bij je bronnen"
    static let busy = "Hoot stelt je eerste Editie samen"
    static let ready = "Je eerste Editie staat klaar. Tien verhalen, één buiten je bubbel."
    static let fail = "Je eerste Editie kon nog niet laden. Geen verbinding."

    static let glide = LoadLines.bezier(0.2, 0.8, 0.2, 1)
    static let irisCurve = LoadLines.bezier(0.6, 0, 0.2, 1)
    static let ease = LoadLines.bezier(0.2, 0.7, 0.2, 1)

    struct Plan: Equatable { var a: [Double]; var ready, fail, close, merge, open, ed: Double; var last: Int }
    struct StillPlan: Equatable { var ready, fail, end, out: Double }
    struct State: Equatable { var R: Double?; var F: Double?; var reduce = false }
    struct Ring: Equatable { var r: CGFloat = 48; var deg: Double = 0; var shut: Double = 0; var o: Double = 0 }
    struct Dot: Equatable { var x: CGFloat; var y: CGFloat; var o: Double; var shut: Double = 0; var red: Double = 0 }
    struct Frame: Equatable {
        var ring = Ring()
        var dots: [Dot] = []
        var ghost = Dot(x: 0, y: 0, o: 0)
        var line1: Double = 0, line2: Double = 0, err: Double = 0
        var show: Double?, tick: Double?
        var say = Tien.busy
        var done = false
    }

    private static func clamp(_ v: Double) -> Double { v.isNaN ? 0 : min(1, max(0, v)) }

    static func plan(_ R: Double?, _ F: Double?) -> Plan {
        let ready = R.map { max(0, $0) } ?? .infinity
        let fail = F.map { max(0, $0) } ?? .infinity
        var a: [Double] = []
        var prev = first
        a.append(prev < fail ? prev : .infinity)
        for k in 1..<9 {
            if a[k - 1] == .infinity { a.append(.infinity); continue }
            let v = min(prev + slow, max(prev + fast, ready))
            prev = v
            a.append(v < fail ? v : .infinity)
        }
        a.append(fail < .infinity || a[8] == .infinity ? .infinity : max(a[8] + fast, ready))
        let close = a[9] + dotIn, merge = close + Self.close, open = merge + Self.merge + still
        let last = a.lastIndex { $0 < .infinity } ?? -1
        return Plan(a: a, ready: ready, fail: fail, close: close, merge: merge, open: open, ed: open + edAfter, last: last)
    }

    static func stillPlan(_ R: Double?, _ F: Double?) -> StillPlan {
        let ready = R.map { max(reduceMin, $0) } ?? .infinity
        let fail = F.map { max(0, $0) } ?? .infinity
        let end = fail < .infinity ? .infinity : ready
        return StillPlan(ready: ready, fail: fail, end: end, out: end + reduceFade + reduceHold)
    }

    private static func at(_ k: Int, _ r: CGFloat) -> (CGFloat, CGFloat) {
        let a = Double(k) * .pi / 5
        return (cx + r * CGFloat(sin(a)), cy - r * CGFloat(cos(a)))
    }

    private static func arc(_ p: Plan, _ t: Double) -> Double {
        var L = 0.0
        for k in 1..<10 { L += 36 * glide(clamp((t - p.a[k]) / lineIn)) }
        L += 36 * glide(clamp((t - p.close) / close))
        if p.fail < .infinity { L *= 1 - glide(clamp((t - p.fail) / failLine)) }
        return L
    }

    static func frame(_ st: State, _ t: Double) -> Frame {
        var f = Frame()
        if st.reduce {
            let p = stillPlan(st.R, st.F)
            let toEnd = clamp((t - p.end) / reduceFade)
            let out = clamp((t - p.out) / reduceFade)
            let errOut = p.fail < .infinity ? clamp((t - p.fail) / reduceFade) : 0
            f.ring = Ring(r: r, deg: 360, shut: toEnd, o: (1 - out) * (1 - errOut))
            f.dots = (0..<10).map { k in let (x, y) = at(k, r); return Dot(x: x, y: y, o: (1 - toEnd) * (1 - errOut)) }
            let (gx, gy) = at(9, Self.out)
            f.ghost = Dot(x: gx, y: gy, o: toEnd * (1 - out), red: 1)
            f.line1 = clamp(t / reduceFade) * (1 - out) * (1 - errOut)
            f.line2 = clamp((t - slowNote) / reduceFade) * (1 - clamp((t - p.ready) / reduceFade)) * (1 - errOut)
            f.err = p.fail < .infinity ? clamp((t - p.fail - reduceFade) / reduceFade) : 0
            f.show = p.out < .infinity ? p.out : nil
            if p.fail < .infinity && t >= p.fail { f.say = fail } else if t >= p.ready { f.say = ready }
            f.done = p.fail < .infinity ? t >= p.fail + 2 * reduceFade : t >= p.out + reduceFade
            return f
        }
        let p = plan(st.R, st.F)
        let shut = ease(clamp((t - p.close) / Self.shut))
        let mg = irisCurve(clamp((t - p.merge) / merge))
        let o = irisCurve(clamp((t - p.open) / irisMs))
        f.ring = Ring(r: r + (iris - r) * CGFloat(o), deg: arc(p, t), shut: shut, o: 1 - clamp((t - p.open) / irisGone))
        for k in 0..<10 {
            let pr = glide(clamp((t - p.a[k]) / dotIn))
            var rad = r + nudge * CGFloat(1 - pr), al = pr, red = 0.0
            if p.fail < .infinity && p.a[k] < .infinity { al *= 1 - ease(clamp((t - (p.fail + failStep * Double(p.last - k))) / failDot)) }
            if k < 9 { al *= 1 - mg } else {
                rad += (Self.out - r) * CGFloat(mg); red = mg
                al *= 1 - clamp((t - p.open - redAfter) / redOut)
            }
            let (x, y) = at(k, rad)
            f.dots.append(Dot(x: x, y: y, o: al, shut: shut, red: red))
        }
        let from = p.a[8] + dotIn
        if p.a[8] < .infinity && p.a[9] > from && t > from {
            let breath = 0.5 - 0.5 * cos(2 * .pi * (t - from) / Self.breath)
            let fadeIn = clamp((t - from) / still)
            let hand = 1 - clamp((t - min(p.a[9], p.fail)) / dotIn)
            let (x, y) = at(9, r)
            f.ghost = Dot(x: x, y: y, o: (0.12 + 0.28 * breath) * fadeIn * hand)
        }
        let failOut = p.fail < .infinity ? 1 - clamp((t - p.fail) / sentence) : 1
        f.line1 = clamp((t - sentenceAt) / sentence) * (1 - clamp((t - p.open) / sentence)) * failOut
        f.line2 = clamp((t - slowNote) / sentence) * (1 - clamp((t - min(p.a[9], p.fail)) / sentence))
        f.err = p.fail < .infinity ? clamp((t - p.fail - errAfter) / errIn) : 0
        f.show = p.ed < .infinity ? p.ed : nil
        f.tick = p.close < .infinity ? p.close : nil
        if p.fail < .infinity && t >= p.fail { f.say = fail } else if t >= p.merge + merge { f.say = ready }
        f.done = p.fail < .infinity ? t >= p.fail + errAfter + errIn : t >= p.open + irisMs
        return f
    }

    // Een blok van de Editie: opacity en hoeveel pt lager, op t ms na de tik.
    static func block(_ i: Int, show: Double?, _ t: Double, reduce: Bool = false) -> (o: Double, y: CGFloat) {
        guard let show else { return (0, reduce ? 0 : rise) }
        if reduce { return (clamp((t - show) / reduceFade), 0) }
        let v = ease(clamp((t - show - blockStep * Double(i)) / block))
        return (v, rise * CGFloat(1 - v))
    }
}

// De toestand naast het laden, vanaf de tik. Eén per Editie-scherm (@State); de tik staat in de winkel.
@MainActor
@Observable
final class TienModel {
    private(set) var t0: Double?
    private(set) var state = Tien.State()
    private(set) var shown = true // de Editie is binnen (of er speelt niets)
    private(set) var errShown = true
    private(set) var failed = false
    private(set) var said = Tien.busy
    var onDone: (() -> Void)?
    private var job: Task<Void, Never>?

    var active: Bool { t0 != nil }
    nonisolated static func clock() -> Double { CACurrentMediaTime() * 1000 }
    var now: Double { t0.map { Self.clock() - $0 } ?? 0 }

    func start(at tap: Double, reduce: Bool) {
        guard t0 != tap else { return }
        t0 = tap
        state = Tien.State(R: nil, F: nil, reduce: reduce)
        shown = false; errShown = false; failed = false; said = Tien.busy
        run()
    }

    // Het laden volgt: klaar of fout, en Opnieuw na een fout begint een nieuwe ronde.
    func update(loading: Bool, failed isFailed: Bool) {
        guard let t0 else { return }
        // Opnieuw na een fout, of de Editie die toch nog komt: een nieuwe ronde.
        if state.F != nil && (loading || !isFailed) { start(at: Self.clock(), reduce: state.reduce); if loading { return } }
        if loading || state.R != nil || state.F != nil { return }
        let t = Self.clock() - t0
        if isFailed { state.F = t } else { state.R = t }
    }

    func stop() {
        job?.cancel()
        t0 = nil; shown = true; errShown = true; failed = false
    }

    // De momenten naast de tekening: de tik, wat VoiceOver hoort, de Editie, het foutblok en klaar.
    private func run() {
        job?.cancel()
        job = Task { [weak self] in
            var ticked = false, failTicked = false
            while !Task.isCancelled {
                guard let self, let t0 = self.t0 else { return }
                let t = Self.clock() - t0
                let f = Tien.frame(self.state, t)
                if !self.state.reduce, let tick = f.tick, t >= tick, !ticked {
                    ticked = true
                    UIImpactFeedbackGenerator(style: .soft).impactOccurred(intensity: 0.6)
                }
                if self.state.F != nil, !failTicked {
                    failTicked = true
                    UIImpactFeedbackGenerator(style: .soft).impactOccurred(intensity: 0.4)
                }
                if f.say != self.said {
                    self.said = f.say
                    UIAccessibility.post(notification: .announcement, argument: f.say)
                }
                if let show = f.show, t >= show, !self.shown { self.shown = true }
                if f.err > 0, !self.errShown {
                    withAnimation(LoadLines.easeAnimation(self.state.reduce ? Tien.reduceFade : Tien.errIn)) { self.errShown = true }
                }
                if f.done {
                    if self.state.F != nil { self.failed = true; return }
                    let rest = self.state.reduce ? Tien.reduceFade : Tien.blockStep * 8 + Tien.block
                    try? await Task.sleep(for: .milliseconds(Int(rest)))
                    guard !Task.isCancelled, self.t0 == t0 else { return }
                    self.stop()
                    self.onDone?()
                    return
                }
                try? await Task.sleep(for: .milliseconds(30))
            }
        }
    }
}

// Waar de titel van de Editie eindigt: het teken staat eronder.
struct TienAnchor: PreferenceKey {
    static var defaultValue: Anchor<CGRect>? { nil }
    static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) { value = value ?? nextValue() }
}

// Het teken op één beeld: de kring, de tien punten en de lege plek (of het eindbeeld).
struct TienArt: View {
    let frame: Tien.Frame
    var body: some View {
        Canvas { ctx, size in
            // Het vlak staat midden in een groter doek, zodat de iris (r 200) er niet af valt.
            let ox = (size.width - Tien.w) / 2, oy = (size.height - Tien.h) / 2
            func tint(_ shut: Double, _ red: Double) -> Color {
                let base = shut > 0 ? Theme.ink3.mix(with: Theme.ink, by: shut) : Theme.ink3
                return red > 0 ? base.mix(with: Theme.accent, by: red) : base
            }
            let ring = frame.ring
            if ring.deg > 0.01 && ring.o > 0 {
                let c = CGPoint(x: ox + Tien.cx, y: oy + Tien.cy)
                let path = Path { p in p.addArc(center: c, radius: ring.r, startAngle: .degrees(-90), endAngle: .degrees(-90 + min(360, ring.deg)), clockwise: false) }
                var layer = ctx
                layer.opacity = ring.o
                layer.stroke(path, with: .color(tint(ring.shut, 0)), lineWidth: Tien.hair)
            }
            for d in frame.dots + [frame.ghost] where d.o > 0 {
                var layer = ctx
                layer.opacity = d.o
                let rect = CGRect(x: ox + d.x - Tien.dot / 2, y: oy + d.y - Tien.dot / 2, width: Tien.dot, height: Tien.dot)
                layer.fill(Circle().path(in: rect), with: .color(tint(d.shut, d.red)))
            }
        }
        .frame(width: Tien.iris * 2 + Tien.dot, height: Tien.iris * 2 + Tien.dot)
        .frame(width: Tien.w, height: Tien.h)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

// Het teken met de zin eronder: 240 × 128, dan 16 en "Je eerste Editie", dan de regel bij langzaam laden.
struct FirstEditionMark: View {
    let frame: Tien.Frame
    var body: some View {
        VStack(spacing: 0) {
            TienArt(frame: frame)
            Text(Tien.line1).font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.ink)
                .frame(height: Tien.line).padding(.top, Tien.gap).opacity(frame.line1)
            Text(Tien.line2).font(.system(size: 15)).foregroundStyle(Theme.ink3)
                .frame(height: Tien.line).opacity(frame.line2)
        }
        .fixedSize()
        .allowsHitTesting(false)
    }
}

private struct TienLayer: View {
    let model: TienModel
    let anchor: Anchor<CGRect>?
    var body: some View {
        GeometryReader { proxy in
            if model.active, !model.failed, let anchor {
                let head = proxy[anchor]
                TimelineView(.animation(minimumInterval: nil, paused: false)) { timeline in
                    let t = model.t0.map { LoadLines.clockMs(timeline.date) - $0 } ?? 0
                    FirstEditionMark(frame: Tien.frame(model.state, t))
                        .position(x: proxy.size.width / 2, y: head.maxY + Space.s2 + Tien.area / 2)
                }
                .accessibilityElement()
                .accessibilityLabel(model.said)
                .accessibilityAddTraits(.updatesFrequently)
            }
        }
        .allowsHitTesting(false)
    }
}

extension View {
    // Op de LazyVStack van de Editie: volgt het laden en tekent het teken onder de titel.
    func firstEdition(_ model: TienModel, loading: Bool, failed: Bool) -> some View {
        modifier(TienHost(model: model, loading: loading, failed: failed))
    }
    // De titel van de Editie: hieronder staat het teken.
    func tienAnchor() -> some View { anchorPreference(key: TienAnchor.self, value: .bounds) { $0 } }
    // Een blok van de Editie: verborgen tot de bubbel opengaat, dan 200 ms in, 80 ms na elkaar, 8 pt omhoog.
    func tienBlock(_ model: TienModel, _ i: Int) -> some View { modifier(TienBlock(model: model, index: min(i, 8))) }
    // Het foutblok: komt na het teruggaan van de punten.
    func tienError(_ model: TienModel) -> some View { opacity(model.errShown ? 1 : 0) }
}

private struct TienBlock: ViewModifier {
    let model: TienModel
    let index: Int
    @Environment(\.accessibilityReduceMotion) private var still
    func body(content: Content) -> some View {
        content
            .opacity(model.shown ? 1 : 0)
            .offset(y: model.shown || still ? 0 : Tien.rise)
            // Alleen het binnenkomen is een animatie; verbergen bij de tik is meteen.
            .animation(model.shown && model.active ? (still ? LoadLines.easeAnimation(Tien.reduceFade) : LoadLines.easeAnimation(Tien.block).delay(Tien.blockStep * Double(index) / 1000)) : nil, value: model.shown)
    }
}

private struct TienHost: ViewModifier {
    let model: TienModel
    let loading: Bool
    let failed: Bool
    func body(content: Content) -> some View {
        content
            .overlayPreferenceValue(TienAnchor.self) { anchor in TienLayer(model: model, anchor: anchor) }
            .onChange(of: loading, initial: true) { _, _ in model.update(loading: loading, failed: failed) }
            .onChange(of: failed) { _, _ in model.update(loading: loading, failed: failed) }
            .onChange(of: model.t0) { _, _ in model.update(loading: loading, failed: failed) }
    }
}
