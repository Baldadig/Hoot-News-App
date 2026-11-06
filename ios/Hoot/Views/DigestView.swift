import SwiftUI

// Selectie: elke maandagochtend per onderwerp de drie belangrijkste stukken van de week ervoor,
// door mensen geschreven. Opbouw als de inhoudsopgave van een krant (Selectie-index B, gelijk aan
// Vak.jsx): de week, wat je te lezen krijgt, de inhoud als lijst met één rijvorm, en per onderwerp
// het eerste stuk groot, twee kaarten en "Ook deze week". Lege onderwerpen staan onderaan.
struct DigestView: View {
    @Environment(HootStore.self) private var store
    private static var fields: [DigestFieldsList.Field] { DigestFieldsList.fields }
    @State private var lines = LoadLinesModel() // de laadstrepen bij het eerste laden (LoadLines.swift)
    @State private var choosing = false
    @State private var folding = SelectionFoldState()
    @State private var flash: String?
    @AccessibilityFocusState private var focusedField: String?
    @FocusState private var keyboardField: String?
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var still
    private var owner: String { store.account?.uid ?? "anon" }
    private var preferencesReady: Bool {
        guard let account = store.account else { return UserDefaults.standard.string(forKey: "hoot.owner") == nil }
        guard let uid = account.uid else { return true }
        // Het eigenaarrecord zelf is geen Observable; de sync-overgangen leveren de nieuwe lezing.
        _ = account.sync
        return UserDefaults.standard.string(forKey: "hoot.owner") == uid
    }
    private var chosen: [DigestField] {
        let offered = Dictionary((store.digest?.fields ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return Self.fields.filter { store.digestFields.contains($0.id) }.map { f in
            offered[f.id] ?? DigestField(id: f.id, label: f.label, top: [], more: [])
        }
    }
    private var overview: SelectionOverview { SelectionOverview(chosen, offered: Set((store.digest?.fields ?? []).map(\.id))) }
    private var closed: Set<String> { folding.closed(for: owner, selected: store.digestFields) }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HootKop()
                    ScreenTitle("Selectie") // de schermtitel in de scroll (C7)
                    let o = overview
                    if store.digestFields.isEmpty {
                        empty(title: "Kies je onderwerpen", text: SelectionOverview.choose, row: "Kies onderwerpen", sub: "Nog niets gekozen")
                        voorproef(SelectionOverview.voorproefje(store.digest))
                    } else if let d = store.digest {
                        Group {
                        if o.state == .empty {
                            empty(title: "Nog niets voor \(o.names)", text: o.unoffered ? SelectionOverview.noSources : SelectionOverview.emptyField, row: "Kies onderwerpen", sub: "\(store.digestFields.count) gekozen")
                        } else {
                            header(d, o)
                            index(proxy, o)
                            ForEach(o.fields) { field in
                                FieldSection(field: field, expanded: !closed.contains(field.id), flash: flash == field.id, focus: $focusedField, keyboardFocus: $keyboardField, enabled: preferencesReady) {
                                    var next = closed
                                    if !next.insert(field.id).inserted { next.remove(field.id) }
                                    folding.set(next, for: owner, selected: store.digestFields)
                                }
                                .id(field.id)
                            }
                        }
                        let seen = o.fields.reduce(0) { $0 + ($1.count ?? 0) }
                        if seen > 0 { how(seen) }
                        }
                        .loadLinesText(lines)
                    } else if store.digestStatus == .failed {
                        EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Zodra je verbinding hebt, verschijnt de Selectie hier.", retry: { await store.loadDigest(force: true) })
                            .loadLinesError(lines)
                    } else {
                        LoadLinesBox()
                    }
                }
                .loadLines(lines, loading: !store.digestFields.isEmpty && store.digest == nil && store.digestStatus != .failed, ok: store.digest != nil)
                .padding(.horizontal)
                .column(Layout.wide * 0.85)
            }
            .debugJump(proxy, to: DebugLaunch.anchor == .bottom ? "einde" : overview.fields.isEmpty ? nil : overview.fields[overview.fields.count / 2].id, when: overview.fields.count)
            }
            .onChange(of: owner, initial: true) { _, reader in
                focusedField = nil; keyboardField = nil
                folding.activate(reader, selected: store.digestFields, persist: preferencesReady)
            }
            .onChange(of: store.digestFields) { _, selected in folding.activate(owner, selected: selected, persist: preferencesReady) }
            .onChange(of: preferencesReady) { _, ready in
                if ready { folding.activate(owner, selected: store.digestFields) }
            }
            .background(Theme.paper)
            .navigationTitle("Selectie")
            .hootKopScreen()
            .krantVerhaal()
            .settingsButton()
            .hootRefresh(indicator: store.digest != nil, label: "Selectie", failed: { store.digestRefreshFailed || store.digestStatus == .failed }) { await store.loadDigest(force: true) }
            .sheet(isPresented: $choosing) {
                NavigationStack {
                    DigestFieldsList()
                        .navigationTitle("Onderwerpen")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Klaar") { choosing = false } } }
                }
                .debugAppearance()
            }
            .task { await store.loadDigest() }
        }
    }

    // De inhoud: elk onderwerp een rij (tik en je springt ernaartoe), de laatste rij om te kiezen.
    private func index(_ proxy: ScrollViewProxy, _ o: SelectionOverview) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Rule()
            ForEach(o.fields) { field in
                Button { jump(field.id, proxy) } label: {
                    SelectionRow(name: field.label, sub: SelectionOverview.pieces(field.top.count), kind: .jump)
                }
                .buttonStyle(.plain)
                .disabled(!preferencesReady)
                .accessibilityHint("Spring naar dit onderwerp")
                .accessibilityIdentifier("selectie-jump-" + field.id)
                Rule()
            }
            pickRow(name: "Onderwerpen", sub: "\(store.digestFields.count) gekozen")
            Rule()
        }
        .padding(.top, Space.s5)
        .padding(.bottom, Space.s2)
    }

    private func pickRow(name: String, sub: String) -> some View {
        Button { choosing = true } label: { SelectionRow(name: name, sub: sub, kind: .pick) }
            .buttonStyle(.plain)
            .disabled(!preferencesReady)
            .accessibilityIdentifier("selectie-kies")
    }

    private func jump(_ id: String, _ proxy: ScrollViewProxy) {
        folding.set(closed.subtracting([id]), for: owner, selected: store.digestFields)
        Task { @MainActor in
            await Task.yield()
            guard store.digestFields.contains(id) else { return }
            if still { proxy.scrollTo(id, anchor: .top) } else { withAnimation(.easeInOut(duration: 0.3)) { proxy.scrollTo(id, anchor: .top) } }
            focusedField = id
            keyboardField = id
            // Na het springen licht het onderwerp even op, behalve bij Verminder beweging.
            guard !still else { return }
            flash = id
            try? await Task.sleep(for: .milliseconds(1200))
            if flash == id { withAnimation(.easeOut(duration: 0.4)) { flash = nil } }
        }
    }

    // Een lege Selectie: links in de kolom een kop, één zin en één rij om te kiezen. Geen datum,
    // geen telling ("0 stukken in 0 onderwerpen" komt niet meer voor).
    private func empty(title: String, text: String, row: String, sub: String) -> some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Kop(title, .title2).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(text).uitleg().foregroundStyle(Theme.ink2).fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 0) { Rule(); pickRow(name: row, sub: sub); Rule() }
                .padding(.top, Space.s2)
        }
        .padding(.top, Space.s5)
    }

    // Een voorproefje onder "Kies onderwerpen" (keuze r5-selectie-onderwerpen, gelijk aan .dproef op het web):
    // uit de Selectie van deze week per domein één onderwerp met zijn beste stuk, hooguit drie. Echte stukken.
    @ViewBuilder private func voorproef(_ proef: [(id: String, label: String, item: DigestItem)]) -> some View {
        if !proef.isEmpty {
            VStack(alignment: .leading, spacing: Space.s3) {
                VStack(alignment: .leading, spacing: Space.s2) {
                    Text(typeSize.isAccessibilitySize ? "Voorproefje" : "VOORPROEFJE")
                        .font(.ui(.caption, .heavy)).tracking(typeSize.isAccessibilitySize ? 0 : 0.6)
                        .foregroundStyle(Theme.ink)
                        .accessibilityAddTraits(.isHeader)
                    Rectangle().fill(Theme.ink).frame(height: 2).accessibilityHidden(true)
                }
                Text(SelectionOverview.voorproef).font(.ui(.subheadline)).foregroundStyle(Theme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                ForEach(proef, id: \.id) { p in
                    VStack(alignment: .leading, spacing: Space.s2) {
                        Text(p.label).font(.ui(.caption, .semibold)).foregroundStyle(Theme.ink3)
                        DigestCard(item: p.item, rank: 1, feature: false)
                    }
                    .padding(.top, Space.s2)
                }
            }
            .padding(.top, Space.s7)
            .padding(.bottom, Space.s6)
        }
    }

    private func how(_ seen: Int) -> some View {
        DisclosureGroup("Hoe kiest Hoot deze stukken?") {
            VStack(alignment: .leading, spacing: Space.s2) {
                ForEach(Self.howHootChooses(seen), id: \.self) { Text($0) }
            }
            .font(.ui(.subheadline))
            .foregroundStyle(Theme.ink3)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, Space.s2)
        }
        .font(.ui(.subheadline, .semibold))
        .tint(Theme.ink)
        .padding(.vertical, Space.s6)
        .id("einde")
    }

    private func header(_ d: Digest, _ o: SelectionOverview) -> some View {
        VStack(alignment: .leading, spacing: Space.s1) {
            // De week is een datum: ink3, geen rood (SE6). Bij heel grote tekst geen kapitalen.
            let week = d.preview == true ? "Voorproefje · de afgelopen zeven dagen" : "Week \(d.week ?? 0) · \(Self.span(d.from, d.to))"
            Text(typeSize.isAccessibilitySize ? week : week.uppercased())
                .font(typeSize.isAccessibilitySize ? .ui(.caption, .semibold) : .ui(.caption, .heavy)).tracking(typeSize.isAccessibilitySize ? 0 : 0.6)
                .foregroundStyle(Theme.ink3)
                .fixedSize(horizontal: false, vertical: true)
            Kop(o.summary, .title2)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            if d.preview == true, let next = d.next.flatMap(HootDate.parse) {
                Text("De eerste volle Selectie komt \(next.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide)))) in de ochtend.")
                    .font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
            } else {
                Text("Elke maandagochtend een nieuwe.").font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
            }
        }
        .padding(.top, Space.s2)
    }

    // Hoe kiest Hoot deze stukken? Tekst 1 · Kort, woord voor woord gelijk aan Vak.jsx (tests/selectie-index.test.mjs).
    static func howHootChooses(_ n: Int) -> [String] {
        ["Deze week las Hoot \(n) stukken van kenners en vakbladen over je onderwerpen. Per onderwerp blijven er drie over: waar anderen ook over schrijven, wat een redactie uitkoos, of wat een kenner schreef.",
         "Niets gesponsord. De intro is van de schrijver zelf."]
    }

    // "2 t/m 8 november", en over een maandgrens "26 oktober t/m 1 november" (zoals op de website).
    static func span(_ from: String?, _ to: String?) -> String {
        guard let a = from.flatMap(HootDate.parse), let b = to.flatMap(HootDate.parse)?.addingTimeInterval(-8 * 3600) else { return "" }
        let month = HootDate.style(.dateTime.month(.wide))
        let first = a.formatted(month) == b.formatted(month) ? HootDate.style(.dateTime.day()) : HootDate.style(.dateTime.day().month(.wide))
        return "\(a.formatted(first)) t/m \(b.formatted(HootDate.style(.dateTime.day().month(.wide))))"
    }
}

