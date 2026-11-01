import XCTest
import SwiftUI
@testable import Hoot

@MainActor
final class ReaderWaitingTests: XCTestCase {
    func testFastLoadCancelsWithoutShowingMark() async throws {
        let state = ReaderWaitingState()
        let task = Task { await state.wait() }
        try await Task.sleep(for: .milliseconds(30))
        XCTAssertFalse(state.visible)
        task.cancel()
        await task.value
        XCTAssertFalse(state.visible)
        attach(state, "snel-geen-laadmelding")
    }
    func testSlowLoadShowsArticleLabelAfterDelayAndResets() async throws {
        let state = ReaderWaitingState()
        let start = ContinuousClock.now
        await state.wait()
        XCTAssertGreaterThanOrEqual(start.duration(to: .now), .milliseconds(400))
        XCTAssertTrue(state.visible)
        attach(state, "traag-artikel-laden")
        state.reset()
        XCTAssertFalse(state.visible)
    }
    func testCancelledOldWaitCannotRevealNewLoadingRound() async throws {
        let state = ReaderWaitingState()
        let old = Task { await state.wait() }
        await Task.yield()
        old.cancel(); state.reset()
        await old.value
        XCTAssertFalse(state.visible)
    }
    private func attach(_ state: ReaderWaitingState, _ name: String) {
        let view = ReaderLoadingView(title: "Een verhaal dat je rustig kunt lezen", sourceName: "NOS", waiting: state)
            .frame(width: 390, height: 680).background(Theme.paper)
            .environment(\.colorScheme, .light)
        let renderer = ImageRenderer(content: view); renderer.scale = 2
        if let image = renderer.uiImage {
            let attachment = XCTAttachment(image: image); attachment.name = name
            attachment.lifetime = .keepAlways; add(attachment)
        } else { XCTFail("Leesscherm moet renderen") }
    }
}
