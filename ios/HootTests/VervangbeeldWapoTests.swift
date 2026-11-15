import XCTest
import SwiftUI
@testable import Hoot

// Vervangbeeld (14 november, Alex: "Deze image mag er wel uit."): beeld 14 (Eclips) is uit de reeks. De Stroom
// met beeldloze stukken van The Washington Post, dezelfde ids als tests/visual/vervangbeeld-wapo.jsx op het web:
// die kregen tot 14 november Eclips, nu een van de zestien andere (sinds 15 november is ook Walsen uit de reeks;
// gelijk aan het web: 3, 6, 1, 5, 3).
// Stills (voor en na, 390 breed) naar Hoot-design/vervangbeeld-2026-11-14/een-beeld als die map bestaat.
@MainActor
final class VervangbeeldWapoTests: XCTestCase {
    static func wapo(_ n: Int) -> String { "https://www.washingtonpost.com/world/2026/11/13/stuk-\(n)/" }
    static let stukken: [(bron: String, naam: String, kop: String, intro: String, url: String)] = [
        ("wapo", "The Washington Post", "Ukraine’s grain corridor holds as winter shipping season begins", "Insurers are returning to the Black Sea route, but port strikes keep costs high.", wapo(26)),
        ("nos", "NOS", "Storm trekt over het noorden: code oranje voor de Waddeneilanden", "Veerdiensten varen aangepast en het KNMI waarschuwt voor zware windstoten.", "https://nos.nl/artikel/1"),
        ("wapo", "The Washington Post", "In Brazil, a drought reshapes the Amazon’s river towns", "Boats sit on dry riverbeds as communities wait for the rains.", wapo(48)),
        ("nrc", "NRC", "Een nieuwe kaart van de zeebodem onder Antarctica", "Onderzoekers brachten valleien in kaart die het smelten van het ijs kunnen versnellen.", "https://www.nrc.nl/nieuws/1"),
        ("wapo", "The Washington Post", "Japan’s rural schools reopen as young families return", "Remote work keeps drawing households away from Tokyo.", wapo(57)),
    ]
    var items: [Item] {
        Self.stukken.map { k in
            var it = Item(id: "\(k.bron):\(k.url)", source: k.bron, title: k.kop, url: k.url)
            it.sourceName = k.naam
            it.summary = k.intro
            return it
        }
    }

    // De oude keuze (tot 14 november): hash mod 18, doorschuiven met drie; alleen voor de voor-still.
    func oudPlan(_ ids: [String]) -> [String: Int] {
        var out: [String: Int] = [:]
        var prev: Int?
        for id in ids {
            var k = Int(Placeholder.fnv1a(id) % 18)
            if let p = prev, Placeholder.set(k) == Placeholder.set(p) { k = (k + 3) % 18 }
            out[id] = k
            prev = k
        }
        return out
    }

    func testWapoKrijgtGeenEclipsMeer() {
        let ids = items.map(\.id)
        XCTAssertEqual(ids.map { oudPlan(ids)[$0]! + 1 }, [14, 6, 14, 2, 14]) // zo stond het
        let plan = Placeholder.plan(items.map { ($0, BeeldloosView.Kind.tijdlijn) })
        XCTAssertEqual(ids.map { plan[$0]! + 1 }, [3, 6, 1, 5, 3]) // gelijk aan het web
        XCTAssertFalse(plan.values.contains { PlaceholderBeelden.uit.contains($0) })
    }

    private func stroom(_ plan: [String: Int], form: ItemRow.Form, store: HootStore) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, it in
                if i > 0 { Rule().padding(.vertical, Space.s2) }
                ItemRow(item: it, number: nil, label: "Wereld", why: nil, story: nil, form: form)
            }
        }
        .padding(.horizontal, 16)
        .background(Theme.paper)
        .environment(\.placeholderPlan, plan)
        .environment(store).environment(Reader()).environment(\.isWide, false)
    }

    func testStills() async throws {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Hoot-design/vervangbeeld-2026-11-14/een-beeld")
        let write = FileManager.default.fileExists(atPath: dir.path)
        let store = HootStore()
        let ids = items.map(\.id)
        let breedte: CGFloat = 390
        for (formNaam, form) in [("tijdlijn", ItemRow.Form.tijdlijn), ("krant", ItemRow.Form.krant)] {
            let kind: BeeldloosView.Kind = form == .krant ? .krant : .tijdlijn
            let plannen = [("voor", oudPlan(ids)), ("na", Placeholder.plan(items.map { ($0, kind) }))]
            for (label, plan) in plannen {
                for (thema, scheme, nacht) in [("light", ColorScheme.light, false), ("dark", ColorScheme.dark, false), ("night", ColorScheme.dark, true)] {
                    let inhoud = stroom(plan, form: form, store: store).environment(\.colorScheme, scheme).environment(\.nachtActief, nacht)
                    let h = UIHostingController(rootView: inhoud.frame(width: breedte)).sizeThatFits(in: CGSize(width: breedte, height: 8000)).height
                    let host = UIHostingController(rootView: inhoud.frame(width: breedte, height: h, alignment: .top))
                    host.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
                    let frame = CGRect(x: 0, y: 0, width: breedte, height: h)
                    host.view.frame = frame
                    let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
                    host.view.layoutIfNeeded()
                    try await Task.sleep(for: .milliseconds(300))
                    let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                    let naam = "\(label)-ios-\(formNaam)-\(thema).png"
                    let attachment = XCTAttachment(image: image); attachment.name = naam; attachment.lifetime = .keepAlways; add(attachment)
                    if write, let png = image.pngData() { try png.write(to: dir.appendingPathComponent(naam)) }
                    window.isHidden = true
                }
            }
        }
    }
}
