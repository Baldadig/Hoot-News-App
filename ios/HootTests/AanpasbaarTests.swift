import XCTest
import SwiftUI
@testable import Hoot

// Principe (17 november): elke keuze is altijd en overal aan te passen. 'Meer hiervan' staat in Wat Hoot
// leerde als eigen groep, per onderwerp terug te draaien; Stel Hoot opnieuw in zet de eenmalige tip terug.
@MainActor final class AanpasbaarTests: XCTestCase {
    func testMeerHiervanKomtApartUitDeBundel() async throws {
        let input: [String: Any] = ["interests": ["tech"], "topics": ["ai", "privacy"], "taste": ["topics": ["ai": 6, "ruimte": 8], "sources": [:]]]
        let data = try JSONSerialization.data(withJSONObject: input)
        let s = try await EditionEngine.shared.profileSummary(input: data)
        XCTAssertEqual(s.more, ["ruimte", "ai"], "sterkste 'meer hiervan' eerst")
        XCTAssertEqual(s.chosen, ["privacy"], "Gekozen is alleen je interesses")
        // Ongedaan maken (op nul): weer gewoon gekozen.
        let terug: [String: Any] = ["interests": ["tech"], "topics": ["ai", "privacy"], "taste": ["topics": ["ai": 0, "ruimte": 0], "sources": [:]]]
        let t = try await EditionEngine.shared.profileSummary(input: try JSONSerialization.data(withJSONObject: terug))
        XCTAssertEqual(t.more, [])
        XCTAssertEqual(t.chosen, ["ai", "privacy"])
    }

    func testOudereBundelZonderMeerGeeftLegeLijst() throws {
        let s = try JSONDecoder().decode(ProfileSummary.self, from: Data(#"{"chosen":["ai"],"learned":[],"less":["f1"]}"#.utf8))
        XCTAssertEqual(s, ProfileSummary(chosen: ["ai"], more: [], learned: [], less: ["f1"]))
    }

    func testOpnieuwInstellenZetDeKantenTipTerug() throws {
        let suite = "hoot.test.aanpasbaar"
        let d = try XCTUnwrap(UserDefaults(suiteName: suite))
        d.set(true, forKey: KantenTip.key)
        KantenTip.terug(d)
        XCTAssertNil(d.object(forKey: KantenTip.key))
        XCTAssertFalse(d.bool(forKey: KantenTip.key))
        d.removePersistentDomain(forName: suite)
    }

    // Renderbewijs: Instellingen › Editie met 'Meer hiervan', voor en na Ongedaan maken (Pro Max, Licht).
    // Alleen met HOOT_BOUW (de map voor de schermen; TEST_RUNNER_HOOT_BOUW bij xcodebuild).
    func testMeerHiervanRenderen() async throws {
        guard let map = ProcessInfo.processInfo.environment["HOOT_BOUW"] else { throw XCTSkip("geen HOOT_BOUW") }
        let store = HootStore(), account = Account()
        let oud = (store.interests, store.topics, store.taste)
        defer { store.interests = oud.0; store.topics = oud.1; store.taste = oud.2 }
        store.interests = ["tech"]; store.topics = ["ai", "privacy", "tech"]
        store.taste = Taste(topics: ["ruimte": 8, "ai": 6])
        let suite = "hoot-aanpasbaar-" + UUID().uuidString, defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        defaults.set("light", forKey: "hoot.weergave")
        func still(_ naam: String) async throws {
            let content = NavigationStack { EditieSettingsView() }.modifier(HootLetterMaat()).environment(store).environment(account).environment(EditionAlerts.shared)
                .tint(Theme.ink).toggleStyle(InkSwitch()).modifier(HootWeergave()).defaultAppStorage(defaults)
            let frame = CGSize(width: 440, height: 956)
            let host = UIHostingController(rootView: content)
            host.overrideUserInterfaceStyle = .light
            host.view.frame = CGRect(origin: .zero, size: frame)
            let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
            host.view.layoutIfNeeded()
            try await Task.sleep(for: .milliseconds(2500)) // de samenvatting komt uit de bundel
            let image = UIGraphicsImageRenderer(size: frame).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
            try XCTUnwrap(image.pngData()).write(to: URL(fileURLWithPath: map).appendingPathComponent("meer-hiervan-ios-\(naam).png"))
            window.isHidden = true
        }
        let voor = await store.profileSummary()
        XCTAssertEqual(voor.more, ["ruimte", "ai"])
        try await still("voor")
        store.restoreLess("ruimte") // wat de knop Ongedaan maken doet
        let na = await store.profileSummary()
        XCTAssertEqual(na.more, ["ai"])
        XCTAssertEqual(store.taste.topics["ruimte"], 0)
        try await still("na")
    }
}
