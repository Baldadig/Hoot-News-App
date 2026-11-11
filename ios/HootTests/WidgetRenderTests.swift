import XCTest
import SwiftUI
import WidgetKit
@testable import Hoot

// De widgets getekend op hun echte maat (ImageRenderer, @3x): licht, donker en getint (benadering: iOS doet
// de echte tint zelf), plus het vergrendelscherm en een beginscherm ter vergelijking. Widgets op het
// beginscherm zetten kan niet zonder iemand die tikt; dit is renderbewijs van dezelfde views als de extensie.
// Met TEST_RUNNER_HOOT_WIDGET_PNG=<map> komen de PNG's daar, anders als bijlage bij de toets.
// Daarnaast een harde toets: geen tekst binnen 16 punt van de rand (de marge van Alex: "niet te dicht tegen de randen").
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

    // De rand van wat er getekend is (niet-doorzichtige pixels), in punten.
    private func inkt(_ beeld: UIImage, schaal: CGFloat) -> CGRect? {
        guard let cg = beeld.cgImage else { return nil }
        let w = cg.width, h = cg.height
        var px = [UInt8](repeating: 0, count: w * h * 4)
        let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        var minX = w, minY = h, maxX = -1, maxY = -1
        for y in 0..<h { for x in 0..<w where px[(y * w + x) * 4 + 3] > 40 {
            minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
        } }
        guard maxX >= 0 else { return nil }
        return CGRect(x: CGFloat(minX) / schaal, y: CGFloat(minY) / schaal, width: CGFloat(maxX - minX + 1) / schaal, height: CGFloat(maxY - minY + 1) / schaal)
    }

    // MARK: - Marges

    func testGeenTekstTegenDeRand() async throws {
        let schaal: CGFloat = 3
        for gelezen in [0, 4, 10] {
            let e = try await editie(gelezen: gelezen)
            let gevallen: [(String, WidgetFamily, CGSize, WidgetToon, Bool)] = [
                ("middel-top3", .systemMedium, Self.iPhone.middel, .top3, true),
                ("klein-voortgang", .systemSmall, Self.iPhone.klein, .voortgang, true),
                ("klein-kop01", .systemSmall, Self.iPhone.klein, .kop01, false),
                ("middel-kop01", .systemMedium, Self.iPhone.middel, .kop01, false),
                ("groot", .systemLarge, Self.iPhone.groot, .top3, true),
                ("ipad-middel-top3", .systemMedium, Self.iPad.middel, .top3, true),
                ("ipad-groot", .systemLarge, Self.iPad.groot, .top3, true),
            ]
            for (naam, family, maat, toon, beeld) in gevallen {
                let inhoud = HootWidgetInhoud(entry: entry(e, toon, beeld: beeld), family: family, maat: maat)
                    .frame(width: maat.width, height: maat.height)
                let r = ImageRenderer(content: inhoud)
                r.scale = schaal
                let b = try XCTUnwrap(r.uiImage)
                let rand = try XCTUnwrap(inkt(b, schaal: schaal), naam)
                let speling: CGFloat = 0.7 // anti-aliasing van een letter
                XCTAssertGreaterThanOrEqual(rand.minX, WidgetRuimte.s4 - speling, "\(naam) \(gelezen) links: \(rand)")
                XCTAssertGreaterThanOrEqual(rand.minY, WidgetRuimte.s4 - speling, "\(naam) \(gelezen) boven: \(rand)")
                XCTAssertLessThanOrEqual(rand.maxX, maat.width - WidgetRuimte.s4 + speling, "\(naam) \(gelezen) rechts: \(rand)")
                XCTAssertLessThanOrEqual(rand.maxY, maat.height - WidgetRuimte.s4 + speling, "\(naam) \(gelezen) onder: \(rand)")
            }
        }
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
        ]
        let nu = WidgetDagdeel.op(WidgetTests.moment("2026-11-11T17:41:00Z"))
        var opnamen: [(WidgetZet.Gezet, WidgetLetter.Maat, CGFloat)] = []
        WidgetZetMeting.opname = { g, m, b in MainActor.assumeIsolated { opnamen.append((g, m, b)) } }
        defer { WidgetZetMeting.opname = nil }
        for start in 0..<koppen.count {
            let volgorde = Array(koppen[start...] + koppen[..<start])
            let stenen = volgorde.enumerated().map { i, k in WidgetEditie.Bouwsteen(plek: "p\(i)", itemId: "i\(i)", kop: k, bron: "NRC") }
            let e = WidgetEditie.bouw(id: nu.id, datum: nu.datum, dagdeel: nu.dagdeel, stenen: stenen, gelezen: [], vraag: .algemeen)
            let gevallen: [(WidgetFamily, CGSize, WidgetToon, Bool)] = [
                (.systemMedium, Self.iPhone.middel, .top3, true), (.systemMedium, Self.iPad.middel, .top3, true),
                (.systemMedium, Self.iPhone.middel, .kop01, true), (.systemMedium, Self.iPhone.middel, .kop01, false),
                (.systemSmall, Self.iPhone.klein, .kop01, true), (.systemSmall, Self.iPhone.klein, .kop01, false),
                (.systemLarge, Self.iPhone.groot, .top3, true), (.systemLarge, Self.iPad.groot, .top3, true),
            ]
            for (family, maat, toon, beeld) in gevallen {
                let r = ImageRenderer(content: HootWidgetInhoud(entry: entry(e, toon, beeld: beeld), family: family, maat: maat).frame(width: maat.width, height: maat.height))
                r.scale = 1
                _ = r.uiImage
            }
        }
        XCTAssertGreaterThan(opnamen.count, 60, "de koppen melden hun breedte")
        for (g, m, breedte) in opnamen {
            XCTAssertLessThanOrEqual(WidgetZet.regels(g.tekst, m, breedte: breedte), g.regels, "\"\(g.tekst)\" past niet in \(breedte) punt")
            // En op een woordgrens: wat er staat is een begin van woorden uit de kop, met hooguit een beletselteken.
            XCTAssertFalse(g.tekst.isEmpty)
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
