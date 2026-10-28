import SwiftUI
import WebKit

// Inloggen bij uitgevers: welke bronnen een abonnement of lidmaatschap hebben, en of de lezer je
// inlog daar bewaart. Hoot ziet je gegevens nooit; we kijken alleen welke cookies de site zelf in
// de opslag van de lezer zette, en noemen je pas "ingelogd" als zo'n cookie duidelijk een inlog is.
@MainActor
enum PublisherLogin {
    struct Publisher: Identifiable {
        let source: Source
        let url: URL
        let domain: String // waar de uitgever zijn cookies zet, bv. nytimes.com
        var id: String { domain }
    }

    // De inlogpagina van een bron: van de server (`login`). Stuurt die dat (nog) niet mee, dan de
    // voorpagina van een betaalde bron (zijn domein, of dat van een recent bericht).
    static func url(for s: Source, store: HootStore) -> URL? {
        if let login = s.login, let url = URL(string: login) { return url }
        guard s.paid == true else { return nil }
        if let handle = s.handle, !handle.hasPrefix("@"), let url = URL(string: "https://\(handle)/") { return url }
        return store.stream.first { $0.source == s.id }?.link.flatMap(LoginTarget.home)
    }

    // Alle uitgevers met een inlog, één keer per domein (de Guardian en Guardian Sport delen er een):
    // eerst wat je volgt, je voorkeursbronnen voorop, dan op naam.
    static func all(_ store: HootStore) -> [Publisher] {
        let followed = Set(store.followed.map(\.id))
        let ordered = store.newsSources.sorted { a, b in
            let fa = followed.contains(a.id), fb = followed.contains(b.id)
            if fa != fb { return fa }
            let sa = store.isFavorite(a.id), sb = store.isFavorite(b.id)
            if sa != sb { return sa }
            return a.name.localizedStandardCompare(b.name) == .orderedAscending
        }
        var seen = Set<String>()
        return ordered.compactMap { s in
            guard let url = url(for: s, store: store), let domain = domain(of: url), seen.insert(domain).inserted else { return nil }
            return Publisher(source: s, url: url, domain: domain)
        }
    }

    // Het hoofddomein: nytimes.com voor myaccount.nytimes.com, telegraph.co.uk voor secure.telegraph.co.uk.
    static func domain(of url: URL) -> String? {
        guard let host = url.host()?.lowercased() else { return nil }
        let parts = host.split(separator: ".").map(String.init)
        guard parts.count > 2 else { return host }
        let countryPair = parts.last!.count == 2 && ["co", "com", "org", "net", "ac", "gov"].contains(parts[parts.count - 2])
        return parts.suffix(countryPair ? 3 : 2).joined(separator: ".")
    }

