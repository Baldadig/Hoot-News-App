import XCTest
import SwiftUI
@testable import Hoot

// Kaart A+ (keuze van Alex, 4 november): op de iPhone één kaart voor de Editie en de Stroom. Deze toetsen meten de
// maten uit de spec (kop 22/28, intro 18/28, hoofdverhaal 30/36 en 20/30, beeld 2:1 en 3:2) en renderen de echte
// ItemRow en LeadCard op 390 breed. Het web spiegelt dit in src/styles/kaart.css (tests/kaart-a-plus.test.mjs).
@MainActor final class KaartAPlusTests: XCTestCase {
    private func height<V: View>(_ view: V, width: CGFloat = 358, size: DynamicTypeSize = .large) -> CGFloat {
        let host = UIHostingController(rootView: view.frame(width: width, alignment: .topLeading).environment(\.dynamicTypeSize, size))
        return host.sizeThatFits(in: CGSize(width: width, height: 4000)).height
    }

    func testRegelhoogtesVolgenDeSpec() {
        // De afstand tussen twee regels (twee regels min één regel) is de regelhoogte van de spec, bij Large.
        func pitch(_ make: (Text) -> AnyView) -> CGFloat { height(make(Text("Woord\nWoord"))) - height(make(Text("Woord"))) }
        let intro: (Text) -> AnyView = { AnyView($0.leestekst(.body, size: 18, line: 28).fixedSize(horizontal: false, vertical: true)) }
        XCTAssertEqual(pitch(intro), 28, accuracy: 1, "intro 18/28")
        let lead: (Text) -> AnyView = { AnyView($0.leestekst(.body, size: 20, line: 30).fixedSize(horizontal: false, vertical: true)) }
        XCTAssertEqual(pitch(lead), 30, accuracy: 1, "hoofdverhaal-intro 20/30")
        let kop: (Text) -> AnyView = { AnyView($0.font(.kop(.title2)).lineSpacing(2).fixedSize(horizontal: false, vertical: true)) }
        XCTAssertEqual(pitch(kop), 28, accuracy: 1.5, "kop 22/28")
    }

    func testRegelafstandGroeitMeeMetDynamischeTekst() {
        let large = Letters.leesSpacing(.body, typeSize: .large, size: 18, line: 28)
        let xxl = Letters.leesSpacing(.body, typeSize: .xxLarge, size: 18, line: 28)
        XCTAssertEqual(large, 7, accuracy: 0.6) // 28 min de letter zelf (18 × 1,193 = 21,5)
        XCTAssertGreaterThan(xxl, large)
        XCTAssertEqual(KopZet.pointSize(.title2, typeSize: .large), 22)
        XCTAssertEqual(KopZet.pointSize(.title, typeSize: .large, size: 30), 30)
        XCTAssertGreaterThan(KopZet.pointSize(.title2, typeSize: .accessibility3), 22)
    }

    func testIntroMaatRekentMetEigenMaat() {
        let standaard = IntroText.limit(lines: 3, style: .body, typeSize: .large)
        let kaart = IntroText.limit(lines: 3, style: .body, typeSize: .large, size: 18, line: 28)
        XCTAssertEqual(kaart, 28 * 3.5, accuracy: 3) // drie regels en een halve regel speling
        XCTAssertGreaterThan(kaart, standaard)
    }

    private func item(_ n: Int, summary: String? = "Onderhandelaars werkten de hele nacht door, maar rijke landen willen niet toezeggen wie de rekening betaalt.") -> Item {
        var item = Item(id: "kaart-\(n)", source: "nos", title: "Op de VN-natuurtop in Cali dringt de tijd: over het geld voor arme landen is nog niets afgesproken", url: "https://nos.nl/a")
        item.sourceName = "NOS"; item.summary = summary
        return item
    }

    // De echte kaart op 390: smal is hij de Stroom-vorm (beeldvak 2:1 over 358 = 179 hoog), breed de oude.
    func testKaartIsHogerDanDeKrantOpEenTelefoonEnGelijkOpEenIPad() throws {
        let store = HootStore()
        func card(_ form: ItemRow.Form, wide: Bool) -> CGFloat {
            height(ItemRow(item: item(1), number: 2, label: "Buitenland", why: "Uit je voorkeursbron NRC", story: nil, form: form)
                .environment(store).environment(Reader()).environment(\.isWide, wide))
        }
        let kaart = card(.tijdlijn, wide: false), krant = card(.krant, wide: false), padTijdlijn = card(.tijdlijn, wide: true)
        XCTAssertGreaterThan(kaart, krant + 120, "kaart A+ is de Stroom-vorm: het beeld komt eronder")
        XCTAssertNotEqual(kaart, padTijdlijn, accuracy: 4) // iPad houdt zijn eigen vorm
        // Beeldvak 179 + 16 lucht + de tekst: minstens 179 + 16 + 28 (kop) + 28 (intro) + 44 (bronregel).
        XCTAssertGreaterThan(kaart, 179 + 16 + 28 + 28 + 44)
    }

