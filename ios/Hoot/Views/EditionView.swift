import SwiftUI

// Editie: drie keer per dag tien verhalen, met een einde. Het hoofdverhaal heeft altijd een
// scherp beeld (anders schuift het eerste verhaal mét goed beeld naar voren, net als op het web).
struct EditionRowModel: Identifiable {
    let id: String
    let item: Item
    let story: Story?
    let label: String?
    let desk: String?
    var why: String? = nil // het waarom van de plek (jouw Editie), of niets
    var outside = false // buiten de bronnen die je volgt: dat zegt de bronregel
}

// De drie dagdelen van de Editie: per slot de naam (met hoofdletter, zoals Editie), wanneer de
// volgende er is en het dagdeel zelf. Geen kloktijden, alleen deze woorden.
// Spiegel van shared/slots.mjs, getoetst in SlotsTests: verander je hier een woord, dan daar ook.
enum Slots {
    static let all: [String: (naam: String, volgende: String, dagdeel: String)] = [
        "ochtend": (naam: "Ochtendeditie", volgende: "in de middag", dagdeel: "in de ochtend"),
        "middag": (naam: "Middageditie", volgende: "in de vroege avond", dagdeel: "in de middag"),
        "avond": (naam: "Avondeditie", volgende: "morgenochtend", dagdeel: "in de vroege avond"),
    ]
    static func naam(_ slot: String) -> String { all[slot]?.naam ?? "Editie" }
}

enum Desk {
    // Zelfde namen als DESK_NAMES in shared/editor.mjs; 'regio' vult De Redacteur uit je regionale bronnen.
    static let labels = ["binnenland": "Binnenland", "buitenland": "Buitenland", "vs": "VS", "middenoosten": "Midden-Oosten", "oekraine": "Oekraïne", "wetenschap": "Wetenschap", "tech": "Tech", "economie": "Economie", "regio": "Regio", "bubbel": "Buiten je bubbel", "extern": "Buiten je bronnen"]

    // Het label boven het verhaal (StoryLabel.kicker): je (sub)interesse als het verhaal die raakt, anders de
    // rubriek. "Buiten je bronnen" staat niet meer boven het verhaal maar in de bronregel (StoryLabel.outside).
    static func label(_ e: EditionEntry, item: Item, sourceCat: String?, interests: [String], picked: [String]) -> String? {
        if e.desk == "breed" { return e.sourceCount.map { "Waar iedereen over schrijft · \($0) bronnen" } ?? "Waar iedereen over schrijft" }
        if e.desk == "bubbel" { return labels["bubbel"] }
        return StoryLabel.kicker(topics: item.topics ?? [], sourceCat: sourceCat, desk: e.desk, interests: interests, picked: picked)
    }

    // Het waarom onder de rubriek (whyLine in src/components/Why.js, bouwspec §6): één korte zin, of niets
    // als het label het al zegt of niets toevoegt (zie StoryLabel.why). De algemene Editie en een Editie
    // van vóór het waarom hebben er geen.
    static func why(_ e: EditionEntry, kicker: String?) -> String? {
        StoryLabel.why(code: e.why?.code, text: e.why?.text, kicker: kicker)
    }
}

