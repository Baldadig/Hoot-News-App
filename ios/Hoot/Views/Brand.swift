import SwiftUI

// Het merk is een tekening, nooit een getypt woord: "hoot." en het teken "h." uit vaste paden, de
// letters van Newsreader 800. Hetzelfde pad als public/brand/hoot-logo-*.svg, src/components/Brand.jsx
// (WORD) en LaunchWord van het opstartscherm. Het teken is het eerste deel ervan: de h, zoals in
// hoot-mark-*.svg en het app-icoon. De punt is een eigen cirkel: accent op papier, papier op merkrood.
enum Brand {
    // "hoot" zonder punt, viewBox 239,45 × 73,5; de punt op (231,75; 65,8), r 7,7.
    static let word = Glyphs(d: wordPath, size: CGSize(width: 239.45, height: 73.5), dot: CGPoint(x: 231.75, y: 65.8), r: 7.7)
    // "h", viewBox 82,15 × 72; de punt op (74,45; 64,3), r 7,7.
    static let mark = Glyphs(d: String(wordPath[...wordPath.firstIndex(of: "Z")!]), size: CGSize(width: 82.15, height: 72), dot: CGPoint(x: 74.45, y: 64.3), r: 7.7)

    private static let wordPath = "M34.45 72L34.45 69.25L38.25 67.20L38.25 43.45Q38.25 41.50 37.68 40.35Q37.10 39.20 35.83 38.67Q34.55 38.15 32.45 38.15L32.45 38.15Q30.05 38.15 28.00 38.65L28.00 38.65Q27.10 38.85 26.25 39.15L26.25 39.15L26.25 66.80L31.15 69.25L31.15 72L2.35 72L2.35 69.25L7.80 66.70L7.80 15.30Q7 14.30 5.93 13.38Q4.85 12.45 3.40 11.55Q1.95 10.65 0 9.65L0 9.65L0 6.20L24.75 0L27.40 0L26.25 12.65L26.25 33.35Q27.75 31.95 29.05 30.90L29.05 30.90Q31.85 28.55 34.08 27.38Q36.30 26.20 38.30 25.82Q40.30 25.45 42.50 25.45L42.50 25.45Q49.75 25.45 53.25 29.57Q56.75 33.70 56.75 41.95L56.75 41.95L56.75 66.70L62.25 69.25L62.25 72L34.45 72ZM91.80 66.50L91.80 66.50Q93.80 66.50 95.20 65.17Q96.60 63.85 97.35 60.70Q98.10 57.55 98.10 51.90L98.10 51.90Q98.10 45.40 97.38 41.08Q96.65 36.75 95.15 34.60Q93.65 32.45 91.20 32.45L91.20 32.45Q89.25 32.45 87.83 33.77Q86.40 35.10 85.65 38.27Q84.90 41.45 84.90 47.05L84.90 47.05Q84.90 53.55 85.60 57.88Q86.30 62.20 87.83 64.35Q89.35 66.50 91.80 66.50ZM90.90 73.50L90.90 73.50Q83 73.50 77.42 70.60Q71.85 67.70 68.92 62.45Q66 57.20 66 50.15L66 50.15Q66 42.80 69.22 37.25Q72.45 31.70 78.33 28.57Q84.20 25.45 92.10 25.45L92.10 25.45Q100 25.45 105.58 28.35Q111.15 31.25 114.08 36.48Q117 41.70 117 48.80L117 48.80Q117 56.10 113.75 61.70Q110.50 67.30 104.65 70.40Q98.80 73.50 90.90 73.50ZM148.10 66.50L148.10 66.50Q150.10 66.50 151.50 65.17Q152.90 63.85 153.65 60.70Q154.40 57.55 154.40 51.90L154.40 51.90Q154.40 45.40 153.68 41.08Q152.95 36.75 151.45 34.60Q149.95 32.45 147.50 32.45L147.50 32.45Q145.55 32.45 144.13 33.77Q142.70 35.10 141.95 38.27Q141.20 41.45 141.20 47.05L141.20 47.05Q141.20 53.55 141.90 57.88Q142.60 62.20 144.13 64.35Q145.65 66.50 148.10 66.50ZM147.20 73.50L147.20 73.50Q139.30 73.50 133.72 70.60Q128.15 67.70 125.23 62.45Q122.30 57.20 122.30 50.15L122.30 50.15Q122.30 42.80 125.53 37.25Q128.75 31.70 134.63 28.57Q140.50 25.45 148.40 25.45L148.40 25.45Q156.30 25.45 161.88 28.35Q167.45 31.25 170.38 36.48Q173.30 41.70 173.30 48.80L173.30 48.80Q173.30 56.10 170.05 61.70Q166.80 67.30 160.95 70.40Q155.10 73.50 147.20 73.50ZM201.95 35.35L201.95 57Q201.95 59.60 203.93 61.02Q205.90 62.45 209.90 62.45L209.90 62.45Q211.85 62.45 214.28 62.02Q216.70 61.60 219.55 60.70L219.55 60.70L219.55 64.85Q215.25 67.85 211.68 69.78Q208.10 71.70 205.20 72.60Q202.30 73.50 199.90 73.50L199.90 73.50Q195.00 73.50 191.33 71.97Q187.65 70.45 185.60 67.17Q183.55 63.90 183.55 58.75L183.55 58.75L183.55 37.60L175.85 31.40L175.85 28.30Q177.35 27.40 179.40 26.20Q181.45 25 183.83 23.60Q186.20 22.20 188.63 20.77Q191.05 19.35 193.28 18.02Q195.50 16.70 197.25 15.70L197.25 15.70L201.95 15.70L201.95 26.95L217.65 26.95L216.70 35.35L201.95 35.35Z"
}

