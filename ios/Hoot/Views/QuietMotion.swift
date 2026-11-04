import SwiftUI

struct WaitingMark: View {
    @Environment(\.accessibilityReduceMotion) private var still
    var size: CGFloat = 24
    var text = true
    var label = "Even kijken bij je bronnen"
    var body: some View {
        HStack(spacing: Space.s3) {
            ZStack {
                GlyphShape(glyphs: Brand.mark).fill(Theme.ink3)
                GlyphShape(glyphs: Brand.mark, part: .dot).fill(Theme.accent)
                    .phaseAnimator(still ? [1.0] : [1.0, 1.06, 0.92]) { view, scale in view.scaleEffect(scale, anchor: .bottomTrailing) } animation: { _ in .easeInOut(duration: 2.75) }
            }.frame(width: size * Brand.mark.size.width / Brand.mark.size.height, height: size).accessibilityHidden(true)
            if text { Text(label).font(.ui(.subheadline)).foregroundStyle(Theme.ink3) }
        }.accessibilityElement(children: .ignore).accessibilityLabel(label)
    }
}

struct StrongRule: View {
    var drawn = true
    @Environment(\.accessibilityReduceMotion) private var still
    var body: some View {
        Rectangle().fill(Theme.ink).frame(height: 2)
            .scaleEffect(x: still || drawn ? 1 : 0, anchor: .leading)
            .opacity(still && !drawn ? 0 : 1)
            .accessibilityHidden(true)
    }
}

// De trekafstand komt rechtstreeks van de scroll: geen tijdlijn tussen vinger en teken.
// Alleen loslaten boven de drempel ververst; terugtrekken onder de drempel annuleert.
struct RefreshPull {
    static let threshold: CGFloat = 72
    private(set) var amount: CGFloat = 0
    private(set) var dragging = false
    private(set) var armed = false
    private(set) var busy = false

    mutating func move(to value: CGFloat) {
        amount = value.isFinite ? max(0, value) : 0
        if dragging && !busy { armed = amount >= Self.threshold }
    }

    mutating func phase(from old: ScrollPhase, to new: ScrollPhase) -> Bool {
        if new == .tracking || new == .interacting {
            dragging = true
            armed = !busy && amount >= Self.threshold
            return false
        }
        let released = old == .interacting && (new == .decelerating || new == .idle) && armed && !busy
        dragging = false
        armed = false
        return released
    }

    mutating func begin() -> Bool {
        guard !busy else { return false }
        busy = true; armed = false
        return true
    }
    mutating func finish() { busy = false }
}

// Eén indicator, één plek: de horizon (Horizon v2, PullHorizon.swift). De trekstrook boven de titel is
// ook de laadstrook. De scroll zelf houdt de strook open (contentMargins), dus er verschuift niets bij
// loslaten of klaar.
enum RefreshStrip {
    static let loading: CGFloat = Horizon.strip
    // Op de bewegingsschaal (140 · 200 · 400): lijn en boog vervagen in dur-1 (vanaf 440 ms in de
    // ondergang), de strook glijdt dicht in dur-3 met ease-glide ("iets wisselt van plek").
    static let fadeOut: Double = 0.14
    static let close: Double = 0.4
    static var glide: Animation { .timingCurve(0.2, 0.8, 0.2, 1, duration: close) }
    // Hoogte van de lege strook boven de inhoud: tijdens laden de vaste ruimte plus een eventuele extra trek.
    static func gap(amount: CGFloat, busy: Bool) -> CGFloat {
        let pulled = amount.isFinite ? max(0, amount) : 0
        return busy ? loading + pulled : pulled
    }
}

// De strook met het teken, tussen de bovenrand van de scroll en de inhoud. Trekken: de zichtbare
// afstand stuurt de tekening rechtstreeks (geen tijdlijn tussen vinger en teken). Daarna: `mark`.
struct PullHorizonStrip: View {
    let amount: CGFloat
    var busy = false
    var mark = HorizonState()
    var reduceMotion = false
    var armed = false
    var armedSince: Double? = nil
    var height: CGFloat? = nil // tijdens dichtglijden
    var frozen: Double? = nil
    var body: some View {
        let distance = height ?? RefreshStrip.gap(amount: amount, busy: busy)
        let state = busy ? mark : HorizonState(phase: .pull, pull: Double(amount), reduce: reduceMotion)
        HorizonPullMark(state: state, armed: armed, armedSince: armedSince, frozen: frozen)
            .frame(maxWidth: .infinity)
            .frame(height: max(0, distance))
            .clipped()
            .allowsHitTesting(false)
    }
}

