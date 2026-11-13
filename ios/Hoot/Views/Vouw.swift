import SwiftUI
import UIKit
import Vision

// Het hoofdverhaal (01) helemaal boven de vouw: variant e (Alex, 6 november; Hoot-design/boven-de-vouw/RAPPORT.md
// en vouw-1.1.1/VERSLAG.md). De bronregel van 01 staat boven de tabbalk, daarna begint 02.
//
// Volgorde: eerst geeft het beeld ruimte (van 3:2 tot 2:1), dan de kop (30/36 naar 26/32), pas als laatste de
// intro (een hele zin minder, IntroText). Past het dan nog niet (een heel lange kop), dan loopt het gewoon door.
// Alleen bij tekstgrootte Large of kleiner, op de iPhone mini (812 hoog) en op schermen van Pro-formaat en groter.
// Op de mini strakker: kop 26 al vanaf 4 regels op 30. De intro hooguit 5 regels, net als op de Pro. De SE (667) en grotere
// tekst houden de gewone kaart. Het web doet hetzelfde (src/lib/vouw.js, src/styles/vouw.css).
enum Vouw {
    /// `duo`: de compacte voorpagina (Voorpagina.swift), het buitenscherm van de iPhone Duo (678 hoog, breed).
    enum Profiel: Equatable { case mini, pro, duo }

    static func profiel(vensterHoogte: CGFloat, typeSize: DynamicTypeSize, compacteVoorpagina: Bool = false) -> Profiel? {
        if compacteVoorpagina { return typeSize <= maxTekst(.duo) ? .duo : nil }
        guard typeSize <= .large, vensterHoogte >= 800 else { return nil } // 812 min een halve statusbalk speling; de SE is 667
        return vensterHoogte < 850 ? .mini : .pro
    }

    // Tot welke tekstgrootte 01 boven de vouw past. Dicht op de Duo ook bij XL en XXL: het scherm is breder,
    // en zonder deze regel valt de kop van 01 daar onder het scherm.
    static func maxTekst(_ p: Profiel) -> DynamicTypeSize { p == .duo ? .xxLarge : .large }

    // Hoeveel regels intro hooguit (hele zinnen). Op de Duo dicht drie: daar is het scherm laag.
    static func introRegels(_ p: Profiel) -> Int { p == .duo ? 3 : 5 } // mini gelijk aan de Pro (Alex, 6 november)
    // Vanaf hoeveel regels op 30 de kop meteen 26 wordt (nil: alleen als het anders niet past).
    static func kop26Vanaf(_ p: Profiel) -> Int? { p == .pro ? nil : 4 }

    static let kopGroot: CGFloat = 30
    static let kopKlein: CGFloat = 26
    // Dicht op de Duo nog een stap kleiner (24), vóórdat de intro wegvalt: 01 is daar beeld, kop én intro.
    static func kopKleinst(_ p: Profiel) -> CGFloat? { p == .duo ? 24 : nil }

    // Het beeld tot de rand: tussen 2:1 (minst) en 3:2 (meest) van de schermbreedte. Op de Duo dicht mag het
    // tot 5:2: het scherm is breed en laag, en zo past de intro van 01 er nog bij.
    static func minBeeld(_ p: Profiel?) -> CGFloat { p == .duo ? 2 / 5 : 1 / 2 }
    static func beeld(ruimte: CGFloat, tekst: CGFloat, breedte: CGFloat, profiel: Profiel? = nil) -> CGFloat {
        min(breedte * 2 / 3, max(breedte * minBeeld(profiel), ruimte - tekst))
    }

