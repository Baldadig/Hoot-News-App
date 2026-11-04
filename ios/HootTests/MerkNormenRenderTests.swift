import XCTest
import SwiftUI
@testable import Hoot

// Renderbewijs voor het pakket Merk en normen (1.1.0): lege bladzijden, bronlogo's en monogrammen,
// en de deelkaart, in Licht, Donker en Nacht. Beelden als bijlage (xcresult).
@MainActor final class MerkNormenRenderTests: XCTestCase {
    private let modes: [(String, String, ColorScheme)] = [("licht", "light", .light), ("donker", "dark", .dark), ("nacht", "night", .dark)]

    func testLegeBladzijdenEnBronmerken() async throws {
        let suite = "hoot-merk-render-" + UUID().uuidString, defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        // Een doorzichtig logo met een donkere P (zoals Het Parool): het vlak erachter moet zichtbaar zijn.
        var parool = Item(id: "m0", source: "parool", title: "Kop", url: "https://parool.nl/")
        parool.avatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABAklEQVRoge2WTWoCQRBGCyHuxvq+noMpIc6ZFK8hXknBJIvkBtH9SDO6EWlxlOmuUA9qNw31un6mRRzHcRynByTbRwLAEcAOwIZkIyJjsSRwIz5V9d2ywKUyKxEZmRVgJ7E0LUCyVdWZaQGS34MOdiqZ62/ruq7iDcctlDoXQpgXKXBBVQngJ3F2XbRAJN5yYph3FgQmCYG/4gVIqnWBxmwLVVVVA/g1N8Sh6/vmTvJtCOGjCIGe8VXMj6xPAJgOlvyrBQAsBk3+lQLoXqImn9P7wdvmGQEABwDbuCrP2+YtW/L3BMQCdIHM0CuQGXoFMkOvQGboFcgMrVfAcRzH+RecAH4W/XfoGAv1AAAAAElFTkSuQmCC"
        let marks = HStack(spacing: Space.s4) {
            SourceMark(item: parool, size: 44)
            SourceMark(item: Item(id: "m1", source: "rtl", title: "Kop", url: "https://rtl.nl/"), size: 44)
            SourceMark(item: Item(id: "m2", source: "guardian", title: "Kop", url: "https://theguardian.com/"), size: 44)
            SourceAvatar(source: Source(id: "verge", name: "The Verge"), size: 44)
        }
        for (name, value, scheme) in modes {
            defaults.set(value, forKey: "hoot.weergave")
            let page = HStack(alignment: .top, spacing: 0) {
                EmptyState(title: "Nog niets bewaard", systemImage: "bookmark", text: "Tik op de bladwijzer bij een verhaal.").frame(width: 390)
                EmptyState(title: "Zoek in je nieuws", systemImage: "magnifyingglass", text: "In koppen en intro’s van je Stroom.").frame(width: 390)
                EmptyState(title: "Er is nog geen Editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.").frame(width: 390)
            }
            .overlay(alignment: .bottom) { marks.padding(.bottom, Space.s4) }
            .frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.paper)
            .environment(\.colorScheme, scheme).modifier(HootWeergave()).defaultAppStorage(defaults)
            try await render(page, width: 1170, height: 640, scheme: scheme, name: "ios-leeg-\(name)")
        }
        defaults.set("light", forKey: "hoot.weergave")
        for (label, size) in [("xxxl", DynamicTypeSize.xxxLarge), ("ax5", DynamicTypeSize.accessibility5)] {
            let page = EmptyState(title: "Nog niets bewaard", systemImage: "bookmark", text: "Tik op de bladwijzer bij een verhaal.")
                .frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.paper)
                .environment(\.dynamicTypeSize, size).modifier(HootWeergave()).defaultAppStorage(defaults)
            try await render(page, width: 390, height: 844, scheme: .light, name: "ios-leeg-licht-\(label)")
        }
    }

    func testDeelkaartMetUitgeverslogo() throws {
        for (source, name) in [("nos", "NOS"), ("nrc", "NRC"), ("guardian", "The Guardian"), ("onbekend", "Onbekende Bron")] {
            var item = Item(id: "kaart-" + source, source: source, title: "De stad krijgt meer groen en minder auto’s in het centrum", url: "https://nos.nl/a")
            item.sourceName = name; item.section = "Binnenland"
            for format in DeelKaartFormat.allCases {
                let data = try XCTUnwrap(DeelKaart(item: item, format: format).png())
                let attachment = XCTAttachment(data: data, uniformTypeIdentifier: "public.png")
                attachment.name = "ios-deelkaart-\(source)-\(format.rawValue)"; attachment.lifetime = .keepAlways; add(attachment)
            }
        }
    }

    private func render<V: View>(_ content: V, width: Double, height: Double, scheme: ColorScheme, name: String) async throws {
        let host = UIHostingController(rootView: content)
        host.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
        host.view.frame = CGRect(x: 0, y: 0, width: width, height: height)
        let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
        host.view.setNeedsLayout(); host.view.layoutIfNeeded()
        try await Task.sleep(for: .milliseconds(2500))
        let image = UIGraphicsImageRenderer(size: host.view.bounds.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
        let attachment = XCTAttachment(image: image); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
        window.isHidden = true
    }
}
