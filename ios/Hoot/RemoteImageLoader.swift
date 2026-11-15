import SwiftUI

// Dezelfde terugval als op web: van onze beeld-CDN naar het originele bronbeeld, en van een ontbrekende variant
// van de uitgever (NYT) naar het beeld uit de feed.
// Geen nieuwe hostproxy of beeldzoeker. Een volgende afbeelding/vertrek maakt oud werk ongeldig.
@MainActor @Observable
final class RemoteImageLoader {
    private(set) var image: UIImage?
    // Geen adres, of geen van de kandidaten laadt: dan geen grijs vlak maar de beeldloze vorm (Beeldloos.swift).
    private(set) var failed = false
    private var generation = 0

    func load(_ url: URL?, transport: URLSession = .shared) async {
        generation += 1
        let round = generation
        image = nil
        failed = false
        guard let url else { failed = true; return }
        // Eerst het adres op maat; dan het origineel achter de beeld-CDN, of het origineel uit de feed als de variant
        // van de uitgever niet bestaat (NYT, ImageURL.publisherFallback). Dat origineel moet groot genoeg zijn voor
        // een grote plek (minBreed, in echte pixels), anders liever de beeldloze vorm dan een zacht beeld.
        var candidates: [(url: URL, minBreed: Double)] = [(url, 0)]
        if let original = ImageURL.originalFallback(for: url) { candidates.append((original, 0)) }
        if let original = ImageURL.publisherFallback(for: url) { candidates.append(original) }
        for (candidate, minBreed) in candidates {
            guard !Task.isCancelled, round == generation else { return }
            do {
                let (data, response) = try await transport.data(from: candidate)
                guard !Task.isCancelled, round == generation else { return }
                guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                      let decoded = UIImage(data: data),
                      decoded.size.width * decoded.scale >= minBreed else { continue }
                image = decoded
                return
            } catch {
                guard !Task.isCancelled, round == generation else { return }
            }
        }
        guard !Task.isCancelled, round == generation else { return }
        failed = true
    }
}
