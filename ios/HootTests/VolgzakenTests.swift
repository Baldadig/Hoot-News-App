import XCTest
@testable import Hoot

// Volgen 1.5 op de iPhone: de pref `volgzaken` (gelijk aan tests/follow-volgzaken.test.mjs), het gedrag van HootStore
// (alleen met de vlag, alleen met een account, hooguit drie, Ongedaan maken, sync), het veld op verhalen en de privacy van
// de vraag aan de server.
@MainActor final class VolgzakenTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_795_167_000) // 2026-11-20T09:30:00Z
    private func z(_ slug: String, _ label: String? = nil) -> StoryVolgzaak { StoryVolgzaak(slug: slug, label: label ?? slug.uppercased()) }
    private func rij(_ slug: String, status: String = "actief", at: String = "2026-11-18T00:00:00Z", gezien: String? = nil, gestoptAt: String? = nil) -> Volgzaak {
        Volgzaak(slug: slug, label: slug.uppercased(), at: at, gezien: gezien, status: status, gestoptAt: gestoptAt)
    }

    // ---- De pure regels (follow-volgzaken.js) ----

    func testVolgenHooguitDrie() {
        var list: [Volgzaak] = []
        for s in ["gta-6", "formatie", "tata-steel"] { list = Volgzaken.volg(list, z(s), now: now).list }
        XCTAssertEqual(Volgzaken.actief(list).count, Volgzaken.max)
        XCTAssertEqual(list[0].slug, "tata-steel", "nieuw bovenaan")
        XCTAssertTrue(Volgzaken.isVol(list))
        let vierde = Volgzaken.volg(list, z("starship"), now: now)
        XCTAssertFalse(vierde.ok); XCTAssertTrue(vierde.vol); XCTAssertEqual(vierde.list, list)
        let weer = Volgzaken.volg(list, z("gta-6"), now: now)
        XCTAssertTrue(weer.ok); XCTAssertFalse(weer.vol); XCTAssertEqual(weer.list, list)
        XCTAssertFalse(Volgzaken.volg([], StoryVolgzaak(slug: "X Y", label: "x"), now: now).ok, "ongeldige slug")
        XCTAssertEqual(list[0].at, "2026-11-20T09:30:00.000Z", "tijd zoals toISOString")
    }

    func testOntvolgenEnOngedaanMaken() {
        var list: [Volgzaak] = []
        for s in ["a1", "b2", "c3"] { list = Volgzaken.volg(list, z(s), now: now).list }
        let r = Volgzaken.ontvolg(list, "b2")
        XCTAssertEqual(r.list.map(\.slug), ["c3", "a1"])
        XCTAssertEqual(Volgzaken.herstel(r.list, r.weg, index: r.index), list)
        XCTAssertNil(Volgzaken.ontvolg(list, "nope").weg)
        let alWeer = Volgzaken.volg(r.list, z("b2"), now: now).list
        XCTAssertEqual(Volgzaken.herstel(alWeer, r.weg, index: r.index), alWeer, "intussen weer gevolgd: niets dubbel")
    }

    func testSlepenAlleenActief() {
        let list = [rij("a1"), rij("b2", status: "gestopt"), rij("c3")]
        XCTAssertEqual(Volgzaken.verplaats(list, van: 1, naar: 0).map(\.slug), ["c3", "a1", "b2"])
        XCTAssertEqual(Volgzaken.verplaats(list, van: 0, naar: 5), list)
    }

    func testNieuwOfNietsNieuws() {
        let zaak = rij("a1", gezien: "2026-11-19T00:00:00Z")
        XCTAssertTrue(Volgzaken.isNieuw(zaak, laatstNieuw: "2026-11-19T12:00:00Z"))
        XCTAssertFalse(Volgzaken.isNieuw(zaak, laatstNieuw: "2026-11-18T12:00:00Z"))
        XCTAssertFalse(Volgzaken.isNieuw(zaak, laatstNieuw: nil))
        XCTAssertTrue(Volgzaken.isNieuw(rij("a1"), laatstNieuw: "2026-11-18T12:00:00Z"), "nooit geopend: tegen sinds wanneer je volgt")
        XCTAssertEqual([VolgTekst.nieuwTekst(true), VolgTekst.nieuwTekst(false)], ["Nieuw", "Niets nieuws"])
        XCTAssertEqual(Volgzaken.bekeken([zaak], "a1", now: now)[0].gezien, "2026-11-20T09:30:00.000Z")
        let rows = Volgzaken.inVolgorde([rij("a1"), rij("b2")], overzicht: ["b2": VolgzaakOverzicht(laatstNieuw: "2026-11-19T00:00:00Z", status: "actief")])
        XCTAssertEqual(rows.map(\.zaak.slug), ["b2", "a1"])
        XCTAssertEqual(rows.map(\.nieuw), [true, false])
    }

    func testBijsturenWisseltOpDezelfdePlek() {
        let uit = Volgzaken.wissel([rij("a1"), rij("gta-6")], van: "gta-6", naar: z("gta-6-pc", "GTA 6 op pc"), now: now)
        XCTAssertEqual(uit.map(\.slug), ["a1", "gta-6-pc"])
        XCTAssertEqual(uit[1].label, "GTA 6 op pc")
    }

    func testOpschonen() {
        let raw = [
            Volgzaak(slug: "a1", label: "A", at: "2026-11-01T00:00:00Z"),
            Volgzaak(slug: "a1", label: "dubbel", at: ""),
            Volgzaak(slug: "Fout!", label: "x", at: ""),
            Volgzaak(slug: "b2", label: String(repeating: "B", count: 40), at: ""),
            Volgzaak(slug: "c3", label: "C", at: ""),
            Volgzaak(slug: "d4", label: "D", at: ""),
            rij("e5", status: "gestopt", gestoptAt: Volgzaken.iso(now.addingTimeInterval(-(Volgzaken.gestoptDagen + 1) * 86400))),
            rij("f6", status: "gestopt", gestoptAt: Volgzaken.iso(now.addingTimeInterval(-86400))),
        ]
        let out = Volgzaken.normaliseer(raw, now: now)
        XCTAssertEqual(out.map(\.slug), ["a1", "b2", "c3", "d4", "f6"])
        XCTAssertEqual(out.map(\.status), ["actief", "actief", "actief", "gestopt", "gestopt"])
        XCTAssertEqual(out[1].label.count, 24)
        XCTAssertEqual(out[2].at, "2026-11-20T09:30:00.000Z", "zonder tijd: nu")
    }

    func testDunneDekkingEnGratisTip() {
        let sources = [Source(id: "nos", name: "NOS", lang: "nl"), Source(id: "tweakers", name: "Tweakers", lang: "nl"), Source(id: "nrc", name: "NRC", paid: true, lang: "nl"), Source(id: "verge", name: "The Verge", lang: "en")]
        let eigen: Set<String> = ["nos"]
        XCTAssertTrue(Volgzaken.weinigInEigen(["nos": 1, "tweakers": 6], eigen: eigen))
        XCTAssertFalse(Volgzaken.weinigInEigen(["nos": 2], eigen: eigen))
        XCTAssertEqual(Volgzaken.gratisTip(["nrc": 9, "tweakers": 6, "verge": 12], sources: sources, eigen: eigen)?.id, "tweakers", "nooit betaald, nooit een taal die je niet koos")
        XCTAssertNil(Volgzaken.gratisTip(["nrc": 9, "verge": 12], sources: sources, eigen: eigen))
    }

    // Het woord "onderwerp" staat nergens in de app, en geen em-dash of tijdstip in de teksten.
    func testTekstenZonderOnderwerpEnZonderStreep() {
        for t in VolgTekst.alles {
            XCTAssertFalse(t.lowercased().contains("onderwerp"), t)
            XCTAssertFalse(t.contains("\u{2014}") || t.contains("\u{2013}"), t)
            XCTAssertNil(t.range(of: #"\d{1,2}[:.]\d{2}|\d{1,2} uur"#, options: .regularExpression), t)
        }
        XCTAssertEqual(VolgTekst.bronnen(1), "")
        XCTAssertEqual(VolgTekst.bronnen(2), "+1 bron")
        XCTAssertEqual(VolgTekst.bronnen(5), "+4 bronnen")
    }

    // ---- Het veld op verhalen en de vlag in de kern ----

    func testVeldOpVerhaalLeestNooitFout() throws {
        let goed = try JSONDecoder().decode(Story.self, from: Data(#"{"id":"s","itemIds":[],"volgzaak":{"slug":"gta-6","label":"GTA 6"}}"#.utf8))
        XCTAssertEqual(goed.volgzaak, StoryVolgzaak(slug: "gta-6", label: "GTA 6"))
        for kapot in [#"{"slug":"GTA 6","label":"x"}"#, #"{"slug":"gta-6"}"#, #""gta-6""#, #"{"slug":"gta-6","label":""}"#] {
            let s = try JSONDecoder().decode(Story.self, from: Data(#"{"id":"s","itemIds":[],"volgzaak":\#(kapot)}"#.utf8))
            XCTAssertNil(s.volgzaak, kapot)
        }
        let zonder = try JSONDecoder().decode(Story.self, from: Data(#"{"id":"s","itemIds":[]}"#.utf8))
        XCTAssertNil(zonder.volgzaak, "een server zonder de functie")
        let terug = try JSONDecoder().decode(Story.self, from: JSONEncoder().encode(goed))
        XCTAssertEqual(terug.volgzaak, goed.volgzaak, "gaat mee naar de rekenkern")
    }

    func testVlagInDeKern() throws {
        func meta(_ json: String) throws -> FeedMeta { try JSONDecoder().decode(FeedStart.self, from: Data(#"{"sources":[],"stories":[],"meta":\#(json)}"#.utf8)).meta }
        XCTAssertNil(try meta(#"{"updatedAt":"x"}"#).volgzaken, "oudere server: uit")
        XCTAssertEqual(try meta(#"{"volgzaken":true}"#).volgzaken, true)
        XCTAssertNil(try meta(#"{"volgzaken":"ja","updatedAt":"x"}"#).volgzaken, "een vreemde waarde: uit")
        XCTAssertEqual(try meta(#"{"volgzaken":"ja","updatedAt":"x"}"#).updatedAt, "x", "en de rest van de kern blijft leesbaar")
    }

    // ---- HootStore ----

    private func store() -> HootStore {
        let suite = "volgzaken-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: suite)!
        d.removePersistentDomain(forName: suite)
        return HootStore(defaults: d)
    }
    private var account: Account? // HootStore.account is weak: de toets houdt hem vast
    private func lid(_ s: HootStore) -> Account {
        let a = Account()
        a.stub(uid: "lid", transport: URLSession(configuration: .ephemeral))
        s.account = a
        account = a
        return a
    }
    override func setUp() async throws {
        VolgProtocol.reset()
        let c = URLSessionConfiguration.ephemeral
        c.protocolClasses = [VolgProtocol.self]
        VolgzaakAPI.transport = URLSession(configuration: c)
    }
    override func tearDown() async throws { VolgzaakAPI.transport = HootAPI.session; account = nil }

    func testMetDeVlagUitZieJeNiets() {
        let s = store()
        _ = lid(s)
        s.volgzaken = [rij("gta-6")]
        var story = Story(id: "s", itemIds: [])
        story.volgzaak = z("gta-6", "GTA 6")
        XCTAssertFalse(s.volgzakenAan)
        XCTAssertNil(s.volgzaakVan(story), "geen menu-regel")
        XCTAssertNil(s.volgtVan(story), "geen label")
        XCTAssertTrue(s.volgzakenZichtbaar.isEmpty)
        XCTAssertFalse(s.volgtIets, "geen sectie in Zoeken, geen voorrang")
        XCTAssertEqual(s.volg(z("tata-steel")), .mis)
        XCTAssertEqual(s.volgzaken.map(\.slug), ["gta-6"], "niets verandert")
        s.volgzakenServer = true
        XCTAssertEqual(s.volgtVan(story), StoryVolgzaak(slug: "gta-6", label: "GTA-6"), "met de vlag: het label, met je eigen naam")
    }

    // Altijd server (16 november 2026): het label in de Editie ligt vast op de server, per plek (`volgt`).
    private func plek(_ json: String) throws -> EditionEntry { try JSONDecoder().decode(EditionEntry.self, from: Data(json.utf8)) }

    func testLabelInDeEditieKomtUitDePlekEnVolgtJeLijst() throws {
        let s = store()
        _ = lid(s)
        s.volgzakenServer = true
        s.volgzaken = [rij("gta-6")]
        let p = try plek(#"{"kind":"story","id":"s","leadId":"i","desk":"games","volgt":{"slug":"gta-6","naam":"GTA 6"}}"#)
        XCTAssertEqual(s.volgtOpPlek(p, story: nil), StoryVolgzaak(slug: "gta-6", label: "GTA-6"), "met je eigen naam")
        // Nieuw volgen binnen het dagdeel: de plek draagt het nog niet, dus geen label (pas het volgende dagdeel).
        s.volgzaken = [rij("gta-6"), rij("tata-steel")]
        let zonder = try plek(#"{"kind":"story","id":"s2","leadId":"i2","desk":"economie"}"#)
        XCTAssertNil(s.volgtOpPlek(zonder, story: nil))
        // Ontvolgen haalt het label meteen weg; opnieuw volgen brengt het terug.
        s.volgzaken = []
        XCTAssertNil(s.volgtOpPlek(p, story: nil))
        s.volgzaken = [rij("gta-6")]
        XCTAssertNotNil(s.volgtOpPlek(p, story: nil))
        // Niet onder Buiten je bubbel, en niets met de vlag uit.
        XCTAssertNil(s.volgtOpPlek(try plek(#"{"kind":"story","id":"s","desk":"bubbel","volgt":{"slug":"gta-6","naam":"GTA 6"}}"#), story: nil))
        s.volgzakenServer = false
        XCTAssertNil(s.volgtOpPlek(p, story: nil))
    }

    // Oude en onverwachte vormen van `volgt` kosten de plek niets: ze zijn gewoon geen label.
    func testVolgtOpEenPlekLeestNooitFout() throws {
        for json in [#""gta-6""#, "null", "7", "{}", #"{"slug":3}"#, #"{"slug":"gta-6"}"#, "[]"] {
            let p = try plek(#"{"kind":"story","id":"s","leadId":"i","desk":"games","volgt":"# + json + "}")
            XCTAssertEqual(p.id, "s", json)
        }
        XCTAssertNil(try plek(#"{"kind":"story","id":"s","volgt":"gta-6"}"#).volgt?.slug)
        XCTAssertNil(Volgzaken.volgtVanPlek(try plek(#"{"kind":"story","id":"s","volgt":[]}"#), [rij("gta-6")]))
        // Een Editie met het veld decodeert zoals eerder: de lijst van plekken blijft heel.
        let e = try JSONDecoder().decode(Edition.self, from: Data(#"{"id":"2026-11-16-ochtend","entries":[{"kind":"story","id":"a","volgt":{"slug":"gta-6","naam":"GTA 6"}},{"kind":"story","id":"b","volgt":5}]}"#.utf8))
        XCTAssertEqual(e.entries.map(\.id), ["a", "b"])
    }

    func testZonderAccountDeVraagOmInTeLoggen() {
        let s = store()
        s.volgzakenServer = true
        XCTAssertEqual(s.volg(z("gta-6", "GTA 6")), .login)
        XCTAssertEqual(s.volgInloggen, z("gta-6", "GTA 6"), "het blad gaat open, en daarna volg je het alsnog")
        XCTAssertTrue(s.volgzaken.isEmpty)
    }

    func testVolgenVolOntvolgenEnOngedaanMaken() async throws {
        let s = store()
        _ = lid(s)
        s.volgzakenServer = true
        XCTAssertEqual(s.volg(z("gta-6", "GTA 6")), .ok)
        XCTAssertEqual(s.volgMelding, .gevolgd("GTA 6"))
        XCTAssertEqual(s.volgMelding?.tekst, "Je volgt GTA 6.")
        s.volg(z("formatie"))
        s.volg(z("tata-steel"))
        XCTAssertEqual(s.volg(z("starship")), .vol)
        XCTAssertTrue(s.volgBeheer, "bij drie het beheerblad")
        XCTAssertEqual(s.volgMelding?.tekst, "Je volgt er al drie.")
        s.ontvolg("formatie")
        XCTAssertEqual(s.volgzaken.map(\.slug), ["tata-steel", "gta-6"])
        XCTAssertEqual(s.volgMelding?.tekst, "Je volgt FORMATIE niet meer.")
        s.ongedaanVolg()
        XCTAssertEqual(s.volgzaken.map(\.slug), ["tata-steel", "formatie", "gta-6"], "terug op haar plek")
        XCTAssertNil(s.volgMelding)
        // De anonieme tellers: volgen (3x), ontvolgen en weer volgen; nooit een slug in het adres.
        try await VolgProtocol.wacht(op: 5)
        let vragen = VolgProtocol.vragen
        XCTAssertEqual(vragen.compactMap { $0.body["actie"] as? String }.sorted(), ["ontvolgen", "volgen", "volgen", "volgen", "volgen"])
        for v in vragen {
            XCTAssertEqual(v.url.path, "/api/volgzaak")
            XCTAssertNil(v.url.query)
            XCTAssertEqual(v.method, "POST")
            XCTAssertEqual(v.auth, "Bearer test", "met je token")
            XCTAssertFalse(v.url.absoluteString.contains(v.body["slug"] as? String ?? "@@"), "de slug alleen in de body")
        }
    }

    func testPaginaGeopendEnBijsturenEnSlepen() {
        let s = store()
        _ = lid(s)
        s.volgzakenServer = true
        s.volgzaken = [rij("a1"), rij("gta-6")]
        s.volgBekeken("gta-6")
        XCTAssertNotNil(s.volgzaken[1].gezien)
        XCTAssertNil(s.volgzaken[0].gezien)
        s.volgWissel(van: "gta-6", naar: z("gta-6-pc", "GTA 6 op pc"))
        XCTAssertEqual(s.volgzaken.map(\.slug), ["a1", "gta-6-pc"])
        s.volgVerplaats(van: 1, naar: 0)
        XCTAssertEqual(s.volgzaken.map(\.slug), ["gta-6-pc", "a1"])
    }

    // Wat je volgt gaat mee met je account, in de vorm van het web; een rij die niet klopt valt weg, niet de lijst.
    func testSyncMetJeAccount() throws {
        let s = store()
        s.volgzaken = [rij("gta-6", gezien: "2026-11-19T00:00:00Z")]
        let uit = try XCTUnwrap(s.syncedPrefs["volgzaken"] as? [[String: Any]])
        XCTAssertEqual(uit.count, 1)
        XCTAssertEqual(uit[0]["slug"] as? String, "gta-6")
        XCTAssertEqual(uit[0]["gezien"] as? String, "2026-11-19T00:00:00Z")
        XCTAssertTrue(uit[0]["gestoptAt"] is NSNull)
        XCTAssertNotNil(try? JSONSerialization.data(withJSONObject: s.syncedPrefs), "geldige JSON")
        XCTAssertNil(s.syncedPrefs["volgzakenOmgezet"], "de omzetting kent alleen het web: die vlag laat de app staan")

        let remote: [String: Any] = ["volgzaken": [["slug": "kabinetsformatie", "label": "Kabinetsformatie", "at": "2026-11-18T00:00:00Z", "status": "actief"], ["slug": "Kapot!", "label": "x"], ["label": "zonder slug"], "onzin"]]
        s.applyRemote(prefs: try JSONSerialization.data(withJSONObject: remote), read: [], saved: nil)
        XCTAssertEqual(s.volgzaken.map(\.slug), ["kabinetsformatie"])
        // Een profiel zonder het veld (een oudere app of het web van voor 1.5) laat je lijst staan.
        s.applyRemote(prefs: try JSONSerialization.data(withJSONObject: ["images": "aan"]), read: [], saved: nil)
        XCTAssertEqual(s.volgzaken.map(\.slug), ["kabinetsformatie"])
        // Bewaard op het toestel: een nieuwe start leest hetzelfde terug.
        XCTAssertEqual(HootStore(defaults: s.defaults).volgzaken.map(\.slug), ["kabinetsformatie"])
        // Uitloggen: weg van het toestel.
        s.forgetChoices()
        XCTAssertTrue(s.volgzaken.isEmpty)
    }

    // De voorrang in de Stroom: de invoer voor de rekenkern komt uit de feed en je lijst, en de lijst verhuist het stuk.
    func testVoorrangInDeStroom() throws {
        let s = store()
        s.volgzakenServer = true
        s.volgzaken = [rij("gta-6")]
        let iso = { (h: Double) in Volgzaken.iso(Date.now.addingTimeInterval(-h * 3600)) }
        var a = Item(id: "a", source: "nos", title: "A", url: "https://nos.nl/a"); a.publishedAt = iso(0.5)
        var b = Item(id: "b", source: "nos", title: "B", url: "https://nos.nl/b"); b.publishedAt = iso(2); b.storyId = "sGta"
        var c = Item(id: "c", source: "nos", title: "C", url: "https://nos.nl/c"); c.publishedAt = iso(3)
        let invoer = s.voorrangInvoer([a, b, c], weergave: "alles", grens: 3)
        let obj = try XCTUnwrap(JSONSerialization.jsonObject(with: invoer) as? [String: Any])
        XCTAssertEqual((obj["lijst"] as? [[String: Any]])?.count, 3)
        XCTAssertEqual(obj["weergave"] as? String, "alles")
        XCTAssertEqual(obj["grens"] as? Int, 3)
        // Zonder veld op het verhaal: geen label en geen voorrang.
        XCTAssertEqual(try EditionEngine.volg.voorrangNu(invoer), .leeg)
        XCTAssertEqual(VolgStroom.metVoorrang([a, b, c], ["b"]).map(\.id), ["b", "a", "c"])
        XCTAssertEqual(VolgStroom.metVoorrang([a, b, c], []).map(\.id), ["a", "b", "c"], "zonder voorrang precies de oude lijst")
    }

    // ---- Nazorg Volgen-blok (16 november) ----

    // Het label zonder rubriek in de Stroom: dezelfde gevallen als het web (tests/fixtures/volg-rubriek-cases.json).
    func testRubriekVoorHetLabelGelijkAanHetWeb() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appending(path: "tests/fixtures/volg-rubriek-cases.json")
        let doc = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let cases = try XCTUnwrap(doc["cases"] as? [[String: Any]])
        XCTAssertGreaterThanOrEqual(cases.count, 10)
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let i = try XCTUnwrap(c["input"] as? [String: Any], name)
            let it = i["item"] as? [String: Any] ?? [:]
            var item = Item(id: "a", source: "nos", title: "A", url: "https://nos.nl/a")
            item.section = it["section"] as? String
            item.topics = it["topics"] as? [String]
            XCTAssertEqual(StreamView.rubriekLabel(item, cat: i["cat"] as? String, lijn: i["lijn"] as? String ?? ""), c["expect"] as? String, name)
        }
    }

    // Koude start: de voorrang wordt alsnog vastgezet zolang je nog niets zag, en nooit daarna of dubbel.
    func testVoorrangAlsnogVastNaKoudeStart() {
        let stroom = VolgStroom()
        var n = 0
        let invoer = { () -> Data in n += 1; return Data("{}".utf8) }
        XCTAssertFalse(stroom.zetAlsnogVast("alles|", grensVast: false, gescrold: false, sleutel: "k", invoer: invoer), "zonder vaste grens niets vastzetten")
        XCTAssertFalse(stroom.zetAlsnogVast("alles|", grensVast: true, gescrold: true, sleutel: "k", invoer: invoer), "na zelf scrollen springt er niets meer")
        XCTAssertNil(stroom.vastgezet("alles|"))
        XCTAssertTrue(stroom.zetAlsnogVast("alles|", grensVast: true, gescrold: false, sleutel: "k", invoer: invoer))
        XCTAssertNotNil(stroom.vastgezet("alles|"))
        XCTAssertFalse(stroom.zetAlsnogVast("alles|", grensVast: true, gescrold: false, sleutel: "k", invoer: invoer), "één keer per bezoek")
        stroom.vergeet()
        XCTAssertNil(stroom.vastgezet("alles|"), "een nieuw bezoek rekent opnieuw")
    }
}

// Vangt de vragen aan /api/volgzaak op (geen netwerk) en antwoordt { ok: true }.
final class VolgProtocol: URLProtocol, @unchecked Sendable {
    struct Vraag: @unchecked Sendable { let url: URL; let method: String; let auth: String?; let body: [String: Any] }
    nonisolated(unsafe) private static var lijst: [Vraag] = []
    private static let lock = NSLock()
    static var vragen: [Vraag] { lock.withLock { lijst } }
    static func reset() { lock.withLock { lijst = [] } }
    static func wacht(op n: Int) async throws {
        for _ in 0 ..< 100 where vragen.count < n { try await Task.sleep(for: .milliseconds(20)) }
    }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        var data = request.httpBody ?? Data()
        if data.isEmpty, let stream = request.httpBodyStream {
            stream.open()
            var buf = [UInt8](repeating: 0, count: 4096)
            while stream.hasBytesAvailable { let n = stream.read(&buf, maxLength: buf.count); if n <= 0 { break }; data.append(buf, count: n) }
            stream.close()
        }
        let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        let v = Vraag(url: request.url!, method: request.httpMethod ?? "", auth: request.value(forHTTPHeaderField: "Authorization"), body: body)
        Self.lock.withLock { Self.lijst.append(v) }
        let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(#"{"ok":true}"#.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
