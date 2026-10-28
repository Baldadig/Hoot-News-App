import Foundation
import WebKit

// De Hoot-lezer: het artikel laden zoals Safari dat doet (met jouw eigen inlog bij de uitgever,
// bewaard op deze iPhone), en dan met Readability (Mozilla, dezelfde techniek als de lezer van
// Firefox) alleen de tekst en beelden eruit halen. Er gaat niets via de server van Hoot.
// Vraagt de uitgever eerst om toestemming of om in te loggen, dan zie je die pagina zelf en kies
// jij; daarna gaat de lezer verder. We omzeilen geen toestemmings- of betaalmuren.
struct Article: Equatable {
    var title: String
    var byline: String?
    var siteName: String?
    var content: String // HTML, al opgeschoond door Readability
    var length: Int
    var publishedTime: String?
}

@MainActor
@Observable
final class ArticleLoader: NSObject, WKNavigationDelegate, WKUIDelegate {
    enum State: Equatable {
        case loading
        case ready(Article)
        case visit // de uitgever vraagt iets (toestemming, inloggen): toon de pagina zelf
        case failed
    }

    private(set) var state: State = .loading
    let webView: WKWebView
    private var attempts = 0
    private var article: URL?
    private var round = 0 // elke nieuwe laadronde; een oudere mag de staat niet meer zetten
    private var askedVisit = false // jij koos "Toon de pagina hier" (niet de uitgever)
    var visitByChoice: Bool { askedVisit }

