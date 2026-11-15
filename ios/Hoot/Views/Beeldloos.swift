import SwiftUI

// Beeldloos (build 46): een bericht zonder beeld krijgt een Hoot-placeholderbeeld dat het beeldvak precies
// vult. Eén plek, voor de app; het web spiegelt hem in Beeldloos (src/components/Beeld.jsx). Hij staat waar
// anders het beeld zou staan: het stuk heeft geen beeld, het beeld is te klein voor die plek, of het laadt
// niet. Nooit een grijs vlak. Een beeld van een ander verhaal nooit; wel (besluit Alex, 7 november) dat van een
// andere bron over hetzelfde feit, dat de server al als `image` meegeeft (borrowImagesFromStories). Pas daarna dit.
// Dertien knipsel-beelden (sinds 15 november): Zonnestand en Iris elk drie, Raster twee, en De stapel, De kop,
// Vouw, Baan en Koepels elk een eigen set (shared/placeholder.mjs, de bitmaps in Resources/Placeholder): welk, volgt
// uit de id van het artikel, en twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld en nooit
// dezelfde set (Placeholder.plan, via de omgeving). Het is decoratie: verborgen voor VoiceOver.
struct BeeldloosView: View {
    enum Kind { case lead, tijdlijn, krant }
    @Environment(HootStore.self) private var store
    @Environment(\.placeholderPlan) private var plan
    let item: Item
    let kind: Kind
    var height: CGFloat? = nil // hoofdverhaal op iPad liggend: zo hoog als de zijkolom
    var width: CGFloat = Layout.thumb // miniatuur: de breedte van het beeld dat er anders stond
    var ratio: CGFloat = 2 // breedte : hoogte van het grote vak (kaart A+: het hoofdverhaal is 3:2)
    var flat = false // tot de rand: geen hoek

    private var index: Int { plan[item.id] ?? Placeholder.base(item.id) }

    var body: some View {
        if store.showsImage(lead: kind == .lead) {
            switch kind {
            case .krant:
                PlaceholderBeeld(index: index, klein: true)
                    .frame(width: width, height: width * 2 / 3)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                    .accessibilityHidden(true)
            case .lead, .tijdlijn:
                // Hetzelfde vak als het beeld: 2:1 over de volle breedte (FramedImage), of een vaste hoogte.
                Group {
                    if let height {
                        Color.clear.frame(maxWidth: .infinity).frame(height: height)
                    } else {
                        Color.clear.aspectRatio(ratio, contentMode: .fit).frame(maxWidth: .infinity)
                    }
                }
                .overlay { PlaceholderBeeld(index: index, klein: false) }
                .clipShape(RoundedRectangle(cornerRadius: flat ? 0 : Radius.md, style: .continuous))
                .accessibilityHidden(true)
            }
        }
    }
}

// Beeld 1 tot 18 (index 0 tot 17; dertien bestaan): de knipsel-collage als bitmap (PlaceholderBestand). Het vult
// het vak als een foto (cover): de kortste kant past, de rest valt weg, gecentreerd. Zoals de WebP's met
// background-size: cover op het web. Het vak heeft zijn eigen maat, dus er verspringt niets; tot het beeld er is
// (of als het ontbreekt) staat er het papier van de weergave.
struct PlaceholderBeeld: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.nachtActief) private var nacht
    let index: Int
    var klein = false

    private var theme: String { scheme == .dark ? (nacht ? "nacht" : "donker") : "licht" }

    var body: some View {
        Rectangle()
            .fill(Theme.paper)
            .overlay {
                if let image = PlaceholderBestand.beeld(index, thema: theme, klein: klein) {
                    Image(decorative: image, scale: 1)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFill()
                }
            }
            .clipped()
            .accessibilityHidden(true)
    }
}

