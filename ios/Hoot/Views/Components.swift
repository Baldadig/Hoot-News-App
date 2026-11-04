import SafariServices
import SwiftUI
import UniformTypeIdentifiers

// Huisstijl: warm papier, inkt, krantenrood. Koppen in New York (de serif van het systeem: past
// bij Newsreader op het web en schaalt mee met Dynamische tekst), de rest in San Francisco.
enum Theme {
    // De kleuren van het design system (zelfde namen en waarden als src/styles.css).
    static let paper = Color(uiColor: NachtKleur.paper) // pagina
    static let surface = Color("Surface") // kaart, blad, melding
    static let ink = Color(uiColor: NachtKleur.ink) // koppen en tekst
    static let ink2 = Color(uiColor: NachtKleur.ink2) // intro's en samenvattingen
    // Metadata: tijd, bron-uitleg, toelichting. De ondergrens voor kleine tekst (5,2:1 licht, 6,7:1
    // donker); nooit het lichtere grijs van het systeem (3,3:1 op papier).
    static let ink3 = Color(uiColor: NachtKleur.ink3)
    static let rule = Color("Rule") // haarlijn, decoratief
    static let edge = Color("Edge") // rand van velden en knoppen die iets betekenen (3:1)
    static let accentSoft = Color("AccentSoft") // achtergrond van iets dat aan staat
    static let onAccent = Color("OnAccent") // tekst op een accent-vlak
    static let warn = Color("Warn") // waarschuwing, altijd met woorden
    // Merkrood: het diepe krantenrood als vol vlak, in licht en donker gelijk. Alleen voor
    // merkmomenten (opstarten, welkom, einde van de editie); verder is het accent een detail.
    static let brandRed = Color("BrandRed")
    static let onBrandRed = Color("OnBrandRed") // alles op merkrood: papier #F5F1E8 (6,9:1), zoals het opstartscherm
    static let accent = Color(uiColor: NachtKleur.accent) // de kleur zelf: "accentColor" volgt de tint, en die valt soms terug op systeemblauw
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
    @Environment(\.nachtActief) private var nacht
    let url: URL
    var reader = false
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = reader
        let vc = SFSafariViewController(url: url, configuration: config)
        if nacht { vc.preferredBarTintColor = .black; vc.view.backgroundColor = .black }
        vc.dismissButtonStyle = .close
        return vc
    }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

// Een schakelaar die aan staat is inkt (brandboard; .switch op het web). In donker is inkt licht en
// verdwijnt de witte duim van iOS erin; het web maakt de duim daar papier, maar dat laat iOS niet toe.
// Daarom in donker ink3: de baan blijft neutraal en de duim blijft te zien.
struct InkSwitch: ToggleStyle {
    @Environment(\.nachtActief) private var nacht
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var still
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            HStack {
                configuration.label
                Spacer(minLength: Space.s3)
                Capsule().fill(configuration.isOn ? Theme.ink : Theme.ink.opacity(0.16))
                    .frame(width: 51, height: 31)
                    .overlay(alignment: configuration.isOn ? .trailing : .leading) {
                        Circle().fill(configuration.isOn && scheme == .dark ? Theme.paper : nacht ? Theme.ink : .white)
                            .frame(width: 27, height: 27).padding(2)
                    }
            }.frame(minHeight: Space.tap).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .animation(still ? nil : .easeOut(duration: 0.14), value: configuration.isOn)
        .accessibilityRepresentation { Toggle(isOn: configuration.$isOn) { configuration.label }.toggleStyle(.switch) }
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

// De schermtitel als eerste regel in de scroll (C7): bewust stil tegenover het hoofdverhaal, zoals
// .head-5 tegenover .head-6 op het web. De navigatiebalk staat inline; zijn titel blijft voor
// VoiceOver en de terugknop, deze is wat je ziet. Onder de titel staat op elk scherm dezelfde lucht
// (s2) tot wat volgt; alleen de metaregel van de Editie hoort bij de titel en sluit aan (gap 0).
struct ScreenTitle: View {
    let text: String
    var gap: CGFloat = Space.s2
    init(_ text: String, gap: CGFloat = Space.s2) { self.text = text; self.gap = gap }
    var body: some View {
        Text(text)
            .font(Theme.headline(.title))
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.bottom, gap)
            .accessibilityAddTraits(.isHeader)
    }
}

