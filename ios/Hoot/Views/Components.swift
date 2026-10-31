import SafariServices
import SwiftUI
import UniformTypeIdentifiers

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
    static let onBrandRed = Color("OnBrandRed") // alles op merkrood: papier #F5F1E8 (6,9:1), zoals het opstartscherm
    static let accent = Color("AccentColor") // de kleur zelf: "accentColor" volgt de tint, en die valt soms terug op systeemblauw
    static func headline(_ style: Font.TextStyle) -> Font { .system(style, design: .serif, weight: .bold) }
}

// Een artikel openen: in de Hoot-lezer, of in de Safari-app (Instellingen › Lezen). In Safari ben je
// al ingelogd bij je abonnementen, met je wachtwoorden, passkeys en Google of Apple.
@MainActor
@Observable
final class Reader {
    var item: Item?

    // De Safari-weergave kan alleen http(s) tonen.
    static func canShow(_ url: URL) -> Bool { ["http", "https"].contains(url.scheme?.lowercased() ?? "") }

    func open(_ item: Item, store: HootStore) {
        guard let url = item.link, Self.canShow(url) else { return }
        store.markRead(item)
        if store.openWith == "safari" { UIApplication.shared.open(url) } else { self.item = item } // de lezer valt zelf terug op de website als het niet lukt
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

// Een schakelaar die aan staat is inkt (brandboard; .switch op het web). In donker is inkt licht en
// verdwijnt de witte duim van iOS erin; het web maakt de duim daar papier, maar dat laat iOS niet toe.
// Daarom in donker ink3: de baan blijft neutraal en de duim blijft te zien.
struct InkSwitch: ToggleStyle {
    @Environment(\.colorScheme) private var scheme
    func makeBody(configuration: Configuration) -> some View {
        Toggle(configuration).tint(scheme == .dark ? Theme.ink3 : Theme.ink)
    }
}

// Een knop op papier: inkt met papier, een pil, gewicht 800 (brandboard: Knop). Rood is voor het merk
// en voor wat gekozen is, niet voor wat je doet; een tweede knop is stil (`.glass` of een link).
struct InkButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.heavy))
            .foregroundStyle(Theme.paper)
            .padding(.horizontal, Space.s5)
            .frame(minHeight: Space.tap)
            .background(Theme.ink.opacity(configuration.isPressed ? 0.78 : 1), in: Capsule())
            .contentShape(Capsule())
            .opacity(enabled ? 1 : 0.45)
    }
}
extension ButtonStyle where Self == InkButtonStyle {
    static var ink: InkButtonStyle { InkButtonStyle() }
}

// Een formulier op papier (Instellingen en wat eronder hangt), zoals elk ander scherm van Hoot: geen
// systeemgrijs, rijen op `surface` met een haarlijn `rule` (`hootRows`), iconen stil in ink3
// (`FormLabel`). Bediening is inkt (de tint van de app); rood is alleen voor wat gekozen is met
// gewicht: de ster, 'gratis'.
extension View {
    func hootForm() -> some View {
        scrollContentBackground(.hidden).background(Theme.paper)
    }
}

// Het label van een rij in zo'n formulier, met het icoon in ink3. Een eigen labelstijl helpt niet:
// in een schakelaar, keuzelijst of LabeledContent slaat iOS die over en kleurt het icoon met de tint.
struct FormLabel: View {
    let title: String
    let systemImage: String
    init(_ title: String, systemImage: String) { self.title = title; self.systemImage = systemImage }
    var body: some View {
        Label { Text(title) } icon: { Image(systemName: systemImage).foregroundStyle(Theme.ink3) }
    }
}

// Een sectie in zo'n formulier: rijen op `surface`, de scheidingslijn in `rule`.
extension View {
    func hootRows() -> some View {
        listRowBackground(Theme.surface).listRowSeparatorTint(Theme.rule)
    }
}

// De kop boven een sectie: een kicker in inkt, zoals `GroupTitle` (die in ink3 staat).
struct FormHeader: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { GroupTitle(text: text, tone: Theme.ink).textCase(nil) }
}

// Haarlijn tussen berichten: `rule`, één pixel, decoratief.
struct Rule: View {
    var body: some View { Rectangle().fill(Theme.rule).frame(height: 1).accessibilityHidden(true) }
}

