import SwiftUI

// Instellingen D, "volgens de richtlijnen" (Hoot-design/woensdag-2026-11-04/instellingen-concept/D-richtlijnen.html):
// - wat je soms aanpast staat op het hoofdblad, in groepen met een korte kop zoals de Instellingen-app;
// - wat je één keer instelt zit één tik dieper (SettingsPages.swift), en nergens dieper dan dat;
// - Editie, Stroom en Selectie zijn drie gelijke rijen in Jouw Hoot;
// - een schakelaar voor aan en uit, een menu met de waarde voor een keus, een chevron alleen als er
//   een blad achter zit; uitleg alleen als voetregel op een blad dieper;
// - wissen en verwijderen onderaan hun blad, in rood, met een action sheet en Annuleer.
// Het web heeft dezelfde bladen en labels (src/views/Settings.jsx).
struct SettingsView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(EditionAlerts.self) private var alerts
    @State private var path: [String] = SettingsMap.debugPath(DebugLaunch.screen)

    static var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        return "\(v) (\(b))"
    }
    static var shortVersion: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "" }

    var body: some View {
        NavigationStack(path: $path) {
            Form {
                Section { SettingsAccountCard() }.hootRows()

                Section {
                    NavigationLink(value: "interesses") {
                        SettingsRow("Interesses", value: store.interests.isEmpty ? "Alle" : "\(store.interests.count)")
                    }
                    NavigationLink(value: "bronnen") { SettingsRow("Bronnen", value: "\(store.followed.count)") }
                    NavigationLink(value: "editie") { SettingsRow("Editie", value: SettingsMap.seintjesRegel(on: store.notify && alerts.allowed && alerts.permission != .denied, slots: store.notifySlots)) }
                    NavigationLink(value: "stroom") { SettingsRow("Stroom", value: (store.layout == "krant" ? "Krant" : "Tijdlijn") + (store.bluesky ? " · Bluesky" : "")) }
                    NavigationLink(value: "vakken") {
                        let n = store.digestFields.filter(store.offersField).count
                        SettingsRow("Selectie", value: n == 1 ? "1 onderwerp" : "\(n) onderwerpen")
                    }
                } header: {
                    FormHeader("Jouw Hoot")
                }
                .hootRows()
                .task { await alerts.refresh() }

                Section {
                    WeergaveKeuze()
                    NavigationLink(value: "tekstgrootte") { SettingsRow("Tekstgrootte", value: TekstSchaal.shared.naam) }
                    NavigationLink(value: "beeld") { SettingsRow("Beeld en intro") }
                    NavigationLink(value: "artikelen") { SettingsRow("Artikelen", value: store.openWith == "safari" ? "In Safari" : "In de lezer") }
                } header: {
                    FormHeader("Lezen")
                }
                .hootRows()

                Section {
                    NavigationLink(value: "toestel") { SettingsRow("Op dit toestel") }
                    NavigationLink(value: "over") { SettingsRow("Over Hoot", value: Self.shortVersion) }
                }
                .hootRows()
            }
            .hootForm()
            .modifier(HootLetterMaat()) // leest de Tekstgrootte: het blad groeit mee terwijl je schuift
            .task { await store.loadDigest() } // voor het aantal onderwerpen dat de server levert
            .navigationTitle("Instellingen")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { page in
                SettingsDestination(page: page, onReset: reset)
            }
            .toolbar {
                // Klaar als tekst in inkt (een bevestigingsknop kleurt iOS vanzelf als een gevulde cirkel).
                ToolbarItem(placement: .topBarTrailing) { Button("Klaar") { dismiss() } }
            }
        }
    }

    // Terug naar het welkom: opnieuw kiezen, of opnieuw inloggen. Wat je bewaarde en las blijft.
    private func reset() {
        dismiss()
        Task {
            try? await Task.sleep(for: .milliseconds(450)) // eerst dit blad dicht, dan het welkom
            store.welcomeAgain = true // het welkom begint bij wat je nu hebt
            store.onboarded = false
        }
    }
}