extension HootStore {
    var editionRows: [EditionRowModel] {
        #if DEBUG
        // App Store-opnamen: gekozen echte verhalen (neutraal of positief) in de gegeven volgorde.
        if !DebugLaunch.feature.isEmpty {
            return DebugLaunch.feature.compactMap { f in
                // Een los bericht (geen verhaal): dat bericht zelf.
                if storiesById[f.id] == nil, let item = itemsById[f.id] {
                    return EditionRowModel(id: item.id, item: item, story: item.storyId.flatMap { storiesById[$0] }, label: f.label, desk: nil)
                }
                // Gratis bronnen voorrang (Nederlandstalig eerst), anders het hoofdstuk van het verhaal.
                guard let story = storiesById[f.id] else { return nil }
                let all = ([story.leadId].compactMap { $0 } + story.itemIds).compactMap { itemsById[$0] }
                let free = { (i: Item) in self.source(i.source).map { $0.paid != true } ?? false }
                guard let item = all.first(where: { free($0) && self.source($0.source)?.lang == "nl" }) ?? all.first(where: free) ?? all.first else { return nil }
                return EditionRowModel(id: story.id, item: item, story: story, label: f.label, desk: nil)
            }
        }
        #endif
        guard let edition = shownEdition else { return [] }
        let published = Dictionary((edition.items ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let on = Set(followed.map(\.id))
        let picked = Rubriek.picked(from: topics, interests: interests)
        let rows: [EditionRowModel] = edition.entries.filter { bubble || $0.desk != "bubbel" }.compactMap { e in
            let leadId = e.kind == "story" ? (e.leadId ?? e.id) : e.id
            guard let item = published[leadId] ?? itemsById[leadId] else { return nil }
            let story = e.kind == "story" ? storiesById[e.id] : item.storyId.flatMap { storiesById[$0] }
            let kicker = Desk.label(e, item: item, sourceCat: self.source(item.source)?.cat, interests: interests, picked: picked)
            return EditionRowModel(id: e.id, item: item, story: story, label: kicker, desk: e.desk, why: Desk.why(e, kicker: kicker), outside: StoryLabel.outside(desk: e.desk, followed: on.contains(item.source)))
        }
        // Hoofdverhaal met scherp beeld (geen bubbel of "waar iedereen over schrijft").
        let ok: (EditionRowModel) -> Bool = { ImageURL.fitsHero($0.item.image) && !["bubbel", "breed"].contains($0.desk ?? "") }
        guard let first = rows.first, !ok(first), let i = rows.firstIndex(where: ok) else { return rows }
        var out = rows
        out.insert(out.remove(at: i), at: 0)
        return out
    }
}

// De telling van de Editie (T3): de getoonde rijen op volgorde, het hoofdverhaal is 01. Buiten je
// bubbel telt niet mee; die staat erbuiten. Zoals countEdition op het web.
enum EditionCount {
    static func numbers(_ rows: [EditionRowModel]) -> [String: Int] {
        var out: [String: Int] = [:]
        for row in rows where row.desk != "bubbel" { out[row.id] = out.count + 1 }
        return out
    }
}

struct EditionView: View {
    // `-HootScroll slot`: het voorlaatste verhaal bovenaan, zodat het einde met twee verhalen erboven in beeld staat.
    static func slotTarget(_ rows: [EditionRowModel]) -> String? {
        #if DEBUG
        if UserDefaults.standard.string(forKey: "HootScroll") == "slot", rows.count >= 2 { return rows[rows.count - 2].id }
        #endif
        return nil
    }
    @Environment(HootStore.self) private var store
    @Environment(\.openTab) private var openTab
    @Environment(\.isWide) private var wide
    @Environment(\.brandHandoff) private var handoff
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(EditionAlerts.self) private var alerts
    @State private var alertsOn = false // net "ja" gezegd op het seintje onderaan
    // Bij een koude start ligt de krant 8 pt lager en schuift op zijn plek terwijl het rood van het
    // opstartscherm zich sluit, met dezelfde curve: het merk landt, de krant gaat open.
    private var rising: Bool { !still && handoff?.landed == false && handoff?.leaving == false }
    private var title: String { store.edition?.slot.flatMap { Slots.all[$0]?.naam } ?? "Editie" }
    private var dateLine: String {
        guard let d = store.edition?.date, let date = HootDate.day(d) else { return "" }
        return date.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide))).capitalizedFirst
    }

    // De datum in de eindzin: klein, met een vaste spatie tussen dag en maand ("31\u{00A0}oktober"),
    // zodat het getal nooit alleen aan het einde van een regel blijft staan. Alleen hier; de
    // metaregel bovenaan houdt zijn gewone spatie.
    private var endDate: String {
        var d = dateLine.lowercased()
        if let last = d.range(of: " ", options: .backwards) { d.replaceSubrange(last, with: "\u{00A0}") }
        return d
    }

    // Wanneer de volgende er is, in dagdelen uit Slots: geen kloktijden.
    private var upNext: String {
        guard let volgende = store.edition?.slot.flatMap({ Slots.all[$0]?.volgende }) else { return "" }
        // Vaste spatie in "je klaar.": de zin eindigt nooit met één woord alleen op de laatste regel.
        return " De volgende staat \(volgende) voor je\u{00A0}klaar."
    }

    @State private var path = NavigationPath()
    @State private var nudge = false // "Maak Hoot van jou", na even rondkijken
    @State private var setup = false

    // Een plek in de Editie: het verhaal met meer of minder hiervan in het menu (lang drukken), of
    // ingeklapt tot één regel als je er minder van wilde.
    @ViewBuilder private func slot<Content: View>(_ row: EditionRowModel, @ViewBuilder content: () -> Content) -> some View {
        let items = [row.item] + (row.story?.itemIds ?? []).filter { $0 != row.item.id }.compactMap { store.itemsById[$0] }
        if store.less.contains(row.id) {
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Text("Je ziet minder over \(Taste.about(items)).")
                    .font(.subheadline)
                    .foregroundStyle(Theme.ink3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Button("Ongedaan maken") { withAnimation(.snappy) { store.undoLess(row.id, items: items) } }
                    .font(.subheadline.weight(.semibold))
                    .tint(Theme.ink) // bediening: inkt, geen rood
                    .frame(minHeight: Space.tap)
            }
            .transition(.opacity)
        } else {
            content()
                .environment(\.tasteVote) { up in
                    withAnimation(.snappy) { store.vote(row.id, items: items, up: up) }
                    UIAccessibility.post(notification: .announcement, argument: up ? "Je ziet meer over \(Taste.about(items))" : "Je ziet minder over \(Taste.about(items))")
                }
        }
    }

    // Een rustig tweede instappunt voor het seintje (het eerste staat in Instellingen): alleen zolang
    // iOS nog niet weet of je meldingen wilt. Na ja of nee verdwijnt het vanzelf; na een ja zegt het
    // nog even wanneer.
    @ViewBuilder private var alertOffer: some View {
        if alertsOn {
            Label("Je krijgt een seintje als de volgende klaarligt.", systemImage: "bell")
                .font(.subheadline)
                .frame(minHeight: Space.tap)
                .transition(.opacity)
        } else if alerts.permission == .notDetermined && !store.notify {
            Button {
                Task {
                    guard await alerts.ask() else { return }
                    store.notifySlots = EditionAlerts.slots.map(\.id)
                    withAnimation(.easeInOut(duration: 0.3)) { store.notify = true; alertsOn = true }
                }
            } label: {
                Label { Text("Seintje als hij klaarligt?").underline() } icon: { Image(systemName: "bell") }
            }
            .font(.subheadline.weight(.semibold))
            .frame(minHeight: Space.tap)
            .transition(.opacity)
        }
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    let rows = store.editionRows
                    let numbers = EditionCount.numbers(rows)
                    // De schermtitel in de scroll, direct boven de metaregel (zoals .vh__sub op het web).
                    ScreenTitle(title, gap: 0)
                    if store.status == .loading && rows.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    } else if rows.isEmpty {
                        if store.status == .failed {
                            EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Hoot heeft nog geen Editie op dit toestel. Zodra je verbinding hebt, verschijnt hij hier.", retry: store.load)
                        } else {
                            EmptyState(title: "Er is nog geen Editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.")
                        }
                    } else {
                        // Eén metaregel, zoals op het web. De vaste spatie vóór de punt houdt die bij de
                        // datum als de regel bij grote tekst breekt ("oktober ·", niet "· Jouw Editie").
                        Text([dateLine, store.isPersonal ? "Jouw Editie" : "De Editie voor iedereen"].filter { !$0.isEmpty }.joined(separator: "\u{00A0}· "))
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                            .padding(.bottom, Space.s4)
                        // Kon er niet ververst worden, dan zegt dat het onder de datum: titel en datum blijven bij elkaar.
                        StaleNotice(gap: Space.s4)
                        slot(rows[0]) { LeadCard(item: rows[0].item, label: rows[0].label, why: rows[0].why, outside: rows[0].outside, story: rows[0].story, number: numbers[rows[0].id]) }
                        if wide {
                            // Breed: de rest in twee kolommen, elk verhaal met een lijn erboven.
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.s6, alignment: .top), GridItem(.flexible(), spacing: Space.s6, alignment: .top)], alignment: .leading, spacing: Space.s2) {
                                ForEach(rows.dropFirst()) { row in
                                    VStack(alignment: .leading, spacing: 0) {
                                        Rule().padding(.vertical, Space.s2)
                                        slot(row) { ItemRow(item: row.item, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant, number: numbers[row.id]) }
                                    }
                                }
                            }
                        } else {
                            ForEach(rows.dropFirst()) { row in
                                Rule().padding(.vertical, Space.s2)
                                slot(row) { ItemRow(item: row.item, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant, number: numbers[row.id]) }
                            }
                        }
                        // Het einde: een merkmoment in merkrood, zoals op de website. Je bent bij,
                        // en wanneer de volgende er is.
                        VStack(spacing: Space.s3) {
                            // De telling rond: "10 van 10", stil boven het merk (geen beweging, geen trilling).
                            if !numbers.isEmpty {
                                Text("\(numbers.count) van \(numbers.count)")
                                    .font(.system(.body, design: .serif).monospacedDigit())
                                    .opacity(0.85)
                            }
                            // Het teken "h." als tekening, 44 hoog; op merkrood alles papier, ook de punt.
                            // Tot "Je bent bij." 16, zoals op het web.
                            BrandMark(height: 44, ink: Theme.onBrandRed, dot: Theme.onBrandRed)
                                .padding(.bottom, Space.s4 - Space.s3)
                            Text("Je bent bij.").font(Theme.headline(.title))
                            Text("Dit was de \(title)\(dateLine.isEmpty ? "" : " van \(endDate)").\(upNext)")
                                .font(.subheadline)
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: Layout.endcap) // ± 30 tekens per regel, zoals --measure-end
                            // De links direct onder elkaar: hun aanraakvlak (44 pt) is de ruimte ertussen,
                            // zodat tekst, seintje en Stroom op gelijke afstand staan.
                            VStack(spacing: 0) {
                                alertOffer
                                // Het einde is leidend; verder lezen mag, als rustige link in plaats van een knop.
                                Button { openTab(.stroom) } label: {
                                    Text("Of lees verder in de Stroom").underline()
                                }
                                .font(.subheadline.weight(.semibold))
                                .opacity(0.85)
                                .frame(minHeight: Space.tap)
                            }
                            .animation(still ? nil : .easeInOut(duration: 0.3), value: alerts.permission) // na een nee: rustig weg
                        }
                        .foregroundStyle(Theme.onBrandRed)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, Space.s5)
                        .padding(.vertical, Space.s7)
                        .background(Theme.brandRed, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                        .padding(.top, Space.s6)
                        .padding(.bottom, Space.s4)
                    }
                }
                .padding(.horizontal)
                .column(wide ? Layout.wide : Layout.readable)
                .offset(y: rising ? 8 : 0)
            }
            .debugJump(proxy, to: Self.slotTarget(store.editionRows), when: store.editionRows.count)
            // Wie eerst even rondkijkt: na ongeveer een derde van de editie één keer de vraag.
            .onScrollGeometryChange(for: Bool.self) { g in
                let room = g.contentSize.height - g.containerSize.height
                return room > 0 && (g.contentOffset.y + g.contentInsets.top) / room > 0.35
            } action: { _, past in
                if past, store.browsing, !nudge { withAnimation(.easeOut(duration: 0.3)) { nudge = true } }
            }
            }
            .safeAreaInset(edge: .bottom) {
                if nudge && store.browsing { MakeItYours(choose: { setup = true }, later: { withAnimation { store.browsing = false } }) }
            }
            // De stappen van het welkom vanaf de interesses, met Annuleer op de eerste.
            .sheet(isPresented: $setup) {
                WelcomeView(start: .interesses, onCancel: { setup = false }) { store.browsing = false; setup = false }
            }
            .debugScroll()
            .background(Theme.paper)
            .navigationTitle(title) // voor VoiceOver en de terugknop; je ziet de titel in de scroll
            .hootScreenTitle() // het verhaal wint van de schermtitel (C7)
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .refreshable { await store.load() }
            .toolbar {
                // Het woordmerk, klein linksboven: je ziet waar je bent, zonder dat het de krant overneemt.
                // Hier landt het opstartscherm op.
                ToolbarItem(placement: .topBarLeading) { Wordmark(handoff: true) }
                    .sharedBackgroundVisibility(.hidden)
            }
            .settingsButton()
            .task(id: store.editionRows.count) {
                // `-HootScreen verhaal`: het eerste verhaal met de meeste bronnen, om te vergelijken.
                if DebugLaunch.screen("verhaal"), path.isEmpty, let story = store.editionRows.compactMap(\.story).max(by: { ($0.sourceCount ?? 1) < ($1.sourceCount ?? 1) }) { path.append(story) }
            }
        }
    }
}

