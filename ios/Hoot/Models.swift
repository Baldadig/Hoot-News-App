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
    var handle: String? // nieuws: het domein van de bron (nrc.nl); Bluesky: @-naam
    // Vooraf aangevinkt in het welkom (suggestSources in src/lib/topics.js): `pick` altijd, met `for`
    // alleen bij een van die interesses, met `forTopic` alleen als je dat onderwerp volgt.
    var pick: Bool?
    var forInterests: [String]?
    var forTopic: String?

    enum CodingKeys: String, CodingKey {
        case id, name, kind, cat, optional, paid, login, lang, about, avatar, brandColor, ok, handle, pick, forTopic
        case forInterests = "for"
    }
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
    var section: String?
    // Alleen bij Bluesky-posts
    var handle: String?
    var linkTitle: String? // titel van een gedeelde link
    var imageMeta: ImageMeasure?
    var imageRatio: Double? // breedte/hoogte van een geplaatste foto of video
    var video: String? // HLS-afspeellijst
    var videoPoster: String?
    var topics: [String]? // onderwerpen (server), voor je smaak
    var mainTopics: [String]? // de onderwerpen die het verhaal dragen: uit de kop en het vak van de bron (server, voor het label)
    // Een bron-deel is de Stroom én de voeding van De Redacteur (shared/stroom.mjs): `editionOnly` (ouder
    // dan 36 uur) komt niet in de Stroom, `streamOnly` telt niet mee voor de Editie.
    var editionOnly: Bool?
    var streamOnly: Bool?
    var firstSeenAt: String? // wanneer de feed dit bericht (deze kop) voor het eerst bracht; kiest de nieuwste kop bij dubbelen
    var formerIds: [String]? // niet uit de feed: de id's van eerdere koppen van hetzelfde stuk (HootStore.withoutRepeats)

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
    enum CodingKeys: String, CodingKey { case id, source, kind, sourceName, avatar, brandColor, storyId, title, summary, url, image, publishedAt, author, readMin, type, section, handle, linkTitle, imageMeta, imageRatio, video, videoPoster, topics, mainTopics, editionOnly, streamOnly, firstSeenAt }
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
        let rawSummary = try? c.decodeIfPresent(String.self, forKey: .summary)
        summary = rawSummary
        image = try? c.decodeIfPresent(String.self, forKey: .image)
        publishedAt = try? c.decodeIfPresent(String.self, forKey: .publishedAt)
        let rawAuthor = try? c.decodeIfPresent(String.self, forKey: .author)
        author = rawAuthor
        if kind != "post" { summary = rawSummary.map { EditionDisplay.cleanIntro($0, author: rawAuthor) } }
        readMin = try? c.decodeIfPresent(Int.self, forKey: .readMin)
        section = try? c.decodeIfPresent(String.self, forKey: .section)
        type = try? c.decodeIfPresent(String.self, forKey: .type)
        handle = try? c.decodeIfPresent(String.self, forKey: .handle)
        linkTitle = try? c.decodeIfPresent(String.self, forKey: .linkTitle)
        imageMeta = try? c.decodeIfPresent(ImageMeasure.self, forKey: .imageMeta)
        imageRatio = try? c.decodeIfPresent(Double.self, forKey: .imageRatio)
        video = try? c.decodeIfPresent(String.self, forKey: .video)
        videoPoster = try? c.decodeIfPresent(String.self, forKey: .videoPoster)
        topics = try? c.decodeIfPresent([String].self, forKey: .topics)
        mainTopics = try? c.decodeIfPresent([String].self, forKey: .mainTopics)
        editionOnly = try? c.decodeIfPresent(Bool.self, forKey: .editionOnly)
        streamOnly = try? c.decodeIfPresent(Bool.self, forKey: .streamOnly)
        firstSeenAt = try? c.decodeIfPresent(String.self, forKey: .firstSeenAt)
    }
}

struct Story: Codable, Identifiable, Hashable {
    let id: String
    var leadId: String?
    var tappedId: String? // alleen in de app: het stuk waarop je tikte om te vergelijken (de kop daar)
    var itemIds: [String]
    var sourceCount: Int?
    var sourceNames: [String]?
    var publisherCount: Int?
    var publisherCountries: [String]?
    var desk: String?
    var latestAt: String?
    // Van de server, voor de rekenkern (lightStory, sportStory): zo rekent de terugval zonder gecachte
    // feed met hetzelfde oordeel als het web. Ontbreekt het veld, dan blijft het weg.
    var sport: Bool?
    var light: StoryLight?