    // Hoeveel regels de kop op deze maat in deze kolom krijgt (de letter van Kop, met zijn afbreking).
    static func kopRegels(_ title: String, size: CGFloat, width: CGFloat, typeSize: DynamicTypeSize) -> Int {
        guard width > 0 else { return 0 }
        let font = KopZet.font(.title, typeSize: typeSize, size: size)
        let fit = KopZet.fit(title, font: font, width: width)
        let shown = fit.scale < 1 ? (font.withSize(font.pointSize * fit.scale)) : font
        let rect = (fit.text as NSString).boundingRect(with: CGSize(width: width, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: [.font: shown], context: nil)
        return max(1, Int((rect.height / shown.lineHeight).rounded()))
    }
}

// De ruimte van de bovenkant van 01 tot de vouw (de bovenkant van de tabbalk), gezet door de Editie.
struct VouwRuimte: Equatable {
    var profiel: Vouw.Profiel
    var hoogte: CGFloat
}

private struct VouwKey: EnvironmentKey { static let defaultValue: VouwRuimte? = nil }
extension EnvironmentValues {
    var vouw: VouwRuimte? {
        get { self[VouwKey.self] }
        set { self[VouwKey.self] = newValue }
    }
}

// Beeld boven, tekst eronder. De tekst (een ViewThatFits met de varianten) krijgt de ruimte die overblijft als het
// beeld 2:1 is; het beeld neemt daarna wat er nog over is, tot 3:2. `bleed`: het beeld loopt tot de schermrand.
struct VouwStapel: SwiftUI.Layout { // SwiftUI.Layout: Hoot heeft zelf een enum Layout
    let ruimte: CGFloat
    var profiel: Vouw.Profiel? = nil
    var metBeeld = true // beelden uit (Instellingen): geen vak, de tekst krijgt alles
    var bleed: CGFloat = Space.s4

    private func minBeeld(_ w: CGFloat) -> CGFloat { metBeeld ? (w + 2 * bleed) * Vouw.minBeeld(profiel) : 0 }

    private func maten(_ proposal: ProposedViewSize, _ subviews: Subviews) -> (w: CGFloat, beeld: CGFloat, tekst: CGFloat) {
        let w = proposal.width ?? 0
        let tekst = subviews.count > 1 ? subviews[1].sizeThatFits(ProposedViewSize(width: w, height: max(0, ruimte - minBeeld(w)))).height : 0
        return (w, metBeeld ? Vouw.beeld(ruimte: ruimte, tekst: tekst, breedte: w + 2 * bleed, profiel: profiel) : 0, tekst)
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let m = maten(proposal, subviews)
        return CGSize(width: m.w, height: m.beeld + m.tekst)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let m = maten(ProposedViewSize(width: bounds.width, height: proposal.height), subviews)
        subviews.first?.place(at: CGPoint(x: bounds.minX - bleed, y: bounds.minY), proposal: ProposedViewSize(width: bounds.width + 2 * bleed, height: m.beeld))
        if subviews.count > 1 {
            subviews[1].place(at: CGPoint(x: bounds.minX, y: bounds.minY + m.beeld), proposal: ProposedViewSize(width: bounds.width, height: max(0, ruimte - minBeeld(bounds.width))))
        }
    }
}

// Laat een variant alleen meedoen als de kop op 30 minder dan `max` regels heeft (de mini: kop 26 vanaf 4 regels).
// Anders meldt hij zich oneindig hoog, zodat ViewThatFits hem overslaat.
struct KopRegelPoort: SwiftUI.Layout {
    let title: String
    let max: Int?
    let typeSize: DynamicTypeSize

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let size = subviews.first?.sizeThatFits(proposal) ?? .zero
        if let max, let w = proposal.width, w > 0, Vouw.kopRegels(title, size: Vouw.kopGroot, width: w, typeSize: typeSize) >= max {
            return CGSize(width: size.width, height: 100_000)
        }
        return size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        subviews.first?.place(at: bounds.origin, proposal: proposal)
    }
}

// Waar het belangrijke in een beeld zit, als fractie van boven (0 = bovenrand). Gezichten via Vision op het toestel;
// zonder gezicht het bovenste derde. Gaat niet naar buiten: geen dienst, geen netwerk.
enum BeeldFocus {
    static let terugval: CGFloat = 1 / 3
    nonisolated(unsafe) private static let cache = NSCache<NSString, NSNumber>()

