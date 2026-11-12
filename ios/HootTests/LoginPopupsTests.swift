import XCTest
import WebKit
@testable import Hoot

// Inloggen bij bronnen, optie 1: echte pop-ups (maken, sluiten, VoiceOver), Google herkennen in het
// hoofdframe en in een pop-up, en de wachtwoordpagina's per uitgever.
@MainActor
final class LoginPopupsTests: XCTestCase {
    private func action(_ url: String) -> URL { URL(string: url)! }

    // MARK: Google herkennen

    func testGoogleSignInIsRecognised() {
        XCTAssertTrue(LoginPopups.isGoogleSignIn(action("https://accounts.google.com/o/oauth2/v2/auth?client_id=x")))
        XCTAssertTrue(LoginPopups.isGoogleSignIn(action("https://accounts.google.com/gsi/select?client_id=x")))
        XCTAssertTrue(LoginPopups.isGoogleSignIn(action("https://ACCOUNTS.google.com/signin")))
        XCTAssertTrue(LoginPopups.isGoogleSignIn(action("https://www.google.com/accounts/o8/ud")))
    }

    func testOtherPagesAreNotGoogleSignIn() {
        XCTAssertFalse(LoginPopups.isGoogleSignIn(action("https://appleid.apple.com/auth/authorize")))
        XCTAssertFalse(LoginPopups.isGoogleSignIn(action("https://www.google.com/search?q=hoot")))
        XCTAssertFalse(LoginPopups.isGoogleSignIn(action("https://login.nrc.nl/clientredirect?client_name=Google")))
        XCTAssertFalse(LoginPopups.isGoogleSignIn(action("https://accounts.google.com.example.org/")))
        XCTAssertFalse(LoginPopups.isGoogleSignIn(nil))
    }

    // Hoofdframe naar Google: stoppen en het blad. Een iframe van Google (de knop van Google Identity
    // Services) mag tekenen.
    func testMainFrameToGoogleShowsTheSheet() {
        let popups = LoginPopups()
        let page = WKWebView()
        XCTAssertEqual(popups.decide(page, url: action("https://accounts.google.com/o/oauth2/auth"), mainFrame: false), .allow)
        XCTAssertNil(popups.sheet)
        XCTAssertEqual(popups.decide(page, url: action("https://appleid.apple.com/auth/authorize"), mainFrame: true), .allow)
        XCTAssertNil(popups.sheet)
        XCTAssertEqual(popups.decide(page, url: action("https://accounts.google.com/o/oauth2/auth"), mainFrame: true), .cancel)
        XCTAssertEqual(popups.sheet?.id, "google")
        popups.dismissSheet()
        XCTAssertNil(popups.sheet)
    }

    // Een pop-up die naar Google gaat, gaat dicht en wordt in dezelfde beweging het blad (één vel).
    func testPopupToGoogleClosesAndBecomesTheSheet() {
        let popups = LoginPopups()
        let popup = WKWebView()
        popups.stack.append(.init(webView: popup))
        XCTAssertEqual(popups.sheet?.id, popups.stack.first?.id.uuidString)
        XCTAssertEqual(popups.decide(popup, url: action("https://accounts.google.com/gsi/select"), mainFrame: true), .cancel)
        XCTAssertTrue(popups.stack.isEmpty)
        XCTAssertEqual(popups.sheet?.id, "google")
    }

    // MARK: Welke vensters een inlogvel worden

    func testLoginServicesAreRecognised() {
        for u in ["https://appleid.apple.com/auth/authorize", "https://accounts.google.com/o/oauth2/auth", "https://login.nrc.nl/clientredirect",
                  "https://auth.example.com/x", "https://account.theverge.com/signin", "https://id.vox.com/", "https://www.facebook.com/v18.0/dialog/oauth",
                  "https://www.telegraph.co.uk/login", "https://login.microsoftonline.com/common/oauth2", "https://x.com/i/flow/login"] {
            XCTAssertTrue(LoginPopups.looksLikeLogin(action(u)), u)
        }
        for u in ["https://www.nrc.nl/voorwaarden/", "https://www.theguardian.com/info/privacy", "https://www.facebook.com/sharer/sharer.php?u=x",
                  "https://twitter.com/intent/tweet", "https://www.example.com/artikel", "about:blank"] {
            XCTAssertFalse(LoginPopups.looksLikeLogin(action(u)), u)
        }
        XCTAssertFalse(LoginPopups.looksLikeLogin(nil))
    }

    // Een gewone link met target=_blank opent in dezelfde weergave (zoals vroeger); een inlogdienst, ook via
    // een link, een vel; window.open van een script een echt venster; Google blijft het blad.
    func testPlanPerNewWindowRequest() {
        XCTAssertEqual(LoginPopups.plan(url: action("https://www.nrc.nl/voorwaarden/"), linkActivated: true), .sameView)
        XCTAssertEqual(LoginPopups.plan(url: action("https://appleid.apple.com/auth/authorize"), linkActivated: true), .popup)
        XCTAssertEqual(LoginPopups.plan(url: action("https://appleid.apple.com/auth/authorize"), linkActivated: false), .popup)
        XCTAssertEqual(LoginPopups.plan(url: action("about:blank"), linkActivated: false), .popup, "window.open('') wacht op een opener")
        XCTAssertEqual(LoginPopups.plan(url: action("https://www.example.com/deel"), linkActivated: false), .popup)
        XCTAssertEqual(LoginPopups.plan(url: action("https://accounts.google.com/o/oauth2/auth"), linkActivated: true), .google)
    }

