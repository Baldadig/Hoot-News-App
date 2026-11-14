import Foundation

// Het einde van de Stroom (keuze r5-stroom-einde, 5 november; review F7, G6), herzien na de melding van Alex
// van 14 november: "Er moet wel echt een vorm van scrollen en lezen aan vooraf zijn gegaan." Gelijk aan het web
// (src/lib/stroom-einde.js).
//
// De Stroom laadt niet eindeloos door. Hij houdt op na het laatste bericht van de laatste 24 uur (`dag`) dat je
// in deze weergave (rubriek, bronkeuze) nog niet zag: "Hier was je gebleven", "Je bent bij." en een stille knop
// "Ouder nieuws tonen" (per keer `page` berichten). Daaronder ligt wat je al zag en wat ouder is dan een dag.
// Zonder eerder bezoek houdt hij dus op na de laatste 24 uur, zoals afgesproken in r5-stroom-einde. Buiten je bubbel is een korte, eigen lijst: daar
// geen grens.
//
// Gezien is echt gezien: een bericht telt pas als het tijdens zelf scrollen in beeld was en je er voorbij
// scrolde, of als het na zelf scrollen `gezienNa` helemaal in beeld stond. Laden, een rubriek of een bron
// openen markeert niets. Wat je zag bewaart HootStore.streamGezien (tot de 36 uur van de Stroom voorbij zijn).
enum StroomEinde {
    static let venster: TimeInterval = 36 * 60 * 60 // de Stroom: de afgelopen 36 uur
    static let dag: TimeInterval = 24 * 60 * 60 // alleen ongeziene berichten van de laatste dag maken de lijst langer
    static let gezienNa: TimeInterval = 1.5 // zo lang helemaal in beeld (na zelf scrollen) telt als gezien
    static let page = 60

    // Waar de lijst ophoudt, vastgezet als het bericht waar hij na komt. `id == nil`: alles gezien. `eerder`: onder
    // de grens staat iets dat je echt zag. Alleen dan staat er "Hier was je gebleven"; staat daar alleen nieuws
    // ouder dan een dag (een nieuwe lezer, een rubriek die je nooit opende), dan niet. Ligt vast met de grens.
    struct Grens: Equatable {
        let id: String?
        let at: Date?
        var eerder = false
    }

    // Wat je zag, zonder wat ouder is dan de Stroom.
    static func vers(_ gezien: [String: Date], now: Date = .now) -> [String: Date] {
        let grens = now.addingTimeInterval(-venster)
        return gezien.filter { $0.value >= grens }
    }

    // Na het laatste bericht van de laatste 24 uur dat je nog niet zag. Zag je die alle, dan 0: meteen "Je bent
    // bij.". Een ongezien bericht van eergisteren maakt de lijst niet langer: dat ligt onder "Ouder nieuws tonen".
    static func eindIndex(_ items: [Item], gezien: [String: Date], now: Date = .now) -> Int {
        let grens = now.addingTimeInterval(-dag)
        return items.lastIndex { gezien[$0.id] == nil && ($0.date ?? .distantPast) > grens }.map { $0 + 1 } ?? 0
    }

    static func grens(_ items: [Item], gezien: [String: Date], now: Date = .now) -> Grens {
        let i = eindIndex(items, gezien: gezien, now: now)
        let eerder = items[i...].contains { gezien[$0.id] != nil }
        return i > 0 ? Grens(id: items[i - 1].id, at: items[i - 1].date, eerder: eerder) : Grens(id: nil, at: nil, eerder: eerder)
    }

    // De index bij een vastgezette grens; staat dat bericht er niet meer, dan op tijd.
    static func index(_ items: [Item], grens: Grens) -> Int {
        guard let id = grens.id else { return 0 }
        if let i = items.firstIndex(where: { $0.id == id }) { return i + 1 }
        guard let at = grens.at else { return items.count }
        return items.firstIndex { ($0.date ?? .distantPast) < at } ?? items.count
    }

    // Wat er van de lijst staat: tot de grens, plus wat je met "Ouder nieuws tonen" opende.
    static func cap(count: Int, grensIndex: Int, older: Int) -> Int { min(count, grensIndex + older) }
}

// Waar een rij staat ten opzichte van het zichtbare deel van de Stroom (alleen wat telt, zodat SwiftUI pas meldt
// als er iets omslaat, niet bij elke pixel).
struct StroomPlek: Equatable {
    var zichtbaar = false // een stukje in beeld
    var kop = false // de bovenkant in beeld
    var voet = false // de onderkant in beeld
    var boven = false // helemaal boven de rand: voorbij gescrold

