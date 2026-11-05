import SwiftUI

// De bladen één tik onder het hoofdblad van Instellingen D (SettingsView). Labels letterlijk uit
// D-richtlijnen.html; uitleg alleen als voetregel, en alleen waar het moet.

// De kaart van Instellingen D: welk blad welke rijen heeft. Het hoofdblad en de bladen hieronder
// gebruiken dezelfde labels; HootTests/InstellingenDTests controleert dat elke rij uit de inventaris
// van build 47 (INVENTARIS.md) hier een plek heeft, op het hoofdblad of één tik dieper.
enum SettingsMap {
    struct Page {
        let id: String
        let title: String
        let rows: [String]
    }
    static let main = Page(id: "", title: "Instellingen", rows: [
        "Account", "Interesses", "Bronnen", "Editie", "Stroom", "Selectie",
        "Weergave", "Als het donker is", "Tekstgrootte", "Beeld en intro", "Artikelen",
        "Op dit toestel", "Over Hoot",
    ])
    static let pages: [Page] = [
        Page(id: "account", title: "Account", rows: ["Synchroniseren", "Nu synchroniseren", "Uitloggen", "Account verwijderen", "Inloggen met Apple", "Inloggen met Google"]),
        Page(id: "editie", title: "Editie", rows: ["Buiten je bubbel", "Seintje bij een nieuwe Editie", "Ochtendeditie", "Middageditie", "Avondeditie", "Seintjes staan uit", "Gekozen", "Vaak gelezen", "Vergeet dit", "Minder", "Ongedaan maken", "Nog niets geleerd"]),
        Page(id: "stroom", title: "Stroom", rows: ["Lees de Stroom als", "Bluesky in de Stroom", "Bluesky-accounts"]),
        Page(id: "tekstgrootte", title: "Tekstgrootte", rows: ["Voorbeeld", "Tekstgrootte"]),
        Page(id: "beeld", title: "Beeld en intro", rows: ["Voorbeeld", "Beeld", "Intro"]),
        Page(id: "artikelen", title: "Artikelen", rows: ["Artikelen openen", "Abonnementen"]),
        Page(id: "toestel", title: "Op dit toestel", rows: ["App-icoon", "Alles als ongelezen markeren", "Bewaarde artikelen verwijderen", "Stel Hoot opnieuw in"]),
        Page(id: "over", title: "Over Hoot", rows: ["Hulp en contact", "Privacy", "gethoot.app"]),
    ]
    // Bestaande lijsten achter een rij: inhoud, geen extra laag.
    static let lists = ["interesses", "bronnen", "vakken", "bluesky", "appicoon", "abonnementen"]

    // Startargument -HootScreen instellingen-<blad> (schermafbeeldingen): meteen op dat blad.
    static func debugPath(_ screen: String?) -> [String] {
        guard let screen, screen.hasPrefix("instellingen-") else { return [] }
        let page = String(screen.dropFirst("instellingen-".count))
        switch page {
        case "wissen": return ["toestel"]
        case "geleerd": return ["editie"]
        default: return pages.map(\.id).contains(page) || lists.contains(page) ? [page] : []
        }
    }

    // De waarde naast Editie: welke seintjes je krijgt, zonder kloktijden.
    @MainActor static func seintjesRegel(on: Bool, slots: [String]) -> String {
        guard on else { return "Seintje uit" }
        let names = EditionAlerts.slots.filter { slots.contains($0.id) }.map(\.short)
        if names.isEmpty { return "Seintje uit" }
        if names.count == EditionAlerts.slots.count { return "Elke Editie" }
        let words = names.enumerated().map { $0.offset == 0 ? $0.element : $0.element.lowercased() }
        return words.count == 1 ? words[0] : words.dropLast().joined(separator: ", ") + " en " + words.last!
    }
}

// Editie: wat over je Editie gaat. Buiten je bubbel, de seintjes per dagdeel, en Wat Hoot leerde.
struct EditieSettingsView: View {
    @Environment(HootStore.self) private var store
    @Environment(EditionAlerts.self) private var alerts
    @Environment(\.openURL) private var openURL

    var body: some View {
        @Bindable var store = store
        Form {
            Section {
                Toggle(isOn: $store.bubble) { Text("Buiten je bubbel") }
            }
            .hootRows()
            Section { alertRows } header: { FormHeader("Seintjes") }
                .hootRows()
                .animation(.default, value: store.notify && alerts.allowed)
            LearnedSection()
        }
        .hootForm()
        .navigationTitle("Editie")
        .navigationBarTitleDisplayMode(.inline)
        .task { await alerts.refresh() }
    }

