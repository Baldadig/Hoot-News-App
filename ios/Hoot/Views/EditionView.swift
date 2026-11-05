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

// De kop van de Editie; de verversmarkering staat niet in de kop maar in de trekstrook erboven (QuietMotion).
struct EditionHeader: View {
    let title: String
    let slot: String?
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

// De eindzin van de Editie: "Je weet genoeg." of "Je bent bij." Per Editie vast (datum + dagdeel),
// van Editie tot Editie wisselend. Spiegel van shared/eindzin.mjs, getoetst in EditionEndTests met
// dezelfde gevallen (tests/fixtures/eindzin.json): FNV-1a met een murmur-slot, 32 bits.
enum EditionEnd {
    static let lines = ["Je weet genoeg.", "Je bent bij."]
    static func hash(_ s: String) -> UInt32 {
        var h: UInt32 = 0x811c9dc5
        for b in s.utf8 { h ^= UInt32(b); h = h &* 0x01000193 }
        h = (h ^ (h >> 16)) &* 0x85ebca6b
        h = (h ^ (h >> 13)) &* 0xc2b2ae35
        return h ^ (h >> 16)
    }
    static func line(date: String?, slot: String?) -> String {
        lines[Int(hash("\(date ?? "")|\(slot ?? "")") % UInt32(lines.count))]
    }
}

enum Desk {
    // Zelfde namen als DESK_NAMES in shared/editor.mjs; 'regio' vult De Redacteur uit je regionale bronnen.
    static let labels = ["binnenland": "Binnenland", "buitenland": "Buitenland", "vs": "VS", "middenoosten": "Midden-Oosten", "oekraine": "Oekraïne", "wetenschap": "Wetenschap", "tech": "Tech", "economie": "Economie", "regio": "Regio", "bubbel": "Buiten je bubbel", "extern": "Buiten je bronnen"]

