import SwiftUI

// Een verhaal zonder beeld krijgt in de widget het Hoot-placeholderbeeld, zoals in de app (BeeldloosView):
// dezelfde tien tekeningen (PlaceholderBeelden.swift, PlaceholderVormen.swift), gekozen uit de id van het
// stuk (Placeholder.base). Licht en donker; Nacht kent de widget niet. Decoratie: verborgen voor VoiceOver.
struct WidgetBeeldloos: View {
    @Environment(\.colorScheme) private var scheme
    let id: String

    // FNV-1a over de id, zoals Placeholder.base (shared/placeholder.mjs).
    static func index(_ id: String) -> Int {
        var h: UInt32 = 0x811c9dc5
        for b in id.utf8 { h ^= UInt32(b); h = h &* 0x01000193 }
        return Int(h % UInt32(PlaceholderBeelden.beelden.count))
    }

    var body: some View {
        let beeld = PlaceholderBeelden.beelden[Self.index(id)]
        let t = beeld.groot
        let kleuren = PlaceholderBeelden.palettes[beeld.familie]?[scheme == .dark ? "donker" : "licht"] ?? [:]
        Canvas { ctx, size in
            func kleur(_ rol: String?) -> Color {
                let hex = rol.flatMap { kleuren[$0] } ?? 0
                return Color(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
            }
            let s = max(size.width / t.w, size.height / t.h)
            let ox = (size.width - t.w * s) / 2, oy = (size.height - t.h * s) / 2
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(kleur("bg")))
            for v in t.vormen {
                ctx.drawLayer { layer in
                    if v.clip, let clipY = t.clipY { layer.clip(to: Path(CGRect(x: ox, y: oy, width: t.w * s, height: clipY * s))) }
                    switch v.soort {
                    case .rect:
                        let o = p(v.a, v.b)
                        layer.fill(Path(CGRect(x: o.x, y: o.y, width: max(1, v.c * s), height: max(1, v.d * s))), with: .color(kleur(v.fill)))
                    case .line:
                        var path = Path()
                        path.move(to: p(v.a, v.b))
                        path.addLine(to: p(v.c, v.d))
                        layer.stroke(path, with: .color(kleur(v.stroke)), lineWidth: v.fixed ? 1 : v.sw * s)
                    case .circle:
                        let c = p(v.a, v.b), r = v.c * s
                        let circle = Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
                        if v.fill != nil { layer.fill(circle, with: .color(kleur(v.fill))) }
                        if v.stroke != nil { layer.stroke(circle, with: .color(kleur(v.stroke)), lineWidth: v.fixed ? 1 : v.sw * s) }
                    }
                }
            }
        }
        .accessibilityHidden(true)
    }
}
