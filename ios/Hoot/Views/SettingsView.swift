import SwiftUI

// Instellingen: een blad achter de knop rechtsboven, volgens de Human Interface Guidelines:
// - alleen wat je in de app vaak wilt aanpassen; wat bij het systeem hoort (achtergrond,
//   tekstgrootte, hoe meldingen eruitzien) via de pagina van Hoot in de Instellingen-app. Het
//   seintje bij een nieuwe Editie staat wél hier: welke edities, dat is een keuze in Hoot;
// - geen eigen licht/donker: de app volgt de keuze van je iPhone;
// - geen opties die (nog) niet werken of nu niet van toepassing zijn;
// - wissen alleen na bevestiging, met Annuleer.
struct SettingsView: View {
    @Environment(HootStore.self) private var store
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(EditionAlerts.self) private var alerts
    @State private var confirmClear: String? = DebugLaunch.screen("instellingen-wissen") ? "gelezen" : nil
    @State private var path: [String] = DebugLaunch.screen("instellingen-bronnen") ? ["bronnen"] : DebugLaunch.screen("instellingen-interesses") ? ["interesses"] : DebugLaunch.screen("instellingen-vakken") ? ["vakken"] : DebugLaunch.screen("instellingen-abonnementen") ? ["abonnementen"] : []

