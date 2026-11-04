import XCTest
import SwiftUI
@testable import Hoot

final class RefreshPullTests: XCTestCase {
    func testReleaseAboveThresholdRequestsOneRefresh() {
        var pull = RefreshPull()
        XCTAssertFalse(pull.phase(from: .idle, to: .tracking))
        XCTAssertFalse(pull.phase(from: .tracking, to: .interacting))
        pull.move(to: 90)
        XCTAssertTrue(pull.armed)
        XCTAssertTrue(pull.phase(from: .interacting, to: .decelerating))
        XCTAssertTrue(pull.begin())
        XCTAssertFalse(pull.phase(from: .decelerating, to: .idle))
        XCTAssertFalse(pull.begin(), "Geen tweede verzoek zolang het eerste nog loopt")
    }

    func testPullingBackBelowThresholdCancels() {
        var pull = RefreshPull()
        _ = pull.phase(from: .idle, to: .interacting)
        pull.move(to: 100)
        XCTAssertTrue(pull.armed)
        pull.move(to: 40)
        XCTAssertFalse(pull.armed)
        XCTAssertFalse(pull.phase(from: .interacting, to: .idle))
        XCTAssertFalse(pull.busy)
    }

    func testSmallPullAndProgrammaticScrollingDoNotRefresh() {
        var pull = RefreshPull()
        _ = pull.phase(from: .idle, to: .interacting)
        pull.move(to: 71)
        XCTAssertFalse(pull.phase(from: .interacting, to: .idle))
        _ = pull.phase(from: .idle, to: .animating)
        pull.move(to: 120)
        XCTAssertFalse(pull.armed)
        XCTAssertFalse(pull.phase(from: .animating, to: .idle))
        _ = pull.phase(from: .idle, to: .interacting)
        pull.move(to: 100)
        XCTAssertFalse(pull.phase(from: .interacting, to: .animating))
    }

    func testNewGestureCanRefreshAfterCompletion() {
        var pull = RefreshPull()
        XCTAssertTrue(pull.begin(), "VoiceOver kan zonder trekgebaar verversen")
        _ = pull.phase(from: .idle, to: .interacting)
        pull.move(to: 100)
        XCTAssertFalse(pull.phase(from: .interacting, to: .decelerating))
        pull.finish()
        pull.move(to: 0)
        _ = pull.phase(from: .idle, to: .interacting)
        pull.move(to: 72)
        XCTAssertTrue(pull.phase(from: .interacting, to: .idle))
        XCTAssertTrue(pull.begin())
    }

    func testInvalidAndUpwardOffsetsNeverArm() {
        var pull = RefreshPull()
        _ = pull.phase(from: .idle, to: .interacting)
        for value in [CGFloat(-30), .infinity, .nan] {
            pull.move(to: value)
            XCTAssertEqual(pull.amount, 0)
            XCTAssertFalse(pull.armed)
        }
    }

    // Eén indicator, één plek: trekken en laden delen dezelfde strook en dezelfde horizon.
    func testStripIsContinuousFromPullToLoading() {
        XCTAssertEqual(RefreshPull.threshold, Horizon.threshold)
        XCTAssertEqual(RefreshStrip.loading, Horizon.strip)
        XCTAssertEqual(RefreshStrip.gap(amount: 0, busy: true), RefreshStrip.loading, "Tijdens laden blijft de strook open")
        XCTAssertEqual(RefreshStrip.gap(amount: 30, busy: true), RefreshStrip.loading + 30, "Extra trekken tijdens laden rekt de strook mee")
        XCTAssertEqual(RefreshStrip.gap(amount: 80, busy: false), 80)
        XCTAssertEqual(RefreshStrip.gap(amount: .nan, busy: false), 0)
        XCTAssertEqual(RefreshStrip.gap(amount: -5, busy: true), RefreshStrip.loading)
    }

    func testDoublePullDuringLoadingNeverStartsSecondRefresh() {
        var pull = RefreshPull()
        XCTAssertTrue(pull.begin())
        _ = pull.phase(from: .idle, to: .interacting)
        pull.move(to: 120)
        XCTAssertFalse(pull.armed, "Tijdens laden is er niets om te scherp te stellen")
        XCTAssertFalse(pull.phase(from: .interacting, to: .decelerating))
        XCTAssertFalse(pull.begin())
        pull.finish()
        XCTAssertFalse(pull.busy)
    }

    // De schermen tekenen zelf geen trek- of laadteken: de modifier is de enige plek (geen twee indicatoren tegelijk).
    func testOnlyTheRefreshModifierDrawsTheLoadingMark() throws {
        let views = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/Views")
        let files = try FileManager.default.contentsOfDirectory(at: views, includingPropertiesForKeys: nil).filter { $0.pathExtension == "swift" }
        XCTAssertFalse(files.isEmpty)
        for file in files where file.lastPathComponent != "QuietMotion.swift" {
            let text = try String(contentsOf: file, encoding: .utf8)
            if file.lastPathComponent == "PullHorizon.swift" { continue }
            XCTAssertFalse(text.contains("HorizonPullMark(") || text.contains("PullHorizonStrip("), "\(file.lastPathComponent) tekent zelf een lader")
            XCTAssertFalse(text.contains("onWaiting"), "\(file.lastPathComponent) gebruikt de oude wachtvlag")
        }
    }
}
