import Foundation

// Bluesky: de accounts die je zelf volgt, rechtstreeks via de publieke API, net als de website
// (shared/bluesky.mjs): eigen posts van de afgelopen 48 uur, geen reposts of antwoorden. De vaste
// accounts van Hoot komen van de server, als delen per bron.
struct BlueskyAccount: Codable, Hashable, Identifiable {
    let handle: String
    var name: String
    var avatar: String?
    var id: String { "bsky:" + handle }
}

enum Bluesky {
    static let api = "https://public.api.bsky.app/xrpc"
    static let brand = "#0085FF"

    enum Failure: LocalizedError {
        case empty, notFound, status(Int)
        var errorDescription: String? {
            switch self {
            case .empty: "Vul een Bluesky-naam of -link in."
            case .notFound: "Dat account bestaat niet op Bluesky."
            case let .status(code): "Bluesky reageert niet goed (\(code)). Probeer het later nog eens."
            }
        }
    }

    // "https://bsky.app/profile/xxx", "@xxx" of "xxx" → handle
    static func handle(from input: String) -> String {
        let s = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if let m = s.firstMatch(of: /bsky\.app\/profile\/([^\/?#]+)/.ignoresCase()) { return String(m.1).removingPercentEncoding?.replacing(/^@/, with: "") ?? String(m.1) }
        return s.replacing(/^@/, with: "").replacing(/\/+$/, with: "")
    }

    static func profile(_ input: String) async throws -> BlueskyAccount {
        let handle = handle(from: input)
        guard !handle.isEmpty else { throw Failure.empty }
        let json = try await get("app.bsky.actor.getProfile", ["actor": handle])
        guard let found = json["handle"] as? String else { throw Failure.notFound }
        let name = (json["displayName"] as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
        return BlueskyAccount(handle: found, name: name.isEmpty ? found : name, avatar: json["avatar"] as? String)
    }

    // Eigen posts van de afgelopen `hours` uur, bladzijde voor bladzijde (100 per keer, hooguit 8).
    static func posts(of account: BlueskyAccount, hours: Double = 48) async throws -> [Item] {
        let since = Date.now.addingTimeInterval(-hours * 3600)
        var own: [[String: Any]] = []
        var cursor: String?
        for page in 0 ..< 8 {
            var query = ["actor": account.handle, "limit": "100", "filter": "posts_no_replies"]
            if let cursor { query["cursor"] = cursor }
            let json: [String: Any]
            do { json = try await get("app.bsky.feed.getAuthorFeed", query) } catch { if page == 0 { throw error } else { break } }
            let feed = json["feed"] as? [[String: Any]] ?? []
            for entry in feed where entry["reason"] == nil {
                if let post = entry["post"] as? [String: Any], (post["author"] as? [String: Any])?["handle"] as? String == account.handle { own.append(post) }
            }
            cursor = json["cursor"] as? String
            let last = (feed.last?["post"] as? [String: Any]).flatMap { ($0["indexedAt"] as? String).flatMap(HootDate.parse) }
            if cursor == nil || last == nil || last! < since { break }
        }
        return own.compactMap { item($0, fallback: account.name) }.filter { ($0.date ?? .now) >= since }
    }

    // Eén post → één bericht, in dezelfde vorm als de server levert.
    static func item(_ post: [String: Any], fallback: String) -> Item? {
        guard let author = post["author"] as? [String: Any], let handle = author["handle"] as? String, let record = post["record"] as? [String: Any] else { return nil }
        let uri = post["uri"] as? String ?? ""
        let text = (record["text"] as? String ?? "").split(whereSeparator: \.isWhitespace).joined(separator: " ")
        var url = "https://bsky.app/profile/\(handle)/post/\(uri.split(separator: "/").last ?? "")"
        var image: String?
        var ratio: Double?
        var linkTitle: String?
        func media(_ e: [String: Any]?) {
            guard let e else { return }
            let type = e["$type"] as? String ?? ""
            if type.contains("embed.video") {
                image = e["thumbnail"] as? String
            } else if type.contains("embed.external"), let x = e["external"] as? [String: Any] {
                image = x["thumb"] as? String ?? image
                if let t = (x["title"] as? String)?.trimmingCharacters(in: .whitespaces), !t.isEmpty { linkTitle = t }
                if let u = x["uri"] as? String, u.hasPrefix("http") { url = u }
            } else if type.contains("embed.images"), let first = (e["images"] as? [[String: Any]])?.first {
                image = first["thumb"] as? String ?? first["fullsize"] as? String
                if let r = first["aspectRatio"] as? [String: Any], let w = r["width"] as? Double, let h = r["height"] as? Double, h > 0 { ratio = w / h } else { ratio = 4 / 3 }
            } else if type.contains("recordWithMedia") {
                media(e["media"] as? [String: Any])
            }
        }
        media(post["embed"] as? [String: Any])
        return Item(id: "bsky|" + uri, source: "bsky:" + handle, kind: "post", sourceName: (author["displayName"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? fallback, avatar: author["avatar"] as? String, brandColor: brand, title: "", summary: text, url: url, image: image, publishedAt: record["createdAt"] as? String ?? post["indexedAt"] as? String, type: "sociaal", handle: "@" + handle, linkTitle: linkTitle, imageRatio: ratio)
    }

    private static func get(_ method: String, _ query: [String: String]) async throws -> [String: Any] {
        var comps = URLComponents(string: "\(api)/\(method)")!
        comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        var request = URLRequest(url: comps.url!)
        request.timeoutInterval = 8
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200 ..< 300).contains(http.statusCode) { throw http.statusCode == 400 ? Failure.notFound : Failure.status(http.statusCode) }
        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }
}
