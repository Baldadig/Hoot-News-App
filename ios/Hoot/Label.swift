import Foundation

// Het label boven een verhaal: één kleine, pure functie (geen winkel, geen scherm), zodat dezelfde regels
// op het web (src/lib/label.js) en hier met dezelfde testgevallen te toetsen zijn (LabelTests).
//   Kicker: de (sub)interesse van de lezer als het verhaal die raakt ("Politiek · Den Haag", "Cultuur ·
//           Film & series"), anders de rubriek. Een sportbron is Sport.
//   Waarom: alleen als de regel iets toevoegt. "Omdat je X volgt" valt weg als de kicker dat al zegt.
//   Buiten je bronnen: hoort bij de bronregel, niet bij de kicker.
enum StoryLabel {
    // Rubrieken waar de lezer zijn vak of zijn bubbel van maakt: die houden hun eigen label.
    static let own: Set<String> = ["bubbel", "breed"]

    // Bij welke rubriek hoort de plek van De Redacteur? (de plek zelf zegt wat het verhaal is)
    static let deskRubriek = ["binnenland": "binnenland", "regio": "binnenland", "buitenland": "wereld", "vs": "wereld", "middenoosten": "wereld", "oekraine": "wereld", "wetenschap": "wetenschap", "tech": "tech", "economie": "economie"]

    // `topics`: de onderwerpen van het verhaal. `sourceCat`: de rubriek van de bron in de catalogus.
    // `desk`: de plek van De Redacteur (binnenland, tech, …). `interests`: de rubrieken die de lezer koos.
    // `picked`: de onderwerpen die de lezer zelf aantikte (leeg = alles van de rubriek, dus geen sub).
    static func kicker(topics: [String], sourceCat: String?, desk: String?, interests: [String], picked: [String]) -> String? {
        let mine = Set(topics)
        let hit = Rubriek.alle.filter { !mine.isDisjoint(with: $0.topics) }
        let rubriek: Rubriek?
        if sourceCat == "sport" {
            rubriek = Rubriek.byId["sport"] // een sportbron is Sport, wat de onderwerpen ook zeggen
        } else {
            // Je interesse telt alleen als het verhaal er echt over gaat: de plek zegt hetzelfde, of het eerste
            // (hoofd)onderwerp hoort erbij. Eén los bijonderwerp (een boot met migranten die ook "media" raakt)
            // maakt er nog geen Cultuur van. Zonder plek is er niets dat tegenspreekt, dan telt elke raak.
            let wanted = hit.filter { r in
                guard interests.contains(r.id) else { return false }
                guard let d = desk, let home = deskRubriek[d] else { return true }
                return home == r.id || topics.first.map(r.topics.contains) == true
            }
            // Eerst een rubriek met een aangetikt onderwerp erin, dan de eerste die de lezer koos.
            rubriek = wanted.first { r in r.topics.contains { mine.contains($0) && picked.contains($0) } } ?? wanted.first
        }
        if let r = rubriek {
            let sub = interests.contains(r.id) || r.id == "sport" ? r.topics.first { mine.contains($0) && picked.contains($0) } : nil
            return [r.label, sub.map(Taste.label)].compactMap { $0 }.joined(separator: " · ")
        }
        if let d = desk.flatMap({ Desk.labels[$0] }), !["bubbel", "extern"].contains(desk ?? "") { return d }
        if let r = hit.first { return r.label }
        if let c = sourceCat, let r = Rubriek.alle.first(where: { $0.cats.contains(c) }) { return r.label }
        return nil
    }

    // Het waarom van De Redacteur (code en tekst uit de Editie), of niets als het niets toevoegt.
    static let silent: Set<String> = ["rubriek", "extern", "bubbel", "breed"]
    static func why(code: String?, text: String?, kicker: String?) -> String? {
        guard let text = text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return nil }
        if silent.contains(code ?? "") { return nil }
        if code == "interest", let k = kicker, text.hasPrefix("Omdat je "), text.hasSuffix(" volgt") {
            let naam = String(text.dropFirst("Omdat je ".count).dropLast(" volgt".count))
            if !naam.isEmpty, k.range(of: naam, options: [.caseInsensitive, .diacriticInsensitive]) != nil { return nil }
        }
        return text
    }

    // Staat het verhaal buiten de bronnen die de lezer volgt? Dan zegt de bronregel dat ("Buiten je bronnen").
    static func outside(desk: String?, followed: Bool) -> Bool {
        if desk == "extern" { return true }
        return !followed && !own.contains(desk ?? "")
    }
    static let outsideText = "Buiten je bronnen"
}
