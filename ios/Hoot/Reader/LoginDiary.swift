import SwiftUI
import WebKit

// Het inlogdagboek (onderzoek inloggen-bronnen, A1): waarom word je bij een uitgever uitgelogd?
// Per uitgever houdt Hoot bij welke inlog- en accountcookies er in de lezer staan, en wanneer ze
// verschijnen en verdwijnen. Verdwijnt een cookie ruim vóór zijn vervaldatum, dan ruimde iets anders
// hem op (de trackingbescherming van WebKit, of de uitgever); was hij een sessiecookie, dan ging hij
// weg met de app.
//
// Privacy: alleen op dit toestel, er gaat niets naar de server. Per cookie alleen het domein, de naam,
// de vervaldatum (of "sessie") en of de site hem alleen zelf kan lezen (HttpOnly: dan zette de server
// hem, niet een script). Nooit de waarde. Tijden op een dagdeel nauwkeurig, niet op de minuut.
struct LoginDiary: Codable, Equatable {
    struct Cookie: Codable, Hashable {
        var publisher: String // de naam van de bron, zoals in Abonnementen
        var domain: String
        var name: String
        var expires: Date? // nil: een sessiecookie
        var httpOnly: Bool
        var key: String { "\(domain)|\(name)" }

        // Alleen wat het dagboek mag weten: de waarde gaat niet mee.
        init(publisher: String, domain: String, name: String, expires: Date?, httpOnly: Bool) {
            self.publisher = publisher
            self.domain = domain
            self.name = name
            self.expires = expires.map { LoginDiary.dagdeel($0) }
            self.httpOnly = httpOnly
        }
        init(_ cookie: HTTPCookie, publisher: String) {
            self.init(publisher: publisher, domain: cookie.domain, name: cookie.name, expires: cookie.isSessionOnly ? nil : cookie.expiresDate, httpOnly: cookie.isHTTPOnly)
        }
    }

    struct Event: Codable, Equatable {
        enum Kind: String, Codable { case appeared, gone }
        var at: Date
        var kind: Kind
        var cookie: Cookie
    }

    private(set) var cookies: [Cookie] = [] // wat er de vorige keer stond
    private(set) var events: [Event] = [] // nieuwste laatst
    private(set) var started: Date?
    static let maxEvents = 600

    // Een nieuwe blik: wat er nu staat, naast wat er de vorige keer stond.
    mutating func observe(_ now: [Cookie], at date: Date) {
        let at = Self.dagdeel(date)
        let before = Dictionary(cookies.map { ($0.key, $0) }, uniquingKeysWith: { a, _ in a })
        let after = Dictionary(now.map { ($0.key, $0) }, uniquingKeysWith: { a, _ in a })
        if started == nil {
            started = at // de eerste keer: de beginstand, geen gebeurtenissen
        } else {
            for c in now where before[c.key] == nil { events.append(Event(at: at, kind: .appeared, cookie: c)) }
            for c in cookies where after[c.key] == nil { events.append(Event(at: at, kind: .gone, cookie: c)) }
        }
        if events.count > Self.maxEvents { events.removeFirst(events.count - Self.maxEvents) }
        cookies = now.sorted { ($0.publisher, $0.domain, $0.name) < ($1.publisher, $1.domain, $1.name) }
    }

    // Waarom een cookie wegging, zo goed als we het weten.
    static func reason(_ c: Cookie, goneAt at: Date) -> String {
        guard let expires = c.expires else { return "sessie voorbij" }
        return expires <= at ? "verlopen" : "weg vóór de vervaldatum (\(dag(expires)))"
    }

    // MARK: Dagdelen: nacht, ochtend, middag, avond (0, 6, 12 en 18 uur).

    static func dagdeel(_ date: Date, calendar: Calendar = .current) -> Date {
        let day = calendar.startOfDay(for: date)
        let hour = calendar.component(.hour, from: date)
        return calendar.date(byAdding: .hour, value: hour / 6 * 6, to: day) ?? day
    }

    static func dagdeelNaam(_ date: Date, calendar: Calendar = .current) -> String {
        ["nacht", "ochtend", "middag", "avond"][min(3, calendar.component(.hour, from: date) / 6)]
    }