    private func story(_ n: Int, _ title: String, _ summary: String, source: String = "NOS", image: Bool = false) -> Item {
        var item = Item(id: "kaart-s\(n)", source: "nos", title: title, url: "https://nos.nl/a")
        item.sourceName = source; item.summary = summary
        return item
    }

    func testHoofdverhaalKaartRendertTotDeRand() async throws {
        let store = HootStore()
        let content = LeadCard(item: item(0), number: 1, label: "Binnenland", why: "Het verhaal van de dag", story: nil)
            .padding(.horizontal, 16).environment(store).environment(Reader()).environment(\.isWide, false)
        let h390 = height(content, width: 390)
        // 3:2 over 390 = 260 voor het beeld, daarna kop 30/36, intro, bronregel en de sterke lijn.
        XCTAssertGreaterThan(h390, 260 + 16 + 36 + 30 + 44)
    }

    // Stills van de Editie en de Stroom op de iPhone-breedtes (Pro Max 440, SE 375), Licht, Nacht en AX3: de echte
    // LeadCard en ItemRow met de placeholderbeelden. Ze komen als bijlage in de testresultaten (xcresult).
    func testStillsEditieEnStroom() async throws {
        let store = HootStore()
        let rows = [
            story(1, "Op de VN-natuurtop in Cali dringt de tijd: over het geld voor arme landen is na twee weken nog niets afgesproken", "Onderhandelaars werkten de hele nacht door, maar rijke landen willen niet toezeggen wie de rekening betaalt.", source: "NRC"),
            story(2, "Ajax wint kraker van AZ", "Een treffer in de slotfase besliste het duel in Amsterdam. Ajax pakt daarmee de tweede plaats.", source: "NOS Sport"),
            story(3, "Kabinet wil boeren meer ruimte geven bij stikstofregels, maar kan rekenen op felle kritiek", "Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders in kwetsbare gebieden.", source: "de Volkskrant"),
        ]
        for (width, device) in [(440.0, "promax"), (375.0, "se")] {
            for (mode, dark, night, size) in [("licht", false, false, DynamicTypeSize.large), ("nacht", true, true, .large), ("ax3", false, false, .accessibility3)] {
                for kind in ["editie", "stroom"] {
                    let view = ScrollView { VStack(alignment: .leading, spacing: 0) {
                        if kind == "editie" {
                            LeadCard(item: item(0), number: 1, label: "Binnenland", why: "Het verhaal van de dag", story: nil)
                            ForEach(Array(rows.enumerated()), id: \.offset) { i, row in
                                if i > 0 { Rule().padding(.vertical, Space.s2) } else { Color.clear.frame(height: Space.s2) }
                                ItemRow(item: row, number: i + 2, label: ["Buitenland", "Sport", "Politiek"][i], why: i == 1 ? nil : "Uit je voorkeursbron \(row.sourceName ?? "")", story: nil, form: .tijdlijn)
                            }
                        } else {
                            ForEach(Array(rows.enumerated()), id: \.offset) { i, row in
                                if i > 0 { Rule().padding(.vertical, Space.s2) }
                                ItemRow(item: row, label: ["Buitenland", "Sport", "Politiek"][i], story: nil, form: .tijdlijn)
                            }
                        }
                    }.padding(.horizontal, 16) }
                        .background(Theme.paper).environment(store).environment(Reader()).environment(\.isWide, false)
                        .environment(\.colorScheme, dark ? .dark : .light).environment(\.nachtActief, night).environment(\.dynamicTypeSize, size)
                    let host = UIHostingController(rootView: view)
                    let frame = CGRect(x: 0, y: 0, width: width, height: size == .large ? 1500 : 2600)
                    host.view.frame = frame
                    let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
                    host.view.layoutIfNeeded()
                    try await Task.sleep(for: .milliseconds(300))
                    let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                    let attachment = XCTAttachment(image: image); attachment.name = "kaart-a-plus-\(device)-\(kind)-\(mode).png"; attachment.lifetime = .keepAlways; add(attachment)
                    window.isHidden = true
                }
            }
        }
    }
}
