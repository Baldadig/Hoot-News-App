import XCTest
import SwiftUI
import WidgetKit
@testable import Hoot

// De widgets getekend op hun echte maat (ImageRenderer, @3x): licht, donker en getint (benadering: iOS doet
// de echte tint zelf), plus het vergrendelscherm en een beginscherm ter vergelijking. Widgets op het
// beginscherm zetten kan niet zonder iemand die tikt; dit is renderbewijs van dezelfde views als de extensie.
// Met TEST_RUNNER_HOOT_WIDGET_PNG=<map> komen de PNG's daar, anders als bijlage bij de toets.
// Daarnaast harde toetsen: geen tekst binnen 16 punt van de rand (de marge van Alex: "niet te dicht tegen de randen"),
// nooit afgekapt, een bronregel bij elke rij en de eerste kop bovenaan, ook met lange en uiterste koppen.
@MainActor final class WidgetRenderTests: XCTestCase {
    static let iPhone = (klein: CGSize(width: 170, height: 170), middel: CGSize(width: 364, height: 170), groot: CGSize(width: 364, height: 382))
    static let iPad = (klein: CGSize(width: 170, height: 170), middel: CGSize(width: 378.5, height: 170), groot: CGSize(width: 378.5, height: 378.5))
    static let rechthoek = CGSize(width: 172, height: 76), rond = CGSize(width: 76, height: 76), regel = CGSize(width: 257, height: 26)
    static let hoek: CGFloat = 26 // de hoek van een widget op het beginscherm

    static var uitMap: URL? { ProcessInfo.processInfo.environment["HOOT_WIDGET_PNG"].map { URL(fileURLWithPath: $0, isDirectory: true) } }

    // De Editie van vandaag (Fixtures/widget-editie.json) met het beeld van 01, als het netwerk er is.
    private func editie(gelezen: Int) async throws -> WidgetEditie {
        var e = try WidgetTests.editie(gelezen: gelezen, nu: WidgetTests.moment("2026-11-11T17:41:00Z"))
        // Onderweg: gelezen in een gewone volgorde (02, 05, 06, 08), zodat 01 nog rood is.
        if gelezen == 4 { e.gelezen = [1, 4, 5, 7].map { e.verhalen[$0].itemId } }
        let server = try JSONDecoder().decode(ServerEditie.self, from: Data(contentsOf: WidgetTests.fixture))
        if let eerste = server.stenen.first(where: { $0.itemId == e.verhalen[0].itemId }) {
            e.verhalen[0].beeld = await WidgetBeelden.haal(eerste.beeldURL, itemId: eerste.itemId)
        }
        return e
    }

    private func entry(_ e: WidgetEditie?, _ toon: WidgetToon = .top3, beeld: Bool = true, om: String = "2026-11-11T17:41:00Z") -> HootWidgetEntry {
        HootWidgetEntry(date: WidgetTests.moment(om), editie: e, toon: toon, metBeeld: beeld)
    }

    private func isAccessory(_ f: WidgetFamily) -> Bool { [.accessoryCircular, .accessoryRectangular, .accessoryInline].contains(f) }

    // Eén widget zoals op het beginscherm: papier, de hoek van iOS.
    private func widget(_ entry: HootWidgetEntry, _ family: WidgetFamily, _ maat: CGSize, _ scheme: ColorScheme, getint: Bool = false) -> some View {
        HootWidgetInhoud(entry: entry, family: family, maat: maat)
            .frame(width: maat.width, height: maat.height)
            .background(getint ? Color(white: 0.16).opacity(0.92) : WidgetKleur.paper)
            .clipShape(RoundedRectangle(cornerRadius: Self.hoek, style: .continuous))
            .saturation(getint ? 0 : 1)
            .environment(\.colorScheme, getint ? .dark : scheme)
            .environment(\.widgetRenderingMode, getint ? .accented : .fullColor)
    }

    private func png<V: View>(_ view: V, _ naam: String, schaal: CGFloat = 3) throws -> UIImage {
        let r = ImageRenderer(content: view)
        r.scale = schaal
        let beeld = try XCTUnwrap(r.uiImage, naam)
        let data = try XCTUnwrap(beeld.pngData())
        if let map = Self.uitMap {
            try FileManager.default.createDirectory(at: map, withIntermediateDirectories: true)
            try data.write(to: map.appending(path: "\(naam).png"))
        } else {
            let a = XCTAttachment(image: beeld); a.name = naam; a.lifetime = .keepAlways; add(a)
        }
        return beeld
    }

