import XCTest
import SwiftUI
@testable import Hoot

// Hoot 1.1.1: app gelijk aan de web-poetsbeurt van 5 november en de backlogpunten daarna.
@MainActor final class Versie111Tests: XCTestCase {
    // 1. Geen "Jouw Editie" onder de Editie-titel: alleen de datum, en alleen wat afwijkt (gelijk aan Edition.jsx).
    func testMetaregelZonderJouwEditie() {
        XCTAssertEqual(EditionView.metaLine(date: "Donderdag 5 november", personalLabel: true, personal: true), "Donderdag 5 november")
        XCTAssertEqual(EditionView.metaLine(date: "Donderdag 5 november", personalLabel: false, personal: true), "Donderdag 5 november\u{00A0}· Om te beginnen")
        XCTAssertEqual(EditionView.metaLine(date: "Donderdag 5 november", personalLabel: false, personal: false), "Donderdag 5 november\u{00A0}· De Editie voor iedereen")
        XCTAssertEqual(EditionView.metaLine(date: "", personalLabel: false, personal: false), "De Editie voor iedereen")
    }

    // ---- 2. App gelijk aan de web-poetsbeurt van 5 november ----

    private func row(_ id: String, why: String? = nil) -> EditionRowModel {
        var item = Item(id: id, source: "nos", title: "Kop \(id)", url: "https://nos.nl/\(id)")
        item.sourceName = "NOS"
        return EditionRowModel(id: id, item: item, story: nil, label: "Binnenland", desk: nil, why: why)
    }

    // Een rij in de paren: heeft de buur een waarom-regel en dit verhaal niet, dan houdt het die regel vrij.
    func testParenHoudenEenLegeWaaromRegelVrij() {
        let rows = [row("a", why: "Groot nieuws"), row("b"), row("c"), row("d"), row("e", why: "Groot nieuws · 9 bronnen")]
        XCTAssertFalse(EditionPairsGrid<EmptyView>.whySpace(rows, at: 0))
        XCTAssertTrue(EditionPairsGrid<EmptyView>.whySpace(rows, at: 1))
        XCTAssertFalse(EditionPairsGrid<EmptyView>.whySpace(rows, at: 2), "geen van beide: niets vrijhouden")
        XCTAssertFalse(EditionPairsGrid<EmptyView>.whySpace(rows, at: 3))
        XCTAssertFalse(EditionPairsGrid<EmptyView>.whySpace(rows, at: 4), "een los laatste verhaal heeft geen buur")
        XCTAssertFalse(WhyLine.shows("· 3 bronnen"))
        XCTAssertTrue(WhyLine.shows("Uit je voorkeursbron NRC"))
    }

