import XCTest
import SwiftUI
@testable import Hoot

// 1.1.1: Bluesky-kaart A+. Een Bluesky-bericht in de Stroom: rubriek "Bluesky", de tekst in Schibsted Grotesk
// (geen Newsreader), het beeld 16 eronder, de bronregel zoals bij een artikel. Gelijk aan src/styles/bluesky.css.
@MainActor final class BlueskyKaartTests: XCTestCase {
    private func post(image: URL?, id: String = "bsky-1") -> Item {
        var it = Item(id: id, source: "bsky:studio.bsky.social", title: "", url: "https://bsky.app/profile/studio.bsky.social/post/1")
        it.kind = "post"; it.sourceName = "Studio voor wetenschap"; it.handle = "@studio.bsky.social"
        it.summary = "Een nieuw ontwerp maakt wetenschappelijk onderzoek toegankelijker. Mooi om te zien hoe verschillende teams hun kennis delen."
        it.publishedAt = ISO8601DateFormatter().string(from: Date().addingTimeInterval(-300))
        if let image { it.image = image.absoluteString; it.imageRatio = 1.5 }
        return it
    }

    // Een bericht is geen artikel: geen kop, en de kaart heeft tekst, ruimte en een bronregel van 44.
    func testKaartZonderKop() {
        let store = HootStore()
        let item = post(image: nil)
        XCTAssertTrue(item.isPost)
        func height<V: View>(_ v: V) -> CGFloat {
            UIHostingController(rootView: v.frame(width: 358).environment(store).environment(Reader())).sizeThatFits(in: CGSize(width: 358, height: 2000)).height
        }
        let zin = height(Text(item.summary!).zin().fixedSize(horizontal: false, vertical: true))
        XCTAssertGreaterThan(height(PostRow(item: item)), zin + 44)
    }

    func testStills() async throws {
        let store = HootStore()
        let url = URL(string: "https://gethoot.app/toets/bsky-\(UUID().uuidString).jpg")!
        let beeld = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 400)).image { ctx in
            UIColor(red: 0.36, green: 0.47, blue: 0.55, alpha: 1).setFill(); ctx.fill(CGRect(x: 0, y: 0, width: 600, height: 400))
            UIColor(red: 0.85, green: 0.72, blue: 0.45, alpha: 1).setFill(); ctx.fill(CGRect(x: 0, y: 260, width: 600, height: 140))
        }
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "image/jpeg", "Cache-Control": "max-age=3600"])!
        URLCache.shared.storeCachedResponse(CachedURLResponse(response: response, data: beeld.jpegData(compressionQuality: 0.9)!), for: URLRequest(url: url))
        defer { URLCache.shared.removeCachedResponse(for: URLRequest(url: url)) }
        var zonder = post(image: nil, id: "bsky-2"); zonder.summary = "Rustig bijlezen: drie inzichten uit ons onderzoek van deze week."
        for dark in [false, true] {
            let view = VStack(alignment: .leading, spacing: 0) {
                PostRow(item: post(image: url))
                Rule().padding(.vertical, Space.s2)
                PostRow(item: zonder)
            }
            .frame(width: 358, alignment: .topLeading).fixedSize(horizontal: false, vertical: true).padding(16)
            .background(Theme.paper).environment(store).environment(Reader())
            .environment(\.colorScheme, dark ? .dark : .light).environment(\.nachtActief, dark)
            let host = UIHostingController(rootView: view)
            host.safeAreaRegions = []
            let size = host.sizeThatFits(in: CGSize(width: 390, height: 3000))
            let frame = CGRect(x: 0, y: 0, width: 390, height: ceil(size.height))
            host.view.frame = frame
            let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
            host.view.layoutIfNeeded()
            try await Task.sleep(for: .milliseconds(700))
            let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
            let a = XCTAttachment(image: image); a.name = "p4-bluesky-kaart-\(dark ? "nacht" : "licht").png"; a.lifetime = .keepAlways; add(a)
            window.isHidden = true
        }
    }
}
