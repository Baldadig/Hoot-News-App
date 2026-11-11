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
        guard let e = store.shownEdition, e.personal == true else { return .algemeen }
        return store.ownerNow == "anon" && FileManager.default.fileExists(atPath: WidgetBron.vraagBestand.path) ? .eigen : .lid
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
        var editie = WidgetEditie.bouw(id: edition.id, datum: datum, dagdeel: dagdeel, stenen: stenen,
                                       gelezen: Array(store.readIds.suffix(600)) + hier, vraag: vraag(store))
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
