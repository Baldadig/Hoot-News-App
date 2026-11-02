import XCTest
@testable import Hoot

@MainActor
final class ThemeProfileTests: XCTestCase {
    nonisolated(unsafe) private var kept: [String: Any] = [:]
    override func setUp() {
        kept = UserDefaults.standard.dictionaryRepresentation().filter { $0.key.hasPrefix("hoot.") }
        for key in kept.keys { UserDefaults.standard.removeObject(forKey: key) }
    }
    override func tearDown() {
        for key in UserDefaults.standard.dictionaryRepresentation().keys where key.hasPrefix("hoot.") {
            UserDefaults.standard.removeObject(forKey: key)
        }
        for (key, value) in kept { UserDefaults.standard.set(value, forKey: key) }
        super.tearDown()
    }
    private func apply(_ prefs: [String: Any], to store: HootStore) throws {
        store.applyRemote(prefs: try JSONSerialization.data(withJSONObject: prefs), read: [], saved: nil)
    }
    func testLocalChangeTicksOnlyOnceAndExportsPlainValidatedStrings() {
        let store = HootStore(), before = store.syncTick
        ThemePreferences(theme: "night", dark: "night").write()
        store.themePreferencesChanged()
        XCTAssertEqual(store.syncTick, before + 1)
        store.themePreferencesChanged()
        UserDefaults.standard.set("irrelevant", forKey: "hoot.test.other")
        store.themePreferencesChanged()
        XCTAssertEqual(store.syncTick, before + 1)
        XCTAssertEqual(store.syncedPrefs["theme"] as? String, "night")
        XCTAssertEqual(store.syncedPrefs["themeDark"] as? String, "night")
        XCTAssertTrue(UserDefaults.standard.object(forKey: "hoot.weergave") is String)
    }
    func testRemoteChangeDoesNotEchoIncludingDelayedNotification() throws {
        let store = HootStore(), before = store.syncTick
        try apply(["theme": "night", "themeDark": "night"], to: store)
        store.themePreferencesChanged()
        XCTAssertEqual(store.syncTick, before)
        XCTAssertEqual(ThemePreferences.read(), ThemePreferences(theme: "night", dark: "night"))
        try apply(["theme": "light", "themeDark": "dark"], to: store)
        store.themePreferencesChanged()
        XCTAssertEqual(store.syncTick, before)
    }
    func testOldProfileKeepsLocalChoiceAndInvalidStringsFallBack() throws {
        ThemePreferences(theme: "night", dark: "night").write()
        let store = HootStore()
        try apply(["layout": "krant"], to: store)
        XCTAssertEqual(ThemePreferences.read().theme, "night")
        try apply(["theme": "invalid", "themeDark": "light"], to: store)
        XCTAssertEqual(ThemePreferences.read(), ThemePreferences(theme: "system", dark: "dark"))
    }
    func testProfileRoundTripToFreshLocalClientWithoutAccountOrNetwork() throws {
        let first = HootStore()
        ThemePreferences(theme: "system", dark: "night").write()
        first.themePreferencesChanged()
        let exported = first.syncedPrefs
        ThemePreferences(theme: "light", dark: "dark").write()
        let second = HootStore(), before = second.syncTick
        try apply(exported, to: second)
        second.themePreferencesChanged()
        XCTAssertEqual(second.syncedPrefs["theme"] as? String, "system")
        XCTAssertEqual(second.syncedPrefs["themeDark"] as? String, "night")
        XCTAssertEqual(second.syncTick, before)
    }
}
