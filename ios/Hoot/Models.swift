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
    var login: String? // inlogpagina van de uitgever (abonnement of lidmaatschap)
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
    var title: String // leeg bij een Bluesky-post: de tekst staat in `summary`
    var summary: String?
    let url: String
    var image: String?
    var publishedAt: String?
    var author: String?
    var readMin: Int?
    var type: String?
    // Alleen bij Bluesky-posts
    var handle: String?
    var linkTitle: String? // titel van een gedeelde link
    var imageRatio: Double? // breedte/hoogte van een geplaatste foto of video
    var video: String? // HLS-afspeellijst
    var videoPoster: String?
    var topics: [String]? // onderwerpen (server), voor je smaak

    var date: Date? { publishedAt.flatMap(HootDate.parse) }
    var link: URL? { URL(string: url) }
    var isPost: Bool { kind == "post" }
    // Rechtstreeks van Bluesky's video-CDN (het gewone adres stuurt daar alleen naartoe, en dat
    // reageerde eind oktober urenlang niet), ook voor berichten van vóór die omzetting.
    var videoURL: URL? { video.flatMap(Self.direct).flatMap(URL.init(string:)) }
    var videoPosterURL: URL? { videoPoster.flatMap(Self.direct).flatMap(URL.init(string:)) }
    static func direct(_ url: String) -> String {
        guard let m = url.wholeMatch(of: /https:\/\/video\.bsky\.app\/watch\/([^\/]+)\/([^\/]+)\/(.+)/) else { return url }
        return "https://video.cdn.bsky.app/hls/\(String(m.1).removingPercentEncoding ?? String(m.1))/\(m.2)/\(m.3)"
    }
}

extension Item {
    enum CodingKeys: String, CodingKey { case id, source, kind, sourceName, avatar, brandColor, storyId, title, summary, url, image, publishedAt, author, readMin, type, handle, linkTitle, imageRatio, video, videoPoster, topics }
    // Een post heeft geen kop; die mag dus ontbreken.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        source = try c.decode(String.self, forKey: .source)
        url = try c.decode(String.self, forKey: .url)
        title = (try? c.decodeIfPresent(String.self, forKey: .title)) ?? ""
        kind = try? c.decodeIfPresent(String.self, forKey: .kind)
        sourceName = try? c.decodeIfPresent(String.self, forKey: .sourceName)
        avatar = try? c.decodeIfPresent(String.self, forKey: .avatar)
        brandColor = try? c.decodeIfPresent(String.self, forKey: .brandColor)
        storyId = try? c.decodeIfPresent(String.self, forKey: .storyId)
        summary = try? c.decodeIfPresent(String.self, forKey: .summary)
        image = try? c.decodeIfPresent(String.self, forKey: .image)
        publishedAt = try? c.decodeIfPresent(String.self, forKey: .publishedAt)
        author = try? c.decodeIfPresent(String.self, forKey: .author)
        readMin = try? c.decodeIfPresent(Int.self, forKey: .readMin)
        type = try? c.decodeIfPresent(String.self, forKey: .type)
        handle = try? c.decodeIfPresent(String.self, forKey: .handle)
        linkTitle = try? c.decodeIfPresent(String.self, forKey: .linkTitle)
        imageRatio = try? c.decodeIfPresent(Double.self, forKey: .imageRatio)
        video = try? c.decodeIfPresent(String.self, forKey: .video)
        videoPoster = try? c.decodeIfPresent(String.self, forKey: .videoPoster)
        topics = try? c.decodeIfPresent([String].self, forKey: .topics)
    }
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
    var formerId: String? // het verhaal heette in een vorige editie anders (samengevoegd of gesplitst)
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
    var builtAt: String?
    var personal: Bool? // jouw editie (POST /api/edition), niet die voor iedereen
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
    enum CodingKeys: String, CodingKey { case id, slot, date, next, entries, items, builtAt, personal }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        slot = try? c.decodeIfPresent(String.self, forKey: .slot)
        date = try? c.decodeIfPresent(String.self, forKey: .date)
        next = try? c.decodeIfPresent(String.self, forKey: .next)
        entries = c.lossy([EditionEntry].self, forKey: .entries)
        items = c.lossy([Item].self, forKey: .items)
        builtAt = try? c.decodeIfPresent(String.self, forKey: .builtAt)
        personal = try? c.decodeIfPresent(Bool.self, forKey: .personal)
    }
}

// ---- Jouw editie ----
// Wat je leest en bewaart, per onderwerp en per bron (zoals src/lib/affinity.js op de website):
// openen telt 1, bewaren 3, en bij elke handeling wordt alles een beetje ouder (×0,98).
struct Affinity: Codable, Hashable {
    var n = 0
    var topics: [String: Double] = [:]
    var sources: [String: Double] = [:]

    mutating func learn(_ item: Item, weight: Double) {
        guard !item.isPost else { return }
        // Wat weinig weegt valt weg; per soort de zwaarste 40 onderwerpen en 30 bronnen.
        func keep(_ d: [String: Double], _ count: Int) -> [String: Double] {
            Dictionary(uniqueKeysWithValues: d.filter { $0.value >= 0.05 }.sorted { $0.value > $1.value }.prefix(count).map { ($0.key, ($0.value * 100).rounded() / 100) })
        }
        var t = topics.mapValues { $0 * 0.98 }
        var s = sources.mapValues { $0 * 0.98 }
        for x in item.topics ?? [] { t[x, default: 0] += weight }
        s[item.source, default: 0] += weight
        topics = keep(t, 40)
        sources = keep(s, 30)
        n += 1
    }
}

// Wat er in je vorige editie stond (zie previousOf in netlify/lib/stories.mjs).
struct PreviousEdition: Codable {
    var storyIds: [String]
    var itemIds: [String]
    var leadIds: [String]
    var leadStoryId: String?
    var at: Double
}

struct PersonalRequest: Codable {
    var followed: [String]
    var interests: [String]
    var topics: [String] = []
    var favorites: [String]
    var affinity: Affinity?
    var previous: PreviousEdition?
}

struct PersonalResponse: Codable { var edition: Edition }

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
