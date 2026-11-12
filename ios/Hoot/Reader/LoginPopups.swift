import Combine
import SwiftUI
import WebKit

// Inloggen bij uitgevers met een inlogdienst (onderzoek inloggen-bronnen, optie 1).
//
// Echte pop-ups. "Log in met Apple" (of Facebook, of een eigen inlogdienst) opent bij sommige
// uitgevers (de Telegraph, The Verge) een nieuw venster en wacht op een bericht terug via
// `window.opener`. Vroeger laadde Hoot dat venster in dezelfde weergave (de pagina raakte zijn opener
// kwijt) of deed het niets (het inlogvel had geen uiDelegate). Nu krijgt de site een echt tweede
// venster, gemaakt met de configuratie die WebKit meegeeft (zelfde opslag, zelfde proces, dus
// `window.opener` blijft werken). Het verschijnt als vel boven de pagina en gaat dicht bij
// `window.close()`.
//
// Google eerlijk. Google staat inloggen in een ingebouwde webweergave niet toe (`disallowed_useragent`,
// beleid sinds 2021), ook niet als de uitgever de inlog regelt. Hoot doet niet alsof: gaat een pagina
// of pop-up naar Google's inlog, dan stopt Hoot en zegt het dat, met twee echte uitwegen (een
// wachtwoord bij de uitgever, of de bron lezen in Safari). Geen andere User-Agent, geen omweg.
@MainActor @Observable
final class LoginPopups: NSObject, WKUIDelegate, WKNavigationDelegate {
    struct Popup: Identifiable {
        let id = UUID()
        let webView: WKWebView
    }

    // Eén vel tegelijk: de bovenste pop-up, of anders het blad over Google. Eén `.sheet(item:)`, zodat
    // een pop-up die voor Google dichtgaat in één beweging het blad wordt (twee vellen tegelijk wisselen
    // mislukt in SwiftUI soms stil).
    enum Sheet: Identifiable {
        case popup(Popup)
        case google
        var id: String {
            switch self {
            case let .popup(p): p.id.uuidString
            case .google: "google"
            }
        }
    }

    // Open pop-ups, de bovenste laatst. Meestal één; een pop-up mag zelf weer een venster openen.
    var stack: [Popup] = []
    // Een pagina of pop-up wilde naar Google's inlog.
    var google = false
    // Voor VoiceOver: waar je terug bent als een pop-up vanzelf dichtgaat.
    var sourceName = ""
    @ObservationIgnored var announce: (String) -> Void = { UIAccessibility.post(notification: .announcement, argument: $0) }

    var sheet: Sheet? { stack.last.map(Sheet.popup) ?? (google ? .google : nil) }

    // Het vel ging dicht door een veeg, "Annuleer" of de sluitknop.
    func dismissSheet() {
        if stack.isEmpty { google = false } else { dismissedTop() }
    }

    static func announcement(_ sourceName: String) -> String {
        sourceName.isEmpty ? "Je bent terug op de pagina." : "Je bent terug op de pagina van \(sourceName)."
    }

    // Google weigert ingebouwde webweergaven: de inlogpagina's van Google zelf.
    nonisolated static func isGoogleSignIn(_ url: URL?) -> Bool {
        guard let url, let host = url.host()?.lowercased() else { return false }
        if host == "accounts.google.com" || host.hasSuffix(".accounts.google.com") { return true }
        // Sommige sites gaan via de oude OAuth-route.
        return host == "www.google.com" && url.path().lowercased().hasPrefix("/accounts/")
    }

    // Een navigatie die Hoot afvangt: een hele pagina (hoofdframe) naar Google's inlog. De Google-knop van
    // Google Identity Services is een iframe van accounts.google.com en mag gewoon tekenen.
    nonisolated static func catchesGoogle(_ url: URL?, mainFrame: Bool) -> Bool {
        mainFrame && !googleDoorlaten && isGoogleSignIn(url)
    }

    #if DEBUG
    // `-HootInlogGoogleDoorlaten YES`: ter vergelijking Google tóch in de webweergave laden.
    nonisolated static var googleDoorlaten: Bool { UserDefaults.standard.bool(forKey: "HootInlogGoogleDoorlaten") }
    #else
    nonisolated static let googleDoorlaten = false
    #endif