// Een verhaal: alle publicaties, nieuwste eerst — vergelijken hoe bronnen het brengen.
struct StoryView: View {
    @Environment(HootStore.self) private var store
    let story: Story
    @State private var items: [Item] = []

    // De kop: het stuk waarop je tikte; zit dat niet (meer) in de bundel, dan het hoofdbericht.
    private var lead: Item? {
        items.first(where: { $0.id == story.tappedId }) ?? items.first(where: { $0.id == story.leadId }) ?? items.first
    }

    var body: some View {
        let sources = Set(items.map(\.source)).count
        List {
            // Waar het over gaat (de kop van het hoofdbericht), en eerlijk geteld: bronnen zijn
            // uitgevers, niet artikelen; drie stukken van één krant zijn geen drie bevestigingen.
            Section {
                VStack(alignment: .leading, spacing: Space.s2) {
                    // Een beeld bij het verhaal: dat van het hoofdbericht, of anders het eerste scherpe.
                    if store.showsImage(lead: true), let image = ([lead].compactMap { $0 } + items).lazy.compactMap(\.image).first(where: { ImageURL.fitsHero($0) }) {
                        FramedImage(url: ImageURL.url(image, .large), ratio: 16 / 9).padding(.bottom, Space.s1)
                    }
                    if let lead {
                        Text(lead.title).font(Theme.headline(.title2)).fixedSize(horizontal: false, vertical: true)
                    }
                    if !items.isEmpty {
                        Text(sources == items.count ? "\(sources == 1 ? "1 bron" : "\(sources) bronnen"), nieuwste eerst" : "\(sources == 1 ? "1 bron" : "\(sources) bronnen"), \(items.count) artikelen, nieuwste eerst")
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                    }
                }
            }
            .listRowBackground(Color.clear)
            .contentShape(Rectangle())
            .opensArticle(lead)
            // Het hoofdbericht staat al bovenaan (tik op de kop): niet nog eens in de lijst.
            ForEach(items.filter { $0.id != lead?.id }) { item in
                // In een lijst maakt een link in de rij de hele rij tot link: hier geen bronlink.
                ItemRow(item: item, label: label(item), linkSource: false, form: .krant)
                    .listRowBackground(Theme.surface)
            }
        }
        .scrollContentBackground(.hidden)
        .contentMargins(.horizontal, 0, for: .scrollContent)
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .navigationTitle("Vergelijken")
        .navigationBarTitleDisplayMode(.inline)
        // Het verhaal delen = het stuk bovenaan delen, met de link van zijn uitgever.
        .toolbar {
            if let lead, let link = lead.link {
                ToolbarItem(placement: .primaryAction) { ShareItemLink(item: lead, link: link) }
            }
        }
        .task { items = await store.storyItems(story) }
    }

