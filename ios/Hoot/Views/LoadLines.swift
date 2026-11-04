import SwiftUI
import UIKit

// De laadstrepen, "A · De stapel" (goedgekeurd door Alex op woensdag 4 november; Hoot-design,
// woensdag-2026-11-04/laadscherm-concept). Het wachtteken bij het eerste laden van Editie, Stroom,
// Selectie en Bluesky, en in de lezer terwijl een artikel laadt. Spiegel van src/lib/load-lines.js:
// LoadLinesTests rekent tests/fixtures/load-lines.json na (web = app, tot op 0,01 pt).
//
// Vier vellen van 56 pt als haarlijnen van 1 pt in inkt 3, 8 pt uit elkaar, opzij −4 · 0 · +4 · −2.
// Lus 2000 ms: het bovenste vel gaat er schuin omhoog af in 640 ms easeInOut, de rest schuift op,
// onderin een nieuw vel; dan 1360 ms stil. Klaar: afmaken (≤ 800 ms), landen in 480 ms glide (het
// bovenste vel wordt de rode kopstreep, drie strepen glijden naar de kopregels), tekst 320 ms. Onder
// 400 ms geen strepen. Zonder kop (Stroom, Selectie, Bluesky, de lezer): afmaken en vervagen (320).
// Fout: afmaken, 320 uit, foutblok 240 in (160 later). Verminder beweging: stilstaande strepen,
// 240 ms overvloeien. VoiceOver: één element, "Even kijken bij je bronnen".
enum LoadLines {
    static let len: CGFloat = 56
    static let step: CGFloat = 8
    static let offs: [CGFloat] = [-4, 0, 4, -2]
    static let top: CGFloat = 180
    static let box: CGFloat = 240
    static let period: Double = 2000
    static let firstBeat: Double = 1000
    static let move: Double = 640
    static let fadeIn: Double = 240
    static let stagger: Double = 40
    static let land: Double = 480
    static let text: Double = 320
    static let out: Double = 320
    static let ruleInk: Double = 240
    static let handoff: Double = 360
    static let early: Double = 400
    static let settleMax: Double = 800
    static let errIn: Double = 240
    static let errDelay: Double = 160
    static let reduceFade: Double = 240
    static let rise: CGFloat = 8
    static let ruleH: CGFloat = 2
    static let label = "Even kijken bij je bronnen"

    static func bezier(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) -> @Sendable (Double) -> Double {
        let cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
        let cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
        return { x in
            let v = min(1, max(0, x))
            var t = v
            for _ in 0..<8 {
                let e = ((ax * t + bx) * t + cx) * t - v
                let d = (3 * ax * t + 2 * bx) * t + cx
                if abs(e) < 1e-6 || d == 0 { break }
                t -= e / d
            }
            t = min(1, max(0, t))
            return ((ay * t + by) * t + cy) * t
        }
    }
    static let inOut = bezier(0.4, 0, 0.2, 1)
    static let glide = bezier(0.2, 0.8, 0.2, 1)
    static let ease = bezier(0.2, 0.7, 0.2, 1)
    // Dezelfde curves als SwiftUI-animatie, voor de inhoud.
    static func easeAnimation(_ ms: Double) -> Animation { .timingCurve(0.2, 0.7, 0.2, 1, duration: ms / 1000) }
    static func glideAnimation(_ ms: Double) -> Animation { .timingCurve(0.2, 0.8, 0.2, 1, duration: ms / 1000) }

    struct Line: Equatable { var n: Int; var x, y, w: CGFloat; var h: CGFloat = 1; var o: Double = 1; var accent: Double = 0; var ink: Double = 0 }
    struct Target: Equatable { var x, y, w: CGFloat }
    struct Targets: Equatable { var rule: Target?; var rows: [Target] }
    struct Box: Equatable { var x: CGFloat = 0; var y: CGFloat = 0; var w: CGFloat = 390 }
    struct State: Equatable {
        var t0: Double = 0
        var reduce = false
        var doneAt: Double?
        var failAt: Double?
        var box = Box()
        var targets: Targets?
    }
    struct Frame: Equatable { var lines: [Line] = []; var text: Double = 0; var rise: CGFloat = 0; var rule: Double = 0; var err: Double = 0; var done = false }

