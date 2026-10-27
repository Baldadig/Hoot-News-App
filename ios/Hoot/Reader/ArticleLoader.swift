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
final class ArticleLoader: NSObject, WKNavigationDelegate {
    enum State: Equatable {
        case loading
        case ready(Article)
        case visit // de uitgever vraagt iets (toestemming, inloggen): toon de pagina zelf
        case failed
    }

    private(set) var state: State = .loading
    let webView: WKWebView
    private var attempts = 0
    private var finished = false

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
    }

    func load(_ url: URL) {
        state = .loading
        attempts = 0
        finished = false
        webView.load(URLRequest(url: url))
    }

    // Na toestemming of inloggen: opnieuw proberen op de pagina waar je nu bent.
    func retry() {
        state = .loading
        attempts = 0
        Task { await extract() }
    }

    nonisolated func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor in
            guard state == .loading || state == .visit else { return }
            if state == .visit { return } // de lezer kijkt mee; jij tikt op "Verder" als je klaar bent
            try? await Task.sleep(for: .milliseconds(900)) // pagina's die hun tekst met JavaScript plaatsen
            await extract()
        }
    }

    nonisolated func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor in if state == .loading { state = .failed } }
    }

    nonisolated func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor in if state == .loading && (error as NSError).code != NSURLErrorCancelled { state = .failed } }
    }

    // Pagina's die om toestemming of een inlog vragen (DPG, Mediahuis, inlogdiensten).
    static func isGate(_ url: URL?) -> Bool {
        guard let host = url?.host()?.lowercased() else { return false }
        let path = url?.path().lowercased() ?? ""
        return ["myprivacy.", "consent.", "privacy-gate", "login.", "auth.", "account.", "myaccount.", "id."].contains { host.hasPrefix($0) || host.contains("." + $0) }
            || path.contains("/privacy-gate") || path.contains("/consent") || path.hasPrefix("/login") || path.hasPrefix("/account/login")
    }

    private func extract() async {
        if Self.isGate(webView.url) { state = .visit; return }
        let js = Self.script + """
        ;(function () {
          var doc = document.cloneNode(true);
          var a = new Readability(doc, { charThreshold: 400, keepClasses: false }).parse();
          if (!a) return null;
          return JSON.stringify({ title: a.title, byline: a.byline, siteName: a.siteName, content: a.content, length: a.length, publishedTime: a.publishedTime });
        })()
        """
        // In een eigen JavaScript-omgeving: de scripts van de site kunnen er niet bij of tussen zitten.
        let raw = try? await webView.evaluateJavaScript(js, in: nil, contentWorld: .defaultClient)
        if let text = raw as? String, let data = text.data(using: .utf8), let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let content = obj["content"] as? String, let length = obj["length"] as? Int, length > 300 {
            state = .ready(Article(title: (obj["title"] as? String) ?? "", byline: obj["byline"] as? String, siteName: obj["siteName"] as? String, content: content, length: length, publishedTime: obj["publishedTime"] as? String))
        } else if attempts < 2 {
            attempts += 1
            try? await Task.sleep(for: .seconds(1.2))
            await extract()
        } else {
            state = .failed
        }
    }

    func showPage() { state = .visit }
}
