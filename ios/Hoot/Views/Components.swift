import SafariServices
import SwiftUI

// Huisstijl: warm papier, inkt, krantenrood. Koppen in New York (de serif van het systeem: past
// bij Newsreader op het web en schaalt mee met Dynamische tekst), de rest in San Francisco.
enum Theme {
    // De kleuren van het design system (zelfde namen en waarden als src/styles.css).
    static let paper = Color("Paper") // pagina
    static let surface = Color("Surface") // kaart, blad, melding
    static let ink = Color("Ink") // koppen en tekst
    static let ink2 = Color("Ink2") // intro's en samenvattingen
    // Metadata: tijd, bron-uitleg, toelichting. De ondergrens voor kleine tekst (5,2:1 licht, 6,7:1
    // donker); nooit het lichtere grijs van het systeem (3,3:1 op papier).
    static let ink3 = Color("Ink3")
    static let rule = Color("Rule") // haarlijn, decoratief
    static let edge = Color("Edge") // rand van velden en knoppen die iets betekenen (3:1)
    static let accentSoft = Color("AccentSoft") // achtergrond van iets dat aan staat
    static let onAccent = Color("OnAccent") // tekst op een accent-vlak
    static let warn = Color("Warn") // waarschuwing, altijd met woorden
    // Merkrood: het diepe krantenrood als vol vlak, in licht en donker gelijk. Alleen voor
    // merkmomenten (opstarten, welkom, einde van de editie); verder is het accent een detail.
    static let brandRed = Color("BrandRed")
    static let onBrandRed = Color("OnBrandRed") // tekst op merkrood, 7,6:1
    static let accent = Color("AccentColor") // de kleur zelf: "accentColor" volgt de tint, en die valt soms terug op systeemblauw
    static func headline(_ style: Font.TextStyle) -> Font { .system(style, design: .serif, weight: .bold) }
}

// Een artikel openen: in de app, in Safari-weergave (met Lezer en de inlog van je abonnementen).
// Betaalde bronnen standaard in Safari: daar ben je ingelogd bij je abonnementen. De
// Safari-weergave in de app deelt geen websitegegevens met Safari, dus daar zie je de betaalmuur.
@MainActor
@Observable
final class Reader {
    var item: Item?

    // De Safari-weergave kan alleen http(s) tonen.
    static func canShow(_ url: URL) -> Bool { ["http", "https"].contains(url.scheme?.lowercased() ?? "") }

    func open(_ item: Item, store: HootStore) {
        guard let url = item.link, Self.canShow(url) else { return }
        store.markRead(item)
        let paid = store.source(item.source)?.paid == true
        switch store.openWith {
        case "safari": UIApplication.shared.open(url)
        case "web": if paid && store.paidInSafari { UIApplication.shared.open(url) } else { self.item = item }
        default: self.item = item // de lezer; die valt zelf terug op de website als het niet lukt
        }
    }
}

struct SafariView: UIViewControllerRepresentable {
    let url: URL
    var reader = false
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = reader
        let vc = SFSafariViewController(url: url, configuration: config)
        vc.dismissButtonStyle = .close
        return vc
    }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

// Haarlijn tussen berichten: `rule`, één pixel, decoratief.
struct Rule: View {
    var body: some View { Rectangle().fill(Theme.rule).frame(height: 1).accessibilityHidden(true) }
}

// "hoot." in de krantenletter met de rode punt, zoals op de website.
struct Wordmark: View {
    var body: some View {
        Text("hoot\(Text(".").foregroundStyle(Theme.accent))")
            .font(.system(.title3, design: .serif, weight: .heavy))
            .dynamicTypeSize(...DynamicTypeSize.xxLarge)
            .fixedSize() // nooit afgekapt tot "h…"
            .accessibilityLabel("Hoot")
            .accessibilityAddTraits(.isHeader)
    }
}

struct Kicker: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let text: String?
    private func label(_ s: String) -> String { typeSize.isAccessibilitySize ? s : s.uppercased() }
    var body: some View {
        if let text, !text.isEmpty {
            // Bij heel grote tekst geen kapitalen: die worden dan breder en zwaarder dan de kop.
            // Meerdere labels ("Binnenland · Buiten je bronnen"): de punt ertussen in `ink3`.
            let parts = text.components(separatedBy: " · ")
            let joined = parts.dropFirst().reduce(Text(label(parts[0])).foregroundStyle(Theme.accent)) { acc, p in
                Text("\(acc)\(Text(" · ").foregroundStyle(Theme.ink3))\(Text(label(p)).foregroundStyle(Theme.accent))")
            }
            if typeSize.isAccessibilitySize {
                joined.font(.caption.weight(.semibold))
            } else {
                joined.font(.caption.weight(.heavy)).tracking(0.6)
            }
        }
    }
}

