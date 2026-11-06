import SwiftUI
import WebKit

// De Hoot-lezer: het artikel in de opmaak van Hoot (krantenletter, papier, jouw tekstgrootte),
// met bewaren, delen en "bij de uitgever" bovenin. Lukt het niet, dan zeggen we dat en kun je naar
// de website.
struct ArticleReaderView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.nachtActief) private var nacht
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(Reader.self) private var reader: Reader? // het geladen artikel en je plek, voor vouwen (Duo)
    @Environment(\.krantPagina) private var opPagina // open op de Duo: de lezer staat op de rechterbladzijde
    @State private var width: CGFloat = 0 // breedte van de lezer, om te zien welk woord in de kop niet past
    let item: Item
    @State private var loader = ArticleLoader()
    @State private var waiting = ReaderWaitingState()
    @State private var holding = false // het artikel is er, de laadstrepen maken hun beweging nog af
    @AppStorage("hoot.readerSize") private var size = 1
    @State private var login: LoginTarget?
    @State private var signedIn = false // ingelogd bij deze uitgever: dan geen balk "Zie je maar een deel?"
    @State private var loginReminders = ReaderLoginReminderStore()
    @State private var loginPanelVisible = false
    @State private var welcome = false // even de bevestiging na het inloggen

    private var source: Source? { store.source(item.source) }
    private var loginURL: URL? { source.flatMap { PublisherLogin.url(for: $0, store: store) } ?? item.link.flatMap(LoginTarget.home) }
    private var domain: String? { loginURL.flatMap(PublisherLogin.domain(of:)) }
    private var sourceName: String { item.sourceName ?? source?.name ?? "" }

    private var shouldOfferLogin: Bool {
        guard case let .ready(article) = loader.state else { return false }
        return source?.paid == true && article.length < 2500 && !signedIn && loginURL != nil
    }

    static let failedTitle = "Dit artikel lukt even niet in de lezer"
    static let failedText = "Soms laadt de pagina niet goed. Probeer het opnieuw, of lees het op de website."

    var body: some View {
        NavigationStack {
            Group {
                switch holding ? ArticleLoader.State.loading : loader.state {
                case .loading:
                    ReaderLoadingView(title: item.title.isEmpty ? (item.summary ?? "") : typeset(item.title, lang: source?.lang), sourceName: sourceName, waiting: waiting)
                case let .ready(article):
                    ArticleWebView(html: ReaderHTML.page(article, item: item, sourceName: sourceName, size: size, lang: source?.lang, night: nacht, typeSize: typeSize, width: width, pagina: opPagina), baseURL: item.link,
                                   plek: reader?.plek(voor: item.id), bewaarPlek: { [reader, id = item.id] in reader?.bewaarPlek($0, voor: id) })
                        .ignoresSafeArea(edges: .bottom)
                        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
                        .safeAreaInset(edge: .bottom) {
                            if loginPanelVisible && shouldOfferLogin {
                                ReaderLoginPanel(sourceName: sourceName, login: {
                                    login = LoginTarget(name: sourceName, url: loginURL)
                                }, close: closeLoginPanel)
                            }
                        }
                case .visit:
                    VStack(spacing: 0) {
                        WebPage(webView: loader.webView)
                        VStack(spacing: Space.s2) {
                            Text(loader.visitByChoice ? "Dit is de pagina van \(sourceName). Probeer de lezer opnieuw, of lees hier verder." : "\(sourceName) vraagt eerst om toestemming of om in te loggen. Kies wat je wilt; daarna gaat de lezer verder.")
                                .font(.ui(.footnote))
                                .foregroundStyle(Theme.ink3)
                                .multilineTextAlignment(.center)
                            Button("Verder naar de lezer") { loader.retry() }.buttonStyle(.ink)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(nacht ? AnyShapeStyle(Theme.paper) : AnyShapeStyle(.bar))
                    }
                case .failed:
                    // Na één stille nieuwe poging (ArticleLoader.temporaryFailure): vaak is het tijdelijk.
                    ContentUnavailableView {
                        Label(Self.failedTitle, systemImage: "doc.text.magnifyingglass")
                    } description: {
                        Text(Self.failedText).zin()
                    } actions: {
                        Button("Probeer opnieuw") { loader.reload() }.buttonStyle(.ink)
                        Button("Open op de website") { if let url = item.link { openURL(url) } }.buttonStyle(.glass)
                        Button("Toon de pagina hier") { loader.showPage() }.buttonStyle(.glass)
                    }
                }
            }
            .background(Theme.paper)
            .navigationBarTitleDisplayMode(.inline)
            // De werkbalk is stil: iconen in ink3. Alleen bewaard springt eruit, in rood (SaveButton).
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    // Op de bladzijde (Duo open) is de lezer geen blad: sluiten is de bladzijde leeg maken.
                    Button("Sluit", systemImage: "xmark") { if opPagina { reader?.item = nil } else { dismiss() } }.tint(Theme.ink3)
                }
                ToolbarItemGroup(placement: .primaryAction) {
                    Menu {
                        Picker("Tekstgrootte", selection: $size) {
                            Text("Klein").tag(0)
                            Text("Normaal").tag(1)
                            Text("Groot").tag(2)
                            Text("Heel groot").tag(3)
                        }
                    } label: {
                        Label("Tekstgrootte", systemImage: "textformat.size")
                    }
                    .tint(Theme.ink3)
                    if let link = item.link {
                        ShareItemLink(item: item, link: link).tint(Theme.ink3)
                        Button("Open bij \(sourceName)", systemImage: "safari") { openURL(link) }.tint(Theme.ink3)
                    }
                    SaveButton(item: item)
                }
            }
            // Na inloggen: bevestigen en het artikel opnieuw laden, nu met je abonnement.
            .sheet(item: $login, onDismiss: afterLogin) { target in LoginWebView(target: target) }
            .overlay(alignment: .top) {
                if welcome {
                    Label("Ingelogd bij \(sourceName)", systemImage: "checkmark.circle.fill")
                        .font(.ui(.subheadline, .semibold))
                        .foregroundStyle(Theme.paper)
                        .padding(.horizontal, Space.s4)
                        .padding(.vertical, Space.s2)
                        .background(Theme.ink, in: Capsule()) // een melding is inkt, geen rood
                        .padding(.top, Space.s2)
                        .transition(still ? .opacity : .move(edge: .top).combined(with: .opacity)) // Verminder beweging: niet schuiven
                        .accessibilityAddTraits(.isStaticText)
                }
            }
        }
        .task {
            // Na vouwen of draaien: hetzelfde artikel meteen, zonder opnieuw te laden.
            if let artikel = reader?.artikel(voor: item.id) { loader.toon(artikel, url: item.link) } else if let url = item.link { loader.load(url) }
        }
        .onChange(of: loader.state) { _, state in if case let .ready(a) = state { reader?.bewaar(a, voor: item.id) } }
        .task {
            signedIn = await isSignedIn()
            #if DEBUG
            if DebugLaunch.screen("inloggen") { login = LoginTarget(name: sourceName, url: loginURL) }
            #endif
        }
        .task(id: loader.state == .loading) {
            // Klaar terwijl de laadstrepen in beeld zijn: eerst de lopende beweging afmaken, dan
            // vervaagt de stapel naar het artikel (LoadLines: 320 ms, Verminder beweging 240).
            if loader.state != .loading, let started = waiting.startedAt {
                let elapsed = LoadLinesModel.clock() - started
                let rest = still ? 0 : max(0, LoadLines.settleAt(elapsed) - elapsed)
                holding = true
                if rest > 0 { try? await Task.sleep(for: .milliseconds(Int(rest.rounded()))) }
                withAnimation(LoadLines.easeAnimation(still ? LoadLines.reduceFade : LoadLines.out)) { holding = false }
            }
            waiting.reset()
            if loader.state == .loading { await waiting.wait() }
        }
        .onChange(of: shouldOfferLogin, initial: true) { _, eligible in
            guard eligible else { loginPanelVisible = false; return }
            loginPanelVisible = loginReminders.claim(for: item.source)
        }
        .onDisappear { waiting.reset(); loader.stop() }
    }

    private func isSignedIn() async -> Bool {
        guard let domain else { return false }
        return await !PublisherLogin.loggedIn([domain]).isEmpty
    }

    private func afterLogin() {
        if let url = item.link { loader.load(url) }
        Task {
            let now = await isSignedIn()
            if now && !signedIn {
                withAnimation(.snappy) { signedIn = true; welcome = true }
                UIAccessibility.post(notification: .announcement, argument: "Ingelogd bij \(sourceName)")
                try? await Task.sleep(for: .seconds(2.5))
                withAnimation(.easeInOut) { welcome = false }
            } else {
                signedIn = now
            }
        }
    }

    private func closeLoginPanel() {
        loginReminders.dismiss(for: item.source)
        loginPanelVisible = false
    }

}