    // `tappedId` hoort niet in de opslag: het geldt alleen voor één keer openen.
    private enum CodingKeys: String, CodingKey {
        case id, leadId, itemIds, sourceCount, sourceNames, publisherCount, publisherCountries, desk, latestAt, sport, light
    }
}

// `story.light` van de server: `false` of de soort ('games', 'cultuur', 'consument'). Leest nooit fout:
// een onverwachte waarde wordt `false`, zodat een verhaal er nooit door wegvalt.
enum StoryLight: Codable, Hashable {
    case no
    case kind(String)

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self) { self = .kind(s) } else { self = .no }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .no: try c.encode(false)
        case .kind(let s): try c.encode(s)
        }
    }
}

struct EntryTerm: Codable, Hashable {
    var term: String?
    var via: String?
}

// Het waarom van een plek in jouw Editie (whyOf in shared/editor.mjs): een code en de tekst eronder.
struct EntryWhy: Codable, Hashable {
    var code: String?
    var text: String?
    var detail: Bool?
}

struct EditionEntry: Codable, Hashable {
    let kind: String
    let id: String
    var leadId: String?
    var formerId: String? // het verhaal heette in een vorige editie anders (samengevoegd of gesplitst)
    var desk: String?
    var fromDesk: String? // aangevuld uit de algemene Editie: de rubriek die het daar had
    var sourceCount: Int?
    var terms: [EntryTerm]?
    // Alleen in jouw Editie (De Redacteur): het waarom, alle stukken van het verhaal op het moment van
    // samenstellen en de getoonde kop, zodat de volgende Editie weet wat er stond.
    var why: EntryWhy?
    var itemIds: [String]?
    var title: String?
    var keys: [String]? // de kenmerken van het hele verhaal toen (aanvulling H2), voor "ontwikkeld"
}

// De samenvatting van een vastgelegde Editie in `user_state.edition.history` (bouwspec-aanvulling H5):
// de laatste drie van deze lezer, dezelfde vorm op web en app. `keys`: per verhaal de kenmerken van toen.
// Een getoond bericht van toen (kop, intro, tijd), zodat een tweede verhaal over dezelfde gebeurtenis
// onder een ander id ook herkend wordt (aanvulling H4, sameSubject).
struct EditionShown: Codable, Hashable {
    var id: String?
    var title: String
    var summary: String?
    var publishedAt: String?
}

// Eén regel van `user_state.edition.history` (aanvulling H5): precies de sleutels die historyOf in
// netlify/lib/stories.mjs schrijft — ook `leadStoryId` (het hoofdverhaal, wasLead) en `shown`. De
// store werkt met de ruwe JSON en geeft alle sleutels ongewijzigd door aan de rekenkern en aan je
// account; dit model is om te lezen en te toetsen.
struct EditionHistory: Codable, Hashable {
    var id: String
    var builtAt: String?
    var storyIds: [String]
    var itemIds: [String]
    var leadIds: [String]
    var leadStoryId: String?
    var titles: [String]?
    var shown: [EditionShown]?
    var keys: [String: [String]]?
}

// Wat Hoot van je leerde (bouwspec §8, profileSummary in shared/editor.mjs): gekozen (je interesses en
// waar je meer van wilde), geleerd (uit je lezen, alleen op dit toestel) en minder.
struct ProfileSummary: Codable, Hashable {
    var chosen: [String] = []
    var learned: [String] = []
    var less: [String] = []
}