    // MARK: Pop-ups maken en sluiten (met WebKit zelf: window.open, opener, window.close)

    func testWindowOpenMakesARealSecondWindowAndCloseRemovesIt() async throws {
        let popups = LoginPopups()
        var said: [String] = []
        popups.sourceName = "The Telegraph"
        popups.announce = { said.append($0) }
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        let page = WKWebView(frame: .zero, configuration: config)
        page.uiDelegate = popups
        page.loadHTMLString("<p>pagina</p>", baseURL: URL(string: "https://www.example.com/"))
        try await waitUntil { !page.isLoading }

        // window.open geeft een echt venster terug (geen null), en dat wordt een vel.
        let opened = try await page.evaluateJavaScript("window.__w = window.open('about:blank', 'inlog'); !!window.__w") as? Bool
        XCTAssertEqual(opened, true)
        try await waitUntil { popups.stack.count == 1 }
        let popup = try XCTUnwrap(popups.stack.first?.webView)
        XCTAssertEqual(popups.sheet?.id, popups.stack.first?.id.uuidString)
        // Het nieuwe venster kent zijn opener.
        let hasOpener = try await popup.evaluateJavaScript("!!window.opener") as? Bool
        XCTAssertEqual(hasOpener, true)

        // De inlogdienst is klaar: window.close() sluit het vel, en VoiceOver hoort waar je bent.
        popups.webViewDidClose(popup)
        XCTAssertTrue(popups.stack.isEmpty)
        XCTAssertNil(popups.sheet)
        try await waitUntil { !said.isEmpty }
        XCTAssertEqual(said, ["Je bent terug op de pagina van The Telegraph."])
    }

    func testClosingTheMainPageOrAnUnknownViewDoesNothing() {
        let popups = LoginPopups()
        var said: [String] = []
        popups.announce = { said.append($0) }
        popups.webViewDidClose(WKWebView())
        XCTAssertTrue(popups.stack.isEmpty)
        XCTAssertFalse(popups.close(WKWebView()))
        XCTAssertTrue(said.isEmpty)
    }

    func testCancelClosesOnlyTheTopPopup() {
        let popups = LoginPopups()
        popups.stack.append(.init(webView: WKWebView()))
        popups.stack.append(.init(webView: WKWebView()))
        popups.dismissSheet()
        XCTAssertEqual(popups.stack.count, 1)
        popups.dismissSheet()
        XCTAssertTrue(popups.stack.isEmpty)
    }

    func testTitlesAndAnnouncement() {
        XCTAssertEqual(LoginPopupSheet.title("appleid.apple.com", login: true), "Inloggen bij appleid.apple.com")
        XCTAssertEqual(LoginPopupSheet.title("", login: true), "Inloggen")
        XCTAssertEqual(LoginPopupSheet.title("www.telegraph.co.uk", login: false), "www.telegraph.co.uk", "geen inlogdienst: alleen de host")
        XCTAssertEqual(LoginPopupSheet.title("", login: false), "Venster")
        XCTAssertEqual(LoginPopups.announcement("NRC"), "Je bent terug op de pagina van NRC.")
    }

    // MARK: Wachtwoord maken en Lees in Safari

    func testPasswordPagesOnlyWhereTheyExist() throws {
        XCTAssertEqual(PublisherLogin.passwordPage("nrc.nl")?.absoluteString, "https://login.nrc.nl/wachtwoord-vergeten")
        XCTAssertEqual(PublisherLogin.passwordPage(PublisherLogin.domain(of: action("https://profile.theguardian.com/signin"))), action("https://profile.theguardian.com/reset-password"))
        XCTAssertEqual(PublisherLogin.passwordPage(PublisherLogin.domain(of: action("https://www.independent.co.uk/login")))?.host(), "www.independent.co.uk")
        XCTAssertNil(PublisherLogin.passwordPage("telegraph.co.uk"), "de Telegraph heeft geen losse pagina")
        XCTAssertNil(PublisherLogin.passwordPage("volkskrant.nl"), "DPG kent geen Google")
        XCTAssertNil(PublisherLogin.passwordPage(nil))
        for domain in PublisherLogin.passwordDomains {
            let url = try XCTUnwrap(PublisherLogin.passwordPage(domain))
            XCTAssertEqual(url.scheme, "https", domain)
        }
    }

    func testSafariOpensTheArticleOrTheFrontPage() {
        let article = action("https://www.nrc.nl/nieuws/2026/11/12/stuk")
        XCTAssertEqual(LoginTarget(name: "NRC", url: action("https://www.nrc.nl/login/"), article: article).safari, article)
        XCTAssertEqual(LoginTarget(name: "NRC", url: action("https://login.nrc.nl/login")).safari, action("https://nrc.nl/"))
        // Het vel begint op de wachtwoordpagina, de inlog blijft bij de uitgever horen.
        let t = LoginTarget(name: "NRC", url: action("https://www.nrc.nl/login/"), start: PublisherLogin.passwordPage("nrc.nl"))
        XCTAssertEqual(t.id, "https://login.nrc.nl/wachtwoord-vergeten")
    }

    private func waitUntil(_ timeout: TimeInterval = 10, _ ok: @escaping () -> Bool) async throws {
        let end = Date.now.addingTimeInterval(timeout)
        while !ok() {
            if Date.now > end { XCTFail("te lang gewacht"); return }
            try await Task.sleep(for: .milliseconds(50))
        }
    }
}
