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
        struct Fixture: Decodable { let max: Int; let gevallen: [Geval] }
        let fx = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: Self.root.appending(path: "tests/fixtures/kort-kop.json")))
        XCTAssertEqual(fx.max, KortKop.max)
        XCTAssertGreaterThanOrEqual(fx.gevallen.count, 600)
        for g in fx.gevallen { XCTAssertEqual(KortKop.kort(g.kop, max: g.max ?? KortKop.max), g.verwacht, "\(g.kop) (\(g.max ?? KortKop.max))") }
    }

    // Besluit "korte kop dicht", bij twijfel geen korte vorm (keuring 9): een kop wordt nooit ingekort. De trap is
    // altijd de hele kop; een ingekorte kop van een oudere server telt niet.
    func testTrapIsAltijdDeHeleKop() {
        let kop = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        XCTAssertNil(KortKop.kort(kop))
        XCTAssertEqual(KortKop.trap(kop, kort: nil), [kop])
        XCTAssertEqual(KortKop.trap(kop, kort: "Iraanse dreiging is zó groot dat Amerikaanse minister…"), [kop])
        XCTAssertFalse(KortKop.veilig(kop, "Iraanse dreiging is zó groot dat Amerikaanse minister…"))
        let past = "Een kop van precies zestig tekens die nog net past, wel fijn"
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

    // MARK: Zetten binnen de marges

    // Middel · Top 3 op de grootste iPhone (364 × 170) en de kleinste maat met widgets (iPhone mini, 329 × 155):
    // wat er staat, past met lucht ertussen. Keuring 9: elke kop staat heel (nooit ingekort), met de regels die hij
    // nodig heeft; wat niet past, valt eronder weg.
    func testTop3PastMetLucht() throws {
        let e = try Self.editie()
        for maat in [CGSize(width: 364, height: 170), CGSize(width: 338, height: 158), CGSize(width: 329, height: 155)] {
            let (gezet, breedte, hoogte) = MiddelTop3.zet(e, maat: maat, marge: WidgetRuimte.s4)
            XCTAssertGreaterThanOrEqual(gezet.count, 1, "\(maat)")
            let totaal = gezet.reduce(0) { $0 + CGFloat($1.regels) * WidgetLetter.widgetKop.regel } + MiddelTop3.tussen * CGFloat(gezet.count - 1)
            XCTAssertLessThanOrEqual(totaal, hoogte, "\(maat)")
            for (g, v) in zip(gezet, e.verhalen) {
                XCTAssertEqual(g.tekst, v.kop, "de hele kop")
                XCTAssertLessThanOrEqual(WidgetZet.regels(g.tekst, WidgetLetter.widgetKop, breedte: breedte), g.regels, g.tekst)
            }
        }
    }

    // Keuring 9: geen kop levert tekst in. Past 03 (of 02) heel niet meer, dan valt hij weg; 01 en 02 houden hun
    // hele kop. Vroeger (keuring 1 en 2) leverde de kop die het minst verloor een regel in; dat kan niet meer.
    func testGeenKopLevertTekstIn() {
        let nu = WidgetDagdeel.op(Self.moment("2026-11-11T17:41:00Z"))
        let koppen = ["D66 en CDA sluiten deal met Pro en Volt rond belastingplan en de VVD wacht met een reactie tot morgen",
                      "Honderden scholen in Europa doelwit van een golf bommeldingen per e-mail vanuit het buitenland",
                      "Sluiting dreigt voor verouderde laboratoria RIVM en verhuizen kan pas over een paar jaar"]
        for k in [koppen, [koppen[0], "Honderden scholen in Europa krijgen een bommelding per e-mail", "RIVM sluit oude laboratoria pas als het nieuwe gebouw er staat"]] {
            let stenen = k.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NOS") }
            let e = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
            let (gezet, breedte, hoogte) = MiddelTop3.zet(e, maat: CGSize(width: 364, height: 170), marge: WidgetRuimte.s4)
            XCTAssertEqual(gezet.first?.tekst, k[0])
            for (g, kop) in zip(gezet, k) {
                XCTAssertEqual(g.tekst, kop, "de hele kop")
                XCTAssertEqual(WidgetZet.regels(g.tekst, WidgetLetter.widgetKop, breedte: breedte), g.regels, g.tekst)
            }
            let totaal = gezet.reduce(0) { $0 + CGFloat($1.regels) * WidgetLetter.widgetKop.regel } + MiddelTop3.tussen * CGFloat(gezet.count - 1)
            XCTAssertLessThanOrEqual(totaal, hoogte)
        }
    }

    // Keuring 4, besluit Alex: een kop zonder veilige korte vorm krijgt de regels die hij nodig heeft; iOS kapt hem
    // nooit af. Op het vergrendelscherm een regel extra, of de naam wijkt, of de volgende kop schuift op.
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
        let nu = WidgetDagdeel.op(Self.moment("2026-11-11T17:41:00Z"))
        func editie(_ koppen: [String]) -> WidgetEditie {
            let stenen = koppen.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NOS") }
            return WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
        }
        // Vergrendelscherm (172 × 76): de hele kop, met een regel extra of zonder de naam erboven; nooit afgekapt.
        for kop in Self.zonderVeiligeVorm {
            let z = try XCTUnwrap(VergrendelRechthoek.zet(editie([kop, "Kabinet presenteert plan voor nieuwe woningen in de randstad"]), maat: CGSize(width: 172, height: 76)))
            XCTAssertLessThanOrEqual(z.gezet.regels, z.ruimte, z.gezet.tekst)
            XCTAssertTrue(KortKop.veilig(z.verhaal.kop, z.gezet.tekst), z.gezet.tekst)
            let hoogte = (z.metNaam ? 16 + WidgetRuimte.s0 : 0) + CGFloat(z.gezet.regels) * m.regel
            XCTAssertLessThanOrEqual(hoogte, 76, z.gezet.tekst)
            if z.verhaal.kop == kop { XCTAssertEqual(z.gezet.tekst, kop) }
        }
        // Past de kop ook zonder naam niet, dan schuift de volgende kop op.
        let lang = "Een vaste basisplaats bij Marokko zit er voor de jonge middenvelder van de club uit het zuiden van het land niet in; bij Oranje ook niet"
        let z = try XCTUnwrap(VergrendelRechthoek.zet(editie([lang, "Kabinet presenteert plan voor nieuwe woningen"]), maat: CGSize(width: 172, height: 76)))
        XCTAssertEqual(z.verhaal.itemId, "i1")
        // Middel · Top 3: de kop houdt al zijn regels; wat niet past, valt eronder weg.
        for kop in Self.zonderVeiligeVorm {
            let e = editie([kop, "Kabinet presenteert plan voor nieuwe woningen in de randstad", "Storm trekt over het land"])
            let (gezet, breedte, hoogte) = MiddelTop3.zet(e, maat: CGSize(width: 329, height: 155), marge: WidgetRuimte.s4)
            XCTAssertEqual(gezet.first?.tekst, kop)
            for g in gezet { XCTAssertEqual(WidgetZet.regels(g.tekst, m, breedte: breedte), g.regels, g.tekst) }
            let totaal = gezet.reduce(0) { $0 + CGFloat($1.regels) * m.regel } + MiddelTop3.tussen * CGFloat(gezet.count - 1)
            XCTAssertLessThanOrEqual(totaal, hoogte)
        }
    }

    // Besluit Alex: Top 3 in Middel is twee volle koppen; 03 valt weg als er geen ruimte is.
    func testTop3TweeVolleKoppen() {
        let nu = WidgetDagdeel.op(Self.moment("2026-11-11T17:41:00Z"))
        let koppen = ["Honderden scholen in Europa doelwit van bommeldingen",
                      "Kabinet presenteert plan voor nieuwe woningen in de randstad",
                      "Storm trekt vanavond over het hele land met code oranje voor de kust"]
        let stenen = koppen.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NOS") }
        let e = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
        for maat in [CGSize(width: 364, height: 170), CGSize(width: 329, height: 155)] {
            let gezet = MiddelTop3.zet(e, maat: maat, marge: WidgetRuimte.s4).gezet
            XCTAssertGreaterThanOrEqual(gezet.count, 2, gezet.map(\.tekst).joined(separator: " | "))
            XCTAssertEqual(Array(gezet.prefix(2).map(\.tekst)), Array(koppen.prefix(2)))
            for (g, kop) in zip(gezet, koppen) { XCTAssertEqual(g.tekst, kop) }
        }
    }

    // Heeft 01 een regel extra nodig, dan krijgt hij die. Past 02 heel er niet meer bij, dan staat 01 alleen
    // (keuring 9: 02 wordt niet ingekort om erbij te passen).
    func testTop3MetEenRegelExtraVoor01() throws {
        let e = try Self.editie()
        XCTAssertNil(KortKop.kort(e.verhalen[0].kop), "01 van de fixture past niet in 60 tekens")
        for maat in [CGSize(width: 364, height: 170), CGSize(width: 329, height: 155)] {
            let gezet = MiddelTop3.zet(e, maat: maat, marge: WidgetRuimte.s4).gezet
            XCTAssertEqual(gezet.first?.tekst, e.verhalen[0].kop)
            XCTAssertGreaterThan(gezet.first?.regels ?? 0, 2)
            for (g, v) in zip(gezet, e.verhalen) { XCTAssertEqual(g.tekst, v.kop) }
        }
    }

    // Keuring 9: een kop die niet past, wordt niet korter. Hij staat heel, met de regels die hij nodig heeft; de plek
    // maakt er ruimte voor.
    func testEenKopDieNietPastStaatHeel() {
        let kop = "Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis"
        let een = WidgetZet.pas(kop, kort: nil, WidgetLetter.widgetKop, breedte: 140, max: 1)
        XCTAssertEqual(een.tekst, kop)
        XCTAssertGreaterThan(een.regels, 1)
        XCTAssertEqual(een.regels, WidgetZet.regels(kop, WidgetLetter.widgetKop, breedte: 140))
        let oud = WidgetZet.pas(kop, kort: "Iraanse dreiging is zó groot dat Amerikaanse minister…", WidgetLetter.widgetKop, breedte: 300, max: 3)
        XCTAssertEqual(oud.tekst, kop)
    }

    // Keuring 6: valt 03 in Groot weg, dan blijft de ruimte onderin rustig leeg. Alleen een volgende kop die er heel
    // in past (niet ingekort), schuift op, met zijn eigen nummer. Nooit een kop erin forceren.
    func testGrootLaatRuimteRustigTenzijEenVolgendeKopHeelPast() {
        let nu = WidgetDagdeel.op(Self.moment("2026-11-11T17:41:00Z"))
        let lang = "Kabinet valt over stikstof na een lange nacht van onderhandelen in het Catshuis, maar de premier zegt dat er geen crisis is en dat hij niet opstapt"
        XCTAssertNil(KortKop.kort(lang, max: 24), "zonder veilige korte vorm")
        func groot(_ koppen: [String]) -> [(WidgetVerhaal, WidgetZet.Gezet)] {
            let stenen = koppen.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NOS") }
            let e = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
            return GrootEditie.zet(e, maat: CGSize(width: 364, height: 382), marge: WidgetRuimte.s4).rijen
        }
        let begin = ["Honderden scholen in Europa doelwit van bommeldingen", "Storm raast over het noorden van het land", lang]
        // 04 past heel: hij schuift op, als 04.
        let met = groot(begin + ["Kabinet stelt asielwet uit"])
        XCTAssertEqual(met.map(\.0.nummer), [2, 4])
        XCTAssertEqual(met.last?.1.tekst, "Kabinet stelt asielwet uit")
        // Geen volgende kop past heel: de ruimte blijft leeg, er wordt niets ingekort of geforceerd.
        let zonder = groot(begin + [lang, lang])
        XCTAssertEqual(zonder.map(\.0.nummer), [2])
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