    static func bekend(_ key: String) -> CGFloat? { cache.object(forKey: key as NSString).map { CGFloat($0.doubleValue) } }

    static func y(in image: UIImage, key: String) async -> CGFloat {
        if let hit = bekend(key) { return hit }
        guard let cg = image.cgImage else { return terugval }
        let found = await Task.detached(priority: .utility) { gezichten(cg) }.value
        let y = found ?? terugval
        cache.setObject(NSNumber(value: Double(y)), forKey: key as NSString)
        return y
    }

    // Het midden van alle gezichten samen (van de bovenste rand tot de onderste), van boven gemeten.
    nonisolated static func gezichten(_ cg: CGImage) -> CGFloat? {
        let request = VNDetectFaceRectanglesRequest()
        let handler = VNImageRequestHandler(cgImage: cg, options: [:])
        guard (try? handler.perform([request])) != nil, let faces = request.results, !faces.isEmpty else { return nil }
        let top = faces.map { 1 - $0.boundingBox.maxY }.min() ?? 0
        let bottom = faces.map { 1 - $0.boundingBox.minY }.max() ?? 1
        return min(1, max(0, (top + bottom) / 2))
    }

    // Het beeld als cover in `size`, met het focuspunt op dezelfde hoogte als object-position op het web:
    // het punt op `y` van het beeld komt op `y` van het vak. Een meting (egale randen) valt erbuiten.
    static func frame(beeld: CGSize, measure: ImageMeasure?, in size: CGSize, y: CGFloat) -> CGRect {
        let m = measure ?? ImageMeasure(w: beeld.width, h: beeld.height, crop: .init(l: 0, r: 0, t: 0, b: 0), ratio: beeld.width / max(1, beeld.height))
        let cw = m.w - m.crop.l - m.crop.r, ch = m.h - m.crop.t - m.crop.b
        guard cw > 0, ch > 0, size.width > 0, size.height > 0 else { return CGRect(origin: .zero, size: size) }
        let scale = max(size.width / cw, size.height / ch)
        let over = ch * scale - size.height
        // De focus geldt voor het hele beeld; binnen de inhoud (zonder randen) schuift hij mee.
        let fy = min(1, max(0, (y * m.h - m.crop.t) / ch))
        return CGRect(x: (size.width - m.w * scale) / 2 + (m.crop.r - m.crop.l) * scale / 2,
                      y: -m.crop.t * scale - over * fy,
                      width: m.w * scale, height: m.h * scale)
    }
}

// Het beeld van 01 op het focuspunt in een vak dat de ouder bepaalt (VouwStapel).
struct FocusBeeld: View {
    let item: Item
    var onFail: (() -> Void)? = nil
    @State private var loader = RemoteImageLoader()
    @State private var focus: CGFloat?
    private var url: URL? { item.pictureURL(.large) }

    var body: some View {
        Color.clear
            .overlay {
                if let image = loader.image, let focus { // pas tonen als het focuspunt er is: geen sprong
                    GeometryReader { g in
                        let rect = BeeldFocus.frame(beeld: image.size, measure: item.measure, in: g.size, y: focus)
                        Image(uiImage: image).resizable().aspectRatio(contentMode: .fill).frame(width: rect.width, height: rect.height).clipped().offset(x: rect.minX, y: rect.minY) // nooit uitrekken
                    }
                } else if loader.failed {
                    Color.clear
                } else {
                    Rectangle().fill(.quaternary)
                }
            }
            .clipped()
            .accessibilityHidden(true)
            .task(id: url) {
                if let key = url?.absoluteString { focus = BeeldFocus.bekend(key) }
                await loader.load(url)
                if loader.failed { onFail?(); return }
                if let image = loader.image, let key = url?.absoluteString { focus = await BeeldFocus.y(in: image, key: key) }
            }
    }
}
