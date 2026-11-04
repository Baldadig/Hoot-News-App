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
}