    // MARK: WKUIDelegate

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Naar Google: geen venster (het wordt toch geweigerd), maar het blad.
        if Self.catchesGoogle(navigationAction.request.url, mainFrame: true) {
            google = true
            return nil
        }
        // Precies deze configuratie gebruiken: WebKit koppelt het nieuwe venster dan aan de opener.
        let popup = WKWebView(frame: .zero, configuration: configuration)
        popup.uiDelegate = self
        popup.navigationDelegate = self
        popup.isOpaque = false
        popup.backgroundColor = NachtKleur.paper
        popup.underPageBackgroundColor = NachtKleur.paper
        #if DEBUG
        popup.isInspectable = true
        #endif
        stack.append(Popup(webView: popup))
        // WebKit laadt het verzoek zelf in het teruggegeven venster.
        return popup
    }

    // `window.close()` in de pop-up: de inlogdienst is klaar. Voor VoiceOver zeggen waar je nu bent.
    func webViewDidClose(_ webView: WKWebView) {
        guard close(webView) else { return }
        let text = Self.announcement(sourceName)
        let say = announce
        Task {
            try? await Task.sleep(for: .milliseconds(700)) // eerst het vel weg, dan pas spreken
            say(text)
        }
    }

    @discardableResult
    func close(_ webView: WKWebView) -> Bool {
        guard stack.contains(where: { $0.webView === webView }) else { return false }
        stack.removeAll { $0.webView === webView }
        return true
    }

    func dismissedTop() {
        if let top = stack.last { top.webView.stopLoading(); stack.removeLast() }
    }

    // MARK: WKNavigationDelegate (voor de pop-ups én het inlogvel zelf)

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        decide(webView, url: navigationAction.request.url, mainFrame: navigationAction.targetFrame?.isMainFrame ?? true)
    }

    // Los van WebKit, zodat de toetsen elke stap kunnen nalopen.
    func decide(_ webView: WKWebView, url: URL?, mainFrame: Bool) -> WKNavigationActionPolicy {
        guard Self.catchesGoogle(url, mainFrame: mainFrame) else { return .allow }
        // Ging een pop-up naar Google, dan heeft hij zonder Google geen doel meer: dicht, en het blad.
        close(webView)
        google = true
        return .cancel
    }
}

// De bovenste pop-up als vel: de pagina van de inlogdienst, met "Annuleer" om terug te gaan.
struct LoginPopupSheet: View {
    let popup: LoginPopups.Popup
    let cancel: () -> Void
    @State private var host = ""

    var body: some View {
        NavigationStack {
            WebPage(webView: popup.webView)
                .ignoresSafeArea(edges: .bottom)
                .background(Theme.paper)
                // Zodat je ziet (en VoiceOver zegt) bij wie je inlogt.
                .navigationTitle(LoginPopupSheet.title(host))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Annuleer", action: cancel)
                    }
                }
        }
        .onReceive(popup.webView.publisher(for: \.url)) { host = $0?.host() ?? host }
    }

    static func title(_ host: String) -> String { host.isEmpty ? "Inloggen" : "Inloggen bij \(host)" }
}

