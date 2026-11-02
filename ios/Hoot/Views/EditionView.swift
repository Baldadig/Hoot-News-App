import SwiftUI

// Editie: drie keer per dag hooguit tien genummerde verhalen. De redactionele volgorde blijft leidend;
// een optioneel bubbelverhaal staat los en ongenummerd na de gewone reeks.
struct EditionRowModel: Identifiable {
    let id: String
    let item: Item
    let story: Story?
    let label: String?
    let desk: String?
    var number: Int? = nil
    var why: String? = nil // het waarom van de plek (jouw Editie), of niets
    var outside = false // buiten de bronnen die je volgt: dat zegt de bronregel
}

// Nummer pas na de beeldvolgorde; de bubbel staat buiten de telling.
enum EditionNumbering {
    static func rows(_ rows: [EditionRowModel]) -> [EditionRowModel] {
        var n = 0
        return rows.map { row in
            var row = row
            if row.desk == "bubbel" { row.number = nil }
            else { n += 1; row.number = n }
            return row
        }
    }
    static func count(_ rows: [EditionRowModel]) -> Int { rows.compactMap(\.number).max() ?? 0 }
}

// Titel en wachtmarkering delen één normale verticale opmaak; geen overlay op de kop.
struct EditionHeader: View {
    let title: String
    let slot: String?
    var waiting = false
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .bottom, spacing: Space.s3) {
                    ScreenTitle(title, gap: 0).fixedSize()
                    Spacer(minLength: 0)
                    if let slot, EditionSun.height[slot] != nil {
                        EditionSun(slot: slot).padding(.bottom, Space.s1)
                    }
                }
                ScreenTitle(title, gap: 0).frame(maxWidth: .infinity, alignment: .leading)
            }
            if waiting {
                WaitingMark().frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.vertical, Space.s3)
            }
        }
    }
}

// De drie dagdelen van de Editie: per slot de naam (met hoofdletter, zoals Editie), wanneer de
// volgende er is en het dagdeel zelf. Geen kloktijden, alleen deze woorden.
// Spiegel van shared/slots.mjs, getoetst in SlotsTests: verander je hier een woord, dan daar ook.
enum Slots {
    struct Slot: Decodable { let naam, volgende, dagdeel: String }
    static let all: [String: Slot] = {
        guard let url = Bundle.main.url(forResource: "slots", withExtension: "json"),
              let data = try? Data(contentsOf: url), let table = try? JSONDecoder().decode([String: Slot].self, from: data) else { preconditionFailure("Dagdelen ontbreken in de bundel") }
        return table
    }()
    static func naam(_ slot: String) -> String { all[slot]?.naam ?? "Editie" }
}

enum Desk {
    // Zelfde namen als DESK_NAMES in shared/editor.mjs; 'regio' vult De Redacteur uit je regionale bronnen.
    static let labels = ["binnenland": "Binnenland", "buitenland": "Buitenland", "vs": "VS", "middenoosten": "Midden-Oosten", "oekraine": "Oekraïne", "wetenschap": "Wetenschap", "tech": "Tech", "economie": "Economie", "regio": "Regio", "bubbel": "Buiten je bubbel", "extern": "Buiten je bronnen"]

    // De naam van de plek, zoals deskLabel op het web: Buiten je bubbel noemt waar het vandaan komt.
    private static let via = ["google": "Google Trends", "bluesky": "Bluesky", "wikipedia": "Wikipedia"]
    static func plek(_ e: EditionEntry) -> String? {
        if e.desk == "breed" { return e.sourceCount.map { "Waar iedereen over schrijft · \($0) bronnen" } ?? "Waar iedereen over schrijft" }
        if e.desk == "bubbel", let terms = e.terms, !terms.isEmpty {
            var seen = Set<String>()
            let namen = terms.compactMap { $0.via.map { via[$0] ?? $0 } }.filter { seen.insert($0).inserted }
            if !namen.isEmpty { return "\(labels["bubbel"] ?? "Buiten je bubbel") · via \(namen.joined(separator: " en "))" }
        }
        return e.desk.flatMap { labels[$0] }
    }

