import XCTest
import SwiftUI
@testable import Hoot

// Instellingen D (Hoot-design/woensdag-2026-11-04/instellingen-concept): elke rij uit de inventaris van
// build 47 heeft een plek, nergens dieper dan één tik; de Tekstgrootte telt op bij Dynamic Type en kapt
// niets af, ook niet bij AX5 met de grootste stand. Stills als bijlagen (Licht, Nacht, AX5).
@MainActor final class InstellingenDTests: XCTestCase {
    override func tearDown() {
        TekstSchaal.shared.stand = TekstSchaal.standaard
        TekstSchaal.shared.systeem = .large
        super.tearDown()
    }

    // INVENTARIS.md, iOS-tabel (#1 tot #28): het oude label en waar het nu staat.
    static let inventaris: [(nr: String, oud: String, nu: String)] = [
        ("1", "Accountkaart", "Account"),
        ("1a", "Lezen kan zonder account.", "Account"), // de inlogpagina zegt het
        ("2", "Interesses", "Interesses"),
        ("3", "Bronnen", "Bronnen"),
        ("4", "Selectie", "Selectie"),
        ("5", "Buiten je bubbel", "Buiten je bubbel"),
        ("6", "Seintje bij een nieuwe Editie", "Seintje bij een nieuwe Editie"),
        ("6a", "Ochtendeditie", "Ochtendeditie"),
        ("6b", "Middageditie", "Middageditie"),
        ("6c", "Avondeditie", "Avondeditie"),
        ("6d", "Seintjes staan uit", "Seintjes staan uit"),
        ("8", "Gekozen", "Gekozen"),
        ("9", "Vaak gelezen + Vergeet dit", "Vergeet dit"),
        ("10", "Minder + Ongedaan maken", "Ongedaan maken"),
        ("11", "Nog niets", "Nog niets geleerd"),
        ("13", "Weergave", "Weergave"),
        ("14", "Als het donker is", "Als het donker is"),
        ("15", "Beeld", "Beeld"),
        ("16", "Intro", "Intro"),
        ("17", "Artikelen openen", "Artikelen openen"),
        ("18", "Inloggen bij je abonnementen", "Abonnementen"),
        ("19", "App-icoon", "App-icoon"),
        ("21", "Lees de Stroom als", "Lees de Stroom als"),
        ("22", "Bluesky in de Stroom", "Bluesky in de Stroom"),
        ("23", "Bluesky-accounts", "Bluesky-accounts"),
        ("24a", "Alles als ongelezen markeren", "Alles als ongelezen markeren"),
        ("24b", "Bewaarde artikelen verwijderen", "Bewaarde artikelen verwijderen"),
        ("24c", "Stel Hoot opnieuw in", "Stel Hoot opnieuw in"),
        ("25", "Hulp en contact", "Hulp en contact"),
        ("26", "Privacy", "Privacy"),
        ("27", "gethoot.app", "gethoot.app"),
        ("28", "Hoot 1.1.0 (45) · gemaakt door Baldadig", "Over Hoot"),
        // Account-blad (was: de accountkaart).
        ("A1", "Nu synchroniseren", "Nu synchroniseren"),
        ("A2", "Uitloggen", "Uitloggen"),
        ("A3", "Account verwijderen", "Account verwijderen"),
    ]

    func testElkeRijUitDeInventarisHeeftEenPlekHooguitEenTikDiep() {
        let hoofd = Set(SettingsMap.main.rows)
        let dieper = Dictionary(uniqueKeysWithValues: SettingsMap.pages.map { ($0.id, Set($0.rows)) })
        for rij in Self.inventaris {
            let plek = hoofd.contains(rij.nu) ? "hoofdblad" : dieper.first { $0.value.contains(rij.nu) }?.key
            XCTAssertNotNil(plek, "#\(rij.nr) \(rij.oud) → \(rij.nu) staat nergens")
        }
        // Elk blad hangt aan een rij op het hoofdblad (één tik), en elk blad is te openen.
        let ingang = ["account": "Account", "editie": "Editie", "stroom": "Stroom", "tekstgrootte": "Tekstgrootte", "beeld": "Beeld en intro", "artikelen": "Artikelen", "toestel": "Op dit toestel", "over": "Over Hoot"]
        for page in SettingsMap.pages {
            XCTAssertTrue(hoofd.contains(ingang[page.id] ?? "–"), "\(page.title) heeft geen rij op het hoofdblad")
            XCTAssertEqual(SettingsMap.debugPath("instellingen-\(page.id)"), [page.id])
        }
        XCTAssertEqual(SettingsMap.debugPath("instellingen-wissen"), ["toestel"])
        XCTAssertEqual(SettingsMap.debugPath("instellingen-geleerd"), ["editie"])
        XCTAssertEqual(SettingsMap.debugPath("instellingen-niets"), [])
    }

