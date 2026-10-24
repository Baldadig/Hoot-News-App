import Foundation

// De vormen van de Hoot-API (hootnews.nl/api/feed en /api/vak). Alles optioneel wat de server
// soms weglaat, zodat een nieuw of ontbrekend veld de app nooit laat vastlopen.

struct Source: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    var kind: String?
    var cat: String?
    var optional: Bool?
    var paid: Bool?
    var lang: String?
    var about: String?
    var avatar: String?
    var brandColor: String?
    var ok: Bool?
}

struct Item: Codable, Identifiable, Hashable {
    let id: String
    let source: String
    var kind: String?
    var sourceName: String?
    var avatar: String?
    var brandColor: String?
    var storyId: String?
    let title: String
    var summary: String?
    let url: String
    var image: String?
    var publishedAt: String?
    var author: String?
    var readMin: Int?
    var type: String?

    var date: Date? { publishedAt.flatMap(HootDate.parse) }
    var link: URL? { URL(string: url) }
}

struct Story: Codable, Identifiable, Hashable {
    let id: String
    var leadId: String?
    var itemIds: [String]
    var sourceCount: Int?
    var sourceNames: [String]?
    var latestAt: String?
}

struct EntryTerm: Codable, Hashable {
    var term: String?
    var via: String?
}

struct EditionEntry: Codable, Hashable {
    let kind: String
    let id: String
    var leadId: String?
    var desk: String?
    var sourceCount: Int?
    var terms: [EntryTerm]?
}

struct Edition: Codable, Hashable {
    let id: String
    var slot: String?
    var date: String?
    var next: String?
    var entries: [EditionEntry]
    var items: [Item]?
}

struct FeedMeta: Codable, Hashable {
    var updatedAt: String?
    var parts: [String: String]?
    var related: String?
}

struct FeedStart: Codable {
    var sources: [Source]
    var stories: [Story]
    var edition: Edition?
    var meta: FeedMeta
}

struct FeedPart: Codable {
    var items: [Item]
}

struct FeedRelated: Codable {
    var related: [Item]
}

// ---- Digest ----
struct DigestAlso: Codable, Hashable {
    let sourceName: String
    let url: String
    var title: String?
}

struct DigestItem: Codable, Identifiable, Hashable {
    let id: String
    let source: String
    var sourceName: String?
    var avatar: String?
    let title: String
    var summary: String?
    let url: String
    var image: String?
    var publishedAt: String?
    var author: String?
    var why: [String]?
    var via: String?
    var also: [DigestAlso]?

    var asItem: Item {
        Item(id: id, source: source, kind: "article", sourceName: sourceName, avatar: avatar, title: title, summary: summary, url: url, image: image, publishedAt: publishedAt, author: author)
    }
}

struct DigestField: Codable, Identifiable, Hashable {
    let id: String
    let label: String
    var about: String?
    var count: Int?
    var top: [DigestItem]
    var more: [DigestItem]
}

struct Digest: Codable, Hashable {
    let id: String
    var week: Int?
    var preview: Bool?
    var from: String?
    var to: String?
    var next: String?
    var fields: [DigestField]
}

enum HootDate {
    private static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain = ISO8601DateFormatter()

    static func parse(_ s: String) -> Date? { fractional.date(from: s) ?? plain.date(from: s) }

    // "5 min geleden", "3 uur geleden", "gisteren", "3 dagen geleden"
    static func ago(_ date: Date?, now: Date = .now) -> String {
        guard let date else { return "" }
        let s = max(0, now.timeIntervalSince(date))
        if s < 60 { return "zojuist" }
        if s < 3600 { return "\(Int(s / 60)) min geleden" }
        if s < 86400 { return "\(Int(s / 3600)) uur geleden" }
        let d = Int(s / 86400)
        return d == 1 ? "gisteren" : "\(d) dagen geleden"
    }
}
