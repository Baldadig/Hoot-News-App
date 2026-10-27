import CryptoKit
import Foundation

// De Hoot-server: dezelfde antwoorden als de web-app. De delen per bron en de verhalenbundels
// hebben een versie in het adres en mogen een jaar bewaard blijven; de URL-cache van het
// systeem regelt dat (met ETag). Lukt het netwerk niet, dan de laatst bewaarde versie: elk
// geslaagd antwoord staat ook als bestand op de iPhone, want de URL-cache geeft antwoorden
// met `must-revalidate` (zoals de editie) zonder netwerk niet terug.
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
        let request = URLRequest(url: comps.url!)
        do {
            if DebugLaunch.offline { throw URLError(.notConnectedToInternet) }
            let (data, response) = try await session.data(for: request)
            if let http = response as? HTTPURLResponse, !(200 ..< 300).contains(http.statusCode) { throw APIError.status(http.statusCode) }
            let value = try JSONDecoder().decode(T.self, from: data)
            try? data.write(to: Offline.file(for: request.url!), options: .atomic)
            return (value, false)
        } catch {
            // Offline of een fout: de laatst bewaarde versie, als die er is.
            let cancelled = error is CancellationError || (error as? URLError)?.code == .cancelled
            if !cancelled, let data = try? Data(contentsOf: Offline.file(for: request.url!)), let value = try? JSONDecoder().decode(T.self, from: data) {
                return (value, true)
            }
            throw error
        }
    }

    // De laatste antwoorden op de iPhone (Caches: het systeem mag ze opruimen als het krap wordt).
    enum Offline {
        static let dir: URL = {
            let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appending(path: "api", directoryHint: .isDirectory)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            return dir
        }()
        static func file(for url: URL) -> URL {
            dir.appending(path: SHA256.hash(data: Data(url.absoluteString.utf8)).map { String(format: "%02x", $0) }.joined() + ".json")
        }
        // Delen per bron hebben een versie in het adres; oude versies na een week weg.
        static func prune(olderThan days: Double = 7) {
            let fm = FileManager.default
            let limit = Date.now.addingTimeInterval(-days * 86400)
            for url in (try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey])) ?? [] {
                if let d = try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate, d < limit { try? fm.removeItem(at: url) }
            }
        }
    }

    // Een vraag met een antwoord dat niet bewaard hoeft te worden (jouw editie).
    static func post<T: Decodable, B: Encodable>(_ path: String, _ body: B) async throws -> T {
        var request = URLRequest(url: base.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        request.timeoutInterval = 25
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, !(200 ..< 300).contains(http.statusCode) { throw APIError.status(http.statusCode) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func personal(_ body: PersonalRequest) async throws -> Edition { (try await post("api/edition", body) as PersonalResponse).edition }

    static func start() async throws -> (value: FeedStart, fromCache: Bool) { try await fetch("api/feed", ["deel": "start"]) }
    static func part(_ id: String, version: String) async throws -> FeedPart { try await get("api/feed", ["bron": id, "v": version]) }
    static func related(version: String) async throws -> FeedRelated { try await get("api/feed", ["deel": "verhalen", "v": version]) }
    static func digest() async throws -> Digest { try await get("api/vak") }
}
