import Foundation
import Observation
import os

// De staat van de app: wat de server gaf, welke bronnen je volgt, wat je bewaarde en las.
// Voorkeuren in dezelfde vorm als de web-app (muted / enabled), zodat synchroniseren met je
// account later één op één kan.
@MainActor
@Observable
final class HootStore {
    enum Status: Equatable { case idle, loading, ready, failed }

    private(set) var status: Status = .idle
    private(set) var sources: [Source] = []
    private(set) var storiesById: [String: Story] = [:]
    private(set) var edition: Edition?
    private(set) var itemsById: [String: Item] = [:]
    private(set) var updatedAt: Date?
    private(set) var digest: Digest?
    private(set) var digestStatus: Status = .idle
    // De laatste verversing van de Selectie mislukte, ook als de bewaarde Selectie bleef staan
    // (digestStatus blijft dan .ready). Dat houdt het trekgebaar eerlijk; het web heeft dezelfde vlag.
    private(set) var digestRefreshFailed = false
    private var relatedVersion: String?
    private var related: [String: [Item]] = [:]
    private var relatedLoaded: String? // de versie waarmee `related` geladen is

    // Voorkeuren (bewaard op het toestel)
    var muted: Set<String> { didSet { save("hoot.muted", Array(muted)); synced() } }
    var enabled: Set<String> { didSet { save("hoot.enabled", Array(enabled)); synced() } }
    var digestFields: [String] { didSet { save("hoot.digestFields", digestFields); synced() } }
    // Bewaard en gelezen: in een eigen bestand (Application Support), niet in UserDefaults; gelezen
    // op volgorde, zodat we bij de grens van 2.000 de oudste vergeten en niet een willekeurige.
    private(set) var saved: [Item] { didSet { Self.write(saved, to: "saved.json"); synced() } }
    private var readOrder: [String] { didSet { Self.write(readOrder, to: "read.json"); synced() } }
    private var readSet: Set<String> = []

    // Weergave en lezen (zelfde namen en waarden als de web-app, voor het synchroniseren later)
    var images: String { didSet { save("hoot.images", images); synced() } } // aan | hoofd | uit
    // Lees de Stroom als: tijdlijn (kop, intro, beeld over de volle breedte) of krant (klein beeld rechts).
    var layout: String { didSet { save("hoot.layout", layout); synced() } } // tijdlijn | krant
    var bubble: Bool { didSet { save("hoot.bubble", bubble); synced() } } // "Buiten je bubbel" in de Editie
    var openInSafari: Bool { didSet { save("hoot.openInSafari", openInSafari) } } // vóór 0.12; nu `openWith`
    // Waar artikelen openen: "lezer" (de Hoot-lezer) of "safari" (de Safari-app, waar je al bent ingelogd).
    var openWith: String { didSet { save("hoot.openWith", openWith) } }
    var preview: Int { didSet { save("hoot.regels", preview); synced() } } // regels intro bij een bericht; 0 = de hele intro
    // Tekstgrootte (Instellingen D): 0 Kleiner · 1 Zoals je toestel · 2 Groter · 3 Nog groter · 4 Grootst,
    // bovenop Dynamic Type. Per toestel, zoals Weergave: niet in de profielsync (geen synced()).
    // De waarde zelf staat in TekstSchaal, want de letters (Letters.swift) lezen hem overal.
    var tekstgrootte: Int {
        get { TekstSchaal.shared.stand }
        set { TekstSchaal.shared.stand = newValue }
    }
    // Regels intro standaard (build 46): 3 in plaats van 2, zoals INTRO_LINES in shared/zinnen.mjs.
    static let introLines = 3
    // Regels intro op een kaart van de Editie op de iPhone (kaart A+, besluit 8 november: 4 in plaats van 3),
    // zoals KAART_LINES in shared/zinnen.mjs. iPad en opengevouwen (krant-vorm) en de Stroom houden hun regels.
    static let kaartLines = 4
    // De oude sleutel (`hoot.preview`, `preview` in de sync) had 2 als standaard, en die ging ook mee
    // zonder dat je iets koos: 2 daar is niet van een keuze te onderscheiden en wordt 3. Wat je vanaf nu
    // kiest staat in `hoot.regels` (`regels` in de sync) en geldt zoals het is, ook 2.
    static func oldPreview(_ v: Int?) -> Int? { v.map { $0 == 2 ? introLines : $0 } }
    var onboarded: Bool { didSet { save("hoot.onboarded", onboarded) } } // het welkom is gezien
    // Het welkom opnieuw, vanuit Instellingen: het begint bij je huidige keuzes. Niet bewaard.
    var welcomeAgain = false
    // Je eerste Editie na het welkom ("Tien en de bubbel", FirstEditionMark.swift): het moment van de
    // tik, op de klok van TienModel. Eén keer; niet bewaard.
    var tienStart: Double?
    // Een seintje bij een nieuwe Editie (EditionAlerts), per dagdeel aan of uit. Alleen op dit
    // toestel: niet `synced()`, want toestemming geldt per toestel.
    var notify: Bool { didSet { save("hoot.notify", notify) } }
    var notifySlots: [String] { didSet { save("hoot.notifySlots", notifySlots) } }
    // Jouw editie: je interesses (src/lib/topics.js), voorkeursbronnen (ster) en smaak (wat je leest).
    var interests: [String] { didSet { save("hoot.interests", interests); refreshPersonal(); synced() } }
    // Wat precies? De onderwerpen die je volgt, opgelost zoals op de website (prefs.topics): per
    // interesse wat je aantikte, of alle als je daar niets koos. Leeg = alles binnen je interesses.
    var topics: [String] { didSet { save("hoot.topics", topics); refreshPersonal(); synced() } }
    var favorites: [String] { didSet { save("hoot.favorites", favorites); refreshPersonal(); synced() } }
    private(set) var affinity: Affinity { didSet { save("hoot.affinity", affinity) } }
    // Meer of minder hiervan (Models.swift: Taste): gaat mee met je account.
    var taste: Taste { didSet { save("hoot.taste", taste); synced() } }
    // Verhalen waar je "minder" op zei: in deze Editie ingeklapt (alleen op dit toestel).
    private(set) var less: [String] { didSet { save("hoot.less", less) } }
    // Jouw Editie van dit dagdeel (De Redacteur), vastgelegd in edition.json: `personal` is de vorm
    // voor de schermen, `personalRaw` de JSON zoals de rekenkern hem gaf (met alles wat de website
    // ook bewaart, zoals `history`) — die gaat ongewijzigd naar je account.
    private(set) var personal: Edition?
    private var personalRaw: [String: Any]?
    // Het vangnet (De Redacteur op de server, 1.2.1): zelf samengesteld omdat de server niet antwoordde.
    // In het geheugen; nooit in edition.json, je account of je geschiedenis. Het laatste vangnet staat ook in
    // edition-provisional.json (zie hieronder), alleen als geheugen voor het volgende dagdeel.
    private(set) var personalProvisional: Edition?
    // Het laatste vangnet, bewaard in edition-provisional.json (1.3.1): alleen als geheugen voor `previous` en
    // `earlier` van het volgende dagdeel. Het wordt nooit getoond na een herstart, nooit naar je account
    // gestuurd, en de server wint altijd zodra hij antwoordt.
    private var provisionalRaw: [String: Any]?
    static let provisionalFile = "edition-provisional.json"
    func provisionalKept(owner: String) -> [String: Any]? { provisionalRaw?["owner"] as? String == owner ? provisionalRaw : nil }
    // Je account (Account.swift), voor de eigenaar van je Editie en user_state.edition.
    weak var account: Account?
    // Bluesky als eigen tabblad, met de vaste accounts van Hoot en wie je zelf toevoegt.
    var bluesky: Bool { didSet {
        save("hoot.bluesky", bluesky); synced()
        ownPostsGeneration += 1
        rebuildStream(); reloadParts()
        if bluesky { Task { await loadOwnPosts() } }
    } }
    var bskyInStream: Set<String> { didSet { save("hoot.bskyInStream", bskyInStream.sorted()); rebuildStream(); synced() } }
    private(set) var ownBluesky: [BlueskyAccount] { didSet {
        save("hoot.ownBluesky", ownBluesky); synced(); ownPostsGeneration += 1
        let kept = Set(ownBluesky.map(\.id))
        ownPosts.removeAll { !kept.contains($0.source) }
        rebuildStream()
    } }
    private var ownPosts: [Item] = [] { didSet { rebuildStream() } }
    private var ownPostsGeneration = 0
    // Per eigen account wat de laatste ronde opleverde, zodat een leeg scherm kan zeggen waarom: niets
    // geplaatst in de afgelopen 36 uur, het account bestaat niet meer, of Bluesky was niet bereikbaar.
    enum OwnState: Equatable { case posts(Int), gone, unreachable }
    private(set) var ownState: [String: OwnState] = [:]
    // Oude server-accounts die we deze sessie al probeerden om te zetten (zie adoptLegacyBluesky).
    @ObservationIgnored private var legacyTried = Set<String>()
    @ObservationIgnored var socialPostsLoader: @Sendable (BlueskyAccount) async throws -> [Item] = { try await Bluesky.posts(of: $0) }
    @ObservationIgnored var socialProfileLoader: @Sendable (String) async throws -> BlueskyAccount = { try await Bluesky.profile($0) }

    // Laatste verversing mislukt: je ziet de versie van `updatedAt`.
    private(set) var stale = false
    // Alleen de kern (api/feed?deel=start) lukte niet: het antwoord kwam uit de bewaarde kopie of er was
    // niets. Een mislukt deel van één bron zet `stale` aan maar is geen fout voor het trekgebaar; dat
    // volgt het web (refreshError).
    private(set) var coreFailed = false
    // De Stroom, gesorteerd: één keer per laadactie of bronwijziging, niet bij elke weergave.
    private(set) var stream: [Item] = []
    // De Stroom-tabs van de server tussen Sport en Buiten je bubbel (StroomTab); een feed zonder de lijst: Opinie.
    private(set) var stroomTabs: [StroomTab] = StroomTab.terugval
    // Tot waar je de Stroom zag (het nieuwste bericht toen je hem verliet), en de grens voor dit
    // bezoek: die schuift niet mee terwijl je leest, pas als je de Stroom opnieuw opent.
    private var streamSeen: Date? { didSet { save("hoot.streamSeen", streamSeen) } }
    private(set) var streamMark: Date?
    func openStream() { rebuildStream(); streamMark = DebugLaunch.seenMinutes.map { Date.now.addingTimeInterval(-$0 * 60) } ?? streamSeen }
    func leaveStream() { if let newest = stream.first?.date, newest > (streamSeen ?? .distantPast) { streamSeen = newest } }
    // Geteld zoals de Stroom ze toont: een stuk bij twee zusterkranten is één bericht (anders staat
    // de streep 'Daaronder heb je alles al gezien' te laag).
    var newInStream: Int { streamMark.map { mark in withoutCopies(stream).prefix { ($0.date ?? .distantPast) > mark }.count } ?? 0 }

