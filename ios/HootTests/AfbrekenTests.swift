import XCTest
import SwiftUI
@testable import Hoot

// 1.1.1: bij AX5 breekt geen woord meer midden in zonder streepje (CONTROLE-48: "Rijkswaterstaa / t",
// "Abonnement / en", "Synchroniser / en", "Middagedi- / tie").
@MainActor final class AfbrekenTests: XCTestCase {
    private let shy = "\u{00AD}"

    func testLangeWoordenKrijgenZachteStreepjesBijAX() {
        for word in ["Rijkswaterstaat", "Abonnementen", "Synchroniseren"] {
            let set = Afbreken.tekst(word, typeSize: .accessibility5)
            XCTAssertTrue(set.contains(shy), "\(word): \(set)")
            XCTAssertEqual(set.replacingOccurrences(of: shy, with: ""), word)
        }
    }

    func testOnderAXEnKorteWoordenBlijvenHeel() {
        XCTAssertEqual(Afbreken.tekst("Rijkswaterstaat", typeSize: .xxxLarge), "Rijkswaterstaat")
        XCTAssertEqual(Afbreken.tekst("Het verkeer gaat om", typeSize: .accessibility5), "Het verkeer gaat om")
        XCTAssertEqual(Afbreken.tekst("alex@voorbeeld.nl", typeSize: .accessibility5), "alex@voorbeeld.nl", "een adres niet")
    }

    func testEditieBreektOpDeNaad() {
        let font = UIFont(name: Letters.kop, size: 60) ?? .systemFont(ofSize: 60, weight: .heavy)
        let breed = KopZet.measure("Middageditie", font: font)
        XCTAssertEqual(KopZet.fit("Middageditie", font: font, width: breed * 0.8).text, "Middag-\neditie")
        XCTAssertEqual(KopZet.fit("Middageditie", font: font, width: breed + 10).text, "Middageditie", "past hij, dan heel")
        XCTAssertEqual(KopZet.editieNaad("Ochtendeditie")?.0, "Ochtend")
        XCTAssertNil(KopZet.editieNaad("Editie"))
    }

    // Afbreken kost hooguit één regel extra (de lettergrepen zijn korter dan een hele regel); IntroText geeft
    // die regel erbij, zodat er geen zin wegvalt.
    func testAfbrekenKostHooguitEenRegel() {
        let intro = StroomVoorbeeld.intro
        for type in [DynamicTypeSize.accessibility3, .accessibility5] {
            func height(_ s: String) -> CGFloat {
                let v = Text(verbatim: s).leestekst(.body, size: 18, line: 28).fixedSize(horizontal: false, vertical: true).environment(\.dynamicTypeSize, type)
                return UIHostingController(rootView: v).sizeThatFits(in: CGSize(width: 343, height: 5000)).height
            }
            let plain = height(intro), set = height(Afbreken.woorden(intro))
            let regel = IntroText.limit(lines: 1, style: .body, typeSize: type, size: 18, line: 28) / 1.5
            XCTAssertLessThanOrEqual(set, plain + regel + 2, "\(type)") // twee punten speling voor de afronding
        }
    }
}
