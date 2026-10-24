import Foundation

// Beeld op maat — dezelfde regels als de web-app (src/lib/img.js). Waar de uitgever grotere of
// kleinere varianten aanbiedt vragen we die op; andere bekende bronnen gaan via de beeld-CDN van
// Netlify. Een beeld waarvan we weten dat het alleen klein bestaat, tonen we nooit groot.
enum ImageURL {
    static let cdnHosts: Set<String> = ["images.nrc.nl", "i.guim.co.uk", "cdn.theatlantic.com", "images.vpro.nl", "thequietus.com", "lede-admin.stereogum.com", "ichef.bbci.co.uk", "npr.brightspotcdn.com", "images.ft.com", "oor.nl", "oor-prod.slashsmart.com"]

    enum Kind { case thumb, large }

    static func url(_ raw: String?, _ kind: Kind) -> URL? {
        guard let raw, let u = URL(string: raw.replacingOccurrences(of: "http://", with: "https://")), let host = u.host() else { return nil }
        let s = u.absoluteString
        let width = kind == .thumb ? 320 : 1280

        if host == "media.wired.com", s.contains("/master/pass/") {
            return URL(string: s.replacingOccurrences(of: "/master/pass/", with: "/master/w_\(width),c_limit/"))
        }
        if host == "static01.nyt.com", let r = s.range(of: "-mediumSquareAt3X", options: .backwards) {
            return URL(string: s.replacingCharacters(in: r, with: kind == .thumb ? "-square320" : "-threeByTwoMediumAt2X"))
        }
        if host == "platform.theverge.com" {
            return URL(string: "\(u.scheme ?? "https")://\(host)\(u.path())?quality=80&strip=all&w=\(width)")
        }
        if host == "image.volkskrant.nl", let m = s.firstMatch(#"^(.*)/feature-crop/\d+/\d+/(.*)$"#) {
            return URL(string: kind == .thumb ? "\(m[1])/feature-crop/320/320/\(m[2])" : "\(m[1])/feature-crop/1280/853/\(m[2])")
        }
        if host == "images.cdn.nos.nl", let m = s.firstMatch(#"^(.*)-1024x576(\.webp)$"#) {
            return URL(string: kind == .thumb ? "\(m[1])-512x288\(m[2])" : s)
        }
        if host == "images.nu.nl", let m = s.firstMatch(#"^(https://images\.nu\.nl/m/[a-z0-9]+)_sqr256/\d+/\d+/\d+/\d+/(.+)$"#) {
            // Liggend met uitsnede 0/0/0/0: NU.nl snijdt zelf 16:9 bij (de vierkante uitsnede rekt uit).
            return URL(string: kind == .thumb ? s : "\(m[1])_wd1280/0/0/0/0/\(m[2])")
        }
        if cdnHosts.contains(host) {
            var c = URLComponents(url: HootAPI.base.appendingPathComponent(".netlify/images"), resolvingAgainstBaseURL: false)!
            c.queryItems = [URLQueryItem(name: "url", value: s), URLQueryItem(name: "w", value: String(kind == .thumb ? 320 : 1360))]
            return c.url
        }
        return u
    }

    // Hoe breed een beeld hooguit is, als het adres dat verraadt; anders nil.
    static func knownWidth(_ raw: String?) -> Int? {
        guard let raw, let u = URLComponents(string: raw), let host = u.host else { return nil }
        if host == "www.bing.com", u.path == "/th" { return 320 }
        if host == "i.guim.co.uk" { return u.queryItems?.first { $0.name == "width" }?.value.flatMap(Int.init) }
        return nil
    }

    static func fitsLarge(_ raw: String?) -> Bool { raw != nil && (knownWidth(raw) ?? 1000) >= 400 }
    static func fitsHero(_ raw: String?) -> Bool { raw != nil && (knownWidth(raw) ?? 1000) >= 700 }
}

private extension String {
    func firstMatch(_ pattern: String) -> [String]? {
        guard let re = try? NSRegularExpression(pattern: pattern),
              let m = re.firstMatch(in: self, range: NSRange(startIndex..., in: self)) else { return nil }
        return (0 ..< m.numberOfRanges).map { i in
            Range(m.range(at: i), in: self).map { String(self[$0]) } ?? ""
        }
    }
}