    // `defaults` is de opslag voor instellingen (standaard die van de app). Tests geven een eigen suite mee,
    // zodat ze niet afhangen van wat de app op het toestel al bewaarde.
    let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        let d = defaults
        func load<T: Decodable>(_ key: String) -> T? { Self.load(key, d) }
        muted = Set(load("hoot.muted") ?? [String]())
        enabled = Set(load("hoot.enabled") ?? [String]())
        quickPending = load("hoot.quickPending") ?? false
        browsing = load("hoot.browsing") ?? false
        digestFields = load("hoot.digestFields") ?? [] // een nieuwe lezer kiest zijn vak zelf (of later)
        // Eenmalig overzetten uit UserDefaults (versie 0.3 en eerder).
        let oldSaved: [Item]? = load("hoot.saved")
        let oldRead: [String]? = load("hoot.read")
        let savedNow: [Item] = Self.read("saved.json") ?? oldSaved ?? []
        let readNow: [String] = Self.read("read.json") ?? oldRead ?? []
        saved = savedNow
        readOrder = readNow
        // Bewaard onleesbaar: dan niet doen alsof je alles verwijderde. Zonder basis vult je account
        // het weer aan, in plaats van het daar ook te wissen (Account.pull).
        if Self.unreadable.contains("saved.json") { d.removeObject(forKey: "hoot.savedBase") }
        readSet = Set(readNow)
        if oldSaved != nil || oldRead != nil {
            // Pas uit UserDefaults weghalen als het bestand er echt staat.
            Self.write(savedNow, to: "saved.json")
            Self.write(readNow, to: "read.json")
            if Self.read("saved.json") as [Item]? != nil { d.removeObject(forKey: "hoot.saved") }
            if Self.read("read.json") as [String]? != nil { d.removeObject(forKey: "hoot.read") }
        }
        images = load("hoot.images") ?? "aan"
        layout = DebugLaunch.layout ?? load("hoot.layout") ?? "tijdlijn"
        bubble = load("hoot.bubble") ?? true
        openInSafari = load("hoot.openInSafari") ?? false
        // Twee keuzes: de lezer of Safari. Wie "Op de website" had (tot 1.0.1), gaat naar Safari.
        let was: String = load("hoot.openWith") ?? (load("hoot.openInSafari") == true ? "safari" : "lezer")
        openWith = was == "web" ? "safari" : was
        streamSeen = load("hoot.streamSeen") ?? nil
        preview = load("hoot.regels") ?? Self.oldPreview(load("hoot.preview")) ?? Self.introLines
        // Het welkom alleen bij een verse installatie: wie al instellingen of gelezen stukken heeft
        // (bijvoorbeeld van vóór het welkom), heeft het niet nodig.
        let knownOnboarded: Bool? = load("hoot.onboarded")
        let seen = knownOnboarded ?? d.dictionaryRepresentation().keys.contains { $0.hasPrefix("hoot.") }
        onboarded = seen
        // Meteen vastleggen: sluit iemand de app tijdens het eerste welkom, dan komt het de volgende keer terug.
        if knownOnboarded == nil { d.set(try? JSONEncoder().encode(seen), forKey: "hoot.onboarded") }
        #if DEBUG
        // Opnamen met een startargument (screenshots.sh, device-screens.sh) slaan het welkom over.
        if d.string(forKey: "HootStartTab") != nil { onboarded = true }
        // `-HootOnboarded YES`: het welkom overslaan maar wel het opstartscherm (de overgang naar de Editie).
        if d.bool(forKey: "HootOnboarded") { onboarded = true }
        // `-HootFresh YES` of `-HootWelcomeStep …`: het welkom als nieuwe gebruiker.
        if DebugLaunch.fresh { onboarded = false }
        #endif
        notify = load("hoot.notify") ?? false
        notifySlots = load("hoot.notifySlots") ?? EditionAlerts.slots.map(\.id)
        var storedInterests: [String] = load("hoot.interests") ?? []
        // Trump is sinds 1.1.0 Verenigde Staten: opgeslagen voorkeuren met de oude sleutel gaan mee (RetiredTopics).
        func rewrite<T: Codable & Equatable>(_ key: String, _ old: T, _ new: T) {
            if new != old { d.set(try? JSONEncoder().encode(new), forKey: key) }
        }
        let storedTopics: [String] = load("hoot.topics") ?? []
        var migratedTopics = RetiredTopics.list(storedTopics)
        // 1.3: Games onder Cultuur (RubriekVersie). Eén keer, voor wat dit toestel van vóór 1.3 bewaarde.
        if (load("hoot.rubrieken") as Int?) != RubriekVersie.current {
            let m = RubriekVersie.migrate(interests: storedInterests, topics: migratedTopics)
            if m.interests != storedInterests { storedInterests = m.interests; d.set(try? JSONEncoder().encode(m.interests), forKey: "hoot.interests") }
            migratedTopics = m.topics
            d.set(try? JSONEncoder().encode(RubriekVersie.current), forKey: "hoot.rubrieken")
        }
        // Crypto onder Economie (OnderwerpVersie). Eén keer, voor wat dit toestel ervoor bewaarde.
        if (load("hoot.onderwerpen") as Int?) != OnderwerpVersie.current {
            migratedTopics = OnderwerpVersie.migrate(interests: storedInterests, topics: migratedTopics)
            d.set(try? JSONEncoder().encode(OnderwerpVersie.current), forKey: "hoot.onderwerpen")
        }
        interests = storedInterests
        topics = migratedTopics
        favorites = load("hoot.favorites") ?? []
        let storedAffinity: Affinity = load("hoot.affinity") ?? Affinity()
        let migratedAffinity = storedAffinity.migrated
        affinity = migratedAffinity
        let storedTaste: Taste = load("hoot.taste") ?? Taste()
        let migratedTaste = storedTaste.migrated
        taste = migratedTaste
        let storedLess: [String] = load("hoot.less") ?? []
        let migratedLess = RetiredTopics.list(storedLess)
        less = migratedLess
        rewrite("hoot.topics", storedTopics, migratedTopics)
        rewrite("hoot.affinity", storedAffinity, migratedAffinity)
        rewrite("hoot.taste", storedTaste, migratedTaste)
        rewrite("hoot.less", storedLess, migratedLess)
        personal = Self.read("edition.json")
        personalRaw = Self.readRaw("edition.json")
        provisionalRaw = Self.readRaw(Self.provisionalFile)
        bluesky = load("hoot.bluesky") ?? false
        let keptSocial: [BlueskyAccount] = load("hoot.ownBluesky") ?? []
        ownBluesky = keptSocial
        // Oude native profielen kenden deze schakelaar niet: gevolgde eigen accounts blijven zichtbaar.
        // Een opgeslagen lege lijst is wel een bewuste keuze en blijft leeg.
        bskyInStream = Set(load("hoot.bskyInStream") ?? keptSocial.map(\.id))
        importSettings()
        repairStreamChoice(stage: "local")
        canonicalizeBlueskyIDs()
    }

    // Een account dat van naam veranderde (Bluesky.renamed) of met hoofdletters is opgeslagen: de id's in je
    // keuzes volgen de huidige handle, anders hoort de keuze bij een account dat niet meer bestaat.
    private func canonicalizeBlueskyIDs() {
        func fix(_ ids: Set<String>) -> Set<String> {
            Set(ids.map { $0.hasPrefix("bsky:") ? "bsky:" + Bluesky.canonical(String($0.dropFirst(5))) : $0 })
        }
        let a = fix(bskyInStream), b = fix(enabled), c = fix(muted)
        if a != bskyInStream { bskyInStream = a }
        if b != enabled { enabled = b }
        if c != muted { muted = c }
    }

    // Vroeger volgde Hoot zelf Aaron Rupar en de groep Oekraïne (vaste server-accounts); wie ze volgde, heeft ze
    // nog als `bsky:<handle>` in zijn Stroom-keuze of aangezette bronnen, maar de server levert ze niet meer en
    // ze staan niet in je eigen accounts, dus er kwam niets binnen. Zet ze om in eigen accounts (met de
    // huidige handle via getProfile). Wat niet meer bestaat valt uit je keuze; bij een tijdelijke fout proberen
    // we het de volgende keer weer. Gelijk aan adoptLegacySocial op het web (src/lib/social-stream.js).
    func adoptLegacyBluesky() async {
        let own = Set(ownBluesky.map(\.handle))
        let known = Set(sources.map(\.id))
        let ids = enabled.union(bskyInStream)
            .filter { $0.hasPrefix("bsky:") && !muted.contains($0) && !known.contains($0) && !legacyTried.contains($0) && !own.contains(String($0.dropFirst(5))) }
            .sorted()
        guard !ids.isEmpty else { return }
        legacyTried.formUnion(ids)
        let load = socialProfileLoader
        let results = await withTaskGroup(of: (String, BlueskyAccount?, Bool).self) { group in
            for id in ids {
                group.addTask {
                    do { return (id, try await load(String(id.dropFirst(5))), false) }
                    catch let f as Bluesky.Failure { if case .notFound = f { return (id, nil, true) }; return (id, nil, false) }
                    catch { return (id, nil, false) }
                }
            }
            var all: [(String, BlueskyAccount?, Bool)] = []
            for await r in group { all.append(r) }
            return all
        }
        for (id, account, gone) in results {
            if let account {
                if !ownBluesky.contains(where: { $0.handle == account.handle }) { ownBluesky.append(account) }
                // Het oude id gaat altijd uit `enabled` (anders neemt de volgende start het opnieuw over);
                // het account zelf staat via bskyInStream in de Stroom.
                bskyInStream.remove(id); enabled.remove(id)
                bskyInStream.insert(account.id)
            } else if gone {
                bskyInStream.remove(id); enabled.remove(id)
            } else {
                legacyTried.remove(id) // tijdelijke fout: een volgende ronde probeert het weer
            }
        }
    }

    // Herstel (build 46): tot en met build 45 zette de app een nieuw toegevoegd Bluesky-account niet
    // in de Stroom (addBluesky vergat bskyInStream), en de profielsync schreef die lege keuze weg naar
    // je account, waarna ook de website ze verborg. Eén keer per toestel (`local`) en één keer na de
    // eerste pull van je account (`remote`) gaan je eigen accounts er weer bij; wat je account daarna
    // krijgt, gaat in dezelfde pull mee (Account.pull schrijft syncedPrefs weg).
    static let streamRepairKey = "hoot.bskyStreamRepair"
    private func repairStreamChoice(stage: String) {
        let done = defaults.string(forKey: Self.streamRepairKey)
        if done == "remote" || done == stage { return }
        defaults.set(stage, forKey: Self.streamRepairKey)
        let own = Set(ownBluesky.map(\.id))
        if !own.isEmpty, !own.isSubset(of: bskyInStream) { bskyInStream.formUnion(own) }
    }

    // Eenmalig instellingen overnemen (van je account op gethoot.app), uit een bestand dat
    // `import.json` heet in de map van de app (Application Support/Hoot). Daarna weg.
    private struct Import: Decodable {
        struct Prefs: Decodable {
            var muted: [String]?
            var enabled: [String]?
            var vak: [String]?
            var images: String?
            var layout: String?
            var theme: String?
            var themeDark: String?
            var bubble: Bool?
            var bluesky: Bool?
            var bskyInStream: [String]?
            var preview: Int?
            var regels: Int? // de keuze sinds build 46; zonder: `preview` met de oude standaard 2 als 3
            var interests: [String]?
            var topics: [String]?
            var rubrieken: Int? // de versie van de indeling (RubriekVersie); zonder: van vóór 1.3
            var onderwerpen: Int? // de versie van de lijst onderwerpen (OnderwerpVersie); zonder: zonder Crypto
            var favorites: [String]?
            var social: [BlueskyAccount]? // eigen Bluesky-accounts, zoals op de website (een kapotte rij valt weg, niet de hele lijst)
            var taste: Taste?
            enum CodingKeys: String, CodingKey { case muted, enabled, vak, images, layout, theme, themeDark, bubble, bluesky, bskyInStream, preview, regels, interests, topics, rubrieken, favorites, social, taste }
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                muted = try? c.decodeIfPresent([String].self, forKey: .muted)
                enabled = try? c.decodeIfPresent([String].self, forKey: .enabled)
                vak = try? c.decodeIfPresent([String].self, forKey: .vak)
                images = try? c.decodeIfPresent(String.self, forKey: .images)
                layout = try? c.decodeIfPresent(String.self, forKey: .layout)
                theme = try? c.decodeIfPresent(String.self, forKey: .theme)
                themeDark = try? c.decodeIfPresent(String.self, forKey: .themeDark)
                bubble = try? c.decodeIfPresent(Bool.self, forKey: .bubble)
                bluesky = try? c.decodeIfPresent(Bool.self, forKey: .bluesky)
                bskyInStream = try? c.decodeIfPresent([String].self, forKey: .bskyInStream)
                interests = try? c.decodeIfPresent([String].self, forKey: .interests)
                topics = try? c.decodeIfPresent([String].self, forKey: .topics)
                rubrieken = try? c.decodeIfPresent(Int.self, forKey: .rubrieken)
                favorites = try? c.decodeIfPresent([String].self, forKey: .favorites)
                social = (try? c.decodeIfPresent([Lossy<BlueskyAccount>].self, forKey: .social))?.compactMap(\.value)
                taste = try? c.decodeIfPresent(Taste.self, forKey: .taste)
                // Op de website is het 1, 2, 3 of "alles".
                preview = (try? c.decodeIfPresent(Int.self, forKey: .preview)) ?? ((try? c.decodeIfPresent(String.self, forKey: .preview)) == "alles" ? 0 : nil)
                regels = (try? c.decodeIfPresent(Int.self, forKey: .regels)) ?? ((try? c.decodeIfPresent(String.self, forKey: .regels)) == "alles" ? 0 : nil)
            }
        }
        var prefs: Prefs?
        var social: [BlueskyAccount]?
        enum CodingKeys: String, CodingKey { case prefs, social }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            prefs = try? c.decodeIfPresent(Prefs.self, forKey: .prefs)
            social = (try? c.decodeIfPresent([Lossy<BlueskyAccount>].self, forKey: .social))?.compactMap(\.value)
        }
    }
    private struct Lossy<T: Decodable>: Decodable {
        let value: T?
        init(from decoder: Decoder) throws { value = try? T(from: decoder) }
    }
    private func importSettings() {
        guard let file = Self.folder?.appendingPathComponent("import.json"), let data = try? Data(contentsOf: file) else { return }
        guard let found = try? JSONDecoder().decode(Import.self, from: data) else { return } // kapot: laten staan
        try? FileManager.default.removeItem(at: file)
        if let v = found.social { ownBluesky = v; save("hoot.ownBluesky", v) }
        apply(found.prefs)
    }
    // Alleen wat echt anders is: elke toewijzing laadt opnieuw (Bluesky, jouw editie), en dat zou
    // anders na elke synchronisatie gebeuren, ook als er niets veranderde.
    private func apply(_ p: Import.Prefs?, unite: Bool = false) {
        let legacySocial = p?.bskyInStream == nil && defaults.object(forKey: "hoot.bskyInStream") == nil
        if p?.theme != nil || p?.themeDark != nil {
            let local = ThemePreferences.read()
            let next = ThemePreferences(theme: p?.theme ?? local.theme, dark: p?.themeDark ?? local.dark)
            // Eerst de echo-grens, daarna AppStorage bijwerken: vertraagde notificaties tellen niet als lokale wijziging.
            observedTheme = next
            next.write()
        }
        if let v = p?.muted, Set(v) != muted { muted = Set(v); save("hoot.muted", v) }
        if let v = p?.enabled, Set(v) != enabled { enabled = Set(v); save("hoot.enabled", v) }
        if let v = p?.vak, v != digestFields { digestFields = v; save("hoot.digestFields", v) }
        if let v = p?.images, v != images, ["aan", "hoofd", "uit"].contains(v) { images = v; save("hoot.images", v) }
        if let v = p?.layout, v != layout, ["tijdlijn", "krant"].contains(v) { layout = v; save("hoot.layout", v) }
        if let v = p?.bubble, v != bubble { bubble = v; save("hoot.bubble", v) }
        if let v = p?.bluesky, v != bluesky { bluesky = v; save("hoot.bluesky", v) }
        if let v = p?.bskyInStream {
            let next = Set(v.filter { $0.hasPrefix("bsky:") }).union(unite ? bskyInStream : [])
            if next != bskyInStream { bskyInStream = next }
        }
        if let v = p?.regels ?? Self.oldPreview(p?.preview), v != preview, (0 ... 3).contains(v) { preview = v; save("hoot.regels", v) }
        // Interesses en onderwerpen in de indeling van nu: zonder `rubrieken` zijn ze van een oudere app of het
        // web van vóór 1.3 (Games onder Tech) en gaan ze eerst om (RubriekVersie).
        var nextInterests = p?.interests, nextTopics = p?.topics.map(RetiredTopics.list)
        if nextInterests != nil || nextTopics != nil, p?.rubrieken != RubriekVersie.current {
            let m = RubriekVersie.migrate(interests: nextInterests ?? interests, topics: nextTopics ?? topics)
            nextInterests = m.interests
            nextTopics = m.topics
        }
        if let t = nextTopics, p?.onderwerpen != OnderwerpVersie.current {
            nextTopics = OnderwerpVersie.migrate(interests: nextInterests ?? interests, topics: t)
        }
        if let v = nextInterests, v != interests { interests = v; save("hoot.interests", v) }
        if let v = nextTopics, v != topics { topics = v; save("hoot.topics", v) }
        if let v = p?.favorites, v != favorites { favorites = v; save("hoot.favorites", v) }
        if let v = p?.taste?.migrated, v != taste { taste = v; save("hoot.taste", v) }
        if let v = p?.social {
            // De eerste keer met een account (`unite`): wat hier al stond blijft erbij. Daarna gaat je
            // account voor, zodat ook weghalen op een ander toestel meekomt.
            let next = unite ? v + ownBluesky.filter { a in !v.contains { $0.handle == a.handle } } : v
            if next != ownBluesky { ownBluesky = next; Task { await loadOwnPosts() } }
        }
        // Gelijk aan normalizePrefs op het web: een profiel met eigen accounts maar zonder de schakelaar
        // (van vóór de schakelaar) heeft Bluesky aan.
        if p?.bluesky == nil, !(p?.social ?? []).isEmpty, !bluesky { bluesky = true; save("hoot.bluesky", true) }
        if legacySocial { bskyInStream.formUnion(followedSocial.map(\.id)) }
        canonicalizeBlueskyIDs()
    }

    // ---- Synchroniseren met je account (Account.swift) ----
    // Elke wijziging die met je account meegaat, telt hier op; het account schrijft ze dan weg.
    // Wat van de server komt, telt niet mee (anders gaat het meteen weer terug).
    private(set) var syncTick = 0
    private var applyingRemote = false
    @ObservationIgnored private var observedTheme = ThemePreferences.read()
    func themePreferencesChanged() {
        let next = ThemePreferences.read()
        guard next != observedTheme else { return }
        observedTheme = next
        synced()
    }
    private func synced() { if !applyingRemote { syncTick &+= 1 } }

    // Je instellingen in de vorm van de website (SYNCED_PREFS in src/lib/sync.js), `layout` erbij.
    var syncedPrefs: [String: Any] {
        let theme = ThemePreferences.read()
        return [
            "theme": theme.theme, "themeDark": theme.dark,
            "muted": muted.sorted(), "enabled": enabled.sorted(), "vak": digestFields, "images": images, "layout": layout,
            "bubble": bubble, "bluesky": bluesky, "bskyInStream": bskyInStream.sorted(), "preview": preview == 0 ? "alles" as Any : preview as Any, "regels": preview == 0 ? "alles" as Any : preview as Any,
            "interests": interests, "topics": topics, "rubrieken": RubriekVersie.current, "onderwerpen": OnderwerpVersie.current, "favorites": favorites, "onboarded": true,
            "taste": ["topics": taste.topics, "sources": taste.sources],
            "social": ownBluesky.map { ["handle": $0.handle, "name": $0.name, "avatar": $0.avatar as Any] },
        ]
    }
    var readIds: [String] { readOrder }

    // Wat je account heeft: instellingen (als die er zijn), gelezen erbij, Bewaard zoals berekend.
    func applyRemote(prefs: Data?, read: [String], saved list: [Item]?, unite: Bool = false) {
        applyingRemote = true
        defer { applyingRemote = false }
        let following = followingIds
        // Een oud web-/iOS-profiel kan bskyInStream nog missen. Bij dezelfde eigenaar behouden;
        // bij een andere eigenaar nooit diens vorige Bluesky-keuzes of late posts overnemen.
        if let reader = account?.uid, let previous = defaults.string(forKey: "hoot.owner"), reader != previous {
            bskyInStream = []
            ownBluesky = []
            ownPosts = []
        }
        if let prefs, let p = try? JSONDecoder().decode(Import.Prefs.self, from: prefs) {
            apply(p, unite: unite)
            repairStreamChoice(stage: "remote")
            onboarded = true
            browsing = false // je eigen keuzes staan er al
        }
        let new = read.filter { !readSet.contains($0) }
        if !new.isEmpty {
            readOrder = Array((new + readOrder).suffix(2000))
            readSet = Set(readOrder)
        }
        if let list, list != saved { saved = list }
        // Alleen opnieuw laden als je bronnen veranderden: synchroniseren gebeurt na elk geopend stuk.
        if followingIds != following {
            rebuildStream()
            reloadParts()
        }
        refreshPersonal()
    }
    private var followingIds: Set<String> { Set((followed + (bluesky ? followedSocial : [])).map(\.id)) }

    // Beeld tonen? `lead`: het hoofdverhaal of het eerste stuk van een vak.
    func showsImage(lead: Bool) -> Bool { images == "aan" || (images == "hoofd" && lead) }
    func clearRead() { readOrder = []; readSet = [] }
    func clearSaved() { saved = [] }

    // ---- Bronnen ----
    // Uit = wat je zelf uitzette, plus optionele bronnen die je (nog) niet aanzette.
    func isOn(_ s: Source) -> Bool { !muted.contains(s.id) && !((s.optional ?? false) && !enabled.contains(s.id)) }
    func setOn(_ s: Source, _ on: Bool) {
        if s.optional ?? false {
            if on { enabled.insert(s.id) } else { enabled.remove(s.id) }
            muted.remove(s.id)
        } else {
            if on { muted.remove(s.id) } else { muted.insert(s.id) }
        }
        rebuildStream()
        reloadParts()
        refreshPersonal()
    }
    // "Begin met lezen": een zachte landing. Alleen Nederlandse bronnen, allemaal gratis, dus elk
    // stuk is helemaal te lezen: nieuws, sport, tech en cultuur. Zelfde set als de website
    // (STARTER in src/lib/topics.js); later aan te passen bij Bronnen.
    static let starterGroups: [(label: String, ids: [String])] = [
        ("Nieuws", ["nos", "nu", "rtl"]), ("Tech", ["tweakers"]), ("Cultuur", ["nos-cultuur", "3voor12"]),
    ]
    static let starter = starterGroups.flatMap(\.ids)
    func quickStart(ids: [String] = HootStore.starter) {
        let set = Set(ids)
        enabled = set
        if sources.isEmpty {
            quickPending = true // nog geen bronnen geladen: bij het laden alsnog
        } else {
            muted = Set(newsSources.map(\.id).filter { !set.contains($0) })
            quickPending = false
            rebuildStream()
            reloadParts()
            refreshPersonal()
        }
        browsing = true
        beginFirstEdition() // vóór onboarded: "eerste keer" is dan nog te zien
        onboarded = true
    }
    // De eerste keer dat het welkom sluit: "Tien en de bubbel" start. Elke eindknop van het welkom
    // (ook "Liever meteen lezen", dat zelf onboarded zet) legt dit vast vóórdat onboarded waar wordt.
    func beginFirstEdition() {
        if !welcomeAgain && !onboarded { tienStart = TienModel.clock() }
    }
    private var quickPending: Bool { didSet { save("hoot.quickPending", quickPending) } }
    // Eerst even rondgekeken (zachte start): na een stukje editie één keer de vraag of je zelf
    // je bronnen kiest. Weg zodra je dat doet, "Later" zegt of inlogt.
    var browsing: Bool { didSet { save("hoot.browsing", browsing) } }

    // ---- Interesses en Wat precies? ----
    // Beide tegelijk, zodat de onderwerpen altijd bij je interesses horen: wat je aantikte binnen
    // een interesse die je uitzet, valt weg. Interesses op de volgorde van de rubrieken.
    func setInterests(_ ids: [String], picked: [String]) {
        let next = Rubriek.alle.map(\.id).filter(ids.contains)
        let mine = Rubriek.resolve(next, picked: picked)
        if next != interests { interests = next }
        if mine != topics { topics = mine }
    }
    // Het voorstel in het welkom (onboarding-plan): altijd NOS, NU.nl en RTL Nieuws, en per gekozen
    // interesse een of twee gratis bronnen, Nederlands eerst. Een betaalde bron staat nooit vooraf
    // aan; die kies je zelf bij Aanpassen of later bij Bronnen. Nog niets geladen: de lijst zoals hij
    // is (bij het laden valt weg wat niet bestaat).
    static let always = ["nos", "nu", "rtl"]
    static let pickFor: [String: [String]] = [
        "wereld": ["bbc"], "tech": ["tweakers"], "wetenschap": ["quanta"], "cultuur": ["nos-cultuur", "3voor12"], "sport": ["nos-sport", "vi"],
    ]
    // Wat er bij Aanpassen onder ‘Ook bij je interesses’ staat (aan te zetten, niet vooraf aan).
    static let alsoFor: [String: [String]] = [
        "politiek": ["nrc", "volkskrant", "ftm", "politico-eu"], "binnenland": ["ad", "parool", "trouw"],
        "wereld": ["guardian", "aljazeera", "nyt", "economist"], "economie": ["fd", "ft", "economist"],
        "tech": ["theverge", "ars"], "wetenschap": ["nature"], "cultuur": ["variety", "pitchfork"], "sport": ["wielerflits", "sporza"],
    ]
    func suggested(interests: [String]) -> [String] {
        var ids = Self.always
        for r in Rubriek.alle where interests.contains(r.id) {
            for id in Self.pickFor[r.id] ?? [] where !ids.contains(id) { ids.append(id) }
        }
        guard !newsSources.isEmpty else { return ids }
        return ids.filter { id in newsSources.contains { $0.id == id && $0.paid != true } }
    }
    // De andere bronnen bij je interesses, voor Aanpassen: eerst wat het voorstel niet aanzette.
    func alsoSuggested(interests: [String]) -> [String] {
        var ids: [String] = []
        for r in Rubriek.alle where interests.contains(r.id) {
            for id in (Self.alsoFor[r.id] ?? []) + (Self.pickFor[r.id] ?? []) where !ids.contains(id) { ids.append(id) }
        }
        return ids.filter { id in newsSources.contains { $0.id == id } }
    }
    // Welkom klaar (applyWelcome in src/lib/welcome.js): interesses, onderwerpen en bronnen worden je
    // instellingen. Alleen de bronnen die in het welkom te kiezen waren (`shown`) veranderen.
    func applyWelcome(interests ids: [String], topics mine: [String], sources on: [String], shown: [Source], vak: [String]? = nil) {
        let ids = Rubriek.alle.map(\.id).filter(ids.contains)
        let on = Set(on), seen = Set(shown.map(\.id))
        if ids != interests { interests = ids }
        if mine != topics { topics = mine }
        if let vak, vak != digestFields { digestFields = vak }
        // Nog geen bronnen geladen: alleen wat je koos staat aan, zodra ze er zijn (zoals quickStart).
        if shown.isEmpty { enabled = on; quickPending = true }
        muted = muted.filter { !seen.contains($0) }.union(shown.filter { !($0.optional ?? false) && !on.contains($0.id) }.map(\.id))
        enabled = enabled.filter { !seen.contains($0) }.union(shown.filter { ($0.optional ?? false) && on.contains($0.id) }.map(\.id))
        browsing = false
        rebuildStream()
        reloadParts()
        refreshPersonal()
    }

    // Uitgelogd: de persoonlijke keuzes gaan van het toestel, zodat wie hierna leest neutraal begint.
    // Interesses, onderwerpen, voorkeursbronnen, vak, smaak en je eigen Bluesky-accounts weg; de
    // bronnen terug naar het gratis Nederlandse begin (de startset). Ook Bewaard en wat je las gaan
    // weg: dat is persoonlijk (in je account blijft het staan). Weergave en lezen blijven, die horen
    // bij het toestel.
    func forgetChoices() {
        clearSaved()
        clearRead()
        interests = []
        topics = []
        favorites = []
        digestFields = []
        taste = Taste()
        less = []
        affinity = Affinity()
        ownBluesky = []
        bskyInStream = []
        ownPosts = []
        ownState = [:]
        let start = Set(Self.starter)
        enabled = start
        if sources.isEmpty {
            quickPending = true
        } else {
            muted = Set(newsSources.map(\.id).filter { !start.contains($0) })
            rebuildStream()
            reloadParts()
        }
        refreshPersonal()
    }

    var newsSources: [Source] { sources.filter { $0.kind != "sociaal" } }
    var followed: [Source] { newsSources.filter(isOn) }
    // Bluesky: de vaste accounts van Hoot, plus wie je zelf toevoegde.
    var socialSources: [Source] {
        let server = sources.filter { $0.kind == "sociaal" }
        let known = Set(server.map(\.id))
        return server + ownBluesky.filter { !known.contains($0.id) }.map { Source(id: $0.id, name: $0.name, kind: "sociaal", avatar: $0.avatar, brandColor: Bluesky.brand) }
    }
    var followedSocial: [Source] { socialSources.filter(isOn) }
    func isOwn(_ id: String) -> Bool { ownBluesky.contains { $0.id == id } }
    var posts: [Item] {
        let on = Set(followedSocial.map(\.id))
        // Op de echte tijd: eigen posts hebben soms een tijdzone in de tekst (+02:00). Elke datum één
        // keer lezen, niet bij elke vergelijking (dat waren er duizenden per weergave).
        return (itemsById.values.filter { $0.isPost } + ownPosts).filter { on.contains($0.source) }
            .map { ($0, $0.date ?? .distantPast) }
            .sorted { $0.1 > $1.1 }
            .map(\.0)
    }
    // Gelijk aan addSocialProfile op het web: wie je toevoegt, staat meteen in de Stroom (en Bluesky aan).
    func addBluesky(_ input: String) async throws {
        let account = try await socialProfileLoader(input)
        if !ownBluesky.contains(where: { $0.handle == account.handle }) && !sources.contains(where: { $0.id == account.id }) { ownBluesky.append(account) }
        muted.remove(account.id)
        bskyInStream.insert(account.id)
        if !bluesky { bluesky = true }
        reloadParts()
        await loadOwnPosts()
    }
    func removeBluesky(_ id: String) {
        bskyInStream.remove(id)
        enabled.remove(id) // een overgenomen oud id mag niet terugkomen via adoptLegacyBluesky
        ownBluesky.removeAll { $0.id == id }
        ownPosts.removeAll { $0.source == id }
        ownState[id] = nil
    }
    func loadOwnPosts() async {
        await adoptLegacyBluesky()
        ownPostsGeneration += 1
        let round = ownPostsGeneration
        let accounts = ownBluesky.filter { a in !muted.contains(a.id) && !sources.contains { $0.id == a.id } }
        guard bluesky, !accounts.isEmpty else { return }
        let load = socialPostsLoader
        let results = await withTaskGroup(of: (BlueskyAccount, Result<[Item], Error>).self) { group in
            for a in accounts { group.addTask {
                do { return (a, .success(try await load(a))) } catch { return (a, .failure(error)) }
            } }
            var all: [(BlueskyAccount, Result<[Item], Error>)] = []
            for await r in group { all.append(r) }
            return all
        }
        guard bluesky, round == ownPostsGeneration, !Task.isCancelled else { return }
        var state: [String: OwnState] = [:]
        var fresh: [Item] = []
        for (a, result) in results {
            switch result {
            case let .success(list): state[a.id] = .posts(list.count); fresh += list
            case let .failure(error):
                if let f = error as? Bluesky.Failure, case .notFound = f { state[a.id] = .gone } else { state[a.id] = .unreachable }
                // Een mislukte ronde laat wat we van dit account al hadden staan.
                fresh += ownPosts.filter { $0.source == a.id }
            }
        }
        ownState = state
        ownPosts = fresh
    }
    func source(_ id: String) -> Source? { sources.first { $0.id == id } }

    // ---- Laden ----
    // Eén laadactie tegelijk: trekken om te verversen, terugkomen in de app en "Opnieuw" wachten op
    // dezelfde. Los van wie erom vroeg: een afgebroken trekgebaar breekt het laden niet half af (dan
    // zag je ten onrechte "Verversen lukt nu niet").
    private var loadTask: Task<Void, Never>?
    func load() async {
        if let loadTask { return await loadTask.value }
        let task = Task { await fetchAll() }
        loadTask = task
        await task.value
        loadTask = nil
    }

    private func fetchAll() async {
        status = itemsById.isEmpty ? .loading : status
        if status == .loading && DebugLaunch.loadDelay > 0 { try? await Task.sleep(for: .seconds(DebugLaunch.loadDelay)) }
        do {
            let (start, fromCache) = try await HootAPI.start()
            sources = start.sources
            if quickPending { muted = Set(newsSources.map(\.id).filter { !enabled.contains($0) }); quickPending = false }
            storiesById = Dictionary(start.stories.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            // Een nieuw dagdeel terwijl jouw Editie daarvan er nog niet is: wat er stond blijft staan (DagdeelWissel). Na een
            // herstart is dat de laatste Editie van de server op dit toestel (edition.json).
            let before = shownEdition ?? personal
            edition = start.edition
            if heldNow == nil, currentEdition == nil, DagdeelWissel.mayHold(before, kern: start.edition, owner: ownerNow) { held = before }
            updatedAt = start.meta.updatedAt.flatMap(HootDate.parse)
            relatedVersion = start.meta.related
            stroomTabs = StroomTab.uit(start.stroomTabs)
            parts = start.meta.parts ?? [:]
            stale = false // een mislukt deel zet hem hieronder weer aan
            coreFailed = fromCache
            coreFresh = !fromCache
            reloadParts()
            // Jouw Editie meteen vragen, niet pas als alle delen er zijn (Editie sneller C1, 1.3.1;
            // Hoot-design/editie-sneller/METING.md §2): de Editie van de server draagt haar eigen berichten mee
            // (`edition.items`). Alleen het vangnet wacht op de delen (provisional, itemsCurrent).
            serverRound += 1
            Task { await self.loadPersonal() }
            // Eigen Bluesky-accounts los ophalen: een trage Bluesky houdt de editie niet op.
            Task { await loadOwnPosts() }
            // Op de nieuwste ronde: zet je tijdens het laden een bron om, dan begint er een nieuwe.
            var round: Int
            repeat { round = partsGeneration; await partsTask?.value } while round != partsGeneration
            stale = stale || fromCache
            status = .ready
            if !fromCache { Task.detached(priority: .background) { HootAPI.Offline.prune() } }
            await loadPersonal()
        } catch {
            stale = !itemsById.isEmpty
            coreFailed = true
            status = itemsById.isEmpty ? .failed : .ready
        }
    }

    // Eén laadtaak voor de berichten per bron: een nieuwe breekt de vorige af, en alleen de
    // nieuwste mag het resultaat wegschrijven (ook als een oudere later terugkomt).
    private var parts: [String: String] = [:]
    private var partsTask: Task<Void, Never>?
    private var partsGeneration = 0
    // Bij welke Editie (dagdeel) de berichten in `itemsById` horen, en of er een ronde loopt. Jouw Editie
    // wacht tot de berichten van deze ronde er zijn (P0, 9 november): bij terugkomen staat de nieuwe kern
    // er al (`edition`) terwijl `itemsById` nog de berichten van je vorige bezoek heeft.
    @ObservationIgnored private(set) var itemsEdition: String?
    @ObservationIgnored private(set) var partsLoading = false
    // Kwam de kern (`edition`) in deze sessie van het netwerk, niet uit de bewaarde kopie (offline, of de server
    // gaf een fout)? Alleen dan schrijft Jouw Editie naar je account (mayClaim; keuring P0 ronde 2, §4). Blijft
    // staan als een latere verversing mislukt: de kern die er dan staat kwam eerder deze sessie van het netwerk.
    @ObservationIgnored private(set) var coreFresh = false

    private func reloadParts() {
        partsTask?.cancel()
        partsGeneration += 1
        let generation = partsGeneration
        let wanted = (followed + (bluesky ? followedSocial : [])).map(\.id).filter { parts[$0] != nil }
        let versions = parts
        let forEdition = edition?.id
        partsLoading = true
        partsTask = Task {
            let lists = await withTaskGroup(of: (String, [Item]?).self) { group in
                for id in wanted {
                    guard let version = versions[id] else { continue }
                    group.addTask { (id, try? await HootAPI.part(id, version: version).items) }
                }
                var all: [(String, [Item]?)] = []
                for await list in group { all.append(list) }
                return all
            }
            guard !Task.isCancelled, generation == partsGeneration else { return }
            // Lukt een deel niet (geen verbinding, time-out), dan blijven de stukken van die bron staan
            // die we al hadden, en zegt de app dat hij niet helemaal bij is.
            let failed = Set(lists.filter { $0.1 == nil }.map(\.0))
            var map: [String: Item] = [:]
            for item in itemsById.values where failed.contains(item.source) { map[item.id] = item }
            for item in lists.compactMap(\.1).joined() { map[item.id] = item }
            itemsById = map
            itemsEdition = forEdition
            partsLoading = false
            if !failed.isEmpty { stale = true }
            rebuildStream()
            // Wie tijdens het laden wilde samenstellen (je account, een bron die je aanzette), wachtte: nu.
            refreshPersonal()
        }
    }

    // Mag Jouw Editie nu samengesteld worden met wat het toestel aan berichten heeft? Alleen als die bij de
    // Editie van dit dagdeel horen en er geen ronde meer loopt (zoals editionReady/itemsCurrent op het web).
    static func itemsCurrent(itemsEdition: String?, loading: Bool, edition: String) -> Bool {
        !loading && itemsEdition == edition
    }

    // Mag dit toestel de Editie die het net samenstelde in je account zetten (keuring P0 ronde 2, §4)?
    // - Alleen op een kern die in deze sessie van het netwerk kwam: een kern uit de bewaarde kopie kan van een
    //   vorig dagdeel zijn, en dan overschreef de claim (`edition->>id.neq`) de Editie van vandaag van je andere
    //   toestel. Lokaal samenstellen mag dan wel (offline houdt de app zo een eigen Editie), alleen niet claimen.
    // - Nooit over een Editie van een later dagdeel heen (accountAhead, zoals het web).
    static func mayClaim(coreFresh: Bool, theirs: [String: Any]?, id: String, builtAt: String?) -> Bool {
        coreFresh && !accountAhead(theirs, id: id, builtAt: builtAt)
    }
    // Staat er in je account al een Editie van een later dagdeel dan deze (`id`, `builtAt`)? Zonder tijd aan een
    // van beide niet te toetsen: dan nee (accountAhead in src/lib/editionSync.js).
    static func accountAhead(_ theirs: [String: Any]?, id: String, builtAt: String?) -> Bool {
        guard let theirs, theirs["id"] as? String != id,
              let a = (theirs["builtAt"] as? String).flatMap(HootDate.parse), let b = builtAt.flatMap(HootDate.parse) else { return false }
        return a > b
    }

    private func rebuildStream() {
        let on = Set(followed.map(\.id))
        let social = Set(followedSocial.map(\.id))
        var seen = Set<String>()
        let eligible = (Array(itemsById.values) + ownPosts).filter { item in
            guard seen.insert(item.id).inserted else { return false }
            if item.isPost { return SocialStream.allows(item, enabled: bluesky, followed: social, selected: bskyInStream) }
            return item.kind == "article" && on.contains(item.source) && item.editionOnly != true
        }
        // Eén datumconversie per bericht, ook met tijdzones in eigen posts; niet per vergelijking.
        var dated: [(item: Item, date: Date)] = eligible.map { ($0, $0.date ?? .distantPast) }
        dated.sort { a, b in
            if a.date == b.date { return a.item.id < b.item.id }
            return a.date > b.date
        }
        stream = dated.map { $0.item }
        repeatKeys = Dictionary(stream.map { ($0.id, RepeatKeys($0)) }, uniquingKeysWith: { a, _ in a })
        #if DEBUG
        // App Store-opnamen: de gekozen verhalen bovenaan.
        let picked = DebugLaunch.feature.map(\.id)
        if !picked.isEmpty {
            let rank = { (i: Item) in i.storyId.flatMap { picked.firstIndex(of: $0) } ?? Int.max }
            stream = stream.enumerated().sorted { (rank($0.element), $0.offset) < (rank($1.element), $1.offset) }.map(\.element)
        }
        #endif
    }

    // Eén stuk, één plek in de Stroom. Zusterkranten (AD, Tubantia, De Stentor …) brengen vaak hetzelfde
    // stuk, en een uitgever die een kop aanpast levert het als nieuw bericht (andere kop en link, zelfde
    // stuk). Gelijk: dezelfde link of kop, dezelfde bron met dezelfde artikel-id in de link (de
    // Volkskrant eindigt op "~b782895d"), of dezelfde bron met een identieke intro binnen 6 uur, tenzij
    // beide links een verschillend uitgevers-id dragen. Het
    // nieuwste exemplaar blijft (minuut van publishedAt, dan firstSeenAt); `formerIds` onthoudt de rest,
    // zodat gelezen en Bewaard op het blijvende bericht staan. Spiegel van withoutRepeats in
    // shared/stroom.mjs, getoetst in StroomDubbelsTests met tests/fixtures/stroom-dubbels.json.
    // `stream` zelf houdt alles, zodat één bron apart al zijn eigen berichten toont.
    @MainActor struct RepeatKeys {
        let keys: [String]
        let intro: String
        let publisherId: String?
        let at: Date?
        let seen: Date?
        init(_ item: Item) {
            let title = HootStore.titleKey(item.title)
            let id = HootStore.publisherId(item.url)
            publisherId = id
            keys = ["u|" + item.url] + (title.isEmpty ? [] : ["t|" + title]) + (id.map { ["a|" + item.source + "|" + $0] } ?? [])
            let text = item.kind == "post" ? "" : HootStore.titleKey(item.summary ?? "")
            intro = text.count >= 60 ? item.source + "|" + text : ""
            at = item.date
            seen = item.firstSeenAt.flatMap(HootDate.parse)
        }
    }
    static let introWindow: TimeInterval = 6 * 3600
    @ObservationIgnored private var repeatKeys: [String: RepeatKeys] = [:] // per bericht, één keer per rebuildStream (verandert met `stream`)
    func withoutCopies(_ items: [Item]) -> [Item] { Self.withoutRepeats(items, cache: repeatKeys) }

    static func articleId(_ url: String) -> String? {
        let bare = url.split(whereSeparator: { $0 == "?" || $0 == "#" }).first.map(String.init) ?? url
        return bare.firstMatch(of: /~([0-9a-fA-F]{6,})\/?$/).map { String($0.1).lowercased() }
    }

    // Het eigen artikelnummer van de uitgever: "~b782895d" (DPG), "/164008665.html" (Mediahuis) of
    // "/6372345/slug.html" (nu.nl). Spiegel van publisherId in shared/stroom.mjs.
    static func publisherId(_ url: String) -> String? {
        let bare = url.split(whereSeparator: { $0 == "?" || $0 == "#" }).first.map(String.init) ?? url
        if let m = bare.firstMatch(of: /~([0-9a-fA-F]{6,})\/?$/) { return String(m.1).lowercased() }
        if let m = bare.firstMatch(of: /\/([0-9]{6,})\.html$/) { return String(m.1) }
        if let m = bare.firstMatch(of: /\/([0-9]{6,})\/[^\/]+\.html$/) { return String(m.1) }
        return nil
    }

    static func withoutRepeats(_ items: [Item], cache: [String: RepeatKeys] = [:]) -> [Item] {
        var parent = Array(items.indices)
        func find(_ i: Int) -> Int { var r = i; while parent[r] != r { r = parent[r] }; parent[i] = r; return r }
        func join(_ a: Int, _ b: Int) { let (x, y) = (find(a), find(b)); parent[max(x, y)] = min(x, y) }
        let info = items.map { cache[$0.id] ?? RepeatKeys($0) }
        var first: [String: Int] = [:]
        var intros: [String: [Int]] = [:]
        for (i, k) in info.enumerated() {
            for key in k.keys { if let j = first[key] { join(i, j) } else { first[key] = i } }
            if !k.intro.isEmpty, let at = k.at {
                for j in intros[k.intro] ?? [] where abs(info[j].at!.timeIntervalSince(at)) <= introWindow {
                    // Verschillend uitgevers-nummer: twee stukken, ook bij gelijke intro (zoals shared/stroom.mjs).
                    if let a = k.publisherId, let b = info[j].publisherId, a != b { continue }
                    join(i, j)
                }
                intros[k.intro, default: []].append(i)
            }
        }
        var groups: [Int: [Int]] = [:]
        for i in items.indices { groups[find(i), default: []].append(i) }
        func minute(_ d: Date?) -> Int { Int(((d ?? .distantPast).timeIntervalSince1970 / 60).rounded(.down)) }
        func newer(_ a: Int, _ b: Int) -> Bool {
            let (ma, mb) = (minute(info[a].at), minute(info[b].at))
            if ma != mb { return ma > mb }
            return (info[a].seen ?? .distantPast) > (info[b].seen ?? .distantPast)
        }
        var out: [Item] = []
        for i in items.indices {
            guard let members = groups[find(i)], members[0] == i else { continue }
            if members.count == 1 { out.append(items[i]); continue }
            let win = members.dropFirst().reduce(members[0]) { newer($1, $0) ? $1 : $0 }
            var item = items[win]
            item.formerIds = members.filter { $0 != win }.map { items[$0].id }
            out.append(item)
        }
        return out
    }
    // De kop zonder hoofdletters en leestekens (zoals normTitle op de server).
    static func titleKey(_ title: String) -> String {
        var out = String.UnicodeScalarView()
        var gap = false
        for c in title.lowercased().unicodeScalars {
            let keep = (0x61...0x7A).contains(c.value) || (0x30...0x39).contains(c.value) || (0xE0...0xFF).contains(c.value)
            if !keep { gap = true; continue }
            if gap && !out.isEmpty { out.append(" ") }
            out.append(c)
            gap = false
        }
        return String(out)
    }

    // ---- Verhalen ----
    func story(of item: Item) -> Story? { item.storyId.flatMap { storiesById[$0] } }
    private func ensureRelated() async {
        if let v = relatedVersion, v != relatedLoaded, let r = try? await HootAPI.related(version: v) {
            related = Dictionary(grouping: r.related.filter { $0.storyId != nil }, by: { $0.storyId! })
            relatedLoaded = v
        }
    }
    // Zoeken, "Alle bronnen": zoals op het web (itemsById = related + items) ook de stukken van bronnen die je
    // niet volgt en die alleen binnen een verhaal staan. Zelfde bron als het web: api/feed?deel=verhalen.
    func searchPoolAll() async -> [Item] {
        await ensureRelated()
        return Array(itemsById.values) + related.values.flatMap { $0 }
    }
    // Buiten je bronnen: de bron staat niet bij wat je volgt (zelfde regel als de Editie).
    func isOutside(_ item: Item) -> Bool { !isOn(source(item.source) ?? Source(id: item.source, name: "")) }
    func storyItems(_ story: Story) async -> [Item] {
        if let vast = DebugLaunch.vasteStukken(story.id) { return vast.sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") } }
        await ensureRelated()
        let list = related[story.id] ?? story.itemIds.compactMap { itemsById[$0] }
        return list.sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
    }

    // ---- Jouw Editie ----
    // Toon alleen jouw samengestelde Editie. De algemene feed kent jouw interesses niet en mag
    // tijdens het laden niet kort langs de buitenland-/sportgrens of Nederlandse opening gaan.
    // De Editie die je ziet: bij een nieuw dagdeel even de vorige (`held`, DagdeelWissel), anders jouw Editie van dit dagdeel.
    var shownEdition: Edition? { heldNow ?? currentEdition }
    // Jouw Editie van het dagdeel van de kern (van de server of het vangnet), of nil zolang die er niet is.
    var currentEdition: Edition? { Self.visiblePersonal(personal, id: edition?.id, owner: ownerNow) ?? Self.visiblePersonal(personalProvisional, id: edition?.id, owner: ownerNow) }
    // De dagdeelwissel (DagdeelWissel.swift, Editie sneller C3): komt er een nieuwe kern terwijl jouw Editie van dat
    // dagdeel er nog niet is, dan blijft de Editie die er stond in beeld. Alleen getoond: nooit in edition.json, je
    // account of je geschiedenis, en niet bewaard over een herstart (dan staat edition.json er nog, zie fetchAll).
    private(set) var held: Edition?
    private var heldNow: Edition? { DagdeelWissel.mayHold(held, kern: edition, owner: ownerNow) ? held : nil }
    // De nieuwe Editie komt eraan (het dagdeel van de kern), of staat klaar (het dagdeel van de nieuwe Editie).
    var editionComing: String? { heldNow != nil && currentEdition == nil ? edition?.slot : nil }
    var editionReady: String? { heldNow != nil ? currentEdition?.slot : nil }
    // Wisselen naar de nieuwe Editie (EditionView beslist wanneer: bovenaan en niet aan het lezen, of na een tik).
    func swapEdition() { held = nil }
    // De Editie voor de widget: altijd de nieuwste die er is, ook als de app nog even de vorige toont.
    var widgetEdition: Edition? { currentEdition ?? shownEdition }
    static func visiblePersonal(_ candidate: Edition?, id: String?, owner: String) -> Edition? {
        guard let candidate, let id, candidate.id == id, candidate.owner == owner else { return nil }
        return candidate
    }
    var isPersonal: Bool { shownEdition?.personal == true && (!interests.isEmpty || !topics.isEmpty || !favorites.isEmpty) }
    func isFavorite(_ id: String) -> Bool { favorites.contains(id) }
    func setFavorite(_ id: String, _ on: Bool) { favorites = on ? Array(Set(favorites + [id])).sorted() : favorites.filter { $0 != id } }

    // Van wie jouw Editie is: je gebruikers-id als lid, anders "anon" (die gaat nooit naar je account).
    var ownerNow: String { account?.uid ?? "anon" }
    private var personalTask: Task<Void, Never>?
    func refreshPersonal() {
        guard edition != nil else { return }
        personalTask?.cancel()
        personalTask = Task { try? await Task.sleep(for: .milliseconds(600)); if !Task.isCancelled { await loadPersonal() } }
    }
    private static let log = Logger(subsystem: "nl.hootnews.Hoot", category: "editie")

    // Jouw Editie komt van de server (De Redacteur op de server, 1.2.1; zoals het web, src/lib/editionSync.js
    // serverFirst): (1) ligt hier al een Editie van de server voor dit dagdeel, deze lezer en deze afdruk,
    // dan die; (2) anders POST /api/edition v2: de server stelt samen en legt als lid zelf vast in je account
    // (de eerste schrijver wint). Wat hij teruggeeft, bewaren we letterlijk in edition.json; de app claimt
    // niets meer. Als lid pas na de eerste sync-pull (P8-2). (3) Geen antwoord (offline, fout, 429): het
    // vangnet met de rekenkern (EditionEngine), voorlopig en alleen in het geheugen. De afdruk (`basis`)
    // komt uit de rekenkern, dezelfde djb2 als editionBasis op het web.
    private var personalPending = ""
    // Past deze vastgelegde Editie bij dit dagdeel, deze lezer en deze bronnen en interesses (P8-1)?
    static func fits(_ e: Edition?, id: String, owner: String, basis: String) -> Bool {
        e?.id == id && e?.owner == owner && e?.basis == basis
    }
    // Als lid pas samenstellen na één geslaagde pull, of als die mislukte (zoals het web: `pulled ||
    // sync === 'failed'`); zolang je account laadt, wachten. Zonder sessie: meteen, als "anon".
    static func mayCompose(status: Account.Status?, uid: String?, pulled: Bool, sync: Account.SyncState) -> Bool {
        if status == .loading { return false }
        if uid != nil, !pulled, sync != .failed { return false }
        return true
    }
    func loadPersonal() async {
        guard let global = edition, !sources.isEmpty else { return }
        if account?.status == .loading { return } // je account laadt nog: dan weten we nog niet van wie de Editie is
        let owner = ownerNow
        let followedIds = followed.map(\.id)
        // De afdruk uit de rekenkern (dezelfde djb2 als het web); faalt die, dan vragen we de server toch.
        let basis = try? await EditionEngine.shared.basis(followed: followedIds, interests: interests, topics: topics, favorites: favorites)
        let task = "\(global.id)|\(owner)|\(basis ?? "")"
        // `-HootEngine YES` (Debug): altijd zelf samenstellen, voor het keuren van de rekenkern.
        let force = DebugLaunch.engine && !forced.contains(global.id)
        if let basis, Self.fits(personal, id: global.id, owner: owner, basis: basis), personalServerTask == task, !force { return } // (1)
        if personalPending == task { return }
        personalPending = task
        defer { if personalPending == task { personalPending = "" } }

        // (2) De server stelt samen en legt als lid zelf vast; als lid pas na de eerste pull (anders vraagt
        // een vers toestel met instellingen die je account nog niet gaf, en zet de server die in je account).
        // Eén vraag per taak en laadronde (C1): bleef het antwoord uit, dan vraagt een volgende aanleiding in
        // dezelfde ronde (de delen kwamen binnen) niet nog eens 20 s, maar rekent meteen het vangnet. Een
        // volgende ronde (terug in de app, verversen) vraagt opnieuw.
        let round = "\(task)#\(serverRound)"
        let mayAsk = Self.asksServer(force: force, uid: account?.uid, pulled: account?.pulled == true, failed: serverFailed, round: round)
        if mayAsk, let raw = await askServer(global: global, owner: owner) {
            // Veranderde er intussen iets (bron gedempt, uitgelogd)? Dan komt er zo een nieuwe ronde.
            guard followed.map(\.id) == followedIds, ownerNow == owner else { return }
            keepServer(raw, task: task)
            return
        }
        if mayAsk { serverFailed = round }
        // (3) Geen antwoord (offline, een fout, 429): het vangnet, voorlopig.
        await provisional(global: global, owner: owner, basis: basis, force: force)
    }

    // Mag deze ronde de server vragen? Niet bij `-HootEngine`, als lid pas na de eerste pull, en niet nog eens in een
    // ronde waarin de vraag al zonder antwoord bleef (`failed`, zie loadPersonal).
    static func asksServer(force: Bool, uid: String?, pulled: Bool, failed: String, round: String) -> Bool {
        !force && (uid == nil || pulled) && failed != round
    }
    @ObservationIgnored private var serverRound = 0 // telt de laadrondes (fetchAll)
    @ObservationIgnored private var serverFailed = "" // taak#ronde waarin de server geen antwoord gaf

    // Voor welke taak (dagdeel|lezer|afdruk) edition.json van de server kwam. Een Editie die dit toestel vroeger
    // zelf samenstelde (1.2) past misschien ook, maar de server heeft het laatste woord: die vragen we één keer.
    private var personalServerTask: String {
        get { UserDefaults.standard.string(forKey: "hoot.editionServerTask") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "hoot.editionServerTask") }
    }

    // POST /api/edition (v2) met je token. 401: één keer vernieuwen en opnieuw. Zonder account de
    // history-regels van je vorige Edities van de server (`earlier`). Je leesprofiel alleen als samenvatting
    // (`reading`, uit de rekenkern: precies wat het web stuurt); nooit het ruwe profiel.
    private func askServer(global: Edition, owner: String) async -> [String: Any]? {
        let reading = await Self.readingSummary(of: affinity)
        var body = Self.serverBody(followed: followed.map(\.id), interests: interests, topics: topics, favorites: favorites,
                                   taste: taste, readIds: readIds, reading: reading)
        var token: String?
        if owner == "anon" {
            let mine = personalServerTask.hasSuffix("|anon|\(personal?.basis ?? "")") && personalRaw?["owner"] as? String == "anon" ? personalRaw : nil
            // Ook het vangnet van een vorig dagdeel telt mee (1.3.1): het stond op dit toestel in beeld.
            if let prior = try? await EditionEngine.shared.earlier(local: Self.json(mine), account: Self.json(provisionalKept(owner: owner)), id: global.id, owner: owner),
               let rows = try? await EditionEngine.shared.nextHistory(prior: prior, edition: Self.json(["id": global.id])) {
                let earlier = Self.rows(rows)
                if !earlier.isEmpty { body["earlier"] = earlier }
            }
        } else {
            guard let t = await account?.editionToken() else { return nil }
            token = t
        }
        guard JSONSerialization.isValidJSONObject(body), let payload = try? JSONSerialization.data(withJSONObject: body) else { return nil }
        let r = await Self.requestServer(payload, token: token, renew: { await self.account?.editionToken(renew: true) })
        let accepted = Self.acceptServer(r.data, status: r.status, id: global.id, owner: owner)
        // De widget mag bij een nieuw dagdeel zelf dezelfde vraag stellen (WidgetOphalen), maar alleen zonder
        // account: met account is je token nodig, en dat blijft in de app.
        if accepted != nil { WidgetSchrijver.bewaarVraag(token == nil ? payload : nil) }
        return accepted
    }

    // De vraag aan de server met alles wat mislukken mag: 401 vernieuwt het token één keer; een time-out, 429 of 503
    // geeft één stille nieuwe poging (1.3.1), met de laadweergave gewoon aan.
    static func requestServer(_ payload: Data, token: String?, renew: () async -> String?) async -> (status: Int, data: Data?) {
        var token = token
        var r = await HootAPI.serverEdition(payload, token: token)
        if r.status == 401, token != nil, let fresh = await renew() {
            token = fresh
            r = await HootAPI.serverEdition(payload, token: fresh)
        }
        if retriesServer(r.status), !DebugLaunch.offline {
            try? await Task.sleep(for: retryPause)
            r = await HootAPI.serverEdition(payload, token: token, timeout: retryTimeout)
        }
        return r
    }

    // Wanneer de server nog één keer gevraagd wordt: geen antwoord binnen de tijd (0), te druk (429) of even weg (503).
    static func retriesServer(_ status: Int) -> Bool { status == 0 || status == 429 || status == 503 }
    nonisolated(unsafe) static var retryPause: Duration = .seconds(1.5) // tests zetten hem kort
    static let retryTimeout: TimeInterval = 12

    // De vraag van v2 zoals het web hem stelt (serverRequest in src/lib/editionSync.js): dezelfde velden, en
    // `reading` alleen als lezen al meetelt.
    static func serverBody(followed: [String], interests: [String], topics: [String], favorites: [String], taste: Taste, readIds: [String], reading: [String: Any]?) -> [String: Any] {
        var body: [String: Any] = [
            "v": 2, "followed": followed, "interests": interests, "topics": topics, "rubrieken": RubriekVersie.current, "onderwerpen": OnderwerpVersie.current, "favorites": favorites,
            "taste": taste.isEmpty ? NSNull() : Self.encoded(taste), "readIds": Array(readIds.suffix(1500)),
        ]
        if let reading { body["reading"] = reading }
        return body
    }

    // Je leesprofiel samengevat voor de server (besluit Alex 11 november 2026: "Leesprofiel meesturen"):
    // readingSummary uit de rekenkern, dezelfde functie als op het web. Nil zolang lezen nog niet meetelt.
    static func readingSummary(of profile: Affinity) async -> [String: Any]? {
        guard profile.n > 0, let text = try? await EditionEngine.shared.readingSummary(json(encoded(profile))) else { return nil }
        return (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any]
    }

    // Het antwoord van de server, als het van dit dagdeel en deze lezer is: de Editie zoals hij hem gaf.
    static func acceptServer(_ data: Data?, status: Int, id: String, owner: String) -> [String: Any]? {
        guard status == 200, let data, let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let e = o["edition"] as? [String: Any], e["id"] as? String == id, e["owner"] as? String == owner,
              e["entries"] is [Any] else { return nil }
        return e
    }

    // Letterlijk bewaren wat de server gaf (edition.json), en het vangnet vervangen.
    func keepServer(_ raw: [String: Any], task: String) {
        keep(raw)
        personalServerTask = task
        personalProvisional = nil
    }

    // Het vangnet: zelf samenstellen met de rekenkern, met dezelfde samenvatting van je leesprofiel als de server, als de berichten
    // van dit dagdeel er zijn. Voorlopig: alleen in het geheugen, nooit in edition.json, je account of je
    // geschiedenis. De volgende ronde (weer online, terug in de app) vraagt opnieuw de server.
    private func provisional(global: Edition, owner: String, basis: String?, force: Bool) async {
        guard let basis, !itemsById.isEmpty, Self.itemsCurrent(itemsEdition: itemsEdition, loading: partsLoading, edition: global.id) else { return }
        let followedIds = followed.map(\.id)
        do {
            // `previous` uit alles wat dit toestel van deze lezer liet zien: de Editie van de server én het vangnet
            // van een eerder dagdeel (1.3.1), samen, ontdubbeld op id; niet alleen de laatste van de server.
            let mine = personalServerTask.hasPrefix("\(personal?.id ?? "-")|\(owner)|") ? personalRaw : nil
            let priorJSON = try await EditionEngine.shared.earlier(local: Self.json(mine), account: Self.json(provisionalKept(owner: owner)), id: global.id, owner: owner)
            let prior = Self.rows(priorJSON)
            forced.insert(global.id)
            let input = try composeInput(global: global, owner: owner, previous: prior, reading: true)
            let out = try await EditionEngine.shared.compose(input: input)
            guard var raw = try JSONSerialization.jsonObject(with: out) as? [String: Any], raw["id"] as? String == global.id else { throw EditionEngine.Failure.noResult }
            guard followed.map(\.id) == followedIds, ownerNow == owner else { return }
            raw["owner"] = owner
            raw["basis"] = basis
            raw["provisional"] = true
            if force { keep(raw); return } // gedwongen samengesteld (Debug): tonen, niet naar je account
            // Het vangnet onthouden voor het volgende dagdeel: met zijn history, zoals het web elke Editie vastlegt.
            if let rows = try? await EditionEngine.shared.nextHistory(prior: priorJSON, edition: Self.json(["id": global.id])) { raw["history"] = Self.rows(rows) }
            provisionalRaw = raw
            Self.writeRaw(raw, to: Self.provisionalFile)
            personalProvisional = Self.decodeEdition(raw)
        } catch {
            Self.log.error("rekenkern faalt: \(error.localizedDescription, privacy: .public)")
        }
    }

    // Welke dagdelen al gedwongen zijn samengesteld (`-HootEngine`): daarna gewoon weer (a).
    private var forced: Set<String> = []

    // Een JSON-lijst van objecten (regels, Edities) terug naar Swift.
    private static func rows(_ json: String) -> [[String: Any]] {
        (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [[String: Any]] ?? []
    }

    private func keep(_ raw: [String: Any]) {
        personalRaw = raw
        personal = Self.decodeEdition(raw)
        Self.writeRaw(raw, to: "edition.json")
    }
    private static func decodeEdition(_ raw: [String: Any]) -> Edition? {
        guard let data = try? JSONSerialization.data(withJSONObject: raw) else { return nil }
        return try? JSONDecoder().decode(Edition.self, from: data)
    }
    // Als JSON-tekst voor de rekenkern; niets (nil, of geen geldig object) wordt "null".
    private static func json(_ object: Any?) -> String {
        guard let object, JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object) else { return "null" }
        return String(decoding: data, as: UTF8.self)
    }
    private static func encoded<T: Encodable>(_ value: T) -> Any {
        (try? JSONEncoder().encode(value)).flatMap { try? JSONSerialization.jsonObject(with: $0) } ?? NSNull()
    }

    // De invoer voor de rekenkern (src/lib/editionCore.js): zo veel mogelijk de ruwe antwoorden van de
    // server zoals HootAPI ze bewaarde, want dat is precies wat de website krijgt, ook velden die de
    // app zelf niet kent (wide, near). Ontbreekt een bestand, dan wat de app in het geheugen heeft.
    // Geen `now` of `builtAt`: de rekenkern neemt global.builtAt, net als de website.
    // `reading`: het leesprofiel als samenvatting (readingSummary in de rekenkern), zoals de server het krijgt.
    private func composeInput(global: Edition, owner: String, previous: [[String: Any]], reading: Bool = false) throws -> Data {
        let start = HootAPI.cached("api/feed", ["deel": "start"]).flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] }
        var globalRaw = start?["edition"] as? [String: Any]
        if globalRaw?["id"] as? String != global.id { globalRaw = Self.encoded(global) as? [String: Any] }
        guard let globalRaw else { throw EditionEngine.Failure.noResult }
        let stories: Any = start?["stories"] as? [[String: Any]] ?? Self.encoded(Array(storiesById.values))
        let sourcesRaw: Any = start?["sources"] as? [[String: Any]] ?? Self.encoded(sources)
        var items: [Any] = []
        for s in followed {
            if let v = parts[s.id], let data = HootAPI.cached("api/feed", ["bron": s.id, "v": v]), let part = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let list = part["items"] as? [Any] {
                items += list
            } else if let list = Self.encoded(itemsById.values.filter { $0.source == s.id }) as? [Any] {
                // Niet in de cache: wat deze ronde van de bron gaf (loadPersonal wacht op die ronde), of bij een
                // mislukt deel wat we er al van hadden.
                items += list
            }
        }
        var input: [String: Any] = [
            "global": globalRaw, "stories": stories, "items": items, "sources": sourcesRaw,
            "followed": followed.map(\.id), "interests": interests, "topics": topics, "favorites": favorites,
            "affinity": affinity.n > 0 ? Self.encoded(affinity) : NSNull(), "taste": taste.isEmpty ? NSNull() : Self.encoded(taste),
            "readIds": Array(readIds.suffix(1500)), "previous": previous, "owner": owner,
        ]
        if reading { input["reading"] = input["affinity"]; input["affinity"] = NSNull() }
        return try JSONSerialization.data(withJSONObject: input)
    }

    // ---- Digest ----
    // Levert de server dit vak? Zolang de Digest niet geladen is: ja.
    private var digestLoadedAt: Date?
    private var digestTriedAt: Date? // laatste poging die niet vers was: de uurlijkse herpoging blijft zo werken
    // Meer of minder hiervan bij een plek in de Editie (`id`: verhaal of bericht). Minder klapt hem in.
    func vote(_ id: String, items: [Item], up: Bool) {
        taste.vote(items, up: up)
        if !up { less = Array(([id] + less.filter { $0 != id }).prefix(200)) }
    }
    func undoLess(_ id: String, items: [Item]) {
        taste.vote(items, up: true)
        less.removeAll { $0 == id }
    }
    func clearTaste() { taste = Taste(); less = [] }

    // ---- Wat Hoot van je leerde (bouwspec §8) ----
    // Hetzelfde profiel als De Redacteur gebruikt, uit de bundel (profileSummary): gekozen, geleerd en
    // minder. Het aanbod komt uit de berichten van je bronnen; daarvan gaan alleen soort, bron en
    // onderwerpen mee (de rest heeft het profiel niet nodig).
    func profileSummary() async -> ProfileSummary {
        let on = Set(followed.map(\.id))
        let pool: [[String: Any]] = itemsById.values.filter { $0.kind == "article" && on.contains($0.source) && $0.streamOnly != true }.map { ["kind": "article", "source": $0.source, "topics": $0.topics ?? []] }
        let input: [String: Any] = [
            "interests": interests, "topics": topics, "favorites": favorites, "followed": Array(on),
            "affinity": affinity.n > 0 ? Self.encoded(affinity) : NSNull(), "taste": taste.isEmpty ? NSNull() : Self.encoded(taste),
            "sources": Self.encoded(sources), "items": pool,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: input) else { return ProfileSummary() }
        return (try? await EditionEngine.shared.profileSummary(input: data)) ?? ProfileSummary()
    }
    // "Vergeet dit": het onderwerp valt uit je leesprofiel, de teller blijft (forgetTopic op het web).
    func forgetTopic(_ topic: String) {
        guard affinity.topics[topic] != nil else { return }
        affinity.topics.removeValue(forKey: topic)
        refreshPersonal()
    }
    // "Minder" terugdraaien: het onderwerp weer op nul, niet gewist (zo blijft in je account te zien dat
    // je het ooit zei, en het telt niet meer mee), zoals het web.
    func restoreLess(_ topic: String) {
        taste.topics[topic] = 0
        refreshPersonal()
    }

    func offersField(_ id: String) -> Bool { digest.map { $0.fields.contains { $0.id == id } } ?? true }
    // Zonder vers laadmoment (offline gestart, Selectie uit de cache) telt de laatste poging; zonder poging is hij oud.
    static func digestIsOld(hasDigest: Bool, loadedAt: Date?, triedAt: Date?, now: Date = .now) -> Bool {
        guard hasDigest else { return false }
        guard let at = loadedAt ?? triedAt else { return true }
        return now.timeIntervalSince(at) > 3600
    }
    func loadDigest(force: Bool = false) async {
        let due = digest?.next.flatMap(HootDate.parse).map { $0 < .now } ?? false
        let old = Self.digestIsOld(hasDigest: digest != nil, loadedAt: digestLoadedAt, triedAt: digestTriedAt)
        if digestStatus == .loading || (!force && digest != nil && !due && !old) { return }
        digestStatus = .loading
        do {
            // Kwam het antwoord uit de bewaarde kopie, dan faalde het netwerk: de Selectie blijft staan,
            // maar de verversing is mislukt (en een nieuwe poging mag meteen weer).
            let (fresh, fromCache): (Digest, Bool) = try await HootAPI.fetch("api/vak")
            digest = fresh
            if !fromCache { digestLoadedAt = .now } else { digestTriedAt = .now }
            digestStatus = .ready
            digestRefreshFailed = fromCache
        } catch {
            digestStatus = digest == nil ? .failed : .ready
            digestRefreshFailed = true
            digestTriedAt = .now
        }
    }

    // ---- Bewaard en gelezen ----
    func isSaved(_ item: Item) -> Bool { savedKey(item) != nil }
    // Onder welke id staat dit bericht Bewaard? De eigen, of die van een eerdere kop van hetzelfde stuk.
    private func savedKey(_ item: Item) -> String? {
        if saved.contains(where: { $0.id == item.id }) { return item.id }
        return (item.formerIds ?? []).first { old in saved.contains { $0.id == old } }
    }
    func toggleSave(_ item: Item) {
        if let key = savedKey(item), let i = saved.firstIndex(where: { $0.id == key }) { saved.remove(at: i) } else {
            saved.insert(item, at: 0)
            affinity.learn(item, weight: 3) // bewaren zegt meer over je smaak dan openen
        }
    }
    func removeSaved(at offsets: IndexSet) { saved.remove(atOffsets: offsets) }
    // "Ongedaan maken" na verwijderen: terug op zijn oude plek.
    func restoreSaved(_ item: Item, at index: Int) { if !isSaved(item) { saved.insert(item, at: min(index, saved.count)) } }
    /// Meten zonder volgen (Telling.swift): één gebeurtenis, met het dagdeel van de Editie die je ziet.
    // Het dagdeel van de Editie die je ziet (bij de dagdeelwissel even de vorige): lezen in de vorige telt niet voor de nieuwe.
    func tel(_ event: Telling.Event) { let e = shownEdition ?? edition; Telling.stuur(event, dagdeel: Telling.dagdeel(date: e?.date, slot: e?.slot)) }
    func markRead(_ item: Item) {
        tel(.artikelOpen)
        guard !readSet.contains(item.id) else { return }
        affinity.learn(item, weight: 1)
        readSet.insert(item.id)
        readOrder.append(item.id)
        if readOrder.count > 2000 {
            let drop = readOrder.prefix(readOrder.count - 2000)
            readSet.subtract(drop)
            readOrder.removeFirst(drop.count)
        }
    }
    func isRead(_ item: Item) -> Bool { readSet.contains(item.id) || (item.formerIds ?? []).contains { readSet.contains($0) } }

    // ---- Opslag ----
    private func save<T: Encodable>(_ key: String, _ value: T) {
        defaults.set(try? JSONEncoder().encode(value), forKey: key)
    }
    private static func load<T: Decodable>(_ key: String, _ defaults: UserDefaults) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    // Bestanden in Application Support (gaan mee in de back-up; atomisch geschreven).
    private static let folder: URL? = {
        let url = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        return url?.appendingPathComponent("Hoot", isDirectory: true)
    }()
    private static func write<T: Encodable>(_ value: T, to name: String) {
        guard let folder, let data = try? JSONEncoder().encode(value) else { return }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try? data.write(to: folder.appendingPathComponent(name), options: .atomic)
    }
    // Dezelfde bestanden als ruwe JSON (voor jouw Editie: wat de rekenkern gaf, gaat zo door naar je account).
    private static func writeRaw(_ object: Any, to name: String) {
        guard let folder, JSONSerialization.isValidJSONObject(object), let data = try? JSONSerialization.data(withJSONObject: object) else { return }
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try? data.write(to: folder.appendingPathComponent(name), options: .atomic)
    }
    private static func readRaw(_ name: String) -> [String: Any]? {
        guard let folder, let data = try? Data(contentsOf: folder.appendingPathComponent(name)) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
    private static func read<T: Decodable>(_ name: String) -> T? {
        guard let folder, let data = try? Data(contentsOf: folder.appendingPathComponent(name)) else { return nil }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            // Onleesbaar (beschadigd): opzij als `.kapot`, zodat het niet stil overschreven wordt.
            try? data.write(to: folder.appendingPathComponent(name + ".kapot"), options: .atomic)
            unreadable.insert(name)
            return nil
        }
    }
    private static var unreadable: Set<String> = []
}
