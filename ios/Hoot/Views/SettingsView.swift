import SwiftUI

// Instellingen A (concepten-2/6-instellingen.html): één blad, geordend op wat je als lezer wilt doen,
// volgens de Human Interface Guidelines:
// - bovenaan je account, met de samenvatting van je Hoot (uit variant B);
// - Jouw Hoot, Lezen, Stroom en Over Hoot; wat je zelden doet ligt één tik dieper (Op dit toestel);
// - keuzes zijn een menu met een vinkje, nooit een rood segment; Automatisch volgt de iPhone, en
//   alleen dan staat "Als het donker is" eronder;
// - wissen alleen na bevestiging, met Annuleer. Web en iOS hebben dezelfde groepen en labels.
struct SettingsView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(EditionAlerts.self) private var alerts
    @AppStorage("hoot.weergave") private var weergave = "system"
    @State private var icon = AppIconSelection()
    @State private var path: [String] = DebugLaunch.screen("instellingen-bronnen") ? ["bronnen"] : DebugLaunch.screen("instellingen-interesses") ? ["interesses"] : DebugLaunch.screen("instellingen-vakken") ? ["vakken"] : DebugLaunch.screen("instellingen-abonnementen") ? ["abonnementen"] : DebugLaunch.screen("instellingen-wissen") ? ["toestel"] : []

    static var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        return "\(v) (\(b))"
    }

    // Seintje bij een nieuwe Editie, als rijen in Jouw Hoot. De schakelaar is zelf de uitleg: pas bij
    // aanzetten vraagt iOS om toestemming. Zei je eerder nee, dan wijst een rij de weg naar de Instellingen-app.
    @ViewBuilder private var alertRows: some View {
        let denied = alerts.permission == .denied
        Toggle(isOn: Binding(get: { store.notify && !denied }, set: { on in
            guard on else { store.notify = false; return }
            guard !denied else { return }
            store.notify = true
            guard !alerts.allowed else { return }
            Task { if await !alerts.ask() { withAnimation { store.notify = false } } }
        })) {
            FormLabel("Seintje bij een nieuwe Editie", systemImage: "bell")
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
                    } icon: { Image(systemName: slot.icon).foregroundStyle(Theme.ink3) }
                }
            }
        }
        if denied {
            Button {
                if let url = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(url) }
            } label: {
                SettingsValueRow(title: "Seintjes staan uit", value: "Zet ze aan in de Instellingen-app", systemImage: "bell.slash", outbound: true)
            }
            .accessibilityHint("Opent de meldingen van Hoot in de Instellingen-app")
        }
    }

    var body: some View {
        @Bindable var store = store
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
            Form {
                Section { SettingsAccountCard() } footer: { SettingsAccountCard.Footer() }.hootRows()

                Section {
                    NavigationLink(value: "interesses") {
                        // De waarde links onder het label (I1): een lange lijst kapt nooit af ("Econom…").
                        SettingsValueRow(title: "Interesses", value: InterestsList.summary(store.interests), systemImage: "heart.text.square")
                    }
                    NavigationLink(value: "bronnen") {
                        LabeledContent { Text("\(store.followed.count)") } label: { FormLabel("Bronnen", systemImage: "dot.radiowaves.up.forward") }
                    }
                    NavigationLink(value: "vakken") {
                        let n = store.digestFields.filter(store.offersField).count
                        LabeledContent { Text(n == 1 ? "1 onderwerp" : "\(n) onderwerpen") } label: { FormLabel("Selectie", systemImage: "books.vertical") }
                    }
                    Toggle(isOn: $store.bubble) {
                        FormLabel("Buiten je bubbel", systemImage: "sparkle.magnifyingglass")
                    }
                    alertRows
                } header: {
                    FormHeader("Jouw Hoot")
                } footer: {
                    Text("Meer of minder van iets? Druk lang op een verhaal.").foregroundStyle(Theme.ink3)
                }
                .hootRows()
                .animation(.default, value: store.notify && alerts.allowed)
                .task { await alerts.refresh() }

                LearnedSection().id("geleerd")

                Section {
                    WeergaveKeuze()
                    Picker(selection: $store.images) {
                        Text("Aan").tag("aan")
                        Text("Alleen hoofdverhaal").tag("hoofd")
                        Text("Uit").tag("uit")
                    } label: {
                        FormLabel("Beeld", systemImage: "photo")
                    }
                    Picker(selection: $store.preview) {
                        Text("1 regel").tag(1)
                        Text("2 regels").tag(2)
                        Text("3 regels").tag(3)
                        Text("Hele intro").tag(0)
                    } label: {
                        FormLabel("Intro", systemImage: "text.alignleft")
                    }
                    Picker(selection: $store.openWith.animation()) {
                        Text("In de lezer").tag("lezer")
                        Text("In Safari").tag("safari")
                    } label: {
                        FormLabel("Artikelen openen", systemImage: "doc.richtext")
                    }
                    if store.openWith == "lezer" {
                        NavigationLink(value: "abonnementen") { SubscriptionsRow() }
                    }
                    NavigationLink(value: "appicoon") { AppIconRow(selected: icon.selected) }
                } header: {
                    FormHeader("Lezen")
                } footer: {
                    if Weergave(stored: weergave) == .system {
                        Text("Automatisch volgt je toestel. De tekstgrootte ook.").foregroundStyle(Theme.ink3)
                    } else {
                        Text("De tekstgrootte volgt je toestel.").foregroundStyle(Theme.ink3)
                    }
                }
                .hootRows()

                Section {
                    // Een menu, net als de rest: het groeit mee met de tekst (I5).
                    Picker(selection: $store.layout) {
                        Text("Tijdlijn").tag("tijdlijn")
                        Text("Krant").tag("krant")
                    } label: {
                        FormLabel("Lees de Stroom als", systemImage: store.layout == "krant" ? "newspaper" : "rectangle.grid.1x2")
                    }
                    Toggle(isOn: $store.bluesky.animation()) {
                        FormLabel("Bluesky in de Stroom", systemImage: "bubble.left.and.bubble.right")
                    }
                    if store.bluesky {
                        NavigationLink(value: "bluesky") { FormLabel("Bluesky-accounts", systemImage: "text.bubble") }
                    }
                } header: {
                    FormHeader("Stroom")
                }
                .hootRows()

                Section {
                    NavigationLink(value: "toestel") { FormLabel("Op dit toestel", systemImage: "iphone") }
                    Link(destination: URL(string: "mailto:info@gethoot.app")!) { OutboundRow(title: "Hulp en contact", systemImage: "questionmark.circle") }.foregroundStyle(Theme.ink)
                    Link(destination: URL(string: "https://gethoot.app/privacy")!) { OutboundRow(title: "Privacy", systemImage: "hand.raised") }.foregroundStyle(Theme.ink)
                    Link(destination: URL(string: "https://gethoot.app")!) { OutboundRow(title: "gethoot.app", systemImage: "globe") }.foregroundStyle(Theme.ink)
                } header: {
                    FormHeader("Over Hoot")
                } footer: {
                    Text("Hoot \(Self.version) · gemaakt door Baldadig").foregroundStyle(Theme.ink3)
                }
                .hootRows()
                .id("over")
            }
            .hootForm()
            .debugJump(proxy, to: DebugLaunch.screen("instellingen-geleerd") ? "geleerd" : "over", when: 0)
            .task { await store.loadDigest() } // voor het aantal onderwerpen dat de server levert
            }
            .navigationTitle("Instellingen")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { page in
                if page == "appicoon" {
                    AppIconPicker()
                } else if page == "account" {
                    AccountView()
                } else if page == "bronnen" {
                    SourcesList().navigationTitle("Bronnen").navigationBarTitleDisplayMode(.inline)
                } else if page == "abonnementen" {
                    SubscriptionsView().navigationTitle("Abonnementen").navigationBarTitleDisplayMode(.inline)
                } else if page == "bluesky" {
                    BlueskyPage()
                } else if page == "interesses" {
                    InterestsList().navigationTitle("Interesses").navigationBarTitleDisplayMode(.inline)
                } else if page == "toestel" {
                    DeviceDataView(onReset: reset)
                } else {
                    DigestFieldsList().navigationTitle("Selectie").navigationBarTitleDisplayMode(.inline)
                }
            }
            .toolbar {
                // Klaar als tekst in inkt (een bevestigingsknop kleurt iOS vanzelf als een gevulde cirkel).
                ToolbarItem(placement: .topBarTrailing) { Button("Klaar") { dismiss() } }
            }
        }
        .onChange(of: path) { _, _ in icon.refresh() }
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

