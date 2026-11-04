import XCTest
import AVKit
@testable import Hoot
@MainActor final class VideoControllerTests: XCTestCase {
    func testSystemControlsWithoutAutoplayOrWhiteBackground() {
        let player=AVPlayer(),controller=SystemVideoPlayer.controller(player:player,label:"Video van proefbron")
        XCTAssertTrue(controller.showsPlaybackControls)
        XCTAssertFalse(controller.entersFullScreenWhenPlaybackBegins)
        XCTAssertFalse(controller.canStartPictureInPictureAutomaticallyFromInline)
        XCTAssertTrue(controller.player === player)
        XCTAssertEqual(player.rate,0)
        controller.view.layoutIfNeeded()
        let color = UIColor(cgColor: controller.view.layer.backgroundColor!)
        var red:CGFloat=0,green:CGFloat=0,blue:CGFloat=0,alpha:CGFloat=0
        XCTAssertTrue(color.getRed(&red, green:&green, blue:&blue, alpha:&alpha))
        XCTAssertEqual(red,0);XCTAssertEqual(green,0);XCTAssertEqual(blue,0);XCTAssertEqual(alpha,1)
        XCTAssertEqual(controller.overrideUserInterfaceStyle,.dark)
        XCTAssertEqual(controller.view.accessibilityLabel,"Video van proefbron")
    }
}
