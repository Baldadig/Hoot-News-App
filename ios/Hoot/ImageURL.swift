import Foundation

// Beeld op maat, de rest: een beeld waarvan we weten dat het alleen klein bestaat, tonen we nooit groot.
// De adressen zelf (ImageURL.url) staan in BeeldOpMaat.swift, gedeeld met de widget.
extension ImageURL {
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
