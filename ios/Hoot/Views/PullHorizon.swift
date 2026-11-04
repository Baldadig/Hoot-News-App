import SwiftUI

// Trekken om te verversen: Horizon v2 (Hoot-design, woensdag 4 november, pull-concepten-2/1-horizon.html).
// Trekken is zonsopgang, laden is de dag, klaar is de ondergang. Een haarlijn groeit met je trek tot de
// kantlijnen, de rode zon komt erachter op, loopt bij laden over de boog van ochtend naar middag (en
// ademt daar als het lang duurt), en gaat bij klaar door naar de vroege avond en daar onder.
//
// Regel voor regel dezelfde rekensom als het web (src/lib/pull-horizon.js). HootTests/PullHorizonTests
// loopt tests/fixtures/pull-horizon.json na: dezelfde invoer geeft hier dezelfde tekening (0,01 pt).
// Maten in pt, op het ritme van 8; tijden in ms. y telt omhoog vanaf de bovenkant van de horizon,
// x vanaf het midden.
enum Horizon {
    static let threshold: CGFloat = 72 // pull-threshold, gelijk aan RefreshPull.threshold
    static let strip: CGFloat = 56 // pull-strip: 48 lucht, 8 onder de horizon
    static let below = 8.0
    static let r = 8.0 // zon ⌀ 16
    static let gutter = 16.0
    static let half = 68.0 // dagdelen op −68 · 0 · +68
    static let end = 8.0, ctrl = 56.0 // boog: einden 8, top 32 (als de landing)
    static let lineFrom = 16.0, sunFrom = 40.0
    static let markR = 4.0 // merkteken ⌀ 8
    static let rings: [(scale: Double, opacity: Double)] = [(1.3, 0.45), (1.6, 0.28), (1.9, 0.15)]
    static let message = "Niet ververst. Trek opnieuw."

    enum Ms {
        static let close = 400.0, ringOut = 200.0, arcIn = 200.0, leg = 800.0, breath = 2750.0
        static let set = 600.0, out = 140.0, outAt = 440.0, back = 600.0, sink = 400.0, hold = 2000.0
        static let reduced = 350.0
    }
    static let noon = 400 + Ms.leg // de zon staat op de middag, gemeten vanaf loslaten (1,2 s)

    static func now(_ date: Date = .now) -> Double { date.timeIntervalSinceReferenceDate * 1000 }

    // --- curves ---
    static func bezier(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) -> @Sendable (Double) -> Double {
        let cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
        let cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
        return { x in
            if x <= 0 { return 0 }
            if x >= 1 { return 1 }
            var t = x
            for _ in 0..<8 {
                let e = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx
                if abs(e) < 1e-6 || d == 0 { break }
                t -= e / d
            }
            t = min(1, max(0, t))
            return ((ay * t + by) * t + cy) * t
        }
    }
    static let glide = bezier(0.2, 0.8, 0.2, 1) // ease-glide
    static let iris = bezier(0.6, 0, 0.2, 1) // ease-iris
    static let ease = bezier(0.2, 0.7, 0.2, 1) // ease
    static func io(_ p: Double) -> Double { p < 0.5 ? 4 * p * p * p : 1 - pow(-2 * p + 2, 3) / 2 } // landing
    static func sine(_ t: Double) -> Double { 0.5 - 0.5 * cos(.pi * t) }
    static func c01(_ v: Double) -> Double { min(1, max(0, v)) }

