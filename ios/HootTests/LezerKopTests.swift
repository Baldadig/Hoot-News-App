import XCTest
import SwiftUI
import WebKit
@testable import Hoot

// De kop van de lezer (keuring b46, B1): een woord dat niet in de kolom past, breekt met een streepje
// (zachte afbreekstreepjes, zoals Kop); een woord dat past blijft heel; AX5 is echt groter.
@MainActor final class LezerKopTests: XCTestCase {
    static let shy = "\u{00AD}"

    private func html(_ title: String, size: DynamicTypeSize = .large, width: CGFloat) -> String {
        let item = Item(id: "lezer-kop", source: "nos", title: title, url: "https://nos.nl/")
        let article = Article(title: title, content: "<p>Tekst.</p>", length: 100)
        return ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, lang: "nl", typeSize: size, width: width)
    }
    private func h1(_ html: String) -> String {
        let r = html.range(of: "<h1 class=\"title\">")!, e = html.range(of: "</h1>")!
        return String(html[r.upperBound..<e.lowerBound])
    }

    // De metingen van de keuring: kopmaat 33,3 pt, kolom 343 (SE) en 408 (Pro Max).
    func testTeBreedWoordKrijgtStreepjesOpSE() {
        let se = h1(html("Rijksvoorlichtingsdienst zwijgt", width: 375))
        XCTAssertTrue(se.contains(Self.shy), "Rijksvoorlichtingsdienst (392 pt) past niet in 343 pt")
        XCTAssertEqual(se.replacingOccurrences(of: Self.shy, with: ""), "Rijksvoorlichtingsdienst zwijgt")
        XCTAssertTrue(h1(html("De coalitieonderhandelingen lopen vast", width: 375)).contains(Self.shy))
        XCTAssertTrue(h1(html("arbeidsongeschiktheidsverzekering", width: 440)).contains(Self.shy), "563 pt past ook op een Pro Max niet")
    }
    func testWoordDatPastBlijftHeel() {
        XCTAssertFalse(h1(html("Verkiezingsuitslag in Amerika", width: 375)).contains(Self.shy))
        XCTAssertFalse(h1(html("Rijksvoorlichtingsdienst zwijgt", width: 440)).contains(Self.shy), "392 pt past in 408 pt")
        XCTAssertFalse(h1(html("Rijksvoorlichtingsdienst zwijgt", width: 0)).contains(Self.shy), "zonder breedte niets doen")
    }
    func testAlleenHetTeBredeWoordWordtAfgebroken() {
        let t = h1(html("Verkiezingsuitslag bij Rijksvoorlichtingsdienst", width: 375))
        XCTAssertTrue(t.hasPrefix("Verkiezingsuitslag bij "), "het woord dat past blijft heel: \(t)")
    }
    func testAfbrekenStaatAltijdAanZonderMaatVoorwaarde() {
        let page = html("Rijksvoorlichtingsdienst", width: 375)
        XCTAssertFalse(page.contains("main.hyphenate :is(h1"), "de lezerkop hangt niet meer aan Heel groot of een AX-maat")
        for size in [DynamicTypeSize.small, .large, .xxxLarge, .accessibility3, .accessibility5] {
            XCTAssertTrue(h1(html("Rijksvoorlichtingsdienst", size: size, width: 375)).contains(Self.shy), "\(size)")
        }
    }

    // De maat komt uit de omgeving: AX5 is echt groter dan Large, in een echte web-weergave gemeten.
    func testAX5IsGroterDanLarge() async throws {
        func measure(_ size: DynamicTypeSize) async throws -> (font: Double, body: Double) {
            let config = WKWebViewConfiguration()
            config.defaultWebpagePreferences.allowsContentJavaScript = false
            let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 375, height: 800), configuration: config)
            let done = expectation(description: "geladen")
            let delegate = Loaded { done.fulfill() }
            web.navigationDelegate = delegate
            web.loadHTMLString(html("Korte kop", size: size, width: 375), baseURL: nil)
            await fulfillment(of: [done], timeout: 10)
            let value = try await web.callAsyncJavaScript("return [parseFloat(getComputedStyle(document.querySelector('h1')).fontSize), parseFloat(getComputedStyle(document.querySelector('main')).fontSize)]", contentWorld: .defaultClient)
            let pair = value as! [Double]
            _ = delegate
            return (pair[0], pair[1])
        }
        let large = try await measure(.large), ax5 = try await measure(.accessibility5)
        XCTAssertGreaterThan(ax5.body, large.body * 1.8, "tekst bij AX5 (\(ax5.body)) tegenover Large (\(large.body))")
        XCTAssertGreaterThan(ax5.font, large.font, "kop bij AX5 is groter")
        XCTAssertEqual(large.body, 17 * 1.12, accuracy: 0.5)
    }

    // Renderbewijs: een woord van 24 letters op SE (375), Large en AX5, als bijlage.
    func testRenderSE() async throws {
        for (label, size, category) in [("large", DynamicTypeSize.large, UIContentSizeCategory.large), ("ax5", DynamicTypeSize.accessibility5, UIContentSizeCategory.accessibilityExtraExtraExtraLarge)] {
            let page = html("Rijksvoorlichtingsdienst en coalitieonderhandelingen", size: size, width: 375)
            let host = UIHostingController(rootView: ArticleWebView(html: page, baseURL: nil).environment(\.dynamicTypeSize, size))
            host.traitOverrides.preferredContentSizeCategory = category
            host.view.frame = CGRect(x: 0, y: 0, width: 375, height: 667)
            let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
            host.view.setNeedsLayout(); host.view.layoutIfNeeded()
            try await Task.sleep(for: .milliseconds(2500))
            let image = UIGraphicsImageRenderer(size: host.view.bounds.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
            let attachment = XCTAttachment(image: image); attachment.name = "lezer-kop-se-\(label)"; attachment.lifetime = .keepAlways; add(attachment)
            window.isHidden = true
        }
    }

    private final class Loaded: NSObject, WKNavigationDelegate {
        let done: () -> Void
        init(_ done: @escaping () -> Void) { self.done = done }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { done() }
    }
}
