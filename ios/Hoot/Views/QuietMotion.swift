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

// Eén trek per losgelaten gebaar; de leespositie blijft bij een gewone scroll ongemoeid.
private struct HootRefresh: ViewModifier {
    let action: @MainActor () async -> Void
    @State private var pulled = false
    @State private var amount: CGFloat = 0
    @State private var busy = false
    private func refresh() {
        guard !busy else { return }
        pulled = false; busy = true
        Task { await action(); busy = false }
    }
    func body(content: Content) -> some View {
        content
            .onScrollGeometryChange(for: CGFloat.self) { max(0, -$0.contentOffset.y - $0.contentInsets.top) } action: { _, value in
                amount = value
                if value >= 72 && !busy { pulled = true }
            }
            .onScrollPhaseChange { old, new in
                if old == .interacting && new != .tracking && pulled { refresh() }
                if new == .idle { pulled = false }
            }
            .overlay(alignment: .top) {
                if busy || amount > 12 { WaitingMark().padding(.vertical, Space.s3).padding(.horizontal, Space.s4).background(Theme.paper, in: Capsule()).allowsHitTesting(false) }
            }
            .accessibilityAction(named: "Verversen") { refresh() }
    }
}
extension View {
    func hootRefresh(_ action: @escaping @MainActor () async -> Void) -> some View { modifier(HootRefresh(action: action)) }
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
