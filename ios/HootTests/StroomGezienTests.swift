import XCTest
@testable import Hoot

// De melding van Alex (14 november): "Als je eenmaal de Stroom hebt geladen en dan wisselt van bron of onderwerp,
// heeft hij bepaald dat je alles al gelezen hebt." Gezien is nu echt gezien: alleen door zelf te scrollen. Gelijk
// aan tests/stroom-einde.test.mjs.
@MainActor final class StroomGezienTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 2_000_000_000)

    private func item(_ min: Int, wetenschap: Bool = false) -> Item {
        var it = Item(id: "i\(min)", source: wetenschap ? "quest" : "nos", title: "t\(min)", url: "https://nos.nl/\(min)")
        it.publishedAt = ISO8601DateFormatter().string(from: now.addingTimeInterval(TimeInterval(-min * 60)))
        return it
    }

    private var stroom: [Item] { [item(1), item(5, wetenschap: true), item(10), item(20, wetenschap: true), item(30), item(60, wetenschap: true)] }

    private func plek(zichtbaar: Bool = true, kop: Bool = true, voet: Bool = true, boven: Bool = false) -> StroomPlek {
        var p = StroomPlek()
        p.zichtbaar = zichtbaar; p.kop = kop; p.voet = voet; p.boven = boven
        return p
    }

    // Het scenario uit de melding: laden, wisselen van rubriek en van bron. Niets is gezien, overal staat alles.
    func testLadenEnWisselenMarkeertNiets() {
        let volger = StroomVolger()
        let alles = stroom, wetenschap = stroom.filter { $0.source == "quest" }, nos = stroom.filter { $0.source == "nos" }
        // Rijen komen helemaal in beeld en staan lang stil, maar je scrolt niet.
        for i in alles.prefix(4) { XCTAssertFalse(volger.meld(i.id, plek(), now: now)) }
        XCTAssertEqual(volger.tik(now: now.addingTimeInterval(10)), [], "lang in beeld zonder scrollen telt niet")
        XCTAssertFalse(volger.meld("i1", plek(zichtbaar: false, kop: false, voet: false, boven: true)), "boven de rand door een herstelde plek telt niet")
        let g1 = volger.grens(StreamView.weergave("", []), items: alles, gezien: [:])!
        XCTAssertEqual(StroomEinde.index(alles, grens: g1), alles.count)
        volger.nieuweWeergave()
        let g2 = volger.grens(StreamView.weergave("wetenschap", []), items: wetenschap, gezien: [:])!
        XCTAssertEqual(StroomEinde.index(wetenschap, grens: g2), wetenschap.count, "Wetenschap: niet meteen \"Je bent bij.\"")
        volger.nieuweWeergave()
        let g3 = volger.grens(StreamView.weergave("", ["nos"]), items: nos, gezien: [:])!
        XCTAssertEqual(StroomEinde.index(nos, grens: g3), nos.count)
    }

    // Zelf scrollen: wat in beeld was en voorbij gaat, waar je helemaal doorheen bent, of wat even helemaal in
    // beeld staat, is gezien.
    func testScrollenVoorbijMarkeertWel() {
        let volger = StroomVolger()
        _ = volger.meld("a", plek(), now: now) // helemaal in beeld bij het laden
        _ = volger.meld("b", plek(kop: true, voet: false), now: now) // alleen de bovenkant
        XCTAssertEqual(volger.scrolt(now: now.addingTimeInterval(0.2)), ["a"], "a stond helemaal in beeld toen je ging scrollen")
        XCTAssertTrue(volger.meld("b", plek(zichtbaar: false, kop: false, voet: false, boven: true)), "b was in beeld tijdens het scrollen en ging voorbij")
        XCTAssertFalse(volger.meld("b", plek(zichtbaar: false, kop: false, voet: false, boven: true)), "één keer")
        // Hoger dan het scherm: eerst de bovenkant, later de onderkant.
        XCTAssertFalse(volger.meld("t", plek(kop: true, voet: false)))
        XCTAssertTrue(volger.meld("t", plek(kop: false, voet: true)))
        XCTAssertFalse(volger.meld("x", plek(zichtbaar: false, kop: false, voet: false, boven: true)), "nooit in beeld geweest")
        // Een andere rubriek: daar moet je eerst weer zelf scrollen.
        volger.nieuweWeergave()
        XCTAssertFalse(volger.meld("d", plek(), now: now))
        XCTAssertEqual(volger.tik(now: now.addingTimeInterval(5)), [])
        XCTAssertEqual(volger.scrolt(now: now.addingTimeInterval(5)), ["d"])
    }

    // De plek van een rij uit zijn maat en het zichtbare deel.
    func testStroomPlek() {
        let p = StroomPlek(rijHoogte: 100, beeld: CGRect(x: 0, y: -50, width: 300, height: 800))
        XCTAssertTrue(p.helemaal)
        let half = StroomPlek(rijHoogte: 100, beeld: CGRect(x: 0, y: 40, width: 300, height: 800))
        XCTAssertTrue(half.zichtbaar); XCTAssertFalse(half.kop); XCTAssertTrue(half.voet)
        let weg = StroomPlek(rijHoogte: 100, beeld: CGRect(x: 0, y: 120, width: 300, height: 800))
        XCTAssertTrue(weg.boven); XCTAssertFalse(weg.zichtbaar)
        XCTAssertFalse(StroomPlek(rijHoogte: 100, beeld: nil).zichtbaar)
    }

    // "Je bent bij." alleen als je in die weergave echt alles zag; Alles houdt wat je niet zag.
    func testJeBentBijAlleenNaAllesGezien() {
        let wetenschap = stroom.filter { $0.source == "quest" }
        let gezien = Dictionary(uniqueKeysWithValues: wetenschap.map { ($0.id, $0.date!) })
        XCTAssertEqual(StroomEinde.index(wetenschap, grens: StroomEinde.grens(wetenschap, gezien: gezien)), 0, "Wetenschap: alles gezien")
        XCTAssertEqual(StroomEinde.index(stroom, grens: StroomEinde.grens(stroom, gezien: gezien)), 5, "Alles: tot het laatste ongeziene bericht")
    }

    // r5-stroom-einde: zonder eerder bezoek houdt de Stroom op na de laatste 24 uur. Een ongezien bericht van 30 uur
    // oud maakt de lijst niet langer. Gelijk aan tests/stroom-einde.test.mjs.
    func testAlleenDeLaatsteDagMaaktDeLijstLanger() {
        XCTAssertEqual(StroomEinde.dag, 24 * 60 * 60)
        let lang = [item(1), item(60), item(23 * 60), item(25 * 60), item(30 * 60), item(35 * 60)]
        XCTAssertEqual(StroomEinde.eindIndex(lang, gezien: [:], now: now), 3, "na 23 uur, niet na 35 uur")
        let volger = StroomVolger()
        let g = volger.grens(StreamView.weergave("", []), items: lang, gezien: [:], now: now)!
        XCTAssertEqual(StroomEinde.index(lang, grens: g), 3)
        let dertig = [item(1), item(30 * 60)]
        XCTAssertEqual(StroomEinde.eindIndex(dertig, gezien: [:], now: now), 1, "het bericht van 30 uur maakt de lijst niet langer")
        XCTAssertEqual(StroomEinde.grens(dertig, gezien: [:], now: now).id, "i1")
        let dag = Dictionary(uniqueKeysWithValues: lang.prefix(3).map { ($0.id, $0.date!) })
        XCTAssertEqual(StroomEinde.eindIndex(lang, gezien: dag, now: now), 0, "de laatste dag gezien: meteen \"Je bent bij.\"")
        XCTAssertEqual(StroomEinde.eindIndex([item(30 * 60)], gezien: [:], now: now), 0)
    }

    // De grens staat vast per weergave: niets beweegt terwijl je leest. Een nieuw bezoek bepaalt hem opnieuw.
    func testGrensStaatVast() {
        let volger = StroomVolger()
        let key = StreamView.weergave("", [])
        let g = volger.grens(key, items: stroom, gezien: [:])
        XCTAssertNil(volger.grens("leeg", items: [], gezien: [:]), "zonder berichten nog geen grens")
        let alles = Dictionary(uniqueKeysWithValues: stroom.map { ($0.id, $0.date!) })
        XCTAssertEqual(volger.grens(key, items: stroom, gezien: alles), g, "je las alles, maar de lijst blijft staan")
        volger.vergeet()
        XCTAssertEqual(volger.grens(key, items: stroom, gezien: alles), StroomEinde.Grens(id: nil, at: nil))
    }

    // Terugkerende lezer: wat je echt zag blijft gezien; de oude "tot hier"-tijd telt niet meer.
    func testTerugkerendeLezer() {
        let suite = "StroomGezienTests-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: suite)!
        defer { d.removePersistentDomain(forName: suite) }
        d.set(try? JSONEncoder().encode(Date.now), forKey: "hoot.streamSeen")
        let fresh = Item(id: "vers", source: "nos", title: "t", url: "https://nos.nl/vers", publishedAt: ISO8601DateFormatter().string(from: .now))
        let store = HootStore(defaults: d)
        XCTAssertNil(d.object(forKey: "hoot.streamSeen"), "de oude grens is weg")
        XCTAssertTrue(store.streamGezien.isEmpty)
        store.markStreamSeen([fresh])
        XCTAssertNotNil(HootStore(defaults: d).streamGezien["vers"], "na opnieuw openen nog gezien")
        let oud = [ "oud": Date.now.addingTimeInterval(-StroomEinde.venster - 60) ]
        XCTAssertTrue(StroomEinde.vers(oud).isEmpty, "ouder dan de 36 uur van de Stroom: opgeruimd")
    }
}