extension View {
    // Een hoofdscherm met de titel in de scroll: de balk inline en zonder eigen titel, zodat die niet
    // dubbel staat. De navigationTitle blijft voor VoiceOver, de terugknop en het tabblad.
    func hootScreenTitle() -> some View {
        navigationBarTitleDisplayMode(.inline).toolbar(removing: .title)
    }
}

// Haarlijn tussen berichten: `rule`, één pixel, decoratief.
struct Rule: View {
    var body: some View { Rectangle().fill(Theme.rule).frame(height: 1).accessibilityHidden(true) }
}

// "hoot." met de rode punt, als tekening (`BrandWord`), zoals op de website: in de Editie op de
// kleinste maat van het merk (64 breed, 20 hoog), dezelfde als in het welkom. Groeit begrensd mee
// met de tekst (tot xxLarge). Met `handoff` meldt dit woordmerk waar het staat (`BrandHandoff`), zodat
// het opstartscherm er precies op kan landen. Alleen het actieve tabblad meldt zijn positie.
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
    @State private var targetID = UUID()

    var body: some View {
        BrandWord(scale: scale, handoff: handoff ? brand : nil, handoffOwner: targetID)
            // Niet meer in beeld (ander tabblad, scherm weg): dan valt er niets te landen.
            .onDisappear { if handoff { brand?.clearTarget(owner: targetID) } }
    }
}

// De kopregel van Editie, Stroom en Selectie (bovenbalk A, 1.1.0): "hoot." links, het tandwiel (en in
// de Stroom de bronnen) rechts, als gewone regel in de scroll. Hij scrolt mee; er hangt geen balk
// meer over de koppen en foto's. Het eerste en het laatste teken staan optisch op de kolomlijn: het
// icoon is 24 in een raakvlak van 44, dus de rij schuift (44 − 24) / 2 de goot in, zoals --tap-inset
// op het web. Gelijk aan de kop op het web (.edbrand en .vh__row).
struct HootKop<Extra: View>: View {
    @Environment(\.openSettings) private var openSettings
    var gearX: ((CGFloat) -> Void)? = nil // waar het tandwiel staat (de stapel van de Stroom eindigt eronder)
    @ViewBuilder var extra: () -> Extra

    var body: some View {
        HStack(spacing: 0) {
            Wordmark(handoff: true)
            Spacer(minLength: Space.s3)
            extra()
            Button { openSettings() } label: {
                Image(systemName: "gearshape").font(.title3).frame(width: Space.tap, height: Space.tap).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(Theme.ink3) // bediening is stil: grijs, zonder glazen rondje
            .accessibilityLabel("Instellingen")
            .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).midX } action: { gearX?($0) }
            .padding(.trailing, -HootKop.inset)
        }
        .frame(minHeight: Space.tap)
    }

    static var inset: CGFloat { (Space.tap - 24) / 2 }
}

extension HootKop where Extra == EmptyView {
    init(gearX: ((CGFloat) -> Void)? = nil) { self.init(gearX: gearX) { EmptyView() } }
}

// Een knop in de kopregel naast het tandwiel (de bronnen in de Stroom): 24 in een raakvlak van 44.
struct HootKopButton: View {
    let label: String
    let systemImage: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage).font(.title3).frame(width: Space.tap, height: Space.tap).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(Theme.ink3)
        .accessibilityLabel(label)
    }
}

extension View {
    // Een hoofdscherm met de kopregel in de scroll: geen navigatiebalk, en achter de statusbalk een
    // vlakke strook papier precies zo hoog als die balk (geen vervaging, geen verloop), zodat de
    // statusbalk ook boven een foto leesbaar blijft. In Nacht is het papier zwart.
    func hootKopScreen() -> some View {
        toolbar(.hidden, for: .navigationBar)
            .overlay(alignment: .top) { StatusStrip() }
    }
}

// De strook achter de statusbalk: precies zo hoog als de statusbalk van het venster (op iPad niet de
// zwevende tabbalk eronder), vanaf de bovenrand van het scherm. Gemeten aan het venster zelf, zodat
// het niet uitmaakt waar de scroll zijn veilige zone laat beginnen; opnieuw bij draaien.
struct StatusStrip: View {
    @State private var top: CGFloat = StatusStrip.windowTop()
    var body: some View {
        Theme.paper
            .frame(height: top)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .ignoresSafeArea()
            .allowsHitTesting(false)
            .accessibilityHidden(true)
            .onGeometryChange(for: CGSize.self) { $0.size } action: { _ in top = Self.windowTop() }
    }

