import XCTest
import SwiftUI
@testable import Hoot

// Begrippen uitgelegd (Uitleg.swift, Glossary.swift): dezelfde lijst en dezelfde uitkomsten als het web
// (shared/glossary.json, tests/fixtures/glossary-cases.json, tests/glossary.test.mjs), de pil onder de kaart, het
// halfhoge blad en de Begrippen onderaan het verhaal.
@MainActor final class GlossaryTests: XCTestCase {
    private var root: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent() }

    func testDeLijstIsDeGedeeldeLijst() throws {
        XCTAssertEqual(try Data(contentsOf: XCTUnwrap(Glossary.resourceURL)), try Data(contentsOf: root.appending(path: "shared/glossary.json")))
        XCTAssertEqual(Glossary.all.count, 32)
        XCTAssertEqual(Set(Glossary.all.map(\.term)).count, 32)
        for b in Glossary.all {
            XCTAssertNoThrow(try NSRegularExpression(pattern: Glossary.native(b.pattern)), b.term)
            XCTAssertEqual(b.wikipedia?.host(), "nl.wikipedia.org", b.term)
            XCTAssertLessThanOrEqual(b.text.count, 220, b.term)
        }
    }

    // Web = app: elke voorbeeldkop geeft precies dezelfde begrippen, in dezelfde volgorde, met dezelfde grens.
    func testTermsInGelijkAanHetWeb() throws {
        struct Case: Decodable { let text: String; let max: Int; let terms: [String] }
        struct Fixture: Decodable { let cases: [Case] }
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: root.appending(path: "tests/fixtures/glossary-cases.json")))
        XCTAssertGreaterThan(fixture.cases.count, 200)
        for c in fixture.cases { XCTAssertEqual(Glossary.termsIn(c.text, max: c.max).map(\.term), c.terms, c.text) }
    }

    func testAsciiGrenzenZoalsJavaScript() {
        XCTAssertEqual(Glossary.termsIn("caféNAVO").map(\.term), ["NAVO"]) // é is in JavaScript geen woordletter
        XCTAssertEqual(Glossary.termsIn("stikstof_crisis").map(\.term), [])
        XCTAssertEqual(Glossary.termsIn("Raad van State, Hoge Raad en hoger beroep").count, 2) // de standaardgrens is twee
        XCTAssertEqual(Glossary.termsIn("Raad van State, Hoge Raad en hoger beroep", max: 1).map(\.term), ["Raad van State"])
    }

    private func item(_ title: String, summary: String? = "De partijen zijn het op hoofdlijnen eens over de verdeling van de ministeries.") -> Item {
        var item = Item(id: "uitleg-\(title.hashValue)", source: "nrc", title: title, url: "https://nrc.nl/a")
        item.sourceName = "NRC"; item.summary = summary
        return item
    }

    private func height<V: View>(_ view: V, width: CGFloat = 358, size: DynamicTypeSize = .large) -> CGFloat {
        let host = UIHostingController(rootView: view.frame(width: width, alignment: .topLeading).environment(\.dynamicTypeSize, size))
        return host.sizeThatFits(in: CGSize(width: width, height: 4000)).height
    }

    // De pil staat onder de kaart als het bericht een begrip heeft: een rij van 36 met 12 lucht, verder niets.
    // Zonder begrip verschuift er niets. Twee koppen van dezelfde lengte: "formateur" tegen "formatour".
    func testPilOnderDeKaartAlleenMetEenBegrip() {
        let store = HootStore()
        func card(_ title: String) -> CGFloat {
            height(ItemRow(item: item(title, summary: nil), label: "Politiek", story: nil, form: .tijdlijn)
                .environment(store).environment(Reader()).environment(\.isWide, false))
        }
        let met = card("Formateur wil kabinet voor de kerst op het bordes"), zonder = card("Formatour wil kabinet voor de kerst op het bordes")
        XCTAssertEqual(met - zonder, UitlegPil.height + Space.s3, accuracy: 1.5)
        func lead(_ title: String) -> CGFloat {
            height(LeadCard(item: item(title, summary: nil), number: 1, label: "Politiek", story: nil)
                .padding(.horizontal, 16).environment(store).environment(Reader()).environment(\.isWide, false), width: 390)
        }
        XCTAssertEqual(lead("Formateur wil kabinet voor de kerst op het bordes") - lead("Formatour wil kabinet voor de kerst op het bordes"), UitlegPil.height + Space.s2, accuracy: 1.5)
    }

    func testDePilZegtWatHijDoet() {
        let b = try! XCTUnwrap(Glossary.all.first { $0.term == "formateur" })
        XCTAssertEqual(UitlegPil.label(b), "Uitleg: formateur")
        XCTAssertFalse(UitlegPil.hint.isEmpty)
        XCTAssertGreaterThanOrEqual(Space.tap, 44)
        // De kaart toont er hooguit één, het hoofdverhaal op iPad twee: zoals max={1} en de standaard op het web.
        XCTAssertEqual(Glossary.termsIn("De informateur en de formateur", max: 1).count, 1)
    }

    func testBegrippenVanHetVerhaal() {
        let items = [item("Informateur brengt advies uit", summary: "De formateur begint maandag."), item("Kabinet valt", summary: "Een motie van wantrouwen haalde een meerderheid."), item("Morgen stemt de Eerste", summary: nil), item("Kamer van Koophandel sluit", summary: nil)]
        // Volgorde van de lijst, geen grens van twee, en nooit over twee stukken heen ("Eerste" + "Kamer").
        XCTAssertEqual(BegrippenSectie.of(items).map(\.term), ["informateur", "formateur", "motie van wantrouwen"])
        XCTAssertTrue(BegrippenSectie.of([item("Ajax wint", summary: "Een late treffer besliste het duel.")]).isEmpty)
    }

    // Stills (licht, donker, Nacht, grote tekst): de kaart met de pil, het blad, en de Begrippen open in een lijst.
    // Als bijlage in de testresultaten (xcresult), voor het verslag.
    func testStills() async throws {
        let store = HootStore()
        let formateur = try XCTUnwrap(Glossary.all.first { $0.term == "formateur" })
        let kaartItem = item("Formateur wil kabinet voor de kerst op het bordes")
        let story = [item("Informateur: vier partijen kunnen verder", summary: "De formateur spreekt deze week alle kandidaat-ministers."), kaartItem]
        for (mode, dark, night, size) in [("licht", false, false, DynamicTypeSize.large), ("donker", true, false, .large), ("nacht", true, true, .large), ("ax3", false, false, .accessibility3)] {
            let views: [(String, AnyView, CGFloat)] = [
                ("kaart", AnyView(ScrollView { VStack(alignment: .leading, spacing: 0) {
                    ItemRow(item: kaartItem, label: "Politiek", story: nil, form: .tijdlijn)
                    Rule().padding(.vertical, Space.s2)
                    ItemRow(item: item("Gemeenten krijgen meer geld voor jeugdzorg, maar minder dan gevraagd", summary: "Het geld komt er vanaf volgend jaar."), label: "Binnenland", story: nil, form: .tijdlijn)
                }.padding(.horizontal, 16) }), size == .large ? 900 : 1700),
                ("blad", AnyView(VStack(spacing: 0) {
                    Capsule().fill(Theme.ink3.opacity(0.5)).frame(width: 36, height: 5).padding(.top, 5)
                    BegripInhoud(begrip: formateur) { _ in }.padding(.horizontal, Space.s5).padding(.top, Space.s6).padding(.bottom, Space.s5)
                    Spacer(minLength: 0)
                }.frame(maxWidth: .infinity, alignment: .leading)), size == .large ? 440 : 900),
                ("begrippen", AnyView(List { Section { BegrippenSectie(begrippen: BegrippenSectie.of(story), open: true, openTerms: ["formateur"]).listRowBackground(Theme.surface) } }.scrollContentBackground(.hidden)), size == .large ? 600 : 1300),
            ]
            for (kind, view, h) in views {
                let content = view.background(Theme.paper).environment(store).environment(Reader()).environment(\.isWide, false)
                    .environment(\.colorScheme, dark ? .dark : .light).environment(\.nachtActief, night).environment(\.dynamicTypeSize, size)
                let host = UIHostingController(rootView: content)
                host.overrideUserInterfaceStyle = dark ? .dark : .light
                let frame = CGRect(x: 0, y: 0, width: 390, height: h)
                host.view.frame = frame
                let window = UIWindow(frame: frame); window.rootViewController = host; window.overrideUserInterfaceStyle = dark ? .dark : .light; window.isHidden = false
                host.view.layoutIfNeeded()
                try await Task.sleep(for: .milliseconds(400))
                let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                let attachment = XCTAttachment(image: image); attachment.name = "uitleg-\(kind)-\(mode).png"; attachment.lifetime = .keepAlways; add(attachment)
                window.isHidden = true
            }
        }
    }
}
