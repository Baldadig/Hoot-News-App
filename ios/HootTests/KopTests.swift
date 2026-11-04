import XCTest
import SwiftUI
import CoreText
@testable import Hoot

// Een kop breekt nooit midden in een woord zonder streepje (keuring tekstfont, blokker 1).
// Newsreader 800 is breder dan New York 800: bij AX-maten past een lange samenstelling niet meer op
// een regel. KopZet zet dan zachte afbreekstreepjes in dat woord, of maakt de kop kleiner als er geen
// afbreekpunt is. Deze toets meet het langste woord bij AX1–AX5 op de kolommen van SE tot Pro Max, en
// zet de kop daarna met Core Text: elke regel moet eindigen op een spatie of op een afbreekstreepje.
final class KopTests: XCTestCase {
    static let words = ["onbetrouwbaar", "verkiezingsuitslag", "arbeidsongeschiktheidsverzekering", "Rijksvoorlichtingsdienst", "ombudsman:", "ziekenhuisopnames", "Gezondheidsraad"]
    static let heads = [
        "Nationale ombudsman: overheid voerde onbetrouwbaar beleid voor boeren",
        "Verkiezingsuitslag in Amerika laat nog dagen op zich wachten",
        "Kabinet wil arbeidsongeschiktheidsverzekering voor zzp'ers verplicht maken",
        "Rijksvoorlichtingsdienst bevestigt staatsbezoek",
    ]
    // De kolom van een kaart: schermbreedte min twee kantlijnen van 16 (SE 375 → 343, Pro 402 → 370, Pro Max 440 → 408), en 320.
    static let columns: [CGFloat] = [288, 343, 370, 408]
    static let sizes: [DynamicTypeSize] = [.large, .xxxLarge, .accessibility1, .accessibility3, .accessibility5]
    static let styles: [Font.TextStyle] = [.largeTitle, .title, .title2, .title3, .headline]

    func testLetterIsLoaded() {
        XCTAssertNotNil(UIFont(name: Letters.kop, size: 17), "Newsreader 800 ontbreekt in de bundel")
    }

    func testDutchHyphenation() {
        XCTAssertTrue(CFStringIsHyphenationAvailableForLocale(Locale(identifier: "nl") as CFLocale))
        let split = KopZet.hyphenate("onbetrouwbaar", locale: Locale(identifier: "nl"))
        XCTAssertTrue(split.contains("\u{00AD}"))
        XCTAssertEqual(split.replacingOccurrences(of: "\u{00AD}", with: ""), "onbetrouwbaar")
        // Op lettergrepen, minstens drie letters aan elke kant.
        for part in [split.split(separator: "\u{00AD}").first!, split.split(separator: "\u{00AD}").last!] { XCTAssertGreaterThanOrEqual(part.count, 3, split) }
    }

    func testShortWordsStayWhole() {
        // Bij de standaardmaat past alles: de kop blijft precies wat hij was.
        for head in Self.heads where !head.contains("arbeidsongeschiktheids") { // dat ene woord past zelfs bij Large niet op 343
            let fit = KopZet.fit(head, style: .title, typeSize: .large, width: 343)
            XCTAssertEqual(fit.text, head)
            XCTAssertEqual(fit.scale, 1)
        }
    }

    // Het langste woord (of het langste stuk ervan na afbreken) past op elke kolom en elke maat.
    func testEveryPieceFits() {
        for style in Self.styles {
            for size in Self.sizes {
                for column in Self.columns {
                    for word in Self.words {
                        let fit = KopZet.fit(word, style: style, typeSize: size, width: column)
                        let font = KopZet.font(style, typeSize: size).withSize(KopZet.pointSize(style, typeSize: size) * fit.scale)
                        XCTAssertGreaterThanOrEqual(fit.scale, KopZet.minScale)
                        let pieces = fit.text.split(separator: "\u{00AD}")
                        for (i, piece) in pieces.enumerated() {
                            let w = KopZet.measure(String(piece) + (i < pieces.count - 1 ? "-" : ""), font: font)
                            XCTAssertLessThanOrEqual(w, column, "\(word) bij \(size) \(style) op \(column): \(piece) is \(w)")
                        }
                        // Een woord dat heel past, krijgt geen streepjes.
                        if KopZet.measure(word, font: KopZet.font(style, typeSize: size)) <= column - 1 {
                            XCTAssertEqual(fit.text, word)
                        }
                    }
                }
            }
        }
    }

    // Gezet met Core Text (zoals Text het doet): elke regel eindigt op een spatie of een zacht
    // afbreekstreepje, nooit midden in een woord.
    func testLinesBreakOnlyAtSpaceOrHyphen() {
        for style in [Font.TextStyle.largeTitle, .title, .title2] {
            for column in Self.columns {
                for head in Self.heads {
                    let size = DynamicTypeSize.accessibility5
                    let fit = KopZet.fit(head, style: style, typeSize: size, width: column)
                    let font = KopZet.font(style, typeSize: size).withSize(KopZet.pointSize(style, typeSize: size) * fit.scale)
                    let attr = NSAttributedString(string: fit.text, attributes: [.font: font])
                    let setter = CTFramesetterCreateWithAttributedString(attr)
                    let frame = CTFramesetterCreateFrame(setter, CFRange(location: 0, length: 0), CGPath(rect: CGRect(x: 0, y: 0, width: column, height: 10_000), transform: nil), nil)
                    let lines = CTFrameGetLines(frame) as! [CTLine]
                    let ns = fit.text as NSString
                    for line in lines.dropLast() {
                        let r = CTLineGetStringRange(line)
                        let end = r.location + r.length
                        let last = ns.substring(with: NSRange(location: end - 1, length: 1))
                        XCTAssertTrue(last == " " || last == "\u{00AD}" || last == "-",
                                      "\(style) op \(column): regel eindigt midden in een woord: “\(ns.substring(with: NSRange(location: r.location, length: r.length)))”")
                    }
                }
            }
        }
    }

    // Renderbewijs: de lange koppen bij AX5 op SE en Pro Max, als bijlage van de toets.
    @MainActor func testRenderAX5() async throws {
        for (name, width) in [("se", 375.0), ("promax", 440.0)] {
            let view = VStack(alignment: .leading, spacing: 24) {
                ForEach(Self.heads, id: \.self) { head in
                    Kop(head, .title).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.horizontal, 16)
            .frame(width: width, alignment: .leading)
            .background(Theme.paper)
            .environment(\.dynamicTypeSize, .accessibility5)
            let host = UIHostingController(rootView: view)
            host.view.frame = CGRect(x: 0, y: 0, width: width, height: 2400)
            let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
            host.view.setNeedsLayout(); host.view.layoutIfNeeded()
            try await Task.sleep(for: .milliseconds(600))
            let image = UIGraphicsImageRenderer(size: host.view.bounds.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
            let attachment = XCTAttachment(image: image); attachment.name = "kop-ax5-\(name)"; attachment.lifetime = .keepAlways; add(attachment)
            window.isHidden = true
        }
    }
}
