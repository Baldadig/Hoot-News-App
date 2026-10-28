import SwiftUI

// Het opstartscherm als lader. iOS toont eerst het vaste opstartscherm (Info.plist: BrandRed met
// LaunchMark); dit scherm ligt daar precies op, zodat je geen overgang ziet, alleen dat de punt
// gaat stuiteren. Het blijft staan tot er iets te lezen is: minstens één sprong, hooguit een paar
// seconden. Met "Verminder beweging" staat de punt stil.
struct SplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

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
        ZStack {
            Theme.brandRed
            ZStack(alignment: .topLeading) {
                Image("LaunchWord")
                if reduceMotion {
                    dot.position(Self.dotCenter)
                } else {
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
            }
            .frame(width: 160, height: 49)
        }
        // Midden op het hele scherm, zoals iOS het opstartscherm plaatst (niet binnen de veilige zone).
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
        .accessibilityElement()
        .accessibilityLabel("Hoot laadt")
    }

    private var dot: some View {
        Circle()
            .fill(Self.paperWhite)
            .frame(width: Self.dotSize, height: Self.dotSize)
    }
}