// De letters van de lezer. WKWebView ziet de letters van de app (UIAppFonts) niet, dus ze gaan als
// @font-face mee in de pagina. Niet de volle TTF's van de app (± 1 MB per artikel), maar kleine
// WOFF's: alleen latin, zonder hinting, alleen de standen die de lezer gebruikt (scripts/
// build-reader-fonts.mjs, uit dezelfde app-standen): samen ± 220 kB in de pagina. Een teken buiten
// latin (ł, ő) valt per teken terug op de systeemletter. Eén keer opgebouwd.
enum ReaderFonts {
    private static func face(_ family: String, _ file: String, weight: Int, style: String = "normal") -> String {
        guard let url = Bundle.main.url(forResource: "Lezer-" + file, withExtension: "woff"), let data = try? Data(contentsOf: url) else { return "" }
        return "@font-face { font-family: \"\(family)\"; src: url(data:font/woff;base64,\(data.base64EncodedString())) format(\"woff\"); font-weight: \(weight); font-style: \(style); }"
    }
    private static let common = [
        face("Newsreader Kop", "NewsreaderKop-800", weight: 800), // de kop
        face("Newsreader Tekst", "NewsreaderTekst-700", weight: 700), // vet in de tekst
        face("Newsreader Tekst", "NewsreaderTekst-400-cursief", weight: 400, style: "italic"), // cursief, citaten
        face("Schibsted Grotesk", "SchibstedGrotesk-400", weight: 400), // bronregel, bijschriften
        face("Schibsted Grotesk", "SchibstedGrotesk-800", weight: 800), // rubriek
    ].joined(separator: "\n")
    private static let day = face("Newsreader Tekst", "NewsreaderTekst-450", weight: 400) // lees-stand, variant 4: opsz 12, wght 450 (als --lees-wght op het web)
    private static let nacht = face("Newsreader Tekst", "NewsreaderTekst-480", weight: 400) // Nacht: 480 op de plek van 400 (variant 3: 430)
    // Voor de toets: hoeveel letter er per pagina meegaat.
    static func bytes(night: Bool) -> Int { css(night: night).utf8.count }
    static func css(night: Bool) -> String { common + "\n" + (night ? nacht : day) }
}

