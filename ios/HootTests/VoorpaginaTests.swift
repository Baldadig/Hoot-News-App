import XCTest
import SwiftUI
@testable import Hoot

// Stap 2 van de Duo: de compacte voorpagina dicht (Voorpagina.swift). Alleen op een breed en laag venster met
// compacte breedte en de systeembalk opzij: het buitenscherm van de iPhone Duo (466 × 678, liggend 678 × 466).
// Gewone iPhones, de iPad en de Duo open blijven zoals ze waren.
@MainActor final class VoorpaginaTests: XCTestCase {
    func testAlleenDeDuoDicht() {
        // Duo dicht, staand en liggend, met de balk opzij.
        XCTAssertTrue(Voorpagina.compact(venster: CGSize(width: 466, height: 678), horizontal: .compact, balkOpzij: true))
        XCTAssertTrue(Voorpagina.compact(venster: CGSize(width: 678, height: 466), horizontal: .compact, balkOpzij: true))
        // Zonder balk opzij (iOS 26, of een iPhone): niets.
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 466, height: 678), horizontal: .compact, balkOpzij: false))
        // Gewone iPhones staand en liggend: smal en hoog, en de balk staat er niet opzij. Ook met de balk-nabootsing
        // (-HootBalkOpzij 1) blijft een smal, hoog venster de gewone iPhone.
        for venster in [CGSize(width: 375, height: 667), CGSize(width: 375, height: 812), CGSize(width: 402, height: 874), CGSize(width: 440, height: 956)] {
            XCTAssertFalse(Voorpagina.compact(venster: venster, horizontal: .compact, balkOpzij: false))
            XCTAssertFalse(Voorpagina.compact(venster: venster, horizontal: .compact, balkOpzij: true), "\(venster)")
        }
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 956, height: 440), horizontal: .regular, balkOpzij: false))
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 874, height: 402), horizontal: .compact, balkOpzij: false))
        // iPad en de Duo open: regulier, nooit.
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 744, height: 1133), horizontal: .regular, balkOpzij: false))
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 951, height: 669), horizontal: .regular, balkOpzij: true))
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 669, height: 951), horizontal: .regular, balkOpzij: false))
        // Nog niet gemeten: niets.
        XCTAssertFalse(Voorpagina.compact(venster: .zero, horizontal: .compact, balkOpzij: true))
    }

    func testDeNabootsingAlleenCompact() {
        // -HootVoorpagina compact: op elke iPhone (om te vergelijken), nooit op een iPad.
        XCTAssertTrue(Voorpagina.compact(venster: CGSize(width: 440, height: 956), horizontal: .compact, balkOpzij: false, geforceerd: true))
        XCTAssertFalse(Voorpagina.compact(venster: CGSize(width: 744, height: 1133), horizontal: .regular, balkOpzij: false, geforceerd: true))
    }

    func testZeroOneBovenDeVouwOpDeDuo() {
        // Dicht op de Duo: 01 boven de vouw, ook bij XL en XXL (het scherm is 678 hoog, maar breder).
        for t: DynamicTypeSize in [.small, .large, .xLarge, .xxLarge] {
            XCTAssertEqual(Vouw.profiel(vensterHoogte: 678, typeSize: t, compacteVoorpagina: true), .duo, "\(t)")
        }
        XCTAssertNil(Vouw.profiel(vensterHoogte: 678, typeSize: .xxxLarge, compacteVoorpagina: true))
        XCTAssertNil(Vouw.profiel(vensterHoogte: 678, typeSize: .accessibility2, compacteVoorpagina: true))
        XCTAssertEqual(Vouw.introRegels(.duo), 3)
        XCTAssertEqual(Vouw.kop26Vanaf(.duo), 4)
        XCTAssertEqual(Vouw.kopKleinst(.duo), 24)
        XCTAssertNil(Vouw.kopKleinst(.pro))
        XCTAssertNil(Vouw.kopKleinst(.mini))
        // De iPhone-regels blijven gelijk.
        XCTAssertNil(Vouw.profiel(vensterHoogte: 678, typeSize: .large))
        XCTAssertEqual(Vouw.profiel(vensterHoogte: 956, typeSize: .large), .pro)
        XCTAssertNil(Vouw.profiel(vensterHoogte: 956, typeSize: .xLarge))
        XCTAssertEqual(Vouw.maxTekst(.pro), .large)
        XCTAssertEqual(Vouw.maxTekst(.mini), .large)
        XCTAssertEqual(Vouw.introRegels(.pro), 5)
        XCTAssertNil(Vouw.kop26Vanaf(.pro))
        // Het beeld van 01: op de Duo tot 5:2 (zodat de intro past), op de iPhone tot 2:1, zoals het was.
        XCTAssertEqual(Vouw.beeld(ruimte: 0, tekst: 0, breedte: 400, profiel: .duo), 160, accuracy: 0.01)
        XCTAssertEqual(Vouw.beeld(ruimte: 0, tekst: 0, breedte: 400, profiel: .pro), 200, accuracy: 0.01)
        XCTAssertEqual(Vouw.beeld(ruimte: 0, tekst: 0, breedte: 400), 200, accuracy: 0.01)
    }

    private func hoogte(_ row: ItemRow, breedte: CGFloat) -> CGFloat {
        let host = UIHostingController(rootView: row.environment(HootStore()).environment(Reader()).frame(width: breedte).fixedSize(horizontal: false, vertical: true))
        return host.sizeThatFits(in: CGSize(width: breedte, height: .greatestFiniteMagnitude)).height
    }

    func testDichteRijenGevenBijnaVijfVerhalenPerScherm() {
        // De kolom dicht op de Duo: 466 min de verticale balk (± 58) min 2 × 16 marge.
        let kolom: CGFloat = 376
        let item = Item(id: "d", source: "nos", sourceName: "NOS", title: "Kabinet wil het aantal woningen in de grote steden sneller laten groeien met extra geld voor gemeenten", summary: "Het kabinet wil dat er de komende jaren meer huizen worden gebouwd. Gemeenten krijgen daarvoor extra geld. Woningzoekers moeten zo sneller een plek vinden.", url: "https://nos.nl/d", publishedAt: ISO8601DateFormatter().string(from: .now))
        let dicht = hoogte(ItemRow(item: item, number: 2, label: "Binnenland", form: .krant, dicht: true), breedte: kolom)
        let krant = hoogte(ItemRow(item: item, number: 2, label: "Binnenland", form: .krant), breedte: kolom)
        let kaart = hoogte(ItemRow(item: item, number: 2, label: "Binnenland"), breedte: kolom)
        XCTAssertLessThan(dicht, krant, "dicht \(dicht) / krant \(krant)")
        XCTAssertLessThan(dicht, kaart, "dicht \(dicht) / kaart \(kaart)")
        // Met de lijn ertussen (16 + 1): minstens vier rijen op 678 bij een lange kop, en vier en een half bij een
        // kop van twee regels (op de echte Duo: 02 tot 05 helemaal, 06 half). Zonder de kop van de Editie.
        print("Voorpagina: dichte rij", dicht, "krant", krant, "kaart", kaart)
        // Grens bewust bijgesteld (release 1.2, 8 november): de art director keurde de dichte rijen zoals ze nu zijn,
        // met ± 4,5 verhalen per scherm. Bij een lange kop (drie regels) zijn vier rijen 682,67: de vierde rij steekt
        // 4,7 pt onder het scherm uit, en dat hoort zo (je ziet dat er meer komt). De opmaak blijft; de grens krijgt
        // 12 pt speling (690). Wordt een rij nog hoger, dan faalt hij weer: dan opnieuw naar de opmaak kijken.
        let speling: CGFloat = 12
        XCTAssertLessThanOrEqual(4 * (dicht + Space.s4 + 1), 678 + speling, "rij \(dicht)")
        var kort = item
        kort.title = "Kabinet wil sneller bouwen in de grote steden"
        let kortDicht = hoogte(ItemRow(item: kort, number: 3, label: "Binnenland", form: .krant, dicht: true), breedte: kolom)
        print("Voorpagina: dichte rij, korte kop", kortDicht)
        XCTAssertLessThanOrEqual(4.5 * (kortDicht + Space.s4 + 1), 678, "korte rij \(kortDicht)")
    }

    func testDichtNietBijHeelGroteTekst() {
        // Bij een accessibility-maat krijgt de kop de hele breedte: de gewone rij, geen dichte.
        let item = Item(id: "d", source: "nos", title: "Kop", url: "https://nos.nl/d")
        let groot = UIHostingController(rootView: ItemRow(item: item, form: .krant, dicht: true).environment(HootStore()).environment(Reader()).environment(\.dynamicTypeSize, .accessibility3).frame(width: 376))
        groot.view.frame = CGRect(x: 0, y: 0, width: 376, height: 678)
        groot.view.layoutIfNeeded()
        XCTAssertNotNil(groot.view)
    }
}
