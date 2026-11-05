import Foundation

// Het einde van de Stroom (keuze r5-stroom-einde, 5 november; review F7, G6). Gelijk aan het web
// (src/lib/stroom-einde.js): de Stroom laadt niet eindeloos door, maar houdt op waar je de vorige keer
// was: "Hier was je gebleven", "Je bent bij." en een stille knop "Ouder nieuws tonen" (per keer `page`
// berichten). Geen eerder bezoek, of langer dan een dag geleden: de laatste 24 uur, en dan alleen
// "Je bent bij.". Buiten je bubbel is een korte, eigen lijst: daar geen grens.
enum StroomEinde {
    static let dag: TimeInterval = 24 * 60 * 60
    static let page = 60

    struct Grens: Equatable {
        let at: Date
        let eerder: Bool // de grens komt van je vorige bezoek: dan zeggen we "Hier was je gebleven"
    }

    // De grens van dit bezoek. `mark`: het nieuwste bericht dat je de vorige keer in de Stroom zag
    // (HootStore.streamMark, vast zolang je de Stroom niet opnieuw opent).
    static func grens(mark: Date?, now: Date = .now) -> Grens {
        let dag = now.addingTimeInterval(-Self.dag)
        if let mark, mark > dag { return Grens(at: mark, eerder: true) }
        return Grens(at: dag, eerder: false)
    }

    // Waar de lijst ophoudt: het eerste bericht dat niet nieuwer is dan de grens.
    static func index(_ items: [Item], at: Date) -> Int {
        items.firstIndex { ($0.date ?? .distantPast) <= at } ?? items.count
    }

    // Wat er van de lijst staat: tot de grens, plus wat je met "Ouder nieuws tonen" opende.
    static func cap(count: Int, grensIndex: Int, older: Int) -> Int { min(count, grensIndex + older) }
}
