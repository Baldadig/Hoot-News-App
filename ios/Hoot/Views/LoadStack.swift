import SwiftUI

// De laadstapel: het wachtbeeld bij het eerste laden van Editie, Stroom, Selectie en Bluesky
// ("Even kijken bij je bronnen", nu zonder zin in beeld; VoiceOver hoort de zin wel). Vellen schuiven
// rustig op elkaar tot een nette stapel: je bronnen worden verzameld. Alleen geometrie, geen h. en geen
// logo, en bewust anders dan de Horizon van trek-om-te-verversen. Gelijk aan src/lib/loadStack.js.
//
// Vak 80 × 64 pt. Vier vellen van 40 × 24 pt, elk 8 pt naar rechts en 8 pt omlaag op het vorige (hoeken
// op 8 · 16 · 24 · 32): kaarten schuin op elkaar, geen menu van gelijke lijnen. Papier met een haarlijn
// van 1 pt in inkt 3. Lus 1600 ms, telkens één beweging (ease-glide): 0–400 de stapel schuift een plek
// naar achter (8 pt linksboven) en het achterste vel vervaagt; 400–800 een nieuw vel schuift van rechts
// (16 pt) vooraan op; 800–1600 stil. Klaar: de stapel staat, het voorste vel krijgt één rode kopregel
// (16 × 2, 200 ms) en alles vervaagt naar de Editie (240 ms). Verminder beweging: een stilstaande stapel.
enum LoadStackGeometry {
    static let width: CGFloat = 80
    static let box: CGFloat = 64
    static let sheet = CGSize(width: 40, height: 24)
    static let rhythm: CGFloat = 8
    static let loop: Double = 1.6
    static let step: Double = 0.4
    static let slide: CGFloat = 16
    static let kop = CGRect(x: 40, y: 40, width: 16, height: 2)
    static let kopIn: Double = 0.2
    static let fadeOut: Double = 0.24
    static var done: Double { kopIn + fadeOut }

    struct Sheet: Equatable { var x: CGFloat; var y: CGFloat; var width: CGFloat; var height: CGFloat; var opacity: Double
        var rect: CGRect { CGRect(x: x, y: y, width: width, height: height) }
    }
    static func corner(_ k: Int) -> CGFloat { 8 + rhythm * CGFloat(k) }
    static func slot(_ k: Int, x: CGFloat = 0, opacity: Double = 1) -> Sheet {
        Sheet(x: corner(k) + x, y: corner(k), width: sheet.width, height: sheet.height, opacity: opacity)
    }
    // --ease-glide: cubic-bezier(0.2, 0.8, 0.2, 1), dezelfde oplossing als op het web.
    static func glide(_ t: Double) -> Double {
        let x1 = 0.2, y1 = 0.8, x2 = 0.2, y2 = 1.0
        let cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
        let cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
        let v = min(1, max(0, t))
        var u = v
        for _ in 0..<8 {
            let e = ((ax * u + bx) * u + cx) * u - v, d = (3 * ax * u + 2 * bx) * u + cx
            if abs(e) < 1e-6 || d == 0 { break }
            u -= e / d
        }
        return ((ay * u + by) * u + cy) * u
    }
    private static func mix(_ a: Sheet, _ b: Sheet, _ t: Double) -> Sheet {
        let f = CGFloat(t)
        return Sheet(x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, width: a.width + (b.width - a.width) * f, height: a.height, opacity: a.opacity + (b.opacity - a.opacity) * t)
    }
    // De vijf vellen (vier op de stapel en het nieuwe) op `seconds` in de lus; `still`: de rust.
    static func sheets(at seconds: Double, still: Bool = false) -> [Sheet] {
        let rest = (0..<4).map { slot($0) }
        let fresh = slot(3, x: slide, opacity: 0)
        if still { return rest + [fresh] }
        let c = (seconds.truncatingRemainder(dividingBy: loop) + loop).truncatingRemainder(dividingBy: loop)
        let a = c < step ? glide(c / step) : 1
        let b = c < step ? 0 : c < 2 * step ? glide((c - step) / step) : 1
        let back = (0..<4).map { k in mix(slot(k), slot(k - 1, opacity: k == 0 ? 0 : 1), a) }
        // Het nieuwe vel is op de helft van zijn beweging al dicht: de stapel schemert er maar kort doorheen.
        var front = mix(fresh, slot(3), b)
        front.opacity = min(1, 2 * b)
        return back + [front]
    }
}

struct LoadStackArt: View {
    var sheets: [LoadStackGeometry.Sheet]
    var kop: Double = 0
    var body: some View {
        Canvas { context, _ in
            for sheet in sheets where sheet.opacity > 0 {
                var layer = context
                layer.opacity = sheet.opacity
                layer.fill(Path(sheet.rect), with: .color(Theme.paper))
                // Haarlijn van 1 pt een halve punt naar binnen: op 2x en 3x op hele pixels.
                layer.stroke(Path(sheet.rect.insetBy(dx: 0.5, dy: 0.5)), with: .color(Theme.ink3), lineWidth: 1)
            }
            if kop > 0 {
                var layer = context
                layer.opacity = kop
                layer.fill(Path(LoadStackGeometry.kop), with: .color(Theme.accent))
            }
        }
        .frame(width: LoadStackGeometry.width, height: LoadStackGeometry.box)
    }
}

// Klaar: de stapel staat (rust), de kopregel komt in 200 ms, daarna vervaagt alles in 240 ms.
// Als verwijder-overgang, zodat elk scherm dat de stapel weghaalt vanzelf zo eindigt.
struct LoadStackExit: ViewModifier, Animatable {
    var progress: Double
    nonisolated var animatableData: Double { get { progress } set { progress = newValue } }
    func body(content: Content) -> some View {
        let split = LoadStackGeometry.kopIn / LoadStackGeometry.done
        content
            .opacity(progress > 0 ? 0 : 1)
            .overlay {
                if progress > 0 {
                    LoadStackArt(sheets: LoadStackGeometry.sheets(at: 0, still: true), kop: min(1, progress / split))
                        .opacity(progress < split ? 1 : max(0, 1 - (progress - split) / (1 - split)))
                }
            }
    }
}
extension AnyTransition {
    static var loadStackDone: AnyTransition {
        .asymmetric(insertion: .identity, removal: .modifier(active: LoadStackExit(progress: 1), identity: LoadStackExit(progress: 0)))
            .animation(.linear(duration: LoadStackGeometry.done))
    }
}

struct LoadStackView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var label = "Even kijken bij je bronnen"
    var still: Bool? = nil
    var body: some View {
        let quiet = still ?? reduceMotion
        TimelineView(.animation(minimumInterval: nil, paused: quiet)) { timeline in
            LoadStackArt(sheets: LoadStackGeometry.sheets(at: timeline.date.timeIntervalSinceReferenceDate, still: quiet))
        }
        .frame(maxWidth: .infinity, minHeight: 240)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .transition(.loadStackDone)
    }
}
