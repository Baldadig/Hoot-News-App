import Foundation
import SwiftUI

// Dezelfde regeldata als shared/edition-display.mjs; build:core houdt de resource bytegelijk.
enum EditionDisplay {
    private struct Rule: Decodable, Sendable { let source: String; let flags: String }
    private struct Intro: Decodable, Sendable { let maxPrefixes: Int; let knownAuthor: String; let rules: [Rule] }
    private struct Headline: Decodable, Sendable { let largeMax: Int; let mediumMax: Int; let halfLines: Int }
    private struct Policy: Decodable, Sendable { let intro: Intro; let headline: Headline }
    static var resourceURL: URL? { Bundle.main.url(forResource: "edition-display", withExtension: "json") }
    private static let policy: Policy? = resourceURL.flatMap { try? Data(contentsOf: $0) }.flatMap { try? JSONDecoder().decode(Policy.self, from: $0) }
    private static let rules: [NSRegularExpression] = (policy?.intro.rules ?? []).compactMap {
        try? NSRegularExpression(pattern: $0.source, options: $0.flags.contains("i") ? [.caseInsensitive] : [])
    }
    private static let spaces = try! NSRegularExpression(pattern: #"\s+"#)
    static func squeeze(_ value: String) -> String {
        spaces.stringByReplacingMatches(in: value, range: NSRange(location: 0, length: (value as NSString).length), withTemplate: " ").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    static func cleanIntro(_ text: String, author: String? = nil) -> String {
        var value = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        guard let policy else { return squeeze(value) }
        let named: NSRegularExpression?
        if let author, author.trimmingCharacters(in: .whitespacesAndNewlines).count > 1, (author as NSString).length <= 120 {
            let escaped = NSRegularExpression.escapedPattern(for: author.trimmingCharacters(in: .whitespacesAndNewlines))
            named = try? NSRegularExpression(pattern: policy.intro.knownAuthor.replacingOccurrences(of: "{author}", with: escaped), options: [.caseInsensitive])
        } else { named = nil }
        func strip(_ original: String) -> String {
            var v = original
            for re in rules + (named.map { [$0] } ?? []) {
                v = re.stringByReplacingMatches(in: v, range: NSRange(location: 0, length: (v as NSString).length), withTemplate: "").trimmingCharacters(in: .whitespacesAndNewlines)
            }
            return v
        }
        for _ in 0..<policy.intro.maxPrefixes {
            let next = strip(value)
            if next == value { break }
            value = next
        }
        if strip(value) != value { return "" }
        return squeeze(value)
    }
    static func headlineTier(_ title: String) -> String {
        guard let h = policy?.headline else { return "large" }
        let n = (title as NSString).length
        return n <= h.largeMax ? "large" : n <= h.mediumMax ? "medium" : "compact"
    }
    static func headlineStyle(_ title: String) -> Font.TextStyle {
        switch headlineTier(title) { case "medium": .title; case "compact": .title2; default: .largeTitle }
    }
}