    // Hoort een cookie- of recorddomein (".nytimes.com", "login2.volkskrant.nl") bij dit domein?
    static func matches(_ cookieDomain: String, _ domain: String) -> Bool {
        let d = cookieDomain.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "."))
        return d == domain || d.hasSuffix("." + domain)
    }

    // Cookies waarvan we zeker weten dat ze een inlog zijn, per uitgever.
    private static let known: [String: Set<String>] = [
        "nytimes.com": ["NYT-S"],
        "theguardian.com": ["GU_U", "SC_GU_U"],
        "ft.com": ["FTSession_s", "FTSession"],
        "lemonde.fr": ["lmd_a_m"],
        "tweakers.net": ["TnetID"],
    ]
    // Namen die bij veel sites een inlog betekenen (WordPress, Piano ID, Auth0, NextAuth, tokens).
    // Bewust geen losse "session": die krijgt ook wie alleen even meeleest.
    private static let markers = ["logged_in", "loggedin", "is.authenticated", "session-token", "access_token", "accesstoken", "id_token", "refresh_token", "auth_token", "authtoken", "jwt"]
    private static let noise = ["consent", "cmp", "didomi", "optanon", "privacy", "_ga", "cookiebot"]

    static func isLogin(_ c: HTTPCookie, domain: String) -> Bool {
        if known[domain]?.contains(c.name) == true { return !c.value.isEmpty }
        let name = c.name.lowercased()
        guard !noise.contains(where: name.contains) else { return false }
        guard name == "__utp" || name.hasPrefix("wordpress_logged_in_") || markers.contains(where: name.contains) else { return false }
        // Een vlag als loggedIn=false telt niet; een inlog blijft bewaard (geen sessiecookie).
        guard !["", "0", "false", "null", "undefined", "no"].contains(c.value.lowercased()) else { return false }
        guard let expires = c.expiresDate, expires > .now else { return false }
        return true
    }

    // Bij welke van deze domeinen staat een inlog in de opslag van de lezer?
    static func loggedIn(_ domains: [String]) async -> Set<String> {
        // Na het opstarten geeft de cookie-opslag niets terug zolang WebKit de bewaarde cookies nog
        // niet inlas; de lijst met websitegegevens opvragen laat hem dat eerst doen.
        _ = await ArticleLoader.dataStore.dataRecords(ofTypes: [WKWebsiteDataTypeCookies])
        let cookies = await ArticleLoader.dataStore.httpCookieStore.allCookies()
        return Set(domains.filter { d in cookies.contains { matches($0.domain, d) && isLogin($0, domain: d) } })
    }

    // Uitloggen bij één uitgever: alles wat de site in de lezer bewaarde (cookies, opslag) weg.
    static func logOut(_ domain: String) async {
        let store = ArticleLoader.dataStore
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        let records = await store.dataRecords(ofTypes: types).filter { matches($0.displayName, domain) }
        await store.removeData(ofTypes: types, for: records)
        for c in await store.httpCookieStore.allCookies() where matches(c.domain, domain) {
            await store.httpCookieStore.deleteCookie(c)
        }
    }
}

// Instellingen › Je abonnementen: per uitgever één keer inloggen voor de lezer, en zien waar je
// al bent ingelogd. Bovenaan wat je volgt (en waar je al bent ingelogd), de rest ingeklapt.
struct SubscriptionsView: View {
    @Environment(HootStore.self) private var store
    @State private var login: LoginTarget?
    @State private var loggedIn: Set<String> = []
    @State private var leaving: PublisherLogin.Publisher?
    @State private var confirmForget = false
    @State private var showMore = false