// De keuze, gelijk aan shared/placeholder.mjs (tests/fixtures/placeholder.json draait op beide).
enum Placeholder {
    static let count = PlaceholderBeelden.count // 18 plekken in de hash, vijf leeg (weg uit het product)
    // Doorschuiven: drie verder; komt dat op een lege plek of in dezelfde set, dan nog eens drie. Sets: zon 0–2 ·
    // iris 3–5 · raster 7–8 · stapel 9 · De kop, Vouw, Baan en Koepels (10, 11, 12, 17) elk een eigen set.
    static let shift = 3
    // De set van beeld k (nil: weg uit het product).
    static func set(_ k: Int) -> String? { PlaceholderBeelden.familie[k] }
    // FNV-1a (32 bit) over de UTF-8-bytes van de id.
    static func fnv1a(_ s: String) -> UInt32 {
        var h: UInt32 = 0x811c9dc5
        for b in s.utf8 { h ^= UInt32(b); h = h &* 0x01000193 }
        return h
    }
    // Het beeld op zich: hash mod 18, maar nooit een beeld dat weg is (7 Horizonlijnen, 14 Eclips, 15 Walsen,
    // 16 Zetsel en 17 De rij): dan kiest (hash / 18) mod 13 een van de dertien. Elk stuk met een van de dertien
    // houdt zijn beeld.
    static func base(_ id: String) -> Int { PlaceholderBeelden.index(hash: fnv1a(id)) }
    // Een lijst van boven naar onder: zit het beeld in dezelfde set als dat van de beeldloze rij erboven,
    // dan schuift het drie door, naar een andere set. Een rij met beeld breekt de reeks.
    static func plan(ids rows: [(id: String, bare: Bool)]) -> [String: Int] {
        var out: [String: Int] = [:]
        var prev: Int?
        for r in rows {
            guard r.bare else { prev = nil; continue }
            var k = base(r.id)
            if let prev, set(k) == set(prev) {
                // Doorschuiven; komt dat op een lege plek (De kop → Eclips, Vouw → Walsen, Iris → Horizonlijnen), dan nog eens drie.
                repeat { k = (k + shift) % count } while PlaceholderBeelden.uit.contains(k) || set(k) == set(prev)
            }
            out[r.id] = k
            prev = k
        }
        return out
    }
    // Toont deze rij op deze plek het placeholderbeeld? Dezelfde regels als ItemRow en LeadCard.
    static func isBare(_ item: Item, _ kind: BeeldloosView.Kind) -> Bool {
        if item.isPost { return false }
        switch kind {
        case .lead: return !ImageURL.fitsHero(item.image) || !ImageURL.sharpHere(item)
        // Een te klein beeld staat sinds 1.1.1 klein rechts (ItemRow.klein): alleen zonder beeld de placeholder.
        case .tijdlijn: return item.image == nil && item.videoPoster == nil
        case .krant: return item.image == nil && item.videoPoster == nil
        }
    }
    // `failed`: stukken waarvan het beeld pas bij het laden mislukte (MisluktBeeld); die tonen ook het
    // placeholderbeeld, dus ook voor hen geldt de buurregel.
    static func plan(_ rows: [(Item, BeeldloosView.Kind)], failed: Set<String> = []) -> [String: Int] {
        plan(ids: rows.map { (id: $0.0.id, bare: isBare($0.0, $0.1) || (!$0.0.isPost && failed.contains($0.0.id))) })
    }
}

// Beelden die pas bij het laden mislukten (een 404, een cookiemuur): ItemRow en LeadCard melden ze hier,
// en de lijst (Editie, Stroom) rekent het placeholderplan dan opnieuw uit, zodat twee beeldloze buren
// nooit hetzelfde beeld krijgen. Zoals failed in PlaceholderList op het web.
@MainActor @Observable
final class MisluktBeeld {
    static let shared = MisluktBeeld()
    private(set) var ids: Set<String> = []
    func add(_ id: String) { if !ids.contains(id) { ids.insert(id) } }
}

private struct PlaceholderPlanKey: EnvironmentKey { static let defaultValue: [String: Int] = [:] }
extension EnvironmentValues {
    var placeholderPlan: [String: Int] {
        get { self[PlaceholderPlanKey.self] }
        set { self[PlaceholderPlanKey.self] = newValue }
    }
}

private extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}