    private static func clamp(_ v: Double) -> Double { min(1, max(0, v)) }
    private static func mix(_ a: CGFloat, _ b: CGFloat, _ t: Double) -> CGFloat { a + (b - a) * CGFloat(t) }

    private static func sheet(_ n: Int, _ slot: Int, _ box: Box) -> Line {
        Line(n: n, x: box.x + (box.w - len) / 2 + offs[n % 4], y: box.y + top + CGFloat(slot) * step, w: len)
    }

    static func stackAt(_ t: Double, _ box: Box, still: Bool = false) -> [Line] {
        if still { return (0..<4).map { sheet($0, $0, box) } }
        if t < firstBeat {
            return (0..<4).map { n in var s = sheet(n, n, box); s.o = ease(clamp((t - Double(n) * stagger) / fadeIn)); return s }.filter { $0.o > 0 }
        }
        let k = Int(((t - firstBeat) / period).rounded(.down))
        let p = clamp((t - firstBeat - Double(k) * period) / move)
        if p >= 1 { return (0..<4).map { sheet(k + 1 + $0, $0, box) } }
        let e = inOut(p)
        var out: [Line] = []
        var top = sheet(k, 0, box)
        if e < 1 { top.x += step * CGFloat(e); top.y -= step * CGFloat(e); top.o = 1 - e; out.append(top) }
        for i in 1...3 { var s = sheet(k + i, i, box); s.y -= step * CGFloat(e); out.append(s) }
        var fresh = sheet(k + 4, 4, box)
        if e > 0 { fresh.y -= step * CGFloat(e); fresh.o = e; out.append(fresh) }
        return out.filter { $0.o > 0 }
    }

    static func settleAt(_ t: Double) -> Double {
        let fade = 3 * stagger + fadeIn
        if t < firstBeat { return max(t, min(fade, firstBeat)) }
        let k = ((t - firstBeat) / period).rounded(.down)
        let end = firstBeat + k * period + move
        return t < end ? end : t
    }

    static func frame(_ st: State, now: Double) -> Frame {
        let box = st.box
        let t = max(0, now - st.t0)
        var f = Frame()
        func faded(_ lines: [Line], _ q: Double) -> [Line] { lines.map { var l = $0; l.o *= (1 - q); return l }.filter { $0.o > 0 } }
        if let failAt = st.failAt {
            let F = failAt - st.t0
            if st.reduce {
                let q = clamp((t - F) / reduceFade)
                f.lines = faded(stackAt(0, box, still: true), q); f.err = q; f.done = q >= 1
                return f
            }
            let S = settleAt(F)
            if t < S { f.lines = stackAt(t, box); return f }
            f.lines = faded(stackAt(S, box), ease(clamp((t - S) / out)))
            f.err = ease(clamp((t - S - errDelay) / errIn))
            f.done = t >= S + errDelay + errIn
            return f
        }
        if let doneAt = st.doneAt {
            let D = doneAt - st.t0
            if st.reduce {
                let q = clamp((t - D) / reduceFade)
                f.lines = faded(stackAt(0, box, still: true), q); f.text = q; f.rule = 1; f.done = q >= 1
                return f
            }
            if D < early { f.text = 1; f.rule = 1; f.done = true; return f }
            let S = settleAt(D)
            if t < S { f.lines = stackAt(t, box); f.rise = st.targets != nil ? rise : 0; return f }
            let from = stackAt(S, box)
            guard let targets = st.targets else {
                let q = ease(clamp((t - S) / out))
                f.lines = faded(from, q); f.text = q; f.rule = 1; f.done = t >= S + out
                return f
            }
            let g = glide(clamp((t - S) / land))
            let after = t - S - land
            let fadeOut = 1 - ease(clamp(after / out))
            var lines: [Line] = []
            if var first = from.first, t < S + land + handoff {
                let to = targets.rule ?? Target(x: first.x, y: first.y, w: first.w)
                let red = after < 0 ? ease(clamp((t - S) / ruleInk)) : 1 - ease(clamp(after / ruleInk))
                let ink = after < 0 ? 0 : ease(clamp(after / ruleInk))
                first.x = mix(first.x, to.x, g); first.y = mix(first.y, to.y, g); first.w = mix(first.w, to.w, g)
                first.h = t - S < land / 2 ? 1 : ruleH
                first.o = targets.rule != nil ? 1 : fadeOut
                first.accent = targets.rule != nil ? red : 0
                first.ink = targets.rule != nil ? ink : 0
                lines.append(first)
            }
            for (i, line) in from.dropFirst().enumerated() {
                var s = line
                if i < targets.rows.count {
                    let r = targets.rows[i]
                    s.x = mix(s.x, r.x, g); s.y = mix(s.y, r.y, g); s.w = mix(s.w, r.w, g); s.o = fadeOut
                } else {
                    s.o = 1 - ease(clamp((t - S) / ruleInk))
                }
                lines.append(s)
            }
            f.lines = lines.filter { $0.o > 0 }
            f.text = ease(clamp(after / text))
            f.rise = rise * CGFloat(1 - glide(clamp(after / text)))
            f.rule = after >= handoff ? 1 : 0
            f.done = after >= handoff && after >= text
            return f
        }
        f.lines = stackAt(t, box, still: st.reduce)
        return f
    }

