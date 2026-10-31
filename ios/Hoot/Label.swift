import Foundation

// Het label boven een verhaal: één kleine, pure functie (geen winkel, geen scherm), een regel-voor-regel
// spiegel van labelFor in src/lib/label.js. Dezelfde regels en DEZELFDE testgevallen: beide lezen
// tests/fixtures/label-cases.json (LabelTests hier, tests/label.test.mjs op het web). Verander je hier een
// regel, dan daar ook, en zet het geval in de fixture.
//   Kicker:  alleen een interesse bij een sterke treffer, in deze volgorde:
//            1. de plek van het verhaal (desk) hoort bij een rubriek die je koos: "Wereld" (buitenland, vs,
//               oekraine … zijn Wereld). Tikte je een onderwerp aan dat in het verhaal zit: "Wereld · Oekraïne".
//            2. het hoofdonderwerp (het eerste) is iets wat je volgt: "Politiek · Den Haag" als je het
//               aantikte, anders alleen de rubriek. Een los bijonderwerp telt niet, en een zwak onderwerp
//               (media: valt al op een omroep in de tekst) nooit.
//            Anders de rubriek van de plek of het bericht; een sportbron is Sport. Buiten je bubbel en
//            Waar iedereen over schrijft houden hun eigen label.
//   Waarom:  de regel van De Redacteur, alleen als die iets toevoegt: niet "Omdat je X volgt" als de kicker al
//            een interesse van je is. Wel "Vervolg op wat je las", "Groot nieuws · N bronnen", "Uit je
//            voorkeursbron …".
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

    // Bij welke rubriek hoort de plek van De Redacteur?
    static let deskRubriek = ["binnenland": "binnenland", "regio": "binnenland", "buitenland": "wereld", "vs": "wereld", "middenoosten": "wereld", "oekraine": "wereld", "wetenschap": "wetenschap", "tech": "tech", "economie": "economie"]
    // Onderwerpen die de server al bij een los woord geeft: die maken nooit zelf een interesse-kicker.
    static let weak: Set<String> = ["media"]

    private static let rubriekOf: [String: Rubriek] = Dictionary(Rubriek.alle.flatMap { r in r.topics.map { ($0, r) } }, uniquingKeysWith: { a, _ in a })

    // `topics`: de onderwerpen van het verhaal, het hoofdonderwerp eerst. `follows`: de onderwerpen die de
    // lezer volgt (store.topics, op het web prefs.topics). `interests`: de gekozen rubrieken (zonder: af te
    // leiden uit `follows`). Wat je aantikte zijn de gevolgde onderwerpen van een rubriek waar je niet alles
    // volgt (Rubriek.picked). `cat`: de rubriek van de bron. `desk`/`deskLabel`: de plek in de Editie en haar
    // naam. `section`: de rubriek van het bericht zelf. `whyCode`/`whyText`: het waarom van De Redacteur.
    // `followed`: de bron staat bij je bronnen.
    static func label(topics: [String] = [], follows: [String] = [], interests: [String]? = nil, cat: String? = nil, desk: String? = nil, deskLabel: String? = nil, section: String? = nil, whyCode: String? = nil, whyText: String? = nil, followed: Bool = true) -> Result {
        let outside = desk == "extern" || whyCode == "extern" || !followed
        let chosen = interests ?? Rubriek.alle.filter { r in r.topics.contains(where: follows.contains) }.map(\.id)
        let tapped = Set(Rubriek.picked(from: follows, interests: chosen))
        func kick(_ r: Rubriek, _ t: String?) -> String {
            guard let t, tapped.contains(t) else { return r.label }
            let topic = Taste.label(t)
            return r.label == topic ? r.label : "\(r.label) · \(topic)"
        }
        var kicker: String?
        var byInterest = false
        if desk == "bubbel" || desk == "breed" {
            kicker = deskLabel // "Buiten je bubbel · via …", "Waar iedereen over schrijft · N bronnen"
        } else if let home = desk.flatMap({ deskRubriek[$0] }), chosen.contains(home), let r = Rubriek.byId[home] {
            kicker = kick(r, topics.first { r.topics.contains($0) && tapped.contains($0) })
            byInterest = true
        } else if let t = topics.first, follows.contains(t), !weak.contains(t), let r = rubriekOf[t], chosen.contains(r.id) {
            kicker = kick(r, t)
            byInterest = true
        } else if cat == "sport" {
            kicker = "Sport"
        } else {
            let plek = desk == "extern" ? nil : deskLabel
            kicker = [plek, section].compactMap { $0 }.first { !$0.isEmpty }
        }
        // Zegt de kicker al een rubriek die je koos ("Wereld", "Sport"), dan is "Omdat je … volgt" dubbel.
        if !byInterest, let k = kicker, Rubriek.alle.contains(where: { chosen.contains($0.id) && $0.label == k }) { byInterest = true }
        let text = whyText?.trimmingCharacters(in: .whitespacesAndNewlines)
        let keep = text?.isEmpty == false && !inLabel.contains(whyCode ?? "") && !(whyCode == "interest" && byInterest)
        return Result(kicker: kicker, why: keep ? whyText : nil, outside: outside)
    }
}