    // `rij`: de rij in zijn eigen ruimte (0...hoogte); `beeld`: het zichtbare deel in diezelfde ruimte.
    init(rijHoogte h: CGFloat, beeld: CGRect?) {
        guard let b = beeld, b.height > 0 else { return }
        zichtbaar = h > b.minY && 0 < b.maxY
        kop = 0 >= b.minY - 1 && 0 <= b.maxY
        voet = h >= b.minY && h <= b.maxY + 1
        boven = h <= b.minY
    }
    init() {}
    var helemaal: Bool { kop && voet }
}

// Volgt wat je in de Stroom echt ziet, en zet per weergave de grens vast zodat niets beweegt terwijl je leest.
// Een gewone klasse (geen @Observable): de lijst tekent niet opnieuw bij elke rij die in beeld komt. Gelijk aan
// `beoordeel` in src/lib/stroom-einde.js: niets telt voordat je zelf scrolde; daarna is een bericht gezien als
// het in beeld was en voorbij ging, als je er helemaal doorheen bent (boven- en onderkant in beeld gehad), of
// als het `gezienNa` helemaal in beeld staat.
@MainActor
final class StroomVolger {
    private var grenzen: [String: StroomEinde.Grens] = [:]
    private(set) var gescrold = false // zelf gescrold in deze weergave (niet: een herstelde plek, een nieuwe rubriek)
    private var plekken: [String: StroomPlek] = [:] // de laatste plek van elke rij
    private var zag: Set<String> = [] // in beeld terwijl je scrolde
    private var kop: Set<String> = [] // bovenkant in beeld terwijl je scrolde
    private var voet: Set<String> = [] // onderkant in beeld terwijl je scrolde
    private var sinds: [String: Date] = [:] // helemaal in beeld sinds
    private var gezien: Set<String> = []

    // De grens van een weergave voor dit bezoek: de vastgezette, of nu vastzetten.
    func grens(_ sleutel: String, items: [Item], gezien: [String: Date], now: Date = .now) -> StroomEinde.Grens? {
        if let g = grenzen[sleutel] { return g }
        guard !items.isEmpty else { return nil }
        let g = StroomEinde.grens(items, gezien: gezien, now: now)
        grenzen[sleutel] = g
        return g
    }

    // De vastgezette grens van een weergave, zonder iets vast te zetten: voor het tekenen (StreamView.body).
    func vastgezet(_ sleutel: String) -> StroomEinde.Grens? { grenzen[sleutel] }

    // Een nieuw bezoek (de app kwam terug uit de achtergrond): alle grenzen opnieuw bepalen.
    func vergeet() { grenzen = [:] }

    // Een andere rubriek of bronkeuze: daar heb je nog niet gescrold.
    func nieuweWeergave() {
        gescrold = false
        zag = []; kop = []; voet = []
        plekken = [:]; sinds = [:] // de rijen melden zich opnieuw
    }

    // Een rij is niet meer in de lijst (een luie lijst ruimt hem op, of een andere weergave).
    func weg(_ id: String) {
        plekken[id] = nil
        sinds[id] = nil
    }

    // Zelf scrollen (de scrollfase wordt .interacting): vanaf nu telt waar de rijen staan.
    func scrolt(now: Date = .now) -> [String] {
        if !gescrold {
            gescrold = true
            for (id, p) in plekken { noteer(id, p) }
        }
        return beoordeel(Array(plekken.keys), now: now)
    }

    // Een rij meldt een nieuwe plek. Geeft terug of hij daarmee gezien is.
    func meld(_ id: String, _ p: StroomPlek, now: Date = .now) -> Bool {
        plekken[id] = p
        if p.helemaal { if sinds[id] == nil { sinds[id] = now } } else { sinds[id] = nil }
        if gescrold { noteer(id, p) }
        return !beoordeel([id], now: now).isEmpty
    }

    // Wat al lang genoeg helemaal in beeld staat (alleen na zelf scrollen).
    func tik(now: Date = .now) -> [String] { beoordeel(Array(sinds.keys), now: now) }

    private func noteer(_ id: String, _ p: StroomPlek) {
        if p.zichtbaar { zag.insert(id) }
        if p.kop { kop.insert(id) }
        if p.voet { voet.insert(id) }
    }

    private func beoordeel(_ ids: [String], now: Date) -> [String] {
        guard gescrold else { return [] }
        var nieuw: [String] = []
        for id in ids where !gezien.contains(id) {
            let voorbij = plekken[id]?.boven == true && zag.contains(id)
            let door = kop.contains(id) && voet.contains(id)
            let lang = sinds[id].map { now.timeIntervalSince($0) >= StroomEinde.gezienNa } ?? false
            if voorbij || door || lang {
                gezien.insert(id)
                nieuw.append(id)
            }
        }
        return nieuw
    }
}
