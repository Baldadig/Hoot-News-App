import Foundation

// Het adres van de Hoot-server, voor de app (HootAPI.base) en de widget samen. In een debugbuild kan de app
// een ander adres krijgen (HootAPIBase); de widget leest zijn eigen instellingen en blijft op gethoot.app.
enum HootBasis {
    static let url: URL = {
        #if DEBUG
        if let value = UserDefaults.standard.string(forKey: "HootAPIBase"), let url = URL(string: value), url.scheme == "https" { return url }
        #endif
        // Sinds build 46 draait de app volledig op gethoot.app (zelfde Netlify-site, /api/* zonder
        // redirect). Builds 38 t/m 45 praten nog met hootnews.nl; dat blijft zolang die in omloop zijn.
        return URL(string: "https://gethoot.app")!
    }()
}

// Beeld op maat — dezelfde regels als de web-app (src/lib/img.js). Waar de uitgever grotere of
// kleinere varianten aanbiedt vragen we die op; andere bekende bronnen gaan via de beeld-CDN van
// Netlify. Ook in de widget (HootWidgetExtension), zodat 01 daar hetzelfde beeld krijgt als in de app.
// De rest van ImageURL (meten, scherpte) staat in ImageURL.swift, alleen in de app.
enum ImageURL {
    static let cdnHosts: Set<String> = ["images.nrc.nl", "i.guim.co.uk", "cdn.theatlantic.com", "images.vpro.nl", "thequietus.com", "lede-admin.stereogum.com", "ichef.bbci.co.uk", "npr.brightspotcdn.com", "images.ft.com"]

    // De beeldserver van DPG Media: elke maat van dezelfde uitsnede (feature-crop, of roi met het brandpunt) is op te
    // vragen. Nagelopen met GET op 12 november 2026; AD, de regionale titels en HLN niet (ondertekend, 403).
    // Gelijk aan DPG_HOSTS in src/lib/img.js (tests/img.test.mjs controleert dat).
    static let dpgHosts: Set<String> = ["image.volkskrant.nl", "image.demorgen.be", "image.parool.nl", "image.trouw.nl", "image.humo.be"]

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
        if host == "images.fd.nl", var c = URLComponents(string: s) {
            // Het FD (imgix) zet in de feed een vierkant van 140 px of een beeld van 640 breed; elke breedte is te
            // vragen. De uitsnede van de feed (w, h, fit, crop) gaat eraf, de rest blijft (gelijk aan src/lib/img.js).
            c.queryItems = (c.queryItems ?? []).filter { !["w", "h", "fit", "crop"].contains($0.name) } + [URLQueryItem(name: "w", value: String(width))]
            return c.url
        }
        // DPG (dpgHosts): dezelfde uitsnede op maat.
        if dpgHosts.contains(host), let m = s.firstMatch(#"^(.*)/(feature-crop|roi)/\d+/\d+/(.*)$"#) {
            return URL(string: kind == .thumb ? "\(m[1])/\(m[2])/320/320/\(m[3])" : "\(m[1])/\(m[2])/1280/853/\(m[3])")
        }
        if host == "images.cdn.nos.nl", let m = s.firstMatch(#"^(.*)-1024x576(\.webp)$"#) {
            return URL(string: kind == .thumb ? "\(m[1])-512x288\(m[2])" : s)
        }
        if host == "images.nu.nl", let m = s.firstMatch(#"^(https://images\.nu\.nl/m/[a-z0-9]+)_sqr256/\d+/\d+/\d+/\d+/(.+)$"#) {
            // Liggend met uitsnede 0/0/0/0: NU.nl snijdt zelf 16:9 bij (de vierkante uitsnede rekt uit).
            return URL(string: kind == .thumb ? s : "\(m[1])_wd1280/0/0/0/0/\(m[2])")
        }
        if cdnHosts.contains(host) {
            var c = URLComponents(url: HootBasis.url.appendingPathComponent(".netlify/images"), resolvingAgainstBaseURL: false)!
            c.queryItems = [URLQueryItem(name: "url", value: s), URLQueryItem(name: "w", value: String(kind == .thumb ? 320 : 1360))]
            return c.url
        }
        return u
    }
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