// De opmaak van een artikel: HTML met de kleuren en letters van Hoot. JavaScript staat uit.
enum ReaderHTML {
    static let scales = [0.9, 1.0, 1.15, 1.32]

    static func page(_ a: Article, item: Item, sourceName: String, size: Int, lang: String? = nil, night: Bool = false, typeSize: DynamicTypeSize? = nil, width: CGFloat = 0, pagina: Bool = false) -> String {
        var scale = scales[min(max(size, 0), scales.count - 1)]
        // De tekstmaat komt uit de omgeving van de view (niet uit UITraitCollection.current, onbetrouwbaar in een body) en gaat als px in de pagina.
        let bodyPx = typeSize.map { KopZet.pointSize(.body, typeSize: $0) }
        let accessibilitySize = typeSize?.isAccessibilitySize ?? false
        // Op een bladzijde van de krant (Duo open, Krant.swift): 60 tot 75 tekens per regel (Leesmaat).
        let maat = Leesmaat.maat(kolom: Double(width), body: Double(bodyPx ?? UIFont.preferredFont(forTextStyle: .body).pointSize), keuze: scale, pagina: pagina, groteTekst: (typeSize ?? .large) > .large)
        scale *= maat.schaal
        let marge = Int(maat.marge)
        var title = typeset(a.title.isEmpty ? item.title : a.title, lang: lang) // de lezer haalt de kop zelf: zetten zoals de server (T6)
        // Newsreader 800 is breed: een woord breder dan de kolom ("Rijksvoorlichtingsdienst" op een SE) krijgt zachte
        // afbreekstreepjes op de lettergrepen, zoals Kop. Woorden die passen blijven heel. Kopmaat en kolom als in de css hieronder.
        if width > 0 {
            let body = bodyPx ?? UIFont.preferredFont(forTextStyle: .body).pointSize
            let headPx = min(1.75 * 1.12 * scale * body, 48)
            let column = min(width, 680) - 2 * CGFloat(marge)
            title = KopZet.fit(title, font: UIFont(name: Letters.kop, size: headPx) ?? .systemFont(ofSize: headPx, weight: .heavy), width: column).text
        }
        title = escape(title)
        // De bron staat in de bronregel onder de kop, niet als rode kicker erboven (L3, minder rood);
        // de kicker is de rubriek van het stuk, als die er is, stil in ink-3.
        let meta = [sourceName, a.byline, item.date.map { HootDate.ago($0) }].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.map(escape).joined(separator: " · ")
        let kicker = item.section?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return """
        <!doctype html><html lang="\(escape(lang ?? "nl"))"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <style>
        \(ReaderFonts.css(night: night))
        :root { --paper:#F5F1E8; --ink:#1A1814; --ink-3:#6B6457; --rule:#DED5C4; --accent:#9A3324; } /* tokens van het design system */
        @media (prefers-color-scheme: dark) { :root { --paper:#151310; --ink:#F1ECE2; --ink-3:#A39B8D; --rule:#34302A; --accent:#EC7A70; } }
        html { font: -apple-system-body;\(bodyPx.map { " font-size: \($0)px;" } ?? "") -webkit-text-size-adjust: 100%; }
        body { margin:0; background:var(--paper); color:var(--ink); }
        main { max-width: 680px; margin: 0 auto; padding: 16px \(marge)px 48px; /* s4, s7 */ font-family: "Newsreader Tekst", ui-serif, Georgia, serif; font-size: calc(1.12rem * \(scale)); line-height: 1.6; } /* lopende tekst: Newsreader op tekstmaat, in Nacht 430 (ReaderFonts); een stap groter dan New York (1.06), want Newsreader oogt op dezelfde maat kleiner */
        .kicker { font-family: "Schibsted Grotesk", -apple-system, system-ui, sans-serif; font-size: .72em; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 .6em; }
        h1.title { font-family: "Newsreader Kop", ui-serif, Georgia, serif; font-size: min(1.75em, 48px); line-height: 1.15; font-weight: 800; margin: 0 0 .4em; } /* bij heel grote tekst niet een heel scherm kop */
        .meta { font-family: "Schibsted Grotesk", -apple-system, system-ui, sans-serif; font-size: .8em; color: var(--ink-3); margin: 0 0 1.6em; padding-bottom: 1em; border-bottom: 1px solid var(--rule); }
        h1, h2, h3, h4 { line-height: 1.25; -webkit-hyphens: manual; hyphens: manual; } /* eigennamen in de kop breken nooit af */
        h1 { overflow-wrap: anywhere; text-wrap: balance; } /* laatste redmiddel; de kop heeft zijn zachte streepjes al (ReaderHTML.page), regels even lang */
        main.hyphenate :is(h2, h3, h4) { -webkit-hyphens: auto; hyphens: auto; hyphenate-limit-chars: 10 4 4; -webkit-hyphenate-limit-before: 3; -webkit-hyphenate-limit-after: 3; } /* alleen bij Heel groot of een AX-maat: lange woorden in tussenkoppen afbreken met een streepje (nooit midden in een woord zonder), in de taal van de bron */
        h2 { font-size: 1.3em; margin: 1.6em 0 .5em; } h3 { font-size: 1.12em; margin: 1.4em 0 .4em; }
        p { margin: 0 0 1em; }
        a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
        img, video, picture { max-width: 100%; height: auto; border-radius: 12px; /* radius */ display: block; margin: 1.2em auto; }
        figure { margin: 1.4em 0; } figcaption, .caption { font-family: "Schibsted Grotesk", -apple-system, system-ui, sans-serif; font-size: .75em; color: var(--ink-3); margin-top: .4em; }
        blockquote { margin: 1.4em 0; padding: 0 0 0 1em; border-left: 3px solid var(--accent); font-style: italic; }
        hr { border: 0; border-top: 1px solid var(--rule); margin: 2em 0; }
        ul, ol { padding-left: 1.3em; } li { margin: .3em 0; }
        table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; font-size: .85em; } /* een brede tabel scrolt zelf, niet de hele pagina */
        main { overflow-wrap: break-word; } /* lange links breken af in plaats van de pagina te verbreden */ td, th { border-bottom: 1px solid var(--rule); padding: .4em; text-align: left; }
        pre, code { font-family: ui-monospace, Menlo, monospace; font-size: .85em; white-space: pre-wrap; }
        \(night ? NachtLeesinkt.readerCSS : "")
        </style></head><body><main\(scale > 1.3 || accessibilitySize ? " class=\"hyphenate\"" : "")>
        \(kicker.isEmpty ? "" : "<p class=\"kicker\">\(escape(kicker))</p>")
        <h1 class="title">\(title)</h1>
        \(meta.isEmpty ? "" : "<p class=\"meta\">\(meta)</p>")
        \(a.content)
        </main></body></html>
        """
    }

