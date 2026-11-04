import XCTest
@testable import Hoot

final class ImageMeasureTests: XCTestCase {
    func testAsymmetrischeUitsnedeEnVasteVerhouding() throws {
        let json = #"{"id":"test","source":"nos","title":"Kop","url":"https://nos.nl/a","imageMeta":{"w":160,"h":100,"crop":{"l":24,"r":16,"t":0,"b":0},"ratio":1.2}}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        let m = try XCTUnwrap(item.imageMeta)
        XCTAssertTrue(m.valid)
        XCTAssertFalse(m.portrait)
        let frame = m.frame(in: CGSize(width: 240, height: 200))
        XCTAssertEqual(frame.width, 320)
        XCTAssertEqual(frame.minX, -48)
        XCTAssertEqual(frame.minY, 0)
        let encoded = try JSONEncoder().encode(item)
        XCTAssertEqual(try JSONDecoder().decode(Item.self, from: encoded).imageMeta, m)
    }
    func testStaandEnOudBericht() throws {
        let old = Data(#"{"id":"test","source":"nos","title":"Kop","url":"https://nos.nl/a"}"#.utf8)
        XCTAssertNil(try JSONDecoder().decode(Item.self, from: old).imageMeta)
        let m = ImageMeasure(w: 60, h: 100, crop: .init(l: 0, r: 0, t: 0, b: 0), ratio: 0.6)
        XCTAssertTrue(m.portrait)
        XCTAssertFalse(ImageMeasure(w: 60, h: 100, crop: .init(l: 60, r: 0, t: 0, b: 0), ratio: 0).valid)
    }
}

final class ImageMeasureRowTests: XCTestCase {
    // NOS-beeld uit de live feed: 1024x576 met 223 px wit links en rechts, in het 2:1-vak van de Stroom.
    func testWitteZijbalkenVallenBuitenHetTijdlijnvak() throws {
        let m = ImageMeasure(w: 1024, h: 576, crop: .init(l: 223, r: 223, t: 0, b: 0), ratio: 578 / 576)
        let box = CGSize(width: 358, height: 179)
        let f = m.frame(in: box)
        XCTAssertEqual(f.minX + 223 * f.width / 1024, 0, accuracy: 0.001)
        XCTAssertEqual(f.maxX - 223 * f.width / 1024, box.width, accuracy: 0.001)
        XCTAssertGreaterThanOrEqual(f.height, box.height)
        // Dezelfde berekening voor de krantminiatuur (3:2): geen vervorming, de verhouding blijft die van het bronbeeld.
        let thumb = m.frame(in: CGSize(width: 96, height: 64))
        XCTAssertEqual(thumb.width / thumb.height, 1024 / 576, accuracy: 0.001)
        XCTAssertEqual(thumb.minX + 223 * thumb.width / 1024, 0, accuracy: 0.001)
    }
    func testItemKiestHetOrigineleBeeldMetMetingEnDeCdnZonder() throws {
        let json = #"{"id":"t","source":"nos","title":"Kop","url":"https://nos.nl/a","image":"https://images.cdn.nos.nl/a/0x0x1920x1080-1024x576.webp","imageMeta":{"w":1024,"h":576,"crop":{"l":223,"r":223,"t":0,"b":0},"ratio":1.0035}}"#
        var item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        XCTAssertNotNil(item.measure)
        XCTAssertEqual(item.pictureURL(.large)?.absoluteString, item.image)
        item.imageMeta = nil
        XCTAssertNil(item.measure)
        XCTAssertEqual(item.pictureURL(.large), ImageURL.url(item.image, .large))
    }
}
