import SwiftUI
import CoreText
import UniformTypeIdentifiers

// Gedeelde maten, kleuren en glyphmaten: shared/deelkaart/. Bundelkopieën worden op pariteit getest.
enum DeelKaartFormat: String, CaseIterable { case link, staand }

struct DeelKaartLayout: Decodable {
    struct Format: Decodable {
        let width, height, margin, ruleTop, logoY, logoWidth, ruleBottom: Double
        let kickerY, kickerSize, titleY, titleSize, minTitleSize, lineHeight: Double
        let hairlineY, sourceY, sourceSize, siteY, siteSize: Double
    }
    // Uitgeverslogo: papieren schijf (`disc`) met het logo in merkrood (`ink`), `pad` lucht rondom.
    struct Mark: Decodable { let size, pad: Double; let disc, ink: String }
    let red, paper, domain: String
    let mark: Mark
    let formats: [String: Format]
}

@MainActor
enum DeelKaartStyle {
    static func resource(_ name: String, _ ext: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "Deelkaart") ?? Bundle.main.url(forResource: name, withExtension: ext)
    }
    static let layout: DeelKaartLayout = {
        guard let url = resource("layout", "json"), let data = try? Data(contentsOf: url), let value = try? JSONDecoder().decode(DeelKaartLayout.self, from: data) else { preconditionFailure("Deelkaartmaten ontbreken in de bundel") }
        return value
    }()
    static let advances: [String: Double] = {
        guard let url = resource("advances", "json"), let data = try? Data(contentsOf: url), let value = try? JSONDecoder().decode([String: Double].self, from: data) else { preconditionFailure("Deelkaart-glyphmaten ontbreken in de bundel") }
        return value
    }()
    static let publisherMarks: [String: String] = {
        guard let url = resource("publisher-marks", "json"), let data = try? Data(contentsOf: url),
              let marks = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }
        return marks
    }()
    static func publisherMark(_ source: String) -> UIImage? {
        guard let value = publisherMarks[source], value.hasPrefix("data:image/png;base64,"),
              let data = Data(base64Encoded: String(value.dropFirst("data:image/png;base64,".count))) else { return nil }
        return UIImage(data: data)
    }
    private static let fonts: Void = {
        for name in ["Newsreader-800"] { // Inter 600 is een letter van de app zelf (Resources/Fonts, UIAppFonts)
            if let url = resource(name, "ttf") { CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil) }
        }
    }()
    static func font(_ size: Double, serif: Bool = false) -> Font {
        _ = fonts
        return .custom(serif ? "Newsreader-ExtraBold" : "Inter-SemiBold", fixedSize: size)
    }
    static func clean(_ text: String) -> String { text.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") }
    static func width(_ text: String, size: Double) -> Double {
        text.unicodeScalars.reduce(0) { $0 + (advances[String($1)] ?? 0.65) } * size
    }
    static func titleLines(_ text: String, format: DeelKaartFormat) -> (lines: [String], size: Double) {
        let f = layout.formats[format.rawValue]!
        let cleaned = clean(text)
        let title = String((cleaned.isEmpty ? "Hoot" : cleaned).unicodeScalars.prefix(500))
        let limit = (f.width - 2 * f.margin) * 0.96
        var size = f.titleSize
        var lines: [String] = []
        while size >= f.minTitleSize {
            lines = []
            var line = ""
            for var word in title.components(separatedBy: " ") {
                if width(word, size: size) > limit {
                    while !word.isEmpty && width(word + "…", size: size) > limit { word = String(word.unicodeScalars.dropLast()) }
                    word += "…"
                }
                let next = line.isEmpty ? word : line + " " + word
                if !line.isEmpty && width(next, size: size) > limit { lines.append(line); line = word }
                else { line = next }
            }
            if !line.isEmpty { lines.append(line) }
            if lines.count <= 4 { break }
            size -= 2
        }
        size = max(size, f.minTitleSize)
        if lines.count > 4 {
            lines = Array(lines.prefix(4))
            var words = lines[3].components(separatedBy: " ")
            while words.count > 1 && width(words.joined(separator: " ") + "…", size: size) > limit { words.removeLast() }
            lines[3] = words.joined(separator: " ") + "…"
        }
        if lines.count > 1 {
            for i in 1 ..< lines.count where !lines[i].contains(" ") {
                var words = lines[i - 1].components(separatedBy: " ")
                let tail = words.removeLast() + " " + lines[i]
                if !words.isEmpty && width(tail, size: size) <= limit {
                    lines[i - 1] = words.joined(separator: " "); lines[i] = tail
                }
            }
        }
        return (lines, size)
    }
}

struct DeelKaart: View {
    let item: Item
    var format: DeelKaartFormat = .link
    private var f: DeelKaartLayout.Format { DeelKaartStyle.layout.formats[format.rawValue]! }
    private func color(_ hex: String) -> Color {
        let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
        return Color(red: Double(value >> 16 & 255) / 255, green: Double(value >> 8 & 255) / 255, blue: Double(value & 255) / 255)
    }
    private var paper: Color { color(DeelKaartStyle.layout.paper) }
    private var m: DeelKaartLayout.Mark { DeelKaartStyle.layout.mark }
    private var inset: Double { (m.size * m.pad).rounded() }

