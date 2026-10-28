import SwiftUI
import WebKit

// De Hoot-lezer: het artikel in de opmaak van Hoot (krantenletter, papier, jouw tekstgrootte),
// met bewaren, delen en "bij de uitgever" bovenin. Lukt het niet, dan zeggen we dat en kun je naar
// de website.
struct ArticleReaderView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    let item: Item
    @State private var loader = ArticleLoader()
    @AppStorage("hoot.readerSize") private var size = 1
    @State private var login: LoginTarget?
    @State private var signedIn = false // ingelogd bij deze uitgever: dan geen balk "Zie je maar een deel?"
    @State private var welcome = false // even de bevestiging na het inloggen

    private var source: Source? { store.source(item.source) }
    private var loginURL: URL? { source.flatMap { PublisherLogin.url(for: $0, store: store) } ?? item.link.flatMap(LoginTarget.home) }
    private var domain: String? { loginURL.flatMap(PublisherLogin.domain(of:)) }
    private var sourceName: String { item.sourceName ?? source?.name ?? "" }

    var body: some View {
        NavigationStack {
            Group {
                switch loader.state {
                case .loading:
                    VStack(alignment: .leading, spacing: Space.s4) {
                        Kicker(text: sourceName)
                        Text(item.title.isEmpty ? (item.summary ?? "") : item.title).font(Theme.headline(.title)).lineLimit(4).fixedSize(horizontal: false, vertical: true)
                        ProgressView("Artikel laden…").frame(maxWidth: .infinity).padding(.top, Space.s5)
                        Spacer()
                    }
                    .padding()
                    .frame(maxWidth: Layout.readable)
                    .frame(maxWidth: .infinity)
                case let .ready(article):
                    ArticleWebView(html: ReaderHTML.page(article, item: item, sourceName: sourceName, size: size, lang: source?.lang), baseURL: item.link)
                        .ignoresSafeArea(edges: .bottom)
                        .safeAreaInset(edge: .bottom) {
                            if source?.paid == true && article.length < 2500 && !signedIn { paywallNote }
                        }
                case .visit:
                    VStack(spacing: 0) {
                        WebPage(webView: loader.webView)
                        VStack(spacing: Space.s2) {
                            Text(loader.visitByChoice ? "Dit is de pagina van \(sourceName). Probeer de lezer opnieuw, of lees hier verder." : "\(sourceName) vraagt eerst om toestemming of om in te loggen. Kies wat je wilt; daarna gaat de lezer verder.")
                                .font(.footnote)
                                .foregroundStyle(Theme.ink3)
                                .multilineTextAlignment(.center)
                            Button("Verder naar de lezer") { loader.retry() }.buttonStyle(.glassProminent)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.bar)
                    }
                case .failed:
                    ContentUnavailableView {
                        Label("Dit artikel lukt niet in de lezer", systemImage: "doc.text.magnifyingglass")
                    } description: {
                        Text("Sommige pagina's (video, liveblogs, puzzels) hebben geen leesbare tekst, of de uitgever laat de pagina niet zo openen.")
                    } actions: {
                        Button("Open op de website") { if let url = item.link { openURL(url) } }.buttonStyle(.glassProminent)
                        Button("Toon de pagina hier") { loader.showPage() }.buttonStyle(.glass)
                    }
                }
            }
            .background(Theme.paper)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Sluit", systemImage: "xmark") { dismiss() }
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
                    if let link = item.link {
                        ShareLink(item: link, subject: Text(item.title)) { Label("Deel", systemImage: "square.and.arrow.up") }
                        Button("Open bij \(sourceName)", systemImage: "safari") { openURL(link) }
                    }
                    SaveButton(item: item)
                }
            }
            // Na inloggen: bevestigen en het artikel opnieuw laden, nu met je abonnement.
            .sheet(item: $login, onDismiss: afterLogin) { target in LoginWebView(target: target) }
            .overlay(alignment: .top) {
                if welcome {
                    Label("Ingelogd bij \(sourceName)", systemImage: "checkmark.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.onAccent)
                        .padding(.horizontal, Space.s4)
                        .padding(.vertical, Space.s2)
                        .background(Theme.accent, in: Capsule())
                        .padding(.top, Space.s2)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .accessibilityAddTraits(.isStaticText)
                }
            }
        }
        .task { if let url = item.link { loader.load(url) } }
        .task {
            signedIn = await isSignedIn()
            #if DEBUG
            if DebugLaunch.screen("inloggen") { login = LoginTarget(name: sourceName, url: loginURL) }
            #endif
        }
        .onDisappear { loader.stop() }
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

    // Een betaalde bron met weinig tekst: waarschijnlijk zie je maar het begin. Weg zodra je bij
    // deze uitgever bent ingelogd: dan is een kort stuk gewoon kort.
    private var paywallNote: some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Text("Zie je maar een deel? Ben je abonnee van \(sourceName), log dan één keer in; daarna lees je de hele stukken hier.")
                .font(.footnote)
                .foregroundStyle(Theme.ink3)
            HStack {
                Button("Inloggen bij \(sourceName)") { login = LoginTarget(name: sourceName, url: loginURL) }
                    .buttonStyle(.glassProminent)
                Button("Bij de uitgever") { if let url = item.link { openURL(url) } }
                    .buttonStyle(.glass)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.bar)
    }
}

