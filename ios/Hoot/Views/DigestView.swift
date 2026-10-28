import SwiftUI

// Digest: elke maandag om 7 uur per vak de drie belangrijkste stukken van de week ervoor, door
// mensen geschreven. Opbouw als een tijdschrift: kop met de week, per vak een opening, het eerste
// stuk groot, twee kaarten, en "Ook deze week".
struct DigestView: View {
    @Environment(HootStore.self) private var store
    private static var fields: [(id: String, label: String, icon: String)] { DigestFieldsList.fields }

    var body: some View {
        NavigationStack {
            let shown = store.digest?.fields.filter { store.digestFields.contains($0.id) } ?? []
            ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    picker
                    if let d = store.digest {
                        header(d)
                        if shown.isEmpty {
                            EmptyState(title: "Kies je vakken", systemImage: "briefcase", text: "Tik hierboven op een of meer vakken.")
                        }
                        ForEach(shown) { field in
                            FieldSection(field: field, icon: Self.fields.first { $0.id == field.id }?.icon ?? "briefcase")
                                .id(field.id)
                        }
                        DisclosureGroup("Hoe kiest Hoot deze stukken?") {
                            Text("Gekozen uit \(shown.reduce(0) { $0 + ($1.count ?? 0) }) stukken van vakmensen en vakbladen in de vakgebieden die je volgt, op drie gronden: hoeveel vakbronnen over hetzelfde schreven, of de redactie van Sidebar het uitkoos, en wie het schreef (een vakexpert telt zwaarder dan een vakblad). Alleen stukken van mensen: geen gesponsorde stukken, webinars, podcasts of lijstjes. De tekst bij elk stuk is de intro van de schrijver zelf, niet van AI.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.ink3)
                                .padding(.top, Space.s2)
                        }
                        .font(.subheadline.weight(.semibold))
                        .padding(.vertical, Space.s6)
                        .id("einde")
                    } else if store.digestStatus == .failed {
                        EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Zodra je verbinding hebt, verschijnt de Digest hier.", retry: { await store.loadDigest(force: true) })
                    } else {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    }
                }
                .padding(.horizontal)
                .column(Layout.wide * 0.85)
            }
            .debugJump(proxy, to: DebugLaunch.anchor == .bottom ? "einde" : shown.isEmpty ? nil : shown[shown.count / 2].id, when: shown.count)
            }
            .background(Theme.paper)
            .navigationTitle("Digest")
            .settingsButton()
            .refreshable { await store.loadDigest(force: true) }
            .task { await store.loadDigest() }
        }
    }

    // Vakken kiezen: knoppen van helder glas; wat aan staat met een vinkje in krantenrood.
    private var picker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            GlassEffectContainer(spacing: Space.s2) {
                HStack(spacing: Space.s2) {
                    ForEach(Self.fields.filter { store.offersField($0.id) }, id: \.id) { f in
                        let on = store.digestFields.contains(f.id)
                        Button {
                            store.digestFields = on ? store.digestFields.filter { $0 != f.id } : Self.fields.map(\.id).filter { $0 == f.id || store.digestFields.contains($0) }
                        } label: {
                            Label(f.label, systemImage: on ? "checkmark" : f.icon)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(on ? Theme.accent : Theme.ink3)
                                .contentTransition(.symbolEffect(.replace))
                        }
                        .buttonStyle(.glass)
                        .sensoryFeedback(.selection, trigger: on)
                        .accessibilityAddTraits(on ? .isSelected : [])
                    }
                }
            }
            .padding(.vertical, Space.s1)
        }
        .scrollClipDisabled()
        .padding(.bottom, Space.s2)
    }

    private func header(_ d: Digest) -> some View {
        let fields = d.fields.filter { store.digestFields.contains($0.id) }
        let picked = fields.reduce(0) { $0 + $1.top.count }
        return VStack(alignment: .leading, spacing: Space.s2) {
            Kicker(text: d.preview == true ? "Voorproefje · de afgelopen zeven dagen" : "Week \(d.week ?? 0) · \(Self.span(d.from, d.to))")
            Text("\(picked == 1 ? "1 stuk" : "\(picked) stukken") in \(fields.count == 1 ? "1 vakgebied" : "\(fields.count) vakgebieden")")
                .font(Theme.headline(.title2))
                .fixedSize(horizontal: false, vertical: true)
            if d.preview == true, let next = d.next.flatMap(HootDate.parse) {
                Text("De eerste volle digest komt \(next.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide)))) om 7 uur.")
                    .font(.subheadline).foregroundStyle(Theme.ink3)
            } else {
                Text("Elke maandag om 7 uur een nieuwe.").font(.subheadline).foregroundStyle(Theme.ink3)
            }
        }
        .padding(.vertical, Space.s4)
    }

    static func span(_ from: String?, _ to: String?) -> String {
        guard let a = from.flatMap(HootDate.parse), let b = to.flatMap(HootDate.parse)?.addingTimeInterval(-8 * 3600) else { return "" }
        return "\(a.formatted(HootDate.style(.dateTime.day()))) t/m \(b.formatted(HootDate.style(.dateTime.day().month(.wide))))"
    }
}

private struct FieldSection: View {
    @Environment(\.isWide) private var wide
    @Environment(\.dynamicTypeSize) private var typeSize
    let field: DigestField
    let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Rectangle().fill(.primary).frame(height: 2)
            HStack(spacing: Space.s3) {
                // Bij heel grote tekst geen icoon: de beschrijving krijgt de hele breedte.
                if !typeSize.isAccessibilitySize {
                Image(systemName: icon)
                    .font(.title3)
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge) // blijft binnen zijn cirkel
                    .foregroundStyle(Theme.accent)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.tint(Theme.accent.opacity(0.12)), in: .circle)
                }
                VStack(alignment: .leading, spacing: Space.s0) {
                    Text(field.label).font(Theme.headline(.title2))
                    if let about = field.about { Text(about).font(.subheadline).foregroundStyle(Theme.ink3) }
                }
            }
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
                    Text(String(format: "%02d", rank)).font(Theme.headline(.title)).foregroundStyle(Theme.accent)
                    if let why = item.why, !why.isEmpty { Kicker(text: why.joined(separator: " · ")) }
                    Text(item.title)
                        .font(Theme.headline(feature ? .title2 : .title3))
                        .foregroundStyle(store.isRead(item.asItem) ? Theme.ink3 : Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    if let summary = item.summary { Text(summary).font(feature ? .body : .subheadline).foregroundStyle(Theme.ink2).lineLimit(feature ? 4 : 3) }
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
