import SwiftUI

// Het opstartscherm als lader. iOS toont eerst het vaste opstartscherm (Info.plist: BrandRed met
// LaunchMark); dit scherm ligt daar precies op, zodat je geen overgang ziet, alleen dat de punt
// gaat stuiteren. Het blijft staan tot er iets te lezen is: minstens één sprong, hooguit een paar
// seconden. Met "Verminder beweging" staat de punt stil.
struct SplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var handoff: BrandHandoff? = nil // waar "hoot." in het welkom staat, en of de overgang erheen loopt

    // Maten van LaunchMark: de SVG (viewBox 239,45 × 73,5) wordt passend getekend in 160 × 49 pt, dus
    // op schaal 49 / 73,5 met een smalle rand links en rechts. De punt staat op (231,75; 65,8), r 7,7.
    private static let scale = 49 / 73.5
    private static let inset = (160 - 239.45 * scale) / 2
    private static let dotSize = 7.7 * 2 * scale
    private static let dotCenter = CGPoint(x: inset + 231.75 * scale, y: 65.8 * scale)
    private static let paperWhite = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE8 / 255) // als in LaunchMark

    // Eén sprong duurt 1,6 s, als een balletje: omhoog dat afremt, omlaag dat versnelt, een klein
    // deukje bij het landen, een mini-naveer, en dan even stil. Klein gehouden: het is een lader.
    static let bounce: TimeInterval = 1.6

    private struct Pose { var y = 0.0, sx = 1.0, sy = 1.0 }

    var body: some View {
        let leaving = handoff?.leaving == true
        let time = handoff?.duration ?? 1
        GeometryReader { geo in
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            let word = leaving ? handoff?.word : nil
            let target = leaving ? handoff?.dot : nil
            // Het rood als cirkel die het hele scherm vult; bij het vertrek sluit hij als een iris tot de
            // rode punt van "hoot." in het welkom.
            let full = hypot(geo.size.width, geo.size.height) * 1.1
            let disc = Circle()
                .frame(width: target?.width ?? full, height: target?.height ?? full)
                .position(target.map { CGPoint(x: $0.midX, y: $0.midY) } ?? center)
            ZStack {
                disc.foregroundStyle(Theme.brandRed)
                mark(leaving: leaving, time: time)
                    // Het woordmerk landt eerst precies op "hoot." in het welkom (punt op punt), daarna
                    // veegt de rand van het rood de witte letters weg en staat de inkt eronder er al.
                    .scaleEffect(Self.fit(word))
                    .position(Self.place(word, dot: target) ?? center)
                    .transaction { if $0.animation != nil { $0.animation = .smooth(duration: time * 0.5) } }
                    .mask { disc }
            }
        }
        // Midden op het hele scherm, zoals iOS het opstartscherm plaatst (niet binnen de veilige zone).
        .ignoresSafeArea()
        .accessibilityElement()
        .accessibilityLabel("Hoot laadt")
    }

    // Het woord "hoot" (zonder punt) loopt in LaunchWord van de linkerrand tot x 222 van de viewBox.
    private static let wordWidth = 222 * scale
    private static func fit(_ word: CGRect?) -> CGFloat { word.map { $0.width / wordWidth } ?? 1 }
    // Het midden van het woordmerk zo dat zijn punt precies op de punt in het welkom valt.
    private static func place(_ word: CGRect?, dot: CGRect?) -> CGPoint? {
        guard let dot else { return nil }
        let s = fit(word)
        return CGPoint(x: dot.midX - (dotCenter.x - 80) * s, y: dot.midY - (dotCenter.y - 24.5) * s)
    }

    private func mark(leaving: Bool, time: Double) -> some View {
        ZStack(alignment: .topLeading) {
            Image("LaunchWord")
            Group { if reduceMotion { dot.position(Self.dotCenter) } else { bouncing } }
                // De witte punt gaat op in het rood: aan het eind is de rode punt de enige.
                .opacity(leaving ? 0 : 1)
                .transaction { if $0.animation != nil { $0.animation = .easeOut(duration: time * 0.35) } }
        }
        .frame(width: 160, height: 49)
    }

    // Eén sprong duurt 1,6 s (zie `bounce`).
    private var bouncing: some View {
        KeyframeAnimator(initialValue: Pose(), repeating: true) { p in
            dot
                .scaleEffect(x: p.sx, y: p.sy, anchor: .bottom) // deuk vanaf de onderkant van de punt zelf
                .offset(y: p.y)
                .position(Self.dotCenter)
        } keyframes: { _ in
            // Begint rond en stil, net als het vaste opstartscherm: geen sprongetje bij de overgang.
            KeyframeTrack(\.y) {
                LinearKeyframe(-9, duration: 0.42, timingCurve: .easeOut)
                LinearKeyframe(0, duration: 0.36, timingCurve: .easeIn)
                LinearKeyframe(-2, duration: 0.14, timingCurve: .easeOut)
                LinearKeyframe(0, duration: 0.14, timingCurve: .easeIn)
                LinearKeyframe(0, duration: 0.54)
            }
            KeyframeTrack(\.sx) {
                LinearKeyframe(0.96, duration: 0.2, timingCurve: .easeOut)
                LinearKeyframe(1, duration: 0.22)
                LinearKeyframe(0.97, duration: 0.3, timingCurve: .easeIn)
                LinearKeyframe(1.12, duration: 0.06)
                LinearKeyframe(1, duration: 0.16, timingCurve: .easeOut)
                LinearKeyframe(1, duration: 0.66)
            }
            KeyframeTrack(\.sy) {
                LinearKeyframe(1.04, duration: 0.2, timingCurve: .easeOut)
                LinearKeyframe(1, duration: 0.22)
                LinearKeyframe(1.03, duration: 0.3, timingCurve: .easeIn)
                LinearKeyframe(0.88, duration: 0.06)
                LinearKeyframe(1, duration: 0.16, timingCurve: .easeOut)
                LinearKeyframe(1, duration: 0.66)
            }
        }
    }

    private var dot: some View {
        Circle()
            .fill(Self.paperWhite)
            .frame(width: Self.dotSize, height: Self.dotSize)
    }
}

