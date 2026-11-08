import XCTest
import SwiftUI
@testable import Hoot

// Release 1.2 (besluit Alex, 8 november): geen tafelblad. De Duo open liggend toont één rustige pagina, zoals de app
// zonder tafelblad doet, en nooit een leeg blad. De schakelaar is KrantIndeling.tafelblad; 1.2.1 zet hem weer aan.
// Gaat hij aan, dan faalt deze toets bewust: haal hem dan weg (TafelTests nemen het weer over).
@MainActor final class TafelUitTests: XCTestCase {
    typealias T = KrantIndelingTests
    // Gemeten op de echte Duo-simulator (iOS 27.2), binnen liggend en vlak: 867 × 635 (balk opzij 84), de vouw vlak
    // 40 breed met 20 marge aan elke kant (zelfde maten als de 1.2.1-fix op branch `duo`, cd44535).
    static let echtLiggend = CGSize(width: 867, height: 635)
    static let echtVlak = Rug(frame: CGRect(x: 455.5, y: 0, width: 40, height: 669), actief: false,
                              marge: EdgeInsets(top: 0, leading: 20, bottom: 0, trailing: 20))

    func testDeSchakelaarStaatUitIn12() {
        XCTAssertFalse(KrantIndeling.tafelblad, "1.2: tafelblad uit; zet hem pas in 1.2.1 aan")
    }

    func testEchteDuoLiggendIsEenRustigePagina() {
        // De Editie met verhalen vraagt om het tafelblad (tafel: true), maar krijgt één krantenpagina.
        for rechtsVrij in [true, false] {
            let indeling = KrantIndeling.kies(size: Self.echtLiggend, horizontal: .regular, rug: Self.echtVlak,
                                              krant: true, rechtsVrij: rechtsVrij, tafel: true)
            XCTAssertEqual(indeling, .enkel(pagina: KrantIndeling.enkelePagina), "rechtsVrij \(rechtsVrij)")
            XCTAssertFalse(indeling.isTafel)
            XCTAssertFalse(indeling.heeftPagina, "geen tweede bladzijde: dus ook geen lege")
        }
    }

    func testNergensEenTafelblad() {
        // Elke houding die in 1.2.1 een tafelblad geeft, geeft het nu niet.
        let houdingen: [(CGSize, Rug)] = [
            (Self.echtLiggend, Self.echtVlak),
            (TafelTests.liggend, T.boekVlak),
            (TafelTests.staand, T.tafel),
            (TafelTests.liggend, T.boekHalf),
            (TafelTests.staand, T.staandVlak),
        ]
        for (maat, rug) in houdingen {
            for tafelOnder in [KrantIndeling.tafelOnder, 330, 600] {
                let indeling = KrantIndeling.kies(size: maat, horizontal: .regular, rug: rug, krant: true, tafel: true, tafelOnder: tafelOnder)
                XCTAssertFalse(indeling.isTafel, "\(maat) \(rug)")
            }
        }
    }

    func testVlakLiggendZonderBalkDeKrantOverBeideBladzijden() {
        // Zonder balk opzij (beide bladzijden breed genoeg): de Editie als tabloid over het boek, niet leeg.
        XCTAssertEqual(KrantIndeling.kies(size: TafelTests.liggend, horizontal: .regular, rug: T.boekVlak, krant: true, tafel: true),
                       .tabloid(boek: true))
    }
}