private struct HootRefresh: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var still
    let action: @MainActor () async -> Void
    var indicator = true
    var failed: (@MainActor () -> Bool)? = nil
    var label = "Editie"
    @State private var pull = RefreshPull()
    @State private var mark = HorizonState()
    @State private var armedSince: Double? = nil
    @State private var closing: CGFloat? = nil // hoogte van de strook terwijl hij dichtglijdt
    @State private var failCount = 0
    private func announce(_ text: String) { if indicator { AccessibilityNotification.Announcement(text).post() } }
    private func wait(until ms: Double) async {
        let d = ms - Horizon.now()
        if d > 0 { try? await Task.sleep(for: .milliseconds(Int(d.rounded(.up)))) }
    }
    private func refresh() {
        guard withAnimation(settle, { pull.begin() }) else { return }
        mark = HorizonState(phase: .load, reduce: still, loadT0: Horizon.now())
        announce("Bezig met verversen")
        Task {
            await action()
            if DebugLaunch.refreshDelay > 0 { try? await Task.sleep(for: .seconds(DebugLaunch.refreshDelay)) }
            guard indicator else { withAnimation(settle) { pull.finish() }; return }
            // Het antwoord wacht zolang je opnieuw trekt; daarna loopt de dag af: doorlopen, ondergang, dicht.
            while pull.dragging { try? await Task.sleep(for: .milliseconds(50)) }
            let ok = !(failed?() ?? false)
            mark = Horizon.answer(mark, now: Horizon.now(), ok: ok)
            if ok { announce("\(label) ververst") } else { failCount += 1; announce("Verversen lukte niet") }
            if mark.phase == .go {
                await wait(until: Horizon.setAt(mark))
                mark.setT0 = Horizon.setAt(mark); mark.phase = .set
            }
            await wait(until: Horizon.closeAt(mark))
            // Eerst is het teken onder (of vervaagd), dan glijdt de strook dicht: het ligt nooit over de inhoud.
            closing = RefreshStrip.gap(amount: pull.amount, busy: true)
            withAnimation(settle) { closing = 0; pull.finish() }
            if !still { try? await Task.sleep(for: .seconds(RefreshStrip.close + 0.05)) }
            closing = nil
            mark = HorizonState()
        }
    }
    // Strook en teken openen en sluiten in één rustige beweging; bij Verminder beweging direct.
    private var settle: Animation? { still ? nil : RefreshStrip.glide }
    private var reserved: CGFloat { indicator && pull.busy ? RefreshStrip.loading : 0 } // blijft open tot het teken weg is
    func body(content: Content) -> some View {
        content
            // De strook wordt door de scroll zelf opengehouden en klapt rustig dicht; bij Verminder beweging direct.
            .contentMargins(.top, reserved, for: .scrollContent)
            .onScrollGeometryChange(for: CGFloat.self) { max(0, -$0.contentOffset.y - $0.contentInsets.top) } action: { _, value in
                pull.move(to: value)
            }
            .onScrollPhaseChange { old, new in
                if pull.phase(from: old, to: new) { refresh() }
            }
            .onChange(of: pull.armed) { _, _ in armedSince = Horizon.now() }
            .overlay(alignment: .top) {
                if indicator && (pull.busy || pull.amount >= 1 || closing != nil) {
                    PullHorizonStrip(amount: pull.amount, busy: pull.busy || closing != nil, mark: mark, reduceMotion: still,
                                     armed: pull.armed, armedSince: armedSince, height: closing)
                        // Geen tijdlijn tussen vinger en teken; alleen het dichtglijden loopt met de strook mee.
                        .transaction { if closing == nil { $0.animation = nil } }
                }
            }
            // Eén zachte tik op de drempel (alleen van onder naar boven), een zachtere bij een fout.
            .sensoryFeedback(.impact(flexibility: .soft, intensity: 0.6), trigger: pull.armed) { old, new in !old && new }
            .sensoryFeedback(.impact(flexibility: .soft, intensity: 0.4), trigger: failCount)
            .accessibilityAction(named: "Verversen") { refresh() }
    }
}
extension View {
    // `indicator: false` voor een scherm dat zelf al een wachtteken toont (leeg, eerste keer laden).
    // `failed`: na het laden, is het verversen mislukt? Dan gaat de zon terug onder en staat de zin 2 s.
    // `label`: wat er ververst is, voor VoiceOver ("Editie ververst").
    func hootRefresh(indicator: Bool = true, label: String = "Editie", failed: (@MainActor () -> Bool)? = nil,
                     _ action: @escaping @MainActor () async -> Void) -> some View {
        modifier(HootRefresh(action: action, indicator: indicator, failed: failed, label: label))
    }
}