// Wat de Selectie toont; gelijk aan selectionOverview in src/lib/selection-index.js.
struct SelectionOverview {
    enum State { case empty, full }
    let state: State
    let fields: [DigestField] // eerst de onderwerpen met stukken, de lege onderaan
    let live: [DigestField]
    let names: String
    let unoffered: Bool
    init(_ chosen: [DigestField], offered: Set<String>) {
        live = chosen.filter { !$0.top.isEmpty }
        fields = live + chosen.filter { $0.top.isEmpty }
        state = live.isEmpty ? .empty : .full
        names = Self.join(chosen.map(\.label))
        unoffered = chosen.allSatisfy { !offered.contains($0.id) }
    }
    var picked: Int { live.reduce(0) { $0 + $1.top.count } }
    var summary: String { "\(Self.pieces(picked)) in \(live.count == 1 ? "1 onderwerp" : "\(live.count) onderwerpen")" }
    static func pieces(_ n: Int) -> String { n == 0 ? "Nog geen stukken" : n == 1 ? "1 stuk" : "\(n) stukken" }
    static func join(_ names: [String]) -> String { names.count < 2 ? names.joined() : names.dropLast().joined(separator: ", ") + " en " + names.last! }
    static let emptyField = "Deze week sprong er niets uit. Maandag kijkt Hoot opnieuw."
    static let noSources = "Hoot heeft hier nog te weinig goede bronnen voor. Kies er een onderwerp bij, dan lees je maandag meer."
    static let choose = "Voor je werk of uit interesse: elke maandag per onderwerp de drie beste stukken van de week."
    // Het voorproefje bij een lege Selectie (gelijk aan voorproefje() in src/lib/selection-index.js): per domein
    // (de vaste volgorde van shared/vak.mjs) het eerste onderwerp met stukken, hooguit `max`, met zijn beste stuk.
    static let voorproef = "Zo ziet het eruit: per onderwerp de beste stukken van de week."
    static func voorproefje(_ digest: Digest?, max: Int = 3) -> [(id: String, label: String, item: DigestItem)] {
        let byId = Dictionary((digest?.fields ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        var out: [(id: String, label: String, item: DigestItem)] = []
        for d in DigestFieldsList.domains {
            if let f = d.fields.lazy.compactMap({ byId[$0.id] }).first(where: { !$0.top.isEmpty }), let top = f.top.first {
                out.append((f.id, f.label, top))
            }
            if out.count >= max { break }
        }
        return out
    }
}

// Eén rijvorm voor springen, kiezen en in- of uitklappen (SE2): de naam, het aantal eronder, en rechts
// een stil teken op de eerste regel van de naam (SE3), ook bij grote tekst. `big`: de kop van een
// onderwerp, in de krantenletter, dezelfde rij.
struct SelectionRow: View {
    enum Kind { case jump, pick, toggle(expanded: Bool) }
    let name: String
    let sub: String?
    let kind: Kind
    var big = false
    private var symbol: String {
        switch kind {
        case .jump: "arrow.down"
        case .pick: "chevron.right"
        case let .toggle(expanded): expanded ? "chevron.up" : "chevron.down"
        }
    }
    var body: some View {
        HStack(alignment: big ? .firstTextBaseline : .center, spacing: Space.s3) {
            VStack(alignment: .leading, spacing: big ? Space.s1 : 0) {
                Group {
                    if big { Kop(name, .title2) } else { Text(name).font(.ui(.body, .semibold)) } // de grote naam via Kop: bij AX5 breekt hij met een streepje
                }
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                if let sub { Text(sub).font(.ui(.caption)).monospacedDigit().foregroundStyle(Theme.hint).fixedSize(horizontal: false, vertical: true) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(Image(systemName: symbol))
                .font(big ? Theme.headline(.title2) : .body)
                .imageScale(.small)
                .foregroundStyle(Theme.ink3)
                .accessibilityHidden(true)
        }
        .padding(.vertical, big ? Space.s3 : Space.s2)
        .frame(minHeight: 56)
        .contentShape(Rectangle())
    }
}

struct FieldSection: View {
    @Environment(\.isWide) private var wide
    let field: DigestField
    let expanded: Bool
    var flash = false
    var focus: AccessibilityFocusState<String?>.Binding
    var keyboardFocus: FocusState<String?>.Binding
    var enabled = true
    let toggle: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Button(action: toggle) {
                SelectionRow(name: field.label, sub: SelectionOverview.pieces(field.top.count), kind: .toggle(expanded: expanded), big: true)
                    .background(flash ? Theme.ink.opacity(0.06) : .clear)
            }
            .buttonStyle(.plain)
            .disabled(!enabled)
            .accessibilityLabel("\(field.label), \(SelectionOverview.pieces(field.top.count))")
            .accessibilityValue(expanded ? "Uitgeklapt" : "Ingeklapt")
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier("selectie-heading-" + field.id)
            .accessibilityFocused(focus, equals: field.id)
            .focused(keyboardFocus, equals: field.id)
            .overlay(alignment: .top) { Rectangle().fill(Theme.ink).frame(height: 2).accessibilityHidden(true) }
            if expanded, !field.top.isEmpty, let about = field.about {
                Text(about).font(.ui(.subheadline)).foregroundStyle(Theme.ink3).fixedSize(horizontal: false, vertical: true)
            }
            if expanded {
                if let first = field.top.first {
                    DigestCard(item: first, rank: 1, feature: true)
                    let rest = Array(field.top.dropFirst().enumerated())
                    if wide {
                        HStack(alignment: .top, spacing: Space.s3) {
                            ForEach(rest, id: \.element.id) { i, item in DigestCard(item: item, rank: i + 2, feature: false).frame(maxHeight: .infinity, alignment: .top) }
                        }
                    } else {
                        ForEach(rest, id: \.element.id) { i, item in DigestCard(item: item, rank: i + 2, feature: false) }
                    }
                } else {
                    Text(SelectionOverview.emptyField).font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                }
                if !field.more.isEmpty {
                    Text("OOK DEZE WEEK").font(.ui(.caption, .heavy)).tracking(0.6).foregroundStyle(Theme.ink3).padding(.top, Space.s2)
                    ForEach(field.more) { item in
                        VStack(alignment: .leading, spacing: Space.s0) {
                            Kop(item.title, .headline).foregroundStyle(Theme.ink)
                            Text("\(item.sourceName ?? "") · \(HootDate.ago(item.publishedAt.flatMap(HootDate.parse)))").font(.ui(.caption)).foregroundStyle(Theme.hint)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, Space.s2)
                        .contentShape(Rectangle())
                        .opensArticle(item.asItem)
                        Rule()
                    }
                }
            }
        }
        .padding(.top, Space.s6)
    }

}

private struct DigestCard: View {
    @Environment(HootStore.self) private var store
    let item: DigestItem

    static func alsoLine(_ also: [DigestAlso]) -> AttributedString {
        var line = AttributedString("Ook bij ")
        for (i, a) in also.enumerated() {
            if i > 0 { line += AttributedString(", ") }
            var name = AttributedString(a.sourceName)
            if let u = URL(string: a.url), Reader.canShow(u) { name.link = u }
            name.inlinePresentationIntent = .stronglyEmphasized
            line += name
        }
        return line
    }
    let rank: Int
    let feature: Bool
    var body: some View {
        let showImage = store.showsImage(lead: feature) && (feature ? ImageURL.fitsHero(item.image) : ImageURL.fitsLarge(item.image))
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: Space.s2) {
                if showImage {
                    FramedImage(url: ImageURL.url(item.image, .large), ratio: feature ? 16 / 9 : 2)
                }
                VStack(alignment: .leading, spacing: Space.s2) {
                    Text(String(format: "%02d", rank)).font(Theme.headline(.headline)).monospacedDigit().foregroundStyle(Theme.ink) // tabelcijfers: 01, 02, 03 even breed; in inkt, zoals het cijfer in de Editie
                    Kop(item.title, feature ? .title2 : .title3)
                        .foregroundStyle(store.isRead(item.asItem) ? Theme.ink3 : Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    // Waarom dit stuk: rustige metadata onder de kop, zodat de kop voorgaat.
                    if let why = item.why, !why.isEmpty { Text(why.joined(separator: " · ")).font(.ui(.caption)).foregroundStyle(Theme.hint) }
                    if let intro = item.summary.map({ wholeSentences($0, max: (feature ? 260 : 200) - item.asItem.viaLength) }), !intro.isEmpty { IntroText(text: intro, style: .body, lines: feature ? 5 : 4, suffix: item.asItem.introWithSource) } // hele zinnen, gemeten: past het niet, dan een zin minder
                }
                .padding(.horizontal, Space.s4)
                .padding(.top, showImage ? 4 : 16)
            }
            .contentShape(Rectangle())
            .opensArticle(item.asItem)
            VStack(alignment: .leading, spacing: Space.s1) {
                if let also = item.also, !also.isEmpty {
                    // Eén tekst met links, zodat hij bij grote tekst gewoon terugloopt.
                    Text(Self.alsoLine(also)).font(.ui(.caption)).foregroundStyle(Theme.hint)
                }
                SourceLine(item: item.asItem, linkSource: false) // de Digest heeft geen bronpagina's
                if let via = item.via { Text("via \(via)").font(.ui(.caption2)).foregroundStyle(Theme.hint) }
            }
            .padding(.horizontal, Space.s4)
            .padding(.bottom, Space.s2)
        }
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
        .overlay(alignment: .top) {
            if !showImage { Rectangle().fill(Theme.accent).frame(height: 3) }
        }
    }
}
