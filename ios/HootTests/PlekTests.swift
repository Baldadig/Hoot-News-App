import XCTest
import SwiftUI
@testable import Hoot

// Duo 1.2, punt 3: je plek bij vouwen naar het boek. Van open staand (of dicht) naar boek, vlak bij het einde van
// de Editie, kwam je op het einde uit. Twee oorzaken (gezien in de nabootsing):
// - de lazy lijst hield de hoogtes van het oude raster vast: de Editie leek langer dan hij was, en de ankers stonden
//   op hun oude plek;
// - in het boek staat 04 en verder in een raster (de paren): zo'n anker bestaat pas als het raster in beeld komt,
//   en scrollTo vond het niet.
// Nu: met een vouw is elk raster een nieuwe lijst, en PlekBewaren gaat eerst naar boven en stapt omlaag tot het
// anker er is. Op iPhone en iPad (geen vouw) blijft de lijst dezelfde, en andere lijsten (de Stroom) doen wat ze deden.
@MainActor final class PlekTests: XCTestCase {
    private func bron(_ pad: String) throws -> String {
        try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent(pad), encoding: .utf8)
    }

    func testMetEenVouwIsElkRasterEenNieuweLijstZonderVouwNiet() throws {
        let editie = try bron("Hoot/Views/EditionView.swift")
        XCTAssertTrue(editie.contains(".id(tabloid == nil ? Grid?.none : grid)"), "zonder vouw (tabloid nil) één vaste id")
        XCTAssertTrue(editie.contains(".plekInhoud()"), "de ankers van de Editie meten zich in de inhoud")
        XCTAssertFalse(try bron("Hoot/Views/StreamView.swift").contains(".plekInhoud()"), "de Stroom houdt het oude herstel")
    }

    func testHerstellenZoektAlleenInDeEditie() {
        let boek = PlekBoek()
        XCTAssertFalse(boek.raster, "standaard (de Stroom): direct scrollTo, niet eerst naar boven")
        XCTAssertNil(boek.anker)
        // Het herstel blijft kort: alles samen onder een halve seconde, plus hooguit zestien kleine stappen.
        XCTAssertLessThan(PlekBoek.herstelMomenten.reduce(0, +), 500)
        XCTAssertLessThanOrEqual(PlekBoek.zoekStappen, 16)
    }

    func testHetAnkerIsHetVerhaalDatBovenVoorbijKwam() {
        // Ongewijzigd: het verhaal waarvan de bovenkant het laatst boven de rand kwam, anders het eerste in beeld.
        XCTAssertEqual(PlekBoek.kies(["08": -40, "09": -40.5, "10": 300]), "08")
        XCTAssertEqual(PlekBoek.kies(["10": 30, "bubbel": 400]), "10")
    }
}