// "hoot." met de rode punt, als tekening (`BrandWord`), zoals op de website: in de Editie op de
// kleinste maat van het merk (64 breed, 20 hoog), dezelfde als in het welkom. Groeit begrensd mee
// met de tekst (tot xxLarge). Met `handoff` meldt dit woordmerk waar het staat (`BrandHandoff`), zodat
// het opstartscherm er precies op kan landen; alleen dat in de Editie, anders overschrijft het welkom
// de plek van `IntroMark`.
struct Wordmark: View {
    var handoff = false
    var body: some View {
        WordmarkBody(handoff: handoff)
            .dynamicTypeSize(...DynamicTypeSize.xxLarge)
            .accessibilityElement()
            .accessibilityLabel("Hoot")
            .accessibilityAddTraits(.isHeader)
    }
}

private struct WordmarkBody: View {
    let handoff: Bool
    @Environment(\.brandHandoff) private var brand
    @ScaledMetric(relativeTo: .title3) private var scale = WelcomeMark.scale

    var body: some View {
        BrandWord(scale: scale, handoff: handoff ? brand : nil)
            // Niet meer in beeld (ander tabblad, scherm weg): dan valt er niets te landen.
            .onDisappear { if handoff { brand?.word = nil; brand?.dot = nil } }
    }
}

struct Kicker: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let text: String?
    // De telling van de Editie (T3): "01 · BUITENLAND". Het nummer in de schreef van de koppen, zwaar en
    // in tabelcijfers, rood; gelezen in ink3, net als de kop. Zonder rubriek staat het nummer alleen.
    var number: Int? = nil
    var read = false
    private func label(_ s: String) -> String { typeSize.isAccessibilitySize ? s : s.uppercased() }
    private var dot: Text { Text(" · ").foregroundStyle(Theme.ink3) }
    var body: some View {
        let parts = text.map { $0.isEmpty ? [] : $0.components(separatedBy: " · ") } ?? []
        if number != nil || !parts.isEmpty {
            // Bij heel grote tekst geen kapitalen: die worden dan breder en zwaarder dan de kop.
            // Meerdere labels ("Binnenland · Buiten je bronnen"): de punt ertussen in `ink3`.
            let labels = parts.map { Text(label($0)).foregroundStyle(Theme.accent) }
            let rubric = labels.dropFirst().reduce(labels.first ?? Text("")) { acc, p in Text("\(acc)\(dot)\(p)") }
            let joined: Text = {
                guard let number else { return rubric }
                let n = Text(String(format: "%02d", number))
                    .font(.system(.headline, design: .serif, weight: .heavy).monospacedDigit())
                    .foregroundStyle(read ? Theme.ink3 : Theme.accent)
                return parts.isEmpty ? n : Text("\(n)\(dot)\(rubric)")
            }()
            if typeSize.isAccessibilitySize {
                joined.font(.caption.weight(.semibold))
            } else {
                joined.font(.caption.weight(.heavy)).tracking(0.6)
            }
        }
    }
}

// Het waarom van een plek in jouw Editie (Desk.why, zoals Why.js op de website): direct onder de rubriek,
// boven de kop, maar stil: inkt-3, de maat van het label, een gewone zin zonder kapitalen en zonder rood.
// De kop blijft het zwaarste element; het waarom is het zachtste erboven.
struct WhyLine: View {
    let text: String?
    var body: some View {
        if let text, !text.isEmpty {
            Text(text)
                .font(.caption)
                .foregroundStyle(Theme.ink3)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityLabel("Waarom: \(text)")
        }
    }
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
            // Op wit, net als SourceAvatar: een doorzichtig logo (de zwarte P van Het Parool)
            // verdwijnt anders in donker.
            if let image = phase.image { image.resizable().scaledToFill().background(Color.white) } else { Circle().fill(.quaternary) }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(Theme.rule, lineWidth: 1))
        .accessibilityHidden(true)
    }
}

