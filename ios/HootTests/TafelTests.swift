import XCTest
import SwiftUI
@testable import Hoot

// Duo stap 4: de tafelblad-Editie (Tafel.swift, Krant.swift). Open liggend (vlak) en half gevouwen als laptop
// dezelfde opmaak: boven het verhaal dat je leest, onder de Editie als inhoudsopgave en de bediening. Half gevouwen
// als boek niet (dan liep de leeskolom over de vouw). Alleen de Editie; iPhone, iPad en dicht ongewijzigd.
@MainActor final class TafelTests: XCTestCase {
    typealias T = KrantIndelingTests
    static let liggend = CGSize(width: 951, height: 669)
    static let staand = CGSize(width: 669, height: 951)

    /// In 1.2 staat het tafelblad uit (KrantIndeling.tafelblad, besluit Alex 8 november); deze toetsen gelden weer in 1.2.1.
    static func tafelbladAan() throws {
        try XCTSkipUnless(KrantIndeling.tafelblad, "tafelblad uit in 1.2, terug in 1.2.1")
    }

    // MARK: Wanneer het tafelblad

    func testOpenLiggendVlakIsDeTafelbladEditie() throws {
        try Self.tafelbladAan()
        let indeling = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekVlak, krant: true, tafel: true)
        guard case let .tafel(boven, onder) = indeling else { return XCTFail("verwacht tafel, kreeg \(indeling)") }
        XCTAssertEqual(boven.minY, 0)
        XCTAssertEqual(boven.maxY, onder.minY, accuracy: 0.01, "boven lezen, direct daaronder de inhoudsopgave")
        XCTAssertEqual(onder.maxY, 669, accuracy: 0.01)
        XCTAssertEqual(onder.height, KrantIndeling.tafelOnder, accuracy: 0.01)
        XCTAssertEqual(boven.width, 951, accuracy: 0.01)
        XCTAssertGreaterThanOrEqual(boven.height, KrantIndeling.minHoogte, "het verhaal boven houdt ruimte om te lezen")
        XCTAssertTrue(indeling.spread, "de lezer is geen blad: hij staat boven")
        XCTAssertFalse(indeling.heeftPagina, "geen tweede bladzijde naast de lijst")
        XCTAssertTrue(indeling.isTafel)
        // Ook met de lezer open (rechts niet vrij): het tafelblad blijft, boven wisselt alleen het verhaal.
        XCTAssertTrue(KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekVlak, krant: true, rechtsVrij: false, tafel: true).isTafel)
    }

    func testEchteDuoLiggendVlakIsDeTafelbladEditie() throws {
        try Self.tafelbladAan()
        // De echte Duo (iOS 27.2): balk opzij en een vouw van 40 + 2 × 20. Was: één krantenpagina, en de lezer als blad
        // over het hele scherm in plaats van boven op het tafelblad.
        let indeling = KrantIndeling.kies(size: T.echtLiggend, horizontal: .regular, rug: T.echtVlak, krant: true, tafel: true)
        guard case let .tafel(boven, onder) = indeling else { return XCTFail("verwacht tafel, kreeg \(indeling)") }
        XCTAssertEqual(boven.width, 867, accuracy: 0.01)
        XCTAssertEqual(onder.maxY, 635, accuracy: 0.01)
        XCTAssertGreaterThanOrEqual(boven.height, KrantIndeling.minHoogte)
        XCTAssertTrue(KrantIndeling.kies(size: T.echtLiggend, horizontal: .regular, rug: T.echtVlak, krant: true, rechtsVrij: false, tafel: true).isTafel,
                      "met de lezer open blijft het tafelblad")
        // Te smal voor twee bladzijden (Split View): geen tafelblad.
        XCTAssertFalse(KrantIndeling.kies(size: CGSize(width: 600, height: 635), horizontal: .regular,
                                          rug: Rug(frame: CGRect(x: 300, y: 0, width: 0, height: 635), actief: false), krant: true, tafel: true).isTafel)
    }

    func testHalfGevouwenAlsLaptopDezelfdeOpmaakMetDeGrensOpDeVouw() throws {
        try Self.tafelbladAan()
        let indeling = KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.tafel, krant: true, tafel: true)
        guard case let .tafel(boven, onder) = indeling else { return XCTFail("verwacht tafel, kreeg \(indeling)") }
        XCTAssertLessThanOrEqual(boven.maxY, T.tafel.vrij.minY, "het verhaal boven de vouw")
        XCTAssertGreaterThanOrEqual(onder.minY, T.tafel.vrij.maxY, "de inhoudsopgave en de bediening onder de vouw")
        XCTAssertFalse(boven.intersects(T.tafel.vrij))
        XCTAssertFalse(onder.intersects(T.tafel.vrij), "geen knop op de vouw (TT466)")
    }

    func testHalfGevouwenAlsBoekGeenTafelblad() {
        // Een staande rug, actief: een leeskolom over de volle breedte zou over de vouw lopen. Dan het boek van stap 3.
        XCTAssertEqual(KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekHalf, krant: true, tafel: true), .tabloid(boek: true))
        guard case .naast = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekHalf, krant: true, rechtsVrij: false, tafel: true) else {
            return XCTFail("met de lezer open: de lijst links, het verhaal rechts")
        }
    }

    func testOpenStaandBlijftDeTabloid() {
        XCTAssertEqual(KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.staandVlak, krant: true, tafel: true), .tabloid(boek: false))
    }

    func testStroomEnSelectieLiggendDeAOpmaak() {
        // Geen tafelblad buiten de Editie: liggend de lijst links en het verhaal rechts; als laptop boven en onder.
        guard case .naast = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekVlak) else { return XCTFail("verwacht naast") }
        guard case .boven = KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.tafel) else { return XCTFail("verwacht boven") }
    }

    func testZonderVouwOfCompactNooitEenTafelblad() {
        // iPad (elke maat, ook Split View) en de iPhone: zoals altijd.
        for breedte in stride(from: 320.0, through: 1366, by: 4) {
            for hoogte in [440.0, 669, 744, 1024] {
                XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: breedte, height: hoogte), horizontal: .regular, rug: nil, krant: true, tafel: true), .enkel(pagina: nil), "\(breedte) × \(hoogte)")
            }
        }
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 956, height: 440), horizontal: .compact, rug: nil, krant: true, tafel: true), .enkel(pagina: nil), "Pro Max liggend")
        XCTAssertEqual(KrantIndeling.kies(size: CGSize(width: 678, height: 466), horizontal: .compact, rug: T.boekVlak, krant: true, tafel: true), .enkel(pagina: nil), "dicht liggend")
    }

    func testGroteTekstMaaktDeInhoudsopgaveHogerNietHetVerhaalTeKlein() throws {
        try Self.tafelbladAan()
        // XL: de rij groeit mee (ScaledMetric), boven blijft minstens minHoogte.
        guard case let .tafel(boven, onder) = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekVlak, krant: true, tafel: true, tafelOnder: 330) else { return XCTFail("verwacht tafel") }
        XCTAssertEqual(onder.height, 330, accuracy: 0.01)
        XCTAssertGreaterThanOrEqual(boven.height, KrantIndeling.minHoogte)
        guard case let .tafel(boven2, _) = KrantIndeling.kies(size: Self.liggend, horizontal: .regular, rug: T.boekVlak, krant: true, tafel: true, tafelOnder: 600) else { return XCTFail("verwacht tafel") }
        XCTAssertEqual(boven2.height, KrantIndeling.minHoogte, accuracy: 0.01, "nooit kleiner dan minHoogte")
    }

    // MARK: De inhoudsopgave

    private func row(_ id: String, desk: String? = nil, story: Story? = nil) -> EditionRowModel {
        EditionRowModel(id: id, item: Item(id: id, source: "nos", title: "Verhaal \(id)", url: "https://nos.nl/\(id)"), story: story, label: nil, desk: desk)
    }

    func testDeRijIsDeTienZonderDeBubbel() {
        let rows = (1...10).map { row("r\($0)") } + [row("b1", desk: "bubbel"), row("b2", desk: "bubbel")]
        let rij = TafelEditie.rij(rows)
        XCTAssertEqual(rij.count, 10)
        XCTAssertEqual(rij.compactMap(\.number), Array(1...10))
        XCTAssertFalse(rij.contains { $0.desk == "bubbel" })
    }

    func testZonderKeuzeStaat01Boven() {
        let rij = TafelEditie.rij((1...10).map { row("r\($0)") })
        XCTAssertEqual(TafelEditie.gekozen(open: nil, rij: rij)?.id, "r1")
        XCTAssertEqual(TafelEditie.gemarkeerd(open: nil, rij: rij), "r1")
        XCTAssertNil(TafelEditie.gekozen(open: nil, rij: []))
    }

    func testDeKeuzeStaatBovenEnIsGemarkeerd() {
        let rows = [row("r1"), row("r2", story: Story(id: "s2", itemIds: ["r2", "r2b"])), row("r3")]
        let rij = TafelEditie.rij(rows)
        let open = Item(id: "r3", source: "nos", title: "Verhaal r3", url: "https://nos.nl/r3")
        XCTAssertEqual(TafelEditie.gekozen(open: open, rij: rij)?.id, "r3")
        XCTAssertEqual(TafelEditie.gemarkeerd(open: open, rij: rij), "r3")
        // Een ander stuk van hetzelfde verhaal (uit Vergelijken): de plek van dat verhaal.
        let ander = Item(id: "r2b", source: "nrc", title: "Ander stuk", url: "https://nrc.nl/r2b")
        XCTAssertEqual(TafelEditie.gemarkeerd(open: ander, rij: rij), "r2")
        // Een stuk uit de Stroom: boven, maar geen plek in de rij gemarkeerd.
        let stroom = Item(id: "x", source: "nos", title: "Uit de Stroom", url: "https://nos.nl/x")
        XCTAssertEqual(TafelEditie.gekozen(open: stroom, rij: rij)?.id, "x")
        XCTAssertNil(TafelEditie.gemarkeerd(open: stroom, rij: rij))
    }

    // MARK: Duo 1.2: de rij vult de ruimte, de koppen passen

    func testDeRuimeRijAlleenAlsLaptop() throws {
        try Self.tafelbladAan()
        // Vlak liggend is de onderste helft `tafelOnder` hoog (min de veilige zone): de gewone rij.
        XCTAssertFalse(TafelEditie.ruim(hoogte: KrantIndeling.tafelOnder, tafelOnder: KrantIndeling.tafelOnder))
        XCTAssertFalse(TafelEditie.ruim(hoogte: KrantIndeling.tafelOnder - 20, tafelOnder: KrantIndeling.tafelOnder))
        // Als laptop: de helft onder de vouw (951 − 497,5 = 453,5), min de tabbalk (± 83). Dan de ruime rij.
        guard case let .tafel(_, onder) = KrantIndeling.kies(size: Self.staand, horizontal: .regular, rug: T.tafel, krant: true, tafel: true) else { return XCTFail("verwacht tafel") }
        XCTAssertTrue(TafelEditie.ruim(hoogte: onder.height - 83, tafelOnder: KrantIndeling.tafelOnder))
        // Grotere tekst: de grens schuift mee (geschaalde tafelOnder), dan liever de gewone rij dan een gedrongen ruime.
        XCTAssertFalse(TafelEditie.ruim(hoogte: 330, tafelOnder: 300))
    }

    /// Echte koppen van normale lengte (70–85 tekens), uit Editie en etalage.
    static let koppen = [
        "Bommeldingen over vluchten in Europa, pand Ierse omroep ontruimd om dreiging",
        "Vader Meghan Markle opgepakt door FBI vanwege bezit van beelden van kindermisbruik",
        "ME ingezet bij ontruiming bezet bouwterrein datacenter Microsoft in Amsterdam",
        "Hogere straf voor Roosendaler die vrouwen en kinderen doodreed in Oud-Gastel",
        "Keniaanse sekteleider krijgt 200 jaar cel voor uithongeren 190 kinderen",
        "Duizend meter onder Polen ligt het metaal waar de wereldeconomie op draait",
        "Makkelijk te missen, maar toch gevonden: fossiel van 66 miljoen jaar oud",
        "Uitgever en eigenaar van Bruna-winkels in financiële problemen",
    ]

    private func regels(_ kop: String, stijl: Font.TextStyle, breedte: CGFloat, typeSize: DynamicTypeSize = .large) -> Int {
        let font = KopZet.font(stijl, typeSize: typeSize)
        let h = (kop as NSString).boundingRect(with: CGSize(width: breedte, height: .greatestFiniteMagnitude),
                                               options: [.usesLineFragmentOrigin], attributes: [.font: font], context: nil).height
        return Int((h / font.lineHeight).rounded())
    }

    func testKoppenVanNormaleLengteBrekenNietAf() {
        // Punt 2: op 208 breed braken deze koppen af met "…" (4 regels in 3). Nu passen ze in drie regels, in de
        // gewone rij (264, .subheadline) en in de ruime rij (312, .headline).
        for kop in Self.koppen {
            // 1.2.1: de cel is minstens zo breed (de rij maakt hem breder tot de plekken precies passen).
            XCTAssertLessThanOrEqual(regels(kop, stijl: .subheadline, breedte: TafelCel.minBreedte), TafelEditie.kopRegels, "gewoon: \(kop)")
            XCTAssertLessThanOrEqual(regels(kop, stijl: .headline, breedte: TafelCel.minBreedteRuim), TafelEditie.kopRegels, "ruim: \(kop)")
        }
        XCTAssertGreaterThan(Self.koppen.map { regels($0, stijl: .subheadline, breedte: 208) }.max() ?? 0, 3, "de oude cel was te smal")
    }

    func testElkeKopHeeftDezelfdeHoogte() throws {
        // Gelijke ritmiek: een korte kop houdt drie regels ruimte (lineLimit met reservesSpace).
        let bron = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/Views/Tafel.swift"), encoding: .utf8)
        XCTAssertTrue(bron.contains(".lineLimit(TafelEditie.kopRegels, reservesSpace: true)"))
        let store = HootStore()
        func h(_ titel: String, ruim: CGFloat?) -> CGFloat {
            let r = EditionRowModel(id: "k", item: Item(id: "k", source: "nos", title: titel, url: "https://nos.nl/k"), story: nil, label: nil, desk: nil).numbered(1)
            return UIHostingController(rootView: TafelCel(row: r, gekozen: false, hoogte: ruim) {}.environment(store)).sizeThatFits(in: CGSize(width: 1000, height: 1000)).height
        }
        XCTAssertEqual(h("Kort", ruim: nil), h(Self.koppen[1], ruim: nil), accuracy: 0.5)
        XCTAssertEqual(h("Kort", ruim: 280), 280 - Space.s3 + Space.s3, accuracy: 0.5, "de ruime cel is zo hoog als de rij")
    }

    // MARK: De rij op hele plekken (keuring lezer-liggend, punt 1)

    func testDeRijStaatOpHelePlekkenOpDeEchteDuo() throws {
        try Self.tafelbladAan()
        // Vlak liggend op de echte Duo is het vlak 867 breed: de balk opzij hoort er niet bij. Precies drie plekken
        // tussen de marges, geen half verhaal aan een rand, en de rij loopt niet onder de balk door.
        let p = TafelEditie.plekken(breedte: T.echtLiggend.width, minCel: TafelCel.minBreedte, tussen: TafelEditie.celTussen, marge: TafelEditie.rijMarge)
        XCTAssertEqual(p.aantal, 3)
        XCTAssertGreaterThanOrEqual(p.cel, TafelCel.minBreedte)
        XCTAssertEqual(2 * TafelEditie.rijMarge + CGFloat(p.aantal) * p.cel + CGFloat(p.aantal - 1) * TafelEditie.celTussen, T.echtLiggend.width, accuracy: 0.01,
                       "de plekken vullen het zichtbare deel precies")
    }

    func testHelePlekkenInElkeHouding() {
        // Liggend zonder balk, als laptop (ruim), smal (Split View) en heel grote tekst: altijd hele plekken.
        for (breedte, minCel) in [(951.0, TafelCel.minBreedte), (669, TafelCel.minBreedteRuim), (669, TafelCel.minBreedte), (400, TafelCel.minBreedte), (867, 2.2 * TafelCel.minBreedte)] as [(CGFloat, CGFloat)] {
            let p = TafelEditie.plekken(breedte: breedte, minCel: minCel, tussen: TafelEditie.celTussen, marge: TafelEditie.rijMarge)
            XCTAssertGreaterThanOrEqual(p.aantal, 1)
            XCTAssertEqual(2 * TafelEditie.rijMarge + CGFloat(p.aantal) * p.cel + CGFloat(p.aantal - 1) * TafelEditie.celTussen, breedte, accuracy: 0.01, "\(breedte) \(minCel)")
            XCTAssertGreaterThanOrEqual(p.cel, min(minCel, breedte - 2 * TafelEditie.rijMarge), "\(breedte) \(minCel)")
        }
        XCTAssertEqual(TafelEditie.plekken(breedte: 669, minCel: TafelCel.minBreedteRuim, tussen: TafelEditie.celTussen, marge: TafelEditie.rijMarge).aantal, 2,
                       "als laptop twee ruime plekken, niet één")
        XCTAssertEqual(TafelEditie.plekken(breedte: 0, minCel: 248, tussen: 24, marge: 16).aantal, 1, "nog niet gemeten: één plek, geen deling door nul")
    }

    func testDeRijBegintVooraanOfBijHetGekozenVerhaal() {
        // Elf plekken (01–10 en het einde), drie in beeld.
        XCTAssertEqual(TafelEditie.eerste(gekozen: nil, totaal: 11, zichtbaar: 3), 0, "zonder keuze 01 vooraan")
        XCTAssertEqual(TafelEditie.eerste(gekozen: 2, totaal: 11, zichtbaar: 3), 0, "03 staat al in beeld: 01 vooraan")
        XCTAssertEqual(TafelEditie.eerste(gekozen: 5, totaal: 11, zichtbaar: 3), 4, "06 in het midden")
        XCTAssertEqual(TafelEditie.eerste(gekozen: 9, totaal: 11, zichtbaar: 3), 8, "10: de rij eindigt op het einde, niet erna")
        XCTAssertEqual(TafelEditie.eerste(gekozen: 10, totaal: 11, zichtbaar: 3), 8)
        XCTAssertEqual(TafelEditie.eerste(gekozen: 5, totaal: 3, zichtbaar: 3), 0, "alles past: nooit scrollen")
        for k in 0..<11 {
            let e = TafelEditie.eerste(gekozen: k, totaal: 11, zichtbaar: 3)
            XCTAssertTrue((e..<(e + 3)).contains(k), "het gekozen verhaal staat in beeld (\(k))")
            XCTAssertLessThanOrEqual(e + 3, 11)
        }
    }

    func testEenStukBuitenDeEditieLaatDeRijStaan() throws {
        // Boven een stuk uit de Stroom (niet in de rij): de rij blijft waar je hem liet, ook als je naar 07 veegde.
        XCTAssertNil(TafelEditie.naar(gekozen: nil, totaal: 11, zichtbaar: 3), "geen sprong terug naar 01")
        for k in 0..<11 {
            XCTAssertEqual(TafelEditie.naar(gekozen: k, totaal: 11, zichtbaar: 3), TafelEditie.eerste(gekozen: k, totaal: 11, zichtbaar: 3))
        }
        let bron = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/Views/Tafel.swift"), encoding: .utf8)
        XCTAssertTrue(bron.contains("guard let plek = TafelEditie.naar(gekozen: k, totaal: ids.count, zichtbaar: plekken.aantal) else { return }"), "bij nil blijft de rij staan")
    }

    func testDeRijStoptVoorDeBalkEnSnaptOpPlekken() throws {
        let bron = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/Views/Tafel.swift"), encoding: .utf8)
        XCTAssertTrue(bron.contains(".contentMargins(.horizontal, TafelEditie.rijMarge, for: .scrollContent)"), "marges in de scroll: elke plek snapt op de lijn van de kop")
        XCTAssertTrue(bron.contains(".scrollTargetBehavior(.viewAligned)"))
        XCTAssertTrue(bron.contains(".clipped()"), "niets loopt onder de balk opzij door")
        XCTAssertFalse(bron.contains("anchor: .center"), "geen half verhaal aan een rand door centreren")
    }

    // MARK: Tekenen

    func testDeOnderdelenTekenenZonderKrant() {
        // Buiten RootView (geen KrantStaat, geen Reader): niets crasht, en elke cel is even breed.
        let store = HootStore()
        for size: DynamicTypeSize in [.large, .xLarge] {
            for scheme: ColorScheme in [.light, .dark] {
                let cel = VStack {
                    TafelCel(row: row("r1").numbered(1), gekozen: true) {}
                    TafelCel(row: row("r2").numbered(2), gekozen: false, hoogte: 280) {}
                }
                let einde = TafelEinde(regel: "Je bent bij.", aantal: 10)
                let bediening = TafelBediening(item: row("r1").item)
                for view in [AnyView(cel), AnyView(einde), AnyView(bediening), AnyView(TafelOnder().frame(width: 951, height: 272)), AnyView(TafelOnder().frame(width: 669, height: 400))] {
                    let renderer = ImageRenderer(content: view.environment(store).environment(\.dynamicTypeSize, size).environment(\.colorScheme, scheme))
                    renderer.proposedSize = ProposedViewSize(width: 951, height: nil)
                    XCTAssertNotNil(renderer.uiImage, "\(size) \(scheme)")
                }
            }
        }
    }

    @MainActor
    func testDeKopInDeLaadstandStaatBovenOokAlsDeRuimteKleinIs() async throws {
        // Boven op het tafelblad is de ruimte klein (vlak liggend ± 160 tot 360 hoog). De laadstand (kop, bron,
        // laadstrepen) is dan hoger dan de ruimte. Vroeger centreerde SwiftUI hem: de kop viel boven half buiten
        // beeld. Nu staat de kop op dezelfde plek als in een grote ruimte (bovenaan); wat niet past valt onder weg.
        let waiting = ReaderWaitingState()
        await waiting.wait() // de laadstrepen in beeld (na 400 ms)
        XCTAssertTrue(waiting.visible)
        let titel = "Voorlopig geen afzettingsprocedure tegen Amerikaanse defensieminister Hegseth"
        func render(_ hoogte: CGFloat) throws -> CGImage {
            let view = ReaderLoadingView(title: titel, sourceName: "NOS", waiting: waiting)
                .frame(width: 680, height: hoogte).clipped().background(Color.white)
                .environment(\.colorScheme, .light)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 1
            return try XCTUnwrap(renderer.cgImage)
        }
        func kopBoven(_ beeld: CGImage) throws -> Int {
            // De eerste pixelrij met inkt: de bovenkant van de kop.
            let w = beeld.width, h = beeld.height
            var pixels = [UInt8](repeating: 0, count: w * h * 4)
            let ctx = try XCTUnwrap(CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                              space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
            ctx.draw(beeld, in: CGRect(x: 0, y: 0, width: w, height: h))
            for y in 0..<h where (0..<w).contains(where: { pixels[(y * w + $0) * 4] < 128 && pixels[(y * w + $0) * 4 + 3] > 128 }) { return y }
            return -1
        }
        let groot = try kopBoven(render(800)) // past ruim: de kop staat bovenaan
        XCTAssertGreaterThan(groot, 0, "de kop is getekend")
        XCTAssertLessThan(groot, 40, "de kop staat bovenaan")
        for hoogte: CGFloat in [120, 160, 220, 300] {
            XCTAssertEqual(try kopBoven(render(hoogte)), groot, "op \(Int(hoogte)) hoog staat de kop op dezelfde plek als in een grote ruimte")
        }
    }

    func testDeLezerBovenHeeftGeenEigenWerkbalk() throws {
        // De bediening staat onder: de lezer leest `tafelLezer` en verbergt dan zijn werkbalk. Alleen op het tafelblad.
        let bron = try String(contentsOf: URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Hoot/Reader/ArticleReaderView.swift"), encoding: .utf8)
        XCTAssertTrue(bron.contains(".toolbar(tafel ? .hidden : .automatic, for: .navigationBar)"))
        XCTAssertFalse(EnvironmentValues().tafelLezer, "standaard (iPhone, iPad, dicht) de gewone werkbalk")
    }
}

private extension EditionRowModel {
    func numbered(_ n: Int) -> EditionRowModel { var r = self; r.number = n; return r }
}