// De intro van een bericht in hele zinnen (tot ongeveer `max` tekens), in plaats van een zin die
// halverwege afbreekt. Zonder volledige zin: de tekst zoals hij is.
func wholeSentences(_ text: String, max: Int = 240) -> String {
    var out = ""
    var rest = Substring(text)
    while let end = rest.firstMatch(of: /[.!?…]["”’)]?(\s+|$)/) {
        let sentence = rest[..<end.range.upperBound]
        if !out.isEmpty && out.count + sentence.count > max { break }
        out += sentence
        rest = rest[end.range.upperBound...]
        if out.count >= max { break }
    }
    let trimmed = out.trimmingCharacters(in: .whitespaces)
    return trimmed.isEmpty || trimmed.hasSuffix("…") || trimmed.hasSuffix("...") ? text : trimmed
}

struct RemoteImage: View {
    let url: URL?
    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Rectangle().fill(.quaternary)
            }
        }
        .clipped()
        .accessibilityHidden(true)
    }
}

// Een beeld in een vaste verhouding over de volle breedte; wat buiten het kader valt wordt
// afgesneden (anders duwt een breed beeld de kolom opzij).
struct FramedImage: View {
    let url: URL?
    var ratio: CGFloat = 16 / 9
    var body: some View {
        Color.clear
            .aspectRatio(ratio, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .overlay { RemoteImage(url: url) }
            .clipped()
    }
}

struct SourceMark: View {
    let item: Item
    var size: CGFloat = 24
    var body: some View {
        AsyncImage(url: item.avatar.flatMap(URL.init(string:))) { phase in
            if let image = phase.image { image.resizable().scaledToFill() } else { Circle().fill(.quaternary) }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Theme.rule, lineWidth: 1))
        .accessibilityHidden(true)
    }
}