    // MARK: - Marges, afkappen en slim vullen (besluit Alex 12 november 2026)

    struct Formaat { let naam: String; let family: WidgetFamily; let maat: CGSize; let toon: WidgetToon; let beeld: Bool }
    static let mini = (klein: CGSize(width: 155, height: 155), middel: CGSize(width: 329, height: 155), groot: CGSize(width: 329, height: 345))
    static let formaten: [Formaat] = [
        .init(naam: "middel-top3", family: .systemMedium, maat: iPhone.middel, toon: .top3, beeld: false),
        .init(naam: "middel-kop01", family: .systemMedium, maat: iPhone.middel, toon: .kop01, beeld: false),
        .init(naam: "middel-kop01-beeld", family: .systemMedium, maat: iPhone.middel, toon: .kop01, beeld: true),
        .init(naam: "klein-kop01", family: .systemSmall, maat: iPhone.klein, toon: .kop01, beeld: false),
        .init(naam: "klein-kop01-beeld", family: .systemSmall, maat: iPhone.klein, toon: .kop01, beeld: true),
        .init(naam: "klein-voortgang", family: .systemSmall, maat: iPhone.klein, toon: .voortgang, beeld: false),
        .init(naam: "groot", family: .systemLarge, maat: iPhone.groot, toon: .top3, beeld: false),
        .init(naam: "mini-middel-top3", family: .systemMedium, maat: mini.middel, toon: .top3, beeld: false),
        .init(naam: "mini-klein-kop01", family: .systemSmall, maat: mini.klein, toon: .kop01, beeld: false),
        .init(naam: "mini-groot", family: .systemLarge, maat: mini.groot, toon: .top3, beeld: false),
        .init(naam: "ipad-middel-top3", family: .systemMedium, maat: iPad.middel, toon: .top3, beeld: false),
        .init(naam: "ipad-middel-kop01-beeld", family: .systemMedium, maat: iPad.middel, toon: .kop01, beeld: true),
        .init(naam: "ipad-klein-kop01", family: .systemSmall, maat: iPad.klein, toon: .kop01, beeld: false),
        .init(naam: "ipad-groot", family: .systemLarge, maat: iPad.groot, toon: .top3, beeld: false),
        .init(naam: "vergrendelscherm", family: .accessoryRectangular, maat: rechthoek, toon: .top3, beeld: false),
    ]

    // Wat een widget toonde: de nummers van de koppen (van boven naar onder) en wat er mis was.
    struct Uitslag { var nummers: [Int] = []; var fouten: [String] = [] }

    // De rand van de inkt (alles wat niet wit is), op een witte ondergrond met 100 punt ruimte rondom: zo telt
    // ook wat buiten de widget valt.
    private func inktRuim(_ beeld: UIImage) -> CGRect? {
        guard let cg = beeld.cgImage else { return nil }
        let w = cg.width, h = cg.height
        var px = [UInt8](repeating: 0, count: w * h * 4)
        let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        var minX = w, minY = h, maxX = -1, maxY = -1
        px.withUnsafeBufferPointer { p in
            for y in 0..<h {
                var i = y * w * 4
                for x in 0..<w {
                    if Int(p[i]) + Int(p[i + 1]) + Int(p[i + 2]) < 600 {
                        if x < minX { minX = x }; if x > maxX { maxX = x }; if y < minY { minY = y }; if y > maxY { maxY = y }
                    }
                    i += 4
                }
            }
        }
        guard maxX >= 0 else { return nil }
        return CGRect(x: CGFloat(minX) - 100, y: CGFloat(minY) - 100, width: CGFloat(maxX - minX + 1), height: CGFloat(maxY - minY + 1))
    }

