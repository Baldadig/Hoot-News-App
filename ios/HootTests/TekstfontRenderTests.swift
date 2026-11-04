import XCTest
import SwiftUI
import WebKit
@testable import Hoot

// Renderbewijs voor het tekstfont (Newsreader + Inter): Editie, Stroom, lezer en welkom op een
// Pro Max (440 × 956), in Licht en Nacht, bij Large en AX5. Als bijlagen van de toets, voor de keuring.
@MainActor final class TekstfontRenderTests: XCTestCase {
    static let longTitle = "Nationale ombudsman: overheid voerde onbetrouwbaar beleid voor boeren"

    func testSchermenLichtNachtAX5() async throws {
        let store = HootStore(), account = Account(), reader = Reader()
        await store.load()
        let suite = "hoot-tekstfont-render-" + UUID().uuidString, defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        for (mode, value, scheme) in [("licht", "light", ColorScheme.light), ("nacht", "night", ColorScheme.dark)] {
            defaults.set(value, forKey: "hoot.weergave"); defaults.set("night", forKey: "hoot.weergave.donker")
            for (label, size, category) in [("normaal", DynamicTypeSize.large, UIContentSizeCategory.large), ("ax5", DynamicTypeSize.accessibility5, UIContentSizeCategory.accessibilityExtraExtraExtraLarge)] {
                let item = Item(id: "tekstfont-lezer", source: "nos", title: Self.longTitle, url: "https://nos.nl/")
                let text = "De Nationale ombudsman vindt dat de overheid boeren jarenlang <em>onbetrouwbaar</em> heeft behandeld. Verkiezingsuitslagen en arbeidsongeschiktheidsverzekeringen kwamen ook <strong>ter sprake</strong>."
                let article = Article(title: item.title, content: (0..<6).map { _ in "<p>\(text)</p>" }.joined(), length: 1200)
                let html = ReaderHTML.page(article, item: item, sourceName: "NOS", size: 1, night: value == "night", typeSize: size, width: 440)
                let views: [(String, AnyView)] = [
                    ("editie", AnyView(EditionView())),
                    ("stroom", AnyView(StreamView())),
                    ("lezer", AnyView(ArticleWebView(html: html, baseURL: nil))),
                    ("onboarding", AnyView(WelcomeView(onDone: {}))),
                ]
                for (screen, view) in views {
                    let content = view.environment(store).environment(account).environment(reader).environment(EditionAlerts.shared).tint(Theme.ink).toggleStyle(InkSwitch())
                        .environment(\.colorScheme, scheme).environment(\.dynamicTypeSize, size).modifier(HootWeergave()).defaultAppStorage(defaults)
                    try await render(content, category: category, scheme: scheme, name: "ios-promax-\(screen)-\(mode)-\(label)", settle: screen == "lezer" ? 3500 : 1600)
                }
            }
        }
    }

    private func render<V: View>(_ content: V, category: UIContentSizeCategory, scheme: ColorScheme, name: String, settle: Int) async throws {
        let host = UIHostingController(rootView: content)
        host.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
        host.traitOverrides.preferredContentSizeCategory = category
        host.view.frame = CGRect(x: 0, y: 0, width: 440, height: 956)
        let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
        host.view.setNeedsLayout(); host.view.layoutIfNeeded()
        try await Task.sleep(for: .milliseconds(settle))
        let image = UIGraphicsImageRenderer(size: host.view.bounds.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
        let attachment = XCTAttachment(image: image); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
        window.isHidden = true
    }
}