    // De inlog en toestemming bij uitgevers: in de vaste opslag van WebKit, alleen voor de lezer.
    static let dataStore = WKWebsiteDataStore.default()
    private static let script: String = {
        guard let url = Bundle.main.url(forResource: "Readability", withExtension: "js"), let source = try? String(contentsOf: url, encoding: .utf8) else { return "" }
        return source
    }()

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = Self.dataStore
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 844), configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
    }

    func load(_ url: URL) {
        article = url
        state = .loading
        attempts = 0
        askedVisit = false
        round += 1
        webView.load(URLRequest(url: url))
        watchdog()
    }

    // Na toestemming of inloggen: verder. Staat de uitgever je nu op een andere pagina (de voorpagina,
    // je account), dan eerst terug naar het artikel; anders de tekst van de pagina waar je bent.
    func retry() {
        if let article, webView.url?.path() != article.path() { load(article); return }
        state = .loading
        attempts = 0
        round += 1
        let mine = round
        Task { await extract(round: mine) }
        watchdog()
    }

    // Komt er na 20 seconden nog niets (een pagina die nooit klaar is), dan zeggen we dat het niet lukt.
    private func watchdog() {
        let mine = round
        Task {
            try? await Task.sleep(for: .seconds(20))
            if round == mine && state == .loading { state = .failed }
        }
    }

    nonisolated func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor in
            guard state == .loading || state == .visit else { return }
            if state == .visit { return } // de lezer kijkt mee; jij tikt op "Verder" als je klaar bent
            let mine = round
            try? await Task.sleep(for: .milliseconds(900)) // pagina's die hun tekst met JavaScript plaatsen
            await extract(round: mine)
        }
    }

    // Een onderbroken navigatie (de pagina stuurt door, bijvoorbeeld naar een toestemmingspagina) is
    // geen mislukking: de volgende pagina laadt gewoon.
    nonisolated private static func interrupted(_ error: Error) -> Bool {
        let e = error as NSError
        return e.code == NSURLErrorCancelled || (e.domain == "WebKitErrorDomain" && e.code == 102)
    }

    nonisolated func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor in if state == .loading && !Self.interrupted(error) { state = .failed } }
    }

    nonisolated func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor in if state == .loading && !Self.interrupted(error) { state = .failed } }
    }

    // Het webproces stopte (vaak geheugen bij zware sites): opnieuw laden, en anders zeggen dat het niet lukt.
    nonisolated func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        Task { @MainActor in
            if state == .loading, attempts == 0, let article { attempts = 1; webView.load(URLRequest(url: article)) } else if state == .loading { state = .failed }
        }
    }

    // Links die een nieuw venster willen (bijvoorbeeld "Log in met …" op een inlogpagina): hier openen.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil { webView.load(navigationAction.request) }
        return nil
    }

    // Pagina's die om toestemming of een inlog vragen (DPG, Mediahuis, inlogdiensten).
    static func isGate(_ url: URL?) -> Bool {
        guard let host = url?.host()?.lowercased() else { return false }
        let path = url?.path().lowercased() ?? ""
        return ["myprivacy.", "consent.", "privacy-gate", "login.", "auth.", "account.", "myaccount.", "id."].contains { host.hasPrefix($0) || host.contains("." + $0) }
            || path.contains("/privacy-gate") || path.contains("/consent") || path.hasPrefix("/login") || path.hasPrefix("/account/login")
    }

    private func extract(round mine: Int) async {
        guard round == mine, state == .loading else { return } // een nieuwere ronde, of jij koos al iets anders
        if Self.isGate(webView.url) { state = .visit; return }
        let js = Self.script + #"""
        ;(function () {
          var doc = document.cloneNode(true);
          var a = new Readability(doc, { charThreshold: 400, keepClasses: false }).parse();
          if (!a) return null;
          // Soortlabels aan het begin ("Nieuws", "Analyse — Duiding van …") weg: alleen die, zodat
          // een korte echte openingszin blijft staan.
          var LABEL = /^(nieuws|analyse|opinie|column|interview|recensie|achtergrond|beschouwing|verslag|reportage|commentaar|essay|podcast)(\s|$)/i;
          var box = document.createElement('div');
          box.innerHTML = a.content;
          var blocks = box.querySelectorAll('p, h2, h3, h4, h5, h6, div, span');
          for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            if (b.querySelector('p, div, img, picture, figure, video')) continue;
            var t = (b.textContent || '').trim();
            if (!t) continue;
            if (t.length < 160 && LABEL.test(t)) { b.remove(); continue; }
            break;
          }
          // Rommel rond de tekst: auteursblok (foto, naam, "Profiel"), "Gepubliceerd", "Leestijd",
          // "Lees ook", deel- en volgknoppen, en lijstjes met alleen korte links.
          var byline = (a.byline || '').trim();
          var JUNK = /^(gepubliceerd|bijgewerkt|published|updated|leestijd|reading time|leeslijst|lees ook|lees meer|meer over|read more|deel dit|delen|share|volg |follow |profiel|verslaggever|redacteur|correspondent|advertentie|advertisement|skip to (main )?content|naar (de )?(hoofd)?inhoud)\b|^(by|door|tekst|text)$|voorkeursbron|nieuwsbrief|newsletter|cookie (preferences|settings|instellingen)|this content (isn't|is not) (visible|available)|deze inhoud (is niet zichtbaar|kan niet worden)/i;
          box.querySelectorAll('img').forEach(function (img) {
            var s = (img.getAttribute('src') || '') + ' ' + (img.getAttribute('class') || '');
            var alt = (img.getAttribute('alt') || '').trim();
            var w = parseInt(img.getAttribute('width') || '0', 10);
            if (/avatar|author|auteur|profile|byline|portrait|headshot|icon|logo/i.test(s) || (w && w < 160) || (byline && alt && byline.indexOf(alt) !== -1)) (img.closest('figure') || img).remove();
          });
          box.querySelectorAll('p, li, span, div, a, h4, h5, h6').forEach(function (el) {
            if (el.querySelector('p, img, figure, video, ul, ol, table, blockquote')) return;
            var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (t && t.length < 140 && (JUNK.test(t) || (byline && (t === byline || t === byline + ' ' + byline)))) el.remove();
          });
          // Een losse datumregel ("vandaag, 14:27", "28 oktober 2026") en een auteursportret met
          // alleen een naam eronder, bovenaan het stuk: geen tekst om te lezen.
          var DATE = /^((vandaag|gisteren|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|today|yesterday|\d{1,2}[ -](jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)\w*([ -]\d{4})?)(,?\s*\d{1,2}[:.]\d{2})?( uur)?|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w* \d{1,2},? \d{4}( at \d{1,2}:\d{2}( ?[ap]m)?( [a-z]{2,4}([+-]\d{1,2})?)?)?)$/i;
          var NAME = /^[A-ZÀ-Ý][\wÀ-ÿ'-]+( (van|de|der|den|ten|ter|het|'t|el|al|von|du|da|di|le|la|[A-ZÀ-Ý][\wÀ-ÿ'-]+)){1,4}$/;
          var lead = [];
          box.querySelectorAll('p, img, figure, div, span, time').forEach(function (el) { if (lead.length < 8 && !el.querySelector('p, figure')) lead.push(el); });
          lead.forEach(function (el, i) {
            var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (t && t.length < 40 && DATE.test(t)) { el.remove(); return; }
            var img = el.matches('img, figure') ? el : null;
            var next = lead[i + 1];
            var nt = next ? (next.textContent || '').replace(/\s+/g, ' ').trim() : '';
            if (img && nt && nt.length <= 40 && NAME.test(nt)) { (img.closest('figure') || img).remove(); next.remove(); }
          });
          box.querySelectorAll('ul, ol').forEach(function (l) {
            var t = (l.textContent || '').replace(/\s+/g, ' ').trim();
            if (t.length < 200 && (l.querySelectorAll('a').length > 0 || t.length < 40)) l.remove();
          });
          box.querySelectorAll('li, p, div, span, figure').forEach(function (el) {
            if (!(el.textContent || '').trim() && !el.querySelector('img, video, picture, iframe')) el.remove();
          });
          // Dezelfde alinea twee keer achter elkaar (een intro die de site herhaalt): één keer.
          var prev = '';
          box.querySelectorAll('p').forEach(function (p) {
            var t = (p.textContent || '').replace(/\s+/g, ' ').trim();
            if (t && t === prev) p.remove(); else if (t) prev = t;
          });
          a.content = box.innerHTML;
          return JSON.stringify({ title: a.title, byline: a.byline, siteName: a.siteName, content: a.content, length: a.length, publishedTime: a.publishedTime });
        })()
        """#
        // In een eigen JavaScript-omgeving: de scripts van de site kunnen er niet bij of tussen zitten.
        let raw = try? await webView.evaluateJavaScript(js, in: nil, contentWorld: .defaultClient)
        guard round == mine, state == .loading else { return }
        if let text = raw as? String, let data = text.data(using: .utf8), let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let content = obj["content"] as? String, let length = obj["length"] as? Int, length > 300 {
            state = .ready(Article(title: (obj["title"] as? String) ?? "", byline: obj["byline"] as? String, siteName: obj["siteName"] as? String, content: content, length: length, publishedTime: obj["publishedTime"] as? String))
        } else if attempts < 2 {
            attempts += 1
            try? await Task.sleep(for: .seconds(1.2))
            await extract(round: mine)
        } else {
            state = .failed
        }
    }

    func showPage() { askedVisit = true; round += 1; state = .visit }
}
