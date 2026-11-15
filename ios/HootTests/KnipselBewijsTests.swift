import XCTest
import SwiftUI
@testable import Hoot

// Knipsel (15 november): de Editie en de Stroom met beeldloze stukken, met de echte LeadCard en ItemRow en de
// knipsel-bitmaps, in Licht, Donker en Nacht op de breedte van een iPhone Pro Max (440). Schrijft JPEG's naar
// bewijs-knipsel/ in de repo als die map bestaat; komt ook als bijlage in de testresultaten.
@MainActor
final class KnipselBewijsTests: XCTestCase {
    static let koppen: [(String, String, String, String)] = [
        ("nos", "NOS", "Storm trekt over het noorden: code oranje voor de Waddeneilanden", "Veerdiensten varen aangepast en het KNMI waarschuwt voor zware windstoten."),
        ("nrc", "NRC", "Een nieuwe kaart van de zeebodem onder Antarctica", "Onderzoekers brachten valleien in kaart die het smelten van het ijs kunnen versnellen."),
        ("volkskrant", "de Volkskrant", "Kabinet wil boeren meer ruimte geven bij stikstofregels", "Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders."),
        ("nos", "NOS", "Rijkswaterstaat sluit de Afsluitdijk een weekend", "Het verkeer wordt omgeleid via Lelystad. Fietsers kunnen er wel langs."),
    ]
    var items: [Item] {
        Self.koppen.enumerated().map { i, k in
            var it = Item(id: "\(k.0):https://voorbeeld.nl/knipsel/\(i + 3)", source: k.0, title: k.2, url: "https://voorbeeld.nl/knipsel/\(i + 3)")
            it.sourceName = k.1
            it.summary = k.3
            return it
        }
    }

    func testBewijsEditieEnStroom() async throws {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("bewijs-knipsel")
        let write = FileManager.default.fileExists(atPath: dir.path)
        let store = HootStore()
        let items = self.items
        let breedte: CGFloat = 440
        for kind in ["editie", "stroom"] {
            let plan = Placeholder.plan(items.enumerated().map { ($0.element, kind == "editie" && $0.offset == 0 ? BeeldloosView.Kind.lead : .tijdlijn) })
            XCTAssertEqual(plan.count, items.count)
            XCTAssertFalse(plan.values.contains { PlaceholderBeelden.uit.contains($0) })
            for (thema, scheme, nacht) in [("licht", ColorScheme.light, false), ("donker", ColorScheme.dark, false), ("nacht", ColorScheme.dark, true)] {
                let inhoud = VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(items.enumerated()), id: \.offset) { i, it in
                        if kind == "editie" && i == 0 {
                            LeadCard(item: it, number: 1, label: "Binnenland", why: "Groot nieuws", story: nil)
                        } else {
                            if i > 0 { Rule().padding(.vertical, Space.s2) }
                            ItemRow(item: it, number: kind == "editie" ? i + 1 : nil, label: "Binnenland", why: nil, story: nil, form: .tijdlijn)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .background(Theme.paper)
                .environment(\.placeholderPlan, plan)
                .environment(store).environment(Reader()).environment(\.isWide, false)
                .environment(\.colorScheme, scheme).environment(\.nachtActief, nacht)
                let h = UIHostingController(rootView: inhoud.frame(width: breedte)).sizeThatFits(in: CGSize(width: breedte, height: 9000)).height
                let host = UIHostingController(rootView: inhoud.frame(width: breedte, height: h, alignment: .top))
                host.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
                let frame = CGRect(x: 0, y: 0, width: breedte, height: h)
                host.view.frame = frame
                let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
                host.view.layoutIfNeeded()
                try await Task.sleep(for: .milliseconds(400))
                // Vier stukken: een venster hoger dan de grootste textuur (8192 pixels op 3x) blijft leeg.
                let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                let naam = "ios-\(kind)-\(thema).jpg"
                let attachment = XCTAttachment(image: image); attachment.name = naam; attachment.lifetime = .keepAlways; add(attachment)
                if write, let jpg = image.jpegData(compressionQuality: 0.85) { try jpg.write(to: dir.appendingPathComponent(naam)) }
                window.isHidden = true
            }
        }
    }
}
