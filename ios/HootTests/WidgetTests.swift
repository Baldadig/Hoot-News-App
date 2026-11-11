import XCTest
import WidgetKit
@testable import Hoot

// De widgets (HootWidget, HootWidgetShared): de korte kop (gelijk aan het web), de dagdelen en de tijdlijn,
// welke Editie en welke stand de widget toont, de deep links en het zetten van koppen binnen de marges.
@MainActor final class WidgetTests: XCTestCase {
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    static let fixture = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appending(path: "Fixtures/widget-editie.json")

    static func editie(gelezen: Int = 0, nu: Date = .now) throws -> WidgetEditie {
        let server = try JSONDecoder().decode(ServerEditie.self, from: Data(contentsOf: fixture))
        var e = try XCTUnwrap(server.widget(vraag: .algemeen, gelezen: [], nu: nu))
        e.gelezen = e.verhalen.prefix(gelezen).map(\.itemId)
        return e
    }

    static func moment(_ s: String) -> Date { ISO8601DateFormatter().date(from: s)! }

    // MARK: Korte kop

    func testKorteKopGelijkAanHetWeb() throws {
        struct Geval: Decodable { let kop: String; let verwacht: String }
        struct Fixture: Decodable { let max: Int; let kernMin: Int; let gevallen: [Geval] }
        let fx = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: Self.root.appending(path: "tests/fixtures/kort-kop.json")))
        XCTAssertEqual(fx.max, KortKop.max)
        XCTAssertEqual(fx.kernMin, KortKop.kernMin)
        XCTAssertGreaterThanOrEqual(fx.gevallen.count, 20)
        for g in fx.gevallen { XCTAssertEqual(KortKop.kort(g.kop), g.verwacht, g.kop) }
    }

    func testTrapWordtSteedsKorterEnEindigtOpEenWoord() {
        let kop = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        let trap = KortKop.trap(kop, kort: nil)
        XCTAssertEqual(trap.first, "Iraanse dreiging is zó groot dat Amerikaanse minister…")
        XCTAssertGreaterThan(trap.count, 2)
        for (a, b) in zip(trap, trap.dropFirst()) { XCTAssertLessThan(b.utf16.count, a.utf16.count) }
        for t in trap { XCTAssertFalse(t.hasSuffix(" …"), t); XCTAssertLessThanOrEqual(t.utf16.count, 60) }
        // De korte kop van de server gaat voor.
        XCTAssertEqual(KortKop.trap(kop, kort: "Iran bedreigt minister").first, "Iran bedreigt minister")
    }

    // MARK: Dagdelen en tijdlijn

    func testDagdelenGelijkAanServerSeintjesEnNamen() throws {
        let web = try SlotTimesTests.web()
        XCTAssertEqual(WidgetDagdeel.start, web)
        for s in EditionAlerts.slots {
            XCTAssertEqual(WidgetDagdeel.start[s.id], s.hour * 60 + s.minute)
            XCTAssertEqual(WidgetDagdeel.naam(s.id), s.name)
        }
        XCTAssertEqual(WidgetDagdeel.marge, EditionAlerts.delay)
        XCTAssertEqual(WidgetDagdeel.eindzinnen, EditionEnd.lines)
        for dag in 1...28 {
            for slot in WidgetDagdeel.volgorde {
                let datum = String(format: "2026-11-%02d", dag)
                XCTAssertEqual(WidgetDagdeel.eindzin(datum: datum, dagdeel: slot), EditionEnd.line(date: datum, slot: slot))
            }
        }
    }

    func testDagdeelOpEenMoment() {
        // 11 november: wintertijd, Amsterdam = UTC+1.
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T05:29:00Z")).id, "2026-11-10-avond") // 06:29: nog de Avondeditie van gisteren
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T05:20:00Z")).id, "2026-11-10-avond") // 06:20
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T05:30:00Z")).id, "2026-11-11-ochtend") // 06:30
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T10:59:00Z")).id, "2026-11-11-ochtend") // 11:59
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T11:00:00Z")).id, "2026-11-11-middag") // 12:00
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T16:00:00Z")).id, "2026-11-11-avond") // 17:00
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-11-11T22:59:00Z")).id, "2026-11-11-avond") // 23:59
        // Zomertijd (UTC+2): 06:30 is 04:30 UTC.
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-07-01T04:30:00Z")).id, "2026-07-01-ochtend")
        XCTAssertEqual(WidgetDagdeel.op(Self.moment("2026-07-01T04:29:00Z")).id, "2026-06-30-avond")
    }

    func testTijdlijnEenMomentPerDagdeel() {
        let nu = Self.moment("2026-11-11T12:41:00Z") // 13:41 in Amsterdam, Middageditie
        let momenten = WidgetTijdlijn.momenten(nu: nu)
        XCTAssertEqual(momenten.first, nu)
        XCTAssertEqual(Array(momenten.dropFirst()), [
            Self.moment("2026-11-11T16:03:00Z"), // 17:03 Avondeditie
            Self.moment("2026-11-12T05:33:00Z"), // 06:33 Ochtendeditie
            Self.moment("2026-11-12T11:03:00Z"), // 12:03 Middageditie
        ])
        XCTAssertEqual(WidgetTijdlijn.volgende(nu: nu), Self.moment("2026-11-11T16:03:00Z"))
        // Over de wissel naar zomertijd (29 maart 2026): nog steeds op de Amsterdamse minuut.
        let maart = WidgetDagdeel.momenten(na: Self.moment("2026-03-28T20:00:00Z"))
        XCTAssertEqual(maart.first, Self.moment("2026-03-29T04:33:00Z")) // 06:33 zomertijd
        XCTAssertEqual(maart.count, 3)
    }

    func testVolgordeVanDeDagdelen() {
        XCTAssertTrue(WidgetDagdeel.later("2026-11-11-ochtend", dan: "2026-11-10-avond"))
        XCTAssertTrue(WidgetDagdeel.later("2026-11-11-avond", dan: "2026-11-11-ochtend"))
        XCTAssertFalse(WidgetDagdeel.later("2026-11-11-ochtend", dan: "2026-11-11-avond"), "niet op de letters")
        XCTAssertFalse(WidgetDagdeel.later("2026-11-11-middag", dan: "2026-11-11-middag"))
        XCTAssertTrue(WidgetDagdeel.later("2026-12-01-ochtend", dan: "2026-11-30-avond"))
    }

    func testOphalenHooguitEensPerVijfMinuten() {
        let nu = Self.moment("2026-11-11T16:03:00Z")
        XCTAssertTrue(WidgetTijdlijn.magProberen(laatste: nil, nu: nu))
        XCTAssertFalse(WidgetTijdlijn.magProberen(laatste: nu.addingTimeInterval(-60), nu: nu))
        XCTAssertTrue(WidgetTijdlijn.magProberen(laatste: nu.addingTimeInterval(-301), nu: nu))
        XCTAssertTrue(WidgetTijdlijn.magProberen(laatste: nu.addingTimeInterval(3600), nu: nu)) // klok terug: gewoon proberen
    }

    // MARK: Welke Editie, welke stand

    func testServerEditieWordtTienGenummerdeVerhalenZonderBubbel() throws {
        let e = try Self.editie()
        XCTAssertEqual(e.id, "2026-11-11-avond")
        XCTAssertEqual(e.naam, "Avondeditie")
        XCTAssertEqual(e.verhalen.map(\.nummer), Array(1...10))
        XCTAssertFalse(e.verhalen.contains { $0.kop.hasPrefix("Emma Heesters") }, "Buiten je bubbel staat niet in de widget")
        // De korte kop van de server, de kop zelf blijft voor VoiceOver.
        XCTAssertEqual(e.verhalen[0].kortKop, "D66 en CDA sluiten deal met Pro en Volt rond belastingplan…")
        XCTAssertTrue(e.verhalen[0].kop.hasSuffix("nog geen reactie VVD"))
        XCTAssertEqual(e.verhalen[0].bron.isEmpty, false)
        for v in e.verhalen { XCTAssertLessThanOrEqual(v.kortKop.utf16.count, 60) }
    }

    func testZonderKorteKopVanDeServerRekentDeAppHemZelf() {
        let lang = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        let e = WidgetEditie.bouw(id: "2026-11-11-middag", datum: "2026-11-11", dagdeel: "middag",
                                  stenen: [.init(plek: "a", itemId: "a", kop: lang, kortKop: nil, bron: "AD")], gelezen: [], vraag: .lid)
        XCTAssertEqual(e.verhalen[0].kortKop, KortKop.kort(lang))
    }

    func testStandDoorDeDagHeen() throws {
        let tijdens = Self.moment("2026-11-11T17:41:00Z") // de Avondeditie van de fixture
        XCTAssertEqual(WidgetStand.van(try Self.editie(gelezen: 0), op: tijdens), .ligtKlaar)
        XCTAssertEqual(WidgetStand.van(try Self.editie(gelezen: 4), op: tijdens), .onderweg(gelezen: 4, van: 10))
        XCTAssertEqual(WidgetStand.van(try Self.editie(gelezen: 4), op: tijdens).label, "4 van 10")
        let klaar = try Self.editie(gelezen: 10)
        XCTAssertEqual(WidgetStand.van(klaar, op: tijdens), .klaar(eindzin: EditionEnd.line(date: "2026-11-11", slot: "avond")))
        // Een nieuw dagdeel zonder nieuwe Editie: de vorige blijft, met haar eigen naam, en "Tik voor de Ochtendeditie".
        let later = Self.moment("2026-11-12T05:40:00Z")
        XCTAssertEqual(WidgetStand.van(klaar, op: later), .oud(volgende: "Ochtendeditie"))
        XCTAssertEqual(WidgetStand.van(klaar, op: later).label, "Tik voor de Ochtendeditie")
        // Een moment vóór de Editie (klok terug) maakt hem nooit oud.
        XCTAssertEqual(WidgetStand.van(klaar, op: Self.moment("2026-11-11T09:00:00Z")), .klaar(eindzin: klaar.eindzin))
        // Gelezen via een eerdere id van hetzelfde stuk telt ook.
        var e = try Self.editie()
        e.verhalen[0].oudeIds = ["eerder"]
        e.gelezen = ["eerder"]
        XCTAssertEqual(e.aantalGelezen, 1)
        XCTAssertEqual(e.eersteOngelezen?.nummer, 2)
    }

    func testGeenKloktijdenEnHuisregelsInDeTeksten() throws {
        var teksten = ["Ligt klaar", "Tik voor de Avondeditie"] + WidgetDagdeel.volgorde.map(WidgetDagdeel.volgendeZin(na:))
        teksten += [WidgetStand.onderweg(gelezen: 4, van: 10).label, WidgetStand.klaar(eindzin: "Je bent bij.").label]
        for t in teksten {
            XCTAssertNil(t.range(of: #"\d{1,2}[:.]\d{2}|\buur\b"#, options: .regularExpression), t)
            XCTAssertFalse(t.lowercased().contains("houdt op"), t)
            XCTAssertFalse(t.contains("Omdat je"), t)
        }
        XCTAssertEqual(WidgetDagdeel.volgendeZin(na: "middag"), "Straks de Avondeditie")
        XCTAssertEqual(WidgetDagdeel.volgendeZin(na: "avond"), "Morgen de Ochtendeditie")
        // Editie met hoofdletter in elke naam.
        for d in WidgetDagdeel.volgorde { XCTAssertTrue(WidgetDagdeel.naam(d).hasSuffix("editie")); XCTAssertTrue(WidgetDagdeel.naam(d).first!.isUppercase) }
    }

    // MARK: Deep links

    func testDeepLinks() {
        XCTAssertEqual(HootLink.doel(HootLink.editie), .editie)
        XCTAssertEqual(HootLink.doel(HootLink.verhaal("1r0cz5j")), .verhaal("1r0cz5j"))
        XCTAssertEqual(HootLink.doel(URL(string: "hoot://verhaal/")!), .editie)
        XCTAssertNil(HootLink.doel(URL(string: "https://gethoot.app/editie")!))
        XCTAssertNil(HootLink.doel(URL(string: "hoot://iets-anders")!))
        // De app kent het schema.
        let types = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] ?? []
        XCTAssertTrue(types.contains { ($0["CFBundleURLSchemes"] as? [String])?.contains("hoot") == true })
    }

    // MARK: App Group

    func testBewarenEnLezenAlleenAlsErIetsVerandert() throws {
        let map = FileManager.default.temporaryDirectory.appending(path: "widget-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: map, withIntermediateDirectories: true)
        WidgetGroep.mapOverride = map
        defer { WidgetGroep.mapOverride = nil; try? FileManager.default.removeItem(at: map) }
        var e = try Self.editie()
        XCTAssertNil(WidgetBron.laad())
        XCTAssertTrue(WidgetBron.bewaar(e))
        XCTAssertEqual(WidgetBron.laad()?.verhalen, e.verhalen)
        e.geschreven = e.geschreven.addingTimeInterval(60)
        XCTAssertFalse(WidgetBron.bewaar(e), "alleen een ander moment: niets te verversen")
        e.gelezen.append(e.verhalen[0].itemId)
        XCTAssertTrue(WidgetBron.bewaar(e), "een gelezen verhaal ververst de widget")
        // Een beeld dat bij geen verhaal meer hoort, gaat weg.
        let los = WidgetBron.beeld("los.jpg")
        try Data([1, 2, 3]).write(to: los)
        e.gelezen.append(e.verhalen[1].itemId)
        WidgetBron.bewaar(e)
        XCTAssertFalse(FileManager.default.fileExists(atPath: los.path))
    }

    func testWieMagZelfOphalen() throws {
        var e = try Self.editie()
        let later = Self.moment("2026-11-12T05:40:00Z"), tijdens = Self.moment("2026-11-11T17:41:00Z")
        XCTAssertTrue(WidgetOphalen.moetOphalen(e, nu: later))
        XCTAssertFalse(WidgetOphalen.moetOphalen(e, nu: tijdens))
        e.vraag = .eigen
        XCTAssertTrue(WidgetOphalen.moetOphalen(e, nu: later))
        e.vraag = .lid // met account: je token blijft in de app
        XCTAssertFalse(WidgetOphalen.moetOphalen(e, nu: later))
        XCTAssertFalse(WidgetOphalen.moetOphalen(nil, nu: later))
    }

    func testBeeldVerkleindTotWidgetformaat() throws {
        let groot = UIGraphicsImageRenderer(size: CGSize(width: 2400, height: 1600), format: { let f = UIGraphicsImageRendererFormat(); f.scale = 1; return f }()).jpegData(withCompressionQuality: 0.9) { ctx in
            UIColor.systemRed.setFill(); ctx.fill(CGRect(x: 0, y: 0, width: 2400, height: 1600))
        }
        let klein = try XCTUnwrap(WidgetBeelden.verklein(groot))
        let beeld = try XCTUnwrap(UIImage(data: klein))
        XCTAssertEqual(max(beeld.size.width * beeld.scale, beeld.size.height * beeld.scale), 900)
        XCTAssertEqual(WidgetBeelden.naam("a/b?c"), "a_b_c.jpg")
    }

    func testPlaceholderGelijkAanDeApp() {
        for id in ["1r0cz5j", "a", "xyz-123", "voorbeeld-0"] { XCTAssertEqual(WidgetBeeldloos.index(id), Placeholder.base(id)) }
    }

    // MARK: Zetten binnen de marges

    // Middel · Top 3 op de grootste iPhone (364 × 170) en de kleinste maat met widgets (iPhone mini, 329 × 155):
    // drie koppen passen met lucht ertussen, nooit meer dan twee regels, en bij krapte liever minder tekst.
    func testTop3PastMetLucht() throws {
        let e = try Self.editie()
        for maat in [CGSize(width: 364, height: 170), CGSize(width: 338, height: 158), CGSize(width: 329, height: 155)] {
            let marge = WidgetRuimte.s4
            let breedte = maat.width - 2 * marge - MiddelTop3.nummerKolom - WidgetRuimte.s2
            let hoogte = maat.height - 2 * marge - 16 - WidgetRuimte.s3
            let gezet = WidgetZet.rijen(Array(e.verhalen.prefix(3)), WidgetLetter.widgetKop, breedte: breedte, hoogte: hoogte, tussen: MiddelTop3.tussen)
            XCTAssertGreaterThanOrEqual(gezet.count, 2, "\(maat)")
            let totaal = gezet.reduce(0) { $0 + CGFloat($1.regels) * WidgetLetter.widgetKop.regel } + MiddelTop3.tussen * CGFloat(gezet.count - 1)
            XCTAssertLessThanOrEqual(totaal, hoogte, "\(maat)")
            for g in gezet {
                XCTAssertLessThanOrEqual(g.regels, 2)
                XCTAssertLessThanOrEqual(WidgetZet.regels(g.tekst, WidgetLetter.widgetKop, breedte: breedte), g.regels, g.tekst)
                XCTAssertFalse(g.tekst.hasSuffix(" …"))
            }
        }
    }

    func testEenKopDieNietPastWordtKorterOpEenWoordgrens() {
        let kop = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        let een = WidgetZet.pas(kop, kort: nil, WidgetLetter.widgetKop, breedte: 140, max: 1)
        XCTAssertEqual(een.regels, 1)
        XCTAssertTrue(een.tekst.hasSuffix("…"))
        XCTAssertTrue(kop.hasPrefix(String(een.tekst.dropLast())), een.tekst)
        let drie = WidgetZet.pas(kop, kort: nil, WidgetLetter.widgetKop, breedte: 300, max: 3)
        XCTAssertEqual(drie.tekst, "Iraanse dreiging is zó groot dat Amerikaanse minister…")
    }
}
