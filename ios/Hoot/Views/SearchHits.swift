import Foundation

// Breed zoeken, zoals het web (src/views/Search.jsx): elk woord (langer dan 1 teken) moet voorkomen in
// kop, intro, bronnaam of auteur; in de Stroom én in wat je hebt bewaard. Zonder hoofdletters en
// accenten ("Oekraine" vindt ook "Oekraïne"). Bronnen die je hebt uitgezet tellen niet mee.
// Nieuwste eerst. Dubbelen (hetzelfde stuk met een aangepaste kop) haalt de aanroeper weg.
enum SearchHits {
    static let limit = 60

    static func fold(_ s: String) -> String { s.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil) }

    static func words(_ query: String) -> [String] {
        fold(query).split(whereSeparator: { $0.isWhitespace }).map(String.init).filter { $0.count > 1 }
    }

    static func hits(query: String, stream: [Item], saved: [Item], muted: Set<String>) -> [Item] {
        let words = words(query)
        guard !words.isEmpty else { return [] }
        var seen = Set<String>()
        let pool = (stream + saved).filter { seen.insert($0.id).inserted }
        return pool
            .filter { !muted.contains($0.source) }
            .filter { item in
                let hay = fold([item.title, item.summary ?? "", item.sourceName ?? "", item.author ?? ""].joined(separator: " "))
                return words.allSatisfy { hay.contains($0) }
            }
            .sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
    }
}