    // De naam van de plek, zoals deskLabel op het web: Buiten je bubbel noemt waar het vandaan komt.
    private static let via = ["google": "Google Trends", "bluesky": "Bluesky", "wikipedia": "Wikipedia"]
    static func plek(_ e: EditionEntry) -> String? {
        // Het aantal bronnen staat in de bronregel ("5 bronnen ›"), niet nog eens in de rubriek (E6).
        if e.desk == "breed" { return "Waar iedereen over schrijft" }
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
    // De metaregel onder de Editie-titel: de datum, en alleen wat afwijkt (gelijk aan Edition.jsx).
    // Een eigen Editie zegt niets extra's: het is altijd jouw Editie.
    static func metaLine(date: String, personalLabel: Bool, personal: Bool) -> String {
        let extra: String? = personalLabel ? nil : personal ? "Om te beginnen" : "De Editie voor iedereen"
        return [date, extra ?? ""].filter { !$0.isEmpty }.joined(separator: "\u{00A0}· ")
    }
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
    @Environment(\.nachtActief) private var nacht
    @Environment(EditionAlerts.self) private var alerts
    @AppStorage("seenEdition") private var seenEdition = ""
    @AppStorage("hoot.alertOffered") private var alertOffered = false // de seintje-vraag is één keer gesteld (zodra de kaart één keer in beeld is geweest)
    @State private var alertAsk = false // de vraag staat onder de Editie
    @State private var alertYes = false // net ja gezegd: even zeggen wat er komt
    @AppStorage(KantenTip.key) private var kantenTipDone = false // de tip over meer kanten is gezien (gesloten of vergeleken)
    @State private var alertSlot = AlertOffer.standaard // het dagdeel in de kaart (keuze r5-seintje: de ochtend voorgekozen)
    @State private var printedIDs: Set<String> = []
    @State private var ruleDrawn = true
    @State private var storyShown = true
    @State private var lines = LoadLinesModel() // de laadstrepen bij het eerste laden (LoadLines.swift)
    @State private var tien = TienModel() // je eerste Editie na het welkom (FirstEditionMark.swift)
    @MainActor private static var debugTien = false // `-HootTien YES`: één keer per start
    @State private var endVisible = false // de zon onderaan is in beeld
    @State private var risenAt: Date? // sinds wanneer die zon opkomt (één keer)
    // Bij een koude start ligt de krant 8 pt lager en schuift op zijn plek terwijl het rood van het
    // opstartscherm zich sluit, met dezelfde curve: het merk landt, de krant gaat open.
    private var rising: Bool { !still && handoff?.landed == false && handoff?.leaving == false }
    // Eerste laden: nog geen verhalen, en de Editie komt eraan. Dan de laadstrepen.
    private var loaderShown: Bool {
        let empty = !EditionNumbering.rows(store.editionRows).contains { $0.desk != "bubbel" }
        return empty && (store.status == .loading || (store.status != .failed && store.edition != nil && store.shownEdition == nil))
    }
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

    @State private var path = NavigationPath()
    @State private var screen: CGSize = .zero // het scherm: staand of liggend
    @State private var contentWidth: CGFloat = 0 // de kolom binnen de marges
    @State private var leadImage: CGFloat = EditionPairs.leadMin // A: het beeld van het hoofdverhaal
    @State private var leadHeight: CGFloat = 0
    @State private var sideHeight: CGFloat = 0

    // A: de breedte van één kolom van de paren. Buiten je bubbel en het einde staan daarop, links, zodat
    // er onder de voorpagina één leeskolom met één rechterlijn is (gelijk aan src/styles/rust.css §3).
    private var pairColumn: CGFloat { contentWidth > 0 ? max(0, (contentWidth - Space.s6) / 2) : Layout.readable }

    enum Grid { case lijst, kolom, paren }
    private var grid: Grid {
        guard wide, !typeSize.isAccessibilitySize else { return .lijst }
        if let forced = DebugLaunch.grid { return forced == "paren" ? .paren : .kolom }
        return EditionPairs.paired(screen) ? .paren : .kolom
    }

    // A: het hoofdverhaal links (1,9 deel), 02 en 03 in de zijkolom rechts met een lijn ervoor. Het beeld
    // van het hoofdverhaal rekt mee tot beide even hoog zijn (EditionPairs.leadImage).
    @ViewBuilder private func front(_ rows: [EditionRowModel]) -> some View {
        let sideWidth = max(256, (contentWidth - Space.s5) / 2.9)
        HStack(alignment: .top, spacing: Space.s5) {
            slot(rows[0]) { LeadCard(item: rows[0].item, number: rows[0].number, label: rows[0].label, why: rows[0].why, outside: rows[0].outside, story: rows[0].story, imageHeight: leadImage) }
                .environment(\.isSpacious, false)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { leadHeight = $0; fitLead() }
                .frame(maxWidth: .infinity, alignment: .leading)
            if rows.count > 1 {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(rows.dropFirst().prefix(2).enumerated()), id: \.element.id) { i, row in
                        if i > 0 { Rule().padding(.vertical, Space.s2) }
                        slot(row) { ItemRow(item: row.item, number: row.number, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant, narrow: true) }
                    }
                }
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { sideHeight = $0; fitLead() }
                .padding(.leading, Space.s5)
                .overlay(alignment: .leading) { Rectangle().fill(Theme.rule).frame(width: 1).accessibilityHidden(true) }
                .frame(width: sideWidth, alignment: .leading)
            }
        }
    }