// Elk blad onder het hoofdblad, één navigationDestination diep. Bestaande lijsten (Interesses, Bronnen,
// Selectie, Bluesky-accounts, App-icoon, Abonnementen) zijn inhoud, geen extra laag.
private struct SettingsDestination: View {
    let page: String
    let onReset: () -> Void
    var body: some View {
        Group {
            switch page {
            case "account": AccountView()
            case "interesses": InterestsList().navigationTitle("Interesses").navigationBarTitleDisplayMode(.inline)
            case "bronnen": SourcesList().navigationTitle("Bronnen").navigationBarTitleDisplayMode(.inline)
            case "editie": EditieSettingsView()
            case "stroom": StroomSettingsView()
            case "bluesky": BlueskyAccountsView(pushed: true) // opent het beheer, niet de postfeed
            case "tekstgrootte": TekstgrootteView()
            case "beeld": BeeldIntroView()
            case "artikelen": ArtikelenView()
            case "abonnementen": SubscriptionsView().navigationTitle("Abonnementen").navigationBarTitleDisplayMode(.inline)
            case "toestel": DeviceDataView(onReset: onReset)
            case "appicoon": AppIconPicker()
            case "over": OverHootView()
            default: DigestFieldsList().navigationTitle("Selectie").navigationBarTitleDisplayMode(.inline)
            }
        }
        .font(.ui(.body))
    }
}

// De accountkaart bovenaan: wie je bent en hoe het met je account staat, in twee regels. De
// samenvatting van je Hoot ("4 interesses · 8 bronnen", gelijk aan hootSummary op het web) staat op
// het blad Account zelf.
struct SettingsAccountCard: View {
    @Environment(Account.self) private var account
    @Environment(\.dynamicTypeSize) private var typeSize

    static func summary(interests: Int, sources: Int) -> String {
        let i = interests == 0 ? "Alle interesses" : interests == 1 ? "1 interesse" : "\(interests) interesses"
        return "\(i) · \(sources == 1 ? "1 bron" : "\(sources) bronnen")"
    }

    var body: some View {
        NavigationLink(value: "account") {
            // Bij de toegankelijkheidsmaten de foto boven de tekst: dan krijgt de tekst de hele breedte.
            let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: Space.s2)) : AnyLayout(HStackLayout(spacing: Space.s3))
            layout {
                AccountBadge(size: 48)
                VStack(alignment: .leading, spacing: Space.s0) {
                    Text(title).font(.ui(.headline)).foregroundStyle(Theme.ink)
                    Text(status).font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                }
                .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.vertical, Space.s1)
            .accessibilityElement(children: .combine)
        }
    }
    private var title: String {
        if Account.localBeta { return "Lokale beta" }
        switch account.status {
        case .member, .pending: return account.session?.name ?? account.session?.email ?? "Je account"
        case .loading: return "Je account"
        case .out: return "Inloggen"
        }
    }
    private var status: String {
        if Account.localBeta { return "Accountsynchronisatie uit" }
        switch account.status {
        case .member: return account.syncLine
        case .pending: return Account.pendingText
        case .loading: return "Even geduld …"
        case .out: return "Hoot op al je toestellen."
        }
    }
}