    // De onderlijnen van de kopregels, zoals SwiftUI de kop zet: dezelfde letter (systeem-serif,
    // vet, in de tekststijl), dezelfde breedte. Per regel van de kantlijn tot het eind, op de basislijn.
    static func headRows(_ title: String, style: Font.TextStyle, in frame: CGRect, max: Int = 3) -> [Target] {
        guard frame.width > 0, !title.isEmpty else { return [] }
        let base = UIFont.preferredFont(forTextStyle: uiStyle(style)).fontDescriptor
        let serif = base.withDesign(.serif) ?? base
        let descriptor = serif.withSymbolicTraits(.traitBold) ?? serif
        let font = UIFont(descriptor: descriptor, size: 0)
        let storage = NSTextStorage(string: title, attributes: [.font: font])
        let layout = NSLayoutManager()
        let container = NSTextContainer(size: CGSize(width: frame.width, height: .greatestFiniteMagnitude))
        container.lineFragmentPadding = 0
        layout.addTextContainer(container)
        storage.addLayoutManager(layout)
        var rows: [Target] = []
        layout.enumerateLineFragments(forGlyphRange: layout.glyphRange(for: container)) { rect, used, _, range, stop in
            let baseline = rect.minY + layout.location(forGlyphAt: range.location).y
            rows.append(Target(x: frame.minX + used.minX, y: (frame.minY + baseline).rounded(), w: used.width.rounded()))
            if rows.count >= max { stop.pointee = true }
        }
        return rows
    }
    private static func uiStyle(_ style: Font.TextStyle) -> UIFont.TextStyle {
        switch style {
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

// De toestand naast het laden, en hoe de inhoud erbij staat. Eén per scherm (@State).
@MainActor
@Observable
final class LoadLinesModel {
    enum Phase { case idle, loading, ending }
    private(set) var phase: Phase = .idle
    private(set) var state = LoadLines.State()
    var box: LoadLines.Box? // waar het laadvak het laatst stond, in het vlak van de laag
    var landing = false // er is een kop om op te landen (de Editie)
    private(set) var textShown = true
    private(set) var ruleShown = true
    private(set) var errShown = true
    private(set) var risen = true
    private var job: Task<Void, Never>?

    var active: Bool { phase != .idle }
    nonisolated static func clock() -> Double { CACurrentMediaTime() * 1000 }

    func start(reduce: Bool) {
        guard phase != .loading else { return }
        job?.cancel()
        phase = .loading
        state = LoadLines.State(t0: Self.clock(), reduce: reduce)
        textShown = false; ruleShown = false; errShown = false; risen = false
    }

    // Klaar (ok) of fout. De inhoud volgt dezelfde tijden als de tekening (LoadLines.frame).
    func finish(ok: Bool) {
        guard phase == .loading else { return }
        let now = Self.clock()
        if ok { state.doneAt = now } else { state.failAt = now }
        phase = .ending
        let D = now - state.t0
        let S = LoadLines.settleAt(D)
        job = Task { [weak self] in
            guard let self else { return }
            func wait(_ ms: Double) async -> Bool {
                if ms > 0 { try? await Task.sleep(for: .milliseconds(Int(ms.rounded()))) }
                return !Task.isCancelled
            }
            if !ok {
                if state.reduce {
                    withAnimation(LoadLines.easeAnimation(LoadLines.reduceFade)) { errShown = true }
                    guard await wait(LoadLines.reduceFade) else { return }
                } else {
                    guard await wait(S - D + LoadLines.errDelay) else { return }
                    withAnimation(LoadLines.easeAnimation(LoadLines.errIn)) { errShown = true }
                    guard await wait(LoadLines.errIn) else { return }
                }
            } else if state.reduce {
                ruleShown = true; risen = true
                withAnimation(LoadLines.easeAnimation(LoadLines.reduceFade)) { textShown = true }
                guard await wait(LoadLines.reduceFade) else { return }
            } else if D < LoadLines.early {
                textShown = true; ruleShown = true; risen = true
            } else if !landing {
                guard await wait(S - D) else { return }
                ruleShown = true; risen = true
                withAnimation(LoadLines.easeAnimation(LoadLines.out)) { textShown = true }
                guard await wait(LoadLines.out) else { return }
            } else {
                guard await wait(S - D + LoadLines.land) else { return }
                withAnimation(LoadLines.easeAnimation(LoadLines.text)) { textShown = true }
                withAnimation(LoadLines.glideAnimation(LoadLines.text)) { risen = true }
                guard await wait(LoadLines.handoff) else { return }
                ruleShown = true
            }
            textShown = true; ruleShown = true; errShown = true; risen = true
            phase = .idle
        }
    }
}

// Waar het laadvak, de kopstreep en de kop staan: ankers voor de laag over de scroll.
struct LoadLinesAnchors: PreferenceKey {
    var box: Anchor<CGRect>?
    var rule: Anchor<CGRect>?
    var head: Anchor<CGRect>?
    var title = ""
    var style: Font.TextStyle = .largeTitle
    static var defaultValue: LoadLinesAnchors { LoadLinesAnchors() }
    static func reduce(value: inout LoadLinesAnchors, nextValue: () -> LoadLinesAnchors) {
        let next = nextValue()
        if value.box == nil { value.box = next.box }
        if value.rule == nil { value.rule = next.rule }
        if value.head == nil, next.head != nil { value.head = next.head; value.title = next.title; value.style = next.style }
    }
}

// Het laadvak: houdt de plek vrij, één element voor VoiceOver, geen tekst in beeld.
struct LoadLinesBox: View {
    var label = LoadLines.label
    var body: some View {
        Color.clear
            .frame(maxWidth: .infinity, minHeight: LoadLines.box)
            .anchorPreference(key: LoadLinesAnchors.self, value: .bounds) { LoadLinesAnchors(box: $0) }
            .accessibilityElement()
            .accessibilityLabel(label)
    }
}

// De strepen zelf, op één beeld van de rekensom.
struct LoadLinesArt: View {
    let frame: LoadLines.Frame
    @Environment(\.displayScale) private var scale
    var body: some View {
        Canvas { context, _ in
            let snap = { (v: CGFloat) in (v * scale).rounded() / scale }
            for line in frame.lines where line.o > 0 {
                var layer = context
                layer.opacity = line.o
                let color = line.ink > 0 ? Theme.accent.mix(with: Theme.ink, by: line.ink) : line.accent > 0 ? Theme.ink3.mix(with: Theme.accent, by: line.accent) : Theme.ink3
                layer.fill(Path(CGRect(x: snap(line.x), y: snap(line.y), width: snap(line.w), height: line.h)), with: .color(color))
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct LoadLinesLayer: View {
    let model: LoadLinesModel
    let anchors: LoadLinesAnchors
    var body: some View {
        GeometryReader { proxy in
            let boxRect = anchors.box.map { proxy[$0] }
            let current = boxRect.map { LoadLines.Box(x: $0.minX, y: $0.minY, w: $0.width) }
            TimelineView(.animation(minimumInterval: nil, paused: !model.active || (model.state.reduce && model.phase == .loading))) { timeline in
                if model.active {
                    LoadLinesArt(frame: LoadLines.frame(state(proxy, current), now: LoadLines.clockMs(timeline.date)))
                }
            }
            .onChange(of: current, initial: true) { _, box in if let box { model.box = box } }
        }
        .allowsHitTesting(false)
    }

    private func state(_ proxy: GeometryProxy, _ current: LoadLines.Box?) -> LoadLines.State {
        var st = model.state
        st.box = current ?? model.box ?? LoadLines.Box(x: 0, y: 0, w: proxy.size.width)
        if model.landing, st.doneAt != nil {
            let rule = anchors.rule.map { proxy[$0] }.map { LoadLines.Target(x: $0.minX, y: $0.minY, w: $0.width) }
            let rows = anchors.head.map { LoadLines.headRows(anchors.title, style: anchors.style, in: proxy[$0]) } ?? []
            st.targets = LoadLines.Targets(rule: rule, rows: rows)
        }
        return st
    }
}

extension LoadLines {
    // De klok van de laag: dezelfde als LoadLinesModel.clock, maar van de tijdlijn.
    static func clockMs(_ date: Date) -> Double { LoadLinesModel.clock() + date.timeIntervalSinceNow * 1000 }
}

extension View {
    // Op de LazyVStack van een scherm: volgt het laden en tekent de strepen erover.
    // `landing`: op de kopstreep en de kop van het eerste verhaal landen (de Editie).
    func loadLines(_ model: LoadLinesModel, loading: Bool, ok: Bool, landing: Bool = false) -> some View {
        modifier(LoadLinesHost(model: model, loading: loading, ok: ok, landing: landing))
    }
    // De inhoud na het laden: tekst, de kopstreep, het foutblok en de rest die 8 pt stijgt.
    func loadLinesText(_ model: LoadLinesModel) -> some View { opacity(model.textShown ? 1 : 0) }
    func loadLinesError(_ model: LoadLinesModel) -> some View { opacity(model.errShown ? 1 : 0) }
    func loadLinesRule(_ model: LoadLinesModel) -> some View {
        opacity(model.ruleShown ? 1 : 0).anchorPreference(key: LoadLinesAnchors.self, value: .bounds) { LoadLinesAnchors(rule: $0) }
    }
    func loadLinesRise(_ model: LoadLinesModel) -> some View { offset(y: model.risen ? 0 : LoadLines.rise) }
    // De kop van het eerste verhaal: hier landen de drie strepen.
    func loadLinesHead(_ title: String, style: Font.TextStyle) -> some View {
        anchorPreference(key: LoadLinesAnchors.self, value: .bounds) { LoadLinesAnchors(head: $0, title: title, style: style) }
    }
}

private struct LoadLinesHost: ViewModifier {
    let model: LoadLinesModel
    let loading: Bool
    let ok: Bool
    let landing: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content
            .overlayPreferenceValue(LoadLinesAnchors.self) { anchors in LoadLinesLayer(model: model, anchors: anchors) }
            .onChange(of: loading, initial: true) { _, now in
                model.landing = landing
                if now { model.start(reduce: reduceMotion) } else { model.finish(ok: ok) }
            }
    }
}
