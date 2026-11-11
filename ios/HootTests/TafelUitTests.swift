import XCTest
import SwiftUI
@testable import Hoot

// 1.2.1: het tafelblad staat weer aan (KrantIndeling.tafelblad). In 1.2 stond het uit, met als belofte: de Duo open
// liggend toont nooit een leeg blad. Die belofte blijft: deze toetsen houden haar vast nu het tafelblad terug is.
// - Waar geen tafelblad hoort (nog geen verhalen, heel grote tekst, de Stroom, als boek): een rustige pagina of het
//   boek, nooit een lege tweede bladzijde.
// - Ligt de krant open, dan is er geen blad (KrantStaat.blad), en wijkt een blad dat al open stond (BladWijkt).
// - `-HootScreen lezer` wacht op de vouw, niet op een vaste tijd (DebugLezerWacht).
@MainActor final class TafelUitTests: XCTestCase {
    typealias T = KrantIndelingTests
    // Gemeten op de echte Duo-simulator (iOS 27.2), binnen liggend en vlak: 867 × 635 (balk opzij 84), de vouw vlak
    // 40 breed met 20 marge aan elke kant (cd44535).
    static let echtLiggend = CGSize(width: 867, height: 635)
    static let echtVlak = Rug(frame: CGRect(x: 455.5, y: 0, width: 40, height: 669), actief: false,
                              marge: EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))

    func testDeSchakelaarStaatAanIn121() {
        XCTAssertTrue(KrantIndeling.tafelblad, "1.2.1: het tafelblad is terug")
    }

    func testEchteDuoLiggendIsHetTafelblad() {
        // Met en zonder lezer open: het tafelblad, met de lezer boven (geen blad, geen tweede bladzijde).
        for rechtsVrij in [true, false] {
            let indeling = KrantIndeling.kies(size: Self.echtLiggend, horizontal: .regular, rug: Self.echtVlak,
                                              krant: true, rechtsVrij: rechtsVrij, tafel: true)
            XCTAssertTrue(indeling.isTafel, "rechtsVrij \(rechtsVrij)")
            XCTAssertTrue(indeling.spread, "de lezer staat boven op het tafelblad, niet als blad")
            XCTAssertFalse(indeling.heeftPagina, "geen tweede bladzijde: dus ook geen lege")
        }
    }

    func testZonderTafelbladNooitEenLegeBladzijde() {
        // Nog geen verhalen of heel grote tekst (tafel: false): het boek over beide bladzijden zolang rechts niets open
        // ligt. Een tweede bladzijde (`naast`) alleen als er rechts iets ligt.
        XCTAssertEqual(KrantIndeling.kies(size: Self.echtLiggend, horizontal: .regular, rug: Self.echtVlak, krant: true, tafel: false),
                       .tabloid(boek: true))
        XCTAssertEqual(KrantIndeling.kies(size: TafelTests.liggend, horizontal: .regular, rug: T.boekVlak, krant: true, tafel: false),
                       .tabloid(boek: true))
        let open = KrantIndeling.kies(size: Self.echtLiggend, horizontal: .regular, rug: Self.echtVlak, krant: true, rechtsVrij: false, tafel: false)
        guard case .naast = open else { return XCTFail("verwacht naast, kreeg \(open)") }
    }

    // MARK: Het blad wijkt (keuring lezer-liggend, punt 2)

    func testOpenLiggendGeenBlad() {
        let item = Item(id: "a", source: "nos", title: "Kop", url: "https://nos.nl/a")
        XCTAssertEqual(KrantStaat.blad(item, spread: false)?.id, "a", "dicht: de lezer is een blad")
        XCTAssertNil(KrantStaat.blad(item, spread: true), "open: de lezer staat op de bladzijde of het tafelblad")
        XCTAssertNil(KrantStaat.blad(nil, spread: false))
    }

    func testEenOpenBladWijktVoorHetTafelblad() throws {
        // Het blad sluit zichzelf zodra de krant open ligt, ook als het nog aan het opkomen was (dan liet SwiftUI het
        // sluiten liggen en bleef er een leeg blad staan). Het artikel zelf blijft: het staat dan boven.
        XCTAssertGreaterThanOrEqual(BladWijkt.tussen * BladWijkt.pogingen, .seconds(3), "lang genoeg blijven proberen")
        let app = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/HootApp.swift"), encoding: .utf8)
        XCTAssertTrue(app.contains(".modifier(BladWijkt(krant: krant))"), "het blad van de lezer wijkt")
        XCTAssertTrue(app.contains("KrantStaat.blad(reader.item, spread: krant.spread)"))
        XCTAssertTrue(app.contains("if !krant.spread || nieuw != nil { reader.item = nieuw }"), "wijken sluit het artikel niet")
        XCTAssertFalse(app.contains("Task.sleep(for: .seconds(2.5))"), "geen vaste wachttijd meer")
    }

    // MARK: -HootScreen lezer wacht op de vouw

    #if DEBUG // DebugLezerWacht hoort bij de debugcode: niet in Release
    func testDeLezerWachtOpDeVouwNietOpEenVasteTijd() {
        XCTAssertTrue(DebugLezerWacht.klaar(vouw: false, compact: true, verstreken: .zero), "iPhone en de Duo dicht: meteen")
        XCTAssertTrue(DebugLezerWacht.klaar(vouw: true, compact: false, verstreken: .milliseconds(300)), "de vouw is er: meteen")
        XCTAssertFalse(DebugLezerWacht.klaar(vouw: false, compact: false, verstreken: .seconds(2.5)), "de oude 2,5 s is niet genoeg")
        XCTAssertFalse(DebugLezerWacht.klaar(vouw: false, compact: false, verstreken: DebugLezerWacht.plafond - .milliseconds(1)))
        XCTAssertTrue(DebugLezerWacht.klaar(vouw: false, compact: false, verstreken: DebugLezerWacht.plafond), "iPad: na het plafond toch")
    }
    #endif

    func testDeWachtOpDeVouwZitNietInRelease() throws {
        let debug = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/DebugLaunch.swift"), encoding: .utf8)
        XCTAssertTrue(debug.contains("#if DEBUG\nenum DebugLezerWacht"), "DebugLezerWacht staat onder #if DEBUG")
    }
}