// Een rij in Instellingen D: het label links, de waarde rechts in ink3. Past het niet naast elkaar
// (grote tekst of een grote Tekstgrootte), dan schuift de waarde onder het label: nooit afgekapt.
struct SettingsRow: View {
    let title: String
    var value: String? = nil
    var ink: Color = Theme.ink // rood (Theme.accent) alleen voor wissen en verwijderen
    init(_ title: String, value: String? = nil, ink: Color = Theme.ink) { self.title = title; self.value = value; self.ink = ink }
    var body: some View {
        Group {
            if let value, !value.isEmpty {
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: Space.s3) {
                        Text(title).foregroundStyle(ink).fixedSize()
                        Spacer(minLength: Space.s2)
                        Text(value).foregroundStyle(Theme.ink3).fixedSize()
                    }
                    VStack(alignment: .leading, spacing: Space.s0) {
                        Text(title).foregroundStyle(ink)
                        Text(value).foregroundStyle(Theme.ink3)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                Text(title).foregroundStyle(ink).fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(minHeight: Space.tap)
        .accessibilityElement(children: .combine)
    }
}

// Een rij met het label en de waarde links eronder in ink3 (I1): nooit afgekapt, ook niet bij grote tekst.
struct SettingsValueRow: View {
    let title: String
    let value: String
    let systemImage: String
    var outbound = false
    var body: some View {
        HStack(spacing: Space.s3) {
            Label {
                VStack(alignment: .leading, spacing: Space.s0) {
                    Text(title).foregroundStyle(Theme.ink)
                    Text(value).font(.ui(.subheadline)).foregroundStyle(Theme.ink3).fixedSize(horizontal: false, vertical: true)
                }
            } icon: { Image(systemName: systemImage).foregroundStyle(Theme.ink3) }
            .frame(maxWidth: .infinity, alignment: .leading)
            if outbound {
                Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3).accessibilityHidden(true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

// De rij App-icoon toont het gekozen icoon zelf (I2): rood is de standaard.
struct AppIconRow: View {
    let selected: AppIconChoice?
    var body: some View {
        let choice = selected ?? .red
        HStack(spacing: Space.s3) {
            Image(choice.asset).resizable().scaledToFit()
                .frame(width: 28, height: 28)
                .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(Theme.ink.opacity(0.22), lineWidth: 1))
                .accessibilityHidden(true)
            SettingsRow("App-icoon", value: choice.name)
        }
    }
}

// Op dit toestel: wat alleen op deze iPhone geldt (Instellingen D). Het app-icoon, en wissen en
// opnieuw instellen. Wissen alleen na een action sheet met Annuleer; de rode keuze staat in de sheet.
struct DeviceDataView: View {
    @Environment(HootStore.self) private var store
    @Environment(Account.self) private var account
    let onReset: () -> Void
    @State private var icon = AppIconSelection()
    @State private var confirmClear: String? = DebugLaunch.screen("instellingen-wissen") ? "gelezen" : nil
    // Ingelogd (of je account laadt nog): Bewaard gaat mee met je account, dus wissen wist ook daar.
    private var savedSyncs: Bool { account.session != nil && account.status != .pending }

    var body: some View {
        Form {
            Section {
                NavigationLink(value: "appicoon") { AppIconRow(selected: icon.selected) }
            }
            .hootRows()
            Section {
                Button { confirmClear = "gelezen" } label: { SettingsRow("Alles als ongelezen markeren", ink: Theme.accent) }
                Button { confirmClear = "bewaard" } label: { SettingsRow("Bewaarde artikelen verwijderen", ink: Theme.accent) }
                    .disabled(store.saved.isEmpty)
                    .opacity(store.saved.isEmpty ? 0.45 : 1)
            } footer: {
                if savedSyncs { Text("Bewaard gaat mee met je account.").foregroundStyle(Theme.ink3) }
            }
            .hootRows()
            Section {
                Button { confirmClear = "reset" } label: { SettingsRow("Stel Hoot opnieuw in") }
            } footer: {
                Text("Bewaard en gelezen blijven.").foregroundStyle(Theme.ink3)
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Op dit toestel")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { icon.refresh() }
        // Een action sheet: de rode keuze bovenaan, Annuleer los eronder, en precies wat er verandert.
        .confirmationDialog(title, isPresented: Binding(get: { confirmClear != nil }, set: { if !$0 { confirmClear = nil } }), titleVisibility: .visible) {
            switch confirmClear {
            case "bewaard": Button("Verwijder", role: .destructive) { store.clearSaved() }
            case "reset": Button("Stel opnieuw in", role: .destructive) { onReset() }
            default: Button("Markeer als ongelezen", role: .destructive) { store.clearRead() }
            }
            Button("Annuleer", role: .cancel) {}
        } message: {
            Text(message)
        }
    }

    private var title: String {
        switch confirmClear {
        case "bewaard": "Alle bewaarde artikelen verwijderen?"
        case "reset": "Hoot opnieuw instellen?"
        default: "Alles als ongelezen markeren?"
        }
    }
    private var message: String {
        switch confirmClear {
        case "bewaard": "\(store.saved.count == 1 ? "1 artikel verdwijnt" : "\(store.saved.count) artikelen verdwijnen") uit Bewaard\(savedSyncs ? ", ook op je andere toestellen" : ""). Dit kun je niet ongedaan maken."
        case "reset": "Je kiest je interesses en bronnen opnieuw. Bewaard en gelezen blijven."
        default: "Bewaard blijft staan."
        }
    }
}

// Wat Hoot van je leerde (bouwspec §8): hetzelfde profiel als De Redacteur gebruikt voor jouw Editie,
// uit dezelfde bundel (profileSummary), in drie lijsten zoals op de website. Gekozen: je interesses en
// waar je 'meer hiervan' bij zei. Geleerd: wat je vaker opent of bewaart dan je bronnen erover
// schrijven (blijft op dit toestel), elk met Vergeet dit. Minder: waar je 'minder hiervan' bij zei,
// met de weg terug. Gewone taal, geen getallen. Zonder iets geleerd zegt de lijst dat. Wat je hier
// verandert telt pas bij de volgende Editie: die van dit dagdeel staat al en blijft staan.
struct LearnedSection: View {
    @Environment(HootStore.self) private var store
    @State private var summary = ProfileSummary()
    // Opnieuw rekenen als je profiel verandert: keuzes, smaak, lezen of bronnen.
    private var key: String { "\(store.interests)|\(store.topics)|\(store.favorites)|\(store.taste.topics)|\(store.affinity.n)|\(store.followed.count)|\(store.itemsById.count)" }

    var body: some View {
        Section {
            if !summary.chosen.isEmpty {
                // Het label met de waarde links eronder, zoals op het web (I1): een lange lijst
                // rechts uitgelijnd gaf een rafelige linkerkant.
                VStack(alignment: .leading, spacing: Space.s0) {
                    Text("Gekozen")
                    Text(summary.chosen.map(Taste.label).joined(separator: ", ")).font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityElement(children: .combine)
            }
            if !summary.learned.isEmpty { Text("Vaak gelezen").font(.ui(.footnote, .semibold)).foregroundStyle(Theme.hint) }
            ForEach(summary.learned, id: \.self) { t in
                LearnedRow(title: Taste.label(t), hint: nil, action: "Vergeet dit") {
                    withAnimation { store.forgetTopic(t) }
                }
            }
            if !summary.less.isEmpty { Text("Minder").font(.ui(.footnote, .semibold)).foregroundStyle(Theme.hint) }
            ForEach(summary.less, id: \.self) { t in
                LearnedRow(title: Taste.label(t), hint: nil, action: "Ongedaan maken") {
                    withAnimation { store.restoreLess(t) }
                }
            }
            if summary.learned.isEmpty && summary.less.isEmpty {
                LearnedRow(title: "Nog niets geleerd", hint: nil, action: nil) {}
            }
        } header: {
            FormHeader("Wat Hoot leerde")
        } footer: {
            // Instellingen D: één voetregel, de weg naar meer of minder. Wat je hier verandert telt vanaf je volgende Editie.
            Text("Meer of minder van iets? Druk lang op een verhaal.").foregroundStyle(Theme.ink3)
        }
        .hootRows()
        .task(id: key) { summary = await store.profileSummary() }
        .animation(.default, value: summary)
    }
}

// Eén onderwerp met wat Hoot ervan vindt en, als het kan, de weg terug: een rustige knop rechts.
private struct LearnedRow: View {
    let title: String
    var hint: String? = nil
    let action: String?
    let run: () -> Void
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
            VStack(alignment: .leading, spacing: Space.s0) {
                Text(title)
                if let hint { Text(hint).font(.ui(.subheadline)).foregroundStyle(Theme.ink3) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let action {
                Button(action, action: run)
                    .font(.ui(.subheadline, .semibold))
                    .buttonStyle(.borderless)
                    .tint(Theme.ink) // bediening: inkt, geen rood
            }
        }
    }
}

// Interesses: dezelfde acht als op de website (src/lib/topics.js). Onder elke interesse die aan
// staat: Wat precies?, de onderwerpen als keuzeknoppen (zoals stap 3 van het welkom op het web).
struct InterestsList: View {
    @Environment(HootStore.self) private var store
    // Wat je aantikte, vast zolang je hier bent: tik je alle onderwerpen van een interesse aan, dan
    // blijven ze zo staan (bewaard betekent dat hetzelfde als niets kiezen: alles).
    @State private var picked: [String]?
    static let about = ["politiek": "Nederland, Europa, Verenigde Staten, verkiezingen", "binnenland": "Wonen, zorg, onderwijs, misdaad, migratie", "wereld": "Oekraïne, Midden-Oosten, Azië, geopolitiek", "economie": "Werk, bedrijven, energie, geld", "tech": "AI, tech, gadgets, privacy", "wetenschap": "Klimaat, gezondheid, ruimte, natuur", "cultuur": "Muziek, film, boeken, kunst, media", "sport": "Voetbal, F1, wielrennen, tennis"]
    static func summary(_ ids: [String]) -> String {
        let names = Rubriek.alle.filter { ids.contains($0.id) }.map(\.label)
        return names.isEmpty ? "Alle interesses" : names.joined(separator: ", ")
    }
    private var mine: [String] { Rubriek.picked(from: store.topics, interests: store.interests) }

    var body: some View {
        let picked = self.picked ?? mine
        Form {
            Section {
                ForEach(Rubriek.alle) { r in
                    let on = store.interests.contains(r.id)
                    VStack(alignment: .leading, spacing: Space.s3) {
                        Toggle(isOn: Binding(get: { on }, set: { now in
                            withAnimation { store.setInterests(now ? store.interests + [r.id] : store.interests.filter { $0 != r.id }, picked: picked) }
                        })) {
                            Label {
                                VStack(alignment: .leading, spacing: Space.s0) {
                                    Text(r.label)
                                    if !on { Text(Self.about[r.id] ?? "").font(.ui(.caption)).foregroundStyle(Theme.hint) }
                                }
                            } icon: { Image(systemName: r.icon).foregroundStyle(Theme.ink3) }
                        }
                        // De scheidingslijn begint bij de naam, ook als er keuzeknoppen onder staan.
                        .alignmentGuide(.listRowSeparatorLeading) { $0[.listRowSeparatorLeading] }
                        if on {
                            TopicChips(rubriek: r, picked: picked) { t in
                                let next = picked.contains(t) ? picked.filter { $0 != t } : picked + [t]
                                self.picked = next
                                store.setInterests(store.interests, picked: next)
                            }
                        }
                    }
                }
            } footer: {
                Text("Kies je niets, dan krijg je alles. Groot nieuws staat altijd bovenaan.").foregroundStyle(Theme.ink3)
            }
            .hootRows()
        }
        .hootForm()
        .onAppear { self.picked = mine }
        // Van je account of een ander toestel: dan geldt wat daar gekozen is.
        .onChange(of: store.topics) {
            if let p = self.picked, Rubriek.resolve(store.interests, picked: p) != store.topics { self.picked = mine }
        }
    }
}

struct DigestFieldsList: View {
    @Environment(HootStore.self) private var store
    typealias Field = (id: String, label: String, icon: String)
    // Gelijk aan shared/vak.mjs (de server): acht domeinen, elk met zijn onderwerpen. De app toont
    // alleen wat de server levert; een onderwerp zonder bronnen staat er (nog) niet bij.
    static let domains: [(label: String, fields: [Field])] = [
        ("Marketing & communicatie", [("merk", "Merk & reclame", "tag"), ("paid-social", "Online adverteren", "megaphone"), ("seo", "SEO & content", "magnifyingglass"), ("pr", "PR & communicatie", "bubble.left.and.text.bubble.right"), ("social", "Social media & creators", "person.wave.2")]),
        ("Design & creatie", [("ux", "UI/UX", "cursorarrow.click.2"), ("design", "Digitaal ontwerp", "paintpalette"), ("architectuur", "Architectuur & wonen", "building.2"), ("fotografie", "Fotografie", "camera")]),
        ("Tech & product", [("ai", "AI", "sparkles"), ("dev", "Development", "chevron.left.forwardslash.chevron.right"), ("product", "Productmanagement", "square.stack.3d.up"), ("data", "Data & analytics", "chart.bar.xaxis"), ("security", "Security & privacy", "lock.shield"), ("gadgets", "Tech & gadgets", "iphone")]),
        ("Ondernemen & werk", [("ondernemen", "Startups & ondernemen", "lightbulb"), ("ecommerce", "E-commerce & retail", "cart"), ("leiderschap", "Leiderschap & management", "person.3"), ("hr", "HR & werk", "person.badge.plus")]),
        ("Geld & economie", [("economie", "Economie", "chart.line.uptrend.xyaxis"), ("geld", "Geld & beleggen", "banknote"), ("vastgoed", "Wonen & vastgoed", "house")]),
        ("Wetenschap & gezondheid", [("wetenschap", "Wetenschap", "atom"), ("zorg", "Zorg & gezondheid", "cross.case"), ("klimaat", "Klimaat & energie", "leaf")]),
        ("Maatschappij", [("politiek", "Politiek & bestuur", "building.columns"), ("recht", "Recht", "scalemass"), ("onderwijs", "Onderwijs", "graduationcap"), ("media", "Journalistiek & media", "newspaper")]),
        ("Cultuur & vrije tijd", [("film", "Film & series", "film"), ("muziek", "Muziek", "music.note"), ("boeken", "Boeken", "book"), ("kunst", "Kunst & musea", "photo.artframe"), ("gaming", "Gaming", "gamecontroller"), ("geek", "Geekcultuur", "wand.and.stars"), ("eten", "Eten & drinken", "fork.knife"), ("reizen", "Reizen", "airplane"), ("sport", "Sport", "figure.run")]),
    ]
    static let fields: [Field] = domains.flatMap(\.fields)

    var body: some View {
        let offered = Self.fields.map(\.id).filter(store.offersField)
        Form {
            // Alles in één keer aan of uit (zoals op het web; Instellingen D).
            Section {
                Toggle(isOn: Binding(get: { !offered.isEmpty && offered.allSatisfy(store.digestFields.contains) }, set: { on in
                    store.digestFields = on ? Self.fields.map(\.id).filter { offered.contains($0) || store.digestFields.contains($0) } : []
                })) { Text("Alle onderwerpen") }
            }
            .hootRows()
            ForEach(Self.domains, id: \.label) { domain in
                let offered = domain.fields.filter { store.offersField($0.id) }
                if !offered.isEmpty {
                    Section {
                        ForEach(offered, id: \.id) { f in
                            Toggle(isOn: Binding(get: { store.digestFields.contains(f.id) }, set: { on in
                                store.digestFields = on ? Self.fields.map(\.id).filter { $0 == f.id || store.digestFields.contains($0) } : store.digestFields.filter { $0 != f.id }
                            })) {
                                FormLabel(f.label, systemImage: f.icon)
                            }
                        }
                    } header: {
                        FormHeader(domain.label)
                    }
                    .hootRows()
                }
            }
            Section {} footer: {
                Text("Elke maandag het beste per onderwerp.").foregroundStyle(Theme.ink3)
            }
        }
        .hootForm()
        .task { await store.loadDigest() }
    }
}

// De knop rechtsboven op Bewaard; opent de instellingen. Op Editie, Stroom en Selectie staat het
// tandwiel in de kopregel (HootKop) en opent het via `openSettings`.
struct AccountButton: ToolbarContent {
    @Binding var open: Bool
    var body: some ToolbarContent {
        // Rustig: grijs en zonder glazen rondje; de inhoud gaat voor.
        ToolbarItem(placement: .topBarTrailing) {
            Button("Instellingen", systemImage: "gearshape") { open = true }
                .tint(Theme.ink3)
        }
        .sharedBackgroundVisibility(.hidden)
    }
}

// Instellingen openen vanuit de kopregel.
struct OpenSettingsKey: EnvironmentKey { static let defaultValue: @MainActor () -> Void = {} }
extension EnvironmentValues {
    var openSettings: @MainActor () -> Void {
        get { self[OpenSettingsKey.self] }
        set { self[OpenSettingsKey.self] = newValue }
    }
}

extension View {
    // Het instellingenblad, te openen met `openSettings` (het tandwiel in de kopregel). `toolbar`:
    // ook een tandwiel in de navigatiebalk (Bewaard, dat geen kopregel heeft).
    func settingsButton(toolbar: Bool = false) -> some View { modifier(SettingsButton(toolbar: toolbar)) }
}

private struct SettingsButton: ViewModifier {
    let toolbar: Bool
    @State private var open = false
    func body(content: Content) -> some View {
        content
            .environment(\.openSettings) { open = true }
            .toolbar { if toolbar { AccountButton(open: $open) } }
            .sheet(isPresented: $open) { SettingsView().debugAppearance().modifier(HootWeergave()) }
            .onAppear { if DebugLaunch.screen?.hasPrefix("instellingen") == true { open = true } }
    }
}

// Een rij die de app verlaat (mail, website): gewone tekst met ↗ rechts, zoals Apple.
struct OutboundRow: View {
    let title: String
    var body: some View {
        HStack {
            SettingsRow(title)
            Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3).accessibilityHidden(true)
        }
    }
}
