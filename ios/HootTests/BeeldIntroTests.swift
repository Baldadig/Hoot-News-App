import XCTest
import UIKit
@testable import Hoot

// Build 46 (BEELD-EN-INTRO.md): intro in 3 regels met hele zinnen, Bing-beeld groot als het kan, en bij een
// beeld dat niet laadt geen grijs vlak maar de beeldloze vorm. Dezelfde regels als het web
// (tests/beeld-intro-web.test.mjs).
@MainActor
final class BeeldIntroTests: XCTestCase {
    func testIntroStandaardDrieRegelsEnOudeTweeWordtDrie() {
        XCTAssertEqual(HootStore.introLines, 3)
        XCTAssertEqual(HootStore.oldPreview(2), 3) // de oude standaard, ook door de app meegestuurd
        XCTAssertEqual(HootStore.oldPreview(1), 1)
        XCTAssertEqual(HootStore.oldPreview(0), 0) // de hele intro
        XCTAssertNil(HootStore.oldPreview(nil))
    }

    func testDrieRegelsHoudtEenZinDieInTweeWegviel() {
        let intro = "De Democraten hebben bij de tussentijdse verkiezingen in de Verenigde Staten een grote overwinning behaald op de Republikeinen en ook in staten waar Trump twee jaar geleden nog ruim won. Trump erkent zijn verlies niet."
        XCTAssertEqual(wholeSentences(intro, max: introMax(lines: 2, thumb: false)), "")
        let drie = wholeSentences(intro, max: introMax(lines: 3, thumb: false))
        XCTAssertTrue(drie.hasPrefix("De Democraten hebben") && drie.hasSuffix("ruim won."))
        for t in ["Een zin die stopt middenin…", "Eerste zin is af. Tweede zin stopt mid..."] {
            for n in 1 ... 3 { XCTAssertFalse(wholeSentences(t, max: introMax(lines: n, thumb: n == 2)).hasSuffix("…")) }
        }
    }

    func testGeleendeIntroDraagtZijnBron() throws {
        let json = #"{"id":"a","source":"volkskrant","url":"https://www.volkskrant.nl/a","title":"Kop","summary":"Een hele zin.","borrowedFrom":"NOS"}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        XCTAssertEqual(item.introWithSource("Een hele zin."), "Een hele zin. — via NOS")
        XCTAssertEqual(item.viaLength, 11)
    }

    func testBingBeeldGemetenMagGroot() {
        let ongemeten = "https://www.bing.com/th?id=ONUT.abc&pid=News&w=1200&h=675&c=7"
        XCTAssertEqual(ImageURL.knownWidth(ongemeten), 320)
        XCTAssertFalse(ImageURL.fitsLarge(ongemeten))
        let groot = "https://www.bing.com/th?id=ONUT.abc&pid=News&w=700&h=393"
        XCTAssertEqual(ImageURL.knownWidth(groot), 700)
        XCTAssertTrue(ImageURL.fitsLarge(groot))
        XCTAssertTrue(ImageURL.fitsHero(groot)) // The Economist in het hoofdverhaal
        XCTAssertFalse(ImageURL.fitsLarge("https://www.bing.com/th?id=ONUT.k&pid=News&w=300&h=200"))
    }

    func testBeeldDatNietLaadtWordtBeeldloosGeenGrijsVlak() async {
        ImageFallbackProtocol.reset()
        ImageFallbackProtocol.originalStatus = 404
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [ImageFallbackProtocol.self]
        let loader = RemoteImageLoader()
        await loader.load(URL(string: "https://images.nrc.nl/weg.png"), transport: URLSession(configuration: config))
        XCTAssertNil(loader.image)
        XCTAssertTrue(loader.failed)
        // Geen adres is ook beeldloos.
        let leeg = RemoteImageLoader()
        await leeg.load(nil)
        XCTAssertTrue(leeg.failed)
        // Wel geladen: niet mislukt.
        ImageFallbackProtocol.reset()
        let goed = RemoteImageLoader()
        await goed.load(URL(string: "https://images.nrc.nl/goed.png"), transport: URLSession(configuration: config))
        XCTAssertNotNil(goed.image)
        XCTAssertFalse(goed.failed)
        ImageFallbackProtocol.reset()
    }

    func testBeeldloosStaatOpEenPlek() throws {
        // De rijen en het hoofdverhaal tonen bij geen of mislukt beeld BeeldloosView; RemoteImage laat bij een
        // mislukking geen grijs vlak staan.
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let components = try String(contentsOf: root.appending(path: "Hoot/Views/Components.swift"), encoding: .utf8)
        XCTAssertEqual(components.components(separatedBy: "BeeldloosView(item: item, kind:").count - 1, 4) // hoofdverhaal (2), tijdlijn, krant
        XCTAssertTrue(components.contains("} else if loader.failed {\n                Color.clear"))
        XCTAssertTrue(components.contains("onFail: mislukt"))
    }
}
