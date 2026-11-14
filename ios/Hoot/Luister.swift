import SwiftUI
import UIKit

// Luister verder (stap 3, besluit Alex 14 november 2026; build 56): bij een verhaal waar een goede podcast over is,
// luister je met één tik verder in je eigen podcastapp. De server koppelt streng (netlify/lib/luister.mjs: alleen een
// echte match, hetzelfde of verdiepend, liefst van dezelfde bron) en zet het veld `luister` op het verhaal. Dit bestand
// is gelijk aan shared/luister-weergave.mjs op het web (toetsen: HootTests/LuisterTests, tests/luister-zichtbaar).
//
// - In de lezer: een rij onder de bronregel (ReaderHTML.luisterRij), met de cover van de show.
// - Op de Editie-kaart: een stil koptelefoontje naast bewaren (LuisterKnop), en "Luister verder" in het ⋯-menu.
// - In Vergelijken: een sectie "Luister" met hooguit drie afleveringen (LuisterSectie).
// - De eerste tik vraagt "Waar luister je podcasts?" (alleen apps die op het toestel staan); Hoot onthoudt het
//   (`hoot.podcastApp`, alleen op dit toestel). Instellingen › Artikelen › Podcasts. Geen teller.

/// Het veld `luister` van de server: de beste aflevering, met de andere kandidaten in `andere`.
struct StoryLuister: Codable, Hashable {
    var show: String
    var showId: String?
    var bron: String?
    var uitgever: String?
    var aflevering: String
    var verschenen: String?
    var tijd: String?
    var duur: Double?
    var link: String
    var apple: String?
    var spotify: String?
    var cover: String?
    var alleenVolgers: Bool?
    var andere: [StoryLuister]?

    private enum CodingKeys: String, CodingKey { case show, showId, bron, uitgever, aflevering, verschenen, tijd, duur, link, apple, spotify, cover, alleenVolgers, andere }

    init(show: String, showId: String? = nil, bron: String? = nil, uitgever: String? = nil, aflevering: String, verschenen: String? = nil, tijd: String? = nil, duur: Double? = nil, link: String, apple: String? = nil, spotify: String? = nil, cover: String? = nil, alleenVolgers: Bool? = nil, andere: [StoryLuister]? = nil) {
        self.show = show; self.showId = showId; self.bron = bron; self.uitgever = uitgever; self.aflevering = aflevering
        self.verschenen = verschenen; self.tijd = tijd; self.duur = duur; self.link = link; self.apple = apple
        self.spotify = spotify; self.cover = cover; self.alleenVolgers = alleenVolgers; self.andere = andere
    }

    // Leest nooit fout: een kapotte andere valt weg, een onbekend veld wordt overgeslagen.
    private struct Los: Decodable {
        let waarde: StoryLuister?
        init(from decoder: Decoder) throws { waarde = try? StoryLuister(from: decoder) }
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        show = try c.decode(String.self, forKey: .show)
        aflevering = try c.decode(String.self, forKey: .aflevering)
        link = try c.decode(String.self, forKey: .link)
        showId = try? c.decodeIfPresent(String.self, forKey: .showId)
        bron = try? c.decodeIfPresent(String.self, forKey: .bron)
        uitgever = try? c.decodeIfPresent(String.self, forKey: .uitgever)
        verschenen = try? c.decodeIfPresent(String.self, forKey: .verschenen)
        tijd = try? c.decodeIfPresent(String.self, forKey: .tijd)
        duur = try? c.decodeIfPresent(Double.self, forKey: .duur)
        apple = try? c.decodeIfPresent(String.self, forKey: .apple)
        spotify = try? c.decodeIfPresent(String.self, forKey: .spotify)
        cover = try? c.decodeIfPresent(String.self, forKey: .cover)
        alleenVolgers = try? c.decodeIfPresent(Bool.self, forKey: .alleenVolgers)
        andere = ((try? c.decodeIfPresent([Los].self, forKey: .andere)) ?? nil)?.compactMap(\.waarde)
    }

    var id: String { showId ?? show }
    var coverURL: URL? { cover.flatMap(URL.init(string:)).flatMap { $0.scheme == "https" ? $0 : nil } }
}

enum Luister {
    static let rijTitel = "Luister verder"
    static let sectie = "Luister"
    static let vraagTitel = "Waar luister je podcasts?"
    static let vraagTekst = "Hoot onthoudt je keuze."
    static let maxVergelijken = 3
    /// De apps in het actieblad, in deze volgorde. Podimo nog niet: eerst een toesteltest (CONCEPT § 4).
    static let apps: [(id: String, naam: String, schema: String)] = [("apple", "Apple Podcasts", "podcasts://"), ("spotify", "Spotify", "spotify://")]
    static let keuzes: [(id: String, naam: String)] = apps.map { ($0.id, $0.naam) } + [("vragen", "Altijd vragen"), ("uit", "Niet tonen")]
    static func appNaam(_ id: String?) -> String? { apps.first { $0.id == id }?.naam }
    static func geldig(_ id: String) -> String { keuzes.contains { $0.id == id } ? id : "" }