    // Wie het eerst had, en wat uit een bron komt die je niet volgt.
    private func label(_ item: Item) -> String? {
        let first = items.count > 1 && item.id == items.last?.id ? "Eerste bericht" : nil
        let outside = store.isOn(store.source(item.source) ?? Source(id: item.source, name: "")) ? nil : "Buiten je bronnen"
        let parts = [first, outside].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
}

// Na even rondkijken: de uitnodiging om Hoot van jezelf te maken. Zweeft onderaan (net als
// "Ongedaan maken" in Bewaard), één keer; "Later" is ook een antwoord.
struct MakeItYours: View {
    var choose: () -> Void
    var later: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Text("Maak Hoot van jou").font(Theme.headline(.title3))
            Text("Je leest nu een keuze uit gratis Nederlandse bronnen. Kies je eigen bronnen en interesses, dan wordt dit echt jouw Editie.")
                .font(.subheadline)
                .foregroundStyle(Theme.ink2)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Space.s4) {
                // Een knop op papier is inkt, zoals in het welkom (rood is voor het merk).
                Button("Kies je bronnen", action: choose).buttonStyle(.ink)
                Button("Later", action: later)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.ink2)
                    .frame(minHeight: Space.tap)
            }
            .padding(.top, Space.s1)
        }
        .padding(Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 2) // zweeft, zoals de melding in Bewaard
        .padding(.horizontal)
        .padding(.bottom, Space.s2)
        .column()
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .accessibilityElement(children: .contain)
    }
}
