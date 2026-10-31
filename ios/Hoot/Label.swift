import Foundation

// Het label boven een verhaal: één kleine, pure functie (geen winkel, geen scherm), een regel-voor-regel
// spiegel van labelFor in src/lib/label.js. Dezelfde regels, dezelfde testgevallen (LabelTests): verander
// je hier een regel, dan daar ook.
//   Kicker:  de (sub)interesse van de lezer als het verhaal die raakt ("Politiek · Den Haag", "Cultuur ·
//            Film & series"), anders de rubriek; een sportbron is Sport. Buiten je bubbel en Waar iedereen
//            over schrijft houden hun eigen label.
//   Waarom:  de regel van De Redacteur, alleen als die iets toevoegt: niet "Omdat je X volgt" als de kicker
//            dat al zegt. Wel "Vervolg op wat je las", "Groot nieuws · N bronnen", "Uit je voorkeursbron …".
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

    // Bij welke rubriek hoort de plek van De Redacteur? Alleen voor de bijonderwerp-controle hieronder.
    static let deskRubriek = ["binnenland": "binnenland", "regio": "binnenland", "buitenland": "wereld", "vs": "wereld", "middenoosten": "wereld", "oekraine": "wereld", "wetenschap": "wetenschap", "tech": "tech", "economie": "economie"]

    private static let rubriekOf: [String: Rubriek] = Dictionary(Rubriek.alle.flatMap { r in r.topics.map { ($0, r) } }, uniquingKeysWith: { a, _ in a })

    // `topics`: de onderwerpen van het verhaal. `follows`: de onderwerpen die de lezer volgt (store.topics, op
    // het web prefs.topics). `cat`: de rubriek van de bron. `desk`/`deskLabel`: de plek in de Editie en haar
    // naam. `section`: de rubriek van het bericht zelf. `whyCode`/`whyText`: het waarom van De Redacteur.
    // `followed`: de bron staat bij je bronnen.
    static func label(topics: [String] = [], follows: [String] = [], cat: String? = nil, desk: String? = nil, deskLabel: String? = nil, section: String? = nil, whyCode: String? = nil, whyText: String? = nil, followed: Bool = true) -> Result {
        let outside = desk == "extern" || whyCode == "extern" || !followed
        // Aanvulling op het web (daar nog over te nemen): een los bijonderwerp maakt er geen interesse van.
        // Een boot met migranten die per ongeluk ook "film" raakt blijft Binnenland: de plek zegt Binnenland
        // en het hoofdonderwerp hoort niet bij Cultuur. Zonder bekende plek is er niets dat tegenspreekt.
        func raakt(_ t: String, _ r: Rubriek) -> Bool {
            guard let d = desk, let home = deskRubriek[d] else { return true }
            return home == r.id || topics.first.map(r.topics.contains) == true
        }
        let mine = topics.first { t in follows.contains(t) && (rubriekOf[t].map { raakt(t, $0) } ?? false) }
        var kicker: String?
        var byInterest = false
        if desk == "bubbel" || desk == "breed" {
            kicker = deskLabel // "Buiten je bubbel · via …", "Waar iedereen over schrijft · N bronnen"
        } else if let t = mine, let r = rubriekOf[t] {
            let topic = Taste.label(t)
            kicker = r.label == topic ? r.label : "\(r.label) · \(topic)"
            byInterest = true
        } else if cat == "sport" {
            kicker = "Sport"
        } else {
            let plek = desk == "extern" ? nil : deskLabel
            kicker = [plek, section].compactMap { $0 }.first { !$0.isEmpty }
        }
        let text = whyText?.trimmingCharacters(in: .whitespacesAndNewlines)
        let keep = text?.isEmpty == false && !inLabel.contains(whyCode ?? "") && !(whyCode == "interest" && byInterest)
        return Result(kicker: kicker, why: keep ? whyText : nil, outside: outside)
    }
}