// Bron, tijd en (als het verhaal meer bronnen heeft) "Vergelijk N bronnen".
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
        // "Vergelijk N bronnen" zegt dat het iets anders is dan filteren; is de regel te smal
        // (iPhone mini, grote tekst), dan eerst het korte "+N bronnen", pas daarna twee regels.
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Space.s2) { source(oneLine: true); Spacer(minLength: 8); more(compact: false); SaveButton(item: item) }
            HStack(spacing: Space.s2) { source(oneLine: true); Spacer(minLength: 8); more(compact: true); SaveButton(item: item) }
            VStack(alignment: .leading, spacing: Space.s1) {
                source(oneLine: false)
                HStack { more(compact: nil); Spacer(); SaveButton(item: item) }
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
                Text(meta).font(.caption).monospacedDigit().foregroundStyle(Theme.ink3) // tabelcijfers: de tijden staan in een kolom
            }
            .lineLimit(oneLine ? 1 : nil)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var meta: String {
        [HootDate.ago(item.date), store.source(item.source)?.paid == true ? "abonnement" : nil].compactMap { $0 }.joined(separator: " · ")
    }

    // `compact`: true = "+N bronnen", false = "Vergelijk N bronnen", nil = wat past.
    @ViewBuilder private func more(compact: Bool?) -> some View {
        if let story, let count = story.sourceCount, count > 1 {
            let others = count - 1
            let long = moreLabel("Vergelijk \(count) bronnen")
            let short = moreLabel(others == 1 ? "+1 bron" : "+\(others) bronnen")
            // Het stuk waarop je tikte is de kop in Vergelijken, niet een ander stuk uit de bundel.
            NavigationLink(value: tapped(story)) {
                switch compact {
                case true?: short
                case false?: long
                case nil: ViewThatFits(in: .horizontal) { long; short }
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(others == 1 ? "Vergelijk met 1 andere bron" : "Vergelijk met \(others) andere bronnen")
        }
    }

    private func tapped(_ story: Story) -> Story {
        var s = story
        s.tappedId = item.id
        return s
    }

    private func moreLabel(_ text: String) -> some View {
        Text(text)
            .font(.subheadline.weight(.bold))
            .foregroundStyle(Theme.accent)
            .lineLimit(1)
            .fixedSize() // nooit afgekapt: dan liever de korte vorm
            .frame(minHeight: 44) // een aanraakvlak van 44 pt, los van het artikel erboven
            .contentShape(Rectangle())
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

// Tik = lezen; lang drukken = bewaren, delen of openen in Safari, en in de Editie: meer of minder hiervan.
struct ArticleActions: ViewModifier {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader
    @Environment(\.tasteVote) private var tasteVote
    let item: Item
    func body(content: Content) -> some View {
        Button { reader.open(item, store: store) } label: { content }
            .buttonStyle(.plain)
            .hoverEffect(.highlight) // muis of trackpad op iPad
            .contextMenu {
                Button(store.isSaved(item) ? "Verwijder uit Bewaard" : "Bewaar", systemImage: store.isSaved(item) ? "bookmark.slash" : "bookmark") { store.toggleSave(item) }
                if let link = item.link {
                    ShareItemLink(item: item, link: link)
                    Link(destination: link) { Label("Open in Safari", systemImage: "safari") }
                }
                if let tasteVote {
                    Section {
                        Button("Meer hiervan", systemImage: "hand.thumbsup") { tasteVote(true) }
                        Button("Minder hiervan", systemImage: "hand.thumbsdown") { tasteVote(false) }
                    }
                }
            }
    }
}

// Delen via het deelmenu van iOS: altijd de link van de uitgever (nooit een Hoot-link), met de
// Hoot-kop als voorbeeld, want betaalde sites geven het deelblad soms alleen "Abonneer nu".
// Geen apart bericht erbij: dan staat in Berichten de kop niet dubbel boven de rijke link.
// Zet in leeslijst, Instapaper en andere lezers staan er vanzelf in als ze er zijn.
struct ShareItemLink: View {
    let item: Item
    let link: URL
    var body: some View {
        let title = item.shareTitle
        if let image = ImageURL.url(item.image, .thumb) ?? item.avatar.flatMap(URL.init(string:)) {
            let preview = SharePreviewImage(url: image)
            ShareLink(item: link, subject: Text(title), preview: SharePreview(title, image: preview, icon: preview)) { label }
        } else {
            ShareLink(item: link, subject: Text(title), preview: SharePreview(title)) { label }
        }
    }

    private var label: some View { Label("Deel", systemImage: "square.and.arrow.up") }
}

// Het beeld bij het stuk (of anders het logo van de bron) bovenin het deelblad. Het deelblad haalt
// het pas op als het opengaat, en meestal staat het al in de cache.
struct SharePreviewImage: Transferable {
    let url: URL
    static var transferRepresentation: some TransferRepresentation {
        // Als PNG: het deelblad leest niet elk formaat (WebP van de NOS bijvoorbeeld).
        DataRepresentation(exportedContentType: .png) { image in
            let data = try await URLSession.shared.data(from: image.url).0
            guard let png = UIImage(data: data)?.pngData() else { throw URLError(.cannotDecodeContentData) }
            return png
        }
    }
}

extension Item {
    // Een Bluesky-post heeft geen kop: dan de titel van de gedeelde link, of het begin van de post.
    var shareTitle: String {
        if !title.isEmpty { return title }
        if let linkTitle, !linkTitle.isEmpty { return linkTitle }
        let text = summary ?? ""
        guard !text.isEmpty else { return sourceName ?? "Hoot" }
        guard text.count > 100 else { return text }
        let cut = text.prefix(100)
        return (cut.lastIndex(of: " ").map { String(cut[..<$0]) } ?? String(cut)) + "…"
    }
}

// Meer of minder hiervan: alleen in de Editie gezet (per plek), elders niet.
private struct TasteVoteKey: EnvironmentKey { static let defaultValue: (@MainActor (Bool) -> Void)? = nil }
extension EnvironmentValues {
    var tasteVote: (@MainActor (Bool) -> Void)? {
        get { self[TasteVoteKey.self] }
        set { self[TasteVoteKey.self] = newValue }
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
    var why: String? // het waarom van de plek (jouw Editie)
    var story: Story?
    var number: Int? // de telling van de Editie: 01 tot 10

    private var hasImage: Bool { store.showsImage(lead: true) && ImageURL.fitsHero(item.image) }

    private var image: some View {
        FramedImage(url: ImageURL.url(item.image, .large), ratio: spacious ? 3 / 2 : wide ? 2 : 16 / 9)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
    }

    private var text: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            // Rubriek en waarom dicht op elkaar (één blokje boven de kop), zoals op de website.
            if label != nil || why != nil || number != nil {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Kicker(text: label, number: number, read: store.isRead(item))
                    WhyLine(text: why)
                }
            }
            Text(item.title)
                .font(Theme.headline(wide ? .largeTitle : .title))
                .foregroundStyle(store.isRead(item) ? Theme.ink3 : Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            if let intro = item.summary.map({ wholeSentences($0) }), !intro.isEmpty {
                Text(intro).font(wide ? .title3 : .body).foregroundStyle(Theme.ink2).lineLimit(wide ? 6 : 5).fixedSize(horizontal: false, vertical: true)
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
// Twee indelingen (Instellingen › Lees de Stroom als; dezelfde keuze als op het web): "tijdlijn" —
// kop, intro, dan het beeld over de volle kolombreedte in 2:1, met de bronregel eronder — en
// "krant" — kop en intro links, een klein beeld in 3:2 rechts. Zonder `form` volgt de rij de
// instelling; de Editie legt krant vast. Een Bluesky-post (in Bewaard) houdt zijn eigen vorm.
// Het beeld wordt in zijn kader bijgesneden, nooit uitgerekt; een video toont zijn stilstaande beeld.
// Bij heel grote tekst past geen beeld naast de kop: dan staat het in beide vormen onder de tekst.
struct ItemRow: View {
    enum Form { case tijdlijn, krant }
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .title3) private var thumb: CGFloat = Layout.thumb
    let item: Item
    var label: String?
    var why: String? // het waarom van de plek (jouw Editie)
    var story: Story?
    var linkSource = true
    var form: Form?
    var number: Int? // de telling van de Editie: 01 tot 10

    private var chosen: Form { form ?? (store.layout == "krant" ? .krant : .tijdlijn) }
    private var timeline: Bool { !item.isPost && (chosen == .tijdlijn || typeSize.isAccessibilitySize) }
    // Het beeld bij het stuk, of anders het stilstaande beeld van zijn video.
    private func picture(_ kind: ImageURL.Kind) -> URL? { ImageURL.url(item.image, kind) ?? item.videoPosterURL }
    private var hasPicture: Bool { store.showsImage(lead: false) && (item.image != nil || item.videoPoster != nil) }
    // Groot genoeg voor de volle breedte (vanaf 400 px, zoals op het web); een videobeeld is dat altijd.
    private var fitsLarge: Bool { item.image == nil || ImageURL.fitsLarge(item.image) }

    var body: some View {
        // Onder een groot beeld iets meer lucht tot de bron (12), zoals op het web; naast een miniatuur 8.
        VStack(alignment: .leading, spacing: timeline ? Space.s3 : Space.s2) {
            Group {
                if timeline {
                    VStack(alignment: .leading, spacing: Space.s3) {
                        text
                        if hasPicture, fitsLarge {
                            FramedImage(url: picture(.large), ratio: 2)
                                .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                                .overlay { if item.video != nil { PlayBadge(size: Space.tap) } }
                        }
                    }
                } else {
                    HStack(alignment: .top, spacing: Space.s3) {
                        text.frame(maxWidth: .infinity, alignment: .leading)
                        // Een vaste breedte (96; bij grotere tekst 108), zodat de tekstkolom op één lijn blijft,
                        // wat de verhouding van het beeld ook is. Bij heel grote tekst krijgt de kop de hele breedte.
                        if hasPicture, !typeSize.isAccessibilitySize {
                            let width = thumb >= Layout.thumbLarge ? Layout.thumbLarge : Layout.thumb
                            RemoteImage(url: picture(.thumb))
                                .frame(width: width, height: width * 2 / 3)
                                .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
                                .overlay { if item.video != nil { PlayBadge(size: Space.s6) } }
                        }
                    }
                }
            }
            .contentShape(Rectangle())
            .opensArticle(item)
            SourceLine(item: item, story: story, linkSource: linkSource)
        }
        .padding(.vertical, Space.s2)
    }

    private var text: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            if label != nil || why != nil || number != nil {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Kicker(text: label, number: number, read: store.isRead(item))
                    WhyLine(text: why)
                }
            }
            if item.isPost {
                // Een Bluesky-post (in Bewaard): de tekst zelf, geen kop.
                Text(item.summary ?? "").font(.body).fixedSize(horizontal: false, vertical: true)
            } else {
                Text(item.title)
                    .font(Theme.headline(.title3))
                    .foregroundStyle(store.isRead(item) ? Theme.ink3 : Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                // Hele zinnen tot de maat van de regelinstelling (T2); de regelgrens is alleen een vangnet: één
                // regel extra, bij grotere tekst het dubbele (dezelfde tekens nemen dan meer regels, en een
                // afgeknipte zin zou alsnog op een beletselteken eindigen).
                if let intro = item.summary.map({ wholeSentences($0, max: introMax(lines: store.preview, thumb: hasPicture && !timeline)) }), !intro.isEmpty {
                    Text(intro).font(.subheadline).foregroundStyle(Theme.ink2).lineLimit(store.preview == 0 ? nil : typeSize > .large ? store.preview * 2 : store.preview + 1)
                }
            }
        }
    }
}

// Een afspeelknop midden op het stilstaande beeld van een video: er speelt hier niets, tikken opent het stuk.
private struct PlayBadge: View {
    let size: CGFloat
    var body: some View {
        Image(systemName: "play.fill")
            .font(.system(size: size * 0.4, weight: .bold))
            .foregroundStyle(Theme.ink)
            .frame(width: size, height: size)
            .background(Theme.paper.opacity(0.92), in: Circle())
            .accessibilityHidden(true)
    }
}

// Verversen lukte niet: zeg eerlijk dat je de laatste versie ziet, met een knop om het opnieuw te
// proberen. Geen kloktijd (huisregel), en geen vlak: een haarlijn op papier, zodat de melding naast
// het nieuws staat in plaats van erbovenop. 'Opnieuw' in inkt, niet in het rood van de tint.
struct StaleNotice: View {
    @Environment(HootStore.self) private var store
    var gap: CGFloat = Space.s3 // ruimte eronder; in de Editie 16, gelijk aan die tussen datum en melding
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        if store.stale {
            // Midden uitgelijnd: bij twee regels erboven en eronder even veel ruimte. Bij heel grote
            // tekst staat de knop onder de zin, op dezelfde kolomlijn (anders breekt hij af: "Op-nieuw").
            HStack(spacing: Space.s3) {
                Image(systemName: "wifi.slash").foregroundStyle(Theme.ink3)
                if typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 0) {
                        message.padding(.top, Space.s2)
                        retry
                    }
                } else {
                    message
                    retry
                }
            }
            .padding(.horizontal, Space.s3)
            .padding(.vertical, Space.s1) // met de knop van 44 een melding van 52, ook als de zin twee regels neemt
            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
            .padding(.bottom, gap)
            .accessibilityElement(children: .combine)
        }
    }
    private var message: some View {
        Text("Verversen lukt nu niet. Je ziet de laatste versie.").font(.subheadline).foregroundStyle(Theme.ink3).frame(maxWidth: .infinity, alignment: .leading)
    }
    private var retry: some View {
        Button("Opnieuw") { Task { await store.load() } }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Theme.ink)
            .fixedSize()
            .frame(minHeight: Space.tap)
    }
}

struct EmptyState: View {
    let title: String
    let systemImage: String
    var text: String = ""
    // Opnieuw proberen als knop naast het trekgebaar (dat niet iedereen kent of kan maken).
    var retry: (() async -> Void)? = nil
    // Of een eigen vervolgstap als knop, zoals iemand toevoegen bij een lege Bluesky.
    var action: (label: String, systemImage: String, run: () -> Void)? = nil
    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(text).foregroundStyle(Theme.ink3) // niet het lichtere grijs van het systeem
        } actions: {
            if let retry { Button("Probeer opnieuw") { Task { await retry() } }.buttonStyle(.glass) }
            if let action { Button(action.label, systemImage: action.systemImage, action: action.run).buttonStyle(.glass) }
        }
    }
}