// Bekende kandidaatpools ook bewaren als de ruwe startcache ontbreekt.
struct EditionCandidate: Codable, Hashable {
    var storyId: String
    var sourceCount: Int?
    var publisherCount: Int?
    var publisherCountries: [String]?
    var topics: [String]?
    var item: Item
}
struct Edition: Codable, Hashable {
    let id: String
    var slot: String?
    var date: String?
    var next: String?
    var entries: [EditionEntry]
    var items: [Item]?
    var builtAt: String?
    var personal: Bool? // jouw Editie (De Redacteur), niet die voor iedereen
    // Jouw Editie: versie en waarop hij bouwde, de afdruk van bronnen en interesses (editionBasis,
    // djb2), van wie hij is (gebruikers-id of "anon"), of hij van de server kwam toen de rekenkern
    // faalde (`fallback`), en de geschiedenis voor `previous`.
    var version: String?
    var wide: [EditionCandidate]?
    var near: [EditionCandidate]?
    var basedOn: String?
    var basis: String?
    var owner: String?
    var fallback: Bool?
    var history: [EditionHistory]?
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
    enum CodingKeys: String, CodingKey { case id, slot, date, next, entries, items, builtAt, personal, version, wide, near, basedOn, basis, owner, fallback, history }
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
        version = try? c.decodeIfPresent(String.self, forKey: .version)
        wide = c.contains(.wide) ? c.lossy([EditionCandidate].self,forKey:.wide) : nil
        near = c.contains(.near) ? c.lossy([EditionCandidate].self,forKey:.near) : nil
        basedOn = try? c.decodeIfPresent(String.self, forKey: .basedOn)
        basis = try? c.decodeIfPresent(String.self, forKey: .basis)
        owner = try? c.decodeIfPresent(String.self, forKey: .owner)
        fallback = try? c.decodeIfPresent(Bool.self, forKey: .fallback)
        history = c.lossy([EditionHistory].self, forKey: .history)
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

// Meer of minder hiervan (src/lib/affinity.js, dezelfde regels): wat je zelf aangeeft bij een verhaal
// in de Editie. Vooral op het onderwerp (minder voetbal), een beetje op de bron; begrensd, en het
// vervaagt niet. Gaat mee met je account (prefs.taste).
struct Taste: Codable, Hashable {
    var topics: [String: Double] = [:]
    var sources: [String: Double] = [:]
    static let vote = 4.0, voteSource = 1.0, cap = 12.0

    var isEmpty: Bool { topics.isEmpty && sources.isEmpty }
    mutating func vote(_ items: [Item], up: Bool) {
        let its = items.filter { !$0.isPost }
        let d = up ? 1.0 : -1.0
        func clamp(_ v: Double) -> Double { min(Self.cap, max(-Self.cap, v)) }
        for t in Set(its.flatMap { $0.topics ?? [] }) { topics[t] = clamp((topics[t] ?? 0) + d * Self.vote) }
        if let lead = its.first?.source { sources[lead] = clamp((sources[lead] ?? 0) + d * Self.voteSource) }
        func trim(_ x: [String: Double]) -> [String: Double] {
            Dictionary(uniqueKeysWithValues: x.filter { abs($0.value) >= 0.5 }.sorted { abs($0.value) > abs($1.value) }.prefix(40).map { ($0.key, $0.value) })
        }
        topics = trim(topics)
        sources = trim(sources)
    }
    var more: [String] { topics.filter { $0.value > 0 }.sorted { $0.value > $1.value }.map(\.key) }
    var less: [String] { topics.filter { $0.value < 0 }.sorted { $0.value < $1.value }.map(\.key) }

    // De namen van de onderwerpen (src/lib/topics.js).
    static let labels: [String: String] = ["nederland": "Den Haag", "europa": "Europa", "vs-politiek": "VS-politiek", "trump": "Trump", "verkiezingen": "Verkiezingen", "wonen": "Wonen", "zorg": "Zorg", "onderwijs": "Onderwijs", "misdaad": "Misdaad & recht", "migratie": "Asiel & migratie", "verkeer": "Verkeer & OV", "oekraine": "Oekraïne & Rusland", "middenoosten": "Midden-Oosten", "azie": "China & Azië", "afrika": "Afrika", "latam": "Latijns-Amerika", "geopolitiek": "Defensie & NAVO", "economie": "Markten & beurs", "werk": "Werk & inkomen", "bedrijven": "Bedrijven", "energie": "Energie", "geld": "Geld & sparen", "ai": "AI", "tech": "Big Tech", "gadgets": "Gadgets", "privacy": "Privacy & veiligheid", "ev": "Elektrisch rijden", "games": "Games", "klimaat": "Klimaat", "gezondheid": "Gezondheid", "ruimte": "Ruimte", "natuur": "Natuur & dieren", "brein": "Psychologie & brein", "muziek": "Muziek", "film": "Film & series", "boeken": "Boeken", "kunst": "Kunst & musea", "media": "Media", "voetbal": "Voetbal", "f1": "Formule 1", "wielrennen": "Wielrennen", "tennis": "Tennis", "wintersport": "Schaatsen & wintersport", "olympisch": "Olympische sporten"]
    static func label(_ id: String) -> String { labels[id] ?? id }
    // "voetbal en Ajax", voor de bevestiging.
    static func about(_ items: [Item]) -> String {
        let names = Array(Set(items.flatMap { $0.topics ?? [] })).sorted().prefix(2).map { label($0) }
        return names.isEmpty ? "dit soort verhalen" : names.joined(separator: " en ")
    }
}

// De acht rubrieken (src/lib/topics.js → INTERESTS): de interesses uit het welkom, en de rubrieken
// bovenaan de Stroom. Een bericht hoort erbij via zijn onderwerpen (van de server), of omdat zijn
// bron erover gaat (`cats`, de rubriek van de bron in de catalogus: een sportsite is sport).
// De onderwerpen op volgorde, zoals op de website: zo staan de keuzes in Wat precies? gelijk.
struct Rubriek: Identifiable {
    let id: String
    let label: String
    let icon: String
    let topics: [String]
    let cats: Set<String>