// De lege bladzijde: dezelfde composities als de SVG's op het web (icons.jsx), uit de beeldtaal van
// Brand Guide v2.2 (06b), op een raster van 96. Zon op de horizon (01) overal, behalve Zoeken: daar
// het raster met één punt (04). Eén rode punt per tekening; nooit in de leeslaag.
enum EmptyPageKind { case saved, search, bluesky, stream, edition
    init(symbol: String) {
        if symbol.contains("bookmark") { self = .saved }
        else if symbol.contains("magnifyingglass") { self = .search }
        else if symbol.contains("at") || symbol.contains("butterfly") { self = .bluesky }
        else if symbol.contains("wave") { self = .stream }
        else { self = .edition }
    }
    enum Composition { case horizon, raster }
    var composition: Composition { self == .search ? .raster : .horizon }
}
enum EmptyPageLayer { case line, thin, dots, dot }
private struct EmptyPageShape: Shape {
    let kind: EmptyPageKind
    let layer: EmptyPageLayer
    func path(in rect: CGRect) -> Path {
        var p = Path()
        func line(_ a: CGPoint, _ b: CGPoint) { p.move(to: a); p.addLine(to: b) }
        switch (kind.composition, layer) {
        case (.horizon, .line):
            p.addArc(center: .init(x: 48, y: 64), radius: 24, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
            line(.init(x: 8, y: 64), .init(x: 80, y: 64))
        case (.horizon, .thin):
            line(.init(x: 20, y: 76.5), .init(x: 64, y: 76.5)); line(.init(x: 20, y: 84.5), .init(x: 44, y: 84.5))
        case (.horizon, .dot):
            p.addEllipse(in: CGRect(x: 82, y: 59, width: 8, height: 8))
        case (.raster, .dots):
            for y in stride(from: 16.0, through: 80, by: 16) { for x in stride(from: 16.0, through: 80, by: 16) where !(x == 64 && y == 64) {
                p.addEllipse(in: CGRect(x: x - 1.5, y: y - 1.5, width: 3, height: 3))
            } }
        case (.raster, .dot):
            p.addEllipse(in: CGRect(x: 60, y: 60, width: 8, height: 8))
        default: break
        }
        return p.applying(CGAffineTransform(scaleX: rect.width / 96, y: rect.height / 96))
    }
}
struct EmptyPageArt: View {
    let kind: EmptyPageKind
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.nachtActief) private var nacht
    @State private var drawn: CGFloat = 0
    @State private var detail = false
    // --art-thin: dunne regels en rasterpunten in inkt; in Nacht ink3, niets fel.
    private var thin: Color { nacht ? Theme.ink3 : Theme.ink }
    var body: some View {
        ZStack {
            EmptyPageShape(kind: kind, layer: .line).trim(from: 0, to: still ? 1 : drawn).stroke(Theme.ink, lineWidth: 2)
            EmptyPageShape(kind: kind, layer: .thin).trim(from: 0, to: still ? 1 : drawn).stroke(thin, lineWidth: 1)
            EmptyPageShape(kind: kind, layer: .dots).fill(thin)
            EmptyPageShape(kind: kind, layer: .dot).fill(Theme.accent).opacity(still || detail ? 1 : 0)
        }.frame(width: Layout.emptyIcon, height: Layout.emptyIcon).accessibilityHidden(true)
            .task {
                guard !still else { drawn = 1; detail = true; return }
                withAnimation(.timingCurve(0.2,0.8,0.2,1,duration: 0.4)) { drawn = 1 }
                try? await Task.sleep(for: .milliseconds(400))
                guard !Task.isCancelled else { return }
                withAnimation(.easeOut(duration: 0.14)) { detail = true }
            }
    }
}

enum EditionPrint {
    static func shouldPlay(id: String?, lastSeen: String, ready: Bool = true, afterIris: Bool = true) -> Bool {
        guard let id, !id.isEmpty else { return false }
        return id != lastSeen && ready && afterIris
    }
}
