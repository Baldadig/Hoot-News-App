import XCTest
@testable import Hoot

final class ReaderLoginReminderTests: XCTestCase {
    let start = Date(timeIntervalSince1970: 1_800_000_000)
    func testSevenDayBoundaryAndSingleReminder() {
        var policy = ReaderLoginReminderPolicy()
        XCTAssertTrue(policy.claim(for: "atlantic", now: start))
        policy.dismiss(for: "atlantic", now: start)
        XCTAssertFalse(policy.claim(for: "atlantic", now: start))
        XCTAssertFalse(policy.claim(for: "atlantic", now: start.addingTimeInterval(ReaderLoginReminderPolicy.delay - 1)))
        XCTAssertTrue(policy.claim(for: "atlantic", now: start.addingTimeInterval(ReaderLoginReminderPolicy.delay)))
        XCTAssertFalse(policy.claim(for: "atlantic", now: start.addingTimeInterval(ReaderLoginReminderPolicy.delay + 1)))
        policy.dismiss(for: "atlantic", now: start.addingTimeInterval(ReaderLoginReminderPolicy.delay))
        XCTAssertFalse(policy.claim(for: "atlantic", now: start.addingTimeInterval(365 * 86400)))
    }
    func testPersistenceSourcesAndClockReversal() {
        var policy = ReaderLoginReminderPolicy()
        policy.dismiss(for: "atlantic", now: start)
        var restored = ReaderLoginReminderPolicy(data: policy.data)
        XCTAssertFalse(restored.claim(for: "atlantic", now: start.addingTimeInterval(-1)))
        XCTAssertTrue(restored.claim(for: "nrc", now: start))
        XCTAssertTrue(restored.claim(for: "atlantic", now: start.addingTimeInterval(ReaderLoginReminderPolicy.delay)))
        var afterReminder = ReaderLoginReminderPolicy(data: restored.data)
        XCTAssertFalse(afterReminder.claim(for: "atlantic", now: start.addingTimeInterval(30 * 86400)))
    }
    func testInvalidStorageAndNoAnonymousSource() {
        var policy = ReaderLoginReminderPolicy(data: Data("geen JSON".utf8))
        XCTAssertTrue(policy.claim(for: "nieuwe-bron", now: start))
        XCTAssertFalse(policy.claim(for: "", now: start))
        policy.dismiss(for: "", now: start)
        XCTAssertTrue(policy.records.isEmpty)
    }
}

@MainActor
final class ReaderLoginReminderStoreTests: XCTestCase {
    func testTwoWindowsConsumeTheSameReminderOnce() {
        let suite = "hoot-reader-reminder-test-" + UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let first = ReaderLoginReminderStore(defaults: defaults)
        let second = ReaderLoginReminderStore(defaults: defaults)
        let start = Date(timeIntervalSince1970: 1_800_000_000)
        first.dismiss(for: "atlantic", now: start)
        XCTAssertFalse(second.claim(for: "atlantic", now: start))
        let later = start.addingTimeInterval(ReaderLoginReminderPolicy.delay)
        XCTAssertTrue(first.claim(for: "atlantic", now: later))
        XCTAssertFalse(second.claim(for: "atlantic", now: later))
        XCTAssertTrue(second.claim(for: "nrc", now: later))
    }
}
