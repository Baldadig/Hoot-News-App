import XCTest
import SwiftUI
@testable import Hoot

// Eindkeuring 48, B2: de Google-profielfoto kwam nooit op het scherm. AccountPhoto hing zijn laadtaak
// aan een lege Group; zonder view om aan te hangen startte .task nooit. Deze toets zet een beeld in het
// geheugen van AccountPhoto (geen netwerk) en kijkt of het ook echt getekend wordt.
@MainActor
final class AccountFotoTests: XCTestCase {
    func testFotoKomtOpHetScherm() async throws {
        let url = URL(string: "https://gethoot.app/toets/foto-\(UUID().uuidString).png")!
        let red = UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8)).image { ctx in
            UIColor(red: 1, green: 0, blue: 0, alpha: 1).setFill(); ctx.fill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }
        AccountPhoto.memory.setObject(red, forKey: url as NSURL)
        defer { AccountPhoto.memory.removeObject(forKey: url as NSURL) }

        let side: CGFloat = 48
        let view = ZStack {
            Color(red: 0, green: 0, blue: 1) // het monogram eronder: blauw, zodat rood alleen van de foto kan komen
            AccountPhoto(url: url)
        }
        .frame(width: side, height: side)
        let host = UIHostingController(rootView: view)
        host.safeAreaRegions = [] // de Pro Max geeft anders een safe area mee aan dit kleine venster
        host.view.frame = CGRect(x: 0, y: 0, width: side, height: side)
        let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
        defer { window.isHidden = true }
        host.view.layoutIfNeeded()
        try await Task.sleep(for: .milliseconds(600))
        let image = UIGraphicsImageRenderer(size: host.view.bounds.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
        let a = XCTAttachment(image: image); a.name = "account-foto"; a.lifetime = .keepAlways; add(a)

        // De kleur in het midden.
        let cg = try XCTUnwrap(image.cgImage)
        var pixel = [UInt8](repeating: 0, count: 4)
        pixel.withUnsafeMutableBytes { raw in
            guard let ctx = CGContext(data: raw.baseAddress, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
            ctx.draw(cg, in: CGRect(x: -CGFloat(cg.width) / 2, y: -CGFloat(cg.height) / 2, width: CGFloat(cg.width), height: CGFloat(cg.height)))
        }
        XCTAssertGreaterThan(pixel[0], 200, "geen foto: het midden is niet rood (\(pixel))")
        XCTAssertLessThan(pixel[2], 60, "het monogram staat er nog (\(pixel))")
    }
}