    // Scherp genoeg voor een groot beeld (gelijk aan sharpEnough in src/lib/img.js): de bronbreedte tegen het vak
    // maal de pixeldichtheid (hooguit 1,4).
    func testScherpGenoeg() {
        ImageURL.screen = (390, 3)
        func item(_ image: String, w: Double? = nil) -> Item {
            var it = Item(id: image, source: "x", title: "t", url: "https://x.nl")
            it.image = image
            if let w { it.imageMeta = ImageMeasure(w: w, h: w * 2 / 3, crop: .init(l: 0, r: 0, t: 0, b: 0), ratio: 1.5) }
            return it
        }
        // Met gemeten randen tonen we het origineel: dan telt de meting (gelijk aan src/lib/img.js). Zonder randen
        // gaat het FD via een variant op maat (imgix), zoals op het web (DPG-beeldserver, 12 november).
        var fd = item("https://images.fd.nl/a.jpg?w=140&h=140&fit=crop", w: 140)
        fd.imageMeta?.crop = .init(l: 16, r: 12, t: 0, b: 0)
        XCTAssertEqual(ImageURL.sourceWidth(fd), 140, "met gemeten randen telt de meting")
        XCTAssertEqual(ImageURL.sourceWidth(item("https://images.fd.nl/a.jpg?w=140&h=140&fit=crop", w: 140)), 1024, "zonder randen de variant")
        XCTAssertEqual(ImageURL.sourceWidth(item("https://images.cdn.nos.nl/x-1024x576.webp")), 1024)
        XCTAssertEqual(ImageURL.sourceWidth(item("https://image.volkskrant.nl/a/feature-crop/640/427/b.jpg")), 1024, "variant van de uitgever")
        XCTAssertNil(ImageURL.sourceWidth(item("https://onbekend.nl/beeld.jpg")), "onbekend: dan past het, zoals altijd")
        XCTAssertTrue(ImageURL.sharpEnough(item("https://onbekend.nl/beeld.jpg"), box: 358, scale: 3))
        XCTAssertFalse(ImageURL.sharpEnough(item("https://x.nl/a.jpg", w: 480), box: 358, scale: 3), "480 op 358 × 1,4")
        XCTAssertTrue(ImageURL.sharpEnough(item("https://x.nl/a.jpg", w: 640), box: 358, scale: 3))
        XCTAssertTrue(ImageURL.sharpEnough(item("https://images.cdn.nos.nl/x-1024x576.webp"), box: 720, scale: 2), "NOS 1024 mag op 720 nog groot")
        XCTAssertEqual(ImageURL.largeBox(390), 358)
        XCTAssertEqual(ImageURL.largeBox(1366), 720)
        XCTAssertEqual(ImageURL.url("https://images.fd.nl/a.jpg?w=140&h=140&fit=crop&bg=fff", .large)?.absoluteString, "https://images.fd.nl/a.jpg?bg=fff&w=1280")
        XCTAssertEqual(ImageURL.url("https://image.demorgen.be/a/feature-crop/640/427/b.jpg", .thumb)?.absoluteString, "https://image.demorgen.be/a/feature-crop/320/320/b.jpg")
    }

    // Een te klein beeld is geen placeholder meer in de tijdlijn: het staat klein rechts (ItemRow.klein).
    func testTeKleinBeeldIsGeenPlaceholderMeer() {
        var it = Item(id: "k", source: "x", title: "t", url: "https://x.nl")
        it.image = "https://www.bing.com/th?id=abc&c=7"
        XCTAssertFalse(Placeholder.isBare(it, .tijdlijn))
        it.image = nil
        XCTAssertTrue(Placeholder.isBare(it, .tijdlijn))
    }

