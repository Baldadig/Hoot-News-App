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
