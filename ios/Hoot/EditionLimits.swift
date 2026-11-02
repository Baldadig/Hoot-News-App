import Foundation

enum EditionLimits {
    private struct Limits: Decodable, Sendable { let target: Int; let auditBelow: Int; let floor: Int }
    static var resourceURL: URL? { Bundle.main.url(forResource:"edition-limits",withExtension:"json") }
    private static let limits = resourceURL.flatMap{try? Data(contentsOf:$0)}.flatMap{try? JSONDecoder().decode(Limits.self,from:$0)}
    static var target: Int { limits?.target ?? 10 }
    static var auditBelow: Int { limits?.auditBelow ?? 6 }
    static var floor: Int { limits?.floor ?? 4 }
    static func hasMinimum(_ count: Int) -> Bool { count >= floor }
}