    // Eén widget getekend en nagemeten: niets buiten de marge (16, op het vergrendelscherm de rand), elke kop heel
    // (de hele kop van een verhaal, in de regels die hij kreeg, nooit kleiner dan de ondergrens), een bronregel bij
    // elke rij die er een hoort te hebben, en de eerste kop bovenaan.
    func keur(_ e: WidgetEditie, _ f: Formaat) throws -> Uitslag {
        var koppen: [String: (WidgetZet.Gezet, WidgetLetter.Maat, CGRect)] = [:]
        var bronnen: [String: CGRect] = [:]
        WidgetZetMeting.opname = { soort, r in
            MainActor.assumeIsolated {
                switch soort {
                case let .kop(g, m): koppen[g.tekst] = (g, m, r)
                case let .bron(naam): bronnen["\(naam)|\(Int(r.minY.rounded()))"] = r
                }
            }
        }
        defer { WidgetZetMeting.opname = nil }
        let inhoud = HootWidgetInhoud(entry: entry(e, f.toon, beeld: f.beeld), family: f.family, maat: f.maat)
            .frame(width: f.maat.width, height: f.maat.height)
        let r = ImageRenderer(content: inhoud.padding(100).background(Color.white).environment(\.colorScheme, .light))
        r.scale = 1
        let beeld = try XCTUnwrap(r.uiImage, f.naam)
        var u = Uitslag()
        let rand: CGFloat = f.family == .accessoryRectangular ? 0 : WidgetRuimte.s4
        let binnen = CGRect(x: rand, y: rand, width: f.maat.width - 2 * rand, height: f.maat.height - 2 * rand)
        func binnenMarge(_ r: CGRect, speling: CGFloat) -> Bool { binnen.insetBy(dx: -speling, dy: -speling).contains(r) }
        // Inkt: niet bij een beeld tot de rand (dat hoort daar); dan tellen de kaders van kop en bron.
        if !f.beeld, let inkt = inktRuim(beeld), !binnenMarge(inkt, speling: 1) { u.fouten.append("inkt \(inkt) buiten \(binnen)") }
        let opVolgorde = koppen.values.sorted { $0.2.minY < $1.2.minY }
        for (g, m, kader) in opVolgorde {
            guard let v = e.verhalen.first(where: { $0.kop == g.tekst }) else { u.fouten.append("geen hele kop: \(g.tekst)"); continue }
            u.nummers.append(v.nummer)
            if WidgetZet.regels(g.tekst, m, breedte: kader.width) > g.regels { u.fouten.append("past niet in \(kader.width): \(g.tekst)") }
            // Op schaal 1 rondt iOS kaders af op hele punten: een punt speling, minder dan een regel.
            if kader.height > CGFloat(g.regels) * m.regel + 1 { u.fouten.append("meer regels dan gemeten (\(kader.height)): \(g.tekst)") }
            if m.grootte < WidgetZet.ondergrens { u.fouten.append("kleiner dan de ondergrens: \(g.tekst)") }
            if !binnenMarge(kader, speling: 1) { u.fouten.append("kop \(kader) buiten \(binnen): \(g.tekst)") }
        }
        for kader in bronnen.values where !binnenMarge(kader, speling: 1) { u.fouten.append("bron \(kader) buiten \(binnen)") }
        // Een bronregel bij elke rij: Groot (01 en elke rij) en Kop 01 zonder beeld bovenaan (Klein met beeld heeft
        // er geen; Middel · Top 3 heeft er nooit een gehad).
        let metBron: Bool
        switch (f.family, f.toon) {
        case (.systemLarge, _), (.systemExtraLarge, _), (.systemMedium, .kop01): metBron = true
        case (.systemSmall, .kop01): metBron = koppen.values.first.map { $0.2.minY < 56 } ?? false
        default: metBron = false
        }
        if metBron, bronnen.count != koppen.count { u.fouten.append("\(koppen.count) koppen, \(bronnen.count) bronregels") }
        if !metBron, f.family != .systemSmall || f.toon != .kop01, !bronnen.isEmpty, f.family != .accessoryRectangular { u.fouten.append("onverwachte bronregel") }
        // De eerste kop bovenaan: direct onder de kopregel (of het beeld), geen lege ruimte erboven.
        if let eerste = opVolgorde.first?.2 {
            let s = WidgetRuimte.self
            let hoogste: CGFloat = switch (f.family, f.toon) {
            case (.accessoryRectangular, _): 16 + s.s0
            case (.systemLarge, _), (.systemExtraLarge, _): rand + 16 + s.s3 + GrootEditie.beeldHoogte + s.s3
            case (.systemMedium, .top3): rand + 16 + s.s3
            case (.systemSmall, .kop01) where eerste.minY > KleinKop.beeldHoogte: KleinKop.beeldHoogte + s.s3 + 16 + s.s1
            default: rand + 16 + s.s2
            }
            if eerste.minY > hoogste + 1 { u.fouten.append("eerste kop op \(eerste.minY), niet bovenaan (\(hoogste))") }
        }
        return u
    }