    var body: some View {
        let all = PublisherLogin.all(store)
        let followed = Set(store.followed.map(\.id))
        let mine = all.filter { followed.contains($0.source.id) || loggedIn.contains($0.domain) }
        let more = all.filter { !followed.contains($0.source.id) && !loggedIn.contains($0.domain) }
        List {
            Section {
                if mine.isEmpty {
                    Text("Geen van je bronnen heeft een abonnement.").foregroundStyle(Theme.ink3)
                }
                ForEach(mine) { row($0) }
            } footer: {
                Text("Log één keer in; daarna lees je de artikelen helemaal in de lezer. Je typt je gegevens op de site van de uitgever zelf; Hoot ziet ze niet. Je inlog blijft alleen op dit toestel. Ingelogd staat erbij als Hoot je inlog bij die uitgever herkent; niet elke site laat dat zien. Veeg naar links om bij één uitgever uit te loggen.").foregroundStyle(Theme.ink3)
            }
            if !more.isEmpty {
                // Eigen uitklapregel i.p.v. DisclosureGroup: die laat de rijen inspringen, en dan
                // staan de logo's niet meer onder die van de bronnen erboven.
                Section {
                    Button { withAnimation { showMore.toggle() } } label: {
                        HStack {
                            Text("Meer bronnen met een abonnement").foregroundStyle(Theme.ink)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Theme.ink3)
                                .rotationEffect(.degrees(showMore ? 90 : 0))
                        }
                    }
                    .accessibilityValue(showMore ? "Uitgeklapt" : "Ingeklapt")
                    if showMore { ForEach(more) { row($0) } }
                }
            }
            Section {
                Button("Overal uitloggen in de lezer", role: .destructive) { confirmForget = true }
            }
        }
        .task(id: all.map(\.domain)) { await refresh(all) } // opnieuw zodra de bronnen (van de server) binnen zijn
        .sheet(item: $login, onDismiss: { Task { await refresh(PublisherLogin.all(store)) } }) { LoginWebView(target: $0) }
        .alert("Uitloggen bij \(leaving?.source.name ?? "")?", isPresented: Binding(get: { leaving != nil }, set: { if !$0 { leaving = nil } })) {
            Button("Annuleer", role: .cancel) {}
            Button("Log uit", role: .destructive) {
                guard let p = leaving else { return }
                Task {
                    await PublisherLogin.logOut(p.domain)
                    await refresh(PublisherLogin.all(store))
                }
            }
        } message: {
            Text("De lezer vergeet je inlog en toestemmingen bij \(leaving?.source.name ?? "deze uitgever"). Je abonnement zelf blijft gewoon bestaan.")
        }
        .alert("Overal uitloggen in de lezer?", isPresented: $confirmForget) {
            Button("Annuleer", role: .cancel) {}
            Button("Log uit", role: .destructive) {
                ArticleLoader.dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast) {}
                loggedIn = []
            }
        } message: {
            Text("De lezer vergeet je inlog en toestemmingen bij alle uitgevers. Je abonnementen zelf blijven gewoon bestaan.")
        }
    }

    private func row(_ p: PublisherLogin.Publisher) -> some View {
        let on = loggedIn.contains(p.domain)
        // Ook ingelogd opent de site: daar zie en beheer je je account.
        return Button { login = LoginTarget(name: p.source.name, url: p.url) } label: {
            HStack(spacing: Space.s3) {
                SourceAvatar(source: p.source, size: 32)
                Text(p.source.name).foregroundStyle(Theme.ink)
                    // De scheidingslijn begint altijd bij de naam, zoals bij Bronnen (SwiftUI kiest anders per rij).
                    .alignmentGuide(.listRowSeparatorLeading) { $0[.leading] }
                Spacer()
                if on {
                    // Even groot als "Inloggen", zodat de kolom rechts gelijk blijft; het vinkje maakt het verschil.
                    HStack(spacing: Space.s1) {
                        Image(systemName: "checkmark").font(.body.weight(.semibold))
                        Text("Ingelogd")
                    }
                    .foregroundStyle(Theme.accent)
                } else {
                    Text("Inloggen").foregroundStyle(Theme.accent)
                }
            }
        }
        .accessibilityHint(on ? "Opent de site van \(p.source.name), waar je bent ingelogd" : "Opent de inlogpagina van \(p.source.name)")
        .swipeActions {
            if on { Button("Uitloggen", role: .destructive) { leaving = p } }
        }
        .contextMenu {
            if on { Button("Uitloggen", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) { leaving = p } }
        }
    }

    private func refresh(_ all: [PublisherLogin.Publisher]) async {
        let found = await PublisherLogin.loggedIn(all.map(\.domain))
        // Een oudere ronde (nog zonder bronnen) mag een nieuwere niet overschrijven.
        if !Task.isCancelled { loggedIn = found }
    }
}

// De regel in Instellingen: hoeveel uitgevers je inlog herkennen.
struct SubscriptionsRow: View {
    @Environment(HootStore.self) private var store
    @State private var count = 0

    var body: some View {
        LabeledContent {
            if count > 0 { Text("\(count) ingelogd") }
        } label: {
            Label("Inloggen bij je abonnementen", systemImage: "key")
        }
        .task(id: PublisherLogin.all(store).map(\.domain)) {
            let found = await PublisherLogin.loggedIn(PublisherLogin.all(store).map(\.domain)).count
            if !Task.isCancelled { count = found }
        }
    }
}
