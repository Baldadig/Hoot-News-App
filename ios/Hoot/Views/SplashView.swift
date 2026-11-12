import SwiftUI

// Het opstartscherm als lader. iOS toont eerst het vaste opstartscherm (Info.plist: BrandRed met
// LaunchMark); dit scherm ligt daar precies op, zodat je geen overgang ziet, alleen dat de punt
// gaat stuiteren. Het blijft staan tot er iets te lezen is: minstens één sprong, hooguit een paar
// seconden. Met "Verminder beweging" staat de punt stil.
// De overgang naar de app (BRAND-UPDATE §10, build 46 "alleen de iris"): het grote "hoot." vervaagt
// op zijn plek en beweegt niet, ook niet een beetje. Alleen het rode vlak sluit als een iris, met zijn
// middelpunt vanaf het begin op de gemeten punt van het kleine "hoot." linksboven: het middelpunt
// reist niet, alleen de straal krimpt. Daar kleurt het rood naar de kleur van die punt. De iris
// vertrekt als het woord half weg is. Gelijk aan splashTimes en irisKeyframes in src/lib/motion.js.
enum IrisTimes {
    static let fade = 0.28 // het woord vervaagt (40 % van de reis)
    static let delay = 0.14 // de iris vertrekt als het woord half weg is
    static let travel = 0.7 // de iris sluit en reist, curve 0,6 0 0,2 1
    static let tint = 0.21 // op de punt: het rood wordt de kleur van de punt
    static let reduced = Beweging.minder // Verminder beweging: niets reist, één vervaging
    static var total: Double { delay + travel + tint }
}

