import SwiftUI

// Selectie: elke maandagochtend per onderwerp de drie belangrijkste stukken van de week ervoor,
// door mensen geschreven. Opbouw als een tijdschrift: kop met de week, per onderwerp een opening, het eerste
// stuk groot, twee kaarten, en "Ook deze week".
struct DigestView: View {
    @Environment(HootStore.self) private var store
    private static var fields: [DigestFieldsList.Field] { DigestFieldsList.fields }
    @State private var choosing = false
    @State private var navigating = false
    @State private var folding = SelectionFoldState()
    @State private var pendingJump: (id: String, owner: String)?
    @AccessibilityFocusState private var focusedField: String?
    @FocusState private var keyboardField: String?
    @Environment(\.dynamicTypeSize) private var typeSize
    private var owner: String { store.account?.uid ?? "anon" }
    private var preferencesReady: Bool {
        guard let account = store.account else { return UserDefaults.standard.string(forKey: "hoot.owner") == nil }
        guard let uid = account.uid else { return true }
        // Het eigenaarrecord zelf is geen Observable; de sync-overgangen leveren de nieuwe lezing.
        _ = account.sync
        return UserDefaults.standard.string(forKey: "hoot.owner") == uid
    }
    private var shown: [DigestField] {
        let offered = Dictionary((store.digest?.fields ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return Self.fields.filter { store.digestFields.contains($0.id) }.map { f in
            offered[f.id] ?? DigestField(id: f.id, label: f.label, top: [], more: [])
        }
    }
    private var closed: Set<String> { folding.closed(for: owner, selected: store.digestFields) }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenTitle("Selectie") // de schermtitel in de scroll (C7), boven de onderwerpenknop
                    picker
                    if let d = store.digest {
                        header(d)
                        if shown.isEmpty {
                            EmptyState(title: "Kies je onderwerpen", systemImage: "books.vertical", text: "Voor je werk of uit interesse: elke maandag per onderwerp de drie beste stukken van de week.")
                        }
                        if !shown.isEmpty { navigation(proxy) }
                        ForEach(shown) { field in
                            FieldSection(field: field, icon: Self.fields.first { $0.id == field.id }?.icon ?? "briefcase", expanded: !closed.contains(field.id), focus: $focusedField, keyboardFocus: $keyboardField, enabled: preferencesReady) {
                                var next = closed
                                if !next.insert(field.id).inserted { next.remove(field.id) }
                                folding.set(next, for: owner, selected: store.digestFields)
                            }
                                .id(field.id)
                        }
                        DisclosureGroup("Hoe kiest Hoot deze stukken?") {
                            Text("Gekozen uit \(shown.reduce(0) { $0 + ($1.count ?? 0) }) stukken van kenners en vakbladen in de onderwerpen die je volgt, op drie gronden: hoeveel bronnen over hetzelfde schreven, of een redactie het uitkoos (zoals Sidebar), en wie het schreef (een kenner telt zwaarder dan een vakblad). Alleen stukken van mensen: geen gesponsorde stukken, webinars, podcasts of lijstjes. De tekst bij elk stuk is de intro van de schrijver zelf, niet van AI.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.ink3)
                                .padding(.top, Space.s2)
                        }
                        .font(.subheadline.weight(.semibold))
                        .padding(.vertical, Space.s6)
                        .id("einde")
                    } else if store.digestStatus == .failed {
                        EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Zodra je verbinding hebt, verschijnt de Selectie hier.", retry: { await store.loadDigest(force: true) })
                    } else {
                        WaitingMark().frame(maxWidth: .infinity, minHeight: 240)
                    }
                }
                .padding(.horizontal)
                .column(Layout.wide * 0.85)
            }
            .debugJump(proxy, to: DebugLaunch.anchor == .bottom ? "einde" : shown.isEmpty ? nil : shown[shown.count / 2].id, when: shown.count)
            }
            .onChange(of: owner, initial: true) { _, reader in
                navigating = false; pendingJump = nil; focusedField = nil; keyboardField = nil
                folding.activate(reader, selected: store.digestFields, persist: preferencesReady)
            }
            .onChange(of: store.digestFields) { _, selected in folding.activate(owner, selected: selected, persist: preferencesReady) }
            .onChange(of: preferencesReady) { _, ready in
                if ready { folding.activate(owner, selected: store.digestFields) }
            }
            .background(Theme.paper)
            .navigationTitle("Selectie")
            .hootScreenTitle()
            .settingsButton()
            .hootRefresh { await store.loadDigest(force: true) }
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

