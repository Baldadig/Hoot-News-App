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
    // Build 38: deellink op hootnews.nl met de uitgeverslink erbij (zie netlify/functions/deel.mjs).
    func testDeellinkOpHootnewsMetUitgeverslink() {
        let item = Item(id: "abc:1", source: "nos", title: "Kop", url: "https://nos.nl/artikel/1?a=b&c=d")
        let link = DeelKaartExport(item: item).link.absoluteString
        XCTAssertEqual(link, "https://hootnews.nl/deel/abc:1?bron=https%3A%2F%2Fnos.nl%2Fartikel%2F1%3Fa%3Db%26c%3Dd")
        XCTAssertEqual(HootAPI.base.absoluteString, "https://hootnews.nl")
    }
    func testExtreemLangeKopBlijftBinnenVierRegels() {
        for format in DeelKaartFormat.allCases {
            let result = DeelKaartStyle.titleLines(String(repeating: "Een extreem lange kop & <bijzonder> nieuws uit São Paulo ", count: 100), format: format)
            XCTAssertLessThanOrEqual(result.lines.count, 4)
            XCTAssertTrue(result.lines.last?.hasSuffix("…") == true)
        }
    }

    func testIngebeddeUitgeverslogosEnTerugvalZonderNetwerk() throws {
        XCTAssertNil(DeelKaartStyle.publisherMark("onbekende-bron"))
        for (source, name) in [("nos", "NOS"), ("nrc", "NRC"), ("nyt", "The New York Times"), ("onbekende-bron", String(repeating: "Een zeer lange bronnaam ", count: 12))] {
            if source != "onbekende-bron" {
                let mark = try XCTUnwrap(DeelKaartStyle.publisherMark(source))
                XCTAssertEqual(mark.size.width, 84); XCTAssertEqual(mark.size.height, 84)
            }
            var item = Item(id: "publisher-" + source, source: source, title: "De stad krijgt meer groen", url: "https://nos.nl/a")
            item.sourceName = name; item.section = "Binnenland"
            for format in DeelKaartFormat.allCases {
                let data = try XCTUnwrap(DeelKaart(item: item, format: format).png())
                let image = try XCTUnwrap(UIImage(data: data))
                let f = DeelKaartStyle.layout.formats[format.rawValue]!
                XCTAssertEqual(image.size.width, f.width); XCTAssertEqual(image.size.height, f.height)
                let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.png")
                attachment.name = "publisher-ios-\(source)-\(format.rawValue).png"
                attachment.lifetime = .keepAlways; add(attachment)
            }
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
    // Brand Guide v2.2 › Deelkaart: het uitgeverslogo op een papieren schijf, gelijk aan het web.
    func testPapierenSchijfAchterUitgeverslogo() throws {
        let m = DeelKaartStyle.layout.mark
        XCTAssertEqual(m.size, 28); XCTAssertEqual(m.pad, 0.14); XCTAssertEqual(m.disc, "#f5f1e8"); XCTAssertEqual(m.ink, "#a3201b")
        func pixel(_ data: Data, _ x: Int, _ y: Int) throws -> [Int] {
            let image = try XCTUnwrap(UIImage(data: data)?.cgImage)
            var rgba = [UInt8](repeating: 0, count: 4)
            let context = try XCTUnwrap(CGContext(data: &rgba, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
            context.draw(image, in: CGRect(x: -x, y: y - image.height + 1, width: image.width, height: image.height))
            return rgba.prefix(3).map(Int.init)
        }
        func close(_ a: [Int], _ b: [Int]) -> Bool { zip(a, b).allSatisfy { abs($0 - $1) <= 2 } }
        for format in DeelKaartFormat.allCases {
            let f = DeelKaartStyle.layout.formats[format.rawValue]!
            let top = Int(f.sourceY - (m.size - f.sourceSize) / 2), x = Int(f.margin) + 3
            var logo = Item(id: "schijf", source: "nos", title: "De stad krijgt meer groen", url: "https://nos.nl/a")
            logo.sourceName = "NOS"; logo.section = "Binnenland"
            var zonder = Item(id: "schijf-zonder", source: "onbekende-bron", title: logo.title, url: "https://nos.nl/a"); zonder.sourceName = "Onbekend"
            let met = try XCTUnwrap(DeelKaart(item: logo, format: format).png())
            let kaal = try XCTUnwrap(DeelKaart(item: zonder, format: format).png())
            XCTAssertTrue(close(try pixel(met, x, top + 14), [245, 241, 232]), "\(format): schijf in papier")
            XCTAssertTrue(close(try pixel(kaal, x, top + 14), [163, 32, 27]), "\(format): monogram zonder schijf")
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