    // Vinger → afstand op het web: 1 : 1 tot 72, dan een zachte rem tot hooguit 120. In de app doet de
    // ScrollView zijn eigen rem; de tekening volgt de zichtbare afstand.
    static func resist(_ d: Double) -> Double {
        guard d > 0 else { return 0 }
        if d <= 72 { return d }
        return 72 + 48 * (1 - exp(-(d - 72) / 120))
    }
    // Punt op de boog: t 0 = ochtend, ½ = middag, 1 = vroege avond.
    static func arc(_ t: Double) -> (x: Double, y: Double) {
        let u = 1 - t
        return (half * (2 * t - 1), end * u * u + ctrl * 2 * u * t + end * t * t)
    }
    // Adem uit de rode intro: 1 → 1,06 → 0,92 → 1, elke stap 2750 ms.
    static func breathe(_ ms: Double) -> Double {
        let k = [1, 1.06, 0.92, 1.0], period = 3 * Ms.breath
        let cyc = (ms.truncatingRemainder(dividingBy: period) + period).truncatingRemainder(dividingBy: period)
        let i = min(2, Int(cyc / Ms.breath))
        return k[i] + (k[i + 1] - k[i]) * sine((cyc - Double(i) * Ms.breath) / Ms.breath)
    }
    // De ringen lichten op de drempel op in 140 ms; `since` is de laatste kruising.
    static func glow(now: Double, armed: Bool, since: Double?, reduce: Bool) -> Double {
        guard let since, !reduce else { return armed ? 1 : 0 }
        let f = ease(c01((now - since) / Ms.out))
        return armed ? f : 1 - f
    }
}

struct HorizonState: Equatable {
    enum Phase: String { case pull, load, go, set, fail }
    var phase: Phase = .pull
    var pull = 0.0 // zichtbare afstand
    var glow = 0.0
    var artOp = 1.0
    var reduce = false
    var loadT0 = 0.0, leg2T0 = 0.0, s0 = 1.0, setT0 = 0.0, failT0 = 0.0, tf = 0.0
}

struct HorizonGeom: Equatable {
    var w = 0.0, strong = false, lineOp = 0.0, arcOp = 0.0, sx = -Horizon.half, sy = -Horizon.r
    var sunOp = 1.0, scale = 1.0, grow = 0.0, ringOp = 0.0, msg = 0.0
}

extension Horizon {
    static func sunT(_ s: HorizonState, now: Double) -> Double {
        if s.reduce { return now - s.loadT0 < Ms.reduced / 2 ? 0 : 0.5 }
        if s.phase == .go && now >= s.leg2T0 { return 0.5 + 0.5 * io(c01((now - s.leg2T0) / Ms.leg)) }
        return 0.5 * io(c01((now - s.loadT0 - 400) / Ms.leg))
    }

    // De hele tekening als functie van de toestand; width is de breedte inclusief de kantlijnen.
    static func geom(_ s: HorizonState, now: Double, width: Double) -> HorizonGeom {
        let w = width - 2 * gutter
        var g = HorizonGeom()
        switch s.phase {
        case .pull:
            let d = s.pull, p = s.reduce ? 1 : c01((d - sunFrom) / (Double(threshold) - sunFrom))
            g.lineOp = c01((d - lineFrom) / 16) * s.artOp
            g.w = s.reduce ? w : 16 + (w - 16) * c01((d - lineFrom) / (Double(threshold) - lineFrom))
            g.sy = -r + 2 * r * p
            g.sunOp = (s.reduce ? c01((d - 24) / 16) : 1) * s.artOp
            g.grow = p
            g.ringOp = p * (0.6 + 0.4 * s.glow)
            g.strong = d >= Double(threshold)
        case .load, .go:
            let tau = now - s.loadT0
            g.w = w; g.strong = true; g.lineOp = 1; g.grow = 1
            g.ringOp = s.reduce ? 0 : 1 - ease(c01(tau / Ms.ringOut))
            g.arcOp = s.reduce ? 1 : ease(c01((tau - Ms.ringOut) / Ms.arcIn))
            let t = sunT(s, now: now), pt = arc(t)
            g.sx = pt.x; g.sy = pt.y
            if s.reduce {
                g.sunOp = tau < Ms.reduced / 2 ? 1 - tau / (Ms.reduced / 2) : c01((tau - Ms.reduced / 2) / (Ms.reduced / 2))
            } else if s.phase == .load && tau > noon {
                g.scale = breathe(tau - noon)
            } else if s.phase == .go {
                g.scale = s.s0 + (1 - s.s0) * glide(c01((now - s.leg2T0) / 400))
            }
        case .set:
            let tau = now - s.setT0
            g.w = w; g.strong = true; g.grow = 1
            g.sx = half
            if s.reduce {
                g.sx = 0; g.sy = arc(0.5).y
                let o = 1 - c01(tau / Ms.reduced)
                g.lineOp = o; g.arcOp = o; g.sunOp = o
            } else {
                g.sy = end - 2 * r * iris(c01(tau / Ms.set))
                let o = 1 - c01((tau - Ms.outAt) / Ms.out)
                g.lineOp = o; g.arcOp = o
            }
        case .fail:
            let tau = now - s.failT0
            g.w = w; g.strong = true; g.grow = 1
            if s.reduce {
                let pt = arc(s.tf)
                g.sx = pt.x; g.sy = pt.y
                g.arcOp = 1 - c01(tau / Ms.reduced); g.sunOp = g.arcOp
                g.msg = 1 - c01((tau - Ms.hold) / Ms.reduced)
                g.lineOp = g.msg
            } else {
                let pt = arc(s.tf * (1 - glide(c01(tau / Ms.back))))
                g.sx = pt.x; g.sy = pt.y
                if tau > Ms.back { g.sy = end - 2 * r * glide(c01((tau - Ms.back) / Ms.sink)) }
                g.arcOp = 1 - ease(c01(tau / 200))
                let inA = ease(c01((tau - Ms.back) / 200)), outA = 1 - ease(c01((tau - Ms.back - Ms.hold) / 200))
                g.msg = min(inA, outA)
                g.lineOp = 1 - c01((tau - Ms.back - Ms.hold) / Ms.out)
            }
        }
        return g
    }