    static func escape(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;").replacingOccurrences(of: "\"", with: "&quot;")
    }
}

// Toont het artikel. Links openen buiten de lezer (in Safari).
struct ArticleWebView: UIViewRepresentable {
    let html: String
    let baseURL: URL?
    /// De alinea waar je was (vouwen, draaien), en waar je bewaart waar je nu bent.
    var plek: LeesPlek? = nil
    var bewaarPlek: ((LeesPlek) -> Void)? = nil

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.defaultWebpagePreferences.allowsContentJavaScript = false
        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = NachtKleur.paper
        view.underPageBackgroundColor = NachtKleur.paper
        view.scrollView.backgroundColor = .clear
        view.navigationDelegate = context.coordinator
        context.coordinator.volg(view)
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        context.coordinator.bewaar = bewaarPlek
        guard context.coordinator.shown != html else { return }
        context.coordinator.shown = html
        // Een nieuwe opmaak van hetzelfde artikel (andere breedte): terug naar de alinea waar je was.
        if context.coordinator.plek == nil { context.coordinator.plek = plek }
        context.coordinator.terug = false
        view.loadHTMLString(html, baseURL: baseURL)
    }

    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) { coordinator.stop() }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
        var shown = ""
        var plek: LeesPlek?
        var bewaar: ((LeesPlek) -> Void)?
        var terug = false // de plek is teruggezet: vanaf nu telt scrollen
        private var kijker: NSKeyValueObservation?
        private var meten: Task<Void, Never>?

        func volg(_ view: WKWebView) {
            kijker = view.scrollView.observe(\.contentOffset, options: [.new]) { [weak self, weak view] _, _ in
                Task { @MainActor in
                    guard let self, let view, self.terug else { return }
                    self.meten?.cancel()
                    self.meten = Task { [weak self, weak view] in
                        try? await Task.sleep(for: .milliseconds(250)) // als het scrollen stilvalt
                        guard !Task.isCancelled, let self, let view else { return }
                        await self.meet(view)
                    }
                }
            }
        }
        func stop() { kijker?.invalidate(); kijker = nil; meten?.cancel() }

        private func meet(_ view: WKWebView) async {
            let top = Double(view.scrollView.contentOffset.y + view.scrollView.adjustedContentInset.top)
            guard let uit = try? await view.callAsyncJavaScript(LeesPlek.meetJS, arguments: ["y": top], in: nil, contentWorld: .defaultClient) as? [Double], uit.count == 2 else { return }
            let nieuw = LeesPlek(alinea: Int(uit[0]), binnen: uit[1])
            plek = nieuw
            bewaar?(nieuw)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard let plek, plek.alinea > 0 || plek.binnen > 0 else { terug = true; return }
            Task { @MainActor [weak webView] in
                try? await Task.sleep(for: .milliseconds(120)) // de letters staan
                guard let webView else { return }
                if let y = try? await webView.callAsyncJavaScript(LeesPlek.zetJS, arguments: ["i": plek.alinea, "f": plek.binnen], in: nil, contentWorld: .defaultClient) as? Double {
                    let s = webView.scrollView
                    let max = s.contentSize.height - s.bounds.height + s.adjustedContentInset.bottom
                    s.setContentOffset(CGPoint(x: 0, y: min(max, y) - s.adjustedContentInset.top), animated: false)
                }
                self.terug = true
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
            if action.navigationType == .linkActivated, let url = action.request.url {
                await UIApplication.shared.open(url)
                return .cancel
            }
            return .allow
        }
    }
}

