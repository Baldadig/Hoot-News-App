import SwiftUI

// Digest: elke maandag om 7 uur per vak de drie belangrijkste stukken van de week ervoor, door
// mensen geschreven. Opbouw als een tijdschrift: kop met de week, per vak een opening, het eerste
// stuk groot, twee kaarten, en "Ook deze week".
struct DigestView: View {
    @Environment(HootStore.self) private var store
    private static let fields: [(id: String, label: String, icon: String)] = [("paid-social", "Paid social", "megaphone"), ("ux", "UI/UX", "cursorarrow.click.2"), ("design", "Design in digital", "paintpalette")]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    picker
                    if let d = store.digest {
                        header(d)
                        let shown = d.fields.filter { store.digestFields.contains($0.id) }
                        if shown.isEmpty {
                            EmptyState(title: "Kies je vakken", systemImage: "briefcase", text: "Tik hierboven op een of meer vakken.")
                        }
                        ForEach(shown) { field in
                            FieldSection(field: field, icon: Self.fields.first { $0.id == field.id }?.icon ?? "briefcase")
                        }
                        DisclosureGroup("Hoe kiest Hoot deze stukken?") {
                            Text("Op drie gronden: hoeveel vakbronnen over hetzelfde schreven, of de redactie van Sidebar het uitkoos, en wie het schreef (een vakexpert telt zwaarder dan een vakblad). Alleen stukken van mensen: geen gesponsorde stukken, webinars, podcasts of lijstjes. De tekst bij elk stuk is de intro van de schrijver zelf, niet van AI.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .padding(.top, 8)
                        }
                        .font(.subheadline.weight(.semibold))
                        .padding(.vertical, 32)
                    } else if store.digestStatus == .failed {
                        EmptyState(title: "Geen verbinding", systemImage: "wifi.slash", text: "Trek omlaag om het opnieuw te proberen.")
                    } else {
                        ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                    }
                }
                .padding(.horizontal)
                .column(Layout.wide * 0.85)
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
            GlassEffectContainer(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach(Self.fields, id: \.id) { f in
                        let on = store.digestFields.contains(f.id)
                        Button {
                            store.digestFields = on ? store.digestFields.filter { $0 != f.id } : Self.fields.map(\.id).filter { $0 == f.id || store.digestFields.contains($0) }
                        } label: {
                            Label(f.label, systemImage: on ? "checkmark" : f.icon)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(on ? Theme.accent : .secondary)
                                .contentTransition(.symbolEffect(.replace))
                        }
                        .buttonStyle(.glass)
                        .sensoryFeedback(.selection, trigger: on)
                        .accessibilityAddTraits(on ? .isSelected : [])
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .scrollClipDisabled()
        .padding(.bottom, 8)
    }

    private func header(_ d: Digest) -> some View {
        let fields = d.fields.filter { store.digestFields.contains($0.id) }
        let picked = fields.reduce(0) { $0 + $1.top.count }
        let seen = fields.reduce(0) { $0 + ($1.count ?? 0) }
        return VStack(alignment: .leading, spacing: 8) {
            Kicker(text: d.preview == true ? "Voorproefje · de afgelopen zeven dagen" : "Week \(d.week ?? 0) · \(Self.span(d.from, d.to))")
            Text("\(picked) stukken om te lezen, gekozen uit \(seen) stukken van vakmensen en vakbladen.")
                .font(Theme.headline(.title2))
                .fixedSize(horizontal: false, vertical: true)
            if d.preview == true, let next = d.next.flatMap(HootDate.parse) {
                Text("De eerste volle digest komt \(next.formatted(HootDate.style(.dateTime.weekday(.wide).day().month(.wide)))) om 7 uur.")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else {
                Text("Elke maandag om 7 uur een nieuwe.").font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 16)
    }

    static func span(_ from: String?, _ to: String?) -> String {
        guard let a = from.flatMap(HootDate.parse), let b = to.flatMap(HootDate.parse)?.addingTimeInterval(-8 * 3600) else { return "" }
        return "\(a.formatted(HootDate.style(.dateTime.day()))) t/m \(b.formatted(HootDate.style(.dateTime.day().month(.wide))))"
    }
}

private struct FieldSection: View {
    @Environment(\.isWide) private var wide
    let field: DigestField
    let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Rectangle().fill(.primary).frame(height: 2)
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge) // blijft binnen zijn cirkel
                    .foregroundStyle(Theme.accent)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.tint(Theme.accent.opacity(0.12)), in: .circle)
                VStack(alignment: .leading, spacing: 2) {
                    Text(field.label).font(Theme.headline(.title2))
                    if let about = field.about { Text(about).font(.subheadline).foregroundStyle(.secondary) }
                }
            }
            if let first = field.top.first {
                DigestCard(item: first, rank: 1, feature: true)
                let rest = Array(field.top.dropFirst().enumerated())
                if wide {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(rest, id: \.element.id) { i, item in DigestCard(item: item, rank: i + 2, feature: false).frame(maxHeight: .infinity, alignment: .top) }
                    }
                } else {
                    ForEach(rest, id: \.element.id) { i, item in DigestCard(item: item, rank: i + 2, feature: false) }
                }
            } else {
                Text("Deze week geen stukken die eruit sprongen.").font(.subheadline).foregroundStyle(.secondary)
            }
            if !field.more.isEmpty {
                Text("OOK DEZE WEEK").font(.caption.weight(.heavy)).tracking(0.6).foregroundStyle(.secondary).padding(.top, 8)
                ForEach(field.more) { item in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.title).font(Theme.headline(.headline)).foregroundStyle(.primary)
                        Text("\(item.sourceName ?? "") · \(HootDate.ago(item.publishedAt.flatMap(HootDate.parse)))").font(.caption).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 6)
                    .contentShape(Rectangle())
                    .opensArticle(item.asItem)
                    Divider()
                }
            }
        }
        .padding(.top, 32)
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
            VStack(alignment: .leading, spacing: 8) {
                if showImage {
                    FramedImage(url: ImageURL.url(item.image, .large), ratio: feature ? 16 / 9 : 2)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text(String(format: "%02d", rank)).font(Theme.headline(.title)).foregroundStyle(Theme.accent)
                    if let why = item.why, !why.isEmpty { Kicker(text: why.joined(separator: " · ")) }
                    Text(item.title)
                        .font(Theme.headline(feature ? .title2 : .title3))
                        .foregroundStyle(store.isRead(item.asItem) ? .secondary : .primary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let summary = item.summary { Text(summary).font(feature ? .body : .subheadline).foregroundStyle(.secondary).lineLimit(feature ? 4 : 3) }
                }
                .padding(.horizontal, 16)
                .padding(.top, showImage ? 4 : 16)
            }
            .contentShape(Rectangle())
            .opensArticle(item.asItem)
            VStack(alignment: .leading, spacing: 4) {
                if let also = item.also, !also.isEmpty {
                    // Eén tekst met links, zodat hij bij grote tekst gewoon terugloopt.
                    Text(Self.alsoLine(also)).font(.caption).foregroundStyle(.secondary)
                }
                SourceLine(item: item.asItem)
                if let via = item.via { Text("via \(via)").font(.caption2).foregroundStyle(.secondary) }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(.separator, lineWidth: 0.5))
        .overlay(alignment: .top) {
            if !showImage { Rectangle().fill(Theme.accent).frame(height: 3) }
        }
    }
}
