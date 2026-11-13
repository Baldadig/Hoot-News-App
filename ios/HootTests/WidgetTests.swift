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
        // `max`: de kortere stappen van vroeger; `verwacht` nil: de kop past niet, hij staat heel.
        struct Geval: Decodable { let kop: String; let verwacht: String?; let max: Int? }
        struct Herschreven: Decodable { let kop: String; let kort: String; let veilig: Bool; let waarom: String }
        struct Fixture: Decodable { let max: Int; let gevallen: [Geval]; let herschreven: [Herschreven] }
        let fx = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: Self.root.appending(path: "tests/fixtures/kort-kop.json")))
        XCTAssertEqual(fx.max, KortKop.max)
        XCTAssertEqual(KortKop.max, 45)
        XCTAssertGreaterThanOrEqual(fx.gevallen.count, 600)
        for g in fx.gevallen { XCTAssertEqual(KortKop.kort(g.kop, max: g.max ?? KortKop.max), g.verwacht, "\(g.kop) (\(g.max ?? KortKop.max))") }
        // Een herschreven korte kop van de server (besluit 13 november): dezelfde controle als het web.
        XCTAssertGreaterThanOrEqual(fx.herschreven.count, 20)
        for h in fx.herschreven { XCTAssertEqual(KortKop.veilig(h.kop, h.kort), h.veilig, "\(h.kort) (\(h.waarom))") }
    }

    // Besluit "korte kop dicht", bij twijfel geen korte vorm (keuring 9): een kop wordt nooit ingekort. De trap is
    // altijd de hele kop; een ingekorte kop van een oudere server telt niet.
    func testTrapIsAltijdDeHeleKop() {
        let kop = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        XCTAssertNil(KortKop.kort(kop))
        XCTAssertEqual(KortKop.trap(kop, kort: nil), [kop])
        XCTAssertEqual(KortKop.trap(kop, kort: "Iraanse dreiging is zó groot dat Amerikaanse minister…"), [kop])
        XCTAssertFalse(KortKop.veilig(kop, "Iraanse dreiging is zó groot dat Amerikaanse minister…"))
        let past = "Een kop van 45 tekens die nog net past, fijn!"
        XCTAssertEqual((past as NSString).length, 45)
        XCTAssertEqual(KortKop.kort(past), past)
        XCTAssertTrue(KortKop.veilig(past, past))
        XCTAssertEqual(KortKop.trap(past, kort: past), [past])
        // U+0085 is witruimte, onzichtbare tekens vallen weg, net als op het web.
        XCTAssertEqual(KortKop.kort("Kop met\u{0085}teken"), "Kop met teken")
        XCTAssertEqual(KortKop.trap("Kop met\u{200B} onzichtbaar teken", kort: nil), ["Kop met onzichtbaar teken"])
    }

    // Keuring 9: wat via een lijst lekte, staat heel. Ook een combinerend teken na een spatie (web en iOS gelijk).
    func testKeuring9StaatHeel() {
        for kop in [
            "Kabinet is gevallen na urenlang crisisberaad in Den Haag en premier noemt dat bericht nepnieuws",
            "Prime minister resigns after crisis talks in Downing Street | The Onion",
            "Kabinet is gevallen na urenlang crisisberaad in Den Haag：premier spreekt het tegen",
            "Gemeente Amsterdam verbiedt vuurwerk in de hele stad met uitzondering van het Museumplein",
            "Ajax haalt na een rampzalige seizoensstart de Europese plaatsen in de eredivisie ternauwernood",
            "Prime minister resigns after crisis talks in Downing Street according to a fake BBC report",
            "Kabinet is gevallen na urenlang crisisberaad in Den Haag en premier treedt \u{0301}niet af vandaag",
            "Autistic teen missing in Australian bushland for 6 days rescued alive",
            "Rechter wijst de eis van Greenpeace tegen Shell over de uitstoot in hoger beroep af",
            "Nepnieuws: kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet",
        ] {
            for max in [60, 56, 52, 48, 44, 40, 36, 32, 28, 24] { XCTAssertNil(KortKop.kort(kop, max: max), "\(kop) (\(max))") }
            XCTAssertEqual(KortKop.trap(kop, kort: nil), [kop], kop)
        }
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

    // Keuring 1: wacht de widget op de nieuwe Editie (ophalen mislukte, of een andere widget haalt al), dan
    // over twintig minuten opnieuw, niet pas bij het volgende dagdeel; en dat hooguit de eerste twee uur.
    func testWachtOpDeNieuweEditieKortOpnieuw() {
        let start = Self.moment("2026-11-11T16:03:00Z") // 17:03, de Avondeditie
        XCTAssertEqual(WidgetTijdlijn.volgende(nu: start, wachtOpNieuwe: true), start.addingTimeInterval(20 * 60))
        XCTAssertEqual(WidgetTijdlijn.volgende(nu: start.addingTimeInterval(90 * 60), wachtOpNieuwe: true), start.addingTimeInterval(110 * 60))
        // Na twee uur: pas weer bij het volgende dagdeel (budget van WidgetKit).
        XCTAssertEqual(WidgetTijdlijn.volgende(nu: start.addingTimeInterval(130 * 60), wachtOpNieuwe: true), Self.moment("2026-11-12T05:33:00Z"))
        XCTAssertEqual(WidgetTijdlijn.volgende(nu: start, wachtOpNieuwe: false), Self.moment("2026-11-12T05:33:00Z"))
        // Nooit later dan het volgende dagdeel.
        let laat = Self.moment("2026-11-11T10:55:00Z") // 11:55: binnen twee uur na de ochtend? nee, maar het dagdeel wisselt om 12:03
        XCTAssertLessThanOrEqual(WidgetTijdlijn.volgende(nu: laat, wachtOpNieuwe: true), Self.moment("2026-11-11T11:03:00Z"))
    }

    // Keuring 1: na zelf ophalen krijgt 01 hetzelfde (grote) beeld als in de app, niet de kleine uitsnede uit de feed.
    func testBeeldNaZelfOphalenZoalsDeApp() throws {
        let json = """
        {"id":"2026-11-11-avond","slot":"avond","entries":[{"kind":"item","id":"a"}],
         "items":[{"id":"a","title":"Kop","sourceName":"NYT","image":"https://static01.nyt.com/images/2026/11/11/foto-mediumSquareAt3X.jpg"}]}
        """
        let server = try JSONDecoder().decode(ServerEditie.self, from: Data(json.utf8))
        XCTAssertEqual(server.stenen.first?.beeldURL, ImageURL.url("https://static01.nyt.com/images/2026/11/11/foto-mediumSquareAt3X.jpg", .large))
        XCTAssertEqual(server.stenen.first?.beeldURL?.absoluteString.contains("threeByTwoMediumAt2X"), true)
    }

    // Keuring 1: toetsen schrijven nooit in de echte App Group van het toestel.
    func testToetsenRakenDeEchteAppGroupNietAan() {
        XCTAssertTrue(WidgetGroep.inToets)
        if let echt = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: WidgetGroep.id) {
            XCTAssertNotEqual(WidgetGroep.map.standardizedFileURL, echt.standardizedFileURL)
        }
    }

    // MARK: Welke Editie, welke stand

    func testServerEditieWordtTienGenummerdeVerhalenZonderBubbel() throws {
        let e = try Self.editie()
        XCTAssertEqual(e.id, "2026-11-11-avond")
        XCTAssertEqual(e.naam, "Avondeditie")
        XCTAssertEqual(e.verhalen.map(\.nummer), Array(1...10))
        XCTAssertFalse(e.verhalen.contains { $0.kop.hasPrefix("Emma Heesters") }, "Buiten je bubbel staat niet in de widget")
        // Keuring 9: een kop wordt nooit ingekort. De korte kop van de server is de kop zelf (als hij past), anders
        // staat de hele kop er.
        XCTAssertEqual(e.verhalen[0].kortKop, e.verhalen[0].kop)
        XCTAssertTrue(e.verhalen[0].kop.hasSuffix("nog geen reactie VVD"))
        XCTAssertEqual(e.verhalen[1].kortKop, e.verhalen[1].kop)
        XCTAssertEqual(e.verhalen[0].bron.isEmpty, false)
        for v in e.verhalen { XCTAssertEqual(v.kortKop, v.kop) }
    }

    func testZonderKorteKopVanDeServerRekentDeAppHemZelf() {
        let lang = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        let e = WidgetEditie.bouw(id: "2026-11-11-middag", datum: "2026-11-11", dagdeel: "middag",
                                  stenen: [.init(plek: "a", itemId: "a", kop: lang, kortKop: nil, bron: "AD")], gelezen: [], vraag: .lid)
        XCTAssertEqual(e.verhalen[0].kortKop, lang)
        // Een ingekorte kop van een oudere server telt niet: dan de kop zelf.
        let oud = WidgetEditie.bouw(id: "2026-11-11-middag", datum: "2026-11-11", dagdeel: "middag",
                                    stenen: [.init(plek: "a", itemId: "a", kop: lang, kortKop: "Iraanse dreiging is zó groot dat Amerikaanse minister…", bron: "AD")], gelezen: [], vraag: .lid)
        XCTAssertEqual(oud.verhalen[0].kortKop, lang)
        let geen = "Twee Franse parlementariërs en twee journalisten mogen Rusland niet meer in"
        let g = WidgetEditie.bouw(id: "2026-11-11-middag", datum: "2026-11-11", dagdeel: "middag",
                                  stenen: [.init(plek: "a", itemId: "a", kop: geen, kortKop: nil, bron: "NOS")], gelezen: [], vraag: .lid)
        XCTAssertEqual(g.verhalen[0].kortKop, geen)
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

    // Keuring 2: een verhaal uit de widget dat nog niet in de getoonde Editie staat, wacht op een andere Editie,
    // niet op een ander aantal rijen. De widget had de nieuwe Editie al; de app had de vorige, ook met tien rijen.
    func testDeepLinkWachtOpDeEditieNietOpHetAantal() {
        func rij(_ id: String, story: Story? = nil) -> EditionRowModel {
            EditionRowModel(id: id, item: Item(id: id, source: "nos", title: "Verhaal \(id)", url: "https://nos.nl/\(id)"), story: story, label: nil, desk: nil)
        }
        let vorige = (0..<10).map { rij("oud\($0)") }
        let nieuwe = (0..<10).map { rij("nieuw\($0)", story: $0 == 3 ? Story(id: "s3", itemIds: ["nieuw3", "bundel"]) : nil) }
        XCTAssertEqual(vorige.count, nieuwe.count, "hetzelfde aantal rijen")
        XCTAssertNotEqual(WidgetVerhaalWacht.sleutel(editie: "2026-11-11-middag", rijen: vorige.map(\.id)),
                          WidgetVerhaalWacht.sleutel(editie: "2026-11-11-avond", rijen: nieuwe.map(\.id)))
        // Zelfde Editie, andere rijen (je eigen Editie na de voorlopige): ook een andere sleutel.
        XCTAssertNotEqual(WidgetVerhaalWacht.sleutel(editie: "2026-11-11-avond", rijen: vorige.map(\.id)),
                          WidgetVerhaalWacht.sleutel(editie: "2026-11-11-avond", rijen: nieuwe.map(\.id)))
        // In de vorige Editie staat het verhaal niet: wachten. In de nieuwe wel: openen, ook vanuit de bundel.
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: vorige, geladen: false), .wacht)
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: nieuwe, geladen: false), .open("nieuw5"))
        XCTAssertEqual(WidgetVerhaalWacht.stap("bundel", rows: nieuwe, geladen: true), .open("nieuw3"))
        var eerder = nieuwe
        var stuk = Item(id: "nieuw0", source: "nos", title: "Verhaal nieuw0", url: "https://nos.nl/nieuw0")
        stuk.formerIds = ["vroeger"]
        eerder[0] = EditionRowModel(id: "nieuw0", item: stuk, story: nil, label: nil, desk: nil)
        XCTAssertEqual(WidgetVerhaalWacht.stap("vroeger", rows: eerder, geladen: false), .open("nieuw0"))
        // Klaar met laden en het staat er niet in: de link vervalt, je blijft in de Editie.
        XCTAssertEqual(WidgetVerhaalWacht.stap("nergens", rows: nieuwe, geladen: true), .vervalt)
        // Keuring 3, koude start met account: de feed is klaar, maar je sessie laadt nog (geen rijen, of de
        // voorlopige Editie). Dan wachten op je eigen Editie; pas als het account klaar is, vervalt de link.
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: [], geladen: true, accountLaadt: true), .wacht)
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: vorige, geladen: true, accountLaadt: true), .wacht)
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: [], geladen: true), .wacht)
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: nieuwe, geladen: true, accountLaadt: false), .open("nieuw5"))
        XCTAssertEqual(WidgetVerhaalWacht.stap("nergens", rows: nieuwe, geladen: true, accountLaadt: false), .vervalt)
        // Keuring 4: zonder Editie (geen verbinding) wacht de link niet onbeperkt.
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: [], geladen: true, gewacht: 5), .wacht)
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: [], geladen: false, gewacht: WidgetVerhaalWacht.grens), .vervalt)
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: [], geladen: true, accountLaadt: true, gewacht: WidgetVerhaalWacht.grens + 1), .vervalt)
        // Staat het verhaal er net op de grens wel, dan opent hij gewoon.
        XCTAssertEqual(WidgetVerhaalWacht.stap("nieuw5", rows: nieuwe, geladen: true, gewacht: WidgetVerhaalWacht.grens + 1), .open("nieuw5"))
    }

    // Keuring 2: zonder account nooit `lid`. Zonder bewaarde vraag haalt de widget de Editie voor iedereen.
    func testZonderAccountNooitLid() {
        XCTAssertEqual(WidgetSchrijver.vraag(eigen: true, account: false, vraagBewaard: false), .algemeen)
        XCTAssertEqual(WidgetSchrijver.vraag(eigen: true, account: false, vraagBewaard: true), .eigen)
        XCTAssertEqual(WidgetSchrijver.vraag(eigen: true, account: true, vraagBewaard: true), .lid)
        XCTAssertEqual(WidgetSchrijver.vraag(eigen: false, account: true, vraagBewaard: false), .algemeen)
        XCTAssertEqual(WidgetSchrijver.vraag(eigen: false, account: false, vraagBewaard: false), .algemeen)
        for eigen in [true, false] { for vraag in [true, false] {
            XCTAssertNotEqual(WidgetSchrijver.vraag(eigen: eigen, account: false, vraagBewaard: vraag), .lid)
        } }
        // En dan haalt de widget bij een nieuw dagdeel zelf.
        var e = try! Self.editie()
        e.vraag = WidgetSchrijver.vraag(eigen: true, account: false, vraagBewaard: false)
        XCTAssertTrue(WidgetOphalen.moetOphalen(e, nu: Self.moment("2026-11-12T05:40:00Z")))
    }

    // Taal volgt bronkeuze: haalt de widget de Editie voor iedereen voor iemand met een eigen Editie, dan geen kop
    // in een taal die hij niet koos. Een Nederlandse kop en een kop van een eigen bron blijven.
    func testAlgemeneEditieVoorEenEigenLezerVolgtDeTaalregel() throws {
        let json = """
        {"id":"2026-11-12-ochtend","slot":"ochtend","entries":[{"kind":"item","id":"a"},{"kind":"item","id":"b"},{"kind":"item","id":"c"},{"kind":"item","id":"d"}],
         "items":[{"id":"a","title":"Kabinet valt","source":"nos"},{"id":"b","title":"Cabinet falls","source":"bbc"},
                  {"id":"c","title":"Game news","source":"ign"},{"id":"d","title":"English piece","source":"nrc","lang":"en"}]}
        """
        let server = try JSONDecoder().decode(ServerEditie.self, from: Data(json.utf8))
        let bronnen = [ServerEditie.Bron(id: "nos", lang: "nl"), .init(id: "bbc", lang: "en"), .init(id: "ign", lang: "en"), .init(id: "nrc", lang: "nl")]
        let nu = Self.moment("2026-11-12T05:40:00Z")
        let eigen = try XCTUnwrap(server.widget(vraag: .algemeen, gelezen: [], eigenBronnen: ["nos", "ign"], bronnen: bronnen, nu: nu))
        XCTAssertEqual(eigen.verhalen.map(\.itemId), ["a", "c"])
        XCTAssertEqual(eigen.verhalen.map(\.nummer), [1, 2])
        XCTAssertEqual(eigen.eigenBronnen, ["nos", "ign"], "blijft bewaard voor het volgende dagdeel")
        // Zonder talen van de bronnen weet de widget het niet zeker: geen nieuwe Editie, de vorige blijft.
        XCTAssertNil(server.widget(vraag: .algemeen, gelezen: [], eigenBronnen: ["nos"], bronnen: nil, nu: nu))
        // Wie geen eigen Editie heeft, krijgt de Editie voor iedereen zoals de app hem toont.
        XCTAssertEqual(try XCTUnwrap(server.widget(vraag: .algemeen, gelezen: [], nu: nu)).verhalen.count, 4)
    }

    // Keuring 2: geen netwerk bij een nieuw dagdeel. De vorige Editie blijft staan (met "Tik voor de …"), er wordt
    // niets overschreven, en de widget vraagt over twintig minuten opnieuw.
    func testGeenNetwerkDeVorigeEditieBlijftStaan() async throws {
        let map = FileManager.default.temporaryDirectory.appending(path: "widget-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: map, withIntermediateDirectories: true)
        WidgetGroep.mapOverride = map
        defer { WidgetGroep.mapOverride = nil; try? FileManager.default.removeItem(at: map) }
        let suite = "widget-toets-\(UUID().uuidString)"
        defer { UserDefaults(suiteName: suite)?.removePersistentDomain(forName: suite) }

        XCTAssertTrue(WidgetBron.bewaar(try Self.editie(gelezen: 4)))
        let vorige = try XCTUnwrap(WidgetBron.laad())
        let voor = try Data(contentsOf: WidgetBron.bestand)
        let c = URLSessionConfiguration.ephemeral
        c.protocolClasses = [GeenNetwerk.self]
        let sessie = URLSession(configuration: c)
        let nu = Self.moment("2026-11-12T05:40:00Z") // de Ochtendeditie is er, de widget heeft de Avondeditie

        let uit = await WidgetVernieuwen.editie(nu: nu, suite: suite, sessie: sessie)
        XCTAssertGreaterThanOrEqual(GeenNetwerk.gevraagd, 1, "de widget probeerde het echt")
        XCTAssertEqual(uit.editie, vorige)
        XCTAssertTrue(uit.wacht)
        XCTAssertFalse(uit.bewaard)
        XCTAssertEqual(try Data(contentsOf: WidgetBron.bestand), voor, "het bestand bleef zoals het was")
        XCTAssertEqual(WidgetStand.van(try XCTUnwrap(uit.editie), op: nu).label, "Tik voor de Ochtendeditie")
        XCTAssertEqual(WidgetTijdlijn.volgende(nu: nu, wachtOpNieuwe: uit.wacht), nu.addingTimeInterval(20 * 60))
        // Meteen nog eens (een tweede widget): niet opnieuw het netwerk op, wel de vorige Editie.
        let tweede = await WidgetVernieuwen.editie(nu: nu.addingTimeInterval(60), suite: suite, sessie: sessie)
        XCTAssertEqual(tweede.editie, vorige)
        XCTAssertTrue(tweede.wacht)
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

    // MARK: Zetten binnen de marges (besluit Alex 12 november 2026: nooit inkorten, slim vullen)

    static func editie(_ koppen: [String], bron: String = "NOS") -> WidgetEditie {
        let nu = WidgetDagdeel.op(moment("2026-11-11T17:41:00Z"))
        let stenen = koppen.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: bron) }
        return WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
    }

    // Middel · Top 3 op de grootste iPhone (364 × 170) en de kleinste maat met widgets (iPhone mini, 329 × 155):
    // wat er staat, is de hele kop en past met lucht ertussen, in Editie-volgorde, met 01 bovenaan.
    func testTop3PastMetLucht() throws {
        let e = try Self.editie()
        for maat in [CGSize(width: 364, height: 170), CGSize(width: 338, height: 158), CGSize(width: 329, height: 155)] {
            let (plekken, breedte, hoogte) = MiddelTop3.zet(e, maat: maat, marge: WidgetRuimte.s4)
            XCTAssertGreaterThanOrEqual(plekken.count, 1, "\(maat)")
            XCTAssertEqual(plekken.first?.index, 0, "01 bovenaan")
            XCTAssertLessThanOrEqual(WidgetZet.totaal(plekken, tussen: MiddelTop3.tussen), hoogte, "\(maat)")
            XCTAssertEqual(plekken.map(\.index), plekken.map(\.index).sorted(), "Editie-volgorde")
            for p in plekken {
                XCTAssertEqual(p.gezet.tekst, e.verhalen[p.index].kop, "de hele kop")
                XCTAssertLessThanOrEqual(WidgetZet.regels(p.gezet.tekst, p.m, breedte: breedte), p.gezet.regels, p.gezet.tekst)
            }
        }
    }

    // Keuring 9: geen kop levert tekst in. Past 02 heel niet meer, dan schuift 03 op als hij wel heel past.
    func testGeenKopLevertTekstIn() {
        let koppen = ["D66 en CDA sluiten deal met Pro en Volt rond belastingplan en de VVD wacht met een reactie tot morgen",
                      "Honderden scholen in Europa doelwit van een golf bommeldingen per e-mail vanuit het buitenland",
                      "Sluiting dreigt voor verouderde laboratoria RIVM en verhuizen kan pas over een paar jaar"]
        for k in [koppen, [koppen[0], "Honderden scholen in Europa krijgen een bommelding per e-mail", "RIVM sluit oude laboratoria pas als het nieuwe gebouw er staat"]] {
            let e = Self.editie(k)
            let (plekken, breedte, hoogte) = MiddelTop3.zet(e, maat: CGSize(width: 364, height: 170), marge: WidgetRuimte.s4)
            XCTAssertEqual(plekken.first?.gezet.tekst, k[0])
            for p in plekken {
                XCTAssertEqual(p.gezet.tekst, k[p.index], "de hele kop")
                XCTAssertEqual(WidgetZet.regels(p.gezet.tekst, p.m, breedte: breedte), p.gezet.regels, p.gezet.tekst)
            }
            XCTAssertLessThanOrEqual(WidgetZet.totaal(plekken, tussen: MiddelTop3.tussen), hoogte)
        }
    }

    // Een kop zonder veilige korte vorm staat heel, met de regels die hij nodig heeft; iOS kapt hem nooit af. Op het
    // vergrendelscherm wijkt de naam, of de kop wordt kleiner, of de volgende kop schuift op.
    static let zonderVeiligeVorm = [
        "Een vaste basisplaats bij Marokko zit er voor Ayoub Oufkir niet in; bij Oranje ook niet",
        "Twee Franse parlementariërs en twee journalisten mogen Rusland niet meer in",
        "Tot vreugde van Trump hoeft defensieminister Hegseth voorlopig nog geen afzetting te vrezen",
    ]
    func testKopZonderVeiligeVormKrijgtZijnRegels() throws {
        let m = WidgetLetter.widgetKop
        for kop in Self.zonderVeiligeVorm {
            XCTAssertNil(KortKop.kort(kop), kop)
            let g = WidgetZet.pas(kop, kort: nil, m, breedte: 172, max: 2)
            XCTAssertEqual(g.tekst, kop, "de hele kop")
            XCTAssertGreaterThan(g.regels, 2, kop)
            XCTAssertEqual(WidgetZet.regels(g.tekst, m, breedte: 172), g.regels, kop)
        }
        let rechthoek = CGSize(width: 172, height: 76)
        for kop in Self.zonderVeiligeVorm {
            let z = try XCTUnwrap(VergrendelRechthoek.zet(Self.editie([kop, "Kabinet presenteert plan voor nieuwe woningen in de randstad"]), maat: rechthoek))
            XCTAssertEqual(z.gezet.tekst, z.verhaal.kop, "de hele kop")
            XCTAssertEqual(WidgetZet.regels(z.gezet.tekst, z.m, breedte: 172), z.gezet.regels)
            let hoogte = (z.metNaam ? VergrendelRechthoek.naamHoogte : 0) + CGFloat(z.gezet.regels) * z.m.regel
            XCTAssertLessThanOrEqual(hoogte, 76, z.gezet.tekst)
            XCTAssertGreaterThanOrEqual(z.m.grootte, WidgetZet.ondergrens)
        }
        // Past de kop ook kleiner niet, dan schuift de volgende kop op.
        let lang = String(repeating: "Een vaste basisplaats bij Marokko zit er voor de jonge middenvelder niet in; ", count: 3)
        let z = try XCTUnwrap(VergrendelRechthoek.zet(Self.editie([lang, "Kabinet presenteert plan voor nieuwe woningen"]), maat: rechthoek))
        XCTAssertEqual(z.verhaal.itemId, "i1")
        XCTAssertNil(VergrendelRechthoek.zet(Self.editie([lang, lang]), maat: rechthoek), "geen kop past: de naam en de stand")
        // Middel · Top 3: de kop houdt al zijn regels.
        for kop in Self.zonderVeiligeVorm {
            let e = Self.editie([kop, "Kabinet presenteert plan voor nieuwe woningen in de randstad", "Storm trekt over het land"])
            let (plekken, breedte, hoogte) = MiddelTop3.zet(e, maat: CGSize(width: 329, height: 155), marge: WidgetRuimte.s4)
            XCTAssertEqual(plekken.first?.gezet.tekst, kop)
            for p in plekken { XCTAssertEqual(WidgetZet.regels(p.gezet.tekst, p.m, breedte: breedte), p.gezet.regels, p.gezet.tekst) }
            XCTAssertLessThanOrEqual(WidgetZet.totaal(plekken, tussen: MiddelTop3.tussen), hoogte)
        }
    }

    // Besluit Alex: Top 3 in Middel is twee volle koppen; 03 als er ruimte is.
    func testTop3TweeVolleKoppen() {
        let koppen = ["Honderden scholen in Europa doelwit van bommeldingen",
                      "Kabinet presenteert plan voor nieuwe woningen in de randstad",
                      "Storm trekt vanavond over het hele land met code oranje voor de kust"]
        let e = Self.editie(koppen)
        for maat in [CGSize(width: 364, height: 170), CGSize(width: 329, height: 155)] {
            let plekken = MiddelTop3.zet(e, maat: maat, marge: WidgetRuimte.s4).plekken
            XCTAssertGreaterThanOrEqual(plekken.count, 2, plekken.map(\.gezet.tekst).joined(separator: " | "))
            XCTAssertEqual(plekken.prefix(2).map(\.index), [0, 1])
            for p in plekken { XCTAssertEqual(p.gezet.tekst, koppen[p.index]) }
        }
    }

    // Slim vullen: past 02 heel niet meer, dan schuift een latere kop op die wel heel past, met zijn eigen nummer.
    func testTop3LatereKopSchuiftOp() {
        let lang = "Kabinet valt over stikstof na een lange nacht van onderhandelen in het Catshuis, maar de premier zegt dat er geen crisis is en dat hij niet opstapt"
        let e = Self.editie(["Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis",
                             lang, "Storm raast over het noorden", lang])
        let plekken = MiddelTop3.zet(e, maat: CGSize(width: 364, height: 170), marge: WidgetRuimte.s4).plekken
        XCTAssertEqual(plekken.map { e.verhalen[$0.index].nummer }, [1, 3])
    }

    // Het uiterste: past 01 zelfs niet heel, dan kleiner gezet tot de ondergrens; past hij dan nog niet, dan de
    // volgende kop die wel past; past er geen enkele, dan niets (de widget toont de rustige voortgang).
    func testUitersteKoppen() {
        let k200 = "Kabinet is gevallen na urenlang crisisberaad in het Catshuis over de asielwet van minister Faber, maar premier Schoof spreekt het bericht van De Telegraaf tegen en noemt het volstrekte onzin vanavond"
        let k280 = k200 + " in een korte verklaring voor de camera's van de NOS en RTL Nieuws in Den Haag, waarna de Tweede Kamer"
        let middel = CGSize(width: 364, height: 170)
        // 01 van 200 tekens past in Top 3 alleen kleiner.
        let a = MiddelTop3.zet(Self.editie([k200, "Storm raast over het noorden"]), maat: middel, marge: 16).plekken
        XCTAssertEqual(a.first?.index, 0)
        XCTAssertLessThan(a.first?.m.grootte ?? 99, WidgetLetter.widgetKop.grootte)
        XCTAssertGreaterThanOrEqual(a.first?.m.grootte ?? 0, WidgetZet.ondergrens)
        // Een 01 van bijna 500 tekens past ook kleiner niet: 02 schuift op, in zijn eigen maat.
        let k480 = k280 + ". " + k200
        let b = MiddelTop3.zet(Self.editie([k480, "Storm raast over het noorden"]), maat: middel, marge: 16).plekken
        XCTAssertEqual(b.map(\.index), [1])
        XCTAssertEqual(b.first?.m, WidgetLetter.widgetKop)
        // Geen enkele kop past: leeg (de rustige voortgang).
        XCTAssertTrue(MiddelTop3.zet(Self.editie([k480, k480 + " 2"]), maat: middel, marge: 16).plekken.isEmpty)
        XCTAssertNil(KleinKop.zet(Self.editie([k280, k280 + " 2"]), maat: CGSize(width: 170, height: 170), marge: 16, metBeeld: true))
        XCTAssertNil(VergrendelRechthoek.zet(Self.editie([k200, k280]), maat: CGSize(width: 172, height: 76)))
        // De trap van maten: eigen maat, widget-kop, dan per punt kleiner tot de ondergrens.
        XCTAssertEqual(WidgetZet.trap(WidgetLetter.item).map(\.grootte), [20, 16, 15, 14, 13])
        XCTAssertEqual(WidgetZet.trap(WidgetLetter.widgetKop).map(\.grootte), [16, 15, 14, 13])
    }

    // Keuring 9: een kop die niet past, wordt niet korter.
    func testEenKopDieNietPastStaatHeel() {
        let kop = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        let een = WidgetZet.pas(kop, kort: nil, WidgetLetter.widgetKop, breedte: 140, max: 1)
        XCTAssertEqual(een.tekst, kop)
        XCTAssertGreaterThan(een.regels, 1)
        XCTAssertEqual(een.regels, WidgetZet.regels(kop, WidgetLetter.widgetKop, breedte: 140))
        let oud = WidgetZet.pas(kop, kort: "Iraanse dreiging is zó groot dat Amerikaanse minister…", WidgetLetter.widgetKop, breedte: 300, max: 3)
        XCTAssertEqual(oud.tekst, kop)
    }

    // MARK: Bladeren (13 november 2026)

    // Voorbeelden van herschreven korte koppen bij de koppen van de fixture (zoals de server ze met HOOT_KORTE_KOP_AI
    // zou geven); elk komt door de controle. Alleen voor toetsen en opnamen.
    static let voorbeeldKort = [
        "D66 en CDA sluiten deal met Pro en Volt rond belastingplan, nog geen reactie VVD": "Deal over belastingplan, nog geen reactie VVD",
        "Honderden scholen in Europa krijgen een bommelding per e-mail vanuit het buitenland": "Bommelding per e-mail bij honderden scholen",
        "Sluiting dreigt voor verouderde laboratoria RIVM, maar verhuizen kan nog niet": "RIVM-labs dreigen dicht, verhuizen kan niet",
        "Italy: Hundreds of schools evacuated after bomb threats": "Italy: bomb threats empty hundreds of schools",
        "Russia, Ukraine agree on prisoner exchange as talks end without major breakthrough": "Prisoner swap agreed, but no breakthrough",
        "‘Nog 1 hotelkamer beschikbaar!’ Brussel presenteert nieuwe techwet tegen manipulatieve trucs van big tech": "Brussel pakt trucs van big tech aan",
        "AI-pionier Anthropic bestormt lijst grootste beursgangen ooit": "Anthropic op lijst grootste beursgangen ooit",
        "Three Iran-backed suspects plotted attacks including RAF Fairford incident, US says": "US: Iran-backed suspects plotted attacks",
        "US soldier arrested for Russia spying: What we know": "Russia spying: US soldier arrested",
        "OM vermoedt dat verdachte zorgmedewerker nog meer slachtoffers heeft gemaakt": "OM vermoedt meer slachtoffers zorgmedewerker",
    ]
    // De fixture met de korte koppen van de server (via de bewaking van WidgetEditie.bouw).
    static func editieMetKort(gelezen: [Int] = [], nu: Date = moment("2026-11-11T17:41:00Z")) throws -> WidgetEditie {
        let e = try editie(nu: nu)
        let stenen = e.verhalen.map { v in WidgetEditie.Bouwsteen(plek: v.id, itemId: v.itemId, kop: v.kop, kortKop: voorbeeldKort[v.kop], bron: v.bron) }
        var uit = WidgetEditie.bouw(id: e.id, datum: e.datum, dagdeel: e.dagdeel, stenen: stenen, gelezen: [], vraag: e.vraag, nu: nu)
        uit.gelezen = gelezen.map { uit.verhalen[$0].itemId }
        return uit
    }

    // Een eigen suite per toets: de echte plek van het toestel blijft staan.
    private func metEigenSuite(_ werk: () async throws -> Void) async rethrows {
        let naam = "nl.hootnews.Hoot.toets.\(UUID().uuidString)"
        WidgetBlader.suiteOverride = naam
        defer { UserDefaults().removePersistentDomain(forName: naam); WidgetBlader.suiteOverride = nil }
        try await werk()
    }

    func testBladerplekPerEditieEnTerugNaar01BijEenNieuwe() async throws {
        try await metEigenSuite {
            let avond = "2026-11-11-avond", ochtend = "2026-11-12-ochtend"
            XCTAssertEqual(WidgetBlader.stand(voor: avond), .init(editie: avond), "nog niets: het begin")
            WidgetBlader.zet(.enkel, 4, editie: avond)
            WidgetBlader.zet(.groep, 2, editie: avond)
            XCTAssertEqual(WidgetBlader.stand(voor: avond), .init(editie: avond, enkel: 4, groep: 2), "Klein en Middel delen enkel, Groot heeft groep")
            // Een nieuwe Editie: terug naar 01 (en de eerste groep).
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend), .init(editie: ochtend))
            WidgetBlader.zet(.enkel, 1, editie: ochtend)
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend).enkel, 1)
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend).groep, 0, "de groep van de vorige Editie gaat niet mee")
            XCTAssertEqual(WidgetBlader.stand(voor: avond), .init(editie: avond), "alleen de laatste Editie wordt onthouden")
            // De intent schrijft dezelfde plek (wat de knoppen in de widget doen).
            _ = try await BladerIntent(.enkel, plek: 7, editie: ochtend).perform()
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend).enkel, 7)
            _ = try await BladerIntent(.groep, plek: 3, editie: ochtend).perform()
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend), .init(editie: ochtend, enkel: 7, groep: 3))
            _ = try await BladerIntent(.enkel, plek: 0, editie: ochtend).perform() // Terug naar 01
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend).enkel, 0)
            // Keuring K5: een knop op een widget die nog de oudere Editie toont, zet de plek van de nieuwe niet terug.
            let map = FileManager.default.temporaryDirectory.appending(path: "hoot-blader-\(UUID().uuidString)", directoryHint: .isDirectory)
            try FileManager.default.createDirectory(at: map, withIntermediateDirectories: true)
            WidgetGroep.mapOverride = map
            defer { WidgetGroep.mapOverride = nil; try? FileManager.default.removeItem(at: map) }
            WidgetBron.bewaar(WidgetEditie.bouw(id: ochtend, datum: "2026-11-12", dagdeel: "ochtend",
                                                stenen: [.init(plek: "a", itemId: "a", kop: "Storm raast over het noorden", bron: "NOS")], gelezen: [], vraag: .lid))
            _ = try await BladerIntent(.enkel, plek: 3, editie: ochtend).perform()
            _ = try await BladerIntent(.enkel, plek: 6, editie: avond).perform()
            XCTAssertEqual(WidgetBlader.stand(voor: ochtend).enkel, 3, "de oude knop doet niets")
        }
    }

    // Bladeren telt niet als gelezen: de plek staat los van `gelezen`, en de widget schrijft geen Editie.
    func testBladerenTeltNietAlsGelezen() async throws {
        try await metEigenSuite {
            let e = try Self.editie(gelezen: 2)
            let voor = WidgetBron.laad()
            _ = try await BladerIntent(.enkel, plek: 5, editie: e.id).perform()
            XCTAssertEqual(e.aantalGelezen, 2)
            XCTAssertEqual(WidgetBron.laad(), voor, "bladeren raakt de Editie in de App Group niet aan")
            // En de plek blijft op het toestel: alleen deze sleutel, niets in het vraagbestand voor de server.
            XCTAssertNotNil(WidgetBlader.defaults?.data(forKey: WidgetBlader.sleutel))
        }
    }

    func testBladerGrenzenEnGroepen() throws {
        let e = try Self.editie()
        XCTAssertEqual(e.verhalen.count, 10)
        XCTAssertEqual(WidgetBlader.einde(e), 10, "plek 10 is het einde")
        XCTAssertEqual(WidgetBlader.laatsteGroep(e), 3)
        XCTAssertEqual((0...3).map { WidgetBlader.groep($0, in: e) }, [0..<3, 3..<6, 6..<9, 9..<10], "01-03, 04-06, 07-09, dan 10 met het einde")
        // Een bewaarde plek buiten de grenzen, of van een andere Editie: binnen de grenzen, of het begin.
        XCTAssertEqual(WidgetBlader.enkel(.init(editie: e.id, enkel: 14), e), 10)
        XCTAssertEqual(WidgetBlader.enkel(.init(editie: e.id, enkel: -2), e), 0)
        XCTAssertEqual(WidgetBlader.enkel(.init(editie: "2026-11-10-avond", enkel: 6), e), 0)
        XCTAssertEqual(WidgetBlader.groep(.init(editie: e.id, groep: 9), e), 3)
        XCTAssertEqual(WidgetBlader.enkel(nil, e), 0)
        // Negen verhalen: drie volle groepen, dan alleen het einde.
        var negen = e; negen.verhalen.removeLast()
        XCTAssertEqual(WidgetBlader.laatsteGroep(negen), 3)
        XCTAssertTrue(WidgetBlader.groep(3, in: negen).isEmpty)
    }

    func testToonKeuzesPerMaat() {
        XCTAssertEqual(HootWidgetEntry(date: .now, editie: nil).toon, .bladeren, "Bladeren is de standaard")
        XCTAssertEqual(WidgetToon.allCases.first, .bladeren)
        XCTAssertEqual(WidgetToon.passend(.bladeren, in: .systemSmall), .bladeren)
        XCTAssertEqual(WidgetToon.passend(.bladeren, in: .systemMedium), .bladeren)
        XCTAssertEqual(WidgetToon.passend(.kop01, in: .systemSmall), .kop01)
        XCTAssertEqual(WidgetToon.passend(.voortgang, in: .systemSmall), .voortgang)
        XCTAssertEqual(WidgetToon.passend(.top3, in: .systemSmall), .voortgang, "Top 3 past niet in Klein")
        XCTAssertEqual(WidgetToon.passend(.voortgang, in: .systemMedium), .top3, "Voortgang past niet in Middel")
        XCTAssertEqual(WidgetToon.passend(.top3, in: .systemMedium), .top3)
    }

    // Klein toont de korte kop; Middel de hele kop als hij heel past, anders de korte; Groot de hele kop, of de korte
    // als hij niet heel past. Zonder (veilige) korte kop valt de widget terug op de hele kop.
    func testKorteKopInKleinMiddelEnGroot() throws {
        let e = try Self.editieMetKort()
        for v in e.verhalen { XCTAssertEqual(v.kortKop, Self.voorbeeldKort[v.kop] ?? v.kop, v.kop) }
        let klein = CGSize(width: 170, height: 170), middel = CGSize(width: 364, height: 170), groot = CGSize(width: 364, height: 382)
        for plek in 0..<10 {
            let k = try XCTUnwrap(KleinBladeren.zet(e, maat: klein, marge: 16, plek: plek))
            XCTAssertEqual(k.gezet.tekst, e.verhalen[plek].kortKop, "Klein: de korte kop")
            XCTAssertEqual(k.m, WidgetLetter.widgetKop, "de korte kop past in widget-kop 16/18,4")
            XCTAssertTrue(k.bron)
            let m = try XCTUnwrap(MiddelBladeren.zet(e, maat: middel, marge: 16, plek: plek))
            XCTAssertEqual(m.gezet.tekst, e.verhalen[plek].kop, "Middel: de hele kop past op iPhone")
        }
        XCTAssertNil(KleinBladeren.zet(e, maat: klein, marge: 16, plek: 10), "na 10: het einde")
        for g in 0...3 {
            for rij in GrootBladeren.zet(e, maat: groot, marge: 16, groep: g) { XCTAssertEqual(rij.keuze.gezet.tekst, e.verhalen[rij.index].kop, "Groot: de hele kop") }
        }
        // Op de iPad mini past niet elke hele kop in Middel: dan de korte, nooit afgekapt.
        let mini = CGSize(width: 305.5, height: 141)
        let lang = try XCTUnwrap(MiddelBladeren.zet(e, maat: mini, marge: 16, plek: 5))
        XCTAssertEqual(lang.gezet.tekst, e.verhalen[5].kortKop)
        // Een onveilige korte kop (ingekort) telt niet: dan de hele kop, zo nodig kleiner of zonder bron.
        let stenen = [WidgetEditie.Bouwsteen(plek: "a", itemId: "a", kop: e.verhalen[0].kop, kortKop: "D66 en CDA sluiten deal met Pro en Volt…", bron: "NOS")]
        let oud = WidgetEditie.bouw(id: e.id, datum: e.datum, dagdeel: e.dagdeel, stenen: stenen, gelezen: [], vraag: .lid)
        XCTAssertEqual(oud.verhalen[0].kortKop, oud.verhalen[0].kop)
        let terug = try XCTUnwrap(KleinBladeren.zet(oud, maat: klein, marge: 16, plek: 0))
        XCTAssertEqual(terug.gezet.tekst, oud.verhalen[0].kop, "terugval op de hele kop")
        XCTAssertLessThanOrEqual(CGFloat(terug.gezet.regels) * terug.m.regel, 170 - 32 - BladerZet.rij - WidgetRuimte.s2)
    }

    // Groot: drie koppen per groep, nooit een rij weg en nooit hoger dan er ruimte is, ook met lange live koppen en
    // zonder korte kop; aan het eind 10 met het einde eronder.
    func testGrootGroepenPassenAltijd() throws {
        let live = try WidgetRenderTests.liveKoppen().sorted { $0.kop.count > $1.kop.count }
        let maten = [CGSize(width: 364, height: 382), CGSize(width: 329, height: 345), CGSize(width: 305.5, height: 305.5), CGSize(width: 378.5, height: 378.5)]
        for start in stride(from: 0, to: 40, by: 10) {
            let e = WidgetRenderTests.editie(Array(live.dropFirst(start).prefix(10)))
            for maat in maten {
                for g in 0...3 {
                    let rijen = GrootBladeren.zet(e, maat: maat, marge: 16, groep: g)
                    XCTAssertEqual(rijen.map(\.index), Array(WidgetBlader.groep(g, in: e)))
                    let kolom = GrootBladeren.kolom(maat, marge: 16)
                    let hoogte = rijen.reduce(0) { $0 + BladerZet.hoogte($1.keuze, bron: e.verhalen[$1.index].bron, breedte: kolom, lucht: WidgetRuimte.s1) }
                        + GrootBladeren.tussen * CGFloat(max(0, rijen.count - 1))
                    let einde = g == 3 ? GrootBladeren.eindeHoogte(e, breedte: maat.width - 32) : 0
                    XCTAssertLessThanOrEqual(hoogte + einde + BladerZet.afronding * CGFloat(rijen.count), maat.height - 32 - BladerZet.rij - WidgetRuimte.s3 + 0.5, "groep \(g) op \(maat)")
                    for r in rijen { XCTAssertGreaterThanOrEqual(r.keuze.m.grootte, WidgetZet.ondergrens) }
                }
            }
        }
    }

    // Het einde: de eindzin van deze Editie en de volgende Editie, zonder kloktijden; nooit "houdt op".
    func testEindeVanDeEditieInDeWidget() throws {
        let e = try Self.editie()
        XCTAssertTrue(["Je bent bij.", "Je weet genoeg."].contains(e.eindzin))
        XCTAssertEqual(WidgetDagdeel.volgendeZin(na: e.dagdeel), "Morgen de Ochtendeditie")
        for t in [e.eindzin, WidgetDagdeel.volgendeZin(na: e.dagdeel), "Terug naar 01", BladerZet.reserve] {
            XCTAssertNil(t.range(of: "[0-9]{1,2}[:.][0-9]{2}", options: .regularExpression), "geen kloktijd: \(t)")
            XCTAssertFalse(t.contains("houdt op"))
        }
    }
}

// Een sessie zonder netwerk: elk verzoek faalt zoals op een toestel zonder verbinding.
final class GeenNetwerk: URLProtocol {
    nonisolated(unsafe) static var gevraagd = 0
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.gevraagd += 1
        client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
    }
    override func stopLoading() {}
}