    func testHoofdbladHeeftDeGroepenEnLabelsVanD() {
        XCTAssertEqual(SettingsMap.main.rows, ["Account", "Interesses", "Bronnen", "Editie", "Stroom", "Selectie", "Weergave", "Als het donker is", "Tekstgrootte", "Beeld en intro", "Artikelen", "Op dit toestel", "Over Hoot"])
        XCTAssertEqual(Weergave.system.label, "Zoals je toestel")
    }

    func testSeintjesRegelZonderKloktijden() {
        let alle = EditionAlerts.slots.map(\.id)
        XCTAssertEqual(SettingsMap.seintjesRegel(on: false, slots: alle), "Seintje uit")
        XCTAssertEqual(SettingsMap.seintjesRegel(on: true, slots: alle), "Elke Editie")
        XCTAssertEqual(SettingsMap.seintjesRegel(on: true, slots: ["ochtend", "avond"]), "Ochtend en avond")
        XCTAssertEqual(SettingsMap.seintjesRegel(on: true, slots: ["middag"]), "Middag")
        XCTAssertNil(SettingsMap.seintjesRegel(on: true, slots: ["ochtend"]).range(of: #"\d"#, options: .regularExpression), "geen tijden")
    }

    // Vijf standen, stand 1 is Zoals je toestel; per toestel bewaard en niet in de profielsync.
    func testTekstSchaalStandenEnOpslag() {
        XCTAssertEqual(TekstSchaal.namen, ["Kleiner", "Zoals je toestel", "Groter", "Nog groter", "Grootst"])
        XCTAssertEqual(TekstSchaal.factoren, [0.9, 1, 1.15, 1.3, 1.45])
        let suite = "hoot-tekstschaal-" + UUID().uuidString, defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let schaal = TekstSchaal(defaults: defaults)
        XCTAssertEqual(schaal.stand, 1)
        schaal.stand = 4
        XCTAssertEqual(defaults.integer(forKey: TekstSchaal.key), 4)
        XCTAssertEqual(TekstSchaal(defaults: defaults).stand, 4, "blijft na herstart")
        schaal.stand = 9
        XCTAssertEqual(schaal.stand, 4, "buiten de schuif: de grootste stand")
        defaults.set(-3, forKey: TekstSchaal.key)
        XCTAssertEqual(TekstSchaal(defaults: defaults).stand, 0)

        let store = HootStore()
        let tick = store.syncTick
        store.tekstgrootte = 3
        XCTAssertEqual(TekstSchaal.shared.stand, 3)
        XCTAssertEqual(store.syncTick, tick, "Tekstgrootte gaat niet mee met je account")
        XCTAssertNil(store.syncedPrefs["tekstgrootte"])
    }

    // De schaal zit in alle letters van Hoot: bediening (ui), koppen (kop) en leestekst, bovenop Dynamic Type.
    func testLettersSchalenMee() {
        TekstSchaal.shared.stand = 1
        XCTAssertEqual(Letters.size(.body), 17)
        let kop = KopZet.pointSize(.title3, typeSize: .large)
        let lees = Letters.leesSpacing(.body, typeSize: .large)
        let ax = KopZet.pointSize(.title3, typeSize: .accessibility5)
        TekstSchaal.shared.stand = 4
        XCTAssertEqual(Letters.size(.body), 17 * 1.45, accuracy: 0.001)
        XCTAssertEqual(Letters.basis(.body), 17)
        XCTAssertEqual(KopZet.pointSize(.title3, typeSize: .large), kop * 1.45, accuracy: 0.5)
        XCTAssertGreaterThan(Letters.leesSpacing(.body, typeSize: .large), lees)
        XCTAssertEqual(KopZet.pointSize(.title3, typeSize: .accessibility5), ax * 1.45, accuracy: 1, "de maat telt op bij Dynamic Type")
        // Nooit voorbij de grootste maat van iOS: bij AX3 nog een stap, bij AX5 gelijk aan je toestel.
        TekstSchaal.shared.systeem = .accessibility3
        XCTAssertEqual(TekstSchaal.shared.factor, min(1.45, TekstSchaal.plafond / TekstSchaal.body(.accessibility3)), accuracy: 0.001)
        XCTAssertGreaterThan(TekstSchaal.shared.factor, 1)
        TekstSchaal.shared.systeem = .accessibility5
        XCTAssertEqual(TekstSchaal.shared.factor, 1, accuracy: 0.001)
        TekstSchaal.shared.stand = 0
        XCTAssertEqual(TekstSchaal.shared.factor, 0.9, "kleiner mag altijd")
        TekstSchaal.shared.systeem = .large
        XCTAssertEqual(Letters.size(.body), 17 * 0.9, accuracy: 0.001)
    }

    // Geen afkap: een rij met waarde past op een SE-breedte bij AX5 en Grootst; de waarde schuift onder het label.
    func testRijEnVoorbeeldKappenNietAfBijAX5Grootst() {
        func size<V: View>(_ v: V, width: CGFloat, type: DynamicTypeSize) -> CGSize {
            let host = UIHostingController(rootView: v.environment(\.dynamicTypeSize, type).environment(HootStore()))
            return host.sizeThatFits(in: CGSize(width: width, height: .greatestFiniteMagnitude))
        }
        let rij = SettingsRow("Selectie", value: "12 onderwerpen").font(.ui(.body))
        TekstSchaal.shared.stand = 1
        let gewoon = size(rij, width: 343, type: .large)
        TekstSchaal.shared.stand = 4
        TekstSchaal.shared.systeem = .accessibility5
        let groot = size(rij, width: 343, type: .accessibility5)
        XCTAssertLessThanOrEqual(groot.width, 343.5, "past in de breedte")
        XCTAssertGreaterThan(groot.height, gewoon.height * 2, "gestapeld: label en waarde onder elkaar, niets afgekapt")

        TekstSchaal.shared.systeem = .accessibility3
        TekstSchaal.shared.stand = 1
        let v1 = size(StroomVoorbeeld(), width: 343, type: .accessibility3)
        TekstSchaal.shared.stand = 4
        let v4 = size(StroomVoorbeeld(), width: 343, type: .accessibility3)
        XCTAssertLessThanOrEqual(v4.width, 343.5)
        XCTAssertGreaterThan(v4.height, v1.height, "het voorbeeld groeit mee")
    }

    // Renderbewijs: elk blad op een SE (375 × 667) en Pro Max (440 × 956), Licht, Nacht en AX5 met Grootst.
    func testBladenRenderen() async throws {
        let store = HootStore(), account = Account()
        let suite = "hoot-instellingen-d-" + UUID().uuidString, defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let bladen: [(String, AnyView)] = [
            ("hoofdblad", AnyView(SettingsView())),
            ("editie", AnyView(NavigationStack { EditieSettingsView() })),
            ("stroom", AnyView(NavigationStack { StroomSettingsView() })),
            ("tekstgrootte", AnyView(NavigationStack { TekstgrootteView() })),
            ("beeld", AnyView(NavigationStack { BeeldIntroView() })),
            ("artikelen", AnyView(NavigationStack { ArtikelenView() })),
            ("toestel", AnyView(NavigationStack { DeviceDataView(onReset: {}) })),
            ("over", AnyView(NavigationStack { OverHootView() })),
        ]
        let standen: [(String, String, ColorScheme, UIContentSizeCategory, Int)] = [
            ("licht", "light", .light, .large, 1),
            ("nacht", "night", .dark, .large, 1),
            ("ax5", "light", .light, .accessibilityExtraExtraExtraLarge, 4),
        ]
        for (toestel, frame) in [("se", CGSize(width: 375, height: 667)), ("promax", CGSize(width: 440, height: 956))] {
            for (mode, value, scheme, category, stand) in standen {
                defaults.set(value, forKey: "hoot.weergave")
                TekstSchaal.shared.stand = stand
                for (naam, view) in bladen {
                    let content = view.modifier(HootLetterMaat()).environment(store).environment(account).environment(EditionAlerts.shared)
                        .tint(Theme.ink).toggleStyle(InkSwitch()).modifier(HootWeergave()).defaultAppStorage(defaults)
                    let host = UIHostingController(rootView: content)
                    host.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
                    host.traitOverrides.preferredContentSizeCategory = category
                    host.view.frame = CGRect(origin: .zero, size: frame)
                    let window = UIWindow(frame: host.view.frame); window.rootViewController = host; window.isHidden = false
                    host.view.layoutIfNeeded()
                    try await Task.sleep(for: .milliseconds(500))
                    let image = UIGraphicsImageRenderer(size: frame).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                    let a = XCTAttachment(image: image); a.name = "ios-\(toestel)-\(naam)-\(mode)"; a.lifetime = .keepAlways; add(a)
                    window.isHidden = true
                }
            }
        }
    }

    // De accountkaart: de Google-foto uit user_metadata (alleen https), zonder cookies en met cache.
    func testAccountFotoUitProfiel() throws {
        XCTAssertEqual(Account.avatar(from: ["avatar_url": "https://lh3.googleusercontent.com/a/x=s96-c"]), "https://lh3.googleusercontent.com/a/x=s96-c")
        XCTAssertEqual(Account.avatar(from: ["picture": "https://example.com/p.jpg"]), "https://example.com/p.jpg")
        XCTAssertNil(Account.avatar(from: ["avatar_url": "http://example.com/p.jpg"]))
        XCTAssertNil(Account.avatar(from: ["avatar_url": "javascript:alert(1)"]))
        XCTAssertNil(Account.avatar(from: nil))
        // Een oude sessie in de sleutelhanger (zonder avatar) blijft leesbaar.
        let old = #"{"access":"a","refresh":"r","expires":0,"uid":"u","email":"jan@voorbeeld.nl"}"#
        let s = try JSONDecoder().decode(Account.Session.self, from: Data(old.utf8))
        XCTAssertNil(s.avatar)
        let r = AccountPhoto.request(URL(string: "https://example.com/p.jpg")!)
        XCTAssertFalse(r.httpShouldHandleCookies)
        XCTAssertNil(r.value(forHTTPHeaderField: "Referer"))
        XCTAssertEqual(r.cachePolicy, .returnCacheDataElseLoad)
    }
}
