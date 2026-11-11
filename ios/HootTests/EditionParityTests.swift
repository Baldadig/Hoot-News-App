import JavaScriptCore
import XCTest
@testable import Hoot

// Pariteit web en iOS (bouwspec §9): de rekenkern in de app (EditionEngine, Resources/edition-core.js)
// maakt uit de vaste invoer van vier lezers byte voor byte dezelfde Editie als node
// (tests/editionGolden.test.mjs, uit tests/fixtures/edition-golden.json). Plus de rekentijd: op de
// simulator zonder JIT, als maat voor een iPhone (doel ≤ 1,5 s, indicatief).
final class EditionParityTests: XCTestCase {
    // Redacteur · filters-ai: de harde media-aanwijzingen gaan heel mee naar de rekenkern (shared/editie-filter.mjs).
    func testMediaMetadataSurvivesItemRoundTrip() throws {
        let raw = #"{"id":"media-proef","source":"nos","title":"Energie uitgelegd","url":"https://example.test/energie","mediaType":"audio/mpeg","podcastEpisode":"3","feedMark":"podcast"}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(raw.utf8))
        XCTAssertEqual(item.mediaType, "audio/mpeg")
        XCTAssertEqual(item.podcastEpisode, "3")
        XCTAssertEqual(item.feedMark, "podcast")
        let again = try JSONDecoder().decode(Item.self, from: JSONEncoder().encode(item))
        XCTAssertEqual(again.mediaType, item.mediaType)
        XCTAssertEqual(again.podcastEpisode, item.podcastEpisode)
        XCTAssertEqual(again.feedMark, item.feedMark)
    }

    struct Golden {
        let name: String
        let input: String // JSON zoals JavaScript hem schrijft
        let output: String // idem; dit moet de rekenkern letterlijk teruggeven
        let basis: String
        let followed: [String], interests: [String], topics: [String], favorites: [String]
    }

    // ios/HootTests/EditionParityTests.swift → <repo>/tests/fixtures/edition-golden.json. De tests draaien
    // op de simulator, die de Mac-schijf ziet; op een toestel is deze test niet bedoeld.
    static let fixtureURL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appending(path: "tests/fixtures/edition-golden.json")

    // De fixture gesplitst met JSON.stringify van JavaScriptCore zelf: zo komt de verwachte tekst uit
    // dezelfde serialisatie als de uitkomst, en vergelijken we echt byte voor byte.
    nonisolated(unsafe) static var cached: [Golden]?
    static func golden() throws -> [Golden] {
        if let cached { return cached }
        let text = try String(contentsOf: fixtureURL, encoding: .utf8)
        guard let ctx = JSContext() else { throw XCTSkip("geen JSContext") }
        ctx.setObject(text, forKeyedSubscript: "__golden" as NSString)
        ctx.evaluateScript("var G = JSON.parse(__golden);")
        let count = Int(ctx.evaluateScript("G.length").toInt32())
        var out: [Golden] = []
        for i in 0 ..< count {
            let strings = { (k: String) in ctx.evaluateScript("JSON.stringify(G[\(i)].\(k))").toString()! }
            let list = { (k: String) in (ctx.evaluateScript("G[\(i)].input.\(k)").toArray() as? [String]) ?? [] }
            out.append(Golden(name: ctx.evaluateScript("G[\(i)].name").toString(), input: strings("input"), output: strings("output"), basis: ctx.evaluateScript("G[\(i)].output.basis").toString(), followed: list("followed"), interests: list("interests"), topics: list("topics"), favorites: list("favorites")))
        }
        cached = out
        return out
    }

