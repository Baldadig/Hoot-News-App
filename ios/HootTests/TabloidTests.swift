import XCTest
import SwiftUI
@testable import Hoot

// Duo stap 3: de Editie als tabloid op het binnenscherm (Krant.swift, EditionView). Open staand 01 als opening over
// de volle breedte en daaronder twee kolommen; met een staande rug (open liggend, half gevouwen als boek) elke kolom op
// zijn eigen bladzijde, de goot op de vouw. Nooit tekst of een knop over de vouw; iPhone en iPad ongewijzigd.
@MainActor final class TabloidTests: XCTestCase {
    typealias T = KrantIndelingTests
    static let staand = CGSize(width: 669, height: 951)
    static let liggend = CGSize(width: 951, height: 669)

    // MARK: Wanneer de tabloid

    func testOpenStaandIsDeEditieEenTabloid() {
        let indeling = KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.staandVlak, krant: true)
        XCTAssertEqual(indeling, .tabloid(boek: false))
        XCTAssertFalse(indeling.spread, "open staand is de lezer een blad, zoals dicht")
        XCTAssertFalse(indeling.heeftPagina)
        XCTAssertEqual(indeling.breed(lijst: 669), true, "de brede Editie: opening en paren")
        // Met de lezer open (een blad) blijft de tabloid eronder liggen: niets verspringt.
        XCTAssertEqual(KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.staandVlak, krant: true, rechtsVrij: false), .tabloid(boek: false))
    }

    func testAndereTabbladenHoudenEenKrantenpagina() {
        // De Stroom, de Selectie, Bewaard en Zoeken: één rustige kolom (de keuze en de reden staan in VERSLAG.md).
        XCTAssertEqual(KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.staandVlak), .enkel(pagina: 560))
    }

    func testAlsBoekEenKolomPerBladzijde() {
        for rug in [T.boekVlak, T.boekHalf] {
            let indeling = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: rug, krant: true, rechtsVrij: true)
            XCTAssertEqual(indeling, .tabloid(boek: true), "rug \(rug)")
            XCTAssertTrue(indeling.spread, "tik je een verhaal aan, dan opent het op de rechterbladzijde, niet als blad")
            XCTAssertFalse(indeling.heeftPagina, "geen voorpagina rechts met 01 nog eens (KEURING A3)")
            // Ligt er rechts iets open (de lezer, Vergelijken), dan het opengeslagen boek: de lijst links, het verhaal rechts.
            guard case let .naast(lijst, verhaal) = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: rug, krant: true, rechtsVrij: false) else { return XCTFail("verwacht naast") }
            XCTAssertLessThanOrEqual(lijst.maxX, rug.vrij.minX)
            XCTAssertGreaterThanOrEqual(verhaal.minX, rug.vrij.maxX)
        }
    }

    func testTafelBlijftZoalsHetWas() {
        // Half gevouwen als laptop (de dwarse rug actief) is een volgende stap: boven het verhaal, onder de lijst.
        guard case .boven = KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.tafel, krant: true) else { return XCTFail("verwacht boven") }
    }

    func testTeSmalVoorEenTabloid() {
        let rug = Rug(frame: CGRect(x: 0, y: 475.5, width: 600, height: 0), actief: false)
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 600, height: 951), horizontal: .regular, rug: rug, krant: true), .enkel(pagina: 560))
    }

    func testZonderVouwNooitEenTabloid() {
        // iPad (alle maten, ook Split View) en iPhone: de Editie zoals altijd, ook als het tabblad een tabloid zou mogen.
        for breedte in stride(from: 320.0, through: 1366, by: 2) {
            for hoogte in [669.0, 744, 951, 1133] {
                XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: breedte, height: hoogte), horizontal: .regular, rug: nil, krant: true), .enkel(pagina: nil), "\(breedte) × \(hoogte)")
            }
        }
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 466, height: 678), horizontal: .compact, rug: T.staandVlak, krant: true), .enkel(pagina: nil), "dicht")
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 440, height: 956), horizontal: .compact, rug: nil, krant: true), .enkel(pagina: nil), "iPhone")
    }

    func testHeelGroteTekstGeenKolommen() {
        let staand = Tabloid(rug: T.staandVlak, boek: false)
        let boek = Tabloid(rug: T.boekHalf, boek: true)
        XCTAssertEqual(EditionView.tabloidGrid(staand, typeSize: .large), .tabloid)
        XCTAssertEqual(EditionView.tabloidGrid(staand, typeSize: .xxxLarge), .tabloid)
        XCTAssertEqual(EditionView.tabloidGrid(boek, typeSize: .large), .boek)
        XCTAssertNil(EditionView.tabloidGrid(staand, typeSize: .accessibility1), "bij heel grote tekst één kolom")
        XCTAssertNil(EditionView.tabloidGrid(nil, typeSize: .large), "zonder tabloid het gewone raster")
    }

    // MARK: De goot op de vouw

    func testDeGootLigtOpDeVouwAlsBoek() {
        // De inhoud binnen de marges van 16: van 16 tot 935.
        let inhoud = CGRect(x: 16, y: 0, width: 919, height: 0)
        let k = KrantKolommen.bereken(inhoud: inhoud, rug: T.boekHalf)
        XCTAssertTrue(k.opRug)
        let goot = k.goot(in: inhoud)
        XCTAssertLessThanOrEqual(goot.lowerBound, T.boekHalf.vrij.minX, "de linkerkolom stopt vóór de zone")
        XCTAssertGreaterThanOrEqual(goot.upperBound, T.boekHalf.vrij.maxX, "de rechterkolom begint na de zone")
        XCTAssertEqual(goot.lowerBound, T.boekHalf.vrij.minX - KrantKolommen.lucht / 2, accuracy: 0.01)
        XCTAssertEqual(k.links + k.goot + k.rechts, inhoud.width, accuracy: 0.01)
        XCTAssertEqual(k.links, k.rechts, accuracy: 0.01, "midden in het vlak: twee even brede kolommen")
        XCTAssertGreaterThan(k.links, 400, "een volle kolom per bladzijde")
    }

    func testVlakOpenDeGootOpDeVouwlijn() {
        let inhoud = CGRect(x: 16, y: 0, width: 919, height: 0)
        let k = KrantKolommen.bereken(inhoud: inhoud, rug: T.boekVlak)
        let goot = k.goot(in: inhoud)
        XCTAssertEqual((goot.lowerBound + goot.upperBound) / 2, T.boekVlak.frame.midX, accuracy: 0.01)
        XCTAssertEqual(k.goot, KrantKolommen.lucht, accuracy: 0.01)
    }

    func testEenBalkOpzijMaaktEenKolomSmallerDeGootBlijftOpDeVouw() {
        // iOS 27.1 zet binnen liggend de balken opzij: de inhoud schuift, de vouw niet (TT461: insets niet symmetrisch).
        let inhoud = CGRect(x: 16 + 64, y: 0, width: 951 - 64 - 32, height: 0)
        let k = KrantKolommen.bereken(inhoud: inhoud, rug: T.boekHalf)
        let goot = k.goot(in: inhoud)
        XCTAssertTrue(goot.contains(T.boekHalf.vrij.minX) && goot.contains(T.boekHalf.vrij.maxX))
        XCTAssertLessThan(k.links, k.rechts)
        XCTAssertEqual(k.links + k.goot + k.rechts, inhoud.width, accuracy: 0.01)
    }

    func testOpenStaandDeGootInHetMidden() {
        // De vouw ligt dwars: geen staande rug, dus twee even brede kolommen met 32 lucht in het midden.
        let inhoud = CGRect(x: 16, y: 0, width: 637, height: 0)
        let k = KrantKolommen.bereken(inhoud: inhoud, rug: T.staandVlak)
        XCTAssertFalse(k.opRug)
        XCTAssertEqual(k.links, 302.5, accuracy: 0.01)
        XCTAssertEqual(k.rechts, 302.5, accuracy: 0.01)
        XCTAssertEqual(k.goot, 32, accuracy: 0.01)
        XCTAssertGreaterThanOrEqual(k.links, (KrantIndeling.minTabloid - 64) / 2, "een kolom is nooit smaller dan de grens")
    }

    func testRugBuitenDeInhoudGeeftHetMidden() {
        let inhoud = CGRect(x: 16, y: 0, width: 637, height: 0)
        let ver = Rug(frame: CGRect(x: 2000, y: 0, width: 20, height: 669), actief: true)
        let k = KrantKolommen.bereken(inhoud: inhoud, rug: ver)
        XCTAssertFalse(k.opRug)
        XCTAssertEqual(k.links, k.rechts, accuracy: 0.01)
    }

    // MARK: De lezer open staand: één rustige kolom

    func testDeLezerOverDeTabloidHaaltZestigTotZeventigTekens() {
        let px = Leesmaat.tekstFactor * 17 // de standaardletter
        let tabloid = Leesmaat.tekens(kolom: 669, px: px, marge: Leesmaat.marge(pagina: false, ruim: true))
        XCTAssertGreaterThanOrEqual(tabloid, 60)
        XCTAssertLessThanOrEqual(tabloid, 70)
        // Een grotere letter geeft een kortere regel, nooit een kleinere letter.
        XCTAssertLessThan(Leesmaat.tekens(kolom: 669, px: Leesmaat.tekstFactor * 21, marge: 24), tabloid)
        // iPhone en iPad: de marge blijft 16.
        XCTAssertEqual(Leesmaat.marge(pagina: false), 16)
        let item = Item(id: "x", source: "nos", title: "Kop", url: "https://nos.nl/a")
        let article = Article(title: "Kop", content: "<p>Tekst</p>", length: 10)
        XCTAssertTrue(ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, typeSize: .large, width: 669, ruim: true).contains("padding: 16px 24px 48px"))
        XCTAssertTrue(ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, typeSize: .large, width: 669).contains("padding: 16px 16px 48px"))
    }
}