    static func dag(_ date: Date) -> String {
        date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "nl_NL")))
    }

    static func moment(_ date: Date) -> String { "\(dag(date)), \(dagdeelNaam(date))" }

    // MARK: Als tekst, om te delen.

    func text(version: String, now: Date = .now) -> String {
        var lines = ["Inlogdagboek Hoot \(version)", "Gedeeld \(Self.moment(now))" + (started.map { ", bijgehouden sinds \(Self.moment($0))" } ?? ""), "Alleen namen van cookies, nooit de inhoud.", ""]
        lines.append("Nu")
        if cookies.isEmpty { lines.append("  (geen inlogcookies)") }
        for c in cookies { lines.append("  \(c.publisher) · \(Self.line(c))") }
        lines.append("")
        lines.append("Wat er veranderde")
        if events.isEmpty { lines.append("  (nog niets)") }
        for e in events.reversed() { lines.append("  \(Self.moment(e.at)) · \(e.cookie.publisher) · \(Self.line(e.cookie, event: e))") }
        return lines.joined(separator: "\n")
    }

    static func line(_ c: Cookie, event: Event? = nil) -> String {
        var parts = [c.domain, c.name]
        switch event?.kind {
        case .gone?: parts.append(reason(c, goneAt: event!.at))
        case .appeared?: parts.append("verschenen, " + (c.expires.map { "tot \(dag($0))" } ?? "sessie"))
        case nil: parts.append(c.expires.map { "tot \(dag($0))" } ?? "sessie")
        }
        if c.httpOnly { parts.append("HttpOnly") }
        return parts.joined(separator: " · ")
    }

    // MARK: Opslag, alleen op dit toestel.

    static var file: URL {
        URL.applicationSupportDirectory.appending(path: "inlogdagboek.json")
    }

    static func load(from url: URL = file) -> LoginDiary {
        guard let data = try? Data(contentsOf: url), let diary = try? JSONDecoder().decode(LoginDiary.self, from: data) else { return LoginDiary() }
        return diary
    }

    func save(to url: URL = file) {
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        guard let data = try? JSONEncoder().encode(self) else { return }
        try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    static func erase(at url: URL = file) {
        try? FileManager.default.removeItem(at: url)
    }
}

// Welke cookies in het dagboek komen, en wanneer Hoot kijkt (bij het openen van de app en na het inlogvel).
@MainActor
enum LoginDiaryBook {
    // Gedeelde inlogdiensten: daar zitten de inlogs van veel kranten (Volkskrant, Telegraaf, Wired …), en
    // daar werkt de trackingbescherming het eerst.
    static let shared: [(domain: String, name: String)] = [("dpgmedia.nl", "DPG Media"), ("mediahuis.com", "Mediahuis"), ("condenast.com", "Condé Nast")]
    // De uitgevers van de laatste keer, voor als het inlogvel kijkt zonder de bronnen bij de hand.
    private static var publishers: [(domain: String, name: String)] = []
    private static var busy = false

    // Uit alle cookies alleen de inlog- en accountcookies van deze uitgevers. De waarde wordt niet gelezen.
    static func pick(_ cookies: [HTTPCookie], publishers: [(domain: String, name: String)]) -> [LoginDiary.Cookie] {
        cookies.compactMap { c in
            guard let p = publishers.first(where: { PublisherLogin.matches(c.domain, $0.domain) }),
                  PublisherLogin.mayBeLogin(name: c.name, domain: p.domain) else { return nil }
            return LoginDiary.Cookie(c, publisher: p.name)
        }
    }

    static func look(_ store: HootStore? = nil) async {
        if let store {
            let all = PublisherLogin.all(store).map { (domain: $0.domain, name: $0.source.name) }
            guard !all.isEmpty else { return } // de bronnen zijn er nog niet: niet alles "weg" noemen
            publishers = all + shared
        }
        guard !publishers.isEmpty, !busy else { return }
        busy = true
        defer { busy = false }
        let now = pick(await PublisherLogin.cookies(), publishers: publishers)
        var diary = LoginDiary.load()
        diary.observe(now, at: .now)
        diary.save()
    }
}

// Over Hoot › Inlogdagboek: wat er nu staat en wat er veranderde, en delen als tekst.
struct LoginDiaryView: View {
    @State private var diary = LoginDiary.load()

    var body: some View {
        Form {
            Section {
                if diary.cookies.isEmpty {
                    Text("Nog geen inlogcookies.").foregroundStyle(Theme.ink3)
                }
                ForEach(diary.cookies, id: \.key) { c in
                    VStack(alignment: .leading, spacing: Space.s1) {
                        Text(c.publisher).foregroundStyle(Theme.ink)
                        Text(LoginDiary.line(c)).font(.ui(.footnote)).foregroundStyle(Theme.ink3)
                    }
                    .accessibilityElement(children: .combine)
                }
            } header: {
                FormHeader("Nu")
            } footer: {
                Text("Alleen op dit toestel. Namen van cookies, nooit de inhoud.").foregroundStyle(Theme.ink3)
            }
            .hootRows()
            Section {
                if diary.events.isEmpty {
                    Text("Nog niets veranderd.").foregroundStyle(Theme.ink3)
                }
                ForEach(Array(diary.events.reversed().enumerated()), id: \.offset) { _, e in
                    VStack(alignment: .leading, spacing: Space.s1) {
                        Text("\(e.cookie.publisher), \(LoginDiary.moment(e.at))").foregroundStyle(Theme.ink)
                        Text(LoginDiary.line(e.cookie, event: e)).font(.ui(.footnote)).foregroundStyle(Theme.ink3)
                    }
                    .accessibilityElement(children: .combine)
                }
            } header: {
                FormHeader("Wat er veranderde")
            }
            .hootRows()
        }
        .hootForm()
        .navigationTitle("Inlogdagboek")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: diary.text(version: SettingsView.version)) { Label("Deel", systemImage: "square.and.arrow.up") }
            }
        }
        .task {
            await LoginDiaryBook.look()
            diary = LoginDiary.load()
        }
    }
}