    // Seintje bij een nieuwe Editie. De schakelaar is zelf de uitleg: pas bij aanzetten vraagt iOS om
    // toestemming. Zei je eerder nee, dan wijst een rij de weg naar de Instellingen-app.
    @ViewBuilder private var alertRows: some View {
        let denied = alerts.permission == .denied
        Toggle(isOn: Binding(get: { store.notify && !denied }, set: { on in
            guard on else { store.notify = false; return }
            guard !denied else { return }
            store.notify = true
            guard !alerts.allowed else { return }
            Task { if await !alerts.ask() { withAnimation { store.notify = false } } }
        })) {
            Text("Seintje bij een nieuwe Editie")
        }
        .disabled(denied)
        if store.notify && alerts.allowed {
            ForEach(EditionAlerts.slots) { slot in
                Toggle(isOn: Binding(get: { store.notifySlots.contains(slot.id) }, set: { on in
                    let next = EditionAlerts.slots.map(\.id).filter { $0 == slot.id ? on : store.notifySlots.contains($0) }
                    // De laatste uit: dan het seintje helemaal uit (en de volgende keer weer alle drie).
                    if next.isEmpty {
                        withAnimation { store.notify = false }
                        store.notifySlots = EditionAlerts.slots.map(\.id)
                    } else {
                        store.notifySlots = next
                    }
                })) {
                    // De naam, zonder tijd. Past "Middageditie" niet meer (heel grote tekst), dan gesplitst
                    // op de woordgrens: "Middag" met een rustig "Editie" eronder.
                    ViewThatFits(in: .horizontal) {
                        Text(slot.name).fixedSize()
                        VStack(alignment: .leading, spacing: Space.s0) {
                            Text(slot.short)
                            Text("Editie").font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                        }
                    }
                    .padding(.leading, Space.s4) // hoort bij het seintje erboven
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(slot.name)
                }
            }
        }
        if denied {
            Button {
                if let url = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(url) }
            } label: {
                HStack {
                    SettingsRow("Seintjes staan uit", value: "Zet ze aan in de Instellingen-app")
                    Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3).accessibilityHidden(true)
                }
            }
            .accessibilityHint("Opent de meldingen van Hoot in de Instellingen-app")
        }
    }
}

// Stroom: hoe je de Stroom leest, en Bluesky erin.
struct StroomSettingsView: View {
    @Environment(HootStore.self) private var store