// Bron, tijd en (als het verhaal meer bronnen heeft) "+N bronnen".
struct SourceLine: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    let item: Item
    var story: Story?
    var linkSource = true // tik op de bron = alles van die bron (niet op het bronscherm zelf)
    var body: some View {
        // Op één regel als het past; anders bron en tijd bovenaan (mogen afbreken) en de knoppen
        // eronder. Nooit een vaste breedte: bij heel grote tekst duwt die anders de hele kolom
        // buiten het scherm.
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Space.s2) { source(oneLine: true); Spacer(minLength: 8); more; SaveButton(item: item) }
            VStack(alignment: .leading, spacing: Space.s1) {
                source(oneLine: false)
                HStack { more; Spacer(); SaveButton(item: item) }
            }
        }
    }

    @ViewBuilder private func source(oneLine: Bool) -> some View {
        if linkSource, !item.isPost, store.source(item.source) != nil {
            NavigationLink(value: SourceRoute(id: item.source)) {
                sourceLabel(oneLine: oneLine).frame(minHeight: Space.tap).contentShape(Rectangle()) // aanraakvlak 44 pt
            }
                .buttonStyle(.plain)
                .accessibilityHint("Toont alles van \(item.sourceName ?? "deze bron")")
        } else {
            sourceLabel(oneLine: oneLine)
        }
    }

    private func sourceLabel(oneLine: Bool) -> some View {
        HStack(alignment: .top, spacing: Space.s2) {
            SourceMark(item: item)
            VStack(alignment: .leading, spacing: 0) {
                Text(item.sourceName ?? item.source).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(meta).font(.caption).foregroundStyle(Theme.ink3)
            }
            .lineLimit(oneLine ? 1 : nil)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var meta: String {
        [HootDate.ago(item.date), store.source(item.source)?.paid == true ? "abonnement" : nil].compactMap { $0 }.joined(separator: " · ")
    }

    @ViewBuilder private var more: some View {
        if let story, (story.sourceCount ?? 1) > 1 {
            NavigationLink(value: story) {
                Text((story.sourceCount ?? 1) == 2 ? "+1 bron" : "+\((story.sourceCount ?? 1) - 1) bronnen")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Theme.accent)
                    .lineLimit(1)
                    .frame(minHeight: 44) // een aanraakvlak van 44 pt, los van het artikel erboven
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Vergelijk \((story.sourceCount ?? 1) - 1) andere bronnen")
        }
    }
}

struct SaveButton: View {
    @Environment(HootStore.self) private var store
    let item: Item
    var body: some View {
        let on = store.isSaved(item)
        Button {
            store.toggleSave(item)
        } label: {
            Image(systemName: on ? "bookmark.fill" : "bookmark")
                .font(.body)
                .dynamicTypeSize(...DynamicTypeSize.xxxLarge) // het icoon past altijd in zijn aanraakvlak
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(on ? Theme.accent : Theme.ink3)
        .sensoryFeedback(.selection, trigger: on)
        .accessibilityLabel(on ? "Bewaard, tik om te verwijderen" : "Bewaar")
    }
}

// Tik = lezen; lang drukken = bewaren, delen of openen in Safari.
struct ArticleActions: ViewModifier {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader
    let item: Item
    func body(content: Content) -> some View {
        Button { reader.open(item, store: store) } label: { content }
            .buttonStyle(.plain)
            .hoverEffect(.highlight) // muis of trackpad op iPad
            .contextMenu {
                Button(store.isSaved(item) ? "Verwijder uit Bewaard" : "Bewaar", systemImage: store.isSaved(item) ? "bookmark.slash" : "bookmark") { store.toggleSave(item) }
                if let link = item.link {
                    ShareLink(item: link, subject: Text(item.title)) { Label("Deel", systemImage: "square.and.arrow.up") }
                    Link(destination: link) { Label("Open in Safari", systemImage: "safari") }
                }
            }
    }
}

extension View {
    func opensArticle(_ item: Item) -> some View { modifier(ArticleActions(item: item)) }
    @ViewBuilder func opensArticle(_ item: Item?) -> some View { if let item { opensArticle(item) } else { self } }
}

// ---- Vorm 1: hoofdverhaal ----
// Smal: beeld boven de kop. Breed (iPad, opengevouwen Duo): beeld en tekst naast elkaar, zoals
// de voorpagina van een krant, zodat het beeld niet het hele scherm vult.
struct LeadCard: View {
    @Environment(HootStore.self) private var store
    @Environment(\.isWide) private var wide
    @Environment(\.isSpacious) private var spacious
    let item: Item
    var label: String?
    var story: Story?

    private var hasImage: Bool { store.showsImage(lead: true) && ImageURL.fitsHero(item.image) }

    private var image: some View {
        FramedImage(url: ImageURL.url(item.image, .large), ratio: spacious ? 3 / 2 : wide ? 2 : 16 / 9)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
    }

    private var text: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Kicker(text: label)
            Text(item.title)
                .font(Theme.headline(wide ? .largeTitle : .title))
                .foregroundStyle(store.isRead(item) ? Theme.ink3 : Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            if let summary = item.summary, !summary.isEmpty {
                Text(wholeSentences(summary)).font(wide ? .title3 : .body).foregroundStyle(Theme.ink2).lineLimit(wide ? 6 : 5).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Group {
                if spacious && hasImage {
                    HStack(alignment: .top, spacing: Space.s6) {
                        image.frame(maxWidth: .infinity)
                        text.frame(maxWidth: .infinity, alignment: .leading)
                    }
                } else {
                    VStack(alignment: .leading, spacing: Space.s3) {
                        if hasImage { image }
                        text
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .opensArticle(item)
            SourceLine(item: item, story: story)
        }
    }
}

// ---- Vorm 2: compact bericht ----
struct ItemRow: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .title3) private var thumb: CGFloat = 76
    let item: Item
    var label: String?
    var story: Story?
    var linkSource = true
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            HStack(alignment: .top, spacing: Space.s3) {
                VStack(alignment: .leading, spacing: Space.s2) {
                    Kicker(text: label)
                    if item.isPost {
                        // Een Bluesky-post (in Bewaard): de tekst zelf, geen kop.
                        Text(item.summary ?? "").font(.body).fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text(item.title)
                            .font(Theme.headline(.title3))
                            .foregroundStyle(store.isRead(item) ? Theme.ink3 : Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        if let summary = item.summary, !summary.isEmpty {
                            Text(summary).font(.subheadline).foregroundStyle(Theme.ink2).lineLimit(store.preview == 0 ? nil : store.preview)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                // Bij heel grote tekst geen miniatuur naast de kop: de kop krijgt de hele breedte.
                if item.image != nil, store.showsImage(lead: false), !typeSize.isAccessibilitySize {
                    RemoteImage(url: ImageURL.url(item.image, .thumb))
                        .frame(width: min(thumb, 96), height: min(thumb, 96))
                        .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                }
            }
            .contentShape(Rectangle())
            .opensArticle(item)
            SourceLine(item: item, story: story, linkSource: linkSource)
        }
        .padding(.vertical, Space.s2)
    }
}

// Verversen lukte niet: zeg eerlijk welke versie je ziet, met een knop om het opnieuw te proberen.
struct StaleNotice: View {
    @Environment(HootStore.self) private var store
    var body: some View {
        if store.stale {
            HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
                Image(systemName: "wifi.slash").foregroundStyle(Theme.ink3)
                Text(message).font(.subheadline).foregroundStyle(Theme.ink3).frame(maxWidth: .infinity, alignment: .leading)
                Button("Opnieuw") { Task { await store.load() } }.font(.subheadline.weight(.semibold)).frame(minHeight: Space.tap)
            }
            .padding(Space.s3)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
            .padding(.bottom, Space.s3)
            .accessibilityElement(children: .combine)
        }
    }
    private var message: String {
        guard let at = store.updatedAt else { return "Verversen lukt nu niet." }
        return "Verversen lukt nu niet. Je ziet de versie van \(at.formatted(date: .omitted, time: .shortened))."
    }
}

struct EmptyState: View {
    let title: String
    let systemImage: String
    var text: String = ""
    // Opnieuw proberen als knop naast het trekgebaar (dat niet iedereen kent of kan maken).
    var retry: (() async -> Void)? = nil
    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(text)
        } actions: {
            if let retry { Button("Probeer opnieuw") { Task { await retry() } }.buttonStyle(.glass) }
        }
    }
}