    private func navigation(_ proxy: ScrollViewProxy) -> some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: Space.s2)) : AnyLayout(HStackLayout(spacing: Space.s4))
        return layout { indexButton(proxy); allButton }
        .padding(.vertical, Space.s3)
    }

    private var allButton: some View {
        Group {
            if shown.count > 1 {
                let allClosed = shown.allSatisfy { closed.contains($0.id) }
                Button(allClosed ? "Alles uitklappen" : "Alles inklappen") {
                    folding.set(allClosed ? [] : Set(shown.map(\.id)), for: owner, selected: store.digestFields)
                }
                .font(.subheadline.weight(.semibold)).frame(minHeight: Space.tap)
                .disabled(!preferencesReady)
                .tint(Theme.ink)
            }
        }
    }

    @ViewBuilder private func indexButton(_ proxy: ScrollViewProxy) -> some View {
        let button = Button { navigating = true } label: {
            Label("Ga naar onderwerp", systemImage: "list.bullet").font(.subheadline.weight(.semibold))
        }.buttonStyle(.glass).disabled(!preferencesReady).accessibilityIdentifier("selectie-index")
        if typeSize.isAccessibilitySize {
            button.sheet(isPresented: $navigating, onDismiss: { finishJump(proxy) }) { index }
        } else {
            button.popover(isPresented: $navigating) {
                index.frame(idealWidth: 380, idealHeight: 520)
                    .presentationCompactAdaptation(.sheet)
                    .onDisappear { finishJump(proxy) }
            }
        }
    }
    private var index: some View {
        SelectionIndex(fields: shown, onClose: { navigating = false }) { id in
            folding.set(closed.subtracting([id]), for: owner, selected: store.digestFields)
            pendingJump = (id, owner)
            navigating = false
        }
    }
    private func finishJump(_ proxy: ScrollViewProxy) {
        guard let target = pendingJump else { return }
        pendingJump = nil
        Task { @MainActor in
            await Task.yield()
            guard target.owner == owner, store.digestFields.contains(target.id) else { return }
            proxy.scrollTo(target.id, anchor: .top)
            focusedField = target.id
            keyboardField = target.id
        }
    }

    // Eén knop om je onderwerpen te kiezen, uit alle acht domeinen (de gekozen staan hieronder als
    // hoofdstukken, dus geen rij met knoppen ervan).
    private var picker: some View {
        let count = Self.fields.filter { store.digestFields.contains($0.id) && store.offersField($0.id) }.count
        return Button { choosing = true } label: {
            Label(count == 0 ? "Kies onderwerpen" : "Onderwerpen · \(count)", systemImage: "slider.horizontal.3")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.ink) // een tekstactie: inkt, zoals --action op het web
        }
        .buttonStyle(.glass)
        .padding(.vertical, Space.s1)
        .padding(.bottom, Space.s2)
    }

    private func header(_ d: Digest) -> some View {
        let fields = shown
        let picked = fields.reduce(0) { $0 + $1.top.count }
        return VStack(alignment: .leading, spacing: Space.s2) {
            Kicker(text: d.preview == true ? "Voorproefje · de afgelopen zeven dagen" : "Week \(d.week ?? 0) · \(Self.span(d.from, d.to))")
            Text("\(picked == 1 ? "1 stuk" : "\(picked) stukken") in \(fields.count == 1 ? "1 onderwerp" : "\(fields.count) onderwerpen")")
                .font(Theme.headline(.title2))
                .fixedSize(horizontal: false, vertical: true)
            if d.preview == true, let next = d.next.flatMap(HootDate.parse) {
                Text("De eerste volle Selectie komt \(next.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide)))) in de ochtend.")
                    .font(.subheadline).foregroundStyle(Theme.ink3)
            } else {
                Text("Elke maandagochtend een nieuwe.").font(.subheadline).foregroundStyle(Theme.ink3)
            }
        }
        .padding(.vertical, Space.s4)
    }

    // "2 t/m 8 november", en over een maandgrens "26 oktober t/m 1 november" (zoals op de website).
    static func span(_ from: String?, _ to: String?) -> String {
        guard let a = from.flatMap(HootDate.parse), let b = to.flatMap(HootDate.parse)?.addingTimeInterval(-8 * 3600) else { return "" }
        let month = HootDate.style(.dateTime.month(.wide))
        let first = a.formatted(month) == b.formatted(month) ? HootDate.style(.dateTime.day()) : HootDate.style(.dateTime.day().month(.wide))
        return "\(a.formatted(first)) t/m \(b.formatted(HootDate.style(.dateTime.day().month(.wide))))"
    }
}

