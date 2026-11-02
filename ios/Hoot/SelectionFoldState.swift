import Foundation
import Observation

// Uitsluitend lokale leesbediening, per eigenaar; geen onderdeel van syncedPrefs.
@MainActor @Observable
final class SelectionFoldState {
    @ObservationIgnored private let defaults: UserDefaults
    private var owner: String?
    private var stored: Set<String> = []
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    static func key(_ owner: String) -> String { "hoot.selectie.ui.v1." + owner }
    func closed(for reader: String, selected: [String]) -> Set<String> {
        let value: Set<String>
        if owner == reader { value = stored }
        else if let data = defaults.data(forKey: Self.key(reader)), let ids = try? JSONDecoder().decode([String].self, from: data) { value = Set(ids) }
        else { value = [] }
        return value.intersection(selected)
    }
    func set(_ value: Set<String>, for reader: String, selected: [String]) {
        owner = reader
        stored = value.intersection(selected)
        defaults.set(try? JSONEncoder().encode(stored.sorted()), forKey: Self.key(reader))
    }
    func activate(_ reader: String, selected: [String], persist: Bool = true) {
        if persist { set(closed(for: reader, selected: selected), for: reader, selected: selected) }
        else {
            // Nog de onderwerpen van een vorige sessie? De nieuwe eigenaar niet daarmee overschrijven.
            owner = reader
            stored = defaults.data(forKey: Self.key(reader)).flatMap { try? JSONDecoder().decode([String].self, from: $0) }.map(Set.init) ?? []
        }
    }
}
