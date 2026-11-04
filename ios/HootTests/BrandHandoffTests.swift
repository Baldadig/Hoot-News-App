import XCTest
@testable import Hoot

@MainActor final class BrandHandoffTests: XCTestCase {
    private let word = CGRect(x: 16, y: 65, width: 59.2, height: 19.6)
    private let dot = CGRect(x: 76, y: 81, width: 4.1, height: 4.1)

    func testLeavingOldTabCannotEraseTheNewVisibleTarget() {
        let handoff = BrandHandoff(), old = UUID(), visible = UUID()
        handoff.registerWord(word, owner: old)
        handoff.registerDot(dot, owner: old)
        let movedDot = dot.offsetBy(dx: 2, dy: 0)
        handoff.registerDot(movedDot, owner: visible)
        XCTAssertNil(handoff.word, "Geen woord van de oude tab combineren met de punt van de nieuwe")
        handoff.registerWord(word, owner: visible)
        handoff.clearTarget(owner: old)
        XCTAssertEqual(handoff.dot, movedDot)
        XCTAssertEqual(handoff.word, word)
        handoff.clearTarget(owner: visible)
        XCTAssertNil(handoff.word)
        XCTAssertNil(handoff.dot)
    }

    func testEitherGeometryCallbackOrderProducesOneCompleteTarget() {
        for dotFirst in [true, false] {
            let handoff = BrandHandoff(), owner = UUID()
            if dotFirst {
                handoff.registerDot(dot, owner: owner)
                handoff.registerWord(word, owner: owner)
            } else {
                handoff.registerWord(word, owner: owner)
                handoff.registerDot(dot, owner: owner)
            }
            XCTAssertEqual(handoff.word, word)
            XCTAssertEqual(handoff.dot, dot)
            XCTAssertEqual(handoff.targetOwner, owner)
        }
    }

    func testWelcomeCanStillReportItsOwnTargetWithoutTabOwnership() {
        let handoff = BrandHandoff()
        handoff.onRed = true
        handoff.registerDot(dot, owner: nil)
        handoff.registerWord(word, owner: nil)
        handoff.clearTarget(owner: UUID())
        XCTAssertEqual(handoff.dot, dot)
        XCTAssertEqual(handoff.word, word)
        XCTAssertTrue(handoff.onRed)
    }

    // Build 46: van het rode opstartscherm naar de app reist alleen de iris. Het woordmerk blijft
    // midden staan (het vervaagt), en de iris heeft van het eerste tot het laatste beeld hetzelfde
    // middelpunt: de punt van "hoot." linksboven.
    func testSplashMarkDoesNotMoveTowardsTheApp() {
        XCTAssertNil(SplashView.place(nil, dot: dot), "Zonder woord (naar de app) geen verplaatsing van het logo")
        XCTAssertNil(SplashView.place(word, dot: nil))
    }

    func testSplashMarkStillLandsDotOnDotOnTheRedIntro() {
        let at = SplashView.place(word, dot: dot)!
        let s = word.width / SplashView.wordWidth
        XCTAssertEqual(at.x + (SplashView.dotCenter.x - 80) * s, dot.midX, accuracy: 0.001)
        XCTAssertEqual(at.y + (SplashView.dotCenter.y - 24.5) * s, dot.midY, accuracy: 0.001)
    }

    func testSplashIrisOnlyShrinksAroundTheDot() {
        // SE, Pro Max en iPad (staand en liggend), met een punt linksboven en een grote tekstmaat.
        let screens = [CGSize(width: 375, height: 667), CGSize(width: 440, height: 956), CGSize(width: 1032, height: 1376), CGSize(width: 1376, height: 1032)]
        let dots = [dot, CGRect(x: 120, y: 70, width: 7.2, height: 7.2)]
        for size in screens {
            for d in dots {
                let open = SplashView.iris(size: size, target: d, closed: false)
                let closed = SplashView.iris(size: size, target: d, closed: true)
                XCTAssertEqual(open.center, closed.center, "Het middelpunt reist niet")
                XCTAssertEqual(closed.center, CGPoint(x: d.midX, y: d.midY), "Dicht ligt de iris precies op de punt")
                XCTAssertEqual(closed.radius, d.width / 2, accuracy: 0.0001)
                // Open dekt het hele scherm vanuit de punt: het eerste beeld is gelijk aan het opstartscherm.
                for corner in [CGPoint.zero, CGPoint(x: size.width, y: 0), CGPoint(x: 0, y: size.height), CGPoint(x: size.width, y: size.height)] {
                    XCTAssertGreaterThan(open.radius, hypot(corner.x - d.midX, corner.y - d.midY), "\(size) hoek \(corner)")
                }
            }
        }
        // Zonder doel (de rode intro): schermvullend vanuit het midden.
        let none = SplashView.iris(size: screens[0], target: nil, closed: true)
        XCTAssertEqual(none.center, CGPoint(x: 187.5, y: 333.5))
        XCTAssertGreaterThan(none.radius, hypot(187.5, 333.5))
    }

    func testIrisCircleAnimatesOnlyItsRadius() {
        var c = IrisCircle(center: CGPoint(x: 78, y: 83), radius: 500)
        c.animatableData = 2
        XCTAssertEqual(c.center, CGPoint(x: 78, y: 83))
        XCTAssertEqual(c.path(in: .zero).boundingRect, CGRect(x: 76, y: 81, width: 4, height: 4))
    }

    // De onboarding-iris (WelcomeView) heeft hetzelfde vaste middelpunt als het web en het opstartscherm:
    // open en dicht liggen op dezelfde plek (de punt), alleen de straal verschilt.
    func testWelcomeIrisKeepsItsCenterOnTheDot() {
        let size = CGSize(width: 375, height: 667)
        let origin = CGPoint(x: 0, y: 20)
        let dot = CGRect(x: 60, y: 100, width: 9, height: 9) // in schermcoördinaten
        let open = WelcomeView.irisShape(size: size, dot: dot, origin: origin, closed: false)
        let closed = WelcomeView.irisShape(size: size, dot: dot, origin: origin, closed: true)
        XCTAssertEqual(open.center, CGPoint(x: 64.5, y: 84.5))
        XCTAssertEqual(open.center, closed.center)
        XCTAssertEqual(closed.radius, 4.5)
        XCTAssertGreaterThanOrEqual(open.radius, hypot(size.width, size.height))
        // Een nog onbekende punt: schermvullend vanuit het midden (nooit gesloten zonder punt).
        let none = WelcomeView.irisShape(size: size, dot: nil, origin: origin, closed: false)
        XCTAssertEqual(none.center, CGPoint(x: 187.5, y: 333.5))
    }
}