struct FieldSection: View {
    @Environment(\.isWide) private var wide
    @Environment(\.dynamicTypeSize) private var typeSize
    let field: DigestField
    let icon: String
    let expanded: Bool
    var focus: AccessibilityFocusState<String?>.Binding
    var keyboardFocus: FocusState<String?>.Binding
    var enabled = true
    let toggle: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Rectangle().fill(.primary).frame(height: 2)
            Button(action: toggle) {
                let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: Space.s2)) : AnyLayout(HStackLayout(spacing: Space.s3))
                layout {
                    if !typeSize.isAccessibilitySize {
                        Image(systemName: icon).resizable().scaledToFit().frame(width: Space.s5, height: Space.s5)
                            .foregroundStyle(Theme.ink3).frame(width: 44, height: 44)
                            .glassEffect(.regular.tint(Theme.ink.opacity(0.06)), in: .circle)
                            .accessibilityHidden(true)
                    }
                    VStack(alignment: .leading, spacing: Space.s0) {
                        Text(field.label).font(Theme.headline(.title2)).fixedSize(horizontal: false, vertical: true)
                        if expanded, let about = field.about { Text(about).font(.subheadline).foregroundStyle(Theme.ink3) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    if typeSize.isAccessibilitySize {
                        HStack {
                            pieceCount
                            Spacer(minLength: Space.s2)
                            chevron
                        }
                    } else {
                        VStack(alignment: .trailing, spacing: Space.s1) { pieceCount; chevron }
                    }
                }
                .foregroundStyle(Theme.ink).frame(minHeight: Space.tap)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(!enabled)
            .accessibilityLabel("\(field.label), \(field.top.count == 1 ? "1 stuk" : "\(field.top.count) stukken")")
            .accessibilityValue(expanded ? "Uitgeklapt" : "Ingeklapt")
            .accessibilityAddTraits(.isHeader)
            .accessibilityIdentifier("selectie-heading-" + field.id)
            .accessibilityFocused(focus, equals: field.id)
            .focused(keyboardFocus, equals: field.id)
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
                    Text("Deze week geen stukken die eruit sprongen.").font(.subheadline).foregroundStyle(Theme.ink3)
                }
                if !field.more.isEmpty {
                    Text("OOK DEZE WEEK").font(.caption.weight(.heavy)).tracking(0.6).foregroundStyle(Theme.ink3).padding(.top, Space.s2)
                    ForEach(field.more) { item in
                        VStack(alignment: .leading, spacing: Space.s0) {
                            Text(item.title).font(Theme.headline(.headline)).foregroundStyle(Theme.ink)
                            Text("\(item.sourceName ?? "") · \(HootDate.ago(item.publishedAt.flatMap(HootDate.parse)))").font(.caption).foregroundStyle(Theme.ink3)
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
        .padding(.top, expanded ? Space.s6 : Space.s3)
    }
    private var pieceCount: some View {
        Text(field.top.count == 1 ? "1 stuk" : "\(field.top.count) stukken").font(.caption).foregroundStyle(Theme.ink3)
    }
    private var chevron: some View {
        Image(systemName: expanded ? "chevron.up" : "chevron.down").font(.caption).foregroundStyle(Theme.ink3)
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
                    Text(String(format: "%02d", rank)).font(Theme.headline(.headline)).monospacedDigit().foregroundStyle(Theme.accent) // tabelcijfers: 01, 02, 03 even breed
                    Text(item.title)
                        .font(Theme.headline(feature ? .title2 : .title3))
                        .foregroundStyle(store.isRead(item.asItem) ? Theme.ink3 : Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    // Waarom dit stuk: rustige metadata onder de kop, zodat de kop voorgaat.
                    if let why = item.why, !why.isEmpty { Text(why.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.ink3) }
                    if let intro = item.summary.map({ wholeSentences($0, max: feature ? 260 : 200) }), !intro.isEmpty { Text(intro).font(feature ? .body : .subheadline).foregroundStyle(Theme.ink2).lineLimit(feature ? 5 : 4) } // hele zinnen; de regelgrens is een vangnet
                }
                .padding(.horizontal, Space.s4)
                .padding(.top, showImage ? 4 : 16)
            }
            .contentShape(Rectangle())
            .opensArticle(item.asItem)
            VStack(alignment: .leading, spacing: Space.s1) {
                if let also = item.also, !also.isEmpty {
                    // Eén tekst met links, zodat hij bij grote tekst gewoon terugloopt.
                    Text(Self.alsoLine(also)).font(.caption).foregroundStyle(Theme.ink3)
                }
                SourceLine(item: item.asItem, linkSource: false) // de Digest heeft geen bronpagina's
                if let via = item.via { Text("via \(via)").font(.caption2).foregroundStyle(Theme.ink3) }
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


struct SelectionIndex: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let fields: [DigestField]
    let onClose: () -> Void
    let onPick: (String) -> Void
    var body: some View {
        NavigationStack {
            List {
                ForEach(DigestFieldsList.domains, id: \.label) { domain in
                    let rows = domain.fields.compactMap { f in fields.first { $0.id == f.id } }
                    if !rows.isEmpty {
                        Section {
                            ForEach(rows) { field in
                                Button { onPick(field.id) } label: {
                                    let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: Space.s2)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: Space.s3))
                                    layout {
                                        Text(field.label).fixedSize(horizontal: false, vertical: true)
                                        if !typeSize.isAccessibilitySize { Spacer(minLength: Space.s2) }
                                        Text(field.top.count == 1 ? "1 stuk" : "\(field.top.count) stukken")
                                            .font(.caption).foregroundStyle(Theme.ink3)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity, minHeight: Space.tap, alignment: .leading)
                                }
                                .accessibilityIdentifier("selectie-jump-" + field.id)
                            }
                        } header: { FormHeader(domain.label) }
                        .hootRows()
                    }
                }
            }
            .hootForm()
            .navigationTitle("Ga naar onderwerp").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Sluiten", action: onClose) } }
        }
    }
}