    static func windowTop() -> CGFloat {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap(\.windows).first { $0.isKeyWindow } ?? scenes.first?.windows.first
        return window?.safeAreaInsets.top ?? 0
    }
}

// Dezelfde merkkop op de overige schermen (Bewaard, Zoeken): in de balk, zonder glazen achtergrond.
extension View {
    func hootBrandHeader() -> some View {
        toolbar {
            ToolbarItem(placement: .topBarLeading) { Wordmark(handoff: true) }
                .sharedBackgroundVisibility(.hidden)
        }
    }
}

// Systeemserif is de native tegenhanger van Newsreader. Cijfers blijven tabelcijfers.
struct EditionNumber: View {
    @Environment(\.isWide) private var wide
    let number: Int?
    var read = false
    var body: some View {
        if let number {
            Text(String(format: "%02d", number))
                .font(.system(.callout, design: .serif, weight: .heavy)).monospacedDigit()
                .frame(minWidth: wide ? 24 : nil, alignment: .leading)
                .foregroundStyle(read ? Theme.ink3 : Theme.ink) // minder rood (B): het cijfer in inkt
        }
    }
}

struct Kicker: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let text: String?
    var number: Int? = nil
    var read = false
    private func label(_ s: String) -> String { typeSize.isAccessibilitySize ? s : s.uppercased() }
    private var dot: Text { Text(" · ").foregroundStyle(Theme.ink3) }
    var body: some View {
        let parts = text.map { $0.isEmpty ? [] : $0.components(separatedBy: " · ") } ?? []
        HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
            EditionNumber(number: number, read: read)
            if number != nil && !parts.isEmpty { Text("·").font(.caption).foregroundStyle(Theme.ink3).accessibilityHidden(true) }
            if !parts.isEmpty {
            // Bij heel grote tekst geen kapitalen: die worden dan breder en zwaarder dan de kop.
            // Meerdere labels ("Binnenland · Buiten je bronnen"): de punt ertussen in `ink3`.
            // Minder rood (keuze B): de rubriek stil in ink3, het cijfer ervoor in inkt.
            let labels = parts.map { Text(label($0)).foregroundStyle(Theme.ink3) }
            let rubric = labels.dropFirst().reduce(labels.first ?? Text("")) { acc, p in Text("\(acc)\(dot)\(p)") }
            if typeSize.isAccessibilitySize {
                rubric.font(.caption.weight(.semibold))
            } else {
                rubric.font(.caption.weight(.heavy)).tracking(0.6)
            }
        }
        }
    }
}

