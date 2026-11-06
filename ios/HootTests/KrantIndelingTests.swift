import XCTest
import SwiftUI
@testable import Hoot

// Concept A voor de iPhone Duo, "De krant open" (Krant.swift). De indeling beslist alleen op de breedteklasse,
// de maat van het vlak en de vouw (de gereserveerde zone `.division`), nooit op toestel of oriëntatie.
// Maten uit het Duo-profiel van Xcode 27.2: buiten 466 × 678, binnen 669 × 951.
@MainActor final class KrantIndelingTests: XCTestCase {
    // De vouw zoals iOS 27.1 hem geeft: vlak open inactief en 0 breed, half gevouwen actief met marge.
    static let boekVlak = Rug(frame: CGRect(x: 475.5, y: 0, width: 0, height: 669), actief: false)
    static let boekHalf = Rug(frame: CGRect(x: 465.5, y: 0, width: 20, height: 669), actief: true, marge: EdgeInsets(top: 0, leading: 12, bottom: 0, trailing: 12))
    static let staandVlak = Rug(frame: CGRect(x: 0, y: 475.5, width: 669, height: 0), actief: false)
    static let tafel = Rug(frame: CGRect(x: 0, y: 465.5, width: 669, height: 20), actief: true, marge: EdgeInsets(top: 12, leading: 0, bottom: 12, trailing: 0))