    // Stills (bijlagen in het xcresult): de iPad-paren op 1000 breed, de zijkolom met "N bronnen" achter de tijd,
    // en kaart A+ met een te klein beeld klein rechts.
    func testStillsPoetsbeurt() async throws {
        let store = HootStore()
        let url = URL(string: "https://gethoot.app/toets/klein-\(UUID().uuidString).jpg")!
        let beeld = UIGraphicsImageRenderer(size: CGSize(width: 300, height: 200)).image { ctx in
            UIColor(red: 0.36, green: 0.47, blue: 0.55, alpha: 1).setFill(); ctx.fill(CGRect(x: 0, y: 0, width: 300, height: 200))
            UIColor(red: 0.85, green: 0.72, blue: 0.45, alpha: 1).setFill(); ctx.fill(CGRect(x: 0, y: 120, width: 300, height: 80))
            UIColor(red: 0.95, green: 0.9, blue: 0.75, alpha: 1).setFill(); ctx.cgContext.fillEllipse(in: CGRect(x: 200, y: 30, width: 50, height: 50))
        }
        let data = try XCTUnwrap(beeld.jpegData(compressionQuality: 0.9))
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "image/jpeg", "Cache-Control": "max-age=3600"])!
        URLCache.shared.storeCachedResponse(CachedURLResponse(response: response, data: data), for: URLRequest(url: url))

        func item(_ id: String, _ title: String, _ summary: String, source: String, image: Bool = false, ago: Double = 3600) -> Item {
            var it = Item(id: id, source: "nos", title: title, url: "https://nos.nl/\(id)")
            it.sourceName = source; it.summary = summary
            it.publishedAt = ISO8601DateFormatter().string(from: Date().addingTimeInterval(-ago))
            if image { it.image = url.absoluteString; it.imageMeta = ImageMeasure(w: 300, h: 200, crop: .init(l: 0, r: 0, t: 0, b: 0), ratio: 1.5) }
            return it
        }
        let paren = [
            EditionRowModel(id: "p4", item: item("p4", "Kabinet wil boeren meer ruimte geven bij stikstofregels", "Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders in kwetsbare gebieden.", source: "de Volkskrant"), story: nil, label: "Politiek", desk: nil, number: 4, why: "Uit je voorkeursbron de Volkskrant"),
            EditionRowModel(id: "p5", item: item("p5", "Ajax wint kraker van AZ", "Een treffer in de slotfase besliste het duel.", source: "NOS Sport"), story: nil, label: "Sport", desk: nil, number: 5),
            EditionRowModel(id: "p6", item: item("p6", "Op de VN-natuurtop in Cali dringt de tijd: over het geld voor arme landen is na twee weken nog niets afgesproken", "Onderhandelaars werkten de hele nacht door, maar rijke landen willen niet toezeggen wie de rekening betaalt.", source: "NRC"), story: nil, label: "Buitenland", desk: nil, number: 6),
            EditionRowModel(id: "p7", item: item("p7", "Rijkswaterstaat sluit de Afsluitdijk een weekend", "Het verkeer wordt omgeleid via Lelystad.", source: "NU.nl"), story: nil, label: "Binnenland", desk: nil, number: 7),
            EditionRowModel(id: "p8", item: item("p8", "Een los laatste verhaal blijft één kolom breed", "Wat erna komt, staat op dezelfde kolommaat.", source: "Trouw"), story: nil, label: "Cultuur", desk: nil, number: 8),
        ]
        let zij = Story(id: "s2", itemIds: ["z2", "z2b"], sourceCount: 7)
        let views: [(String, CGFloat, AnyView)] = [
            ("ipad-paren", 1000, AnyView(EditionPairsGrid(rows: paren, width: 1000) { row, whySpace in
                ItemRow(item: row.item, number: row.number, label: row.label, why: row.why, story: row.story, form: .krant, pinSource: true, whySpace: whySpace)
            }.environment(\.isWide, true))),
            ("ipad-zijkolom", 330, AnyView(VStack(alignment: .leading, spacing: 0) {
                ItemRow(item: item("z2", "Hoge Raad: staat moet meer doen tegen hitte in gevangenissen", "De rechter geeft gedetineerden gelijk.", source: "de Volkskrant"), number: 2, label: "Binnenland", story: zij, form: .krant, narrow: true)
                Rule().padding(.vertical, Space.s2)
                ItemRow(item: item("z3", "Schiphol mag minder vluchten", "Het kabinet houdt vast aan krimp.", source: "NOS"), number: 3, label: "Economie", story: Story(id: "s3", itemIds: ["z3"], sourceCount: 3), form: .krant, narrow: true)
            }.environment(\.isWide, true))),
            ("iphone-kaart-klein-beeld", 358, AnyView(ItemRow(item: item("k1", "Rijkswaterstaat sluit de Afsluitdijk een weekend", "Het verkeer wordt omgeleid via Lelystad. Fietsers kunnen er wel langs.", source: "NU.nl", image: true), number: 4, label: "Binnenland", story: Story(id: "s4", itemIds: ["k1"], sourceCount: 2), form: .tijdlijn).environment(\.isWide, false))),
        ]
        for (name, width, content) in views {
            for dark in [false, true] {
                let view = content.frame(width: width, alignment: .topLeading).fixedSize(horizontal: false, vertical: true).padding(16) // de hoogte van de inhoud, zoals in de scroll
                    .background(Theme.paper).environment(store).environment(Reader())
                    .environment(\.colorScheme, dark ? .dark : .light).environment(\.nachtActief, dark)
                let host = UIHostingController(rootView: view)
                host.safeAreaRegions = []
                let size = host.sizeThatFits(in: CGSize(width: width + 32, height: 3000))
                let frame = CGRect(x: 0, y: 0, width: width + 32, height: ceil(size.height))
                host.view.frame = frame
                let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
                host.view.layoutIfNeeded()
                try await Task.sleep(for: .milliseconds(700))
                let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                let a = XCTAttachment(image: image); a.name = "p2-\(name)-\(dark ? "nacht" : "licht").png"; a.lifetime = .keepAlways; add(a)
                window.isHidden = true
            }
        }
        URLCache.shared.removeCachedResponse(for: URLRequest(url: url))
    }
}
