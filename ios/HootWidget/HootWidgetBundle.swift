import AppIntents
import SwiftUI
import WidgetKit

// De widgets van Hoot (ios/HootWidgetShared voor de gegevens en de weergave).
// - Hoot (Klein en Middel): instelbaar met "Toon" (Bladeren, Top 3, Kop 01, Voortgang) en "Met beeld".
//   Bladeren is de standaard voor nieuwe widgets (13 november 2026); bestaande widgets houden hun keuze.
// - Hoot (Groot en vergrendelscherm): zonder instellingen. Groot bladert per drie.
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
    case bladeren, top3, kop01, voortgang

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Toon"
    static let caseDisplayRepresentations: [ToonKeuze: DisplayRepresentation] = [
        .bladeren: "Bladeren",
        .top3: "Top 3",
        .kop01: "Kop 01",
        .voortgang: "Voortgang",
    ]
    var toon: WidgetToon { WidgetToon(rawValue: rawValue) ?? .top3 }
}

struct HootWidgetKeuze: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Hoot"
    static let description = IntentDescription("Je Editie op je beginscherm.")

    @Parameter(title: "Toon", default: .bladeren)
    var toon: ToonKeuze

    @Parameter(title: "Met beeld", default: true)
    var metBeeld: Bool

    init() {}
    init(toon: ToonKeuze = .bladeren, metBeeld: Bool = true) {
        self.toon = toon
        self.metBeeld = metBeeld
    }
}

// Wat in een maat past (WidgetToon.passend, getoetst in WidgetTests).
func toon(_ keuze: ToonKeuze, in family: WidgetFamily) -> WidgetToon {
    WidgetToon.passend(keuze.toon, in: family)
}

// MARK: - Tijdlijn

enum HootTijdlijn {
    // De Editie uit de App Group; bij een nieuw dagdeel eerst zelf proberen de nieuwe te halen (WidgetVernieuwen,
    // gedeeld en getoetst). Gelukt: ook de andere Hoot-widgets (die misschien net de oude kregen) opnieuw laten vragen.
    static func editie(nu: Date) async -> (editie: WidgetEditie?, wacht: Bool) {
        let uit = await WidgetVernieuwen.editie(nu: nu)
        if uit.bewaard { WidgetCenter.shared.reloadAllTimelines() }
        return (uit.editie, uit.wacht)
    }

    static func entries(_ uitkomst: (editie: WidgetEditie?, wacht: Bool), nu: Date, toon: WidgetToon, metBeeld: Bool) -> Timeline<HootWidgetEntry> {
        // De bladerplek van dit toestel bij deze Editie (bij een nieuwe Editie: het begin).
        let blader = uitkomst.editie.map { WidgetBlader.stand(voor: $0.id) }
        let entries = WidgetTijdlijn.momenten(nu: nu).map { HootWidgetEntry(date: $0, editie: uitkomst.editie, toon: toon, metBeeld: metBeeld, blader: blader) }
        return Timeline(entries: entries, policy: .after(WidgetTijdlijn.volgende(nu: nu, wachtOpNieuwe: uitkomst.wacht)))
    }

    static var voorbeeld: WidgetEditie { WidgetBron.laad() ?? WidgetEditie.voorbeeld }
}

struct KeuzeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> HootWidgetEntry {
        HootWidgetEntry(date: .now, editie: HootTijdlijn.voorbeeld)
    }
    func snapshot(for configuration: HootWidgetKeuze, in context: Context) async -> HootWidgetEntry {
        let editie = HootTijdlijn.voorbeeld
        return HootWidgetEntry(date: .now, editie: editie, toon: toon(configuration.toon, in: context.family), metBeeld: configuration.metBeeld,
                               blader: WidgetBlader.stand(voor: editie.id))
    }
    func timeline(for configuration: HootWidgetKeuze, in context: Context) async -> Timeline<HootWidgetEntry> {
        let nu = Date.now
        return HootTijdlijn.entries(await HootTijdlijn.editie(nu: nu), nu: nu, toon: toon(configuration.toon, in: context.family), metBeeld: configuration.metBeeld)
    }
    func recommendations() -> [AppIntentRecommendation<HootWidgetKeuze>] {
        [AppIntentRecommendation(intent: HootWidgetKeuze(toon: .bladeren), description: "Bladeren"),
         AppIntentRecommendation(intent: HootWidgetKeuze(toon: .top3), description: "Top 3"),
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
        .description("Je Editie: bladeren, de top 3, kop 01 of hoe ver je bent.")
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
        .description("Je Editie, per drie verhalen om doorheen te bladeren.")
        .supportedFamilies([.systemLarge, .accessoryRectangular, .accessoryCircular, .accessoryInline])
        .contentMarginsDisabled()
    }
}
