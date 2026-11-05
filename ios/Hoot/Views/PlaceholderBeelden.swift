// Gegenereerd door scripts/placeholders.mjs uit shared/placeholder.mjs. Niet met de hand aanpassen.
// De tekening van de zes placeholderbeelden; BeeldloosView (Beeldloos.swift) tekent ze, zoals de SVG's op het web.
import CoreGraphics

enum PlaceholderBeelden {
    static let palettes: [String: [String: [String: UInt32]]] = [
        "zon": [
            "licht": ["bg": 0xEFE9DD, "sun": 0x9A3324, "line": 0x6B6457, "outline": 0x4B453B],
            "donker": ["bg": 0x1E1B17, "sun": 0xEC7A70, "line": 0x766E61, "outline": 0xA39B8D],
            "nacht": ["bg": 0x12100E, "sun": 0xDF8276, "line": 0x5E574D, "outline": 0x8C826F],
        ],
        "iris": [
            "licht": ["bg": 0xECE5D7, "sun": 0x9A3324, "line": 0xB0A48F, "disc": 0xE0D6C3],
            "donker": ["bg": 0x1E1B17, "sun": 0xEC7A70, "line": 0x4A443A, "disc": 0x2A2620],
            "nacht": ["bg": 0x0E0D0B, "sun": 0xDF8276, "line": 0x2F2B25, "disc": 0x181612],
        ],
    ]
    static let beelden: [PHBeeld] = [
        PHBeeld(familie: "zon",
                groot: PHTekening(w: 358, h: 179, clipY: 111, vormen: [
                    .init(soort: .circle, a: 88, b: 120, c: 28, d: 0, fill: "sun", stroke: nil, sw: 0, clip: true),
                    .init(soort: .rect, a: 24, b: 111, c: 310, d: 1, fill: "line"),
                ]),
                klein: PHTekening(w: 96, h: 64, clipY: 40, vormen: [
                    .init(soort: .circle, a: 24, b: 44, c: 12, d: 0, fill: "sun", stroke: nil, sw: 0, clip: true),
                    .init(soort: .rect, a: 12, b: 40, c: 72, d: 1, fill: "line"),
                ])),
        PHBeeld(familie: "zon",
                groot: PHTekening(w: 358, h: 179, clipY: 111, vormen: [
                    .init(soort: .circle, a: 179, b: 56, c: 16, d: 0, fill: "sun", stroke: nil, sw: 0, clip: true),
                    .init(soort: .rect, a: 24, b: 111, c: 310, d: 1, fill: "line"),
                ]),
                klein: PHTekening(w: 96, h: 64, clipY: 40, vormen: [
                    .init(soort: .circle, a: 48, b: 20, c: 7, d: 0, fill: "sun", stroke: nil, sw: 0, clip: true),
                    .init(soort: .rect, a: 12, b: 40, c: 72, d: 1, fill: "line"),
                ])),
        PHBeeld(familie: "zon",
                groot: PHTekening(w: 358, h: 179, clipY: 111, vormen: [
                    .init(soort: .circle, a: 270, b: 111, c: 27, d: 0, fill: nil, stroke: "outline", sw: 2, clip: true),
                    .init(soort: .rect, a: 24, b: 111, c: 310, d: 1, fill: "line"),
                ]),
                klein: PHTekening(w: 96, h: 64, clipY: 40, vormen: [
                    .init(soort: .circle, a: 72, b: 40, c: 11.5, d: 0, fill: nil, stroke: "outline", sw: 1, clip: true),
                    .init(soort: .rect, a: 12, b: 40, c: 72, d: 1, fill: "line"),
                ])),
        PHBeeld(familie: "iris",
                groot: PHTekening(w: 400, h: 200, clipY: nil, vormen: [
                    .init(soort: .line, a: 115.4, b: 15.4, c: 288.2, d: 188.2, stroke: "line", sw: 1, fixed: true),
                    .init(soort: .circle, a: 165.8, b: 65.8, c: 50.4, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 228.8, b: 128.8, c: 25.2, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 261.2, b: 161.2, c: 12.6, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 279.2, b: 179.2, c: 7, d: 0, fill: "sun", stroke: nil, sw: 0, clip: false),
                ]),
                klein: nil),
        PHBeeld(familie: "iris",
                groot: PHTekening(w: 400, h: 200, clipY: nil, vormen: [
                    .init(soort: .line, a: -25.6, b: -125.6, c: 281.6, d: 181.6, stroke: "line", sw: 1, fixed: true),
                    .init(soort: .circle, a: 64, b: -36, c: 89.6, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 176, b: 76, c: 44.8, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 233.6, b: 133.6, c: 22.4, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 265.6, b: 165.6, c: 9.6, d: 0, fill: "sun", stroke: nil, sw: 0, clip: false),
                ]),
                klein: nil),
        PHBeeld(familie: "iris",
                groot: PHTekening(w: 400, h: 200, clipY: nil, vormen: [
                    .init(soort: .line, a: 686, b: -390, c: 110, d: 186, stroke: "line", sw: 1, fixed: true),
                    .init(soort: .circle, a: 308, b: -12, c: 84, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 200, b: 96, c: 42, d: 0, fill: "disc", stroke: nil, sw: 0, clip: false),
                    .init(soort: .circle, a: 140, b: 156, c: 12, d: 0, fill: "sun", stroke: nil, sw: 0, clip: false),
                ]),
                klein: nil),
    ]
}
