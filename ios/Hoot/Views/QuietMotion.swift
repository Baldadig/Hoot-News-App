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
            if text { Text(label).font(.subheadline).foregroundStyle(Theme.ink3) }
        }.accessibilityElement(children: .ignore).accessibilityLabel(label)
    }
}

// Goedgekeurde refreshlader: de h blijft staan, alleen de punt maakt een kleine rustige sprong.
// Geen zichtbare laadzin, wel een passende naam voor VoiceOver. De gereserveerde strook voorkomt overlap.
struct RefreshLoadingMark: View {
    @Environment(\.accessibilityReduceMotion) private var still
    var size: CGFloat = 28
    var reduceMotion: Bool? = nil
    var body: some View {
        ZStack {
            GlyphShape(glyphs: Brand.mark).fill(Theme.ink3)
            GlyphShape(glyphs: Brand.mark, part: .dot).fill(Theme.accent)
                .phaseAnimator((reduceMotion ?? still) ? [0] : [0, 1, 2]) { dot, phase in
                    dot.offset(y: phase == 1 ? -2 : 0)
                        .scaleEffect(phase == 1 ? 0.96 : phase == 2 ? 1.04 : 1, anchor: .bottom)
                } animation: { phase in
                    .easeInOut(duration: phase == 1 ? 0.675 : phase == 2 ? 0.375 : 0.45)
                }
        }
        .frame(width: size * Brand.mark.size.width / Brand.mark.size.height, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Bezig met verversen")
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

// Het echte h.-pad. De punt zakt met de trek in zijn eigen plek; verder trekken geeft
// nog een kleine beweging. Alles blijft binnen de lege trekruimte boven de titel.
struct PullRefreshMark: View {
    let amount: CGFloat
    var reduceMotion = false
    private let height: CGFloat = 28
    var body: some View {
        let distance = max(0, amount)
        let progress = min(1, distance / RefreshPull.threshold)
        let dotTravel = -10 * (1 - progress) + min(6, max(0, distance - RefreshPull.threshold) / 12)
        ZStack {
            GlyphShape(glyphs: Brand.mark).fill(Theme.ink3)
            GlyphShape(glyphs: Brand.mark, part: .dot).fill(Theme.accent)
                .offset(y: reduceMotion ? 0 : dotTravel)
        }
        .frame(width: height * Brand.mark.size.width / Brand.mark.size.height, height: height)
        .opacity(min(1, max(0, (distance - 12) / 24)))
        .frame(maxWidth: .infinity)
        .frame(height: distance)
        .clipped()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .transaction { $0.animation = nil }
    }
}

private struct HootRefresh: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var still
    let action: @MainActor () async -> Void
    var indicator = true
    var onWaiting: ((Bool) -> Void)? = nil
    @State private var pull = RefreshPull()
    private func refresh() {
        guard pull.begin() else { return }
        Task { await action(); pull.finish() }
    }
    func body(content: Content) -> some View {
        content
            .onScrollGeometryChange(for: CGFloat.self) { max(0, -$0.contentOffset.y - $0.contentInsets.top) } action: { _, value in
                pull.move(to: value)
            }
            .onScrollPhaseChange { old, new in
                if pull.phase(from: old, to: new) { refresh() }
            }
            .overlay(alignment: .top) {
                if indicator && !pull.busy && pull.amount > 12 {
                    PullRefreshMark(amount: pull.amount, reduceMotion: still)
                }
            }
            // Schermen kunnen de stille lader onder hun titel plaatsen. Anders reserveert de modifier
            // hier een eigen strook: ook bij laden nooit over de inhoud tekenen.
            .safeAreaInset(edge: .top, spacing: 0) {
                if indicator && pull.busy && onWaiting == nil {
                    RefreshLoadingMark().frame(maxWidth: .infinity, minHeight: 56)
                }
            }
            // De stille lader verschijnt pas tijdens het verzoek, niet al bij trekken.
            .onChange(of: pull.busy) { _, value in onWaiting?(value) }
            .onDisappear { onWaiting?(false) }
            .accessibilityAction(named: "Verversen") { refresh() }
    }
}
extension View {
    func hootRefresh(indicator: Bool = true, onWaiting: ((Bool) -> Void)? = nil, _ action: @escaping @MainActor () async -> Void) -> some View {
        modifier(HootRefresh(action: action, indicator: indicator, onWaiting: onWaiting))
    }
}

// De lege bladzijde: dezelfde paden en het rode detail als de SVG's op het web.
enum EmptyPageKind { case saved, search, bluesky, stream, edition
    init(symbol: String) {
        if symbol.contains("bookmark") { self = .saved }
        else if symbol.contains("magnifyingglass") { self = .search }
        else if symbol.contains("at") || symbol.contains("butterfly") { self = .bluesky }
        else if symbol.contains("wave") { self = .stream }
        else { self = .edition }
    }
}
private struct EmptyPageShape: Shape {
    let kind: EmptyPageKind
    var accent = false
    func path(in rect: CGRect) -> Path {
        var p = Path()
        func line(_ points: [CGPoint]) { guard let first = points.first else { return }; p.move(to: first); for point in points.dropFirst() { p.addLine(to: point) } }
        if !accent {
            p.addRoundedRect(in: CGRect(x: 22, y: 14, width: 52, height: 68), cornerSize: CGSize(width: 2, height: 2))
            line([.init(x: 30,y: 30),.init(x: 46,y: 30)]); line([.init(x: 30,y: 38),.init(x: 52,y: 38)])
            if kind == .saved || kind == .edition { for (y, length) in [(46.0,18.0),(54.0,22.0),(62.0,14.0)] { line([.init(x: 30,y: y),.init(x: 30 + length,y: y)]) } }
        } else {
            switch kind {
            case .saved:
                line([.init(x: 58,y: 10),.init(x: 58,y: 34),.init(x: 62,y: 29),.init(x: 66,y: 34),.init(x: 66,y: 10)])
            case .search:
                p.addEllipse(in: CGRect(x: 44,y: 48,width: 20,height: 20)); line([.init(x: 61,y: 65),.init(x: 69,y: 73)])
            case .bluesky:
                p.addEllipse(in: CGRect(x: 43.5,y: 55.5,width: 9,height: 9))
                p.addArc(center: .init(x: 48,y: 60), radius: 11.5, startAngle: .degrees(0), endAngle: .degrees(310), clockwise: false)
                line([.init(x: 52.5,y: 56),.init(x: 52.5,y: 64),.init(x: 59.5,y: 64),.init(x: 59.5,y: 60)])
            case .stream:
                for y in [50.0,60.0,70.0] { p.move(to: .init(x: 30,y: y)); p.addCurve(to: .init(x: 66,y: y), control1: .init(x: 42,y: y-8), control2: .init(x: 54,y: y+8)) }
            case .edition:
                line([.init(x: 58,y: 14),.init(x: 58,y: 24),.init(x: 74,y: 24)])
            }
        }
        return p.applying(CGAffineTransform(scaleX: rect.width / 96, y: rect.height / 96))
    }
}
struct EmptyPageArt: View {
    let kind: EmptyPageKind
    @Environment(\.accessibilityReduceMotion) private var still
    @State private var drawn: CGFloat = 0
    @State private var detail = false
    var body: some View {
        ZStack {
            EmptyPageShape(kind: kind).trim(from: 0, to: still ? 1 : drawn).stroke(Theme.edge, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            EmptyPageShape(kind: kind, accent: true).stroke(Theme.accent, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)).opacity(still || detail ? 1 : 0)
        }.frame(width: 96, height: 96).accessibilityHidden(true)
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
