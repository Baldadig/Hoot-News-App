import Foundation

// Beeld op maat — dezelfde regels als de web-app (src/lib/img.js). Waar de uitgever grotere of
// kleinere varianten aanbiedt vragen we die op; andere bekende bronnen gaan via de beeld-CDN van
// Netlify. Een beeld waarvan we weten dat het alleen klein bestaat, tonen we nooit groot.
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
            var c = URLComponents(url: HootAPI.base.appendingPathComponent(".netlify/images"), resolvingAgainstBaseURL: false)!
            c.queryItems = [URLQueryItem(name: "url", value: s), URLQueryItem(name: "w", value: String(kind == .thumb ? 320 : 1360))]
            return c.url
        }
        return u
    }

    // Alleen onze bekende CDN-route mag één keer naar het oorspronkelijke HTTPS-beeld terugvallen.
    static func originalFallback(for sized: URL) -> URL? {
        guard sized.scheme == "https", sized.host() == HootAPI.base.host(), sized.path() == "/.netlify/images",
              let parts = URLComponents(url: sized, resolvingAgainstBaseURL: false),
              let values = parts.queryItems?.filter({ $0.name == "url" }), values.count == 1,
              let raw = values.first?.value, let original = URL(string: raw),
              original.scheme == "https", let host = original.host(), cdnHosts.contains(host),
              original.user == nil, original.password == nil, original != sized else { return nil }
        return original
    }

    // Hoe breed een beeld hooguit is, als het adres dat verraadt; anders nil.
    static func knownWidth(_ raw: String?) -> Int? {
        guard let raw, let u = URLComponents(string: raw), let host = u.host else { return nil }
        // Bing (zoekindex): ongemeten (met c=7) klein; door de server gemeten (build 46) staat de echte
        // breedte van het bronbeeld in w (src/lib/img.js, bingWidth).
        if host == "www.bing.com", u.path == "/th" {
            let q = u.queryItems ?? []
            if q.contains(where: { $0.name == "c" }) { return 320 }
            return q.first { $0.name == "w" }?.value.flatMap(Int.init) ?? 320
        }
        if host == "i.guim.co.uk" { return u.queryItems?.first { $0.name == "width" }?.value.flatMap(Int.init) }
        return nil
    }

    // Hoe breed een groot beeld hooguit te krijgen is zonder op te rekken: de grootste variant van de uitgever
    // of de beeld-CDN (url(_:.large)), anders de gemeten breedte (door de server) of wat het adres verraadt.
    // Tonen we het gemeten origineel (measuredOriginal), dan telt de meting; een gemeten 320 × 320 van de Volkskrant
    // of Het Parool telt dus niet, want dan tonen we de variant van 1280. Nil: onbekend.
    // Gelijk aan sourceWidth in src/lib/img.js.
    static func sourceWidth(_ item: Item) -> Double? {
        let measured = item.imageMeta.flatMap { $0.valid ? $0.w : nil }
        if measuredOriginal(item) { return measured }
        guard let raw = item.image, let u = URL(string: raw), let host = u.host() else { return nil }
        if host == "images.cdn.nos.nl", raw.firstMatch(#"-1024x576\.webp$"#) != nil { return 1024 }
        if let large = variant(raw, .large) {
            // De beeld-CDN van Netlify rekt niet op: dan telt de meting (hooguit de gevraagde 1360).
            if large.host() == HootAPI.base.host(), large.path() == "/.netlify/images", let measured { return min(measured, 1360) }
            return 1024
        }
        return measured ?? knownWidth(raw).map(Double.init)
    }

    // Een andere maat dan het adres uit de feed (van de uitgever of via de beeld-CDN), of nil.
    static func variant(_ raw: String?, _ kind: Kind) -> URL? {
        // Vergeleken met hetzelfde URL(string:) als in url(_:_:): een adres met bijvoorbeeld een spatie wordt daar
        // gecodeerd, en is dan nog steeds hetzelfde beeld.
        guard let raw, let sized = url(raw, kind), sized != URL(string: raw.replacingOccurrences(of: "http://", with: "https://")) else { return nil }
        return sized
    }

    // Tonen we het gemeten origineel uit de feed? Ja als er egale randen zijn gemeten: daar horen de meetgegevens bij.
    // Zonder randen gaat het via de variant op maat, als die er is (de Volkskrant, Het Parool: de feed geeft 320 × 320).
    // Gelijk aan measuredOriginal in src/lib/img.js.
    static func measuredOriginal(_ item: Item, _ kind: Kind = .large) -> Bool {
        guard let m = item.imageMeta, m.valid else { return false }
        let plain = m.crop.l == 0 && m.crop.r == 0 && m.crop.t == 0 && m.crop.b == 0
        return !(plain && variant(item.image, kind) != nil)
    }

    // Scherp genoeg: minstens `sharp` keer zo breed als het vak, op een scherm met hoge pixeldichtheid (hooguit
    // 1,4). 1,4 en niet 1,5: de NOS levert hooguit 1024 breed en dat moet op 720 nog groot mogen (SHARP op het web).
    static let sharp = 1.4
    static func sharpEnough(_ item: Item, box: Double, scale: Double) -> Bool {
        guard let w = sourceWidth(item) else { return true }
        return w >= box * max(1, min(scale, sharp))
    }

    // Het scherm (WidthReader zet het); het grote beeldvak is de kolom, hooguit 720 (--measure op het web).
    nonisolated(unsafe) static var screen: (width: Double, scale: Double) = (390, 3)
    static func largeBox(_ width: Double = screen.width) -> Double { min(720, max(280, width - 32)) }
    static func sharpHere(_ item: Item) -> Bool { sharpEnough(item, box: largeBox(), scale: screen.scale) }

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
