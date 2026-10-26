import Foundation

// De Hoot-server: dezelfde antwoorden als de web-app. De delen per bron en de verhalenbundels
// hebben een versie in het adres en mogen een jaar bewaard blijven; de URL-cache van het
// systeem regelt dat (met ETag). Lukt het netwerk niet, dan de laatst bewaarde versie.
enum HootAPI {
    static let base = URL(string: "https://hootnews.nl")!

    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.urlCache = URLCache(memoryCapacity: 16 << 20, diskCapacity: 200 << 20)
        config.requestCachePolicy = .useProtocolCachePolicy
        config.timeoutIntervalForRequest = 20
        config.httpAdditionalHeaders = ["Accept": "application/json", "User-Agent": "Hoot-iOS/0.1"]
        return URLSession(configuration: config)
    }()

    enum APIError: Error { case status(Int) }

    static func get<T: Decodable>(_ path: String, _ query: [String: String] = [:]) async throws -> T {
        try await fetch(path, query).value
    }

    // Het antwoord, en of het uit de cache kwam omdat het netwerk faalde (dan ziet de lezer
    // een oudere versie, en dat moet zichtbaar zijn).
    static func fetch<T: Decodable>(_ path: String, _ query: [String: String] = [:]) async throws -> (value: T, fromCache: Bool) {
        var comps = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) } }
        var request = URLRequest(url: comps.url!)
        do {
            if DebugLaunch.offline { throw URLError(.notConnectedToInternet) }
            let (data, response) = try await session.data(for: request)
            if let http = response as? HTTPURLResponse, !(200 ..< 300).contains(http.statusCode) { throw APIError.status(http.statusCode) }
            return (try JSONDecoder().decode(T.self, from: data), false)
        } catch {
            // Offline of een fout: de laatst bewaarde versie, als die er is.
            request.cachePolicy = .returnCacheDataDontLoad
            let cancelled = error is CancellationError || (error as? URLError)?.code == .cancelled
            if !cancelled, let cached = session.configuration.urlCache?.cachedResponse(for: request) {
                return (try JSONDecoder().decode(T.self, from: cached.data), true)
            }
            throw error
        }
    }

    static func start() async throws -> (value: FeedStart, fromCache: Bool) { try await fetch("api/feed", ["deel": "start"]) }
    static func part(_ id: String, version: String) async throws -> FeedPart { try await get("api/feed", ["bron": id, "v": version]) }
    static func related(version: String) async throws -> FeedRelated { try await get("api/feed", ["deel": "verhalen", "v": version]) }
    static func digest() async throws -> Digest { try await get("api/vak") }
}