    var body: some View {
        @Bindable var store = store
        Form {
            Section {
                // Een menu, net als de rest: het groeit mee met de tekst (I5).
                Picker("Lees de Stroom als", selection: $store.layout) {
                    Text("Tijdlijn").tag("tijdlijn")
                    Text("Krant").tag("krant")
                }
                .frame(minHeight: Space.tap)
            }
            .hootRows()
            Section {
                Toggle(isOn: $store.bluesky.animation()) { Text("Bluesky in de Stroom") }
                if store.bluesky {
                    NavigationLink(value: "bluesky") {
                        SettingsRow("Bluesky-accounts", value: store.bskyInStream.isEmpty ? nil : "\(store.bskyInStream.count)")
                    }
                }
            } header: {
                FormHeader("Bluesky")
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Stroom")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// Een Stroom-bericht als voorbeeld: bron en tijd, kop, intro (en bij Beeld en intro het beeld). Hij
// gebruikt dezelfde letters als de Stroom, dus hij groeit mee met de Tekstgrootte en met Dynamic Type.
// De intro gaat door IntroText, met dezelfde regels als de kaart in de Stroom: hij stopt na een hele
// zin, nooit met "…" (eindkeuring 48, B4).
struct StroomVoorbeeld: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    var beeld = false
    static let kop = "Zeegras keert terug in de Waddenzee"
    static let intro = "Bij Texel en Ameland zet Rijkswaterstaat dit voorjaar nieuwe velden uit. Zeegras houdt slib vast en geeft jonge vis een plek om te schuilen."

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            if beeld && store.images != "uit" {
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
                    .fill(Theme.ink.opacity(0.08))
                    .aspectRatio(3 / 2, contentMode: .fit)
                    .overlay { Image(systemName: "photo").font(.title2).foregroundStyle(Theme.ink3) }
                    .accessibilityHidden(true)
            }
            Text("NOS · vanochtend").font(.ui(.footnote)).foregroundStyle(Theme.hint)
            Kop(Self.kop, .title3).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            IntroText(text: Self.intro, style: .body, lines: store.preview == 0 ? nil : typeSize > .large ? store.preview * 2 : store.preview + 1, size: 18, line: 28) // zoals ItemRow.kaartText
        }
        .padding(.vertical, Space.s2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Voorbeeld van een Stroom-bericht")
    }
}

// Tekstgrootte: een voorbeeld dat meegroeit, en een schuif met vijf standen. De tweede stand is
// "Zoals je toestel": Dynamic Type blijft de basis, Hoot telt er × 0,9 tot × 1,45 bij op.
struct TekstgrootteView: View {
    @Environment(HootStore.self) private var store

    var body: some View {
        Form {
            Section { StroomVoorbeeld() } header: { FormHeader("Voorbeeld") }
                .hootRows()
            Section { TekstgrootteSchuif() }
                .hootRows()
        }
        .hootForm()
        .navigationTitle("Tekstgrootte")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TekstgrootteSchuif: View {
    @Environment(HootStore.self) private var store

    var body: some View {
        let stand = Binding(get: { Double(store.tekstgrootte) }, set: { store.tekstgrootte = Int($0.rounded()) })
        VStack(alignment: .leading, spacing: Space.s2) {
            SettingsRow("Tekstgrootte", value: TekstSchaal.namen[store.tekstgrootte])
                .accessibilityHidden(true) // de schuif zegt het zelf
            HStack(spacing: Space.s3) {
                // Klein links, groot rechts (HIG, Sliders); vaste maten, zodat de uiteinden niet meegroeien.
                Text("A").font(.ui(size: 13, .semibold)).foregroundStyle(Theme.ink3).accessibilityHidden(true)
                Slider(value: stand, in: 0...Double(TekstSchaal.factoren.count - 1), step: 1)
                    .overlay(alignment: .bottom) { ticks.offset(y: Space.s3) }
                    .accessibilityLabel("Tekstgrootte")
                    .accessibilityValue(TekstSchaal.namen[store.tekstgrootte])
                Text("A").font(.ui(size: 24, .semibold)).foregroundStyle(Theme.ink3).accessibilityHidden(true)
            }
            .padding(.bottom, Space.s3)
        }
        .padding(.vertical, Space.s2)
    }

    // Vijf maatstreepjes onder de baan, één per stand.
    private var ticks: some View {
        HStack {
            ForEach(0..<TekstSchaal.factoren.count, id: \.self) { i in
                if i > 0 { Spacer() }
                Capsule().fill(Theme.ink3.opacity(0.6)).frame(width: 1.5, height: 6)
            }
        }
        .padding(.horizontal, 13) // de duim is ongeveer 26 breed: de streepjes staan onder zijn midden
        .accessibilityHidden(true)
    }
}

// Beeld en intro: het voorbeeld met beeld, en de twee keuzes.
struct BeeldIntroView: View {
    @Environment(HootStore.self) private var store

    var body: some View {
        @Bindable var store = store
        Form {
            Section { StroomVoorbeeld(beeld: true) } header: { FormHeader("Voorbeeld") }
                .hootRows()
            Section {
                Picker("Beeld", selection: $store.images) {
                    Text("Aan").tag("aan")
                    Text("Alleen hoofdverhaal").tag("hoofd")
                    Text("Uit").tag("uit")
                }
                .frame(minHeight: Space.tap)
                Picker("Intro", selection: $store.preview) {
                    Text("1 regel").tag(1)
                    Text("2 regels").tag(2)
                    Text("3 regels").tag(3)
                    Text("Hele intro").tag(0)
                }
                .frame(minHeight: Space.tap)
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Beeld en intro")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// Artikelen: waar een artikel opent, en (in de lezer) je abonnementen.
struct ArtikelenView: View {
    @Environment(HootStore.self) private var store

    var body: some View {
        @Bindable var store = store
        Form {
            Section {
                Picker("Artikelen openen", selection: $store.openWith.animation()) {
                    Text("In de lezer").tag("lezer")
                    Text("In Safari").tag("safari")
                }
                .frame(minHeight: Space.tap)
                if store.openWith == "lezer" {
                    NavigationLink(value: "abonnementen") { SubscriptionsRow(title: "Abonnementen") }
                }
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Artikelen")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// Over Hoot: hulp, privacy en de website, met de versie in de voet.
struct OverHootView: View {
    var body: some View {
        Form {
            Section {
                Link(destination: URL(string: "mailto:info@gethoot.app")!) { OutboundRow(title: "Hulp en contact") }
                Link(destination: URL(string: "https://gethoot.app/privacy")!) { OutboundRow(title: "Privacy") }
                Link(destination: URL(string: "https://gethoot.app")!) { OutboundRow(title: "gethoot.app") }
            } footer: {
                Text("Hoot \(SettingsView.version) · gemaakt door Baldadig").foregroundStyle(Theme.ink3)
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Over Hoot")
        .navigationBarTitleDisplayMode(.inline)
    }
}