// De accountkaart bovenaan (Instellingen A met de samenvatting uit B): wie je bent, wat jouw Hoot is
// ("4 interesses · 8 bronnen", gelijk aan hootSummary op het web) en hoe het met je account staat.
struct SettingsAccountCard: View {
    @Environment(Account.self) private var account
    @Environment(HootStore.self) private var store

    static func summary(interests: Int, sources: Int) -> String {
        let i = interests == 0 ? "Alle interesses" : interests == 1 ? "1 interesse" : "\(interests) interesses"
        return "\(i) · \(sources == 1 ? "1 bron" : "\(sources) bronnen")"
    }

    var body: some View {
        NavigationLink(value: "account") {
            HStack(spacing: Space.s3) {
                AccountBadge(size: 44)
                VStack(alignment: .leading, spacing: Space.s0) {
                    Text(title).font(.headline).foregroundStyle(Theme.ink)
                    Text(Self.summary(interests: store.interests.count, sources: store.followed.count)).font(.subheadline).foregroundStyle(Theme.ink3)
                    Text(status).font(.subheadline).foregroundStyle(Theme.ink3)
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
        case .out: return "Bewaar je Hoot op al je toestellen"
        }
    }

    struct Footer: View {
        @Environment(Account.self) private var account
        var body: some View {
            if account.status == .out && !Account.localBeta {
                Text("Lezen kan zonder account.").foregroundStyle(Theme.ink3)
            }
        }
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
                    Text(value).font(.subheadline).foregroundStyle(Theme.ink3).fixedSize(horizontal: false, vertical: true)
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
        LabeledContent {
            Text(choice.name)
        } label: {
            Label {
                Text("App-icoon")
            } icon: {
                Image(choice.asset).resizable().scaledToFit()
                    .frame(width: 28, height: 28)
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 7, style: .continuous).strokeBorder(Theme.ink.opacity(0.22), lineWidth: 1))
                    .accessibilityHidden(true)
            }
        }
    }
}

