import XCTest
import SwiftUI
import CoreText
@testable import Hoot

@MainActor
final class DeelKaartTests: XCTestCase {
    struct Expected: Decodable { let lines: [String]; let size: Double }
    struct Case: Decodable { let id, title, section, sourceName, source, url: String; let expected: [String: Expected] }
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    static func cases() throws -> [Case] {
        try JSONDecoder().decode([Case].self, from: Data(contentsOf: root.appending(path: "tests/fixtures/deelkaart-cases.json")))
    }
    func testGedeeldeRegelvalEnPNGFormaten() throws {
        for c in try Self.cases() {
            var item = Item(id: c.id, source: c.source, title: c.title, url: c.url)
            item.section = c.section; item.sourceName = c.sourceName
            for format in DeelKaartFormat.allCases {
                let result = DeelKaartStyle.titleLines(c.title, format: format)
                XCTAssertEqual(result.lines, c.expected[format.rawValue]?.lines)
                XCTAssertEqual(result.size, c.expected[format.rawValue]?.size)
                let data = try XCTUnwrap(DeelKaart(item: item, format: format).png())
                let image = try XCTUnwrap(UIImage(data: data))
                let f = DeelKaartStyle.layout.formats[format.rawValue]!
                XCTAssertEqual(image.size.width, f.width); XCTAssertEqual(image.size.height, f.height)
                let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.png")
                attachment.name = "a3-ios-\(c.id)-\(format.rawValue).png"; attachment.lifetime = .keepAlways
                add(attachment)
            }
        }
        // Newsreader is echt geladen; geen stilzwijgende systeemletter als vervanging.
        XCTAssertNotNil(UIFont(name: "Newsreader-ExtraBold", size: 48))
        XCTAssertNotNil(UIFont(name: "SourceSans3-SemiBold", size: 20))
    }
    func testExtreemLangeKopBlijftBinnenVierRegels() {
        for format in DeelKaartFormat.allCases {
            let result = DeelKaartStyle.titleLines(String(repeating: "Een extreem lange kop & <bijzonder> nieuws uit São Paulo ", count: 100), format: format)
            XCTAssertLessThanOrEqual(result.lines.count, 4)
            XCTAssertTrue(result.lines.last?.hasSuffix("…") == true)
        }
    }

    // De echte LeadCard met lokaal onderschepte beeldresponsen: geen afhankelijkheid van uitgevers.
    func testHoofdbeeldOpIPhoneEnIPad() async throws {
        URLProtocol.registerClass(LeadFixtureProtocol.self)
        defer { URLProtocol.unregisterClass(LeadFixtureProtocol.self) }
        let store = HootStore()
        let previousImages = store.images
        defer { store.images = previousImages }
        store.images = "aan"
        for width in [390.0, 1100.0] {
            for portrait in [false, true] {
                for dark in [false, true] {
                    let name = portrait ? "portrait" : "white-sides"
                    var item = Item(id: "a1-\(name)", source: "nos", title: "Een nieuw perspectief op de stad", url: "https://nos.nl/a")
                    item.image = "https://hoot-fixture.invalid/\(name).png"
                    item.sourceName = "NOS"
                    item.summary = "Een rustige blik op de wereld om ons heen. Het verhaal en de foto krijgen ieder hun eigen ruimte."
                    item.imageMeta = portrait ? ImageMeasure(w: 60, h: 100, crop: .init(l: 0, r: 0, t: 0, b: 0), ratio: 0.6) : ImageMeasure(w: 160, h: 100, crop: .init(l: 24, r: 16, t: 0, b: 0), ratio: 1.2)
                    let content = LeadCard(item: item, label: "Cultuur")
                        .padding(16).frame(width: width, alignment: .topLeading)
                        .background(Theme.paper)
                        .environment(store).environment(Reader())
                        .environment(\.isWide, width >= 700).environment(\.isSpacious, width >= 1000)
                        .environment(\.colorScheme, dark ? .dark : .light)
                        .environment(\.dynamicTypeSize, .large)
                    let host = UIHostingController(rootView: content)
                    let size = host.sizeThatFits(in: CGSize(width: width, height: 1600))
                    host.view.frame = CGRect(origin: .zero, size: size)
                    let window = UIWindow(frame: CGRect(origin: .zero, size: size))
                    window.rootViewController = host; window.isHidden = false
                    host.view.layoutIfNeeded()
                    try await Task.sleep(for: .milliseconds(250))
                    let image = UIGraphicsImageRenderer(size: size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                    let attachment = XCTAttachment(image: image)
                    attachment.name = "a1-ios-\(Int(width))-\(dark ? "dark" : "light")-\(portrait ? "staand" : "liggend").png"
                    attachment.lifetime = .keepAlways; add(attachment)
                    window.isHidden = true
                }
            }
        }
    }
}

private final class LeadFixtureProtocol: URLProtocol, @unchecked Sendable {
    override class func canInit(with request: URLRequest) -> Bool { request.url?.host == "hoot-fixture.invalid" }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let name = request.url!.lastPathComponent
            let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            let data = try Data(contentsOf: root.appending(path: "tests/fixtures/images/\(name)"))
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": "image/png"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
