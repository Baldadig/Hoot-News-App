import XCTest
@testable import Hoot

// Vervormde en onscherpe beelden (13 november 2026): Tyra Banks bij NU.nl in Buiten je bubbel. De feed gaf een vierkant
// uit een staand origineel van 536 breed; _wd1280/0/0/0/0/ perste het hele beeld in 1280 × 720. Nu: een 16:9-uitsnede
// binnen het vierkant, en een poort (600 breed, verhouding 0,6 tot 2,4). Gelijk aan shared/beeld.mjs en src/lib/img.js
// (tests/img.test.mjs).
@MainActor final class BeeldPoortTests: XCTestCase {
    private let plain = ImageMeasure.Crop(l: 0, r: 0, t: 0, b: 0)

    private func item(_ image: String, meta: ImageMeasure? = nil) -> Item {
        var it = Item(id: image, source: "nu", title: "t", url: "https://www.nu.nl/a")
        it.image = image
        it.imageMeta = meta
        return it
    }

    func testNuStaandPortretGeenUitgerekteVariantEnGeenGrootBeeld() {
        ImageURL.screen = (390, 3)
        let raw = "https://images.nu.nl/m/8iyx5wyaofel_sqr256/0/13/536/536/topmodel-tyra-banks-52-is-weer-vrijgezel-ik-omarm-mijn-vrouwelijkheid.jpg"
        XCTAssertEqual(ImageURL.url(raw, .large)?.absoluteString,
                       "https://images.nu.nl/m/8iyx5wyaofel_wd1280/0/130/536/302/topmodel-tyra-banks-52-is-weer-vrijgezel-ik-omarm-mijn-vrouwelijkheid.jpg")
        XCTAssertEqual(ImageURL.url(raw, .thumb)?.absoluteString, raw)
        let it = item(raw, meta: ImageMeasure(w: 256, h: 256, crop: plain, ratio: 1))
        XCTAssertEqual(ImageURL.sourceWidth(it), 536)
        XCTAssertEqual(ImageURL.shownRatio(it), 16 / 9)
        XCTAssertFalse(ImageURL.largeOk(it))
        XCTAssertFalse(ImageURL.sharpHere(it), "klein rechts, niet groot en zacht")
        // Een groot NU.nl-origineel blijft groot.
        let groot = item("https://images.nu.nl/m/qjrxs4nafylh_sqr256/1016/860/2486/2486/aow.jpg")
        XCTAssertEqual(ImageURL.url(groot.image, .large)?.absoluteString, "https://images.nu.nl/m/qjrxs4nafylh_wd1280/1016/1404/2486/1398/aow.jpg")
        XCTAssertTrue(ImageURL.sharpHere(groot))
    }

    func testTeSmalOfVerkeerdeVerhoudingGeenGrootBeeld() {
        ImageURL.screen = (390, 1)
        XCTAssertFalse(ImageURL.largeOk(item("https://example.org/smal.jpg", meta: ImageMeasure(w: 400, h: 267, crop: plain, ratio: 400 / 267))))
        XCTAssertTrue(ImageURL.largeOk(item("https://example.org/gewoon.jpg", meta: ImageMeasure(w: 1280, h: 720, crop: plain, ratio: 1280 / 720))))
        XCTAssertFalse(ImageURL.largeOk(item("https://example.org/banner.jpg", meta: ImageMeasure(w: 1800, h: 600, crop: plain, ratio: 3))))
        XCTAssertFalse(ImageURL.largeOk(item("https://example.org/strook.jpg", meta: ImageMeasure(w: 800, h: 1600, crop: plain, ratio: 0.5))))
        XCTAssertTrue(ImageURL.largeOk(item("https://example.org/staand.jpg", meta: ImageMeasure(w: 1000, h: 1500, crop: plain, ratio: 2 / 3))))
        XCTAssertTrue(ImageURL.largeOk(item("https://example.org/onbekend.jpg")), "onbekend blijft tonen")
    }

    func testKleinVierkantPasGrootAlsDeVariantGemetenIs() {
        let fd = "https://images.fd.nl/905854-906089.jpeg?fit=crop&crop=faces&auto=format%2Ccompress&q=45&w=140&h=140&fm=jpg&cs=tinysrgb"
        XCTAssertTrue(ImageURL.smallSquare(fd))
        XCTAssertFalse(ImageURL.smallSquare("https://images.nu.nl/m/8iyx5wyaofel_sqr256/0/13/536/536/a.jpg"))
        var meta = ImageMeasure(w: 140, h: 140, crop: plain, ratio: 1)
        XCTAssertFalse(ImageURL.largeOk(item(fd, meta: meta)))
        meta.lead = .init(w: 1360, h: 906)
        XCTAssertTrue(ImageURL.largeOk(item(fd, meta: meta)))
    }

    func testGemetenGroteVariantKomtMeeUitDeServer() throws {
        let json = #"{"w":256,"h":256,"crop":{"l":0,"r":0,"t":0,"b":0},"ratio":1,"lead":{"w":1280,"h":720}}"#
        let m = try JSONDecoder().decode(ImageMeasure.self, from: Data(json.utf8))
        XCTAssertEqual(m.lead, .init(w: 1280, h: 720))
        // Een oudere server zonder lead: gewoon zonder.
        let oud = try JSONDecoder().decode(ImageMeasure.self, from: Data(#"{"w":256,"h":256,"crop":{"l":0,"r":0,"t":0,"b":0},"ratio":1}"#.utf8))
        XCTAssertNil(oud.lead)
    }
}