    // Het label boven het verhaal (StoryLabel.label, gelijk aan src/lib/label.js): "interesse · onderwerp" bij
    // een sterke treffer, anders de rubriek; het waarom alleen als het iets toevoegt; "Buiten je bronnen" staat
    // in de bronregel.
    static func label(_ e: EditionEntry, item: Item, sourceCat: String?, follows: [String], followed: Bool) -> StoryLabel.Result {
        StoryLabel.label(topics: item.topics ?? [], mainTopics: item.mainTopics ?? [], follows: follows, cat: sourceCat, desk: e.desk, deskLabel: plek(e), whyCode: e.why?.code, whyText: e.why?.text, whyDetail: e.why?.detail == true, followed: followed || ["bubbel", "breed"].contains(e.desk ?? ""))
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
        let rows: [EditionRowModel] = edition.entries.filter { bubble || $0.desk != "bubbel" }.compactMap { e in
            let leadId = e.kind == "story" ? (e.leadId ?? e.id) : e.id
            guard let item = published[leadId] ?? itemsById[leadId] else { return nil }
            let story = e.kind == "story" ? storiesById[e.id] : item.storyId.flatMap { storiesById[$0] }
            let l = Desk.label(e, item: item, sourceCat: self.source(item.source)?.cat, follows: topics, followed: on.contains(item.source))
            return EditionRowModel(id: e.id, item: item, story: story, label: l.kicker ?? "Nieuws", desk: e.desk, why: l.why, outside: l.outside)
        }
        // De redactionele volgorde blijft de leesvolgorde, ook zonder groot beeld bij de opening.
        return rows
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
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.brandHandoff) private var handoff
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(EditionAlerts.self) private var alerts
    @AppStorage("seenEdition") private var seenEdition = ""
    @State private var printedIDs: Set<String> = []
    @State private var ruleDrawn = true
    @State private var storyShown = true
    @State private var endVisible = false // de zon onderaan is in beeld
    @State private var risenAt: Date? // sinds wanneer die zon opkomt (één keer)
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
        return " De volgende staat \(volgende) klaar."
    }

    @State private var refreshWaiting = false
    @State private var path = NavigationPath()
    @State private var nudge = false // "Maak Hoot van jou", na even rondkijken
    @State private var setup = false

    // Een plek in de Editie: het verhaal met meer of minder hiervan in het menu (lang drukken), of
    // ingeklapt tot één regel als je er minder van wilde.
    @ViewBuilder private func slot<Content: View>(_ row: EditionRowModel, @ViewBuilder content: () -> Content) -> some View {
        let items = [row.item] + (row.story?.itemIds ?? []).filter { $0 != row.item.id }.compactMap { store.itemsById[$0] }
        if store.less.contains(row.id) {
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                EditionNumber(number: row.number, read: store.isRead(row.item))
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
                    let numbered = EditionNumbering.rows(store.editionRows)
                    let rows = numbered.filter { $0.desk != "bubbel" }
                    let outsideRows = numbered.filter { $0.desk == "bubbel" }
                    // De schermtitel in de scroll, direct boven de metaregel (zoals .vh__sub op het web).
                    // Met een kleine, stille zon ernaast: zijn hoogte toont het dagdeel (onboarding-plan, ‘De zon
                    // in de Editie’). Laag bij de Ochtend- en Avondeditie, hoog bij de Middageditie.
                    // Past de naam er bij grote tekst niet meer naast, dan alleen de naam (nooit afgebroken).
                    EditionHeader(title: title, slot: store.edition?.slot, waiting: refreshWaiting && !rows.isEmpty)
                    if rows.isEmpty && (store.status == .loading || (store.status != .failed && store.edition != nil && store.shownEdition == nil)) {
                        WaitingMark().frame(maxWidth: .infinity, minHeight: 240)
                    } else if rows.isEmpty {
                        if store.status == .failed {
                            EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Hoot heeft nog geen Editie op dit toestel. Zodra je verbinding hebt, verschijnt hij hier.", retry: store.load)
                        } else {
                            EmptyState(title: "Er is nog geen Editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.")
                        }
                    } else {
                        // Eén metaregel, zoals op het web. De vaste spatie vóór de punt houdt die bij de
                        // datum als de regel bij grote tekst breekt ("oktober ·", niet "· Jouw Editie").
                        Text([dateLine, store.isPersonal ? "Jouw Editie" : store.shownEdition?.personal == true ? "Om te beginnen" : "De Editie voor iedereen"].filter { !$0.isEmpty }.joined(separator: "\u{00A0}· "))
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                            .padding(.bottom, Space.s4)
                        // Kon er niet ververst worden, dan zegt dat het onder de datum: titel en datum blijven bij elkaar.
                        StaleNotice(gap: Space.s4)
                        StrongRule(drawn: ruleDrawn).padding(.bottom, Space.s4)
                        if !EditionLimits.hasMinimum(EditionNumbering.count(rows)) {
                            EmptyState(title:"Nog geen Editie",systemImage:"newspaper",text:"Er is nog te weinig passend nieuws voor een Editie. In de Stroom kun je verder lezen.")
                        }
                        slot(rows[0]) { LeadCard(item: rows[0].item, number: rows[0].number, label: rows[0].label, why: rows[0].why, outside: rows[0].outside, story: rows[0].story) }
                            .opacity(storyShown ? 1 : 0).offset(y: still || storyShown ? 0 : 10)
                        if wide && !typeSize.isAccessibilitySize {
                            // Breed: de rest in twee kolommen, elk verhaal met een lijn erboven.
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.s6, alignment: .top), GridItem(.flexible(), spacing: Space.s6, alignment: .top)], alignment: .leading, spacing: Space.s2) {
                                ForEach(rows.dropFirst()) { row in
                                    VStack(alignment: .leading, spacing: 0) {
                                        Rule().padding(.vertical, Space.s2)
                                        slot(row) { ItemRow(item: row.item, number: row.number, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant, headlineLines: EditionDisplay.halfHeadlineLines) }
                                    }
                                }
                            }
                        } else {
                            ForEach(rows.dropFirst()) { row in
                                Rule().padding(.vertical, Space.s2)
                                slot(row) { ItemRow(item: row.item, number: row.number, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant) }
                            }
                        }
                        if !outsideRows.isEmpty {
                            StrongRule().padding(.top, Space.s5)
                            Text("Buiten je bubbel").font(Theme.headline(.title2)).accessibilityAddTraits(.isHeader).padding(.vertical,Space.s3)
                            ForEach(outsideRows) { row in
                                slot(row) { ItemRow(item:row.item,label:row.label == "Buiten je bubbel" ? nil : row.label?.replacingOccurrences(of: "^Buiten je bubbel(?: · )?", with: "", options: .regularExpression),why:row.why,outside:row.outside,story:row.story,form:.krant) }
                            }
                        }
                        // Het einde: een merkmoment in merkrood, zoals op de website. Je bent bij,
                        // en wanneer de volgende er is.
                        if EditionLimits.hasMinimum(EditionNumbering.count(rows)) {
                        VStack(spacing: Space.s3) {
                            let count = EditionNumbering.count(rows)
                            if count > 0 {
                                Text("\(count) van \(count)").font(.system(.body, design: .serif)).monospacedDigit().opacity(0.85)
                            }
                            // De zon komt hier één keer op (6 s), zodra het vlak in beeld komt, en ademt
                            // dan; in papier op merkrood. Het enige merkmoment tijdens het lezen. Met
                            // Verminder beweging staat hij al op (OnboardingArt, variant intro).
                            OnboardingArt(kind: .intro, onRed: true, active: endVisible, scale: 120 / OnboardingArt.size.width, since: risenAt)
                                .onScrollVisibilityChange(threshold: 0.5) { visible in
                                    endVisible = visible
                                    if visible && risenAt == nil { risenAt = .now }
                                }
                            Text("Dan ben je bij.").font(Theme.headline(.title))
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
            .hootRefresh(onWaiting: { refreshWaiting = $0 }) { await store.load() }
            .toolbar {
                // Het woordmerk, klein linksboven: je ziet waar je bent, zonder dat het de krant overneemt.
                // Hier landt het opstartscherm op.
                ToolbarItem(placement: .topBarLeading) { Wordmark(handoff: true) }
                    .sharedBackgroundVisibility(.hidden)
            }
            .settingsButton()
            .task(id: store.shownEdition?.id) {
                guard let id = store.shownEdition?.id, EditionPrint.shouldPlay(id: id, lastSeen: seenEdition, ready: !store.editionRows.isEmpty), !printedIDs.contains(id) else { return }
                while handoff?.landed == false || handoff?.leaving == true {
                    try? await Task.sleep(for: .milliseconds(50))
                    if Task.isCancelled { return }
                }
                printedIDs.insert(id)
                ruleDrawn = false; storyShown = false
                // Laat de beginstand tekenen voordat SwiftUI de eindstand animeert.
                try? await Task.sleep(for: .milliseconds(16))
                guard !Task.isCancelled else { ruleDrawn = true; storyShown = true; return }
                if still {
                    withAnimation(.easeOut(duration: 0.2)) { ruleDrawn = true; storyShown = true }
                } else {
                    withAnimation(.timingCurve(0.2,0.8,0.2,1,duration: 0.4)) { ruleDrawn = true }
                    try? await Task.sleep(for: .milliseconds(480))
                    guard !Task.isCancelled else { ruleDrawn = true; storyShown = true; return }
                    withAnimation(.timingCurve(0.2,0.7,0.2,1,duration: 0.2)) { storyShown = true }
                }
                try? await Task.sleep(for: .milliseconds(200))
                if !Task.isCancelled { seenEdition = id }
            }
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

// De kleine zon naast de naam van de Editie (miniSun in het onboarding-plan): 44 × 26, horizon op 20,
// zon r 8, alles onder de horizon geknipt. Stil; de hoogte toont het dagdeel, zonder kloktijd.
struct EditionSun: View {
    let slot: String
    static let height: [String: CGFloat] = ["ochtend": 17, "middag": 9, "avond": 21]

    var body: some View {
        Canvas { ctx, _ in
            var sky = ctx
            sky.clip(to: Path(CGRect(x: 0, y: 0, width: 44, height: 20)))
            let cy = Self.height[slot] ?? 17
            sky.fill(Path(ellipseIn: CGRect(x: 22 - 8, y: cy - 8, width: 16, height: 16)), with: .color(Theme.accent))
            ctx.stroke(Path { $0.move(to: CGPoint(x: 4, y: 20)); $0.addLine(to: CGPoint(x: 40, y: 20)) }, with: .color(Theme.ink), lineWidth: 1.5)
        }
        .frame(width: 44, height: 26)
        .accessibilityHidden(true)
    }
}
