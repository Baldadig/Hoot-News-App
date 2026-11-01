import SwiftUI

// Dezelfde terugval als op web: uitsluitend van onze beeld-CDN naar het originele bronbeeld.
// Geen nieuwe hostproxy of beeldzoeker. Een volgende afbeelding/vertrek maakt oud werk ongeldig.
@MainActor @Observable
final class RemoteImageLoader {
    private(set) var image: UIImage?
    private var generation = 0

    func load(_ url: URL?, transport: URLSession = .shared) async {
        generation += 1
        let round = generation
        image = nil
        guard let url else { return }
        let candidates = [url] + (ImageURL.originalFallback(for: url).map { [$0] } ?? [])
        for candidate in candidates {
            guard !Task.isCancelled, round == generation else { return }
            do {
                let (data, response) = try await transport.data(from: candidate)
                guard !Task.isCancelled, round == generation else { return }
                guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                      let decoded = UIImage(data: data) else { continue }
                image = decoded
                return
            } catch {
                guard !Task.isCancelled, round == generation else { return }
            }
        }
    }
}
