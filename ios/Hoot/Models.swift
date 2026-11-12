import Foundation

// De vormen van de Hoot-API (gethoot.app/api/feed en /api/vak). Alles optioneel wat de server
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
    var borrowedFrom: String? // de intro is van een ander stuk over hetzelfde (server): "via X"
    var introAlt: String? // reserve-intro uit hetzelfde verhaal, als de eigen op een kleine plek niet past (server: introAlternatives)
    var introAltFrom: String? // de bron van die reserve: "via X"
    var introLoose: Bool? // de geleende intro gaat niet aantoonbaar over het feit van de kop (server: looseBorrow): niet tonen
    let url: String
    var image: String?
    var publishedAt: String?
    var author: String?
    var readMin: Int?
    var type: String?
    var section: String?
    var opinion: Bool? // de uitgever brengt het als mening (server, shared/opinie.mjs); terugval voor de tab Opinie
    var tabs: [String]? // de Stroom-tabs van de server die dit bericht draagt (shared/stroom-tabs.mjs), zoals ["opinie"]
    // Harde media-aanwijzingen uit de feed (rss.mjs), voor dezelfde Editietoets als op het web (shared/editie-filter.mjs).
    var mediaType: String?
    var podcastEpisode: String?
    var feedMark: String?
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
    // Een geleende intro draagt zijn bron, zoals op het web (Items.jsx, Summary): "… — via NOS".
    func introWithSource(_ intro: String) -> String { borrowedFrom.map { "\(intro) — via \($0)" } ?? intro }
    // Zoveel tekens kost " — via X" (VIA_LENGTH in src/components/Items.jsx); de maat van de intro wordt zoveel kleiner.
    var viaLength: Int { borrowedFrom.map { $0.count + 8 } ?? 0 }
    // De intro op een kaart (shared/kaart-intro.mjs, cardIntro): de eigen in hele zinnen tot `max` (en `rek`);
    // levert die niets op, dan de reserve uit hetzelfde verhaal (introAlt, in de taal van de kop) met zijn bron.
    // De aanhef van een (live)blog telt nooit als intro (Aanhef). nil: er past geen intro. `via` gaat als
    // " — via X" achter de tekst (Item.withVia).
    func cardIntro(max: Int, rek: Int? = nil) -> (text: String, via: String?)? {
        if let shownSummary {
            let own = wholeSentences(shownSummary, max: max - viaLength, rek: rek.map { $0 - viaLength })
            if !own.isEmpty, borrowedFrom == nil || Self.endsSentence(own) { return (own, borrowedFrom) }
        }
        return reserveIntro(max: max, rek: rek)
    }
    // De eigen intro zoals hij getoond mag worden, of nil (ownIntro in shared/kaart-intro.mjs): geen tekst van een
    // blog, geen losse verwijzing, en geen geleende intro over een ander feit (introLoose). Voor elke plek die de
    // intro van een stuk toont.
    var shownSummary: String? {
        guard introLoose != true, let summary else { return nil }
        let s = Aanhef.shown(EditionDisplay.cleanIntro(summary, author: author))
        return s.isEmpty ? nil : s
    }
    // Alleen de reserve, in hele zinnen tot `max` (en `rek`), of nil.
    func reserveIntro(max: Int, rek: Int? = nil) -> (text: String, via: String?)? {
        guard let introAlt, let introAltFrom else { return nil }
        let cost = introAltFrom.count + 8
        let alt = wholeSentences(Aanhef.shown(EditionDisplay.cleanIntro(introAlt, author: nil)), max: max - cost, rek: rek.map { $0 - cost })
        return Self.endsSentence(alt) ? (alt, introAltFrom) : nil
    }
    // Een intro van een ander ("via") alleen als hele zin (endsSentence in shared/kaart-intro.mjs): een stuk tot een
    // komma van een ander zegt te weinig.
    static func endsSentence(_ text: String) -> Bool {
        text.range(of: #"[.!?]["'’”)]?$"#, options: .regularExpression) != nil
    }
    // Met het vangnet van het web (FrontItem in src/views/Edition.jsx, fitem__sum--rek): levert de gewone maat
    // niets op, dan mag één lange eerste zin een regel (`line` tekens) langer zijn. IntroText meet daarna wat er
    // in de echte kolom past; liever een regel langer dan een leeg vlak onder de kop.
    func cardIntro(max: Int, line: Int) -> (text: String, via: String?)? {
        cardIntro(max: max) ?? cardIntro(max: max, rek: Self.longer(max, by: line))
    }
    // `max` een regel langer; "alles" (Int.max, Instellingen › Intro op 0) blijft alles.
    static func longer(_ max: Int, by line: Int) -> Int { max > Int.max - line ? Int.max : max + line }
    // Wat IntroText probeert als de gekozen intro bij het meten niet past: de reserve, als die iets anders is
    // (zoals het web: knipt de clamp, dan een kleinere maat, en dan neemt cardIntro daar de reserve).
    func introFallback(for chosen: (text: String, via: String?), max: Int, line: Int) -> (text: String, suffix: (String) -> String)? {
        guard let alt = reserveIntro(max: max) ?? reserveIntro(max: max, rek: Self.longer(max, by: line)), alt.text != chosen.text else { return nil }
        return (alt.text, Item.withVia(alt.via))
    }
    static func withVia(_ via: String?) -> (String) -> String { { intro in via.map { "\(intro) — via \($0)" } ?? intro } }
    var isPost: Bool { kind == "post" }
    // Draagt dit bericht de Stroom-tab `id`? Met `tabs` van de server telt alleen die lijst; een bericht van
    // vóór dat veld valt voor Opinie terug op `opinion`/`type` (inTab in shared/stroom-tabs.mjs).
    func inTab(_ id: String) -> Bool {
        if let tabs { return tabs.contains(id) }
        return id == "opinie" && (opinion == true || type == "opinie")
    }
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
    enum CodingKeys: String, CodingKey { case id, source, kind, sourceName, avatar, brandColor, storyId, title, summary, borrowedFrom, introAlt, introAltFrom, introLoose, url, image, publishedAt, author, readMin, type, section, opinion, tabs, mediaType, podcastEpisode, feedMark, handle, linkTitle, imageMeta, imageRatio, video, videoPoster, topics, mainTopics, editionOnly, streamOnly, firstSeenAt }
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
        borrowedFrom = try? c.decodeIfPresent(String.self, forKey: .borrowedFrom)
        introAlt = try? c.decodeIfPresent(String.self, forKey: .introAlt)
        introAltFrom = try? c.decodeIfPresent(String.self, forKey: .introAltFrom)
        introLoose = try? c.decodeIfPresent(Bool.self, forKey: .introLoose)
        image = try? c.decodeIfPresent(String.self, forKey: .image)
        publishedAt = try? c.decodeIfPresent(String.self, forKey: .publishedAt)
        let rawAuthor = try? c.decodeIfPresent(String.self, forKey: .author)
        author = rawAuthor
        if kind != "post" { summary = rawSummary.map { EditionDisplay.cleanIntro($0, author: rawAuthor) } }
        readMin = try? c.decodeIfPresent(Int.self, forKey: .readMin)
        section = try? c.decodeIfPresent(String.self, forKey: .section)
        type = try? c.decodeIfPresent(String.self, forKey: .type)
        opinion = try? c.decodeIfPresent(Bool.self, forKey: .opinion)
        tabs = try? c.decodeIfPresent([String].self, forKey: .tabs)
        mediaType = try? c.decodeIfPresent(String.self, forKey: .mediaType)
        podcastEpisode = try? c.decodeIfPresent(String.self, forKey: .podcastEpisode)
        feedMark = try? c.decodeIfPresent(String.self, forKey: .feedMark)
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
    // Waar media verschillen (server, achter een vlag): een gekeurd blok, of niets.
    var verschillen: StoryVerschillen?

    // `tappedId` hoort niet in de opslag: het geldt alleen voor één keer openen.
    private enum CodingKeys: String, CodingKey {
        case id, leadId, itemIds, sourceCount, sourceNames, publisherCount, publisherCountries, desk, latestAt, sport, light, verschillen
    }
}

