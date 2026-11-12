import XCTest
@testable import Hoot

// DPG-beeldserver (12 november 2026): Het Parool en Trouw kregen in de Stroom de kaart met het kleine beeld rechts,
// omdat de feed 320 × 320 geeft. Net als de Volkskrant en De Morgen vragen we nu de grote variant op, en telt het
// gemeten vierkant van 320 niet meer als bronbreedte. Gelijk aan src/lib/img.js (tests/img.test.mjs).
@MainActor final class DPGBeeldTests: XCTestCase {
    private let vierkant = ImageMeasure(w: 320, h: 320, crop: .init(l: 0, r: 0, t: 0, b: 0), ratio: 1)

    private func item(_ image: String, meta: ImageMeasure? = nil) -> Item {
        var it = Item(id: image, source: "parool", title: "t", url: "https://www.parool.nl/a")
        it.image = image
        it.imageMeta = meta
        return it
    }

    func testParoolEnTrouwKrijgenDeMatenVanDeBeeldserver() {
        for host in ["image.parool.nl", "image.trouw.nl"] {
            let raw = "https://\(host)/280236357/feature-crop/320/320/afbeelding"
            XCTAssertEqual(ImageURL.url(raw, .thumb)?.absoluteString, "https://\(host)/280236357/feature-crop/320/320/afbeelding")
            XCTAssertEqual(ImageURL.url(raw, .large)?.absoluteString, "https://\(host)/280236357/feature-crop/1280/853/afbeelding")
        }
        // roi: een uitsnede rond een brandpunt; de maat verandert, het brandpunt en de naam blijven.
        XCTAssertEqual(ImageURL.url("https://image.parool.nl/280216597/roi/320/320/0.295181/0.317843/afbeelding", .large)?.absoluteString,
                       "https://image.parool.nl/280216597/roi/1280/853/0.295181/0.317843/afbeelding")
        XCTAssertEqual(ImageURL.url("https://image.trouw.nl/271963600/roi/320/320/922/614.5/column", .thumb)?.absoluteString,
                       "https://image.trouw.nl/271963600/roi/320/320/922/614.5/column")
        // AD en de regionale titels: ondertekend, een andere maat geeft 403. Ongemoeid.
        let ad = "https://images.ad.nl/NWY0ODcxOTZjZGU1YmEwMjc0ZTAvZGlvLzI3NDMwMzI5MC9maXQtd2lkdGgvNDAw/a"
        XCTAssertEqual(ImageURL.url(ad, .large)?.absoluteString, ad)
        XCTAssertTrue(ImageURL.dpgHosts.isSuperset(of: ["image.volkskrant.nl", "image.demorgen.be", "image.parool.nl", "image.trouw.nl"]))
    }

    // Het geval van Alex: de server mat het vierkant van 320 uit de feed. Dat telt niet: we tonen de variant van 1280.
    func testGemetenVierkantTeltNietAlsKlein() {
        ImageURL.screen = (390, 3)
        for raw in ["https://image.parool.nl/280236357/feature-crop/320/320/afbeelding",
                    "https://image.trouw.nl/279661351/feature-crop/320/320/afbeelding",
                    "https://image.volkskrant.nl/271874508/feature-crop/320/320/afbeelding",
                    "https://image.parool.nl/280252845/roi/320/320/1863/565/afbeelding"] {
            let it = item(raw, meta: vierkant)
            XCTAssertFalse(ImageURL.measuredOriginal(it), raw)
            XCTAssertNil(it.measure, "de meting hoort bij het vierkant, niet bij de variant van 3:2")
            XCTAssertEqual(it.pictureURL(.large), ImageURL.url(raw, .large))
            XCTAssertEqual(ImageURL.sourceWidth(it), 1024)
            XCTAssertTrue(ImageURL.sharpHere(it), "groot beeld, niet klein rechts: \(raw)")
            XCTAssertTrue(ImageURL.fitsLarge(raw))
        }
        // Met gemeten randen blijft het origineel leidend (en dan is 320 klein), zoals bij elke bron.
        var randen = vierkant
        randen.crop = .init(l: 0, r: 0, t: 20, b: 20)
        let it = item("https://image.parool.nl/1/feature-crop/320/320/afbeelding", meta: randen)
        XCTAssertTrue(ImageURL.measuredOriginal(it))
        XCTAssertEqual(it.measure, randen)
        XCTAssertEqual(ImageURL.sourceWidth(it), 320)
        XCTAssertFalse(ImageURL.sharpHere(it))
        // Een bron zonder varianten: de meting telt, zoals altijd.
        let elders = item("https://example.org/a.jpg", meta: vierkant)
        XCTAssertTrue(ImageURL.measuredOriginal(elders))
        XCTAssertEqual(ImageURL.sourceWidth(elders), 320)
    }
}