    // --- tijden ---
    // Het antwoord is binnen: fout, of doorlopen naar de vroege avond zodra de zon op de middag staat
    // (Verminder beweging: meteen de ondergang, als één vervaging).
    static func answer(_ s: HorizonState, now: Double, ok: Bool) -> HorizonState {
        var n = s
        if !ok { n.phase = .fail; n.failT0 = now; n.tf = sunT(s, now: now); return n }
        if s.reduce { n.phase = .set; n.setT0 = now; return n }
        n.phase = .go
        n.leg2T0 = max(now, s.loadT0 + noon)
        n.s0 = now - s.loadT0 > noon ? breathe(now - s.loadT0 - noon) : 1
        return n
    }
    static func setAt(_ s: HorizonState) -> Double { s.leg2T0 + Ms.leg }
    static func closeAt(_ s: HorizonState) -> Double {
        switch s.phase {
        case .set: s.setT0 + (s.reduce ? Ms.reduced : Ms.outAt)
        case .fail: s.failT0 + (s.reduce ? Ms.hold + Ms.reduced : Ms.back + Ms.hold)
        default: .infinity
        }
    }
    static func doneAt(_ s: HorizonState) -> Double { closeAt(s) + (s.reduce ? 0 : Ms.close) }
    // De hele reis vanaf loslaten (ms): wanneer de ondergang begint, de strook sluit en dicht is.
    static func journey(responseMs: Double, ok: Bool = true, reduce: Bool = false) -> (set: Double?, close: Double, done: Double) {
        var s = answer(HorizonState(phase: .load, reduce: reduce), now: responseMs, ok: ok)
        if s.phase == .go { s.setT0 = setAt(s); s.phase = .set }
        return (s.phase == .set ? s.setT0 : nil, closeAt(s), doneAt(s))
    }
}

// Het teken in de strook. De tekening hangt aan de onderkant: horizon 8 boven de rand, zon en ringen in
// de lucht erboven en afgeknipt op de lijn (je ziet nooit een zon onder de horizon). Boog en
// merktekens in inkt 3, de sterke lijn in inkt (Nacht: inkt 2), één rood ding: de zon met zijn ringen.
struct HorizonPullMark: View {
    var state: HorizonState
    var armed = false
    var armedSince: Double? = nil
    var frozen: Double? = nil // vaste klok (ms), voor beelden en tests
    @Environment(\.nachtActief) private var nacht

    var body: some View {
        // De klok loopt alleen als de tekening van de tijd afhangt: laden, doorlopen, ondergang, fout en
        // de 140 ms gloed op de drempel. Tijdens trekken volgt hij de vinger (de scroll tekent opnieuw).
        TimelineView(.animation(minimumInterval: nil, paused: !ticking)) { tl in
            let now = frozen ?? Horizon.now(tl.date)
            let s = at(now)
            let g = Horizon.geom(s, now: now, width: 0) // alleen voor de zin: die hangt niet van de breedte af
            ZStack(alignment: .bottom) {
                Canvas { ctx, size in draw(&ctx, size, s, now) }
                PullMessage()
                    .opacity(g.msg)
            }
        }
        .accessibilityHidden(true)
    }