    private func fitLead() {
        guard leadHeight > 0, sideHeight > 0 else { return }
        let next = EditionPairs.leadImage(side: sideHeight, text: leadHeight - leadImage)
        if abs(next - leadImage) > 1 { leadImage = next }
    }
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
                    .font(.ui(.subheadline))
                    .foregroundStyle(Theme.ink3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Button("Ongedaan maken") { withAnimation(.snappy) { store.undoLess(row.id, items: items) } }
                    .font(.ui(.subheadline, .semibold))
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

    // Ja op de seintje-vraag: de systeemvraag, en bij ja alleen het dagdeel dat je in de kaart koos
    // (keuze r5-seintje; de andere twee zet je zelf aan in Instellingen). Daarna even zeggen wat er komt, en weg.
    private func askAlerts() {
        Task {
            let yes = await alerts.ask()
            if yes {
                store.notifySlots = AlertOffer.slots(for: alertSlot)
                store.notify = true
            }
            answerAlerts(yes)
        }
    }

    private func answerAlerts(_ yes: Bool) {
        alertOffered = true
        withAnimation(still ? nil : .easeInOut(duration: 0.3)) {
            alertAsk = false
            alertYes = yes
        }
        guard yes else { return }
        Task {
            try? await Task.sleep(for: .seconds(3))
            withAnimation(still ? nil : .easeInOut(duration: 0.3)) { alertYes = false }
        }
    }

    // De eindkaart in Nacht: het merkrood gedempt (42 % over zwart) met de zachte leesinkt, zoals
    // --endcap-bg en --endcap-on op het web. Het grootste vlak van het scherm is nooit het felste (E9).
    static let nachtEndRed = Color(red: 0x41 / 255, green: 0x15 / 255, blue: 0x0f / 255)

    // Welk placeholderbeeld een beeldloze rij krijgt, hangt af van de rij erboven (Beeldloos.swift): het
    // hoofdverhaal en de rijen eronder, en apart Buiten je bubbel.
    private var placeholderPlan: [String: Int] {
        let numbered = EditionNumbering.rows(store.editionRows)
        let rows = numbered.filter { $0.desk != "bubbel" }
        let failed = MisluktBeeld.shared.ids // een beeld dat pas bij het laden mislukt, telt ook mee
        var plan = Placeholder.plan(rows.enumerated().map { ($0.element.item, $0.offset == 0 ? BeeldloosView.Kind.lead : (wide ? .krant : .tijdlijn)) }, failed: failed)
        plan.merge(Placeholder.plan(numbered.filter { $0.desk == "bubbel" }.map { ($0.item, wide ? BeeldloosView.Kind.krant : .tijdlijn) }, failed: failed)) { a, _ in a }
        return plan
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
                    HootKop()
                    EditionHeader(title: title, slot: store.edition?.slot)
                        .tienAnchor() // je eerste Editie: het teken staat hieronder
                    if rows.isEmpty && loaderShown {
                        if tien.active {
                            Color.clear.frame(maxWidth: .infinity, minHeight: Tien.area + Space.s2)
                        } else {
                            LoadLinesBox()
                        }
                    } else if rows.isEmpty {
                        Group {
                            if store.status == .failed {
                                EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Hoot heeft nog geen Editie op dit toestel. Zodra je verbinding hebt, verschijnt hij hier.", retry: store.load)
                                    .tienError(tien)
                            } else {
                                EmptyState(title: "Er is nog geen Editie", systemImage: "newspaper", text: "In de Stroom staat alles wat er wél is.")
                                    .tienBlock(tien, 0)
                            }
                        }
                        .loadLinesError(lines)
                    } else {
                        // Eén metaregel, zoals op het web. Geen "Jouw Editie" meer (Alex, 5 november: dat is het
                        // altijd); alleen wat afwijkt staat achter de datum. De vaste spatie vóór de punt houdt
                        // die bij de datum als de regel bij grote tekst breekt ("oktober ·", niet "· Om te beginnen").
                        Text(EditionView.metaLine(date: dateLine, personalLabel: store.isPersonal, personal: store.shownEdition?.personal == true))
                            .font(.ui(.footnote)) // Schibsted 13, gelijk aan .vh__sub op het web (t1)
                            .foregroundStyle(Theme.ink3)
                            .frame(minHeight: 20, alignment: .leading) // de regel blijft 20 hoog (lh-2), zoals op het web: de kop houdt zijn ritme
                            .padding(.bottom, Space.s4)
                            .loadLinesText(lines)
                            .tienBlock(tien, 0)
                        // Kon er niet ververst worden, dan zegt dat het onder de datum: titel en datum blijven bij elkaar.
                        StaleNotice(gap: Space.s4).loadLinesText(lines).tienBlock(tien, 0)
                        // Meer kanten van één verhaal (keuze r5-kanten-welkom, gelijk aan .kantentip op het web): één
                        // keer een stille tip onder de kop, bij het eerste verhaal met meer bronnen. Geen pop-up.
                        if !tien.active, EditionLimits.hasMinimum(EditionNumbering.count(rows)), let tip = KantenTip.pick(rows.map { ($0.item, $0.story) }, done: kantenTipDone) {
                            KantenTipView(count: tip.count, compare: {
                                kantenTipDone = true
                                var s = tip.story
                                s.tappedId = tip.item.id
                                path.append(s)
                            }, close: { kantenTipDone = true })
                            .padding(.bottom, Space.s1) // het tikvlak van Vergelijk (44) geeft de rest: samen 16 tot de lijn
                            .loadLinesText(lines)
                        }
                        // Na het eerste laden landt hier het bovenste vel van de laadstrepen (LoadLines.swift).
                        StrongRule(drawn: ruleDrawn).loadLinesRule(lines).tienBlock(tien, 1).padding(.bottom, Space.s4)
                        Group {
                        if !EditionLimits.hasMinimum(EditionNumbering.count(rows)) {
                            EmptyState(title:"Nog geen Editie",systemImage:"newspaper",text:"Er is nog te weinig passend nieuws voor een Editie. In de Stroom kun je verder lezen.")
                                .tienBlock(tien, 2)
                        }
                        // Het raster (keuze 1.1.0, EditionGrid.swift). iPhone en heel grote tekst: alles onder
                        // elkaar. iPad staand (B): één leeskolom met de nummers in de kantlijn. iPad liggend
                        // (A): het hoofdverhaal met 02 en 03 ernaast, daarna paren die even hoog zijn.
                        switch grid {
                        case .paren:
                            front(rows)
                                .opacity(storyShown ? 1 : 0).offset(y: still || storyShown ? 0 : 10)
                                .tienBlock(tien, 2)
                            if rows.count > 3 {
                                EditionPairsGrid(rows: Array(rows.dropFirst(3)), width: contentWidth) { row, whySpace in
                                    slot(row) { ItemRow(item: row.item, number: row.number, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant, pinSource: true, whySpace: whySpace) }
                                }
                                .padding(.top, Space.s4)
                                .loadLinesRise(lines)
                                .tienBlock(tien, 3)
                            }
                        case .kolom:
                            slot(rows[0]) { LeadCard(item: rows[0].item, number: rows[0].number, label: rows[0].label, why: rows[0].why, outside: rows[0].outside, story: rows[0].story, hang: true) }
                                .opacity(storyShown ? 1 : 0).offset(y: still || storyShown ? 0 : 10)
                                .tienBlock(tien, 2)
                            ForEach(rows.dropFirst()) { row in
                                Rule().padding(.vertical, Space.s2).loadLinesRise(lines).tienBlock(tien, 2 + (rows.firstIndex { $0.id == row.id } ?? 0))
                                HangRow(number: store.less.contains(row.id) ? nil : row.number, read: store.isRead(row.item)) {
                                    slot(row) { ItemRow(item: row.item, label: row.label, why: row.why, outside: row.outside, story: row.story, form: .krant) }
                                }
                                .loadLinesRise(lines)
                                .tienBlock(tien, 2 + (rows.firstIndex { $0.id == row.id } ?? 0))
                            }
                        case .lijst:
                            slot(rows[0]) { LeadCard(item: rows[0].item, number: rows[0].number, label: rows[0].label, why: rows[0].why, outside: rows[0].outside, story: rows[0].story) }
                                .opacity(storyShown ? 1 : 0).offset(y: still || storyShown ? 0 : 10)
                                .tienBlock(tien, 2)
                            ForEach(rows.dropFirst()) { row in
                                // Kaart A+ (iPhone): na het hoofdverhaal komt de sterke lijn uit LeadCard; tussen de kaarten 16 boven en onder.
                                if wide || row.id != rows[1].id { Rule().padding(.vertical, Space.s2).loadLinesRise(lines).tienBlock(tien, 2 + (rows.firstIndex { $0.id == row.id } ?? 0)) }
                                slot(row) { ItemRow(item: row.item, number: row.number, label: row.label, why: row.why, outside: row.outside, story: row.story, form: wide ? .krant : .tijdlijn) }
                                    .padding(.top, !wide && row.id == rows[1].id ? Space.s2 : 0)
                                    .loadLinesRise(lines)
                                    .tienBlock(tien, 2 + (rows.firstIndex { $0.id == row.id } ?? 0))
                            }
                        }
                        if !outsideRows.isEmpty {
                            VStack(alignment: .leading, spacing: 0) {
                                StrongRule().padding(.top, Space.s5)
                                Kop("Buiten je bubbel", .title2).accessibilityAddTraits(.isHeader).padding(.vertical,Space.s3)
                                ForEach(outsideRows) { row in
                                    slot(row) { ItemRow(item:row.item,label:row.label == "Buiten je bubbel" ? nil : row.label?.replacingOccurrences(of: "^Buiten je bubbel(?: · )?", with: "", options: .regularExpression),why:row.why,outside:row.outside,story:row.story,form:wide ? .krant : .tijdlijn) }
                                }
                            }
                            .padding(.leading, grid == .kolom ? Layout.hang : 0) // op de lijn van de tekst, niet van de nummers
                            .frame(maxWidth: grid == .paren ? pairColumn : nil, alignment: .leading) // A: op de kolommaat van de paren (rust.css §3)
                            .tienBlock(tien, 8)
                        }
                        // Het einde: een merkmoment in merkrood, zoals op de website. Je bent bij,
                        // en wanneer de volgende er is.
                        if EditionLimits.hasMinimum(EditionNumbering.count(rows)) {
                        VStack(spacing: Space.s3) {
                            let count = EditionNumbering.count(rows)
                            if count > 0 {
                                Text("\(count) van \(count)").font(.lees(.body)).monospacedDigit().opacity(0.85)
                            }
                            // De zon komt hier één keer op (6 s), zodra het vlak in beeld komt, en ademt
                            // dan; in papier op merkrood. Het enige merkmoment tijdens het lezen. Met
                            // Verminder beweging staat hij al op (OnboardingArt, variant intro).
                            OnboardingArt(kind: .intro, onRed: true, active: endVisible, scale: 120 / OnboardingArt.size.width, since: risenAt)
                                .onScrollVisibilityChange(threshold: 0.5) { visible in
                                    endVisible = visible
                                    if visible && risenAt == nil { risenAt = .now }
                                }
                            Kop(EditionEnd.line(date: store.edition?.date, slot: store.edition?.slot), .title)
                            Text("Dit was de \(title)\(dateLine.isEmpty ? "" : " van \(endDate)").\(upNext)")
                                .font(.ui(.subheadline))
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: Layout.endcap) // ± 30 tekens per regel, zoals --measure-end
                            // Eén rustige link: het einde is leidend, verder lezen mag (E8). Het seintje
                            // staat niet meer in de kaart.
                            Button { openTab(.stroom) } label: {
                                Text("Lees verder in de Stroom").underline()
                            }
                            .font(.ui(.subheadline, .semibold))
                            .opacity(0.85)
                            .frame(minHeight: Space.tap)
                        }
                        .foregroundStyle(nacht ? Theme.ink : Theme.onBrandRed)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, Space.s5)
                        .padding(.vertical, Space.s7)
                        .background(nacht ? Self.nachtEndRed : Theme.brandRed, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                        .frame(maxWidth: grid == .paren ? pairColumn : Layout.readable) // op de leesbreedte, niet over de hele iPad (E9); A: de kolommaat van de paren, links
                        .padding(.leading, grid == .kolom ? Layout.hang : 0)
                        .padding(.top, Space.s6)
                        .padding(.bottom, Space.s4)
                        .tienBlock(tien, 8)
                        // De seintje-vraag komt ná het einde, als eigen kaart eronder: nooit over de rode
                        // kaart heen (keuze r5-einde-rust).
                        if alertAsk || alertYes {
                            AlertOffer(done: alertYes, slot: $alertSlot, yes: askAlerts, no: { answerAlerts(false) })
                                .frame(maxWidth: grid == .paren ? pairColumn : Layout.readable)
                                .padding(.leading, grid == .kolom ? Layout.hang : 0)
                                .padding(.bottom, Space.s6)
                                .transition(.opacity)
                        }
                        }
                        }
                        .loadLinesText(lines)
                    }
                }
                .loadLines(lines, loading: loaderShown && !tien.active, ok: !store.editionRows.isEmpty, landing: true)
                .firstEdition(tien, loading: loaderShown, failed: store.status == .failed && store.editionRows.isEmpty)
                .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { contentWidth = $0 }
                .padding(.horizontal)
                .column(grid == .paren ? Layout.wide : grid == .kolom ? Layout.readable + Layout.hang : Layout.readable)
                .offset(y: rising ? 8 : 0)
                .environment(\.placeholderPlan, placeholderPlan)
            }
            .debugJump(proxy, to: Self.slotTarget(store.editionRows), when: store.editionRows.count)
            .onGeometryChange(for: CGSize.self) { $0.size } action: { screen = $0 }
            // Wie eerst even rondkijkt: na ongeveer een derde van de editie één keer de vraag.
            .onScrollGeometryChange(for: Bool.self) { g in
                let room = g.contentSize.height - g.containerSize.height
                return room > 0 && (g.contentOffset.y + g.contentInsets.top) / room > 0.35
            } action: { _, past in
                if past, store.browsing, !nudge { withAnimation(.easeOut(duration: 0.3)) { nudge = true } }
            }
            // Het einde van de eerste Editie in beeld: één keer de vraag om een seintje, los van de eindkaart.
            .onChange(of: endVisible) { _, visible in
                guard visible, !alertAsk, EditionAlerts.offerAfterEdition(permission: alerts.permission, notify: store.notify, offered: alertOffered, browsing: store.browsing) else { return }
                alertOffered = true // gesteld zodra de kaart in beeld komt: wie niet antwoordt, ziet hem niet weer
                withAnimation(still ? nil : .easeOut(duration: 0.3)) { alertAsk = true }
            }
            .task { await alerts.refresh() }
            }
            .safeAreaInset(edge: .bottom) {
                if nudge && store.browsing {
                    MakeItYours(choose: { setup = true }, later: { withAnimation { store.browsing = false } })
                }
            }
            // De stappen van het welkom vanaf de interesses, met Annuleer op de eerste.
            .sheet(isPresented: $setup) {
                WelcomeView(start: .interesses, onCancel: { setup = false }) { store.browsing = false; setup = false }
            }
            .debugScroll()
            .background(Theme.paper)
            .navigationTitle(title) // voor VoiceOver en de terugknop; je ziet de titel in de scroll
            .navigationDestination(for: Story.self) { StoryView(story: $0) }
            .navigationDestination(for: SourceRoute.self) { SourceFeedView(id: $0.id) }
            .hootRefresh(indicator: !store.editionRows.isEmpty, label: "Editie", failed: { store.coreFailed }) { await store.load() }
            .hootKopScreen()
            .settingsButton()
            .task(id: store.shownEdition?.id) {
                guard let id = store.shownEdition?.id, EditionPrint.shouldPlay(id: id, lastSeen: seenEdition, ready: !store.editionRows.isEmpty), !printedIDs.contains(id) else { return }
                // Kwam de Editie na de laadstrepen, dan zijn die al op de kopstreep en de kop geland.
                if lines.active || tien.active { printedIDs.insert(id); seenEdition = id; return }
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
            // Je eerste Editie na het welkom: vanaf de tik (HootApp.leaveWelcome). Klaar: één keer gedaan.
            .onChange(of: store.tienStart, initial: true) { _, tap in
                guard let tap else { return }
                tien.onDone = { store.tienStart = nil }
                tien.start(at: tap, reduce: still)
            }
            .onAppear {
                if DebugLaunch.tien && !Self.debugTien { Self.debugTien = true; store.tienStart = TienModel.clock() }
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
                    if store.showsImage(lead: true), let pick = ([lead].compactMap { $0 } + items).lazy.first(where: { ImageURL.fitsHero($0.image) && $0.image != nil }) {
                        FramedImage(url: pick.pictureURL(.large), ratio: 16 / 9, measure: pick.measure).padding(.bottom, Space.s1)
                    }
                    if let lead {
                        Kop(lead.title, .title2).fixedSize(horizontal: false, vertical: true)
                    }
                    if !items.isEmpty {
                        Text(sources == items.count ? "\(sources == 1 ? "1 bron" : "\(sources) bronnen"), nieuwste eerst" : "\(sources == 1 ? "1 bron" : "\(sources) bronnen"), \(items.count) artikelen, nieuwste eerst")
                            .font(.ui(.subheadline))
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
        .onAppear { UserDefaults.standard.set(true, forKey: KantenTip.key) } // wie vergelijkt, kent het: geen tip meer
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
            Kop("Maak Hoot van jou", .title3)
            Text("Je leest nu een keuze uit gratis Nederlandse bronnen. Kies je eigen bronnen en interesses, dan wordt dit echt jouw Editie.")
                .uitleg()
                .foregroundStyle(Theme.ink2)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Space.s4) {
                // Een knop op papier is inkt, zoals in het welkom (rood is voor het merk).
                Button("Kies je bronnen", action: choose).buttonStyle(.ink)
                Button("Later", action: later)
                    .font(.ui(.subheadline, .semibold))
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

// Na de eerste Editie, één keer: een seintje als de volgende klaarligt? Een los moment onder de
// Editie, in de vorm van MakeItYours; de eindkaart houdt zijn ene link. Ja vraagt iOS om toestemming.
// Op het web is er geen seintje (web-push ligt stil).
// De eenmalige tip "Meer kanten van één verhaal" (keuze r5-kanten-welkom; gelijk aan src/lib/kanten-tip.js):
// het eerste verhaal van de Editie met meer dan één bron, zolang de tip niet gezien is.
enum KantenTip {
    static let key = "hoot.kantenTip"
    static func pick(_ rows: [(item: Item, story: Story?)], done: Bool) -> (item: Item, story: Story, count: Int)? {
        guard !done else { return nil }
        for r in rows { if let s = r.story, let n = s.sourceCount, n > 1 { return (r.item, s, n) } }
        return nil
    }
    static func line(_ count: Int) -> String { "Meer kanten van één verhaal: bij ‘\(SourceLine.label(count))’ zie je hoe elke bron het brengt." }
}

struct KantenTipView: View {
    let count: Int
    let compare: () -> Void
    let close: () -> Void
    var body: some View {
        HStack(alignment: .top, spacing: Space.s2) {
            VStack(alignment: .leading, spacing: 0) {
                Text(KantenTip.line(count)).fixedSize(horizontal: false, vertical: true)
                Button(action: compare) { Text("Vergelijk").underline() }
                    .buttonStyle(.plain)
                    .fontWeight(.semibold)
                    .frame(minHeight: Space.tap)
            }
            .font(.ui(.footnote))
            .foregroundStyle(Theme.ink2)
            Spacer(minLength: 0)
            Button(action: close) {
                Image(systemName: "xmark").font(.caption.weight(.semibold)).foregroundStyle(Theme.ink3)
                    .frame(width: Space.tap, height: Space.tap)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Tip sluiten")
            .padding(.top, -Space.s3)
            .padding(.trailing, -Space.s3)
        }
        .accessibilityElement(children: .contain)
    }
}

// De seintje-vraag onder de eindkaart (1.1.1, keuzes r5-seintje en r5-einde-rust): één dagdeel kiezen, de
// ochtend voorgekozen. Geen kloktijden, alleen de dagdelen. Een kaart in de lijst, geen zwevend blad.
struct AlertOffer: View {
    var done: Bool
    @Binding var slot: String
    var yes: () -> Void
    var no: () -> Void

    static let standaard = "ochtend"
    static let keuzes: [(id: String, label: String)] = [("ochtend", "Ochtend"), ("middag", "Middag"), ("avond", "Vroege avond")]
    // Wat "Ja, graag" aanzet: alleen het gekozen dagdeel.
    static func slots(for slot: String) -> [String] { keuzes.contains { $0.id == slot } ? [slot] : [standaard] }
    static func doneLine(_ slot: String) -> String { "Je krijgt een seintje als de \(Slots.naam(slot)) klaarligt." }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            if done {
                Label(Self.doneLine(slot), systemImage: "bell")
                    .font(.ui(.subheadline))
                    .frame(minHeight: Space.tap, alignment: .leading)
            } else {
                Kop("Een seintje als de volgende klaarligt?", .title3).fixedSize(horizontal: false, vertical: true)
                Flow {
                    ForEach(Self.keuzes, id: \.id) { k in
                        ChoiceChip(label: k.label, on: slot == k.id) { slot = k.id }
                    }
                }
                .padding(.top, Space.s1)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Wanneer")
                HStack(spacing: Space.s4) {
                    Button("Ja, graag", action: yes).buttonStyle(.ink)
                    Button("Nu niet", action: no)
                        .font(.ui(.subheadline, .semibold))
                        .foregroundStyle(Theme.ink2)
                        .frame(minHeight: Space.tap)
                }
                .padding(.top, Space.s1)
            }
        }
        .padding(Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
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