    func testPublisherEvidenceSurvivesStoryCacheRoundTrip() throws {
        let data = Data(#"{"id":"s","itemIds":["a"],"sourceCount":5,"publisherCount":5,"publisherCountries":["NL","GB"],"desk":"buitenland"}"#.utf8)
        let story = try JSONDecoder().decode(Story.self, from: data)
        let restored = try JSONDecoder().decode(Story.self, from: JSONEncoder().encode(story))
        XCTAssertEqual(restored.publisherCount, 5)
        XCTAssertEqual(restored.publisherCountries, ["NL", "GB"])
        XCTAssertEqual(restored.desk, "buitenland")
        let legacy = try JSONDecoder().decode(Story.self, from: Data(#"{"id":"old","itemIds":[]}"#.utf8))
        XCTAssertNil(legacy.publisherCount)
        XCTAssertNil(legacy.publisherCountries)
    }

    @MainActor
    func testPersonalEditionMustBeReadyBeforeShowingItsNews() throws {
        let candidate = try JSONDecoder().decode(Edition.self, from: Data(#"{"id":"e","owner":"anon","entries":[],"items":[]}"#.utf8))
        XCTAssertNil(HootStore.visiblePersonal(nil, id: "e", owner: "anon"))
        XCTAssertNil(HootStore.visiblePersonal(candidate, id: "other-slot", owner: "anon"))
        XCTAssertNil(HootStore.visiblePersonal(candidate, id: "e", owner: "other-reader"))
        XCTAssertEqual(HootStore.visiblePersonal(candidate, id: "e", owner: "anon")?.id, "e")
    }

    func testCandidatePoolsSurviveFallbackSerialization() throws {
        let data = Data(#"{"id":"e","entries":[],"wide":[{"storyId":"s","sourceCount":8,"publisherCount":8,"publisherCountries":["NL","GB"],"topics":["tech"],"item":{"id":"a","source":"nos","title":"Een verhaal","url":"https://nos.nl/a"}}],"near":[{"storyId":"n","sourceCount":3,"item":{"id":"b","source":"bbc","title":"Nog een verhaal","url":"https://bbc.com/a"}}]}"#.utf8)
        let first = try JSONDecoder().decode(Edition.self,from:data)
        let again = try JSONDecoder().decode(Edition.self,from:JSONEncoder().encode(first))
        XCTAssertEqual(first,again)
        XCTAssertEqual(again.near?.first?.item.id,"b")
        XCTAssertEqual(again.wide?.first?.publisherCountries,["NL","GB"])
    }

    func testFixtureHasFourReaders() throws {
        let g = try Self.golden()
        XCTAssertEqual(g.map(\.name), ["nieuw", "klimaat", "vs", "vs-zonder-topics"])
        XCTAssertTrue(g.allSatisfy { $0.output.contains("\"why\":") }, "elke Editie draagt het waarom per plek")
    }

    // G1-achtig: dezelfde invoer, dezelfde bytes als node.
    func testComposeMatchesGoldenByteForByte() async throws {
        for g in try Self.golden() {
            let out = try await EditionEngine.shared.compose(inputJSON: g.input)
            XCTAssertEqual(out, g.output, "\(g.name): de app rekent anders dan de website")
            if out != g.output {
                // Wijs de eerste afwijkende plek aan; de hele tekst is te lang voor de uitslag.
                let a = Array(out.utf8), b = Array(g.output.utf8)
                let i = zip(a, b).enumerated().first { $0.element.0 != $0.element.1 }?.offset ?? min(a.count, b.count)
                let from = max(0, i - 120)
                XCTFail("\(g.name): verschil bij byte \(i) van \(a.count)/\(b.count)\napp: …\(String(decoding: a[from ..< min(a.count, i + 120)], as: UTF8.self))…\nweb: …\(String(decoding: b[from ..< min(b.count, i + 120)], as: UTF8.self))…")
            }
        }
    }

    // P0 (9 november), het vangnet in de rekenkern: dezelfde invoer, maar de eigen berichten zijn twee dagen ouder
    // dan de stukken van je bronnen in de algemene Editie (de cache van een vorig bezoek). Dan geeft de app, net als
    // het web, geen Editie (de app valt terug op de server), en met verse berichten wel.
    func testStaleItemsGiveNoEdition() async throws {
        guard let ctx = JSContext(), let g = try Self.golden().first else { throw XCTSkip("geen JSContext") }
        ctx.setObject(g.input, forKeyedSubscript: "__in" as NSString)
        let stale = ctx.evaluateScript("""
            (function () {
              var input = JSON.parse(__in);
              var f = new Set(input.followed);
              input.items = input.items.map(function (i) {
                if (!f.has(i.source) || !i.publishedAt) return i;
                return Object.assign({}, i, { publishedAt: new Date(Date.parse(i.publishedAt) - 2 * 864e5).toISOString() });
              });
              return JSON.stringify(input);
            })()
            """).toString()!
        let out = try await EditionEngine.shared.compose(inputJSON: stale)
        XCTAssertEqual(out, "null", "met berichten van een vorig bezoek geen Editie")
        let fresh = try await EditionEngine.shared.compose(inputJSON: g.input)
        XCTAssertNotEqual(fresh, "null")
    }

    // De uitkomst laat zich lezen als Edition, met alles wat P8-4 vraagt.
    func testOutputDecodesAsEdition() async throws {
        for g in try Self.golden() {
            let out = try await EditionEngine.shared.compose(inputJSON: g.input)
            let e = try JSONDecoder().decode(Edition.self, from: Data(out.utf8))
            XCTAssertEqual(e.entries.filter{$0.desk != "bubbel"}.count, 10, g.name)
            XCTAssertEqual(e.basis, g.basis, g.name)
            XCTAssertEqual(e.owner, "anon", g.name)
            XCTAssertEqual(e.personal, true, g.name)
            XCTAssertNotNil(e.version, g.name)
            XCTAssertTrue(e.entries.allSatisfy { $0.why?.text != nil && $0.itemIds != nil }, "\(g.name): why en itemIds op elke plek")
        }
    }

    // G5: de afdruk uit de bundel is die van editionBasis op het web, ook met lege topics en favorites.
    func testBasisMatchesWeb() async throws {
        for g in try Self.golden() {
            let basis = try await EditionEngine.shared.basis(followed: g.followed, interests: g.interests, topics: g.topics, favorites: g.favorites)
            XCTAssertEqual(basis, g.basis, g.name)
            let shuffled = try await EditionEngine.shared.basis(followed: g.followed.reversed(), interests: g.interests, topics: g.topics, favorites: g.favorites)
            XCTAssertEqual(shuffled, g.basis, "\(g.name): volgorde van bronnen doet er niet toe")
        }
        let nieuw = try Self.golden()[0]
        XCTAssertEqual(nieuw.topics, [])
        XCTAssertEqual(nieuw.favorites, [])
    }

    // H5: de geschiedenis uit de bundel heeft de vorm van user_state.edition.history — precies de
    // sleutels die historyOf in netlify/lib/stories.mjs schrijft, in die volgorde.
    func testHistoryShape() async throws {
        let g = try Self.golden()[1]
        let out = try await EditionEngine.shared.compose(inputJSON: g.input)
        let row = try await EditionEngine.shared.history(of: out)
        let h = try JSONDecoder().decode(EditionHistory.self, from: Data(row.utf8))
        XCTAssertFalse(h.storyIds.isEmpty)
        XCTAssertGreaterThanOrEqual(h.itemIds.count, 10)
        XCTAssertEqual(h.titles?.isEmpty, false)
        XCTAssertNotNil(h.leadStoryId, "het hoofdverhaal gaat mee (wasLead)")
        XCTAssertEqual(h.shown?.isEmpty, false, "de getoonde berichten gaan mee (sameSubject)")
        // De sleutels in de volgorde van het web (JSON.stringify houdt de volgorde van historyOf).
        let keys = Self.keyOrder(of: row)
        XCTAssertEqual(keys, ["id", "builtAt", "storyIds", "itemIds", "leadIds", "leadStoryId", "titles", "shown", "keys"])
        // nextHistory schrijft de Edities ervóór, nooit deze zelf (de vorm van het web): zonder iets ervóór
        // is de geschiedenis leeg, en een regel ervóór komt byte voor byte terug.
        let next = try await EditionEngine.shared.nextHistory(prior: "[]", edition: out)
        XCTAssertEqual(next, "[]")
        let eerder = try await EditionEngine.shared.nextHistory(prior: "[\(row)]", edition: "{\"id\":\"ander-dagdeel\",\"entries\":[]}")
        let rows = try JSONDecoder().decode([EditionHistory].self, from: Data(eerder.utf8))
        XCTAssertEqual(rows.map(\.id), [h.id])
        XCTAssertEqual(eerder, "[\(row)]", "een regel die al een samenvatting is, komt ongewijzigd terug")
    }

    // De sleutels van het buitenste JSON-object (of van element `index` van een lijst), in de volgorde
    // waarin de tekst ze geeft — dus van de tekst van de rekenkern zelf, niet na een Swift-woordenboek.
    static func keyOrder(of json: String, index: Int? = nil) -> [String] {
        guard let ctx = JSContext() else { return [] }
        ctx.setObject(json, forKeyedSubscript: "__row" as NSString)
        return (ctx.evaluateScript("Object.keys(JSON.parse(__row)\(index.map { "[\($0)]" } ?? ""))").toArray() as? [String]) ?? []
    }

    // ---- De geschiedenis (H3/H5), zoals loadPersonal en adopt haar bouwen ----
    // JSON heen en terug, de ids van een lijst, en de drie dagdelen van lezer u1.
    static func json(_ o: Any?) -> String { o.map { String(decoding: try! JSONSerialization.data(withJSONObject: $0), as: UTF8.self) } ?? "null" }
    static func rows(_ s: String) -> [[String: Any]] { (try? JSONSerialization.jsonObject(with: Data(s.utf8))) as? [[String: Any]] ?? [] }
    static func ids(_ s: String) -> [String] { rows(s).compactMap { $0["id"] as? String } }
    static func object(_ s: String) -> NSDictionary? { ((try? JSONSerialization.jsonObject(with: Data(s.utf8))) as? [String: Any]).map { NSDictionary(dictionary: $0) } }
    static let O = ("d1-ochtend", "2026-10-31T05:00:00.000Z"), M = ("d1-middag", "2026-10-31T11:00:00.000Z"), A = ("d1-avond", "2026-10-31T16:00:00.000Z"), N = ("d2-ochtend", "2026-11-01T05:00:00.000Z")
    static func ms(_ s: String) -> Double { HootDate.parse(s)!.timeIntervalSince1970 * 1000 }

    // De Editie van de tweede lezer uit de fixture, als basis voor alle dagdelen.
    static func base() async throws -> [String: Any] {
        let out = try await EditionEngine.shared.compose(inputJSON: try golden()[1].input)
        return try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(out.utf8)) as? [String: Any])
    }
    // Dezelfde Editie op een ander dagdeel, van lezer `owner`.
    static func dagdeel(_ base: [String: Any], _ slot: (String, String), owner: String = "u1") -> [String: Any] {
        var e = base
        e["id"] = slot.0
        e["builtAt"] = slot.1
        e["owner"] = owner
        return e
    }
    // Vastgelegd zoals loadPersonal → keep en het web het doen: de `history` is nextHistory over
    // earlier(local, account) — de Edities ervóór, samengevat, nooit zijzelf.
    static func vastgelegd(_ e: [String: Any], local: [String: Any]? = nil, account: [String: Any]? = nil) async throws -> [String: Any] {
        var out = e
        let prior = try await EditionEngine.shared.earlier(local: json(local), account: json(account), id: e["id"] as! String, owner: e["owner"] as! String)
        out["history"] = rows(try await EditionEngine.shared.nextHistory(prior: prior, edition: json(e)))
        return out
    }

    // H3/H5: drie dagdelen achter elkaar op het toestel: de geschiedenis heeft de vorm van het web (de
    // Edities ervóór, nooit zichzelf), wordt drie diep, en het `previous` van de Avond kent de Ochtend
    // nog (atOf op haar builtAt).
    func testHistoryThreeSlotsDeep() async throws {
        let base = try await Self.base()
        let ochtend = try await Self.vastgelegd(Self.dagdeel(base, Self.O))
        XCTAssertEqual((ochtend["history"] as? [[String: Any]])?.count, 0, "de eerste Editie: niets ervóór")
        // Middag: de Ochtend voluit (haar history is leeg).
        var prior = try await EditionEngine.shared.earlier(local: Self.json(ochtend), account: "null", id: Self.M.0, owner: "u1")
        XCTAssertEqual(Self.ids(prior), ["d1-ochtend"])
        XCTAssertNotNil(Self.rows(prior).first?["entries"], "de volle Editie, niet haar regel")
        let middag = try await Self.vastgelegd(Self.dagdeel(base, Self.M), local: ochtend)
        let middagRows = middag["history"] as? [[String: Any]] ?? []
        XCTAssertEqual(middagRows.map { $0["id"] as? String }, ["d1-ochtend"], "de Editie ervóór, samengevat; de Middag zelf niet")
        XCTAssertTrue(middagRows.allSatisfy { $0["entries"] == nil && $0["storyIds"] is [String] }, "alleen regels")
        let middagHistory = try await EditionEngine.shared.nextHistory(prior: prior, edition: Self.json(Self.dagdeel(base, Self.M)))
        XCTAssertEqual(Self.keyOrder(of: middagHistory, index: 0), ["id", "builtAt", "storyIds", "itemIds", "leadIds", "leadStoryId", "titles", "shown", "keys"], "de regel heeft de sleutels van het web, in die volgorde")
        // Avond: de Middag voluit, de Ochtend als regel; de volle Editie wint van haar eigen regel.
        prior = try await EditionEngine.shared.earlier(local: Self.json(middag), account: "null", id: Self.A.0, owner: "u1")
        XCTAssertEqual(Self.ids(prior), ["d1-middag", "d1-ochtend"])
        XCTAssertNotNil(Self.rows(prior)[0]["entries"])
        XCTAssertNil(Self.rows(prior)[1]["entries"])
        let avond = try await Self.vastgelegd(Self.dagdeel(base, Self.A), local: middag)
        let history = try JSONDecoder().decode([EditionHistory].self, from: try JSONSerialization.data(withJSONObject: avond["history"] ?? []))
        XCTAssertEqual(history.map(\.id), ["d1-middag", "d1-ochtend"])
        XCTAssertTrue(history.allSatisfy { $0.leadStoryId != nil && !($0.shown ?? []).isEmpty }, "elke regel draagt leadStoryId en shown")
        // previous kent de Ochtend; at en leadStoryId zijn van de nieuwste, ook al levert het toestel nieuw → oud.
        let previous = try await EditionEngine.shared.previous(of: prior)
        let p = try XCTUnwrap(Self.object(previous))
        let storyId = (base["entries"] as? [[String: Any]])?.first { $0["kind"] as? String == "story" }?["id"] as? String ?? ""
        XCTAssertEqual((p["atOf"] as? [String: Double])?[storyId], Self.ms(Self.M.1), "at per verhaal: de laatste Editie waarin het stond")
        XCTAssertEqual(p["at"] as? Double, Self.ms(Self.M.1))
        let ochtendPrevious = try await EditionEngine.shared.previous(of: Self.json(Self.rows(prior).filter { $0["id"] as? String == "d1-ochtend" }))
        let alleenOchtend = try XCTUnwrap(Self.object(ochtendPrevious))
        XCTAssertEqual((alleenOchtend["atOf"] as? [String: Double])?[storyId], Self.ms(Self.O.1), "de Ochtend staat er nog in")
        // Een vierde dagdeel: drie diep; een vijfde: de Ochtend valt af.
        let nacht = try await Self.vastgelegd(Self.dagdeel(base, Self.N), local: avond)
        XCTAssertEqual((nacht["history"] as? [[String: Any]])?.map { $0["id"] as? String }, ["d1-avond", "d1-middag", "d1-ochtend"])
        let later = try await Self.vastgelegd(Self.dagdeel(base, ("d2-middag", "2026-11-01T11:00:00.000Z")), local: nacht)
        XCTAssertEqual((later["history"] as? [[String: Any]])?.map { $0["id"] as? String }, ["d2-ochtend", "d1-avond", "d1-middag"])
    }

    // P8-1/H5: het toestel sloeg de Middag over, het web schreef de Middag (history [Ochtend]) in het
    // account: de Avond op iOS kent [Middag, Ochtend], met de Middag voluit, gelijk aan het web.
    func testSkippedSlotKnowsWebMiddag() async throws {
        let base = try await Self.base()
        let ochtend = try await Self.vastgelegd(Self.dagdeel(base, Self.O))
        let webMiddag = try await Self.vastgelegd(Self.dagdeel(base, Self.M), local: nil, account: ochtend)
        XCTAssertEqual((webMiddag["history"] as? [[String: Any]])?.map { $0["id"] as? String }, ["d1-ochtend"])
        let prior = try await EditionEngine.shared.earlier(local: Self.json(ochtend), account: Self.json(webMiddag), id: Self.A.0, owner: "u1")
        XCTAssertEqual(Self.ids(prior), ["d1-middag", "d1-ochtend"], "de volle Editie uit het account telt mee als zij van een ander dagdeel is")
        XCTAssertNotNil(Self.rows(prior)[0]["entries"], "de Middag voluit")
        let previous = try await EditionEngine.shared.previous(of: prior)
        let p = try XCTUnwrap(Self.object(previous))
        XCTAssertEqual(p["at"] as? Double, Self.ms(Self.M.1), "previous kent de Middag")
        // Een toestel met niets lokaal rekent uit het account hetzelfde previous.
        let alleenAccount = try await EditionEngine.shared.earlier(local: "null", account: Self.json(webMiddag), id: Self.A.0, owner: "u1")
        let accountPrevious = try await EditionEngine.shared.previous(of: alleenAccount)
        XCTAssertEqual(Self.object(accountPrevious), p)
        let avond = try await Self.vastgelegd(Self.dagdeel(base, Self.A), local: ochtend, account: webMiddag)
        XCTAssertEqual((avond["history"] as? [[String: Any]])?.map { $0["id"] as? String }, ["d1-middag", "d1-ochtend"])
        let webRow = try await EditionEngine.shared.history(of: Self.json(webMiddag))
        XCTAssertEqual((avond["history"] as? [[String: Any]]).map { NSDictionary(dictionary: $0[0]) }, Self.object(webRow), "de regel van de Middag is precies de samenvatting van het web")
    }

    // H5: web en app wisselen van geschiedenis: door het web geschreven en door iOS gelezen en omgekeerd
    // geeft hetzelfde previous en dezelfde volgende history, en overnemen (adopt) herschrijft niets.
    func testHistoryRoundTripsBetweenWebAndApp() async throws {
        let base = try await Self.base()
        let ochtend = try await Self.vastgelegd(Self.dagdeel(base, Self.O))
        let avond = Self.json(Self.dagdeel(base, Self.A))
        // iOS → web: iOS schreef de Middag; het web leest voor de Avond alleen uit het account.
        let iosMiddag = try await Self.vastgelegd(Self.dagdeel(base, Self.M), local: ochtend)
        let webEarlier = try await EditionEngine.shared.earlier(local: "null", account: Self.json(iosMiddag), id: Self.A.0, owner: "u1")
        let iosEarlier = try await EditionEngine.shared.earlier(local: Self.json(iosMiddag), account: Self.json(iosMiddag), id: Self.A.0, owner: "u1")
        XCTAssertEqual(Self.ids(webEarlier), ["d1-middag", "d1-ochtend"])
        let webPrevious = try await EditionEngine.shared.previous(of: webEarlier)
        let iosPrevious = try await EditionEngine.shared.previous(of: iosEarlier)
        XCTAssertEqual(Self.object(webPrevious), Self.object(iosPrevious))
        // Als lijsten vergeleken: een Swift-woordenboek onderweg verliest de sleutelvolgorde, niet de inhoud.
        let webNext = try await EditionEngine.shared.nextHistory(prior: webEarlier, edition: avond)
        let iosNext = try await EditionEngine.shared.nextHistory(prior: iosEarlier, edition: avond)
        XCTAssertEqual(NSArray(array: Self.rows(webNext)), NSArray(array: Self.rows(iosNext)), "beide schrijven dezelfde history voor de Avond")
        // web → iOS: het web schreef de Middag; iOS leest voor de Avond met lokaal de Ochtend.
        let webMiddag = try await Self.vastgelegd(Self.dagdeel(base, Self.M), local: nil, account: ochtend)
        let iosEarlier2 = try await EditionEngine.shared.earlier(local: Self.json(ochtend), account: Self.json(webMiddag), id: Self.A.0, owner: "u1")
        let webEarlier2 = try await EditionEngine.shared.earlier(local: Self.json(webMiddag), account: Self.json(webMiddag), id: Self.A.0, owner: "u1")
        let iosPrevious2 = try await EditionEngine.shared.previous(of: iosEarlier2)
        let webPrevious2 = try await EditionEngine.shared.previous(of: webEarlier2)
        XCTAssertEqual(Self.object(iosPrevious2), Self.object(webPrevious2))
        let iosNext2 = try await EditionEngine.shared.nextHistory(prior: iosEarlier2, edition: avond)
        let webNext2 = try await EditionEngine.shared.nextHistory(prior: webEarlier2, edition: avond)
        XCTAssertEqual(NSArray(array: Self.rows(iosNext2)), NSArray(array: Self.rows(webNext2)))
        // Overnemen (adopt): een door het web geschreven Editie krijgt haar history ongewijzigd terug, ook
        // als het toestel een oudere Editie van deze lezer heeft.
        let webHistory = NSArray(array: webMiddag["history"] as? [[String: Any]] ?? [])
        for local in [nil, ochtend] {
            let prior = try await EditionEngine.shared.earlier(local: Self.json(local), account: Self.json(webMiddag), id: Self.M.0, owner: "u1")
            let adopted = NSArray(array: Self.rows(try await EditionEngine.shared.nextHistory(prior: prior, edition: Self.json(webMiddag))))
            XCTAssertEqual(adopted, webHistory, "adopt herschrijft een web-geschreven geschiedenis niet")
        }
    }

    // Eigenaarsfilter: wat lokaal van een andere lezer is, telt niet — anon-lokaal bij lid u1 geeft niets,
    // na uitloggen rekent anon niet met de geschiedenis van het lid; de rij uit het account telt altijd.
    func testOwnerFilter() async throws {
        let base = try await Self.base()
        let anon = try await Self.vastgelegd(Self.dagdeel(base, Self.O, owner: "anon"))
        let lid = try await Self.vastgelegd(Self.dagdeel(base, Self.M), local: nil, account: try await Self.vastgelegd(Self.dagdeel(base, Self.O)))
        let anonBijLid = try await EditionEngine.shared.earlier(local: Self.json(anon), account: "null", id: Self.M.0, owner: "u1")
        XCTAssertEqual(anonBijLid, "[]", "anon-lokaal bij lid u1: prior leeg")
        let leeg = try await EditionEngine.shared.previous(of: "[]")
        XCTAssertEqual(leeg, "null")
        let naUitloggen = try await EditionEngine.shared.earlier(local: Self.json(lid), account: "null", id: Self.A.0, owner: "anon")
        XCTAssertEqual(naUitloggen, "[]", "na uitloggen: de Middag en haar history van het lid tellen niet")
        let zelfdeLezer = try await EditionEngine.shared.earlier(local: Self.json(lid), account: "null", id: Self.A.0, owner: "u1")
        XCTAssertEqual(Self.ids(zelfdeLezer), ["d1-middag", "d1-ochtend"], "dezelfde lezer wél")
        let anonZelf = try await EditionEngine.shared.earlier(local: Self.json(anon), account: "null", id: Self.M.0, owner: "anon")
        XCTAssertEqual(Self.ids(anonZelf), ["d1-ochtend"])
        let metAccount = try await EditionEngine.shared.earlier(local: Self.json(anon), account: Self.json(lid), id: Self.A.0, owner: "u1")
        XCTAssertEqual(Self.ids(metAccount), ["d1-middag", "d1-ochtend"], "de rij uit het account is altijd van deze lezer")
    }

    // De rekentijd zonder JIT (de simulator draait JavaScriptCore net als een toestel zonder JIT voor
    // apps). Doel ≤ 1,5 s op de achtergrond; de uitslag staat in het testverslag.
    func testComposeTime() throws {
        let g = try Self.golden().first { $0.name == "vs" }!
        _ = try EditionEngine.shared.composeNow(inputJSON: g.input) // de bundel laden telt niet mee
        var times: [TimeInterval] = []
        measure {
            let t0 = Date()
            _ = try? EditionEngine.shared.composeNow(inputJSON: g.input)
            times.append(Date().timeIntervalSince(t0))
        }
        let avg = times.reduce(0, +) / Double(max(1, times.count))
        print("EditionParityTests: samenstellen gemiddeld \(Int(avg * 1000)) ms over \(times.count) keer (max \(Int((times.max() ?? 0) * 1000)) ms)")
        XCTAssertLessThan(avg, 5, "samenstellen duurt veel te lang")
    }
}