    private static func goed(_ a: StoryLuister) -> Bool {
        !a.show.trimmingCharacters(in: .whitespaces).isEmpty && (a.link.hasPrefix("https://") || a.link.hasPrefix("http://"))
    }

    /// De afleveringen die bij deze lezer passen, de beste eerst. Een show die niet Nederlandstalig is
    /// (`alleenVolgers`) alleen voor wie die bron volgt.
    static func afleveringen(_ l: StoryLuister?, volgt: (String) -> Bool) -> [StoryLuister] {
        guard let l, goed(l) else { return [] }
        var eerste = l
        eerste.andere = nil
        var seen = Set<String>()
        return ([eerste] + (l.andere ?? [])).filter { a in
            guard goed(a), !(a.alleenVolgers == true && !volgt(a.bron ?? "")) else { return false }
            return seen.insert(a.id).inserted
        }
    }

    private static let nl: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Europe/Amsterdam") ?? .current
        return c
    }()
    private static let dagen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"]
    private static func datum(_ a: StoryLuister) -> Date? {
        if let t = a.tijd, let d = HootDate.parse(t) { return d }
        if let v = a.verschenen, let d = HootDate.parse(v + "T12:00:00Z") { return d }
        return nil
    }
    /// "vandaag", "gisteren" of de naam van de dag (binnen een week). Nooit een kloktijd.
    static func dag(_ a: StoryLuister, now: Date = .now) -> String? {
        guard let d = datum(a) else { return nil }
        let n = nl.dateComponents([.day], from: nl.startOfDay(for: d), to: nl.startOfDay(for: now)).day ?? 0
        if n <= 0 { return "vandaag" }
        if n == 1 { return "gisteren" }
        if n < 7 { return dagen[nl.component(.weekday, from: d) - 1] }
        return nil
    }
    static func duur(_ sec: Double?) -> String? { sec.flatMap { $0 > 0 ? "\(max(1, Int(($0 / 60).rounded()))) min" : nil } }
    private static func duurVoluit(_ sec: Double?) -> String? { sec.flatMap { $0 > 0 ? "\(max(1, Int(($0 / 60).rounded()))) minuten" : nil } }
    /// "{show} · {dag} · {duur}"
    static func regel(_ a: StoryLuister, now: Date = .now) -> String { [a.show, dag(a, now: now), duur(a.duur)].compactMap { $0 }.joined(separator: " · ") }
    /// VoiceOver: "Luister verder, De Dag, gisteren, 29 minuten. Opent in Spotify."
    static func label(_ a: StoryLuister, app: String?, now: Date = .now) -> String {
        let delen = [a.show, dag(a, now: now), duurVoluit(a.duur)].compactMap { $0 }.joined(separator: ", ")
        return "Luister verder, \(delen)." + (appNaam(app).map { " Opent in \($0)." } ?? "")
    }

    /// Welke link een keuze opent: Apple Podcasts de aflevering (of de show), Spotify de show, anders de pagina van de
    /// aflevering bij de uitgever.
    static func link(_ a: StoryLuister, app: String?) -> URL? {
        let s = app == "apple" ? a.apple ?? a.link : app == "spotify" ? a.spotify ?? a.link : a.link
        return URL(string: s) ?? URL(string: a.link)
    }

    enum Tik: Equatable {
        case niets
        case open(String?, onthoud: Bool) // nil: de pagina van de uitgever
        case vraag([String])
    }
    /// Wat een tik doet, gegeven de keuze en de apps die op het toestel staan.
    static func bijTik(_ keuze: String, apps: [String]) -> Tik {
        switch keuze {
        case "uit": return .niets
        case "apple", "spotify": return .open(keuze, onthoud: false)
        case "vragen": return apps.isEmpty ? .open(nil, onthoud: false) : .vraag(apps)
        default:
            if apps.isEmpty { return .open(nil, onthoud: false) }
            if apps.count == 1 { return .open(apps[0], onthoud: true) }
            return .vraag(apps)
        }
    }

    /// De podcastapps op dit toestel (canOpenURL met LSApplicationQueriesSchemes). Verlaat het toestel nooit.
    @MainActor static func geinstalleerd() -> [String] {
        #if DEBUG
        // `-HootLuisterApps apple,spotify`: alsof deze apps er staan (de simulator heeft ze niet; voor opnamen).
        if let nep = UserDefaults.standard.string(forKey: "HootLuisterApps") { return nep.split(separator: ",").map(String.init).filter { id in apps.contains { $0.id == id } } }
        #endif
        return apps.filter { URL(string: $0.schema).map(UIApplication.shared.canOpenURL) ?? false }.map(\.id)
    }

    /// Openen: in de app als die de link aanneemt (universele link), anders de pagina van de uitgever.
    @MainActor static func open(_ a: StoryLuister, app: String?) {
        guard let web = URL(string: a.link) else { return }
        guard let app, let url = link(a, app: app), url != web else { UIApplication.shared.open(web); return }
        UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { ok in
            if !ok { UIApplication.shared.open(web) }
        }
    }
}

