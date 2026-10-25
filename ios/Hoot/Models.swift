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
    var updatedAt: String? = nil
    var parts: [String: String]? = nil
    var related: String? = nil
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

// ---- Robuust decoderen ----
// Eén ongeldig element (bijvoorbeeld een verhaal zonder `itemIds`) mag nooit een heel antwoord
// onbruikbaar maken: lijsten decoderen we per element en slaan kapotte elementen over.
private struct Lossy<T: Decodable>: Decodable {
    let value: T?
    init(from decoder: Decoder) throws { value = try? T(from: decoder) }
}

extension KeyedDecodingContainer {
    func lossy<T: Decodable>(_ type: [T].Type, forKey key: Key) -> [T] {
        ((try? decodeIfPresent([Lossy<T>].self, forKey: key)) ?? nil)?.compactMap(\.value) ?? []
    }
}

extension FeedStart {
    enum CodingKeys: String, CodingKey { case sources, stories, edition, meta }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sources = c.lossy([Source].self, forKey: .sources)
        stories = c.lossy([Story].self, forKey: .stories)
        edition = try? c.decodeIfPresent(Edition.self, forKey: .edition)
        meta = (try? c.decodeIfPresent(FeedMeta.self, forKey: .meta)) ?? FeedMeta()
    }
}

extension Edition {
    enum CodingKeys: String, CodingKey { case id, slot, date, next, entries, items }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        slot = try? c.decodeIfPresent(String.self, forKey: .slot)
        date = try? c.decodeIfPresent(String.self, forKey: .date)
        next = try? c.decodeIfPresent(String.self, forKey: .next)
        entries = c.lossy([EditionEntry].self, forKey: .entries)
        items = c.lossy([Item].self, forKey: .items)
    }
}

extension FeedPart {
    enum CodingKeys: String, CodingKey { case items }
    init(from decoder: Decoder) throws { items = try decoder.container(keyedBy: CodingKeys.self).lossy([Item].self, forKey: .items) }
}

extension FeedRelated {
    enum CodingKeys: String, CodingKey { case related }
    init(from decoder: Decoder) throws { related = try decoder.container(keyedBy: CodingKeys.self).lossy([Item].self, forKey: .related) }
}

extension Digest {
    enum CodingKeys: String, CodingKey { case id, week, preview, from, to, next, fields }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        week = try? c.decodeIfPresent(Int.self, forKey: .week)
        preview = try? c.decodeIfPresent(Bool.self, forKey: .preview)
        from = try? c.decodeIfPresent(String.self, forKey: .from)
        to = try? c.decodeIfPresent(String.self, forKey: .to)
        next = try? c.decodeIfPresent(String.self, forKey: .next)
        fields = c.lossy([DigestField].self, forKey: .fields)
    }
}

extension DigestField {
    enum CodingKeys: String, CodingKey { case id, label, about, count, top, more }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        label = try c.decode(String.self, forKey: .label)
        about = try? c.decodeIfPresent(String.self, forKey: .about)
        count = try? c.decodeIfPresent(Int.self, forKey: .count)
        top = c.lossy([DigestItem].self, forKey: .top)
        more = c.lossy([DigestItem].self, forKey: .more)
    }
}

// ---- Datum en tijd ----
// De edities horen bij Nederland: een kalenderdatum ("2026-10-24") is altijd die dag in Amsterdam,
// ook als je iPhone in een andere tijdzone staat.
enum HootDate {
    static let amsterdam = TimeZone(identifier: "Europe/Amsterdam")!
    static let dutch = Locale(identifier: "nl_NL")

    static func parse(_ s: String) -> Date? {
        (try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(s)) ?? (try? Date.ISO8601FormatStyle().parse(s))
    }

    // "2026-10-24" → middernacht van die dag in Amsterdam.
    static func day(_ ymd: String) -> Date? {
        let p = ymd.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = amsterdam
        return cal.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
    }

    // Datumweergave in het Nederlands en in de tijdzone van de edities.
    static func style(_ base: Date.FormatStyle) -> Date.FormatStyle {
        var f = base.locale(dutch)
        f.timeZone = amsterdam
        return f
    }

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