// Waar je in een artikel bent: de hoeveelste alinea (een kind van <main>) bovenaan, en hoe ver daarin. Een
// alinea en niet een aantal punten: na vouwen is de kolom anders breed en loopt de tekst anders, maar je
// staat bij dezelfde zin. Het script draait in de eigen wereld van de app; JavaScript van de pagina blijft uit.
struct LeesPlek: Equatable, Sendable {
    var alinea: Int
    var binnen: Double
    static let meetJS = """
    const els = document.querySelectorAll('main > *');
    for (let i = 0; i < els.length; i++) {
      const e = els[i], top = e.offsetTop, h = e.offsetHeight;
      if (top + h > y) return [i, h > 0 ? Math.max(0, Math.min(1, (y - top) / h)) : 0];
    }
    return [0, 0];
    """
    static let zetJS = """
    const els = document.querySelectorAll('main > *');
    const e = els[Math.min(i, els.length - 1)];
    return e ? e.offsetTop + f * e.offsetHeight : 0;
    """
}

// Een bestaande web-weergave tonen (de pagina van de uitgever, voor toestemming of inloggen).
struct WebPage: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ view: WKWebView, context: Context) {}
}

// Inloggen bij een uitgever, in de opslag van de lezer: je typt zelf je gegevens op de site van
// de uitgever; Hoot ziet ze niet en bewaart alleen wat de site zelf op dit toestel bewaart.
struct LoginTarget: Identifiable {
    var name: String
    var url: URL?
    var id: String { url?.absoluteString ?? name }
    static func home(_ article: URL) -> URL? { article.host().flatMap { URL(string: "https://\($0)/") } }
}

