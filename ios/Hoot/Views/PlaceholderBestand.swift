import Foundation
import ImageIO
import CoreGraphics

// De bitmaps van de placeholderbeelden (knipsel, sinds 15 november): WebP's in de app-bundel
// (ios/Hoot/Resources/Placeholder/, gemaakt door scripts/placeholders.mjs, dezelfde bestanden als de 2x-maat op het
// web). Los van Beeldloos.swift, zodat ook de widgetextensie ze kan laden (WidgetBeeldloos): de widget heeft ze niet
// zelf, maar leest ze uit de bundel van de app waar hij in zit (Hoot.app/PlugIns/HootWidgetExtension.appex).
// Gedecodeerd met ImageIO, op hooguit `maxPixel` (de widget rekent klein), en bewaard in een cache.
enum PlaceholderBestand {
    nonisolated(unsafe) private static let cache: NSCache<NSString, CGImage> = {
        let c = NSCache<NSString, CGImage>()
        c.totalCostLimit = 48 * 1024 * 1024 // genoeg voor alle dertien groot in één weergave, plus de kleine
        return c
    }()

    // De map met de bestanden: de app zelf, of vanuit de widget de app eromheen.
    static func url(_ naam: String) -> URL? {
        if let u = Bundle.main.url(forResource: naam, withExtension: "webp") { return u }
        if let u = Bundle.main.url(forResource: naam, withExtension: "webp", subdirectory: "Placeholder") { return u }
        let app = Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent()
        guard app.pathExtension == "app", let bundel = Bundle(url: app) else { return nil }
        return bundel.url(forResource: naam, withExtension: "webp") ?? bundel.url(forResource: naam, withExtension: "webp", subdirectory: "Placeholder")
    }

    // Beeld `index` (0 tot 17) in een weergave (licht, donker, nacht), groot (2:1) of klein (3:2).
    static func beeld(_ index: Int, thema: String, klein: Bool, maxPixel: Int? = nil) -> CGImage? {
        let naam = PlaceholderBeelden.bestand(index, thema: thema, klein: klein)
        let sleutel = "\(naam)@\(maxPixel ?? 0)" as NSString
        if let c = cache.object(forKey: sleutel) { return c }
        guard let url = url(naam), let bron = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        var opties: [CFString: Any] = [kCGImageSourceShouldCacheImmediately: true, kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true]
        opties[kCGImageSourceThumbnailMaxPixelSize] = maxPixel ?? (klein ? PlaceholderBeelden.klein.w : PlaceholderBeelden.groot.w)
        guard let image = CGImageSourceCreateThumbnailAtIndex(bron, 0, opties as CFDictionary) else { return nil }
        cache.setObject(image, forKey: sleutel, cost: image.bytesPerRow * image.height)
        return image
    }
}