    func testDichtIsDeIPhone() {
        // Buiten staand en liggend: compact, ook al zou er een vouw gemeld worden.
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 466, height: 678), horizontal: .compact, rug: nil), .enkel(pagina: nil))
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 678, height: 466), horizontal: .compact, rug: nil), .enkel(pagina: nil))
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 951, height: 669), horizontal: .compact, rug: Self.boekVlak), .enkel(pagina: nil))
    }

    func testZonderVouwVerandertErNiets() {
        // iPhone Pro Max liggend (compact) en iPad (regulier, geen vouw): zoals het was.
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 956, height: 440), horizontal: .compact, rug: nil), .enkel(pagina: nil))
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 1180, height: 820), horizontal: .regular, rug: nil), .enkel(pagina: nil))
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 744, height: 1133), horizontal: .regular, rug: nil), .enkel(pagina: nil))
    }

    func testOpenLiggendTweeBladzijden() throws {
        let indeling = KrantIndeling.kies(size: CGSize(width: 951, height: 669), horizontal: .regular, rug: Self.boekVlak)
        guard case let .naast(lijst, verhaal) = indeling else { return XCTFail("verwacht naast, kreeg \(indeling)") }
        XCTAssertEqual(lijst.width, 475.5, accuracy: 0.01)
        XCTAssertEqual(verhaal.minX, 475.5, accuracy: 0.01)
        XCTAssertEqual(verhaal.maxX, 951, accuracy: 0.01)
        // De lijst is de iPhone-lijst: niet breed (geen paren), net als dicht op 466.
        XCTAssertLessThan(indeling.lijstBreedte(in: CGSize(width: 951, height: 669)), 700)
    }

    func testHalfGevouwenNooitOverDeVouw() {
        let indeling = KrantIndeling.kies(size: CGSize(width: 951, height: 669), horizontal: .regular, rug: Self.boekHalf)
        guard case let .naast(lijst, verhaal) = indeling else { return XCTFail("verwacht naast, kreeg \(indeling)") }
        XCTAssertLessThanOrEqual(lijst.maxX, Self.boekHalf.vrij.minX)
        XCTAssertGreaterThanOrEqual(verhaal.minX, Self.boekHalf.vrij.maxX)
        XCTAssertFalse(lijst.intersects(Self.boekHalf.vrij))
        XCTAssertFalse(verhaal.intersects(Self.boekHalf.vrij))
    }

    func testVerticaleBalkMaaktEenBladzijdeSmallerNietDeVouwAnders() {
        // iOS 27.1 zet de balken binnen liggend opzij: het vlak is smaller, de vouw ligt niet meer in het midden
        // ervan. Elke bladzijde blijft aan één kant van de vouw (TT461: insets niet symmetrisch aannemen).
        let balk: CGFloat = 64
        var rug = Self.boekHalf
        rug.frame = rug.frame.offsetBy(dx: -balk, dy: 0)
        let indeling = KrantIndeling.kies(size: CGSize(width: 951 - balk, height: 669), horizontal: .regular, rug: rug)
        guard case let .naast(lijst, verhaal) = indeling else { return XCTFail("verwacht naast, kreeg \(indeling)") }
        XCTAssertLessThanOrEqual(lijst.maxX, rug.vrij.minX)
        XCTAssertGreaterThanOrEqual(verhaal.minX, rug.vrij.maxX)
        XCTAssertNotEqual(lijst.width, verhaal.width)
    }

    func testTeSmalVoorTweeBladzijden() {
        // Een smal venster met een vouw (Split View op het binnenscherm): één bladzijde.
        let rug = Rug(frame: CGRect(x: 300, y: 0, width: 0, height: 669), actief: false)
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 600, height: 669), horizontal: .regular, rug: rug), .enkel(pagina: 560))
    }

    func testOpenStaandEenKrantenpagina() {
        // 669 breed met een dwarse vouw: geen opgerekte iPhone (hoofdbeeld 669 × 446), maar één pagina van 560.
        let indeling = KrantIndeling.kies(size: CGSize(width: 669, height: 951), horizontal: .regular, rug: Self.staandVlak)
        XCTAssertEqual(indeling, .enkel(pagina: 560))
        XCTAssertFalse(indeling.spread)
    }

    func testTafelbladBovenLezenOnderBedienen() {
        let indeling = KrantIndeling.kies(size: CGSize(width: 669, height: 951), horizontal: .regular, rug: Self.tafel)
        guard case let .boven(verhaal, lijst) = indeling else { return XCTFail("verwacht boven, kreeg \(indeling)") }
        XCTAssertLessThanOrEqual(verhaal.maxY, Self.tafel.vrij.minY)
        XCTAssertGreaterThanOrEqual(lijst.minY, Self.tafel.vrij.maxY)
        XCTAssertLessThan(verhaal.minY, lijst.minY, "het verhaal boven, de lijst (bediening) onder")
    }

    func testVouwBuitenHetVlakTeltNiet() {
        let ver = Rug(frame: CGRect(x: 2000, y: 0, width: 20, height: 669), actief: true)
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 951, height: 669), horizontal: .regular, rug: ver), .enkel(pagina: nil))
    }

    // MARK: De leesmaat: de letter die je koos, ± 50 tekens

    func testLeesmaatHoudtDeLetter() {
        // De twee bladzijden van de Duo: vlak open (475,5) en half gevouwen (453,5, vouw 20 + 2 × 12 marge).
        // De standaardletter blijft: ± 50 tekens, zoals dicht op het buitenscherm. Niet kleiner om 60 te halen.
        for kolom in [475.5, 453.5] {
            let tekens = Leesmaat.tekens(kolom: kolom, px: Leesmaat.tekstFactor * 17, marge: Leesmaat.marge(pagina: true))
            XCTAssertGreaterThanOrEqual(tekens, 45, "kolom \(kolom)")
            XCTAssertLessThanOrEqual(tekens, 55, "kolom \(kolom)")
        }
        XCTAssertEqual(Leesmaat.marge(pagina: false), 16)
        XCTAssertEqual(Leesmaat.marge(pagina: true), 12)
    }

    func testDeLetterOpEenBladzijdeIsDeLetterVanHetBlad() {
        // Voor elke tekstgrootte van de lezer: op een bladzijde dezelfde font-size als op het blad.
        let item = Item(id: "x", source: "nos", title: "Kop", url: "https://nos.nl/a")
        let article = Article(title: "Kop", content: "<p>Tekst</p>", length: 10)
        for size in 0..<ReaderHTML.scales.count {
            let blad = ReaderHTML.page(article, item: item, sourceName: "NOS", size: size, typeSize: .large, width: 475)
            let pagina = ReaderHTML.page(article, item: item, sourceName: "NOS", size: size, typeSize: .large, width: 475, pagina: true)
            let maat = "font-size: calc(1.12rem * \(ReaderHTML.scales[size]));"
            XCTAssertTrue(blad.contains(maat), "blad, grootte \(size)")
            XCTAssertTrue(pagina.contains(maat), "bladzijde, grootte \(size)")
        }
    }

    // MARK: De beveiliging: een andere opmaak alleen met een vouw

    func testIPadEnSplitViewBlijvenGelijk() {
        // Elk regulier venster zonder vouw, ook de Split View-maten van 640 tot 700 (waar concept C ging
        // wisselen): altijd .enkel(nil), dus de oude WidthReader-regel (breed vanaf 700) blijft gelden.
        for breedte in stride(from: 320.0, through: 1366, by: 2) {
            for hoogte in [669.0, 744, 1024, 1133] {
                XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: breedte, height: hoogte), horizontal: .regular, rug: nil), .enkel(pagina: nil), "\(breedte) × \(hoogte)")
            }
        }
        // Compact (iPhone, ook met een gemelde vouw): nooit iets anders.
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 440, height: 956), horizontal: .compact, rug: Self.staandVlak), .enkel(pagina: nil))
        XCTAssertNil(KrantIndeling.enkel(pagina: nil).breed(lijst: 1200), "zonder vouw beslist het venster, niet de krant")
    }

    func testBreedAlleenMetVouw() {
        XCTAssertEqual(KrantIndeling.enkel(pagina: 560).breed(lijst: 560), false)
        XCTAssertEqual(KrantIndeling.naast(lijst: .init(x: 0, y: 0, width: 475, height: 669), verhaal: .init(x: 475, y: 0, width: 475, height: 669)).breed(lijst: 475), false)
    }

    // MARK: Zonder krant in de omgeving (toetsen, voorbeelden): geen crash

    func testKrantViewsZonderKrantStaat() {
        // Vroeger: "No Observable object of type KrantStaat" zodra een rij buiten RootView stond (9 rendertoetsen).
        let item = Item(id: "x", source: "nos", title: "Kop", url: "https://nos.nl/a")
        let views: [AnyView] = [
            AnyView(Text("rij").krantGekozen(item)),
            AnyView(NavigationStack { Text("lijst").krantVerhaal() }),
            AnyView(KrantPagina(tab: .editie).environment(HootStore())),
            AnyView(KrantSpread { Text("lijst") }),
        ]
        for view in views {
            let host = UIHostingController(rootView: view.frame(width: 466, height: 678))
            host.view.frame = CGRect(x: 0, y: 0, width: 466, height: 678)
            host.view.layoutIfNeeded()
            XCTAssertNotNil(host.view)
        }
    }

    func testDeBladzijdeLezerZetDeMaatInDePagina() {
        let item = Item(id: "x", source: "nos", title: "Kop", url: "https://nos.nl/a")
        let article = Article(title: "Kop", content: "<p>Tekst</p>", length: 10)
        let blad = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, typeSize: .large, width: 475)
        let pagina = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, typeSize: .large, width: 475, pagina: true)
        XCTAssertTrue(blad.contains("padding: 16px 16px 48px"))
        XCTAssertTrue(pagina.contains("padding: 16px 12px 48px"))
        XCTAssertNotEqual(blad, pagina)
    }
}