    private func text(_ value: String, y: Double, size: Double, serif: Bool = false, tracking: Double = 0) -> some View {
        Text(value).font(DeelKaartStyle.font(size, serif: serif)).tracking(tracking)
            .lineLimit(1).fixedSize(horizontal: true, vertical: true)
            .frame(width: f.width - 2 * f.margin, alignment: .leading).clipped()
            .offset(x: f.margin, y: y)
    }
    private func rule(_ y: Double) -> some View {
        Rectangle().frame(width: f.width - 2 * f.margin, height: 1).offset(x: f.margin, y: y)
    }
    var body: some View {
        let title = DeelKaartStyle.titleLines(item.shareTitle, format: format)
        ZStack(alignment: .topLeading) {
            color(DeelKaartStyle.layout.red)
            rule(f.ruleTop)
            // Dezelfde vaste paden als het SVG-woordmerk, inclusief de papieren punt.
            ZStack {
                GlyphShape(glyphs: Brand.word).fill(paper)
                Circle().fill(paper)
                    .frame(width: 15.4 * f.logoWidth / 239.45, height: 15.4 * f.logoWidth / 239.45)
                    .position(x: 231.75 * f.logoWidth / 239.45, y: 65.8 * f.logoWidth / 239.45)
            }
            .frame(width: f.logoWidth, height: f.logoWidth * 73.5 / 239.45)
            .offset(x: f.margin, y: f.logoY)
            rule(f.ruleBottom)
            text(String(DeelKaartStyle.clean(item.section ?? "Nieuws").prefix(140)).uppercased(), y: f.kickerY, size: f.kickerSize, tracking: 2)
            ForEach(Array(title.lines.enumerated()), id: \.offset) { index, line in
                text(line, y: f.titleY + Double(index) * title.size * f.lineHeight, size: title.size, serif: true)
            }
            rule(f.hairlineY)
            HStack(spacing: 12) {
                // Een papieren schijf met het logo in merkrood (zoals het web); zonder logo het
                // monogram, een lijncirkel in papier.
                ZStack {
                    if let mark = DeelKaartStyle.publisherMark(item.source) {
                        Circle().fill(color(m.disc))
                        Image(uiImage: mark).resizable().scaledToFit()
                            .frame(width: m.size - 2 * inset, height: m.size - 2 * inset)
                    } else {
                        Circle().strokeBorder(paper, lineWidth: 1)
                        Text(String(DeelKaartStyle.clean(item.sourceName ?? item.source).prefix(1)))
                            .font(DeelKaartStyle.font(16))
                    }
                }.frame(width: m.size, height: m.size)
                Text(String(DeelKaartStyle.clean(item.sourceName ?? item.source).prefix(140)))
                    .font(DeelKaartStyle.font(f.sourceSize)).lineLimit(1)
                    .fixedSize(horizontal: true, vertical: true)
            }
            .frame(width: f.width - 2 * f.margin, height: m.size, alignment: .leading).clipped()
            .offset(x: f.margin, y: f.sourceY - (m.size - f.sourceSize) / 2)
            text(DeelKaartStyle.layout.domain, y: f.siteY, size: f.siteSize)
        }
        .foregroundStyle(paper)
        .frame(width: f.width, height: f.height)
        .environment(\.layoutDirection, .leftToRight)
        .environment(\.dynamicTypeSize, .large)
    }

    @MainActor func png() -> Data? {
        let renderer = ImageRenderer(content: self)
        renderer.scale = 1
        renderer.isOpaque = true
        return renderer.uiImage?.pngData()
    }
}

struct DeelKaartExport: Transferable {
    let item: Item
    var format: DeelKaartFormat = .staand
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .png) { export in
            guard let data = await MainActor.run(body: { DeelKaart(item: export.item, format: export.format).png() }) else { throw URLError(.cannotDecodeContentData) }
            return data
        }
        ProxyRepresentation { export in export.link }
    }

    // Deellink op gethoot.app/deel/ (oude hootnews.nl/deel/-links van builds 38 t/m 45 verwijzen hierheen door),
    // met de uitgeverslink erbij: is het verhaal niet meer bewaard, dan stuurt /deel/ daarheen.
    var link: URL {
        var parts = URLComponents()
        parts.scheme = "https"
        parts.host = "gethoot.app"
        parts.path = "/deel/" + item.id
        // Zelf coderen: URLQueryItem laat & en = in de waarde staan (zoals encodeURIComponent op het web).
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        if let source = item.link, source.scheme == "https" || source.scheme == "http",
           let value = source.absoluteString.addingPercentEncoding(withAllowedCharacters: allowed) {
            parts.percentEncodedQuery = "bron=" + value
        }
        return parts.url ?? item.link ?? URL(string: "https://gethoot.app")!
    }
}
