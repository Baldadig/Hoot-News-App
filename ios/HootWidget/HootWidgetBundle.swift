import AppIntents
import SwiftUI
import WidgetKit

// De widgets van Hoot (ios/HootWidgetShared voor de gegevens en de weergave).
// - Hoot (Klein en Middel): instelbaar met "Toon" (Top 3, Kop 01, Voortgang) en "Met beeld".
// - Hoot (Groot en vergrendelscherm): zonder instellingen.
// Zo blijft de widgetgalerij kort: één Hoot-widget per maat.
@main
struct HootWidgetBundle: WidgetBundle {
    var body: some Widget {
        HootEditieWidget()
        HootOverzichtWidget()
    }
}

// MARK: - Instellen (bij lang drukken)

enum ToonKeuze: String, AppEnum {
    case top3, kop01, voortgang

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Toon"
    static let caseDisplayRepresentations: [ToonKeuze: DisplayRepresentation] = [
        .top3: "Top 3",
        .kop01: "Kop 01",
        .voortgang: "Voortgang",
    ]
    var toon: WidgetToon { WidgetToon(rawValue: rawValue) ?? .top3 }
}

struct HootWidgetKeuze: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Hoot"
    static let description = IntentDescription("Je Editie op je beginscherm.")

    @Parameter(title: "Toon", default: .top3)
    var toon: ToonKeuze

    @Parameter(title: "Met beeld", default: true)
    var metBeeld: Bool

    init() {}
    init(toon: ToonKeuze, metBeeld: Bool = true) {
        self.toon = toon
        self.metBeeld = metBeeld
    }
}

// Wat in een maat past: Top 3 alleen in Middel (in Klein wordt het Voortgang), Voortgang alleen in Klein.
func toon(_ keuze: ToonKeuze, in family: WidgetFamily) -> WidgetToon {
    switch (keuze, family) {
    case (.top3, .systemSmall): .voortgang
    case (.voortgang, .systemMedium): .top3
    default: keuze.toon
    }
}

// MARK: - Tijdlijn

enum HootTijdlijn {
    static let laatstePoging = "widget.laatstePoging"

    // De Editie uit de App Group; bij een nieuw dagdeel eerst zelf proberen de nieuwe te halen. `wacht`: er is
    // een nieuw dagdeel maar (nog) geen nieuwe Editie, dus gauw opnieuw vragen (WidgetTijdlijn.volgende).
    static func editie(nu: Date) async -> (editie: WidgetEditie?, wacht: Bool) {
        let oud = WidgetBron.laad()
        guard WidgetOphalen.moetOphalen(oud, nu: nu), let oud else { return (oud, false) }
        let defaults = UserDefaults(suiteName: WidgetGroep.id)
        guard WidgetTijdlijn.magProberen(laatste: defaults?.object(forKey: laatstePoging) as? Date, nu: nu) else { return (oud, true) }
        defaults?.set(nu, forKey: laatstePoging)
        guard let nieuw = await WidgetOphalen.haal(na: oud, nu: nu) else { return (oud, true) }
        // Gelukt: ook de andere Hoot-widgets (die misschien net de oude kregen) opnieuw laten vragen.
        if WidgetBron.bewaar(nieuw) { WidgetCenter.shared.reloadAllTimelines() }
        return (nieuw, false)
    }

    static func entries(_ uitkomst: (editie: WidgetEditie?, wacht: Bool), nu: Date, toon: WidgetToon, metBeeld: Bool) -> Timeline<HootWidgetEntry> {
        let entries = WidgetTijdlijn.momenten(nu: nu).map { HootWidgetEntry(date: $0, editie: uitkomst.editie, toon: toon, metBeeld: metBeeld) }
        return Timeline(entries: entries, policy: .after(WidgetTijdlijn.volgende(nu: nu, wachtOpNieuwe: uitkomst.wacht)))
    }

    static var voorbeeld: WidgetEditie { WidgetBron.laad() ?? WidgetEditie.voorbeeld }
}

struct KeuzeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> HootWidgetEntry {
        HootWidgetEntry(date: .now, editie: HootTijdlijn.voorbeeld)
    }
    func snapshot(for configuration: HootWidgetKeuze, in context: Context) async -> HootWidgetEntry {
        HootWidgetEntry(date: .now, editie: HootTijdlijn.voorbeeld, toon: toon(configuration.toon, in: context.family), metBeeld: configuration.metBeeld)
    }
    func timeline(for configuration: HootWidgetKeuze, in context: Context) async -> Timeline<HootWidgetEntry> {
        let nu = Date.now
        return HootTijdlijn.entries(await HootTijdlijn.editie(nu: nu), nu: nu, toon: toon(configuration.toon, in: context.family), metBeeld: configuration.metBeeld)
    }
    func recommendations() -> [AppIntentRecommendation<HootWidgetKeuze>] {
        [AppIntentRecommendation(intent: HootWidgetKeuze(toon: .top3), description: "Top 3"),
         AppIntentRecommendation(intent: HootWidgetKeuze(toon: .voortgang), description: "Voortgang"),
         AppIntentRecommendation(intent: HootWidgetKeuze(toon: .kop01), description: "Kop 01")]
    }
}

struct VasteProvider: TimelineProvider {
    func placeholder(in context: Context) -> HootWidgetEntry { HootWidgetEntry(date: .now, editie: HootTijdlijn.voorbeeld) }
    func getSnapshot(in context: Context, completion: @escaping @Sendable (HootWidgetEntry) -> Void) {
        completion(HootWidgetEntry(date: .now, editie: HootTijdlijn.voorbeeld))
    }
    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<HootWidgetEntry>) -> Void) {
        Task {
            let nu = Date.now
            completion(HootTijdlijn.entries(await HootTijdlijn.editie(nu: nu), nu: nu, toon: .top3, metBeeld: true))
        }
    }
}

// MARK: - Widgets

struct HootWidgetView: View {
    let entry: HootWidgetEntry
    @Environment(\.widgetFamily) private var family
    var body: some View {
        GeometryReader { geo in
            HootWidgetInhoud(entry: entry, family: family, maat: geo.size)
        }
        .containerBackground(for: .widget) {
            if family.isAccessory { AccessoryWidgetBackground().opacity(family == .accessoryCircular ? 1 : 0) } else { WidgetKleur.paper }
        }
    }
}

extension WidgetFamily {
    var isAccessory: Bool { [.accessoryCircular, .accessoryRectangular, .accessoryInline].contains(self) }
}

struct HootEditieWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: WidgetGroep.soort, intent: HootWidgetKeuze.self, provider: KeuzeProvider()) { entry in
            HootWidgetView(entry: entry)
        }
        .configurationDisplayName("Hoot")
        .description("Je Editie: de top 3, kop 01 of hoe ver je bent.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled() // de marge zet de widget zelf: minstens 16, nooit minder dan die van iOS
    }
}

struct HootOverzichtWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetGroep.soort + ".overzicht", provider: VasteProvider()) { entry in
            HootWidgetView(entry: entry)
        }
        .configurationDisplayName("Hoot")
        .description("Je Editie, met kop 01 en wat je nog te lezen hebt.")
        .supportedFamilies([.systemLarge, .accessoryRectangular, .accessoryCircular, .accessoryInline])
        .contentMarginsDisabled()
    }
}