struct LoginWebView: View {
    @Environment(\.nachtActief) private var nacht
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    let target: LoginTarget
    @State private var webView: WKWebView = {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = ArticleLoader.dataStore
        let view = WKWebView(frame: .zero, configuration: config)
        // Tot de site zelf tekent: papier, geen wit vlak.
        view.isOpaque = false
        view.backgroundColor = NachtKleur.paper
        view.underPageBackgroundColor = NachtKleur.paper
        view.scrollView.backgroundColor = .clear
        return view
    }()
    @State private var watcher: LoginWatcher?
    private var done: Bool { watcher?.confirmed == true } // we zien echt dat je bent ingelogd

    var body: some View {
        NavigationStack {
            WebPage(webView: webView)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle("Inloggen bij \(target.name)")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    // "Klaar" als tekst in inkt; pas als je echt bent ingelogd is het de volgende stap: een inktknop.
                    ToolbarItem(placement: .topBarTrailing) {
                        if done {
                            Button { dismiss() } label: { Text("Klaar").font(.ui(.body, .semibold)).foregroundStyle(Theme.paper) }
                                .buttonStyle(.borderedProminent).tint(Theme.ink)
                        } else {
                            Button("Klaar") { dismiss() }
                        }
                    }
                }
                .safeAreaInset(edge: .top) {
                    // De status onder de gecentreerde titel, ook gecentreerd. Eerlijk: pas na een echte inlog
                    // het vinkje, in inkt (een succes in rood leest als een fout).
                    Group {
                        if done {
                            Label { Text("Je bent ingelogd bij \(target.name).") } icon: { Image(systemName: "checkmark") }
                                .foregroundStyle(Theme.ink)
                                .font(.ui(.footnote, .semibold))
                        } else {
                            Text("Log in zoals altijd. Hoot ziet je wachtwoord niet.")
                                .foregroundStyle(Theme.ink3)
                        }
                    }
                    .font(.ui(.footnote))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal)
                    .padding(.vertical, Space.s2)
                    .frame(maxWidth: .infinity)
                    .background(nacht ? AnyShapeStyle(Theme.paper) : AnyShapeStyle(.bar))
                    .overlay(alignment: .bottom) { Rule() }
                    .accessibilityElement(children: .combine)
                    .accessibilityAddTraits(.updatesFrequently)
                    .animation(.easeInOut(duration: 0.3), value: done)
                }
                .sensoryFeedback(.success, trigger: done) { _, now in now }
                .onChange(of: done) { _, now in
                    if now { UIAccessibility.post(notification: .announcement, argument: "Je bent ingelogd bij \(target.name).") }
                }
        }
        .task { await start() }
    }

    // Eerst het script, het dimmen (Donker en Nacht) en de berichten, dan de pagina; daarna meekijken.
    private func start() async {
        guard let url = target.url else { return }
        let content = webView.configuration.userContentController
        if scheme == .dark {
            content.addUserScript(WKUserScript(source: LoginPageScript.dimScript(night: nacht), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        guard let domain = PublisherLogin.domain(of: url) else { webView.load(URLRequest(url: url)); return }
        let watcher = LoginWatcher(domain: domain)
        watcher.attach(to: webView)
        self.watcher = watcher
        #if DEBUG
        // `-HootFakeLogin 4`: na 4 s een inlogcookie, alsof je inlogde (om deze stap te testen).
        let fake = UserDefaults.standard.double(forKey: "HootFakeLogin")
        if fake > 0 {
            Task {
                try? await Task.sleep(for: .seconds(fake))
                let cookie = HTTPCookie(properties: [.domain: "." + domain, .path: "/", .name: "hoot_test_auth_token", .value: "1", .expires: Date.now.addingTimeInterval(86400 * 30)])
                if let cookie { await ArticleLoader.dataStore.httpCookieStore.setCookie(cookie) }
            }
        }
        #endif
        // Al ingelogd (herkende cookie, of eerder hier ingelogd en de accountcookie staat er nog)?
        if await !PublisherLogin.loggedIn([domain]).isEmpty { watcher.alreadyLoggedIn() }
        webView.load(URLRequest(url: url))
        if await watcher.watch() { PublisherLogin.remember(domain) }
    }
}

// Alleen de indicatie wacht; het artikel zelf wordt meteen geladen. Annuleren voorkomt een flits
// als de pagina al klaar is of de lezer gesloten is.
@MainActor @Observable
final class ReaderWaitingState {
    private(set) var visible = false
    private(set) var startedAt: Double? // wanneer de laadstrepen begonnen (LoadLinesModel.clock)
    func wait() async {
        do {
            try await Task.sleep(for: .milliseconds(Int(LoadLines.early)))
            guard !Task.isCancelled else { return }
            visible = true
            startedAt = LoadLinesModel.clock()
        } catch { /* snelle laadactie of vertrek: geen indicatie (onder 400 ms geen strepen) */ }
    }
    func reset() { visible = false; startedAt = nil }
}

struct ReaderLoadingView: View {
    let title: String
    let sourceName: String
    let waiting: ReaderWaitingState
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s4) {
            // Zoals de lezer zelf: de kop, met de bron in de regel eronder (L3).
            VStack(alignment: .leading, spacing: Space.s2) {
                Kop(title, .title).fixedSize(horizontal: false, vertical: true)
                Text(sourceName).font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
            }
            if waiting.visible, let started = waiting.startedAt {
                ReaderLoadLines(started: started)
            }
            Spacer()
        }
        .padding()
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
    }
}

// De laadstrepen in de lezer: dezelfde stapel als bij het eerste laden, zonder landen. Is het artikel
// er, dan maakt de stapel zijn beweging af en vervaagt hij met de wissel naar het artikel.
struct ReaderLoadLines: View {
    let started: Double
    var label = "Artikel laden"
    @Environment(\.accessibilityReduceMotion) private var still
    var body: some View {
        GeometryReader { proxy in
            TimelineView(.animation(minimumInterval: nil, paused: still)) { timeline in
                LoadLinesArt(frame: LoadLines.frame(LoadLines.State(t0: started, reduce: still, box: LoadLines.Box(x: 0, y: 0, w: proxy.size.width)), now: LoadLines.clockMs(timeline.date)))
            }
        }
        .frame(maxWidth: .infinity, minHeight: LoadLines.box, maxHeight: LoadLines.box)
        .accessibilityElement()
        .accessibilityLabel(label)
    }
}
