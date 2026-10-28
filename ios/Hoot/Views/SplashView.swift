import SwiftUI

// Het opstartscherm als lader. iOS toont eerst het vaste opstartscherm (Info.plist: BrandRed met
// LaunchMark); dit scherm ligt daar precies op, zodat je geen overgang ziet, alleen dat de punt
// gaat stuiteren. Het blijft staan tot er iets te lezen is: minstens één sprong, hooguit een paar
// seconden. Met "Verminder beweging" staat de punt stil.
struct SplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // Maten van LaunchMark (160 × 49 pt, viewBox 239,45 breed): de punt staat op (231,75; 65,8), r 7,7.
    private static let scale = 160 / 239.45
    private static let dot = 7.7 * 2 * scale
    private static let dotCenter = CGPoint(x: 231.75 * scale, y: 65.8 * scale)
    private static let paperWhite = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE8 / 255) // als in LaunchMark

    // Eén sprong duurt 1,6 s: rustig omhoog, omlaag, landen met een deukje, even stil.
    static let bounce: TimeInterval = 1.6

    private struct Pose { var y = 0.0, sx = 1.0, sy = 1.0 }

    var body: some View {
        ZStack {
            Theme.brandRed
            ZStack(alignment: .topLeading) {
                Image("LaunchWord")
                if reduceMotion {
                    dotView
                } else {
                    KeyframeAnimator(initialValue: Pose(), repeating: true) { p in
                        dotView
                            .scaleEffect(x: p.sx, y: p.sy, anchor: .bottom)
                            .offset(y: p.y)
                    } keyframes: { _ in
                        // Begint rond en stil, net als het vaste opstartscherm: geen sprongetje bij de overgang.
                        KeyframeTrack(\.y) {
                            CubicKeyframe(-18, duration: 0.55)
                            CubicKeyframe(0, duration: 0.55)
                            LinearKeyframe(0, duration: 0.5)
                        }
                        KeyframeTrack(\.sx) {
                            CubicKeyframe(0.95, duration: 0.55)
                            CubicKeyframe(1, duration: 0.55)
                            CubicKeyframe(1.15, duration: 0.2)
                            CubicKeyframe(1, duration: 0.3)
                        }
                        KeyframeTrack(\.sy) {
                            CubicKeyframe(1.05, duration: 0.55)
                            CubicKeyframe(1, duration: 0.55)
                            CubicKeyframe(0.85, duration: 0.2)
                            CubicKeyframe(1, duration: 0.3)
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

    private var dotView: some View {
        Circle()
            .fill(Self.paperWhite)
            .frame(width: Self.dot, height: Self.dot)
            .offset(x: Self.dotCenter.x - Self.dot / 2, y: Self.dotCenter.y - Self.dot / 2)
    }
}
