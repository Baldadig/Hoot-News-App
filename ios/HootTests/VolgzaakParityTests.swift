import JavaScriptCore
import XCTest
@testable import Hoot

// Volgen 1.5: de volgregels per lezer (shared/volgzaak-weergave.mjs) rekenen in de app met dezelfde bundel als het web
// (Resources/edition-core.js via EditionEngine.volg). Uit de vaste invoer van tests/fixtures/volgzaak-golden.json komt byte
// voor byte dezelfde uitvoer als node (tests/volgzaak-weergave.test.mjs). De paar regels die de app zelf rekent
// (Volgzaken.volgtVan en rubriekRegel, voor het label in de Editie zonder rekenkern in de tekenronde) staan hier tegen
// dezelfde fixture.
final class VolgzaakParityTests: XCTestCase {
    struct Geval {
        let name: String
        let fn: String
        let input: String // JSON zoals JavaScript hem schrijft
        let output: String
        let story: String? // alleen volgtVanJSON: twee teksten in
        let volgzaken: String?
    }

    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/volgzaak-golden.json")

    static func gevallen() throws -> [Geval] {
        let text = try String(contentsOf: fixtureURL, encoding: .utf8)
        guard let ctx = JSContext() else { throw XCTSkip("geen JSContext") }
        ctx.setObject(text, forKeyedSubscript: "__golden" as NSString)
        ctx.evaluateScript("var G = JSON.parse(__golden);")
        let count = Int(ctx.evaluateScript("G.length").toInt32())
        return (0 ..< count).map { i in
            let str = { (expr: String) in ctx.evaluateScript("JSON.stringify(G[\(i)].\(expr))").toString()! }
            let fn = ctx.evaluateScript("G[\(i)].fn").toString()!
            return Geval(name: ctx.evaluateScript("G[\(i)].name").toString(), fn: fn, input: str("input"), output: str("output"),
                         story: fn == "volgtVanJSON" ? str("input.story") : nil, volgzaken: fn == "volgtVanJSON" ? str("input.volgzaken") : nil)
        }
    }

    func testDeFixtureIsVolledig() throws {
        let g = try Self.gevallen()
        XCTAssertGreaterThanOrEqual(g.count, 20)
        for fn in ["volgzaakVoorrangJSON", "volgzaakViewJSON", "erSpeeldeAlJSON", "rubriekRegelJSON", "volgtVanJSON"] {
            XCTAssertTrue(g.contains { $0.fn == fn }, fn)
        }
    }

    // De rekenkern van de app geeft letterlijk dezelfde tekst als node.
    func testRekenkernGelijkAanHetWeb() throws {
        for g in try Self.gevallen() {
            let args = g.fn == "volgtVanJSON" ? [g.story!, g.volgzaken!] : [g.input]
            let uit = try EditionEngine.volg.volgNu(g.fn, args)
            XCTAssertEqual(uit, g.output, g.name)
        }
    }

    // Dezelfde gevallen via de getypte aanroepen die de schermen gebruiken.
    func testGetypteAanroepen() async throws {
        for g in try Self.gevallen() {
            switch g.fn {
            case "volgzaakVoorrangJSON":
                let v = try EditionEngine.volg.voorrangNu(Data(g.input.utf8))
                let verwacht = try JSONDecoder().decode(EditionEngine.Voorrang.self, from: Data(g.output.utf8))
                XCTAssertEqual(v, verwacht, g.name)
            case "volgzaakViewJSON":
                let v = try await EditionEngine.volg.volgzaakView(Data(g.input.utf8))
                let verwacht = try JSONDecoder().decode(EditionEngine.VolgPagina.self, from: Data(g.output.utf8))
                XCTAssertEqual(v, verwacht, g.name)
            case "erSpeeldeAlJSON":
                let v = try await EditionEngine.volg.erSpeeldeAl(Data(g.input.utf8))
                let verwacht = try JSONDecoder().decode([EditionEngine.VolgVerhaal].self, from: Data(g.output.utf8))
                XCTAssertEqual(v, verwacht, g.name)
            default: break
            }
        }
    }

    // Het label in de Editie en de rubriekregel, door de app zelf gerekend: gelijk aan de rekenkern.
    func testEigenRegelsGelijkAanDeRekenkern() throws {
        for g in try Self.gevallen() {
            switch g.fn {
            case "volgtVanJSON":
                let story = try JSONDecoder().decode(StoryVolgzaakDrager.self, from: Data(g.story!.utf8))
                let lijst = try JSONDecoder().decode([Volgzaak].self, from: Data(g.volgzaken!.utf8))
                var s = Story(id: "s", itemIds: [])
                s.volgzaak = story.volgzaak
                let uit = Volgzaken.volgtVan(s, lijst)
                let verwacht = try JSONDecoder().decode(StoryVolgzaak?.self, from: Data(g.output.utf8))
                XCTAssertEqual(uit, verwacht, g.name)
            case "rubriekRegelJSON":
                struct In: Decodable { let rubriek: String?; let volgt: StoryVolgzaak?; let buiten: Bool }
                struct Uit: Decodable { let delen: [String]; let volgt: Bool; let buiten: Bool }
                let i = try JSONDecoder().decode(In.self, from: Data(g.input.utf8))
                let o = try JSONDecoder().decode(Uit.self, from: Data(g.output.utf8))
                let r = Volgzaken.rubriekRegel(rubriek: i.rubriek, volgt: i.volgt != nil, buiten: i.buiten)
                XCTAssertEqual(r.delen, o.delen, g.name)
                XCTAssertEqual(r.volgt, o.volgt, g.name)
                XCTAssertEqual(r.buiten, o.buiten, g.name)
            default: break
            }
        }
    }

    // De volgregels draaien in een eigen rekenkern: de Stroom wacht nooit op het samenstellen van een Editie.
    func testEigenRekenkernNaastDeEditie() async throws {
        XCTAssertFalse(EditionEngine.volg === EditionEngine.shared)
        await EditionEngine.volg.warm()
        XCTAssertTrue(EditionEngine.volg.isLoaded)
        // Kleine invoer: een lijst van honderd stukken rekent ruim onder de 50 ms (de Stroom rekent in de tekenronde).
        let lijst = (0 ..< 100).map { i in ["id": "a\(i)", "storyId": i % 7 == 0 ? "sGta" : "s\(i)", "publishedAt": Volgzaken.iso(Date(timeIntervalSince1970: 1_795_167_000 - Double(i) * 600)), "kind": "article"] as [String: Any] }
        let invoer: [String: Any] = ["lijst": lijst, "verhalen": ["sGta": ["volgzaak": ["slug": "gta-6", "label": "GTA 6"]]], "volgzaken": [["slug": "gta-6", "label": "GTA 6", "status": "actief"]], "grens": 50, "gezien": [String](), "gelezen": [String](), "now": 1_795_167_000_000.0, "weergave": "alles"]
        let data = try JSONSerialization.data(withJSONObject: invoer)
        let t0 = Date()
        let v = try EditionEngine.volg.voorrangNu(data)
        XCTAssertLessThan(Date().timeIntervalSince(t0), 0.5)
        XCTAssertEqual(v.voorrang, ["a0"])
        XCTAssertEqual(v.labels["a0"], StoryVolgzaak(slug: "gta-6", label: "GTA 6"))
    }
}

// Alleen het veld `volgzaak` van een verhaal uit de fixture.
private struct StoryVolgzaakDrager: Decodable { let volgzaak: StoryVolgzaak? }