    private func keurAlles(_ e: WidgetEditie, _ wat: String) throws {
        for f in Self.formaten {
            let u = try keur(e, f)
            for fout in u.fouten { XCTFail("\(wat) \(f.naam): \(fout)") }
        }
    }

    // Lange, echte koppen uit de live feed (GET, 12 november 2026; Fixtures/widget-live-koppen.json).
    static func liveKoppen() throws -> [(kop: String, bron: String)] {
        struct Bestand: Decodable { struct K: Decodable { let kop: String; let bron: String }; let koppen: [K] }
        let url = WidgetTests.fixture.deletingLastPathComponent().appending(path: "widget-live-koppen.json")
        return try JSONDecoder().decode(Bestand.self, from: Data(contentsOf: url)).koppen.map { ($0.kop, $0.bron) }
    }
    static func editie(_ koppen: [(kop: String, bron: String)]) -> WidgetEditie {
        let nu = WidgetDagdeel.op(WidgetTests.moment("2026-11-11T17:41:00Z"))
        let stenen = koppen.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k.kop, bron: k.bron) }
        return WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
    }
    static let uiterst: [(String, String)] = {
        let k149 = "Rijkswaterstaat sluit de Afsluitdijk dit weekend voor al het verkeer vanwege onderhoud aan de sluizen bij Den Oever en Kornwerderzand, meldt de NOS"
        let k200 = "Kabinet is gevallen na urenlang crisisberaad in het Catshuis over de asielwet van minister Faber, maar premier Schoof spreekt het bericht van De Telegraaf tegen en noemt het volstrekte onzin vanavond"
        let k280 = k200 + " in een korte verklaring voor de camera's van de NOS en RTL Nieuws in Den Haag, waarna de Tweede Kamer"
        return [("149", k149), ("200", k200), ("280", k280)]
    }()
    // Tien keer dezelfde uiterste kop, elk met een eigen nummer erachter.
    static func uitersteEditie(_ kop: String) -> WidgetEditie {
        editie((1...10).map { ("\(kop) \($0)", "NOS") })
    }

    // Op (a) de fixture, (b) de langste echte koppen van vandaag en (c) uiterste koppen van 149, 200 en 280 tekens,
    // in elk formaat op iPhone (ook mini) en iPad en op het vergrendelscherm: niets buiten de marge, niets afgekapt,
    // een bronregel bij elke rij, de eerste kop bovenaan.
    func testGeenTekstTegenDeRand() async throws {
        for gelezen in [0, 4, 10] { try keurAlles(try await editie(gelezen: gelezen), "fixture \(gelezen)") }
        let lang = try Self.liveKoppen().sorted { $0.kop.count > $1.kop.count }.prefix(30)
        for start in stride(from: 0, to: 30, by: 5) { try keurAlles(Self.editie(Array(lang.dropFirst(start).prefix(10))), "lang vanaf \(start)") }
        for (naam, kop) in Self.uiterst { try keurAlles(Self.uitersteEditie(kop), "uiterst \(naam)") }
    }

    // De overloop-toets, op de live feed: elke reeks van tien opeenvolgende koppen als Editie (zoals keuring 10),
    // in elk formaat. Geen enkele overloop, nooit afgekapt; en de meting (hoeveel koppen er staan, hoe vaak er een
    // sprong in de nummers is) als bijlage, of naar TEST_RUNNER_HOOT_WIDGET_METING.
    func testGeenOverloopOpDeLiveFeed() throws {
        let live = try Self.liveKoppen()
        var edities: [WidgetEditie] = []
        var start = 0
        while start + 10 <= live.count { edities.append(Self.editie(Array(live[start..<(start + 10)]))); start += 3 }
        XCTAssertGreaterThanOrEqual(edities.count, 100)
        var regels = ["\(edities.count) Edities van tien opeenvolgende live koppen (\(live.count) koppen, langste \(live.map(\.kop.count).max() ?? 0) tekens)",
                      "formaat: gemiddeld koppen | verdeling (0,1,2,3,4+) | met sprong | voortgang | overloop"]
        for f in Self.formaten where f.toon != .voortgang {
            var aantal = 0, sprong = 0, leeg = 0, fout = 0
            var verdeling = [0, 0, 0, 0, 0]
            for (i, e) in edities.enumerated() {
                let u = try keur(e, f)
                aantal += u.nummers.count
                verdeling[min(u.nummers.count, 4)] += 1
                if u.nummers.isEmpty { leeg += 1 } else if u.nummers != Array(1...u.nummers.count) { sprong += 1 }
                if !u.fouten.isEmpty { fout += 1; for x in u.fouten { XCTFail("live \(i * 3) \(f.naam): \(x)") } }
            }
            regels.append("\(f.naam): \(String(format: "%.2f", Double(aantal) / Double(edities.count))) | \(verdeling) | \(sprong) | \(leeg) | \(fout)")
        }
        let tekst = regels.joined(separator: "\n")
        if let pad = ProcessInfo.processInfo.environment["HOOT_WIDGET_METING"] {
            try tekst.write(toFile: pad, atomically: true, encoding: .utf8)
        }
        let a = XCTAttachment(string: tekst); a.name = "meting-live"; a.lifetime = .keepAlways; add(a)
    }

    // MARK: - Nooit midden in een woord afgekapt

    // Keuring 1: Groot op iPad mat 02 en 03 op de volle breedte, terwijl ze naast de nummerkolom staan; iOS kapte
    // dan "laborat…" af. Hier meldt elke kop in de echte weergave zijn breedte (WidgetZetMeting), en moet hij daar
    // in zijn regels passen. Met lange, echte koppen, op iPhone en iPad, in alle widgets met koppen.
    func testElkeKopPastInZijnKolom() throws {
        let koppen = [
            "Sluiting dreigt voor verouderde laboratoria RIVM, maar verhuizen kan nog niet",
            "Spanning in Den Haag: D66 en CDA sluiten deal met Pro en Volt over Belastingplan met ‘miljonairsbelasting’ – positie VVD is nog onduidelijk",
            "Hoe reëel is kans op uitbraak van ziekten? En 3 andere vragen over de verouderde laboratoria van het RIVM",
            "“Zelden geziene heksenjacht”: advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi ontkennen zedenfeiten",
            "Donaudampfschiffahrtsgesellschaftskapitänswitwenrentenauszahlungsstelle bestaat niet",
            "Russische ambassadeur Aleksandr Dartsjiëv (66) onverwachts overleden in VS",
        ] + WidgetTests.zonderVeiligeVorm
        let nu = WidgetDagdeel.op(WidgetTests.moment("2026-11-11T17:41:00Z"))
        var opnamen: [(WidgetZet.Gezet, WidgetLetter.Maat, CGFloat)] = []
        WidgetZetMeting.opname = { soort, r in
            MainActor.assumeIsolated { if case let .kop(g, m) = soort { opnamen.append((g, m, r.width)) } }
        }
        defer { WidgetZetMeting.opname = nil }
        for start in 0..<koppen.count {
            let volgorde = Array(koppen[start...] + koppen[..<start])
            let stenen = volgorde.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NRC") }
            let e = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
            for f in Self.formaten {
                let r = ImageRenderer(content: HootWidgetInhoud(entry: entry(e, f.toon, beeld: f.beeld), family: f.family, maat: f.maat).frame(width: f.maat.width, height: f.maat.height))
                r.scale = 1
                _ = r.uiImage
            }
        }
        XCTAssertGreaterThan(opnamen.count, 60, "de koppen melden hun breedte")
        for (g, m, breedte) in opnamen {
            XCTAssertLessThanOrEqual(WidgetZet.regels(g.tekst, m, breedte: breedte), g.regels, "\"\(g.tekst)\" past niet in \(breedte) punt")
            XCTAssertFalse(g.tekst.isEmpty)
            // Keuring 4 en 9: altijd de hele kop.
            XCTAssertTrue(koppen.contains(g.tekst), g.tekst)
        }
    }

    // MARK: - Opnamen

    func testOpnamen() async throws {
        let nul = try await editie(gelezen: 0), vier = try await editie(gelezen: 4), tien = try await editie(gelezen: 10)
        for (scheme, s) in [(ColorScheme.light, "licht"), (.dark, "donker")] {
            _ = try png(widget(entry(vier), .systemMedium, Self.iPhone.middel, scheme), "middel-top3-\(s)")
            _ = try png(widget(entry(vier, .kop01), .systemMedium, Self.iPhone.middel, scheme), "middel-kop01-beeld-\(s)")
            _ = try png(widget(entry(vier, .kop01, beeld: false), .systemMedium, Self.iPhone.middel, scheme), "middel-kop01-zonder-beeld-\(s)")
            _ = try png(widget(entry(vier, .kop01), .systemSmall, Self.iPhone.klein, scheme), "klein-kop01-beeld-\(s)")
            _ = try png(widget(entry(vier, .kop01, beeld: false), .systemSmall, Self.iPhone.klein, scheme), "klein-kop01-zonder-beeld-\(s)")
            _ = try png(widget(entry(nul, .voortgang), .systemSmall, Self.iPhone.klein, scheme), "klein-voortgang-ligt-klaar-\(s)")
            _ = try png(widget(entry(vier, .voortgang), .systemSmall, Self.iPhone.klein, scheme), "klein-voortgang-onderweg-\(s)")
            _ = try png(widget(entry(tien, .voortgang), .systemSmall, Self.iPhone.klein, scheme), "klein-voortgang-klaar-\(s)")
            _ = try png(widget(entry(vier), .systemLarge, Self.iPhone.groot, scheme), "groot-\(s)")
            _ = try png(widget(entry(tien), .systemMedium, Self.iPhone.middel, scheme), "middel-top3-klaar-\(s)")
            _ = try png(widget(entry(tien, om: "2026-11-12T05:40:00Z"), .systemMedium, Self.iPhone.middel, scheme), "middel-top3-nieuw-dagdeel-\(s)")
            _ = try png(widget(entry(nil), .systemMedium, Self.iPhone.middel, scheme), "middel-leeg-\(s)")
            _ = try png(widget(entry(vier), .systemMedium, Self.iPad.middel, scheme), "ipad-middel-top3-\(s)")
            _ = try png(widget(entry(vier), .systemLarge, Self.iPad.groot, scheme), "ipad-groot-\(s)")
        }
        // Getint (benadering): grijs, met de achtergrond van iOS.
        _ = try png(widget(entry(vier), .systemMedium, Self.iPhone.middel, .dark, getint: true), "middel-top3-getint")
        _ = try png(widget(entry(vier, .voortgang), .systemSmall, Self.iPhone.klein, .dark, getint: true), "klein-voortgang-getint")
        _ = try png(widget(entry(vier, .kop01), .systemSmall, Self.iPhone.klein, .dark, getint: true), "klein-kop01-getint")
        // StandBy: zonder achtergrond, op zwart, in donker (iOS kleurt hem 's nachts zelf rood).
        let standby = HStack(spacing: 48) {
            HootWidgetInhoud(entry: entry(vier, .voortgang), family: .systemSmall, maat: Self.iPhone.klein).frame(width: 170, height: 170)
            HootWidgetInhoud(entry: entry(vier, .kop01, beeld: false), family: .systemSmall, maat: Self.iPhone.klein).frame(width: 170, height: 170)
        }
        .scaleEffect(1.9).frame(width: 956, height: 440).background(.black).environment(\.colorScheme, .dark)
        _ = try png(standby, "standby", schaal: 2)

        try beginscherm(vier)
        try vergrendelscherm(vier)
        try langeKoppen()
    }

    // Lange koppen: altijd heel (nooit ingekort, nooit afgekapt); wat niet heel past, valt weg en een latere kop die
    // wel past, schuift op met zijn eigen nummer.
    private func langeKoppen() throws {
        let koppen = [
            "Rijkswaterstaat sluit de Afsluitdijk dit weekend voor al het verkeer vanwege onderhoud aan de sluizen bij Den Oever en Kornwerderzand",
            "Kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet: premier spreekt het bericht van de krant tegen",
            "Honderden scholen in Europa doelwit van een golf bommeldingen per e-mail vanuit het buitenland",
            "Fed verlaagt de rente in december met een halve procentpunt als de inflatie in de Verenigde Staten verder daalt, zegt Powell",
            "Storm trekt vanavond over het hele land met windstoten tot honderd kilometer per uur langs de kust",
        ]
        let nu = WidgetDagdeel.op(WidgetTests.moment("2026-11-11T17:41:00Z"))
        let stenen = koppen.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NOS") }
        let e = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
        _ = try png(widget(entry(e), .systemMedium, Self.iPhone.middel, .light), "lang-middel-top3")
        _ = try png(widget(entry(e), .systemLarge, Self.iPhone.groot, .light), "lang-groot")
        _ = try png(widget(entry(e), .systemLarge, Self.iPad.groot, .light), "lang-ipad-groot")
        _ = try png(widget(entry(e, .kop01, beeld: false), .systemSmall, Self.iPhone.klein, .light), "lang-klein-kop01")
        _ = try png(widget(entry(e, .kop01, beeld: false), .systemMedium, Self.iPhone.middel, .light), "lang-middel-kop01")
        // De langste echte koppen van vandaag (live feed, GET).
        let live = Self.editie(Array(try Self.liveKoppen().sorted { $0.kop.count > $1.kop.count }.prefix(10)))
        _ = try png(widget(entry(live), .systemMedium, Self.iPhone.middel, .light), "lang-live-middel-top3")
        _ = try png(widget(entry(live), .systemLarge, Self.iPhone.groot, .light), "lang-live-groot")
        _ = try png(widget(entry(live), .systemLarge, Self.iPad.groot, .light), "lang-live-ipad-groot")
        _ = try png(widget(entry(live, .kop01, beeld: false), .systemSmall, Self.iPhone.klein, .light), "lang-live-klein-kop01")
        _ = try png(widget(entry(live, .kop01), .systemMedium, Self.iPhone.middel, .light), "lang-live-middel-kop01")
        // Het uiterste: tien koppen van 149, 200 en 280 tekens.
        for (naam, kop) in Self.uiterst {
            let u = Self.uitersteEditie(kop)
            _ = try png(widget(entry(u), .systemMedium, Self.iPhone.middel, .light), "lang-uiterst-\(naam)-middel-top3")
            _ = try png(widget(entry(u), .systemLarge, Self.iPhone.groot, .light), "lang-uiterst-\(naam)-groot")
            _ = try png(widget(entry(u, .kop01, beeld: false), .systemSmall, Self.iPhone.klein, .light), "lang-uiterst-\(naam)-klein-kop01")
            _ = try png(widget(entry(u, .kop01), .systemMedium, Self.iPhone.middel, .light), "lang-uiterst-\(naam)-middel-kop01")
            let slot = HootWidgetInhoud(entry: entry(u), family: .accessoryRectangular, maat: Self.rechthoek).frame(width: 172, height: 76)
                .padding(20).background(achtergrond(.dark)).foregroundStyle(.white)
                .environment(\.colorScheme, .dark).environment(\.widgetRenderingMode, .vibrant)
            _ = try png(slot, "lang-uiterst-\(naam)-vergrendelscherm", schaal: 2)
        }
        // Vergrendelscherm: links de lange Editie (01 past alleen kleiner), rechts een 01 die er heel in past.
        let heel = ["Kabinet is gevallen na urenlang crisisberaad, premier Schoof weerspreekt dat bericht"] + koppen
        let h = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: heel.enumerated().map { i, k in
            WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NOS") }, gelezen: [], vraag: .algemeen)
        let rij = HStack(spacing: 14) {
            HootWidgetInhoud(entry: entry(e), family: .accessoryRectangular, maat: Self.rechthoek).frame(width: 172, height: 76)
            HootWidgetInhoud(entry: entry(h), family: .accessoryRectangular, maat: Self.rechthoek).frame(width: 172, height: 76)
        }
        .padding(20).background(achtergrond(.dark)).foregroundStyle(.white)
        .environment(\.colorScheme, .dark).environment(\.widgetRenderingMode, .vibrant)
        _ = try png(rij, "lang-vergrendelscherm", schaal: 2)
    }

    private func achtergrond(_ scheme: ColorScheme) -> some View {
        LinearGradient(colors: scheme == .dark ? [Color(white: 0.22), Color(red: 0.16, green: 0.18, blue: 0.2), Color(white: 0.1)]
                       : [Color(red: 0.83, green: 0.86, blue: 0.62), Color(red: 0.66, green: 0.7, blue: 0.72), Color(white: 0.6)],
                       startPoint: .topTrailing, endPoint: .bottomLeading)
    }

    private func label(_ s: String) -> some View {
        Text(s).font(.system(size: 12, weight: .medium)).foregroundStyle(.white).shadow(color: .black.opacity(0.25), radius: 1, y: 1)
    }

    // Beginscherm van een iPhone Pro Max (440 × 956): Top 3, daaronder Kop 01 en Voortgang, dan een rij iconen.
    private func beginscherm(_ e: WidgetEditie) throws {
        for (scheme, s) in [(ColorScheme.light, "licht"), (.dark, "donker")] {
            let scherm = ZStack(alignment: .top) {
                achtergrond(scheme)
                VStack(spacing: 6) {
                    widget(entry(e), .systemMedium, Self.iPhone.middel, scheme)
                    label("Hoot")
                    HStack(spacing: 24) {
                        VStack(spacing: 6) { widget(entry(e, .kop01), .systemSmall, Self.iPhone.klein, scheme); label("Hoot") }
                        VStack(spacing: 6) { widget(entry(e, .voortgang), .systemSmall, Self.iPhone.klein, scheme); label("Hoot") }
                    }
                    .padding(.top, 14)
                    HStack(spacing: 29) {
                        ForEach(0..<4, id: \.self) { _ in RoundedRectangle(cornerRadius: 15, style: .continuous).fill(.white.opacity(scheme == .dark ? 0.2 : 0.5)).frame(width: 64, height: 64) }
                    }
                    .padding(.top, 20)
                }
                .padding(.top, 74)
            }
            .frame(width: 440, height: 956)
            .clipShape(RoundedRectangle(cornerRadius: 56, style: .continuous))
            .environment(\.colorScheme, scheme)
            _ = try png(scherm, "beginscherm-\(s)", schaal: 2)
        }
    }

    // Vergrendelscherm: inline boven de klok, rechthoekig en rond eronder (iOS tekent ze wit en doorschijnend).
    private func vergrendelscherm(_ e: WidgetEditie) throws {
        let klaar = try WidgetTests.editie(gelezen: 10, nu: WidgetTests.moment("2026-11-11T17:41:00Z"))
        let nul = try WidgetTests.editie(gelezen: 0, nu: WidgetTests.moment("2026-11-11T17:41:00Z"))
        let scherm = ZStack(alignment: .top) {
            achtergrond(.dark)
            VStack(spacing: 4) {
                HStack(spacing: 8) {
                    Text("woensdag 11 nov").font(.system(size: 20, weight: .semibold))
                    HootWidgetInhoud(entry: entry(e), family: .accessoryInline, maat: Self.regel).font(.system(size: 20, weight: .semibold)).fixedSize()
                }
                Text("12:41").font(.system(size: 112, weight: .bold)).padding(.bottom, 8)
                HStack(spacing: 14) {
                    HootWidgetInhoud(entry: entry(e), family: .accessoryRectangular, maat: Self.rechthoek).frame(width: 172, height: 76)
                    HootWidgetInhoud(entry: entry(e), family: .accessoryCircular, maat: Self.rond).frame(width: 76, height: 76)
                        .background(Circle().fill(.white.opacity(0.15)))
                    HootWidgetInhoud(entry: entry(klaar), family: .accessoryCircular, maat: Self.rond).frame(width: 76, height: 76)
                        .background(Circle().fill(.white.opacity(0.15)))
                }
                HStack(spacing: 14) {
                    HootWidgetInhoud(entry: entry(nul), family: .accessoryCircular, maat: Self.rond).frame(width: 76, height: 76)
                        .background(Circle().fill(.white.opacity(0.15)))
                    HootWidgetInhoud(entry: entry(klaar, om: "2026-11-12T05:40:00Z"), family: .accessoryRectangular, maat: Self.rechthoek).frame(width: 172, height: 76)
                }
                .padding(.top, 10)
            }
            .foregroundStyle(.white)
            .padding(.top, 70)
        }
        .frame(width: 440, height: 956)
        .clipShape(RoundedRectangle(cornerRadius: 56, style: .continuous))
        .environment(\.colorScheme, .dark)
        .environment(\.widgetRenderingMode, .vibrant)
        _ = try png(scherm, "vergrendelscherm", schaal: 2)
    }
}
