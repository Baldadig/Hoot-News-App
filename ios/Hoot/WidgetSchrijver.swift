import Foundation
import WidgetKit

// De app schrijft voor de widgets (HootWidget) een klein bestand in de App Group: na elke nieuwe Editie en
// na elk gelezen verhaal. Daarna vraagt hij iOS de widgets te verversen. De widget rekent niets zelf: wat er
// staat, en wat gelezen is, is precies wat de app toont (EditionRowModel, HootStore.isRead).
@MainActor
enum WidgetSchrijver {
    // Wat de widget moet weten om te zien of er iets veranderde: de Editie, de plekken en wat gelezen is.
    static func sleutel(_ store: HootStore) -> String {
        let rows = EditionNumbering.rows(store.editionRows).filter { $0.number != nil }
        let gelezen = rows.filter { store.isRead($0.item) }.map(\.id)
        return [store.shownEdition?.id ?? "", rows.map(\.id).joined(separator: ","), gelezen.joined(separator: ","), vraag(store).rawValue].joined(separator: "|")
    }

    static func vraag(_ store: HootStore) -> WidgetEditie.Vraag {
        vraag(eigen: store.shownEdition?.personal == true, account: store.ownerNow != "anon",
              vraagBewaard: FileManager.default.fileExists(atPath: WidgetBron.vraagBestand.path))
    }
    // Lid alleen met een account (dan is je token nodig). Zonder account: jouw vraag als die er is, en anders
    // de Editie voor iedereen, zodat de widget bij een nieuw dagdeel toch zelf iets nieuws heeft (keuring 2).
    static func vraag(eigen: Bool, account: Bool, vraagBewaard: Bool) -> WidgetEditie.Vraag {
        guard eigen else { return .algemeen }
        if account { return .lid }
        return vraagBewaard ? .eigen : .algemeen
    }
    // Haalt de widget de Editie voor iedereen terwijl jij een eigen Editie hebt, dan moet hij de taalregel kennen:
    // de bronnen die je volgt (alleen op dit toestel, in de App Group).
    static func eigenBronnen(_ store: HootStore, vraag: WidgetEditie.Vraag) -> [String]? {
        vraag == .algemeen && store.shownEdition?.personal == true ? store.followed.map(\.id).sorted() : nil
    }

    // Zonder Editie (nog niet geladen) schrijft hij niets: dan blijft de vorige staan.
    static func schrijf(_ store: HootStore) async {
        #if DEBUG
        if DebugLaunch.screen != nil { return } // opnamen van de app: de widgets van dit toestel niet aanraken
        #endif
        // De app als gastheer van de toetsen schrijft niets voor de widgets: geen beeld ophalen of iOS laten
        // verversen terwijl andere toetsen (WebKit) op tijd moeten antwoorden.
        if WidgetGroep.inToets { return }
        guard let edition = store.shownEdition, let datum = edition.date, let dagdeel = edition.slot else { return }
        let kort = Dictionary(edition.entries.map { ($0.id, $0.kortKop) }, uniquingKeysWith: { a, _ in a })
        let rows = EditionNumbering.rows(store.editionRows).filter { $0.number != nil }
        guard !rows.isEmpty else { return }
        let stenen = rows.map { r in
            WidgetEditie.Bouwsteen(plek: r.id, desk: r.desk, itemId: r.item.id, oudeIds: r.item.formerIds ?? [], kop: r.item.title,
                                   kortKop: kort[r.id] ?? nil, bron: r.item.sourceName ?? store.source(r.item.source)?.name ?? "",
                                   beeldURL: ImageURL.url(r.item.image, .large))
        }
        // Gelezen: de laatst gelezen berichten, plus wat in deze Editie als gelezen telt (ook via een oudere id).
        let hier = rows.filter { store.isRead($0.item) }.map(\.item.id)
        let v = vraag(store)
        var editie = WidgetEditie.bouw(id: edition.id, datum: datum, dagdeel: dagdeel, stenen: stenen,
                                       gelezen: Array(store.readIds.suffix(600)) + hier, vraag: v, eigenBronnen: eigenBronnen(store, vraag: v))
        if let eerste = editie.verhalen.first {
            editie.verhalen[0].beeld = await WidgetBeelden.haal(stenen.first?.beeldURL, itemId: eerste.itemId)
        }
        if WidgetBron.bewaar(editie) { WidgetCenter.shared.reloadAllTimelines() }
    }

    // De vraag van jouw Editie zonder account, voor de widget; nil haalt hem weg (met account).
    nonisolated static func bewaarVraag(_ payload: Data?) {
        if WidgetGroep.inToets { return }
        if let payload {
            try? payload.write(to: WidgetBron.vraagBestand, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        } else {
            try? FileManager.default.removeItem(at: WidgetBron.vraagBestand)
        }
    }
}

// Een tik op een verhaal in de widget (hoot://verhaal/<id>) terwijl dat verhaal nog niet in de getoonde Editie
// staat: de widget had de nieuwe Editie misschien al zelf gehaald, en de app heeft de vorige nog. Wachten op een
// andere Editie, niet op een ander aantal rijen (een nieuwe Editie heeft vrijwel altijd weer tien): de sleutel
// is de id van de Editie plus de ids van de rijen (keuring 2).
enum WidgetVerhaalWacht {
    static func sleutel(editie: String?, rijen: [String]) -> String { ([editie ?? ""] + rijen).joined(separator: "|") }
    @MainActor static func sleutel(_ store: HootStore) -> String {
        sleutel(editie: store.shownEdition?.id ?? store.edition?.id, rijen: store.editionRows.map(\.id))
    }

    // De rij met dit stuk: als hoofdstuk (ook onder een eerdere id), of ergens in de bundel van een verhaal.
    static func rij(_ id: String, in rows: [EditionRowModel]) -> EditionRowModel? {
        rows.first(where: { $0.item.id == id || ($0.item.formerIds ?? []).contains(id) })
            ?? rows.first(where: { $0.story?.itemIds.contains(id) == true })
    }

    enum Stap: Equatable { case open(String), wacht, vervalt }
    // `geladen`: het laden na de tik is klaar. Staat het verhaal dan nog niet in de Editie, dan vervalt de link
    // en blijf je in de Editie (de nieuwe), in plaats van dat de app blijft wachten op een volgende.
    static func stap(_ id: String, rows: [EditionRowModel], geladen: Bool) -> Stap {
        if let r = rij(id, in: rows) { return .open(r.item.id) }
        return geladen ? .vervalt : .wacht
    }
}