// Op dit toestel: wat je zelden doet, één tik dieper. Wissen alleen na bevestiging.
struct DeviceDataView: View {
    @Environment(HootStore.self) private var store
    @Environment(Account.self) private var account
    let onReset: () -> Void
    @State private var confirmClear: String? = DebugLaunch.screen("instellingen-wissen") ? "gelezen" : nil
    // Ingelogd (of je account laadt nog): Bewaard gaat mee met je account, dus wissen wist ook daar.
    private var savedSyncs: Bool { account.session != nil && account.status != .pending }

    var body: some View {
        Form {
            Section {
                // In inkt, zoals alle bediening: de melding erna zegt wat er verdwijnt, met Verwijder in rood.
                Button(role: .destructive) { confirmClear = "gelezen" } label: {
                    FormLabel("Alles als ongelezen markeren", systemImage: "eye.slash")
                }
                .foregroundStyle(Theme.ink)
                Button(role: .destructive) { confirmClear = "bewaard" } label: {
                    FormLabel("Bewaarde artikelen verwijderen", systemImage: "bookmark.slash")
                }
                .foregroundStyle(Theme.ink)
                .disabled(store.saved.isEmpty)
                .opacity(store.saved.isEmpty ? 0.45 : 1)
            } footer: {
                if savedSyncs { Text("Bewaard gaat mee met je account.").foregroundStyle(Theme.ink3) }
            }
            .hootRows()
            Section {
                Button(action: onReset) { FormLabel("Stel Hoot opnieuw in", systemImage: "arrow.counterclockwise") }
                    .foregroundStyle(Theme.ink)
            } footer: {
                Text("Bewaard en gelezen blijven.").foregroundStyle(Theme.ink3)
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Op dit toestel")
        .navigationBarTitleDisplayMode(.inline)
        // Een melding met een zichtbare Annuleer, en precies wat er verandert.
        .alert(confirmClear == "bewaard" ? "Alle bewaarde artikelen verwijderen?" : "Alles als ongelezen markeren?", isPresented: Binding(get: { confirmClear != nil }, set: { if !$0 { confirmClear = nil } })) {
            Button("Annuleer", role: .cancel) {}
            if confirmClear == "bewaard" {
                Button("Verwijder", role: .destructive) { store.clearSaved() }
            } else {
                Button("Markeer als ongelezen", role: .destructive) { store.clearRead() }
            }
        } message: {
            Text(confirmClear == "bewaard" ? "\(store.saved.count == 1 ? "1 artikel verdwijnt" : "\(store.saved.count) artikelen verdwijnen") uit Bewaard\(savedSyncs ? ", ook op je andere toestellen" : ""). Dit kun je niet ongedaan maken." : "Bewaard blijft staan.")
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
                    Text(summary.chosen.map(Taste.label).joined(separator: ", ")).font(.subheadline).foregroundStyle(Theme.ink3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityElement(children: .combine)
            }
            if !summary.learned.isEmpty { Text("Vaak gelezen").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3) }
            ForEach(summary.learned, id: \.self) { t in
                LearnedRow(title: Taste.label(t), hint: nil, action: "Vergeet dit") {
                    withAnimation { store.forgetTopic(t) }
                }
            }
            if !summary.less.isEmpty { Text("Minder").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3) }
            ForEach(summary.less, id: \.self) { t in
                LearnedRow(title: Taste.label(t), hint: nil, action: "Ongedaan maken") {
                    withAnimation { store.restoreLess(t) }
                }
            }
            if summary.learned.isEmpty && summary.less.isEmpty {
                LearnedRow(title: "Nog niets", hint: nil, action: nil) {}
            }
        } header: {
            FormHeader("Wat Hoot van je leerde")
        } footer: {
            Text("Telt vanaf je volgende Editie.").foregroundStyle(Theme.ink3)
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
                if let hint { Text(hint).font(.subheadline).foregroundStyle(Theme.ink3) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let action {
                Button(action, action: run)
                    .font(.subheadline.weight(.semibold))
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
        Form {
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

// Een rij die de app verlaat (Instellingen-app, website): gewone tekst met ↗ rechts, zoals Apple.
struct OutboundRow: View {
    let title: String
    let systemImage: String
    var body: some View {
        HStack {
            Label { Text(title).foregroundStyle(Theme.ink) } icon: { Image(systemName: systemImage).foregroundStyle(Theme.ink3) }
            Spacer()
            Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3)
        }
    }
}