    static let alle: [Rubriek] = [
        Rubriek(id: "politiek", label: "Politiek", icon: "building.columns", topics: ["nederland", "europa", "vs-politiek", "trump", "verkiezingen"], cats: []),
        Rubriek(id: "binnenland", label: "Binnenland", icon: "house", topics: ["wonen", "zorg", "onderwijs", "misdaad", "migratie", "verkeer"], cats: ["regio"]),
        Rubriek(id: "wereld", label: "Wereld", icon: "globe.europe.africa", topics: ["oekraine", "middenoosten", "azie", "afrika", "latam", "geopolitiek"], cats: []),
        Rubriek(id: "economie", label: "Economie", icon: "chart.line.uptrend.xyaxis", topics: ["economie", "werk", "bedrijven", "energie", "geld"], cats: ["economie"]),
        Rubriek(id: "tech", label: "Tech", icon: "cpu", topics: ["ai", "tech", "gadgets", "privacy", "ev", "games"], cats: ["tech", "games"]),
        Rubriek(id: "wetenschap", label: "Wetenschap", icon: "atom", topics: ["klimaat", "gezondheid", "ruimte", "natuur", "brein"], cats: ["wetenschap"]),
        Rubriek(id: "cultuur", label: "Cultuur", icon: "theatermasks", topics: ["muziek", "film", "boeken", "kunst", "media"], cats: ["cultuur"]),
        Rubriek(id: "sport", label: "Sport", icon: "figure.run", topics: ["voetbal", "f1", "wielrennen", "tennis", "wintersport", "olympisch"], cats: ["sport"]),
    ]
    static let byId = Dictionary(uniqueKeysWithValues: alle.map { ($0.id, $0) })

    // Hoort dit bericht in deze rubriek? (inInterest op de website)
    static func past(_ item: Item, _ id: String, cat: String?) -> Bool {
        guard let r = byId[id] else { return false }
        return (item.topics ?? []).contains(where: r.topics.contains) || cat.map(r.cats.contains) == true
    }

    // Wat je volgt (resolveTopics op de website): per gekozen interesse de onderwerpen die je
    // aantikte, of alle als je er geen koos. Op de volgorde van de rubrieken.
    static func resolve(_ interests: [String], picked: [String]) -> [String] {
        alle.filter { interests.contains($0.id) }.flatMap { r in
            let mine = r.topics.filter(picked.contains)
            return mine.isEmpty ? r.topics : mine
        }
    }

    // Andersom: wat je aantikte, uit de bewaarde lijst. Staan alle onderwerpen van een interesse
    // erin, dan koos je daar niets ("alles"), en dan staat er ook niets aangetikt.
    static func picked(from topics: [String], interests: [String]) -> [String] {
        alle.filter { interests.contains($0.id) }.flatMap { r in
            let mine = r.topics.filter(topics.contains)
            return mine.count == r.topics.count ? [] : mine
        }
    }
}

// Wat er in je vorige Edities stond (zie previousOf in netlify/lib/stories.mjs), alleen voor de
// terugval via de server: de rekenkern op het toestel leest de `history`-regels zelf.
struct PreviousEdition: Codable {
    var storyIds: [String]
    var itemIds: [String]
    var leadIds: [String]
    var leadStoryId: String?
    var at: Double
    var titles: [String] = []
}

// POST /api/edition, de terugval als de rekenkern faalt (bouwspec-aanvulling P8-6/P8-7). Zonder
// `affinity`: dat blijft op het toestel en de server negeert het toch.
struct PersonalRequest: Codable {
    var followed: [String]
    var interests: [String]
    var topics: [String] = []
    var favorites: [String]
    var taste: Taste?
    var readIds: [String] = []
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