// Google laat inloggen alleen toe in Safari. Kort, met de twee uitwegen die echt werken: een wachtwoord
// bij de uitgever (dan blijf je in de lezer ingelogd), of de bron in Safari lezen, waar je met Google
// inlogt. Geen knop die belooft dat een inlog in Safari ook in Hoot werkt: dat kan niet.
struct GoogleLoginSheet: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let sourceName: String
    var makePassword: (() -> Void)?
    let readInSafari: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.s4) {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Kicker(text: "Inloggen met Google")
                    Text("Google laat inloggen alleen toe in Safari.")
                        .font(.kop(.title3))
                        .foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                }
                VStack(spacing: Space.s2) {
                    if let makePassword {
                        Button(action: makePassword) { knop("Maak een wachtwoord bij \(sourceName)") }
                            .buttonStyle(.ink)
                    }
                    Button(action: readInSafari) { knop("Lees \(sourceName) in Safari") }
                        .modifier(TweedeKnop(primary: makePassword == nil))
                }
            }
            .padding(.horizontal, Space.s5)
            .padding(.top, Space.s6)
            .padding(.bottom, Space.s5)
            .frame(maxWidth: Layout.readable, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollBounceBehavior(.basedOnSize)
        .background(Theme.paper)
        .presentationBackground(Theme.paper)
        // Half hoog, zoals Uitleg; bij heel grote tekst mag het blad omhoog en scrolt het.
        .presentationDetents(typeSize.isAccessibilitySize ? [.medium, .large] : [.medium])
        .presentationDragIndicator(.visible)
    }

    // Een lange naam ("Nederlands Dagblad") loopt door op een tweede regel, nooit afgekapt.
    private func knop(_ text: String) -> some View {
        Text(text)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.vertical, Space.s2)
            .frame(maxWidth: .infinity)
    }

    // Is er geen wachtwoordpagina, dan is Safari de enige uitweg: dan in inkt.
    private struct TweedeKnop: ViewModifier {
        let primary: Bool
        func body(content: Content) -> some View {
            if primary { content.buttonStyle(.ink) } else { content.buttonStyle(.glass).tint(Theme.ink) }
        }
    }
}

#if DEBUG
// Alleen in Debug, voor toetsen in de simulator zonder te tikken (die wordt alleen met simctl bediend):
//   -HootInlogURL <url> [-HootInlogNaam <naam>]   meteen het inlogvel op die pagina
//   -HootInlogKlik "<stap>;;<stap>"   na het laden om de 5 s een klik. Een stap is een CSS-selector,
//                                      of `tekst:Apple` (de eerste knop of link met die tekst), of
//                                      `pop:<stap>` (dezelfde klik, maar in de bovenste pop-up).
//   -HootInlogGoogleDoorlaten YES     Google tóch laden, ter vergelijking.
// Er wordt nooit iets ingevuld. In Release bestaat dit niet.
@MainActor
enum LoginDebug {
    static var target: LoginTarget? {
        let d = UserDefaults.standard
        guard let url = d.string(forKey: "HootInlogURL").flatMap(URL.init(string:)) else { return nil }
        return LoginTarget(name: d.string(forKey: "HootInlogNaam") ?? (url.host() ?? ""), url: url)
    }

    static func run(on webView: WKWebView, popups: LoginPopups) {
        let steps = (UserDefaults.standard.string(forKey: "HootInlogKlik") ?? "").components(separatedBy: ";;").filter { !$0.isEmpty }
        guard !steps.isEmpty else { return }
        Task {
            for step in steps {
                try? await Task.sleep(for: .seconds(5))
                var target = webView
                var sel = step
                if sel.hasPrefix("pop:") { sel.removeFirst(4); if let top = popups.stack.last?.webView { target = top } }
                for _ in 0..<60 { // eerst klaar met laden (een koude simulator is traag)
                    let klaar = (try? await target.evaluateJavaScript("location.href !== 'about:blank' && document.readyState === 'complete'")) as? Bool
                    if klaar == true && !target.isLoading { break }
                    try? await Task.sleep(for: .milliseconds(500))
                }
                try? await Task.sleep(for: .seconds(1))
                let js: String
                if sel.hasPrefix("tekst:") {
                    let t = String(sel.dropFirst(6)).lowercased()
                    js = "(() => { const t = \(String(reflecting: t)); const el = [...document.querySelectorAll('button, a, [role=button], input[type=submit], div[id*=apple], div[class*=apple]')].find(e => (e.innerText || e.value || e.getAttribute('aria-label') || '').toLowerCase().includes(t)); if (!el) return 'niet gevonden'; el.click(); return 'geklikt: ' + (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 60) })()"
                } else {
                    js = "(() => { const el = document.querySelector(\(String(reflecting: sel))); if (!el) return 'niet gevonden'; el.click(); return 'geklikt' })()"
                }
                let r = try? await target.evaluateJavaScript(js)
                NSLog("[LoginDebug] %@", "\(step) → \(r ?? "fout") op \(target.url?.absoluteString ?? "nil")")
            }
        }
    }
}
#endif