    private var ticking: Bool {
        if frozen != nil { return false }
        if state.phase != .pull { return true }
        guard let armedSince, !state.reduce else { return false }
        return Horizon.now() - armedSince < Horizon.Ms.out + 40
    }

    private func at(_ now: Double) -> HorizonState {
        var s = state
        if s.phase == .pull { s.glow = Horizon.glow(now: now, armed: armed, since: armedSince, reduce: s.reduce) }
        return s
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize, _ s: HorizonState, _ now: Double) {
        typealias H = Horizon
        let g = H.geom(s, now: now, width: size.width)
        let mid = size.width / 2, hy = size.height - H.below
        // 1 · boog en merktekens
        // (Dekking per groep via drawLayer, zoals <g opacity> op het web; ctx zelf staat op 1.)
        if g.arcOp > 0.001 {
            var layer = ctx
            layer.opacity = g.arcOp
            layer.drawLayer { l in
                let a = H.arc(0), m = H.arc(0.5), b = H.arc(1)
                var path = Path()
                path.move(to: CGPoint(x: mid + a.x, y: hy - a.y))
                path.addQuadCurve(to: CGPoint(x: mid + b.x, y: hy - b.y), control: CGPoint(x: mid, y: hy - H.ctrl))
                l.stroke(path, with: .color(Theme.ink3), style: StrokeStyle(lineWidth: 1, lineCap: .round, dash: [1, 4]))
                for p in [a, m, b] {
                    let ring = Path(ellipseIn: CGRect(x: mid + p.x - (H.markR - 0.5), y: hy - p.y - (H.markR - 0.5), width: 2 * H.markR - 1, height: 2 * H.markR - 1))
                    l.fill(ring, with: .color(Theme.paper))
                    l.stroke(ring, with: .color(Theme.ink3), lineWidth: 1)
                }
            }
        }
        // 2 · horizon: altijd 1 pt; op de drempel de sterke kleur
        if g.lineOp > 0.001 && g.w > 0 {
            let color = g.strong ? (nacht ? Theme.ink2 : Theme.ink) : Theme.ink3
            ctx.fill(Path(CGRect(x: mid - g.w / 2, y: hy, width: g.w, height: 1)), with: .color(color.opacity(g.lineOp)))
        }
        // 3 · lucht: zon en ringen, afgeknipt op de bovenkant van de lijn
        if g.sunOp > 0.001 && g.sy > -H.r {
            var sky = ctx
            sky.clip(to: Path(CGRect(x: 0, y: -200, width: size.width, height: hy + 200)))
            sky.opacity = g.sunOp
            let c = CGPoint(x: mid + g.sx, y: hy - g.sy)
            sky.drawLayer { l in
                if g.ringOp > 0.001 {
                    for ring in H.rings {
                        let rr = H.r + (ring.scale - 1) * H.r * g.grow - 0.5
                        l.stroke(Path(ellipseIn: CGRect(x: c.x - rr, y: c.y - rr, width: 2 * rr, height: 2 * rr)), with: .color(Theme.accent.opacity(ring.opacity * g.ringOp)), lineWidth: 1)
                    }
                }
                let sr = H.r * g.scale
                l.fill(Path(ellipseIn: CGRect(x: c.x - sr, y: c.y - sr, width: 2 * sr, height: 2 * sr)), with: .color(Theme.accent))
            }
        }
    }
}

// De foutzin van de strook: 15/20 (subheadline), één regel, begrensd op xxLarge en mag krimpen tot 70 %,
// zodat hij ook bij de grootste tekst (AX5) en op 320 breed binnen de kantlijnen past.
struct PullMessage: View {
    var body: some View {
        Text(Horizon.message)
            .font(.subheadline)
            .foregroundStyle(Theme.ink3)
            .lineLimit(1).minimumScaleFactor(0.7)
            .dynamicTypeSize(...DynamicTypeSize.xxLarge)
            .frame(height: 20)
            .padding(.horizontal, Horizon.gutter)
            .padding(.bottom, 24) // 16 boven de horizon
    }
}