extension HootStore {
    /// De afleveringen bij dit verhaal voor deze lezer; leeg bij Niet tonen.
    func luister(_ story: Story?) -> [StoryLuister] {
        guard podcastApp != "uit", let story else { return [] }
        let l = storiesById[story.id]?.luister ?? story.luister ?? DebugLaunch.luister(story.id)
        return Luister.afleveringen(l, volgt: { [self] bron in source(bron).map(isOn) ?? false })
    }
    func luister(of item: Item) -> StoryLuister? { luister(story(of: item)).first }
}

/// De vraag en het openen, voor elke plek met een tik op Luister verder. `vraag` staat op de view die het actieblad
/// draagt (`.luisterVraag`).
@MainActor
struct LuisterActie {
    let store: HootStore
    func tik(_ a: StoryLuister, vraag: inout StoryLuister?) {
        switch Luister.bijTik(store.podcastApp, apps: Luister.geinstalleerd()) {
        case .niets: return
        case .vraag: vraag = a
        case let .open(app, onthoud):
            if onthoud, let app { store.podcastApp = app }
            Luister.open(a, app: app)
        }
    }
    func kies(_ app: String, voor a: StoryLuister) {
        if store.podcastApp != "vragen" { store.podcastApp = app }
        Luister.open(a, app: app)
    }
}

extension View {
    /// Het systeemactieblad "Waar luister je podcasts?" met alleen de apps die op het toestel staan.
    func luisterVraag(_ vraag: Binding<StoryLuister?>, store: HootStore) -> some View {
        modifier(LuisterVraag(vraag: vraag, store: store))
    }
}

private struct LuisterVraag: ViewModifier {
    @Binding var vraag: StoryLuister?
    let store: HootStore
    func body(content: Content) -> some View {
        content.confirmationDialog(Luister.vraagTitel, isPresented: Binding(get: { vraag != nil }, set: { if !$0 { vraag = nil } }), titleVisibility: .visible, presenting: vraag) { a in
            let er = Luister.geinstalleerd()
            ForEach(Luister.apps.filter { er.contains($0.id) || er.isEmpty }, id: \.id) { app in
                Button(app.naam) { LuisterActie(store: store).kies(app.id, voor: a) }
            }
            Button("Annuleer", role: .cancel) {}
        } message: { _ in
            Text(Luister.vraagTekst)
        }
    }
}

/// Het koptelefoontje in de bronregel van de Editie-kaart, naast bewaren: stil (ink-3), tik = luister verder.
struct LuisterKnop: View {
    @Environment(HootStore.self) private var store
    let a: StoryLuister
    @State private var vraag: StoryLuister?
    var body: some View {
        Button { LuisterActie(store: store).tik(a, vraag: &vraag) } label: {
            Image(systemName: "headphones")
                .font(.body)
                .dynamicTypeSize(...DynamicTypeSize.xxxLarge) // het icoon past altijd in zijn aanraakvlak
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(Theme.ink3)
        .accessibilityLabel(Luister.label(a, app: store.podcastApp))
        .accessibilityAddTraits(.isLink)
        .luisterVraag($vraag, store: store)
    }
}

/// Vergelijken › Luister: hooguit drie afleveringen, de beste eerst. Cover 44 (Radius.sm), de titel in de kopletter,
/// "{show} · {dag} · {duur}" in ink-3, rechts de pijl naar buiten. Gelijk aan src/components/Luister.jsx.
struct LuisterSectie: View {
    @Environment(HootStore.self) private var store
    let lijst: [StoryLuister]
    @State private var vraag: StoryLuister?
    var body: some View {
        ForEach(lijst.prefix(Luister.maxVergelijken), id: \.id) { a in
            Button { LuisterActie(store: store).tik(a, vraag: &vraag) } label: {
                HStack(spacing: Space.s3) {
                    LuisterCover(url: a.coverURL, size: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(a.aflevering)
                            .font(.kop(.headline))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(Luister.regel(a))
                            .font(.ui(.footnote))
                            .foregroundStyle(Theme.ink3)
                    }
                    Spacer(minLength: Space.s2)
                    Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3).accessibilityHidden(true)
                }
                .frame(minHeight: Space.tap)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(Luister.label(a, app: store.podcastApp)) \(a.aflevering)")
            .accessibilityAddTraits(.isLink)
        }
        .luisterVraag($vraag, store: store)
    }
}

/// De cover van de show (url van de uitgever); zonder cover een stil koptelefoontje op het vlak.
struct LuisterCover: View {
    let url: URL?
    var size: CGFloat = 44
    var body: some View {
        AsyncImage(url: url) { phase in
            if let image = phase.image { image.resizable().scaledToFill() } else {
                ZStack { Theme.surface; Image(systemName: "headphones").foregroundStyle(Theme.ink3) }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).strokeBorder(Theme.hairline, lineWidth: 1))
        .accessibilityHidden(true)
    }
}
