import CoreGraphics

// De vormen van de tien placeholderbeelden (de tekening staat in PlaceholderBeelden.swift, gegenereerd).
// Los van Beeldloos.swift, zodat ook de widgetextensie ze kan tekenen (HootWidgetShared/WidgetBeeldloos.swift).
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
