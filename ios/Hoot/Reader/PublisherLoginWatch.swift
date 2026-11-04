import SwiftUI
import WebKit

// Eerlijke inlogstatus in het inlogvel (inlogpaneel A, L2): Hoot zegt pas "Je bent ingelogd bij
// {bron}." als het dat echt ziet. Vroeger telde elke nieuwe cookie met "session" of "user" in de
// naam die na het openen van de pagina verscheen; een site die bij het laden zelf zo'n cookie zet,
// leek dan al ingelogd terwijl het formulier er nog stond.
//
// Wat nu telt (puur, zodat de tests elke stap kunnen nalopen):
// - een cookie waarvan we zeker weten dat hij een inlog is (PublisherLogin.isLogin), of
// - na een echte inlogpoging (je verstuurt het formulier of tikt op de knop, met een ingevuld
//   wachtwoord- of codeveld) een nieuwe accountcookie, terwijl er geen wachtwoord- of codeveld meer
//   in beeld is. Dat werkt ook bij sites die niet van pagina wisselen: het formulier verdwijnt dan
//   in dezelfde pagina.
// Wat de site uit zichzelf zet voordat je iets verstuurt, wordt bij de beginstand gerekend.
struct LoginEvidence: Equatable {
    private(set) var baseline: Set<String> = []
    private(set) var attempted = false
    private(set) var sawCredential = false
    private(set) var credentialVisible = false
    private(set) var confirmed = false

    // Een nieuwe stand van de cookies van deze uitgever (`account`: sleutels "domein|naam" van
    // accountcookies; `knownLogin`: er staat een herkende inlogcookie).
    mutating func observe(account: Set<String>, knownLogin: Bool) {
        guard !confirmed else { return }
        if knownLogin { confirmed = true; return }
        if !attempted { baseline.formUnion(account); return }
        if sawCredential && !credentialVisible && !account.subtracting(baseline).isEmpty { confirmed = true }
    }

    // Wat de pagina meldt: staat er een wachtwoord- of codeveld in beeld?
    mutating func page(credentialVisible visible: Bool) {
        credentialVisible = visible
        if visible { sawCredential = true }
    }

    // Al ingelogd voordat het vel openging (herkende cookie, of hier eerder ingelogd en de accountcookie staat er nog).
    mutating func alreadyLoggedIn() { confirmed = true }

    // Je verstuurde iets met een ingevuld wachtwoord- of codeveld.
    mutating func attempt() {
        guard sawCredential else { return }
        attempted = true
    }
}

enum LoginPageScript {
    static let handler = "hootLogin"

    // Meldt alleen of er een wachtwoord- of codeveld in beeld staat en wanneer je iets verstuurt.
    // Geen inhoud van velden: Hoot ziet je wachtwoord niet.
    static let source = """
    (() => {
      if (window.__hootLogin) return; window.__hootLogin = true;
      const post = (m) => { try { window.webkit.messageHandlers.\(handler).postMessage(m) } catch (e) {} };
      const fields = () => [...document.querySelectorAll('input[type=password], input[autocomplete="one-time-code"]')];
      const shown = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
      const filled = () => fields().some((el) => el.value && el.value.length > 0);
      let last = null;
      const report = () => { const v = fields().some(shown); if (v !== last) { last = v; post({ type: 'state', credential: v }) } };
      const attempt = () => { if (filled()) { post({ type: 'state', credential: true }); post({ type: 'attempt' }) } };
      document.addEventListener('submit', attempt, true);
      document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button, input[type=submit], [role=button]')) attempt() }, true);
      document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('input')) attempt() }, true);
      let queued = false;
      new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; report() }, 150) })
        .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'type'] });
      document.addEventListener('DOMContentLoaded', report);
      window.addEventListener('pageshow', () => { last = null; report() });
      report();
    })();
    """

    // Donker en Nacht: de site van de uitgever omgekeerd en gedimd, beelden terug in hun kleur.
    // Nooit een groot wit vlak (L1). Een eigen achtergrond van de site wint (`:where` weegt niets).
    static func dimCSS(night: Bool) -> String {
        let page = night ? "invert(.93) hue-rotate(180deg) brightness(.85)" : "invert(.93) hue-rotate(180deg)"
        return ":where(html){background-color:#fff}html{filter:\(page) !important}img,video,canvas,iframe,embed,object,svg image{filter:invert(1) hue-rotate(180deg) !important}"
    }

    static func dimScript(night: Bool) -> String {
        """
        (() => { const s = document.createElement('style'); s.id = 'hoot-dim'; s.textContent = \(String(reflecting: dimCSS(night: night)));
          (document.head || document.documentElement).appendChild(s) })();
        """
    }
}

// Kijkt mee in het inlogvel: elke seconde de cookies van de uitgever, en wat de pagina meldt.
@MainActor @Observable
final class LoginWatcher {
    private(set) var evidence = LoginEvidence()
    var confirmed: Bool { evidence.confirmed }
    let domain: String
    private let store: WKWebsiteDataStore

    init(domain: String, store: WKWebsiteDataStore = ArticleLoader.dataStore) {
        self.domain = domain
        self.store = store
    }

    // Het script en de berichten op een web-weergave aansluiten (voordat de pagina laadt).
    func attach(to webView: WKWebView) {
        let content = webView.configuration.userContentController
        content.removeScriptMessageHandler(forName: LoginPageScript.handler)
        content.add(MessageProxy(self), name: LoginPageScript.handler)
        content.addUserScript(WKUserScript(source: LoginPageScript.source, injectionTime: .atDocumentEnd, forMainFrameOnly: false))
    }

    func receive(_ body: Any) {
        guard let m = body as? [String: Any], let type = m["type"] as? String else { return }
        if type == "state", let v = m["credential"] as? Bool { evidence.page(credentialVisible: v) }
        if type == "attempt" { evidence.attempt() }
    }

    func alreadyLoggedIn() { evidence.alreadyLoggedIn() }

    // Eén ronde: de cookies van nu meewegen.
    func check() async {
        let cookies = await PublisherLogin.cookies(in: store)
        evidence.observe(account: PublisherLogin.accountCookies(domain, in: cookies), knownLogin: PublisherLogin.hasLogin(domain, in: cookies))
    }

    // Tot we het zien, of tot het vel dichtgaat.
    func watch(every interval: Duration = .seconds(1)) async -> Bool {
        while !Task.isCancelled {
            await check()
            if confirmed { return true }
            try? await Task.sleep(for: interval)
        }
        return false
    }

    // WKUserContentController houdt zijn berichtontvanger vast; via deze tussenpersoon niet de watcher zelf.
    private final class MessageProxy: NSObject, WKScriptMessageHandler {
        weak var owner: LoginWatcher?
        init(_ owner: LoginWatcher) { self.owner = owner }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            let body = message.body
            MainActor.assumeIsolated { owner?.receive(body) }
        }
    }
}