// "Waar media verschillen" in Vergelijken (`story.verschillen` van de server; gelijk aan
// shared/verschillen.mjs op het web): drie korte alinea's in vaste volgorde, alleen als er een verschil is
// en nog een deel (wat iedereen zegt of wat open is). Leest nooit fout: wat niet klopt wordt nil, zodat
// een verhaal er nooit door wegvalt.
struct StoryVerschillen: Codable, Hashable {
    struct Deel: Codable, Hashable {
        var soort: String
        var tekst: String
    }
    var delen: [Deel]
    var versie: Int?

    static let label = "Waar media verschillen"
    static let voet = "Door AI samengevat uit de koppen en intro’s hieronder."
    static let soorten = ["gedeeld", "verschil", "onbekend"]

    init(delen: [Deel], versie: Int? = nil) {
        self.delen = delen
        self.versie = versie
    }

    private enum CodingKeys: String, CodingKey { case delen, versie }
    private struct LosDeel: Decodable {
        let deel: Deel?
        init(from decoder: Decoder) throws { deel = try? Deel(from: decoder) }
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        delen = ((try? c.decodeIfPresent([LosDeel].self, forKey: .delen)) ?? nil)?.compactMap(\.deel) ?? []
        versie = try? c.decodeIfPresent(Int.self, forKey: .versie)
    }

