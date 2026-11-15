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
    // Het manifest op de server (landing/placeholders.json) dat precies deze bundel beschrijft: met deze versie hoeft de
    // app niets op te halen (PlaceholderReeks, PlaceholderOphalen).
    static let versie = "2823b6ffb713"
    // Per bestand in de bundel de versie (eerste twaalf tekens van de sha256), zoals ?v= in het manifest: is die gelijk,
    // dan is het gebundelde bestand hetzelfde beeld en hoeft het niet opgehaald.
    static let versies: [String: String] = [
        "ph-1-licht": "f23b661e938f",
        "ph-1-licht-klein": "75b7b5b0c493",
        "ph-1-donker": "19d15b7ab984",
        "ph-1-donker-klein": "85f83beda6a0",
        "ph-1-nacht": "1032c3159ccb",
        "ph-1-nacht-klein": "b73a18e06c5a",
        "ph-2-licht": "7a7dc060a81b",
        "ph-2-licht-klein": "9e2e2e09e58b",
        "ph-2-donker": "2d9ac413f53d",
        "ph-2-donker-klein": "eba6e0fc5899",
        "ph-2-nacht": "20c94750fc63",
        "ph-2-nacht-klein": "525d09ea2c0a",
        "ph-3-licht": "8f0838b87326",
        "ph-3-licht-klein": "6c9c80eab519",
        "ph-3-donker": "42e8c82c31ef",
        "ph-3-donker-klein": "071972e8bdd5",
        "ph-3-nacht": "34d728c04059",
        "ph-3-nacht-klein": "1d4b0d7d401f",
        "ph-4-licht": "036035977f3d",
        "ph-4-licht-klein": "9f5ec9a390c2",
        "ph-4-donker": "501f3b37874c",
        "ph-4-donker-klein": "52a0a210eba9",
        "ph-4-nacht": "d4255646ab96",
        "ph-4-nacht-klein": "055d0a177b12",
        "ph-5-licht": "f9195fac161b",
        "ph-5-licht-klein": "f8e9e4c1c0a0",
        "ph-5-donker": "4c0e21f64c9d",
        "ph-5-donker-klein": "34d404b77ca8",
        "ph-5-nacht": "181025a26fc7",
        "ph-5-nacht-klein": "af153aa2d467",
        "ph-6-licht": "d0c8c4810e3f",
        "ph-6-licht-klein": "b7a5eccc7ac7",
        "ph-6-donker": "762b1f0fda22",
        "ph-6-donker-klein": "5563a4f38ad4",
        "ph-6-nacht": "f851fd3f2de1",
        "ph-6-nacht-klein": "9366fa43d9bf",
        "ph-8-licht": "0314dc59af61",
        "ph-8-licht-klein": "a8abe8adad92",
        "ph-8-donker": "cd41a62c7205",
        "ph-8-donker-klein": "0660a6795c0e",
        "ph-8-nacht": "edbd12d306f3",
        "ph-8-nacht-klein": "3f70d0ebe806",
        "ph-9-licht": "f8db8b10658f",
        "ph-9-licht-klein": "f27fe07fe6fa",
        "ph-9-donker": "d66ab1eef805",
        "ph-9-donker-klein": "f27911537e2d",
        "ph-9-nacht": "bb751fe845f2",
        "ph-9-nacht-klein": "77d1a9f1965e",
        "ph-10-licht": "f3881360e6a5",
        "ph-10-licht-klein": "612bfa187507",
        "ph-10-donker": "bd694d4e3df6",
        "ph-10-donker-klein": "cc44f24605ab",
        "ph-10-nacht": "81b9b9dcc444",
        "ph-10-nacht-klein": "1419ce6d9b66",
        "ph-11-licht": "781c4b83d311",
        "ph-11-licht-klein": "64b3db2a14d1",
        "ph-11-donker": "dc14599678c1",
        "ph-11-donker-klein": "3b1aabe7de5b",
        "ph-11-nacht": "ce631e0653d1",
        "ph-11-nacht-klein": "a3b3084e4f85",
        "ph-12-licht": "6ea5da69d48f",
        "ph-12-licht-klein": "c2976cf0f21f",
        "ph-12-donker": "1a3059d18a9e",
        "ph-12-donker-klein": "4f0b31285aba",
        "ph-12-nacht": "0466346e6be8",
        "ph-12-nacht-klein": "081ea12f9229",
        "ph-13-licht": "5116b4aab744",
        "ph-13-licht-klein": "ef3b749761e2",
        "ph-13-donker": "7d8f870f5a6a",
        "ph-13-donker-klein": "903307eeec4d",
        "ph-13-nacht": "9d7608a17a15",
        "ph-13-nacht-klein": "ab1872253e31",
        "ph-18-licht": "8f32be499f2d",
        "ph-18-licht-klein": "c649154a1d8e",
        "ph-18-donker": "290535fbf2db",
        "ph-18-donker-klein": "3095bcdfe987",
        "ph-18-nacht": "6825121b056f",
        "ph-18-nacht-klein": "c83e2935c872",
    ]
}
