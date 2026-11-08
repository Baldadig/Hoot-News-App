import XCTest
import SwiftUI
@testable import Hoot

// Intro vier regels (besluit 8 november): de kaart van de Editie op de iPhone (Kaart A+) krijgt 4 regels intro
// in plaats van 3 (HootStore.kaartLines, KAART_LINES op het web). Echte koppen en intro's uit de bewaarde
// Edities die met 3 regels op de telefoon geen intro hadden. Stills naar Hoot-design/intro-vier/app als die map bestaat.
@MainActor
final class IntroVierTests: XCTestCase {
    static let stukken: [(bron: String, naam: String, kop: String, intro: String)] = [
        ("volkskrant", "de Volkskrant", "Laatste onafhankelijke Russische krant stopt onder druk van het Kremlin: ‘We werden gedood’", "Novaja Gazeta was de krant van de vermoorde journaliste Anna Politkovskaja en voormalig hoofdredacteur Dmitri Moeratov, die in 2021 de Nobelprijs voor de Vrede ontving."),
        ("nos", "NOS", "Groepsfoto op G20-top geschrapt, landen willen niet met Rusland op de foto", "De traditionele groepsfoto op de G20-top in de Verenigde Staten is niet doorgegaan vanwege de aanwezigheid van de Russische minister Lavrov van Buitenlandse Zaken."),
        ("nos", "NOS", "Winkeliers Den Haag timmeren hun zaken dicht uit angst voor rellen", "Uit vrees voor wat morgen mogelijk komen gaat, is een fors aantal Haagse winkeliers vandaag begonnen met het dichttimmeren van hun winkelpuien."),
    ]
    // Breedtes in punten: mini en SE 375, Pro Max 440.
    static let toestellen: [(naam: String, breedte: CGFloat)] = [("mini-se", 375), ("pro-max", 440)]

    private func item(_ k: (bron: String, naam: String, kop: String, intro: String), _ i: Int) -> Item {
        var it = Item(id: "vier-\(i)", source: k.bron, title: k.kop, url: "https://example.org/\(i)")
        it.sourceName = k.naam
        it.summary = k.intro
        return it
    }

    private func kaarten(_ lines: Int?, store: HootStore) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(Self.stukken.enumerated()), id: \.offset) { i, k in
                if i > 0 { Rule().padding(.vertical, Space.s2) }
                ItemRow(item: self.item(k, i), number: i + 2, label: "Buitenland", why: nil, story: nil, form: .tijdlijn, lines: lines)
            }
        }
        .padding(.horizontal, 16)
        .background(Theme.paper)
        .environment(store).environment(Reader()).environment(\.isWide, false)
    }

    private func hoogte(_ view: some View, breedte: CGFloat, type: DynamicTypeSize) -> CGFloat {
        let host = UIHostingController(rootView: view.frame(width: breedte).environment(\.dynamicTypeSize, type))
        return host.sizeThatFits(in: CGSize(width: breedte, height: 8000)).height
    }

    // Met 4 regels staat de intro er, met 3 viel hij weg: de kaart wordt hoger. IntroText meet wat er echt past
    // (Winkeliers past in de app al in 3 + 1 regels; Novaja Gazeta met zijn lange namen op 375 ook in 4 + 1 niet).
    func testVierRegelsHoudtDeIntro() {
        let store = HootStore()
        store.preview = 3
        for t in Self.toestellen {
            let drie = hoogte(kaarten(3, store: store), breedte: t.breedte, type: .large)
            let vier = hoogte(kaarten(HootStore.kaartLines, store: store), breedte: t.breedte, type: .large)
            // Op 375 komt er een intro bij; op de Pro Max (408 kolom) passen deze drie al in 3 + 1 regels.
            if t.breedte < 400 { XCTAssertGreaterThan(vier, drie + 2 * 28, "\(t.naam): met 4 regels komt er een intro bij") } else { XCTAssertGreaterThanOrEqual(vier, drie) }
        }
        // G20: met 4 regels (IntroText meet in 5) past hij in 343 breed, met 3 (meet in 4) niet.
        let k = Self.stukken[1]
        let tekst = wholeSentences(k.intro, max: introMax(lines: HootStore.kaartLines, thumb: false))
        XCTAssertEqual(tekst, k.intro)
        func h(_ lines: Int) -> CGFloat {
            let v = IntroText(text: tekst, style: .body, lines: lines + 1, size: 18, line: 28).frame(width: 343)
            return UIHostingController(rootView: v).sizeThatFits(in: CGSize(width: 343, height: 4000)).height
        }
        XCTAssertEqual(h(3), 0, accuracy: 0.5)
        XCTAssertGreaterThan(h(HootStore.kaartLines), 4 * 28)
        XCTAssertLessThanOrEqual(h(HootStore.kaartLines), IntroText.limit(lines: 5, style: .body, typeSize: .large, size: 18, line: 28))
    }

    // De Editie geeft kaartLines mee, ook als de Stroom-instelling anders staat (het web doet dat al).
    func testEditieVolgtDeInstellingNiet() {
        let store = HootStore()
        store.preview = 1
        let een = hoogte(kaarten(nil, store: store), breedte: 375, type: .large)
        let vier = hoogte(kaarten(HootStore.kaartLines, store: store), breedte: 375, type: .large)
        XCTAssertGreaterThan(vier, een + 3 * 28)
        store.preview = 3
    }

    func testStills() async throws {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Hoot-design/intro-vier/app")
        let write = FileManager.default.fileExists(atPath: dir.path)
        let store = HootStore()
        store.preview = 3
        for t in Self.toestellen {
            for (typeNaam, type) in [("large", DynamicTypeSize.large), ("xxxlarge", DynamicTypeSize.xxxLarge)] {
                for (label, lines) in [("voor", 3), ("na", HootStore.kaartLines)] {
                    let h = hoogte(kaarten(lines, store: store), breedte: t.breedte, type: type)
                    let view = kaarten(lines, store: store).frame(width: t.breedte, height: h, alignment: .top).environment(\.dynamicTypeSize, type)
                    let host = UIHostingController(rootView: view)
                    let frame = CGRect(x: 0, y: 0, width: t.breedte, height: h)
                    host.view.frame = frame
                    let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
                    host.view.layoutIfNeeded()
                    try await Task.sleep(for: .milliseconds(300))
                    let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                    let naam = "app-\(t.naam)-\(typeNaam)-\(label).png"
                    let attachment = XCTAttachment(image: image); attachment.name = naam; attachment.lifetime = .keepAlways; add(attachment)
                    if write, let png = image.pngData() { try png.write(to: dir.appendingPathComponent(naam)) }
                    window.isHidden = true
                }
            }
        }
    }
}