    // Wat Vergelijken toont, of nil (dan ziet het scherm eruit als altijd).
    var getoond: [Deel]? {
        let lijst = Self.soorten.compactMap { soort in delen.first { $0.soort == soort && !$0.tekst.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } }
            .map { Deel(soort: $0.soort, tekst: Self.zet($0.tekst)) }
        guard lijst.contains(where: { $0.soort == "verschil" }), lijst.count >= 2 else { return nil }
        return lijst
    }

    // Typografie: ’ in plaats van een rechte apostrof tussen letters, een vaste spatie na een getal en een
    // vast streepje na een kort voorvoegsel ("e-mail"), net als op het web.
    static func zet(_ t: String) -> String {
        var s = t.trimmingCharacters(in: .whitespacesAndNewlines)
        s = s.replacingOccurrences(of: #"(\p{L})'(\p{L})"#, with: "$1’$2", options: .regularExpression)
        s = s.replacingOccurrences(of: #"(\d[\d.,]*) (?=\p{L})"#, with: "$1\u{00A0}", options: .regularExpression)
        s = s.replacingOccurrences(of: #"(?<!\p{L})(\p{L}{1,2})-(?=\p{L})"#, with: "$1\u{2011}", options: .regularExpression)
        return s
    }
}

// Een Story leest `verschillen` zonder ooit te falen: een kapot blok wordt nil.
extension Story {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        leadId = try c.decodeIfPresent(String.self, forKey: .leadId)
        itemIds = try c.decode([String].self, forKey: .itemIds)
        sourceCount = try c.decodeIfPresent(Int.self, forKey: .sourceCount)
        sourceNames = try c.decodeIfPresent([String].self, forKey: .sourceNames)
        publisherCount = try c.decodeIfPresent(Int.self, forKey: .publisherCount)
        publisherCountries = try c.decodeIfPresent([String].self, forKey: .publisherCountries)
        desk = try c.decodeIfPresent(String.self, forKey: .desk)
        latestAt = try c.decodeIfPresent(String.self, forKey: .latestAt)
        sport = try c.decodeIfPresent(Bool.self, forKey: .sport)
        light = try c.decodeIfPresent(StoryLight.self, forKey: .light)
        verschillen = (try? c.decodeIfPresent(StoryVerschillen.self, forKey: .verschillen)) ?? nil
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
    // De Redacteur op de server (1.2.1): door de server samengesteld en vastgelegd (`server`, `revision`), of
    // het vangnet van dit toestel (`provisional`).
    var server: Bool? = nil
    var revision: String? = nil
    var provisional: Bool? = nil
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
    // De Stroom-tabs tussen Sport en Buiten je bubbel (vanaf 1.2.1). nil: de feed heeft de lijst niet (of iets
    // anders dan een lijst); een kapot element valt weg (Lossy), en StroomTab.uit controleert de rest.
    var stroomTabs: [StroomTab]? = nil
}

// Een Stroom-tab van de server (shared/stroom-tabs.mjs): een filter op de Stroom tussen Sport en Buiten je
// bubbel, zoals Opinie. Alles, de acht hoofdrubrieken en Buiten je bubbel blijven in de app (huisregel); zo
// vraagt een volgende categorie geen app-update.
struct StroomTab: Codable, Hashable {
    let id: String
    let label: String

    // Een feed van vóór `stroomTabs`: alleen Opinie (zoals het web, TERUGVAL).
    static let terugval = [StroomTab(id: "opinie", label: "Opinie")]
    private static let vast: Set<String> = Set(["", "alles", "bubbel"] + Rubriek.alle.map(\.id))

    // De lijst uit de feed, gecontroleerd (stroomTabsUit op het web): een korte id in kleine letters en een
    // label, zonder dubbelen of vaste ids, hooguit vier. Geen lijst: de terugval.
    static func uit(_ lijst: [StroomTab]?) -> [StroomTab] {
        guard let lijst else { return terugval }
        var seen = Set<String>(), out: [StroomTab] = []
        for t in lijst {
            let label = t.label.trimmingCharacters(in: .whitespaces)
            guard t.id.wholeMatch(of: /[a-z][a-z0-9-]{0,23}/) != nil, !label.isEmpty, label.count <= 24,
                  !vast.contains(t.id), seen.insert(t.id).inserted else { continue }
            out.append(StroomTab(id: t.id, label: label))
            if out.count == 4 { break }
        }
        return out
    }

    // Welke tabs er in de Stroom iets hebben (tabsMetBerichten op het web).
    static func metBerichten(_ stream: [Item], tabs: [StroomTab]) -> Set<String> {
        Set(tabs.filter { t in stream.contains { $0.inTab(t.id) } }.map(\.id))
    }
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
    var borrowedFrom: String? // komt hier ooit een geleende intro, dan met "via X" (zoals Item)

    var asItem: Item {
        Item(id: id, source: source, kind: "article", sourceName: sourceName, avatar: avatar, title: title, summary: summary, borrowedFrom: borrowedFrom, url: url, image: image, publishedAt: publishedAt, author: author)
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
    enum CodingKeys: String, CodingKey { case sources, stories, edition, meta, stroomTabs }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sources = c.lossy([Source].self, forKey: .sources)
        stories = c.lossy([Story].self, forKey: .stories)
        edition = try? c.decodeIfPresent(Edition.self, forKey: .edition)
        meta = (try? c.decodeIfPresent(FeedMeta.self, forKey: .meta)) ?? FeedMeta()
        stroomTabs = (try? c.decodeIfPresent([Lossy<StroomTab>].self, forKey: .stroomTabs))?.map { $0.compactMap(\.value) }
    }
}

extension Edition {
    enum CodingKeys: String, CodingKey { case id, slot, date, next, entries, items, builtAt, personal, version, wide, near, basedOn, basis, owner, fallback, history, server, revision, provisional }
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
        server = try? c.decodeIfPresent(Bool.self, forKey: .server)
        revision = try? c.decodeIfPresent(String.self, forKey: .revision)
        provisional = try? c.decodeIfPresent(Bool.self, forKey: .provisional)
    }
}

// ---- Jouw editie ----
// Onderwerpen die er niet meer zijn (src/lib/topics.js → RETIRED_TOPICS): sinds 1.1.0 is "Trump" gewoon
// Verenigde Staten (vs-politiek). Opgeslagen voorkeuren, de import en de profielsync leveren de oude sleutel
// nog; alles wat zulke gegevens inleest zet ze om (HootStore, tests/RetiredTopicsTests).
enum RetiredTopics {
    static let replaced = ["trump": "vs-politiek"]
    static func current(_ id: String) -> String { replaced[id] ?? id }
    // Oude sleutels vervangen, geen dubbelen, volgorde blijft.
    static func list(_ ids: [String]) -> [String] {
        var seen = Set<String>()
        return ids.map(current).filter { seen.insert($0).inserted }
    }
    // Waarden van oud en nieuw tellen op, begrensd door `cap` (smaak: ±12).
    static func map(_ d: [String: Double], cap: Double? = nil) -> [String: Double] {
        var out: [String: Double] = [:]
        for (k, v) in d {
            let key = current(k)
            let sum = (out[key] ?? 0) + v
            out[key] = cap.map { min($0, max(-$0, sum)) } ?? sum
        }
        return out
    }
}

// Wat je leest en bewaart, per onderwerp en per bron (zoals src/lib/affinity.js op de website):
// openen telt 1, bewaren 3, en bij elke handeling wordt alles een beetje ouder (×0,98).
struct Affinity: Codable, Hashable {
    var n = 0
    var topics: [String: Double] = [:]
    var sources: [String: Double] = [:]
    // Oude onderwerpsleutels omgezet (RetiredTopics).
    var migrated: Affinity { var a = self; a.topics = RetiredTopics.map(topics); return a }

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
    // Oude onderwerpsleutels omgezet (RetiredTopics); smaak blijft binnen ±cap.
    var migrated: Taste { var t = self; t.topics = RetiredTopics.map(topics, cap: Self.cap); return t }
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
    static let labels: [String: String] = ["nederland": "Den Haag", "europa": "Europa", "vs-politiek": "Verenigde Staten", "verkiezingen": "Verkiezingen", "wonen": "Wonen", "zorg": "Zorg", "onderwijs": "Onderwijs", "misdaad": "Misdaad & recht", "migratie": "Asiel & migratie", "verkeer": "Verkeer & OV", "oekraine": "Oekraïne & Rusland", "middenoosten": "Midden-Oosten", "azie": "China & Azië", "afrika": "Afrika", "latam": "Latijns-Amerika", "geopolitiek": "Defensie & NAVO", "economie": "Markten & beurs", "werk": "Werk & inkomen", "bedrijven": "Bedrijven", "energie": "Energie", "geld": "Geld & sparen", "ai": "AI", "tech": "Techbedrijven", "gadgets": "Gadgets", "privacy": "Hacks & privacy", "ev": "Elektrisch rijden", "games": "Games", "klimaat": "Klimaat", "gezondheid": "Gezondheid", "ruimte": "Ruimte", "natuur": "Natuur & dieren", "brein": "Psychologie & brein", "muziek": "Muziek", "film": "Film & series", "boeken": "Boeken", "kunst": "Kunst & musea", "media": "Media", "voetbal": "Voetbal", "f1": "Formule 1", "wielrennen": "Wielrennen", "tennis": "Tennis", "wintersport": "Schaatsen & wintersport", "olympisch": "Olympische sporten"]
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
        Rubriek(id: "politiek", label: "Politiek", icon: "building.columns", topics: ["nederland", "europa", "vs-politiek", "verkiezingen"], cats: []),
        Rubriek(id: "binnenland", label: "Binnenland", icon: "house", topics: ["wonen", "zorg", "onderwijs", "misdaad", "migratie", "verkeer"], cats: ["regio"]),
        Rubriek(id: "wereld", label: "Wereld", icon: "globe.europe.africa", topics: ["oekraine", "middenoosten", "azie", "afrika", "latam", "geopolitiek"], cats: []),
        Rubriek(id: "economie", label: "Economie", icon: "chart.line.uptrend.xyaxis", topics: ["economie", "werk", "bedrijven", "energie", "geld"], cats: ["economie"]),
        Rubriek(id: "tech", label: "Tech", icon: "cpu", topics: ["ai", "tech", "gadgets", "privacy", "ev"], cats: ["tech"]),
        Rubriek(id: "wetenschap", label: "Wetenschap", icon: "atom", topics: ["klimaat", "gezondheid", "ruimte", "natuur", "brein"], cats: ["wetenschap"]),
        // Games hoort sinds 1.3 bij Cultuur, niet meer bij Tech (RubriekVersie hieronder).
        Rubriek(id: "cultuur", label: "Cultuur", icon: "theatermasks", topics: ["muziek", "film", "boeken", "kunst", "media", "games"], cats: ["cultuur", "games"]),
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

// De versie van de indeling (src/lib/topics.js → RUBRIEKEN en currentChoice; tests/RubriekVersieTests).
// Versie 2 (1.3): Games onder Cultuur in plaats van onder Tech. Keuzes zonder versie (dit toestel vóór 1.3, de
// import, een account van een oudere app) gaan één keer om, zodat niemand een keuze verliest:
// - Tech met Games aangetikt: Games blijft gekozen, nu onder Cultuur; alleen Games onder Tech: Tech valt weg.
// - Tech zonder keuze (alles): blijft alles, zonder Games.
// - Cultuur zonder keuze (alles): blijft alles, nu met Games. Cultuur met een keuze: precies die keuze.
enum RubriekVersie {
    static let current = 2
    static let oldTech = ["ai", "tech", "gadgets", "privacy", "ev", "games"]
    static let oldCultuur = ["muziek", "film", "boeken", "kunst", "media"]
    static func migrate(interests: [String], topics: [String]) -> (interests: [String], topics: [String]) {
        func sharp(_ old: [String]) -> Bool {
            let n = old.filter(topics.contains).count
            return n > 0 && n < old.count
        }
        let games = interests.contains("tech") && sharp(oldTech) && topics.contains("games")
        let cultuurAll = interests.contains("cultuur") && !sharp(oldCultuur)
        let onlyGames = games && !oldTech.contains { $0 != "games" && topics.contains($0) }
        var nextI = interests.filter { !(onlyGames && $0 == "tech") }
        if games && !nextI.contains("cultuur") { nextI.append("cultuur") }
        var nextT = topics.filter { $0 != "games" }
        let cultuur = Rubriek.byId["cultuur"]?.topics ?? []
        if cultuurAll && (oldCultuur.allSatisfy(topics.contains) || games) {
            nextT += cultuur.filter { !nextT.contains($0) }
        } else if games {
            nextT.append("games")
        }
        return (nextI, nextT)
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

// De tekst van een blog en losse verwijzingen in een intro (shared/aanhef.mjs). Hetzelfde als op het web,
// letterlijk (tests/kaart-kwaliteit.test.mjs houdt de patronen gelijk). Alleen bij het tonen: de samenvatting
// waarmee de redacteur rekent, blijft zoals hij was.
// - blog ("Welkom in het blog …", "Volg alle ontwikkelingen … in onze liveblog."): geen intro, ook niet de rest;
// - promo ("Read more", "Lees hier …", "This story was updated …"): alleen die zin gaat eruit.
// Zinnen knippen met Sentences.sentenceEnd (de afkortingenregel), nooit vóór een cijfer of kleine letter ("No. 150").
enum Aanhef {
    static let blogPattern = #"\blive(?:\s|-)?blogs?\b|\bin\s+(?:het|dit|ons|deze|onze|this|our|the)\s+blog\b|^\s*(?:volg|follow)\s+(?:alle|al|alles|hier|live|ons|onze|het\s+laatste|de\s+ontwikkelingen|our|the\s+latest|along)\b|\bop\s+deze\s+pagina\b|\bon\s+this\s+page\b|\b(?:u|je|jou)\s+(?:\w+\s+)?op\s+de\s+hoogte\b|\bkeep\s+you\s+(?:up\s+to\s+date|updated|posted)\b|\blive\s+(?:updates?|coverage)\b"#
    static let greetingPattern = #"^\s*(?:(?:hallo|hoi|hi|hey|hello|goede(?:morgen|middag|avond)|good\s+(?:morning|afternoon|evening))\b[^.!?]{0,30}[.!?,]?\s*(?:en\s+|and\s+)?)?(?:welkom|welcome)\b"#
    static let promoPattern = #"^\s*(?:lees|luister|bekijk|kijk|read|listen|watch)\s+(?:hier|meer|ook|alles|terug|more|here|also)\b|^\s*(?:this|the)\s+(?:story|article)\s+(?:was|has\s+been)\s+updated\b"#
    private static let blog = try! NSRegularExpression(pattern: blogPattern, options: [.caseInsensitive])
    private static let greeting = try! NSRegularExpression(pattern: greetingPattern, options: [.caseInsensitive])
    private static let promo = try! NSRegularExpression(pattern: promoPattern, options: [.caseInsensitive])
    private static func hit(_ re: NSRegularExpression, _ s: String) -> Bool {
        re.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil
    }
    // De zinnen van een tekst, met hun witruimte (samen weer de hele tekst); sentencesOf op het web.
    static func sentences(_ text: String) -> [String] {
        let ns = text as NSString
        var out: [String] = []
        var start = 0
        for end in Sentences.ends(in: ns) {
            var j = end
            while j < ns.length, let u = UnicodeScalar(ns.character(at: j)), CharacterSet.whitespacesAndNewlines.contains(u) { j += 1 }
            if j < ns.length, let u = UnicodeScalar(ns.character(at: j)), CharacterSet.lowercaseLetters.contains(u) || CharacterSet.decimalDigits.contains(u) { continue }
            out.append(ns.substring(with: NSRange(location: start, length: end - start)))
            start = end
        }
        if start < ns.length { out.append(ns.substring(from: start)) }
        return out.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
    static func isBlog(_ text: String) -> Bool { hit(greeting, text) || sentences(text).contains { hit(blog, $0) } }
    // De intro zoals hij op een kaart mag staan: "" bij een blog, anders zonder de losse verwijzingen (introShown).
    static func shown(_ text: String) -> String {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !isBlog(text) else { return "" }
        let parts = sentences(text)
        guard parts.contains(where: { hit(promo, $0) }) else { return text }
        return parts.filter { !hit(promo, $0) }.joined().trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
