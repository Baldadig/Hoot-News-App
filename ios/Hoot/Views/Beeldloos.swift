import SwiftUI

// Beeldloos (build 46): een bericht zonder beeld krijgt een Hoot-placeholderbeeld dat het beeldvak precies
// vult. Eén plek, voor de app; het web spiegelt hem in Beeldloos (src/components/Beeld.jsx). Hij staat waar
// anders het beeld zou staan: het stuk heeft geen beeld, het beeld is te klein voor die plek, of het laadt
// niet. Nooit een grijs vlak en nooit een beeld van een ander artikel.
// Twaalf beelden in vijf sets (shared/placeholder.mjs, de tekening in PlaceholderBeelden.swift): welk, volgt
// uit de id van het artikel, en twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld en nooit
// dezelfde set (Placeholder.plan, via de omgeving). Het is decoratie: verborgen voor VoiceOver.
struct BeeldloosView: View {
    enum Kind { case lead, tijdlijn, krant }
    @Environment(HootStore.self) private var store
    @Environment(\.placeholderPlan) private var plan
    let item: Item
    let kind: Kind
    var height: CGFloat? = nil // hoofdverhaal op iPad liggend: zo hoog als de zijkolom
    var width: CGFloat = Layout.thumb // miniatuur: de breedte van het beeld dat er anders stond
    var ratio: CGFloat = 2 // breedte : hoogte van het grote vak (kaart A+: het hoofdverhaal is 3:2)
    var flat = false // tot de rand: geen hoek

    private var index: Int { plan[item.id] ?? Placeholder.base(item.id) }

    var body: some View {
        if store.showsImage(lead: kind == .lead) {
            switch kind {
            case .krant:
                PlaceholderBeeld(index: index, klein: true)
                    .frame(width: width, height: width * 2 / 3)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                    .accessibilityHidden(true)
            case .lead, .tijdlijn:
                // Hetzelfde vak als het beeld: 2:1 over de volle breedte (FramedImage), of een vaste hoogte.
                Group {
                    if let height {
                        Color.clear.frame(maxWidth: .infinity).frame(height: height)
                    } else {
                        Color.clear.aspectRatio(ratio, contentMode: .fit).frame(maxWidth: .infinity)
                    }
                }
                .overlay { PlaceholderBeeld(index: index, klein: false) }
                .clipShape(RoundedRectangle(cornerRadius: flat ? 0 : Radius.md, style: .continuous))
                .accessibilityHidden(true)
            }
        }
    }
}

// Beeld 1 tot 12 (index 0 tot 11), getekend op de echte maat. Het vult het vak als een foto (cover): de
// kortste kant past, de rest valt weg, gecentreerd. Zoals de SVG's met background-size: cover op het web.
struct PlaceholderBeeld: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.nachtActief) private var nacht
    let index: Int
    var klein = false

    private var theme: String { scheme == .dark ? (nacht ? "nacht" : "donker") : "licht" }

    var body: some View {
        let beeld = PlaceholderBeelden.beelden[index % PlaceholderBeelden.beelden.count]
        let t = (klein ? beeld.klein : nil) ?? beeld.groot
        let kleuren = PlaceholderBeelden.palettes[beeld.familie]?[theme] ?? [:]
        Canvas { ctx, size in
            func kleur(_ rol: String?) -> Color { Color(hex: rol.flatMap { kleuren[$0] } ?? 0) }
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

// De tekening (PlaceholderBeelden.swift, gegenereerd): een vlak van w × h, `clipY` de horizon.
struct PHVorm {
    enum Soort { case rect, line, circle }
    let soort: Soort
    // rect: x, y, breedte, hoogte; line: x1, y1, x2, y2; circle: cx, cy, r.
    let a: CGFloat, b: CGFloat, c: CGFloat, d: CGFloat
    var fill: String? = nil
    var stroke: String? = nil
    var sw: CGFloat = 0
    var fixed = false // altijd 1 punt dik, hoe groot het beeld ook is
    var clip = false // valt weg onder de horizon
}
struct PHTekening {
    let w: CGFloat, h: CGFloat
    let clipY: CGFloat?
    let vormen: [PHVorm]
}
struct PHBeeld {
    let familie: String
    let groot: PHTekening
    let klein: PHTekening?
}

// De keuze, gelijk aan shared/placeholder.mjs (tests/fixtures/placeholder.json draait op beide).
enum Placeholder {
    static let count = 12
    // Doorschuiven: drie verder valt altijd in een andere set (zon 3 · iris 3 · lijn 2 · raster 2 · stapel 2).
    static let shift = 3
    // De set van beeld k: zon, iris, lijn, raster of stapel.
    static func set(_ k: Int) -> String { PlaceholderBeelden.beelden[k].familie }
    // FNV-1a (32 bit) over de UTF-8-bytes van de id.
    static func fnv1a(_ s: String) -> UInt32 {
        var h: UInt32 = 0x811c9dc5
        for b in s.utf8 { h ^= UInt32(b); h = h &* 0x01000193 }
        return h
    }
    static func base(_ id: String) -> Int { Int(fnv1a(id) % UInt32(count)) }
    // Een lijst van boven naar onder: zit het beeld in dezelfde set als dat van de beeldloze rij erboven,
    // dan schuift het drie door, naar een andere set. Een rij met beeld breekt de reeks.
    static func plan(ids rows: [(id: String, bare: Bool)]) -> [String: Int] {
        var out: [String: Int] = [:]
        var prev: Int?
        for r in rows {
            guard r.bare else { prev = nil; continue }
            var k = base(r.id)
            if let prev, set(k) == set(prev) { k = (k + shift) % count }
            out[r.id] = k
            prev = k
        }
        return out
    }
    // Toont deze rij op deze plek het placeholderbeeld? Dezelfde regels als ItemRow en LeadCard.
    static func isBare(_ item: Item, _ kind: BeeldloosView.Kind) -> Bool {
        if item.isPost { return false }
        switch kind {
        case .lead: return !ImageURL.fitsHero(item.image)
        case .tijdlijn: return (item.image == nil && item.videoPoster == nil) || (item.image != nil && !ImageURL.fitsLarge(item.image))
        case .krant: return item.image == nil && item.videoPoster == nil
        }
    }
    // `failed`: stukken waarvan het beeld pas bij het laden mislukte (MisluktBeeld); die tonen ook het
    // placeholderbeeld, dus ook voor hen geldt de buurregel.
    static func plan(_ rows: [(Item, BeeldloosView.Kind)], failed: Set<String> = []) -> [String: Int] {
        plan(ids: rows.map { (id: $0.0.id, bare: isBare($0.0, $0.1) || (!$0.0.isPost && failed.contains($0.0.id))) })
    }
}

// Beelden die pas bij het laden mislukten (een 404, een cookiemuur): ItemRow en LeadCard melden ze hier,
// en de lijst (Editie, Stroom) rekent het placeholderplan dan opnieuw uit, zodat twee beeldloze buren
// nooit hetzelfde beeld krijgen. Zoals failed in PlaceholderList op het web.
@MainActor @Observable
final class MisluktBeeld {
    static let shared = MisluktBeeld()
    private(set) var ids: Set<String> = []
    func add(_ id: String) { if !ids.contains(id) { ids.insert(id) } }
}

private struct PlaceholderPlanKey: EnvironmentKey { static let defaultValue: [String: Int] = [:] }
extension EnvironmentValues {
    var placeholderPlan: [String: Int] {
        get { self[PlaceholderPlanKey.self] }
        set { self[PlaceholderPlanKey.self] = newValue }
    }
}

private extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}