// Eén tekening: het pad van de letters in zijn eigen viewBox, en waar de punt hoort.
struct Glyphs: Sendable {
    let path: Path
    let size: CGSize
    let dot: CGPoint
    let r: CGFloat

    init(d: String, size: CGSize, dot: CGPoint, r: CGFloat) {
        path = Path(svg: d)
        self.size = size
        self.dot = dot
        self.r = r
    }

    // Passend en in het midden, zoals een SVG (xMidYMid meet): altijd in verhouding.
    func fit(_ rect: CGRect) -> CGAffineTransform {
        let s = min(rect.width / size.width, rect.height / size.height)
        return CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: rect.minX + (rect.width - size.width * s) / 2, ty: rect.minY + (rect.height - size.height * s) / 2)
    }
}

// De letters of de punt van een tekening, passend in het vlak dat ze krijgen.
struct GlyphShape: Shape {
    enum Part { case letters, dot }
    let glyphs: Glyphs
    var part = Part.letters

    func path(in rect: CGRect) -> Path {
        let t = glyphs.fit(rect)
        switch part {
        case .letters:
            return glyphs.path.applying(t)
        case .dot:
            let c = glyphs.dot.applying(t)
            let r = glyphs.r * t.a
            return Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2))
        }
    }
}

// Het teken "h." op een vaste hoogte: het einde van de Editie (44), het icoon in de melding.
struct BrandMark: View {
    let height: CGFloat
    var ink = Theme.ink
    var dot = Theme.accent

    var body: some View {
        ZStack {
            GlyphShape(glyphs: Brand.mark).fill(ink)
            GlyphShape(glyphs: Brand.mark, part: .dot).fill(dot)
        }
        .frame(width: height * Brand.mark.size.width / Brand.mark.size.height, height: height)
        .accessibilityHidden(true)
    }
}

// "hoot." op de maat van het opstartscherm keer `scale`: LaunchMark is 160 × 49 pt (het woordmerk
// passend, met een smalle rand), het kleine woordmerk 0,4 daarvan (64 breed, 20 hoog: de kleinste
// maat). Zo staat het overal op dezelfde manier getekend, en kan het opstartscherm of de iris er
// precies op landen. De punt is een eigen cirkel die kan ademen of wegvallen. Met `handoff` meldt het
// waar het woord (zonder punt, zoals SplashView het meet) en de punt staan.
struct BrandWord: View {
    var scale: CGFloat
    var ink = Theme.ink
    var dot = Theme.accent
    var handoff: BrandHandoff? = nil
    var hideDot = false
    var breathes = false // pas als het opstartscherm weg is: anders verspringt de punt

    var body: some View {
        let r = SplashView.dotSize * scale / 2
        ZStack(alignment: .topLeading) {
            GlyphShape(glyphs: Brand.word).fill(ink)
            Circle()
                .fill(dot)
                .frame(width: r * 2, height: r * 2)
                .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { handoff?.dot = $0 }
                .phaseAnimator(breathes ? [1.0, 1.06, 0.92] : [1.0]) { d, k in d.scaleEffect(k) } animation: { _ in .easeInOut(duration: 2.75) }
                .id(breathes) // begint op ware grootte, precies waar het rood eindigde
                .opacity(hideDot ? 0 : 1)
                .padding(.leading, SplashView.dotCenter.x * scale - r)
                .padding(.top, SplashView.dotCenter.y * scale - r)
        }
        .frame(width: SplashView.size.width * scale, height: SplashView.size.height * scale)
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { handoff?.word = CGRect(origin: $0.origin, size: CGSize(width: SplashView.wordWidth * scale, height: $0.height)) }
    }
}

extension Path {
    // Een SVG-pad met absolute M, L, Q en Z, zoals de paden in public/brand. Getallen mogen tegen
    // elkaar aan staan ("L2.5-4.6").
    init(svg d: String) {
        self.init()
        var command: Character = "M"
        var n: [CGFloat] = []
        for token in d.matches(of: /[MLQZ]|-?[0-9]*\.?[0-9]+/) {
            let s = d[token.range]
            if let c = s.first, c.isLetter {
                command = c
                if c == "Z" { closeSubpath() }
                continue
            }
            n.append(CGFloat(Double(s) ?? 0))
            switch command {
            case "M" where n.count == 2:
                move(to: CGPoint(x: n[0], y: n[1]))
                command = "L" // wat er na een M nog volgt, zijn lijnen
                n = []
            case "L" where n.count == 2:
                addLine(to: CGPoint(x: n[0], y: n[1]))
                n = []
            case "Q" where n.count == 4:
                addQuadCurve(to: CGPoint(x: n[2], y: n[3]), control: CGPoint(x: n[0], y: n[1]))
                n = []
            default:
                break
            }
        }
    }
}
