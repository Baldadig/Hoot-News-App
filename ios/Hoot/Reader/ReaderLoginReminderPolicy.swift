import Foundation

// Alleen lokaal per stabiele bron-id. Eerst vrij te sluiten; na zeven etmalen hooguit één
// herinnering. Die herinnering wordt bij het tonen verbruikt, ook als de lezer zelf wordt gesloten.
struct ReaderLoginReminderPolicy {
    struct Record: Codable, Equatable {
        let dismissedAt: Date
        var reminderShown = false
    }
    static let delay: TimeInterval = 7 * 24 * 60 * 60
    private(set) var records: [String: Record]
    init(data: Data = Data()) {
        records = (try? JSONDecoder().decode([String: Record].self, from: data)) ?? [:]
    }
    var data: Data { (try? JSONEncoder().encode(records)) ?? Data() }

    mutating func claim(for source: String, now: Date = .now) -> Bool {
        guard !source.isEmpty else { return false }
        guard var record = records[source] else { return true }
        guard !record.reminderShown, now >= record.dismissedAt.addingTimeInterval(Self.delay) else { return false }
        record.reminderShown = true
        records[source] = record
        return true
    }
    mutating func dismiss(for source: String, now: Date = .now) {
        guard !source.isEmpty, records[source] == nil else { return }
        records[source] = Record(dismissedAt: now)
    }
}

// Lees vóór elke claim opnieuw: twee leesvensters mogen niet elk dezelfde herinnering tonen.
// MainActor maakt lezen + reserveren binnen dit proces één sequentiële stap.
@MainActor
final class ReaderLoginReminderStore {
    static let key = "hoot.readerLoginReminders.v1"
    let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    func claim(for source: String, now: Date = .now) -> Bool {
        var policy = ReaderLoginReminderPolicy(data: defaults.data(forKey: Self.key) ?? Data())
        guard policy.claim(for: source, now: now) else { return false }
        defaults.set(policy.data, forKey: Self.key)
        return true
    }
    func dismiss(for source: String, now: Date = .now) {
        var policy = ReaderLoginReminderPolicy(data: defaults.data(forKey: Self.key) ?? Data())
        policy.dismiss(for: source, now: now)
        defaults.set(policy.data, forKey: Self.key)
    }
}