// Het waarom van een plek in jouw Editie (Desk.why, zoals Why.js op de website): direct onder de rubriek,
// boven de kop, rustig maar leesbaar: inkt-2, subheadline, een gewone zin zonder kapitalen en zonder rood.
// De kop blijft het zwaarste element; het waarom blijft ondergeschikt.
struct WhyLine: View {
    let text: String?
    // Het aantal bronnen staat al in de bronregel ("12 bronnen ›"): "Groot nieuws · 12 bronnen" wordt
    // "Groot nieuws" (E6). Gelijk aan plainWhy in src/components/Why.js.
    static func plain(_ s: String) -> String { s.replacingOccurrences(of: #"\s*·\s*\d+\s+bron(?:nen)?$"#, with: "", options: .regularExpression) }
    var body: some View {
        if let text = text.map(Self.plain), !text.isEmpty {
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Theme.ink2)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityLabel("Waarom: \(text)")
        }
    }
}

struct RemoteImage: View {
    let url: URL?
    @State private var loader = RemoteImageLoader()
    var body: some View {
        Group {
            if let image = loader.image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Rectangle().fill(.quaternary)
            }
        }
        .task(id: url) { await loader.load(url) }
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

// Geen logo (nog niet binnen, of kapot): het monogram, zoals op het web (.mark) en op de deelkaart
// (BRAND-UPDATE §9). De eerste letter in de serif op de tint van de bron (16 % over `surface`); in
// Licht de letter in de bronkleur, in Donker en Nacht in inkt. Geen bronkleur: het accent; in Nacht
// is de tint inkt (zoals --brand daar op het web).
struct Monogram: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.nachtActief) private var nacht
    let name: String
    var brandColor: String?
    var size: CGFloat
    private var brand: Color {
        if nacht { return Theme.ink }
        guard let hex = brandColor.map({ $0.trimmingCharacters(in: CharacterSet(charactersIn: "#")) }), hex.count == 6, let v = UInt32(hex, radix: 16) else { return Theme.accent }
        return Color(red: Double(v >> 16 & 0xFF) / 255, green: Double(v >> 8 & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
    var body: some View {
        Text(String(name.trimmingCharacters(in: .whitespaces).prefix(1)))
            .font(.system(size: size * 0.5, weight: .heavy, design: .serif))
            .foregroundStyle(scheme == .dark || nacht ? Theme.ink : brand)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { ZStack { Theme.surface; brand.opacity(0.16) } }
    }
}

struct SourceMark: View {
    let item: Item
    var size: CGFloat = 24
    var body: some View {
        AsyncImage(url: item.avatar.flatMap(URL.init(string:))) { phase in
            // Op wit, net als SourceAvatar: een doorzichtig logo (de zwarte P van Het Parool)
            // verdwijnt anders in donker.
            if let image = phase.image { image.resizable().scaledToFill().background(Color.white) } else { Monogram(name: item.sourceName ?? item.source, brandColor: item.brandColor, size: size) }
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
    var outside = false // het verhaal staat buiten de bronnen die je volgt
    var body: some View {
        // Op één regel als het past; anders bron en tijd bovenaan (mogen afbreken) en de knoppen
        // eronder. Nooit een vaste breedte: bij heel grote tekst duwt die anders de hele kolom
        // buiten het scherm.
        // Eén bronlabel, overal hetzelfde: "N bronnen ›" (minder rood, keuze B). Is de regel te smal
        // (iPhone mini, grote tekst), dan bron en tijd bovenaan en label en bewaren eronder.
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
                Text(meta).font(.caption).monospacedDigit().foregroundStyle(Theme.ink3) // tabelcijfers: de tijden staan in een kolom
            }
            .lineLimit(oneLine ? 1 : nil)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var meta: String {
        [HootDate.ago(item.date), store.source(item.source)?.paid == true ? "abonnement" : nil, outside ? StoryLabel.outsideText : nil].compactMap { $0 }.joined(separator: " · ")
    }

    // "N bronnen ›": altijd het totaal, in ink2. Gelijk aan bronnenLabel in src/components/Items.jsx.
    static func label(_ count: Int) -> String { count == 1 ? "1 bron" : "\(count) bronnen" }

    @ViewBuilder private var more: some View {
        if let story, let count = story.sourceCount, count > 1 {
            // Het stuk waarop je tikte is de kop in Vergelijken, niet een ander stuk uit de bundel.
            NavigationLink(value: tapped(story)) { moreLabel(Self.label(count)) }
                .buttonStyle(.plain)
                .accessibilityLabel("Vergelijk \(count) bronnen")
        }
    }

    private func tapped(_ story: Story) -> Story {
        var s = story
        s.tappedId = item.id
        return s
    }

    private func moreLabel(_ text: String) -> some View {
        HStack(spacing: Space.s1) {
            Text(text).monospacedDigit()
            Image(systemName: "chevron.right").font(.caption2.weight(.semibold)).accessibilityHidden(true)
        }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Theme.ink2)
            .lineLimit(1)
            .fixedSize() // nooit afgekapt: dan liever twee regels
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

// Tik = lezen; lang drukken = bewaren, delen, smaak kiezen of een lokale foutmelding bewaren.
struct ArticleActions: ViewModifier {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader
    @Environment(\.tasteVote) private var tasteVote
    @State private var noticeTitle = ""
    @State private var noticeText = ""
    @State private var noticeOpen = false
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
                if !item.isPost {
                    Section {
                        Button("Meer hiervan", systemImage: "hand.thumbsup") { respond(true) }
                        Button("Minder hiervan", systemImage: "hand.thumbsdown") { respond(false) }
                    }
                    Menu("Klopt dit niet?", systemImage: "flag") {
                        ForEach(CorrectionReason.allCases, id: \.self) { reason in
                            Button(reason.label) {
                                let ok = store.reportMistake(item,reason:reason)
                                noticeTitle = ok ? "Melding bewaard" : "Niet bewaard"
                                noticeText = ok ? "De melding staat op dit toestel en is nog niet verstuurd." : "Probeer het later opnieuw."
                                noticeOpen = true
                            }
                        }
                    }
                }
            }
            .alert(noticeTitle,isPresented:$noticeOpen) { Button("Oké",role:.cancel) {} } message: { Text(noticeText) }
    }
    private func respond(_ up: Bool) {
        if let tasteVote { tasteVote(up) }
        else {
            let story = store.story(of:item)
            let members = [item] + (story?.itemIds ?? []).filter{$0 != item.id}.compactMap{store.itemsById[$0]}
            store.vote(story?.id ?? item.id,items:members,up:up)
            noticeTitle = "Voorkeur bewaard"
            noticeText = "Telt vanaf je volgende Editie."
            noticeOpen = true
        }
    }
}

// Artikelen delen als Hoot-krantenkop. Posts behouden hun eigen link en voorbeeld.
struct ShareItemLink: View {
    @Environment(HootStore.self) private var store
    let item: Item
    let link: URL
    private var cardItem: Item {
        var value = item
        if value.section == nil {
            let labels = ["binnenland": "Binnenland", "buitenland": "Wereld", "wereld": "Wereld", "economie": "Economie", "tech": "Tech", "wetenschap": "Wetenschap", "cultuur": "Cultuur", "sport": "Sport", "politiek": "Politiek", "music": "Cultuur"]
            value.section = store.source(item.source)?.cat.flatMap { labels[$0] } ?? "Nieuws"
        }
        return value
    }
    var body: some View {
        if item.isPost {
            if let image = ImageURL.url(item.image, .thumb) ?? item.avatar.flatMap(URL.init(string:)) {
                let preview = SharePreviewImage(url: image)
                ShareLink(item: link, subject: Text(item.shareTitle), preview: SharePreview(item.shareTitle, image: preview, icon: preview)) { label }
            } else {
                ShareLink(item: link, subject: Text(item.shareTitle), preview: SharePreview(item.shareTitle)) { label }
            }
        } else {
            ShareLink(item: DeelKaartExport(item: cardItem), subject: Text(item.shareTitle),
                      preview: SharePreview(item.shareTitle, image: DeelKaartExport(item: cardItem, format: .link))) { label }
        }
    }
    private var label: some View { Label("Deel", systemImage: "square.and.arrow.up") }
}

struct SharePreviewImage: Transferable {
    let url: URL
    static var transferRepresentation: some TransferRepresentation {
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
    var number: Int? = nil
    var label: String?
    var why: String? // het waarom van de plek (jouw Editie)
    var outside = false // buiten je bronnen: de bronregel zegt het
    var story: Story?
    var hang = false // iPad staand (B): het nummer in de kantlijn, het beeld over de hele kolom
    var imageHeight: CGFloat? = nil // iPad liggend (A): het beeld zo hoog als de zijkolom ernaast

    private var hasImage: Bool { store.showsImage(lead: true) && ImageURL.fitsHero(item.image) }

    @ViewBuilder private var image: some View {
        if let imageHeight {
            RemoteImage(url: ImageURL.url(item.image, .large))
                .frame(maxWidth: .infinity)
                .frame(height: imageHeight)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        } else {
            MeasuredLeadImage(item: item, spacious: spacious)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        }
    }

    private var text: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            // Rubriek en waarom dicht op elkaar (één blokje boven de kop), zoals op de website.
            if number != nil || label != nil || why != nil {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Kicker(text: label, number: hang ? nil : number, read: store.isRead(item))
                    WhyLine(text: why)
                }
            }
            Text(item.title)
                .font(Theme.headline(EditionDisplay.headlineStyle(item.title))) // bestaande rollen, passend bij de koplengte
                .foregroundStyle(store.isRead(item) ? Theme.ink3 : Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            if let intro = item.summary.map({ wholeSentences($0, max: 240) }), !intro.isEmpty {
                Text(intro).font(wide ? .title3 : .body).foregroundStyle(Theme.ink2).lineLimit(wide ? 6 : 5).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    var body: some View {
        if hang {
            // B: het beeld over de hele kolom, tekst en bronregel ingesprongen met het nummer ervoor.
            VStack(alignment: .leading, spacing: Space.s3) {
                if hasImage { image.contentShape(Rectangle()).opensArticle(item) }
                HangRow(number: number, read: store.isRead(item)) {
                    VStack(alignment: .leading, spacing: Space.s3) {
                        text.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle()).opensArticle(item)
                        SourceLine(item: item, story: story, outside: outside)
                    }
                }
            }
        } else {
            standard
        }
    }

    private var standard: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            Group {
                if spacious && imageHeight == nil && hasImage && item.imageMeta?.portrait == true {
                    HStack(alignment: .top, spacing: Space.s6) {
                        image.frame(width: 300)
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
            SourceLine(item: item, story: story, outside: outside)
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
    var number: Int? = nil
    var label: String?
    var why: String? // het waarom van de plek (jouw Editie)
    var outside = false // buiten je bronnen: de bronregel zegt het
    var story: Story?
    var linkSource = true
    var form: Form?
    var boven: CGFloat? = nil // in een paar (A): het beeld groot boven het verhaal, zo hoog
    var pinSource = false // in een paar (A): de bronregel onderaan de rij

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
                if let boven, hasPicture {
                    VStack(alignment: .leading, spacing: Space.s3) {
                        RemoteImage(url: picture(.large))
                            .frame(maxWidth: .infinity)
                            .frame(height: boven)
                            .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                        text
                    }
                } else if timeline {
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
            if pinSource { Spacer(minLength: 0) }
            SourceLine(item: item, story: story, linkSource: linkSource, outside: outside)
        }
        .padding(.vertical, Space.s2)
    }

    private var text: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            if number != nil || label != nil || why != nil {
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
                    .lineSpacing(2)
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

// Een lege plek (K6), gelijk aan .empty op het web: een stil lijnicoon in `rule`, de titel als
// serifkop in inkt, s2 lucht, de uitleg in ink2 (.empty__text) op een smalle maat en een inktknop als vervolgstap. Het blijft
// een eigen compositie; foutstaten behouden de systeemweergave.
struct EmptyState: View {
    @Environment(\.accessibilityReduceMotion) private var still
    @State private var presented = false
    let title: String
    let systemImage: String
    var text: String = ""
    // Opnieuw proberen als knop naast het trekgebaar (dat niet iedereen kent of kan maken).
    var retry: (() async -> Void)? = nil
    // Of een eigen vervolgstap als knop, zoals iemand toevoegen bij een lege Bluesky.
    var action: (label: String, systemImage: String?, run: () -> Void)? = nil
    var body: some View {
        if retry == nil {
            VStack(spacing: Space.s3) {
                EmptyPageArt(kind: EmptyPageKind(symbol: systemImage))
                Group {
                Text(title).font(Theme.headline(.title2)).foregroundStyle(Theme.ink)
                if !text.isEmpty { Text(text).foregroundStyle(Theme.ink2).multilineTextAlignment(.center).frame(maxWidth: Layout.emptyText) }
                if let action {
                    Button(action: action.run) { Text(action.label) }.buttonStyle(.ink)
                }
                }.opacity(still || presented ? 1 : 0).offset(y: still || presented ? 0 : 10)
            }.padding(.vertical, Space.s7).frame(maxWidth: .infinity, minHeight: 360)
                .task {
                    guard !still else { presented = true; return }
                    try? await Task.sleep(for: .milliseconds(540))
                    guard !Task.isCancelled else { return }
                    withAnimation(.easeOut(duration: 0.2)) { presented = true }
                }
        } else {
        ContentUnavailableView {
            Label {
                Text(title).font(Theme.headline(.title2)).foregroundStyle(Theme.ink)
                    .padding(.bottom, Space.s2) // lucht tussen titel en uitleg, zoals .empty__title
            } icon: {
                // Op maat via een frame: een lettergrootte zet ContentUnavailableView zelf terug.
                Image(systemName: systemImage)
                    .resizable()
                    .fontWeight(.ultraLight)
                    .scaledToFit()
                    .frame(width: Layout.emptyIcon, height: Layout.emptyIcon)
                    .foregroundStyle(Theme.rule) // decoratief: de lijn, geen grijs systeemicoon
            }
        } description: {
            Text(text)
                .foregroundStyle(Theme.ink2) // zoals .empty__text, niet het lichtere grijs van het systeem
                .multilineTextAlignment(.center)
                .frame(maxWidth: Layout.emptyText)
        } actions: {
            // De inktknop, zoals op het web: één vervolgstap, inkt op papier.
            if let retry { Button("Probeer opnieuw") { Task { await retry() } }.buttonStyle(.ink) }
            if let action {
                Button(action: action.run) {
                    if let icon = action.systemImage { Label(action.label, systemImage: icon) } else { Text(action.label) }
                }
                .buttonStyle(.ink)
            }
        }
        }
    }
}