struct SplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var handoff: BrandHandoff? = nil // waar "hoot." staat (welkom of Editie), en of de overgang erheen loopt

    // Maten van LaunchMark: de SVG (viewBox 239,45 × 73,5) wordt passend getekend in 160 × 49 pt, dus
    // op schaal 49 / 73,5 met een smalle rand links en rechts. De punt staat op (231,75; 65,8), r 7,7.
    // Ook voor het kleine woordmerk van het welkom (`WelcomeMark`), dat dezelfde tekening is.
    static let size = CGSize(width: 160, height: 49)
    private static let scale = 49 / 73.5
    private static let inset = (160 - 239.45 * scale) / 2
    static let dotSize = 7.7 * 2 * scale
    static let dotCenter = CGPoint(x: inset + 231.75 * scale, y: 65.8 * scale)
    static let paperWhite = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE8 / 255) // als in LaunchMark

    // Eén sprong duurt 1,6 s, als een balletje: omhoog dat afremt, omlaag dat versnelt, een klein
    // deukje bij het landen, een mini-naveer, en dan even stil. Klein gehouden: het is een lader.
    static let bounce: TimeInterval = 1.6

    private struct Pose { var y = 0.0, sx = 1.0, sy = 1.0 }

    var body: some View {
        let leaving = handoff?.leaving == true
        let time = handoff?.duration ?? 1
        GeometryReader { geo in
            let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
            // Waar het heen gaat: "hoot." in het welkom of de Editie, of anders de eigen punt hier.
            let lands = handoff?.dot != nil
            // Naar de rode intro van het welkom: het rood blijft, alleen het woordmerk landt.
            let stays = handoff?.onRed == true
            // Alleen naar de rode intro reist het woord; naar de app vervaagt het op zijn plek.
            let word = leaving && lands && stays ? handoff?.word : nil
            let target = leaving ? (handoff?.dot ?? Self.ownDot(center)) : nil
            // Het rood als cirkel die het hele scherm vult; bij het vertrek sluit hij als een iris tot de
            // rode punt van "hoot.". Het middelpunt ligt al op die punt; alleen de straal beweegt.
            let shape = Self.iris(size: geo.size, target: stays ? nil : target ?? handoff?.dot ?? Self.ownDot(center), closed: leaving && !stays)
            let disc = IrisCircle(center: shape.center, radius: shape.radius)
            // Het kleuren op de punt houdt zijn eigen animatie (niet de vertraagde iriscurve).
            let tinting = handoff?.tinted == true
            ZStack {
                disc.fill(handoff?.tinted == true ? Theme.accent : Theme.brandRed)
                    // Eerst vervagen, dan sluiten: de iris vertrekt als het woord half weg is.
                    .transaction { if $0.animation != nil, !stays, leaving, !tinting { $0.animation = Beweging.iris(time).delay(IrisTimes.delay * time / IrisTimes.travel) } }
                mark(leaving: leaving, stays: stays, time: time)
                    // Naar de rode intro: het woordmerk landt precies op "hoot." in het welkom (punt op
                    // punt). Naar de app beweegt het niet en wordt het niet kleiner: het vervaagt.
                    .scaleEffect(Self.fit(word))
                    .position(Self.place(word, dot: target) ?? center)
                    .opacity(leaving && !stays ? 0 : 1)
                    .transaction {
                        guard $0.animation != nil else { return }
                        $0.animation = stays ? Beweging.iris(time * 0.55) : Beweging.bediening(IrisTimes.fade * time / IrisTimes.travel)
                    }
                    .mask {
                        disc.transaction { if $0.animation != nil, !stays, leaving, !tinting { $0.animation = Beweging.iris(time).delay(IrisTimes.delay * time / IrisTimes.travel) } }
                    }
            }
        }
        // Als één beeld vervagen: anders schemert het rood door de witte letters en worden ze even roze
        // (van de rode intro naar het welkom zie je dat, want daar ligt papier op papier).
        .compositingGroup()
        .opacity(handoff?.fading == true ? 0 : 1)
        .onAppear { handoff?.bounceStart = .now } // HootApp laat het woordmerk pas landen als de punt stilligt
        // Midden op het hele scherm, zoals iOS het opstartscherm plaatst (niet binnen de veilige zone).
        .ignoresSafeArea()
        .accessibilityElement()
        .accessibilityLabel("Hoot laadt")
    }

    // De iris: middelpunt en straal in schermcoördinaten. Met een doel staat het middelpunt vanaf het
    // eerste beeld op dat doel en verandert alleen de straal: open is hij de diagonaal van het scherm
    // (dekt alles vanuit elk middelpunt, als irisKeyframes op het web), dicht precies de punt.
    static func iris(size: CGSize, target: CGRect?, closed: Bool) -> (center: CGPoint, radius: CGFloat) {
        let open = hypot(size.width, size.height)
        guard let target else { return (CGPoint(x: size.width / 2, y: size.height / 2), open) }
        return (CGPoint(x: target.midX, y: target.midY), closed ? target.width / 2 : open)
    }

    // De punt van het opstartscherm zelf, in rust (het woordmerk staat midden op het scherm).
    static func ownDot(_ center: CGPoint) -> CGRect {
        CGRect(x: center.x - 80 + dotCenter.x - dotSize / 2, y: center.y - 24.5 + dotCenter.y - dotSize / 2, width: dotSize, height: dotSize)
    }

    // Het woord "hoot" (zonder punt) loopt in LaunchWord van de linkerrand tot x 222 van de viewBox.
    static let wordWidth = 222 * scale
    private static func fit(_ word: CGRect?) -> CGFloat { word.map { $0.width / wordWidth } ?? 1 }
    // Het midden van het woordmerk zo dat zijn punt precies op de punt in het welkom valt.
    // Zonder woord (naar de app) geen plek: dan blijft het woordmerk midden op het scherm staan. In
    // build 45 schoof het hier toch naar linksboven terwijl het vervaagde; dat was het rare.
    static func place(_ word: CGRect?, dot: CGRect?) -> CGPoint? {
        guard let word, let dot else { return nil }
        let s = word.width / wordWidth
        return CGPoint(x: dot.midX - (dotCenter.x - 80) * s, y: dot.midY - (dotCenter.y - 24.5) * s)
    }

    private func mark(leaving: Bool, stays: Bool, time: Double) -> some View {
        ZStack(alignment: .topLeading) {
            Image("LaunchWord")
            // Naar de rode intro staat de punt stil in zijn rust (HootApp wacht daarop) en reist hij
            // mee met het woordmerk: daar blijft hij papier. Zonder overvloeier tussen de twee.
            Group {
                if reduceMotion || (leaving && stays) {
                    dot.position(Self.dotCenter).transition(.identity)
                } else {
                    bouncing.transition(.identity)
                }
            }
            // Anders gaat de witte punt op in het rood: aan het eind is de rode punt de enige.
            .opacity(leaving && !stays ? 0 : 1)
            .transaction { if $0.animation != nil { $0.animation = Beweging.bediening(time * 0.35) } }
        }
        .frame(width: Self.size.width, height: Self.size.height)
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

// Een cirkel met een vast middelpunt waarvan alleen de straal animeert: een iris. Het middelpunt
// verspringt (onzichtbaar, zolang de cirkel het scherm dekt) maar reist nooit.
struct IrisCircle: Shape {
    var center: CGPoint
    var radius: CGFloat
    var animatableData: CGFloat {
        get { radius }
        set { radius = newValue }
    }
    func path(in rect: CGRect) -> Path {
        Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
    }
}