// De opmaak van een artikel: HTML met de kleuren en letters van Hoot. JavaScript staat uit.
enum ReaderHTML {
    static let scales = [0.9, 1.0, 1.15, 1.32]

    static func page(_ a: Article, item: Item, sourceName: String, size: Int, lang: String? = nil) -> String {
        let scale = scales[min(max(size, 0), scales.count - 1)]
        let title = escape(a.title.isEmpty ? item.title : a.title)
        let meta = [a.byline, item.date.map { HootDate.ago($0) }].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.map(escape).joined(separator: " · ")
        return """
        <!doctype html><html lang="\(escape(lang ?? "nl"))"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <style>
        :root { --paper:#F5F1E8; --ink:#1A1814; --ink-3:#6B6457; --rule:#DED5C4; --accent:#A3201B; } /* tokens van het design system */
        @media (prefers-color-scheme: dark) { :root { --paper:#151310; --ink:#F1ECE2; --ink-3:#A39B8D; --rule:#34302A; --accent:#EC7A70; } }
        html { font: -apple-system-body; -webkit-text-size-adjust: 100%; }
        body { margin:0; background:var(--paper); color:var(--ink); }
        main { max-width: 680px; margin: 0 auto; padding: 16px 16px 48px; /* s4, s7 */ font-family: ui-serif, "New York", Georgia, serif; font-size: calc(1.06rem * \(scale)); line-height: 1.6; }
        .kicker { font-family: -apple-system, system-ui, sans-serif; font-size: .72em; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); margin: 0 0 .6em; }
        h1.title { font-size: min(1.75em, 48px); line-height: 1.15; font-weight: 800; margin: 0 0 .4em; } /* bij heel grote tekst niet een heel scherm kop */
        .meta { font-family: -apple-system, system-ui, sans-serif; font-size: .8em; color: var(--ink-3); margin: 0 0 1.6em; padding-bottom: 1em; border-bottom: 1px solid var(--rule); }
        h1, h2, h3, h4 { line-height: 1.25; -webkit-hyphens: auto; hyphens: auto; } /* lange woorden bij grote tekst: afbreken met een streepje, in de taal van de bron */
        h2 { font-size: 1.3em; margin: 1.6em 0 .5em; } h3 { font-size: 1.12em; margin: 1.4em 0 .4em; }
        p { margin: 0 0 1em; }
        a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
        img, video, picture { max-width: 100%; height: auto; border-radius: 12px; /* radius */ display: block; margin: 1.2em auto; }
        figure { margin: 1.4em 0; } figcaption, .caption { font-family: -apple-system, system-ui, sans-serif; font-size: .75em; color: var(--ink-3); margin-top: .4em; }
        blockquote { margin: 1.4em 0; padding: 0 0 0 1em; border-left: 3px solid var(--accent); font-style: italic; }
        hr { border: 0; border-top: 1px solid var(--rule); margin: 2em 0; }
        ul, ol { padding-left: 1.3em; } li { margin: .3em 0; }
        table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; font-size: .85em; } /* een brede tabel scrolt zelf, niet de hele pagina */
        main { overflow-wrap: break-word; } /* lange links breken af in plaats van de pagina te verbreden */ td, th { border-bottom: 1px solid var(--rule); padding: .4em; text-align: left; }
        pre, code { font-family: ui-monospace, Menlo, monospace; font-size: .85em; white-space: pre-wrap; }
        </style></head><body><main>
        <p class="kicker">\(escape(sourceName))</p>
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

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.defaultWebpagePreferences.allowsContentJavaScript = false
        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.navigationDelegate = context.coordinator
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        guard context.coordinator.shown != html else { return }
        context.coordinator.shown = html
        view.loadHTMLString(html, baseURL: baseURL)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var shown = ""
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
            if action.navigationType == .linkActivated, let url = action.request.url {
                await UIApplication.shared.open(url)
                return .cancel
            }
            return .allow
        }
    }
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
    @Environment(\.dismiss) private var dismiss
    let target: LoginTarget
    @State private var webView: WKWebView = {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = ArticleLoader.dataStore
        return WKWebView(frame: .zero, configuration: config)
    }()
    @State private var done = false // we zien dat je bent ingelogd

    var body: some View {
        NavigationStack {
            WebPage(webView: webView)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle("Inloggen bij \(target.name)")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    // Pas na het inloggen is "Klaar" de volgende stap, in rood; daarvoor een gewone knop
                    // (iOS kleurt een bevestigingsknop anders vanzelf).
                    if done {
                        ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { dismiss() } }
                    } else {
                        ToolbarItem(placement: .topBarTrailing) { Button("Klaar", systemImage: "checkmark") { dismiss() }.tint(Theme.ink3) }
                    }
                }
                .safeAreaInset(edge: .top) {
                    Group {
                        if done {
                            // De bevestiging: je bent binnen, en wat je nu kunt.
                            Label("Je bent ingelogd bij \(target.name). Tik op Klaar om verder te lezen.", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(Theme.accent)
                        } else {
                            Text("Log in zoals je op de website gewend bent. Je inlog blijft alleen in de lezer van Hoot op dit toestel.")
                                .foregroundStyle(Theme.ink3)
                        }
                    }
                    .font(.footnote)
                    .padding(.horizontal)
                    .padding(.vertical, Space.s2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.bar)
                    .animation(.easeInOut(duration: 0.3), value: done)
                }
                .sensoryFeedback(.success, trigger: done) { _, now in now }
        }
        .task { if let url = target.url { webView.load(URLRequest(url: url)) } }
        .task { await watch() }
    }

    // Kijk mee of er een inlog bijkomt: een bekende inlogcookie, of een nieuwe accountcookie die er bij
    // het openen nog niet was. Dan onthouden we de uitgever (alleen op dit toestel) en bevestigen we.
    private func watch() async {
        guard let domain = target.url.flatMap(PublisherLogin.domain(of:)) else { return }
        let before = await PublisherLogin.accountCookies(domain)
        #if DEBUG
        // `-HootFakeLogin 4`: na 4 s een accountcookie, alsof je inlogde (om deze stap te testen).
        let fake = UserDefaults.standard.double(forKey: "HootFakeLogin")
        if fake > 0 {
            Task {
                try? await Task.sleep(for: .seconds(fake))
                let cookie = HTTPCookie(properties: [.domain: "." + domain, .path: "/", .name: "hoot_test_account", .value: "1", .expires: Date.now.addingTimeInterval(86400 * 30)])
                if let cookie { await ArticleLoader.dataStore.httpCookieStore.setCookie(cookie) }
            }
        }
        #endif
        if await !PublisherLogin.loggedIn([domain]).isEmpty { done = true; return } // al ingelogd
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(1))
            let known = await !PublisherLogin.loggedIn([domain]).isEmpty
            let added = await PublisherLogin.accountCookies(domain).subtracting(before)
            if known || !added.isEmpty {
                PublisherLogin.remember(domain)
                done = true
                return
            }
        }
    }
}
