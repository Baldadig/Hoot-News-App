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

    @MainActor
    func testLoadingMarkFitsReservedSpaceWithLargeTextAndReducedMotion() throws {
        for size in [DynamicTypeSize.large, .accessibility5] {
            for still in [false, true] {
                let content = VStack(spacing: 0) {
                    Text("Stroom").font(Theme.headline(.largeTitle))
                    RefreshLoadingMark(reduceMotion: still).frame(maxWidth: .infinity, minHeight: 56)
                    StrongRule()
                    Text("Het eerste verhaal").font(.body)
                }.frame(width: 320).background(Theme.paper)
                    .environment(\.dynamicTypeSize, size)
                let renderer = ImageRenderer(content: content); renderer.scale = 2
                let image = try XCTUnwrap(renderer.uiImage)
                XCTAssertEqual(image.size.width, 320)
                let attachment = XCTAttachment(image: image)
                attachment.name = "refresh-laden-\(size)-stil-\(still)"
                attachment.lifetime = .keepAlways; add(attachment)
            }
        }
    }

    @MainActor
    func testBrandMarkRendersAtPullDistancesAndWithReducedMotion() throws {
        for (name, amount, dark, reduce) in [
            ("licht-24", 24.0, false, false), ("licht-48", 48.0, false, false),
            ("licht-72", 72.0, false, false), ("licht-120", 120.0, false, false),
            ("donker-72", 72.0, true, false), ("stil-72", 72.0, false, true)
        ] {
            let view = VStack(spacing: 0) {
                PullRefreshMark(amount: amount, reduceMotion: reduce)
                Text("Ochtendeditie").font(.title).frame(maxWidth: .infinity, alignment: .leading)
            }.frame(width: 390, alignment: .top).background(Theme.paper)
                .environment(\.colorScheme, dark ? .dark : .light)
            let renderer = ImageRenderer(content: view); renderer.scale = 2
            let image = try XCTUnwrap(renderer.uiImage)
            let attachment = XCTAttachment(image: image); attachment.name = "pull-" + name
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }

    // Eén indicator, één plek: trekken en laden delen dezelfde strook en dezelfde h.
    func testStripIsContinuousFromPullToLoading() {
        XCTAssertEqual(RefreshStrip.dotTravel(amount: RefreshPull.threshold), 0, "De punt staat bij de drempel op zijn eindplek, dus geen sprong bij loslaten")
        XCTAssertEqual(RefreshStrip.dotTravel(amount: 200), 0, "Verder trekken beweegt de punt niet meer")
        XCTAssertLessThan(RefreshStrip.dotTravel(amount: 10), 0)
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

    // De schermen tekenen zelf geen lader meer: de modifier is de enige plek (geen twee indicatoren tegelijk).
    func testOnlyTheRefreshModifierDrawsTheLoadingMark() throws {
        let views = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/Views")
        let files = try FileManager.default.contentsOfDirectory(at: views, includingPropertiesForKeys: nil).filter { $0.pathExtension == "swift" }
        XCTAssertFalse(files.isEmpty)
        for file in files where file.lastPathComponent != "QuietMotion.swift" {
            let text = try String(contentsOf: file, encoding: .utf8)
            XCTAssertFalse(text.contains("RefreshLoadingMark("), "\(file.lastPathComponent) tekent zelf een lader")
            XCTAssertFalse(text.contains("onWaiting"), "\(file.lastPathComponent) gebruikt de oude wachtvlag")
        }
    }

    @MainActor
    func testLoadingStateRendersInTheSameStripAsPulling() throws {
        for (name, amount, busy, reduce) in [("trek-72", 72.0, false, false), ("laden", 0.0, true, false), ("laden-stil", 0.0, true, true), ("laden-extra-trek", 40.0, true, false)] {
            let view = VStack(spacing: 0) {
                PullRefreshMark(amount: amount, busy: busy, reduceMotion: reduce)
                Text("Ochtendeditie").font(.title).frame(maxWidth: .infinity, alignment: .leading)
            }.frame(width: 390, alignment: .top).background(Theme.paper)
            let renderer = ImageRenderer(content: view); renderer.scale = 2
            let image = try XCTUnwrap(renderer.uiImage)
            let expected = RefreshStrip.gap(amount: amount, busy: busy)
            XCTAssertGreaterThanOrEqual(image.size.height, expected, "Strook \(name) is minstens zo hoog als de gereserveerde ruimte")
            let attachment = XCTAttachment(image: image); attachment.name = "strook-" + name
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }
}
