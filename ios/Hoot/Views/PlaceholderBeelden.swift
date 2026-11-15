// Gegenereerd door scripts/placeholders.mjs uit shared/placeholder.mjs. Niet met de hand aanpassen.
// De placeholderbeelden (knipsel): welke er zijn, hun set en hun bestand (ios/Hoot/Resources/Placeholder/).
// PlaceholderBeeld (Beeldloos.swift) en WidgetBeeldloos tonen ze, zoals de WebP's op het web.
enum PlaceholderBeelden {
    // Plekken in de hash (beeld 1 tot 18); nil: uit het product.
    static let familie: [String?] = [
        "zon", // 1 Zonnestand
        "zon", // 2 Zonnestand
        "zon", // 3 Zonnestand
        "iris", // 4 Iris
        "iris", // 5 Iris
        "iris", // 6 Iris
        nil, // 7 (weg)
        "raster", // 8 Puntraster
        "raster", // 9 Haarlijnraster
        "stapel", // 10 De stapel
        "kop", // 11 De kop
        "vouw", // 12 Vouw
        "baan", // 13 Baan
        nil, // 14 (weg)
        nil, // 15 (weg)
        nil, // 16 (weg)
        nil, // 17 (weg)
        "koepels", // 18 Koepels
    ]
    static let count = familie.count
    // Uit het product (index): geen stuk krijgt ze (shared/placeholder.mjs, PLACEHOLDER_UIT).
    static let uit: Set<Int> = [6, 13, 14, 15, 16]
    // De beelden die wel gekozen worden, op volgorde.
    static let keuze: [Int] = familie.indices.filter { !uit.contains($0) }
    // Het beeld bij een hash: hash mod 18, en valt dat op een lege plek, dan (hash / 18) mod 13 uit de rest.
    static func index(hash h: UInt32) -> Int {
        let k = Int(h % UInt32(count))
        return uit.contains(k) ? keuze[Int((h / UInt32(count)) % UInt32(keuze.count))] : k
    }
    // Bestandsnaam (zonder .webp) van beeld index in een weergave (licht, donker, nacht), groot (2:1) of klein (3:2).
    static func bestand(_ index: Int, thema: String, klein: Bool) -> String { "ph-\(index + 1)-\(thema)\(klein ? "-klein" : "")" }
    // Maat van de bestanden in pixels.
    static let groot = (w: 1600, h: 800)
    static let klein = (w: 360, h: 240)
}