    private var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        return "\(v) (\(b))"
    }

    // Lid (of je account laadt nog): Bewaard gaat mee met je account, dus wissen wist ook daar.
    private var savedSyncs: Bool { account.session != nil && account.status != .noInvite }

    // Seintje bij een nieuwe Editie. De schakelaar is zelf de uitleg: pas bij aanzetten vraagt iOS om
    // toestemming. Zei je eerder nee, dan springt hij terug en wijzen we de weg naar de Instellingen-app.
    @ViewBuilder private var alertsSection: some View {
        let denied = alerts.permission == .denied
        Section {
            Toggle(isOn: Binding(get: { store.notify && !denied }, set: { on in
                guard on else { store.notify = false; return }
                guard !denied else { return }
                store.notify = true
                guard !alerts.allowed else { return }
                Task { if await !alerts.ask() { withAnimation { store.notify = false } } }
            })) {
                Label("Seintje bij een nieuwe Editie", systemImage: "bell")
            }
            .disabled(denied) // de knop en de voettekst eronder zeggen waarom
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
                        // De naam, zonder tijd. Past "Middageditie" niet meer (heel grote tekst: hij brak midden
                        // in het woord), dan gesplitst op de woordgrens: "Middag" met een rustig "Editie" eronder.
                        Label {
                            ViewThatFits(in: .horizontal) {
                                Text(slot.name).fixedSize()
                                VStack(alignment: .leading, spacing: Space.s0) {
                                    Text(slot.short)
                                    Text("Editie").font(.subheadline).foregroundStyle(Theme.ink3)
                                }
                            }
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel(slot.name)
                        } icon: { Image(systemName: slot.icon) }
                    }
                }
            }
            if denied {
                Button {
                    if let url = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(url) }
                } label: {
                    OutboundRow(title: "Open Instellingen", systemImage: "gearshape")
                }
                .accessibilityHint("Opent de meldingen van Hoot in de Instellingen-app")
            }
        } header: {
            Text("Seintjes")
        } footer: {
            Text(denied ? "Meldingen van Hoot staan uit. Zet ze aan in de Instellingen-app." : "Een stil seintje, zonder geluid, een paar minuten nadat je Editie klaarligt. Alleen op dit toestel.").foregroundStyle(Theme.ink3)
        }
        .animation(.default, value: store.notify && alerts.allowed)
        .task { await alerts.refresh() }
    }

    var body: some View {
        @Bindable var store = store
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
            Form {
                Section { AccountRow() }
                Section {
                    Picker(selection: $store.images) {
                        Text("Aan").tag("aan")
                        Text("Alleen hoofdverhaal").tag("hoofd")
                        Text("Uit").tag("uit")
                    } label: {
                        Label("Afbeeldingen", systemImage: "photo")
                    }
                    Picker(selection: $store.preview) {
                        Text("1 regel").tag(1)
                        Text("2 regels").tag(2)
                        Text("3 regels").tag(3)
                        Text("Hele intro").tag(0)
                    } label: {
                        Label("Intro bij berichten", systemImage: "text.alignleft")
                    }
                    Toggle(isOn: $store.bubble) {
                        Label("Buiten je bubbel", systemImage: "sparkle.magnifyingglass")
                    }
                } header: {
                    Text("Editie en Stroom")
                } footer: {
                    Text("Buiten je bubbel: één verhaal waar veel mensen nu naar zoeken en dat niet in je Editie staat.").foregroundStyle(Theme.ink3)
                }

                // Eén keuze (waar openen artikelen), met de uitzonderingen alleen als die gelden.
                Section {
                    Picker(selection: $store.openWith.animation()) {
                        Text("In de lezer").tag("lezer")
                        Text("In Safari").tag("safari")
                    } label: {
                        Label("Artikelen openen", systemImage: "doc.richtext")
                    }
                    if store.openWith == "lezer" {
                        NavigationLink(value: "abonnementen") { SubscriptionsRow() }
                    }
                } header: {
                    Text("Lezen")
                } footer: {
                    Text(store.openWith == "lezer" ? "De lezer toont alleen de tekst en beelden, in de opmaak van Hoot. Log één keer in bij je abonnementen om ook hun hele artikelen hier te lezen." : "Artikelen openen in Safari. Daar ben je al ingelogd bij je abonnementen, met je wachtwoorden en Google of Apple.").foregroundStyle(Theme.ink3)
                }

                alertsSection

                Section {
                    Toggle(isOn: $store.bluesky) {
                        Label("Bluesky in de Stroom", systemImage: "bubble.left.and.bubble.right")
                    }
                } header: {
                    Text("Bluesky")
                } footer: {
                    Text("Bovenaan de Stroom staat dan de rubriek Bluesky. Daar voeg je mensen toe met hun @-naam.").foregroundStyle(Theme.ink3)
                }

                Section {
                    NavigationLink(value: "interesses") {
                        LabeledContent {
                            Text(InterestsList.summary(store.interests)).lineLimit(1)
                        } label: { Label("Interesses", systemImage: "heart.text.square") }
                    }
                    NavigationLink(value: "bronnen") {
                        LabeledContent { Text(store.favorites.isEmpty ? "Geen" : "\(store.favorites.count)") } label: { Label("Voorkeursbronnen", systemImage: "star") }
                    }
                    // Wat je zelf aangaf met meer of minder hiervan (lang drukken op een verhaal).
                    if !store.taste.more.isEmpty || !store.taste.less.isEmpty {
                        VStack(alignment: .leading, spacing: Space.s1) {
                            Label("Wat Hoot van je leerde", systemImage: "hand.thumbsup")
                            Group {
                                if !store.taste.more.isEmpty { Text("Meer: \(store.taste.more.prefix(6).map(Taste.label).joined(separator: ", "))") }
                                if !store.taste.less.isEmpty { Text("Minder: \(store.taste.less.prefix(6).map(Taste.label).joined(separator: ", "))") }
                            }
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                        }
                        Button("Wis wat Hoot leerde", role: .destructive) { withAnimation { store.clearTaste() } }
                    }
                } header: {
                    Text("Jouw Editie")
                } footer: {
                    Text("Je Editie komt uit je eigen bronnen. Wat bij je interesses past en wat van je voorkeursbronnen komt (de ster bij Bronnen) gaat voor. Ook wat je opent en bewaart telt mee; dat blijft op dit toestel. Meer of minder van iets? Druk lang op een verhaal in de Editie; dat gaat mee met je account.").foregroundStyle(Theme.ink3)
                }

                Section("Bronnen en onderwerpen") {
                    NavigationLink(value: "bronnen") {
                        LabeledContent { Text("\(store.followed.count) aan") } label: { Label("Bronnen", systemImage: "dot.radiowaves.up.forward") }
                    }
                    NavigationLink(value: "vakken") {
                        LabeledContent { Text("\(store.digestFields.filter(store.offersField).count) gekozen") } label: { Label("Onderwerpen", systemImage: "books.vertical") }
                    }
                }

                Section {
                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    } label: {
                        OutboundRow(title: "Meldingen en achtergrond", systemImage: "gearshape")
                    }
                    .foregroundStyle(Theme.ink)
                    .accessibilityHint("Opent Hoot in de Instellingen-app")
                } footer: {
                    Text("In de Instellingen-app van je toestel. De tekstgrootte volgt je toestel (Toegankelijkheid › Weergave en tekstgrootte).").foregroundStyle(Theme.ink3)
                }

                Section {
                    Button(role: .destructive) { confirmClear = "gelezen" } label: {
                        Label("Alles als ongelezen markeren", systemImage: "eye.slash")
                    }
                    Button(role: .destructive) { confirmClear = "bewaard" } label: {
                        Label("Bewaarde artikelen verwijderen", systemImage: "bookmark.slash")
                    }
                    .disabled(store.saved.isEmpty)
                } header: {
                    Text(savedSyncs ? "Gelezen en Bewaard" : "Op dit toestel")
                }

                // Terug naar het welkom: opnieuw kiezen, of opnieuw inloggen. Wat je bewaarde en las blijft.
                Section {
                    Button {
                        dismiss()
                        Task {
                            try? await Task.sleep(for: .milliseconds(450)) // eerst dit blad dicht, dan het welkom
                            store.onboarded = false
                        }
                    } label: {
                        Label("Stel Hoot opnieuw in", systemImage: "arrow.counterclockwise")
                    }
                    .foregroundStyle(Theme.ink)
                } footer: {
                    Text("Je ziet het welkom weer en kiest opnieuw je interesses en bronnen. Wat je bewaarde en las, blijft.").foregroundStyle(Theme.ink3)
                }

                Section("Over") {
                    LabeledContent("Versie", value: version)
                    LabeledContent("Gemaakt door") { Link("Baldadig.nl", destination: URL(string: "https://baldadig.nl")!) }
                    Link(destination: URL(string: "https://hootnews.nl/#/privacy")!) { OutboundRow(title: "Privacybeleid", systemImage: "hand.raised") }.foregroundStyle(Theme.ink)
                    Link(destination: URL(string: "https://hootnews.nl")!) { OutboundRow(title: "hootnews.nl", systemImage: "globe") }.foregroundStyle(Theme.ink)
                }
                .id("over")
            }
            .debugJump(proxy, to: "over", when: 0)
            .task { await store.loadDigest() } // voor het aantal vakgebieden dat de server levert
            }
            .navigationTitle("Instellingen")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { page in
                if page == "account" {
                    AccountView()
                } else if page == "bronnen" {
                    SourcesList().navigationTitle("Bronnen").navigationBarTitleDisplayMode(.inline)
                } else if page == "abonnementen" {
                    SubscriptionsView().navigationTitle("Je abonnementen").navigationBarTitleDisplayMode(.inline)
                } else if page == "interesses" {
                    InterestsList().navigationTitle("Interesses").navigationBarTitleDisplayMode(.inline)
                } else {
                    DigestFieldsList().navigationTitle("Onderwerpen").navigationBarTitleDisplayMode(.inline)
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { dismiss() } }
            }
            // Een melding met een zichtbare Annuleer (een actieblad zonder die knop laat de veilige
            // uitweg aan een tik ernaast over), en precies wat er verandert.
            .alert(confirmClear == "bewaard" ? "Alle bewaarde artikelen verwijderen?" : "Alles als ongelezen markeren?", isPresented: Binding(get: { confirmClear != nil }, set: { if !$0 { confirmClear = nil } })) {
                Button("Annuleer", role: .cancel) {}
                if confirmClear == "bewaard" {
                    Button("Verwijder", role: .destructive) { store.clearSaved() }
                } else {
                    Button("Markeer als ongelezen", role: .destructive) { store.clearRead() }
                }
            } message: {
                Text(confirmClear == "bewaard" ? "\(store.saved.count == 1 ? "1 artikel verdwijnt" : "\(store.saved.count) artikelen verdwijnen") uit Bewaard\(savedSyncs ? ", op al je apparaten en op hootnews.nl" : ""). Dit kun je niet ongedaan maken." : "Wat je las, wordt weer gewoon getoond. Je bewaarde artikelen blijven staan.")
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
    static let about = ["politiek": "Nederland, Europa, VS-politiek, verkiezingen", "binnenland": "Wonen, zorg, onderwijs, misdaad, migratie", "wereld": "Oekraïne, Midden-Oosten, Azië, geopolitiek", "economie": "Werk, bedrijven, energie, geld", "tech": "AI, tech, gadgets, privacy", "wetenschap": "Klimaat, gezondheid, ruimte, natuur", "cultuur": "Muziek, film, boeken, kunst, media", "sport": "Voetbal, F1, wielrennen, tennis"]
    static func summary(_ ids: [String]) -> String {
        let names = Rubriek.alle.filter { ids.contains($0.id) }.map(\.label)
        return names.isEmpty ? "Geen" : names.joined(separator: ", ")
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
                                    if !on { Text(Self.about[r.id] ?? "").font(.caption).foregroundStyle(Theme.ink3) }
                                }
                            } icon: { Image(systemName: r.icon) }
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
                Text("Kies wat je het meest boeit. Kies je niets, dan krijg je alles binnen dat onderwerp. Wat hierbij past, gaat voor in je Editie; echt groot nieuws blijft bovenaan, ook als het buiten je interesses valt.").foregroundStyle(Theme.ink3)
            }
        }
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
        Form {
            ForEach(Self.domains, id: \.label) { domain in
                let offered = domain.fields.filter { store.offersField($0.id) }
                if !offered.isEmpty {
                    Section(domain.label) {
                        ForEach(offered, id: \.id) { f in
                            Toggle(isOn: Binding(get: { store.digestFields.contains(f.id) }, set: { on in
                                store.digestFields = on ? Self.fields.map(\.id).filter { $0 == f.id || store.digestFields.contains($0) } : store.digestFields.filter { $0 != f.id }
                            })) {
                                Label(f.label, systemImage: f.icon)
                            }
                        }
                    }
                }
            }
            Section {} footer: {
                Text("Elke maandagochtend per onderwerp de drie belangrijkste stukken van de week, door mensen geschreven.").foregroundStyle(Theme.ink3)
            }
        }
        .task { await store.loadDigest() }
    }
}

// De knop rechtsboven op elk scherm; opent de instellingen. (Wordt je account-foto zodra je kunt inloggen.)
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

extension View {
    // Account-knop plus het instellingenblad.
    func settingsButton() -> some View { modifier(SettingsButton()) }
}

private struct SettingsButton: ViewModifier {
    @State private var open = false
    func body(content: Content) -> some View {
        content
            .toolbar { AccountButton(open: $open) }
            .sheet(isPresented: $open) { SettingsView().debugAppearance() }
            .onAppear { if DebugLaunch.screen?.hasPrefix("instellingen") == true { open = true } }
    }
}

// Een rij die de app verlaat (Instellingen-app, website): gewone tekst met ↗ rechts, zoals Apple.
struct OutboundRow: View {
    let title: String
    let systemImage: String
    var body: some View {
        HStack {
            Label { Text(title).foregroundStyle(Theme.ink) } icon: { Image(systemName: systemImage).foregroundStyle(Theme.accent) }
            Spacer()
            Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3)
        }
    }
}
