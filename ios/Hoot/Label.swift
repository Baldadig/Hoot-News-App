import Foundation

// Het label boven een verhaal: één kleine, pure functie (geen winkel, geen scherm), een regel-voor-regel
// spiegel van labelFor in src/lib/label.js. Dezelfde regels en DEZELFDE testgevallen: beide lezen
// tests/fixtures/label-cases.json (LabelTests hier, tests/label.test.mjs op het web; het bestand is op
// beide takken gelijk). Verander je hier een regel, dan daar ook, en zet het geval in de fixture.
//   Kicker:  alleen bij een sterke treffer "interesse · onderwerp" ("Politiek · Den Haag"); anders de
//            rubriek van de plek, of die van het bericht. Een sportbron is Sport.
//            Sterk is een onderwerp dat je volgt en dat het verhaal echt draagt: het past bij de rubriek
//            van de plek (Binnenland → Binnenland of Politiek), of het staat in de kop of is het vak van
//            de bron (`mainTopics`, van de server). Een losse vermelding in de samenvatting ("omroep" →
//            Media bij een verhaal over migranten) is zwak en geeft geen kicker.
//            Buiten je bubbel en Waar iedereen over schrijft houden hun eigen label.
//   Waarom:  de regel van De Redacteur, alleen als die iets toevoegt: nooit "Omdat je X volgt" (bij een
//            sterke treffer zegt de kicker het al, bij een zwakke klopt het niet). Wel "Vervolg op wat je
//            las", "Groot nieuws · N bronnen", "Uit je voorkeursbron …", "Naast je bubbel …", "Omdat je
//            vaak over X leest".
//   Buiten je bronnen: hoort bij de bronregel, niet bij de kicker.
enum StoryLabel {
    struct Result: Equatable {
        var kicker: String?
        var why: String?
        var outside: Bool
    }

    // Deze redenen zegt het label zelf al (WHY_IN_LABEL op het web).
    static let inLabel: Set<String> = ["rubriek", "extern", "bubbel", "breed"]
    static let outsideText = "Buiten je bronnen"

    // Welke interesses passen bij de rubriek van een plek in de Editie (DESK_INTERESTS op het web).
    static let deskInterests: [String: [String]] = [
        "binnenland": ["binnenland", "politiek"],
        "regio": ["binnenland"],
        "buitenland": ["wereld", "politiek"],
        "vs": ["politiek", "wereld"],
        "middenoosten": ["wereld"],
        "oekraine": ["wereld"],
        "wetenschap": ["wetenschap"],
        "tech": ["tech"],
        "economie": ["economie"],
    ]

    private static let rubriekOf: [String: Rubriek] = Dictionary(Rubriek.alle.flatMap { r in r.topics.map { ($0, r) } }, uniquingKeysWith: { a, _ in a })

    // Spiegel van de geografische voorrang in label.js; gedeelde fixtures bewaken de uitkomst.
    private static let geographicTopics: Set<String> = ["nederland", "europa", "vs-politiek", "trump", "oekraine", "middenoosten", "azie", "afrika", "latam"]
    private static let placeTopics: [String: Set<String>] = [
        "binnenland": ["nederland"], "regio": ["nederland"], "vs": ["vs-politiek", "trump"],
        "middenoosten": ["middenoosten"], "oekraine": ["oekraine"],
    ]

    // Draagt dit onderwerp het verhaal? Het past bij de rubriek van de plek, of het staat in de kop.
    static func strong(_ t: String, desk: String?, mainTopics: [String]) -> Bool {
        if geographicTopics.contains(t), desk == "buitenland", !mainTopics.contains(t) { return false }
        if geographicTopics.contains(t), let allowed = desk.flatMap({ placeTopics[$0] }), !allowed.contains(t) { return false }
        let past = rubriekOf[t].map { r in (desk.flatMap { deskInterests[$0] } ?? []).contains(r.id) } ?? false
        return past || mainTopics.contains(t)
    }

    // `topics`: de onderwerpen van het verhaal. `mainTopics`: de onderwerpen uit de kop en het vak van de
    // bron (deelverzameling van topics, van de server). `follows`: de onderwerpen die de lezer volgt
    // (store.topics, op het web prefs.topics). `cat`: de rubriek van de bron. `desk`/`deskLabel`: de plek
    // in de Editie en haar naam. `section`: de rubriek van het bericht zelf. `whyCode`/`whyText`: het
    // waarom van De Redacteur. `followed`: de bron staat bij je bronnen.
    static func label(topics: [String] = [], mainTopics: [String] = [], follows: [String] = [], cat: String? = nil, desk: String? = nil, deskLabel: String? = nil, section: String? = nil, whyCode: String? = nil, whyText: String? = nil, whyDetail: Bool = false, followed: Bool? = nil) -> Result {
        let outside = followed == false || (followed == nil && (desk == "extern" || whyCode == "extern"))
        let mine = topics.first { follows.contains($0) && Taste.labels[$0] != nil && rubriekOf[$0] != nil && strong($0, desk: desk, mainTopics: mainTopics) }
        var kicker: String?
        if desk == "bubbel" || desk == "breed" {
            kicker = deskLabel // "Buiten je bubbel · via …", "Waar iedereen over schrijft · N bronnen"
        } else if let mine, let r = rubriekOf[mine] {
            let topic = Taste.label(mine)
            kicker = r.label == topic ? r.label : "\(r.label) · \(topic)"
        } else if cat == "sport" {
            kicker = "Sport"
        } else {
            let plek = desk == "extern" ? nil : deskLabel
            kicker = [plek, section].compactMap { $0 }.first { !$0.isEmpty }
        }
        let text = whyText?.trimmingCharacters(in: .whitespacesAndNewlines)
        let explicitFollowReason = text?.hasPrefix("Omdat je ") == true && (text?.hasSuffix(" volgt") == true || text?.hasSuffix(" volgt.") == true)
        let keep = text?.isEmpty == false && (!inLabel.contains(whyCode ?? "") || whyDetail) && whyCode != "interest" && !explicitFollowReason
        // "Groot nieuws" staat er één keer: de kicker van een brede plek zegt het al, en zegt de kicker
        // hetzelfde als de waarom-regel, dan valt de waarom-regel weg (gelijk aan label.js).
        func plain(_ t: String?) -> String { (t ?? "").replacingOccurrences(of: #"\s*·\s*\d+\s+bron(?:nen)?$"#, with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces).lowercased() }
        let twice = keep && (((desk == "breed" || desk == "bubbel") && whyCode == "groot") || (kicker != nil && plain(kicker) == plain(text)))
        return Result(kicker: kicker, why: keep && !twice ? whyText : nil, outside: outside)
    }
}
