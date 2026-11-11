import SwiftUI

// Concept A voor de iPhone Duo: "De krant open".
//
// Dicht is Hoot de vertrouwde iPhone-app. Open ligt Hoot als een opengeslagen krant: links de lijst
// (de Editie, de Stroom, de Selectie, Bewaard, Zoeken), rechts het gekozen verhaal of de lezer. De
// vouw is de rug van de krant: elke bladzijde ligt aan één kant ervan, dus er loopt nooit tekst, een
// kop of een knop over de vouw. Vouwen is een maatwissel, geen nieuwe scène: het verhaal, de plek in
// het artikel, het tabblad en de scrollpositie blijven.
//
// Alles beslist op de echte geometrie (breedteklasse, de maat van het vlak, de gereserveerde zone van
// de vouw), nooit op apparaatnaam of oriëntatie (HIG, Designing for iPhone Duo; TT461, TT463). Zonder
// vouw (iPhone, iPad, Mac) verandert er niets.

// MARK: De rug

/// De vouw als verdelende zone (`ReservedRegion.Kind.division`), in de coördinaten van het vlak dat
/// hem meet. Vlak open is hij inactief en 0 breed; half gevouwen is hij actief en heeft hij een maat.
struct Rug: Equatable, Sendable {
    var frame: CGRect
    var actief: Bool
    /// Wat Apple als marge rond de zone aanraadt (`ReservedRegion.margins`).
    var marge: EdgeInsets = EdgeInsets()

    /// Een staande rug (de vouw loopt van boven naar onder): twee bladzijden naast elkaar, als een boek.
    /// Anders ligt hij dwars (binnenscherm staand, tafelblad): boven en onder.
    var staand: Bool { frame.height >= frame.width }

    /// De zone plus de aangeraden marge: hier komt niets te staan.
    var vrij: CGRect {
        CGRect(x: frame.minX - marge.leading, y: frame.minY - marge.top,
               width: frame.width + marge.leading + marge.trailing, height: frame.height + marge.top + marge.bottom)
    }
}

// MARK: De indeling

/// Hoe het vlak verdeeld wordt. Een pure beslissing, getest in KrantIndelingTests.
enum KrantIndeling: Equatable {
    /// Eén bladzijde, zoals op de iPhone. Met `pagina` een maximale breedte: open en staand (669) is
    /// de iPhone-opmaak anders opgerekt tot een hoofdbeeld van 669 × 446.
    case enkel(pagina: CGFloat?)
    /// Twee bladzijden naast elkaar, elk aan één kant van de rug: links de lijst, rechts het verhaal.
    case naast(lijst: CGRect, verhaal: CGRect)
    /// Half gevouwen als een laptop (tafelblad): boven het verhaal om naar te kijken, onder de lijst
    /// om te bedienen (TT463, TT466).
    case boven(verhaal: CGRect, lijst: CGRect)
    /// De tabloid (stap 3, alleen de Editie): de lijst over het hele vlak, 01 als opening en daaronder twee kolommen
    /// met de goot op de vouw (`KrantKolommen`). Open staand altijd; met een staande rug (open liggend, half
    /// gevouwen als boek) zolang rechts niets open ligt: dan staat elke kolom op zijn eigen bladzijde. Tik je een
    /// verhaal aan, dan komt de lezer op de rechterbladzijde (`naast`), zoals in een opengeslagen boek.
    case tabloid(boek: Bool)
    /// De tafelblad-Editie (stap 4, alleen de Editie): open liggend (vlak) en half gevouwen als laptop. Boven het
    /// verhaal dat je leest, onder de Editie als inhoudsopgave (01–10 in één rij) en de bediening (TT463, TT466:
    /// boven kijken, onder bedienen). Vlak liggend is er geen dwarse vouw: dan ligt de grens op `tafelOnder` van onder.
    case tafel(boven: CGRect, onder: CGRect)

    /// SCHAKELAAR TAFELBLAD (besluit Alex, 8 november): in 1.2 stond de tafelblad-Editie uit. 1.2.1 zet hem weer aan,
    /// met de fix voor de echte Duo (vouw 40 breed, balk opzij), een rij die vóór de balk stopt en op hele plekken
    /// staat, en een blad dat wijkt zodra de krant open ligt (`BladWijkt`): nooit een leeg blad. Getoetst in
    /// TafelTests en TafelUitTests.
    static let tafelblad = true

    /// Een bladzijde moet minstens zo breed zijn: zo smal als de kleinste iPhone (375) min wat lucht.
    /// Een verticale systeembalk opzij (iOS 27.1, binnen liggend) mag een bladzijde smaller maken. Gemeten op de
    /// echte Duo-simulator (iOS 27.2), binnen liggend en vlak: het vlak is 867 breed (balk 84), de vouw is ook vlak
    /// 40 breed met 20 marge aan elke kant (niet 0 breed, zoals eerst aangenomen). Dan is de rechterbladzijde 351,5:
    /// dat moet nog twee bladzijden zijn (en het tafelblad), geen enkele krantenpagina.
    static let minPagina: CGFloat = 340
    /// Een bladzijde boven of onder de rug moet minstens zo hoog zijn.
    static let minHoogte: CGFloat = 280
    /// Eén bladzijde op een breed vlak met een vouw (open, staand): de breedte van een krantenpagina.
    static let enkelePagina: CGFloat = 560
    /// De tabloid open staand: twee kolommen van minstens 284 (32 goot, 2 × 16 marge), dus vanaf 632 breed.
    static let minTabloid: CGFloat = 632
    /// De tafelblad-Editie vlak liggend: zo hoog is de inhoudsopgave onder (de rij en de bediening). Groeit mee met
    /// de tekstgrootte (`@ScaledMetric` in KrantSpread); het verhaal boven houdt minstens `minHoogte`.
    static let tafelOnder: CGFloat = 272

    /// De lezer en Vergelijken staan op een bladzijde, niet als blad. Ook in de tabloid als boek: tik je daar
    /// een verhaal aan, dan opent het rechts.
    var spread: Bool {
        switch self {
        case .enkel: false
        case let .tabloid(boek): boek
        case .naast, .boven, .tafel: true
        }
    }
    /// Er staat nu een tweede bladzijde (het verhaal of de lezer) naast of boven de lijst.
    var heeftPagina: Bool {
        switch self {
        case .naast, .boven: true
        case .enkel, .tabloid, .tafel: false
        }
    }
    var isTafel: Bool { if case .tafel = self { true } else { false } }
    var isTabloid: Bool { if case .tabloid = self { true } else { false } }

    /// De breedte waarop de lijst staat (voor isWide en de kolommen).
    func lijstBreedte(in size: CGSize) -> CGFloat {
        switch self {
        case let .enkel(pagina): min(size.width, pagina ?? .infinity)
        case .tabloid, .tafel: size.width
        case let .naast(lijst, _): lijst.width
        case let .boven(_, lijst): min(lijst.width, Self.enkelePagina)
        }
    }

    /// De beveiliging (uit concept B): een bredere opmaak geldt alleen als er een vouw is. Zonder vouw (`nil`)
    /// beslist het venster zelf (WidthReader: breed vanaf 700), zodat iPhone, iPad en Split View gelijk blijven.
    /// Met een vouw beslist de breedte van de lijst op zijn eigen bladzijde.
    func breed(lijst: CGFloat) -> Bool? {
        if isTabloid { return true } // de tabloid is de brede Editie: de opening en de paren van de iPad
        return self == .enkel(pagina: nil) ? nil : lijst >= 700
    }

    /// - Parameters:
    ///   - krant: dit tabblad kan een tabloid zijn (de Editie, en de tekst past in twee kolommen: geen heel grote tekst).
    ///   - rechtsVrij: er ligt rechts niets open (geen lezer, geen Vergelijken).
    ///   - tafel: dit tabblad kan een tafelblad zijn (de Editie, met verhalen, geen heel grote tekst).
    ///   - tafelOnder: de hoogte van de inhoudsopgave vlak liggend (meegroeiend met de tekstgrootte).
    static func kies(size: CGSize, horizontal: UserInterfaceSizeClass?, rug: Rug?, krant: Bool = false, rechtsVrij: Bool = true,
                     tafel: Bool = false, tafelOnder: CGFloat = KrantIndeling.tafelOnder) -> KrantIndeling {
        let tafel = tafel && tafelblad // de schakelaar (zie `tafelblad`)
        // Compact (dicht, iPhone, smal venster): de iPhone-app.
        guard horizontal == .regular, size.width > 0, size.height > 0 else { return .enkel(pagina: nil) }
        // Geen vouw: iPad, Mac, een iPhone zonder rug. Daar blijft alles zoals het was.
        guard let rug, rug.frame.intersects(CGRect(origin: .zero, size: size).insetBy(dx: -1, dy: -1)) else { return .enkel(pagina: nil) }
        let vrij = rug.vrij
        if rug.staand {
            let lijst = CGRect(x: 0, y: 0, width: max(0, vrij.minX), height: size.height)
            let verhaal = CGRect(x: vrij.maxX, y: 0, width: max(0, size.width - vrij.maxX), height: size.height)
            // Open liggend en vlak: de tafelblad-Editie (besluit Alex, 6 november). Boven lezen, onder de rij.
            // Half gevouwen als boek niet: dan zou de leeskolom boven over de vouw lopen (ONDERZOEK §6.4).
            // Het tafelblad loopt over de hele breedte: het hangt niet af van hoe breed elke bladzijde naast de vouw is,
            // alleen van of het vlak breed genoeg is voor twee bladzijden.
            if tafel && !rug.actief && size.width >= 2 * minPagina {
                let onder = min(max(0, tafelOnder), size.height - minHoogte)
                if onder > 0 {
                    return .tafel(boven: CGRect(x: 0, y: 0, width: size.width, height: size.height - onder),
                                  onder: CGRect(x: 0, y: size.height - onder, width: size.width, height: onder))
                }
            }
            if lijst.width >= minPagina && verhaal.width >= minPagina {
                // Een opengeslagen boek: zolang rechts niets open ligt, loopt de Editie over beide bladzijden.
                return krant && rechtsVrij ? .tabloid(boek: true) : .naast(lijst: lijst, verhaal: verhaal)
            }
            return .enkel(pagina: min(size.width, enkelePagina))
        }
        // Een dwarse rug: alleen half gevouwen twee bladzijden. Vlak open is dat geen houding om boven
        // en onder te lezen; dan één krantenpagina.
        if rug.actief {
            let verhaal = CGRect(x: 0, y: 0, width: size.width, height: max(0, vrij.minY))
            let lijst = CGRect(x: 0, y: vrij.maxY, width: size.width, height: max(0, size.height - vrij.maxY))
            if verhaal.height >= minHoogte && lijst.height >= minHoogte {
                // De Editie: dezelfde tafelblad-opmaak als vlak liggend, met de grens op de vouw.
                return tafel ? .tafel(boven: verhaal, onder: lijst) : .boven(verhaal: verhaal, lijst: lijst)
            }
        }
        // Open staand: de Editie als tabloid over de hele breedte (zo dicht mogelijk bij de iPad staand). De lezer is
        // hier een blad, zoals dicht; de andere tabbladen houden één krantenpagina.
        if krant && size.width >= minTabloid { return .tabloid(boek: false) }
        return .enkel(pagina: min(size.width, enkelePagina))
    }
}

// MARK: De kolommen van de tabloid

/// Twee kolommen met de goot op de vouw (HIG: een even aantal kolommen; TT463: de buitenmarges houden, de ruimte
/// rond het scharnier groter). Ligt er een staande rug in de inhoud, dan is de goot de zone plus Apples marge plus
/// 32 lucht, en zijn de kolommen niet per se even breed (een verticale balk opzij maakt één bladzijde smaller).
/// Zonder staande rug (open staand: de vouw ligt dwars) staat de goot in het midden. Pure rekensom, getoetst.
struct KrantKolommen: Equatable {
    var links: CGFloat
    var goot: CGFloat
    var rechts: CGFloat
    /// De goot staat op een staande rug: links en rechts zijn twee bladzijden.
    var opRug = false

    static let lucht: CGFloat = Space.s6

    /// - Parameters:
    ///   - inhoud: het kader van de kolommen (binnen de marges), in de coördinaten van de krant.
    ///   - rug: de vouw, in dezelfde coördinaten.
    static func bereken(inhoud: CGRect, rug: Rug?) -> KrantKolommen {
        guard inhoud.width > 0 else { return KrantKolommen(links: 0, goot: lucht, rechts: 0) }
        if let rug, rug.staand {
            let vrij = rug.vrij
            let links = vrij.minX - lucht / 2 - inhoud.minX
            let rechts = inhoud.maxX - (vrij.maxX + lucht / 2)
            if links > 0, rechts > 0 { return KrantKolommen(links: links, goot: vrij.width + lucht, rechts: rechts, opRug: true) }
        }
        let k = max(0, (inhoud.width - lucht) / 2)
        return KrantKolommen(links: k, goot: lucht, rechts: k)
    }

    /// De goot in de coördinaten van de inhoud: hier staat nooit tekst of een knop.
    func goot(in inhoud: CGRect) -> ClosedRange<CGFloat> { (inhoud.minX + links)...(inhoud.minX + links + goot) }
}

/// De tabloid voor de Editie: de vouw in venstercoördinaten (`.global`, alleen x telt), of geen tabloid.
struct TabloidKey: EnvironmentKey { static let defaultValue: Tabloid? = nil }
struct Tabloid: Equatable {
    var rug: Rug?
    /// Een staande rug: de opening staat links, 02 en 03 rechts (nooit 01 over de vouw).
    var boek: Bool
}
extension EnvironmentValues {
    var tabloid: Tabloid? { get { self[TabloidKey.self] } set { self[TabloidKey.self] = newValue } }
}

// MARK: De leesmaat

/// De regellengte van de lezer op een bladzijde van de krant. Hoot kiest de letter boven de regel: de lezer
/// houdt de letter die jij koos (de tekstgrootte van de lezer, Dynamische tekst), ook op een bladzijde van
/// ± 450 tot 475 breed. Liever een kortere regel (± 50 tekens, zoals dicht) dan een kleinere letter
/// (KEURING.md, verbetering 3). Alleen de marge wordt op een bladzijde iets smaller.
enum Leesmaat {
    /// Gemiddelde breedte van een teken in Newsreader Tekst (450), in em, gemeten op Nederlandse tekst.
    static let tekenEm = 0.4675
    /// De lezer: lopende tekst is 1,12 × de tekstmaat.
    static let tekstFactor = 1.12

    /// De zijmarge van de lezer: 16 op een blad (iPhone, iPad), 12 op een bladzijde van de krant, 24 als blad over
    /// de tabloid (de Duo open staand: 669 breed).
    static func marge(pagina: Bool, ruim: Bool = false) -> Double { pagina ? 12 : ruim ? 24 : 16 }

    /// De leeskolom (met marge) van het blad over de tabloid. Op 669 gaf de volle breedte met marge 24 nog ± 70
    /// tekens; het onderzoek (§6.7) wil ± 58–62. Dezelfde letter en dezelfde marge, maar een smallere kolom in het
    /// midden van het blad: ± 60 tekens bij de standaardletter, minder bij een grotere letter (letter boven regel).
    static let ruimeKolom: Double = 580

    /// De breedste kolom van de lezer (de `max-width` van de pagina): 680 (Layout.readable), over de tabloid 580.
    static func kolom(ruim: Bool) -> Double { ruim ? ruimeKolom : 680 }

    /// Hoeveel tekens er op een regel gaan, bij deze kolom, lettermaat (px) en marge.
    static func tekens(kolom: Double, px: Double, marge: Double, ruim: Bool = false) -> Double {
        (min(kolom, Self.kolom(ruim: ruim)) - 2 * marge) / (px * tekenEm)
    }
}

// MARK: De staat van de krant

/// Per venster: welk verhaal (Vergelijken) per tabblad open ligt, en of het venster nu als krant ligt.
/// Het artikel zelf staat in `Reader.item`: één lezer per venster.
@MainActor @Observable
final class KrantStaat {
    var verhaal: [RootView.Destination: Story] = [:]
    /// De krant ligt open (twee bladzijden): de lezer staat op de rechterbladzijde, niet als blad.
    var spread = false
    /// Er is een vouw gemeten (de Duo open). Op de Duo geeft iOS de zone pas even na de start door.
    var vouw = false

    /// Het artikel als blad: alleen als de krant niet open ligt. Ligt hij open, dan staat de lezer op de bladzijde of
    /// boven op het tafelblad, en is er geen blad (ook geen leeg).
    static func blad(_ item: Item?, spread: Bool) -> Item? { spread ? nil : item }
    /// De Editie ligt als tabloid open staand: de lezer is een blad met een ruimere marge (Leesmaat).
    var tabloid = false
}

struct KrantTabKey: EnvironmentKey { static let defaultValue: RootView.Destination = .editie }
struct KrantSpreadKey: EnvironmentKey { static let defaultValue = false }
struct KrantPaginaKey: EnvironmentKey { static let defaultValue = false }
struct PaginaMaatKey: EnvironmentKey { static let defaultValue: CGFloat? = nil }
struct OpenStoryKey: EnvironmentKey { static let defaultValue: (@MainActor (Story) -> Void)? = nil }

/// Alleen in Debug gezet (DuoEmulatie): een vouw die iOS 26 niet geeft, in venstercoördinaten. In Release
/// blijft hij leeg en meet Hoot alleen de echte zone.
@MainActor @Observable
final class DuoNabootsing {
    static let shared = DuoNabootsing()
    var rug: Rug?
}

extension EnvironmentValues {
    /// Het tabblad waarin deze view staat.
    var krantTab: RootView.Destination { get { self[KrantTabKey.self] } set { self[KrantTabKey.self] = newValue } }
    /// De lijst ligt naast (of onder) een verhaalbladzijde.
    var krantSpread: Bool { get { self[KrantSpreadKey.self] } set { self[KrantSpreadKey.self] = newValue } }
    /// Deze view staat op de verhaalbladzijde (de lezer kiest zijn leesmaat daarop).
    var krantPagina: Bool { get { self[KrantPaginaKey.self] } set { self[KrantPaginaKey.self] = newValue } }
    /// De breedte van één krantenpagina; `column()` gaat nooit breder.
    var paginaMaat: CGFloat? { get { self[PaginaMaatKey.self] } set { self[PaginaMaatKey.self] = newValue } }
    /// Een verhaal vergelijken: op de rechterbladzijde, of als stap in de lijst.
    var openStory: (@MainActor (Story) -> Void)? { get { self[OpenStoryKey.self] } set { self[OpenStoryKey.self] = newValue } }
}

// MARK: De rug meten

/// Leest de vouw van het vlak: `reservedRegions(kind: .division, options: .includeInactive)` (iOS 27.1).
/// Ook vlak open, zodat de rug al op de vouw ligt vóór je vouwt en er bij vouwen niets verspringt
/// (TT463: `.includeInactive`). In de nabootsing (Debug) komt de vouw uit `DuoEmulatie`.
struct RugMeter: View {
    var nagebootst: Rug?
    @Binding var rug: Rug?
    @Binding var maat: CGSize
    var body: some View {
        GeometryReader { proxy in
            let gemeten = Self.meet(proxy, nagebootst: nagebootst)
            Color.clear
                .onChange(of: gemeten, initial: true) { _, nieuw in rug = nieuw }
                .onChange(of: proxy.size, initial: true) { _, nieuw in maat = nieuw }
        }
        .accessibilityHidden(true)
    }

    static func meet(_ proxy: GeometryProxy, nagebootst: Rug?) -> Rug? {
        if let nagebootst {
            // In venstercoördinaten: omrekenen naar dit vlak.
            let mijn = proxy.frame(in: .global)
            var r = nagebootst
            r.frame = nagebootst.frame.offsetBy(dx: -mijn.minX, dy: -mijn.minY)
            return r
        }
        if #available(iOS 27.1, *) {
            let zones = proxy.reservedRegions(kind: .division, options: .includeInactive)
            guard let zone = zones.first else { return nil }
            return Rug(frame: zone.frame, actief: zone.isActive, marge: zone.margins)
        }
        return nil
    }
}

// MARK: De opengeslagen krant

/// Plaatst de lijst en de verhaalbladzijde volgens de indeling. Eén container voor alle houdingen: de
/// lijst blijft dezelfde view (zelfde scrollpositie) als je vouwt; alleen zijn plek verandert.
struct KrantLayout: SwiftUI.Layout {
    var indeling: KrantIndeling
    func sizeThatFits(proposal: ProposedViewSize, subviews: LayoutSubviews, cache: inout ()) -> CGSize {
        proposal.replacingUnspecifiedDimensions()
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: LayoutSubviews, cache: inout ()) {
        func zet(_ i: Int, _ r: CGRect) {
            guard subviews.indices.contains(i) else { return }
            subviews[i].place(at: CGPoint(x: bounds.minX + r.minX, y: bounds.minY + r.minY), proposal: ProposedViewSize(r.size))
        }
        switch indeling {
        case .enkel, .tabloid:
            zet(0, CGRect(origin: .zero, size: bounds.size))
        case let .tafel(boven, onder):
            // De lijst blijft in de boom (verborgen, op volle maat): zijn plek en zijn navigatie blijven, voor als je
            // weer staand houdt of dichtvouwt. Daarboven het verhaal en de inhoudsopgave.
            zet(0, CGRect(origin: .zero, size: bounds.size)); zet(1, boven); zet(2, onder)
        case let .naast(lijst, verhaal):
            zet(0, lijst); zet(1, verhaal)
        case let .boven(verhaal, lijst):
            zet(0, lijst); zet(1, verhaal)
        }
    }
}

/// Eén tabblad als krant: de lijst, en open de bladzijde met het verhaal of de lezer ernaast.
struct KrantSpread<Lijst: View>: View {
    @Environment(\.horizontalSizeClass) private var horizontal
    @Environment(\.krantTab) private var tab
    @Environment(KrantStaat.self) private var staat: KrantStaat? // optioneel: buiten RootView (toetsen, voorbeelden) is er geen krant
    @Environment(Reader.self) private var reader: Reader?
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(HootStore.self) private var store: HootStore? // optioneel, zoals de krant: buiten RootView geen tafelblad
    @ScaledMetric(relativeTo: .body) private var tafelOnder = KrantIndeling.tafelOnder
    @ViewBuilder var lijst: () -> Lijst
    @State private var rug: Rug?
    @State private var maat: CGSize = .zero
    @State private var oorsprong: CGFloat = 0 // de linkerrand van de krant in het venster: de Editie meet zijn kolommen daartegen

    private var indeling: KrantIndeling {
        // De tabloid alleen voor de Editie, en niet bij heel grote tekst: dan past er geen tweede kolom, en loopt één
        // kolom nooit over de vouw (dan blijft het de lijst op een bladzijde).
        let krant = tab == .editie && !typeSize.isAccessibilitySize
        let rechtsVrij = reader?.item == nil && staat?.verhaal[tab] == nil
        // Het tafelblad pas als er verhalen zijn: tijdens het eerste laden de gewone Editie met de laadstrepen.
        let tafel = krant && !(store.map { TafelEditie.rij($0.editionRows).isEmpty } ?? true)
        return KrantIndeling.kies(size: maat, horizontal: horizontal, rug: rug, krant: krant, rechtsVrij: rechtsVrij,
                                  tafel: tafel, tafelOnder: tafelOnder)
    }

    var body: some View {
        let indeling = indeling
        let breed = indeling.lijstBreedte(in: maat)
        KrantLayout(indeling: indeling) {
            lijst()
                // De lijst op zijn eigen bladzijde: open is links dezelfde iPhone-lijst als dicht. Zonder vouw
                // (iPhone, iPad) blijft de maat van het venster gelden (WidthReader).
                .transformEnvironment(\.isWide) { if let krant = indeling.breed(lijst: breed) { $0 = krant } }
                .transformEnvironment(\.isSpacious) { if indeling != .enkel(pagina: nil) { $0 = breed >= 1000 } }
                .transformEnvironment(\.horizontalSizeClass) { if case .naast = indeling { $0 = .compact } }
                .environment(\.paginaMaat, { if case let .enkel(p) = indeling { return p }; if case .boven = indeling { return KrantIndeling.enkelePagina }; return nil }())
                .environment(\.krantSpread, indeling.spread)
                .environment(\.tabloid, { if case let .tabloid(boek) = indeling { return Tabloid(rug: rug.map { var r = $0; r.frame.origin.x += oorsprong; return r }, boek: boek) }; return nil }())
                .environment(\.openStory) { story in openStory(story) }
                // Het tafelblad legt zich over de lijst: die blijft staan, onzichtbaar en buiten VoiceOver.
                .opacity(indeling.isTafel ? 0 : 1)
                .allowsHitTesting(!indeling.isTafel)
                .accessibilityHidden(indeling.isTafel)
            if indeling.isTafel {
                TafelBoven(tab: tab)
                    .environment(\.krantPagina, true)
                    .environment(\.tafelLezer, true)
                    .environment(\.horizontalSizeClass, .compact)
                    .transition(.identity)
                TafelOnder()
                    .transition(.identity)
            }
            if indeling.heeftPagina {
                KrantPagina(tab: tab)
                    .environment(\.krantPagina, true)
                    .environment(\.horizontalSizeClass, .compact)
                    .transition(.identity)
            }
        }
        .background { RugMeter(nagebootst: DuoNabootsing.shared.rug, rug: $rug, maat: $maat) }
        .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).minX } action: { oorsprong = $0 }
        // De rug zelf is lucht: papier, geen lijn of kleur (merkregel). Ook in Nacht.
        .background(indeling.spread ? Theme.paper : .clear)
        .onChange(of: indeling.spread, initial: true) { _, open in
            // Vouwen is geen nieuwe scène: de lezer wisselt zonder animatie van blad naar bladzijde.
            guard let staat, staat.spread != open else { return }
            var t = Transaction(); t.disablesAnimations = true
            withTransaction(t) { staat.spread = open }
        }
        .onChange(of: rug != nil, initial: true) { _, gemeten in
            // Alleen de Editie meldt de vouw (elk tabblad meet dezelfde zone).
            guard let staat, tab == .editie, staat.vouw != gemeten else { return }
            staat.vouw = gemeten
        }
        .onChange(of: indeling == .tabloid(boek: false), initial: true) { _, staand in
            // Alleen het zichtbare tabblad zet de marge van de lezer (de lezer is één per venster).
            guard let staat, tab == .editie, staat.tabloid != staand else { return }
            staat.tabloid = staand
        }
    }

    private func openStory(_ story: Story) {
        // Vergelijken vervangt de lezer op de rechterbladzijde; dicht is het een stap in de lijst.
        if indeling.spread { reader?.item = nil }
        staat?.verhaal[tab] = story
    }
}

/// De rechterbladzijde: de lezer, het gekozen verhaal (Vergelijken), of rust.
struct KrantPagina: View {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader: Reader?
    @Environment(KrantStaat.self) private var staat: KrantStaat? // optioneel: buiten RootView (toetsen, voorbeelden) is er geen krant
    let tab: RootView.Destination

    /// Op de Editie ligt open het hoofdverhaal klaar, zoals een voorpagina: Vergelijken van 01.
    private var voorpagina: Story? {
        guard tab == .editie else { return nil }
        let lead = EditionNumbering.rows(store.editionRows).first { $0.desk != "bubbel" }
        guard let story = lead?.story, (story.sourceCount ?? 1) > 1 else { return nil }
        var s = story
        s.tappedId = lead?.item.id
        return s
    }

    var body: some View {
        Group {
            if let item = reader?.item {
                LeesBlad(item: item).id(item.id)
            } else if let story = staat?.verhaal[tab] ?? voorpagina {
                NavigationStack {
                    StoryView(story: story)
                        .toolbar {
                            if staat?.verhaal[tab] != nil {
                                ToolbarItem(placement: .cancellationAction) {
                                    Button("Sluit", systemImage: "xmark") { staat?.verhaal[tab] = nil }.tint(Theme.ink3)
                                }
                            }
                        }
                }
                .id(story.id)
            } else {
                KrantRust()
            }
        }
        .background(Theme.paper)
    }
}

/// Het blad (de lezer dicht, of open staand) wijkt zodra de krant open ligt: dan verhuist de lezer naar de bladzijde
/// of boven op het tafelblad (`Reader.item` blijft, dus hetzelfde artikel op dezelfde alinea). De binding van het blad
/// zegt dat al (`KrantStaat.blad`), maar een sluiten dat binnenkomt terwijl het blad nog opkomt, laat SwiftUI liggen:
/// dan bleef er een leeg blad staan met alleen de balk. Daarom sluit het blad zichzelf, zonder animatie, tot het weg is.
struct BladWijkt: ViewModifier {
    let krant: KrantStaat
    @Environment(\.dismiss) private var dismiss
    static let pogingen = 20
    static let tussen: Duration = .milliseconds(250)
    func body(content: Content) -> some View {
        content.task(id: krant.spread) {
            guard krant.spread else { return }
            var t = Transaction(); t.disablesAnimations = true
            for _ in 0..<Self.pogingen {
                withTransaction(t) { dismiss() }
                try? await Task.sleep(for: Self.tussen)
                if Task.isCancelled || !krant.spread { return } // weg (de taak stopt met het blad), of weer dicht
            }
        }
    }
}

/// Het artikel: in de Hoot-lezer, of een Bluesky-post zonder eigen link op bsky.app. Gedeeld door het
/// blad (dicht) en de bladzijde (open).
struct LeesBlad: View {
    @Environment(Reader.self) private var reader: Reader?
    let item: Item
    var body: some View {
        if let url = item.link, Reader.canShow(url) {
            if item.isPost && url.host()?.hasSuffix("bsky.app") == true {
                SafariView(url: url, reader: false).ignoresSafeArea()
            } else {
                ArticleReaderView(item: item).tint(Theme.ink) // niet het rood van de tabbalk
            }
        } else {
            Color.clear.onAppear { reader?.item = nil }
        }
    }
}

/// Nog niets gekozen: een lege bladzijde, rustig.
struct KrantRust: View {
    var body: some View {
        EmptyState(title: "Kies een verhaal", systemImage: "newspaper", text: "Het opent op deze bladzijde.")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.paper)
    }
}

extension View {
    /// Vergelijken als stap in de lijst als de krant dicht is (of niet open past). Open staat het
    /// verhaal op de rechterbladzijde. Zo blijft het verhaal open als je vouwt.
    func krantVerhaal() -> some View { modifier(KrantVerhaal()) }

    /// Het verhaal dat op de rechterbladzijde staat, met een rode streep in de kantlijn: waar je bent.
    func krantGekozen(_ item: Item) -> some View { modifier(KrantGekozen(item: item)) }
}

struct KrantVerhaal: ViewModifier {
    @Environment(\.krantTab) private var tab
    @Environment(\.krantSpread) private var spread
    @Environment(KrantStaat.self) private var staat: KrantStaat? // optioneel: buiten RootView (toetsen, voorbeelden) is er geen krant
    func body(content: Content) -> some View {
        content.navigationDestination(item: Binding(
            get: { spread ? nil : staat?.verhaal[tab] },
            set: { nieuw in if !spread, nieuw == nil { staat?.verhaal[tab] = nil } }
        )) { StoryView(story: $0) }
    }
}

struct KrantGekozen: ViewModifier {
    @Environment(\.krantSpread) private var spread
    @Environment(\.krantTab) private var tab
    @Environment(Reader.self) private var reader: Reader?
    @Environment(KrantStaat.self) private var staat: KrantStaat? // optioneel: buiten RootView (toetsen, voorbeelden) is er geen krant
    let item: Item
    private var gekozen: Bool {
        guard spread else { return false }
        if let open = reader?.item { return open.id == item.id }
        return staat?.verhaal[tab]?.tappedId == item.id
    }
    func body(content: Content) -> some View {
        content
            .overlay(alignment: .leading) {
                if gekozen {
                    Rectangle().fill(Theme.accent).frame(width: 3)
                        .padding(.vertical, Space.s1)
                        .offset(x: -Space.s3 + 1)
                        .accessibilityHidden(true)
                }
            }
            .accessibilityAddTraits(gekozen ? .isSelected : [])
    }
}

// MARK: Je plek bij vouwen

/// Welk verhaal bovenaan staat. Vouwen en draaien veranderen de breedte van de lijst; daarna staat hetzelfde
/// verhaal weer bovenaan (ONDERZOEK §6.3: "je plek is heilig"). Een gewone klasse, geen @Observable: de
/// posities veranderen bij elke scrollstap en mogen de lijst niet opnieuw laten tekenen.
@MainActor final class PlekBoek {
    var boven: [AnyHashable: CGFloat] = [:]
    var anker: AnyHashable?
    var herstellen = false
    var herstel: Task<Void, Never>?
    var offset: CGFloat = 0 // de scroll (contentOffset.y), om stap voor stap te zoeken
    var hoogte: CGFloat = 0 // de hoogte van het zichtbare deel
    var raster = false // de ankers meten zich in de inhoud (de Editie): dan eerst naar boven en zoeken
    var inhoud: [AnyHashable: CGFloat] = [:] // de bovenkant van elk anker in de inhoud (alleen met `plekInhoud`)
    static let ruimte = "plek-inhoud"
    private var taak: Task<Void, Never>?
    /// Na een vouw of draai: zo vaak (ms na elkaar) zet de lijst het anker terug bovenaan, tot de opmaak stilstaat.
    static let herstelMomenten = [60, 32, 40, 80, 160]
    /// Hoe vaak de lijst hooguit een scherm omlaag stapt om een anker in een lazy raster te vinden.
    static let zoekStappen = 16

    /// Als de lijst even stilstaat: onthoud welk verhaal bovenaan staat. Niet meteen: beelden die binnenkomen en
    /// een nieuwe breedte verschuiven de rijen eerst; het anker is wat je zag vóór het vouwen.
    func plan() {
        guard !herstellen else { return }
        taak?.cancel()
        taak = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(300))
            guard let self, !Task.isCancelled, !self.herstellen else { return }
            self.anker = Self.kies(self.boven)
        }
    }
    func stopPlan() { taak?.cancel() }

    /// Het verhaal waarvan de bovenkant het laatst boven de rand van het beeld kwam (of het eerste in beeld).
    static func kies(_ boven: [AnyHashable: CGFloat], rand: CGFloat = 1) -> AnyHashable? {
        if let voorbij = boven.filter({ $0.value <= rand }).max(by: { $0.value < $1.value }) { return voorbij.key }
        return boven.min(by: { $0.value < $1.value })?.key
    }
}

struct PlekBoekKey: EnvironmentKey { static let defaultValue: PlekBoek? = nil }
extension EnvironmentValues {
    var plekBoek: PlekBoek? { get { self[PlekBoekKey.self] } set { self[PlekBoekKey.self] = newValue } }
}

extension View {
    /// Een verhaal in de lijst dat als anker kan dienen (ook voor `ScrollViewReader.scrollTo`).
    func plekAnker<ID: Hashable>(_ id: ID) -> some View { modifier(PlekAnker(id: AnyHashable(id))).id(id) }
    /// Op de ScrollView: onthoud welk verhaal bovenaan staat en zet het terug als de breedte verandert.
    func plekBewaren(_ proxy: ScrollViewProxy) -> some View { modifier(PlekBewaren(proxy: proxy)) }
}

struct PlekAnker: ViewModifier {
    @Environment(\.plekBoek) private var boek
    @Environment(\.plekInhoud) private var inhoud
    let id: AnyHashable
    func body(content: Content) -> some View {
        content
            .onGeometryChange(for: CGFloat.self) { $0.frame(in: .scrollView).minY } action: { boek?.boven[id] = $0; boek?.plan() }
            // De plek in de inhoud zelf (schuift niet mee met scrollen): daarmee kan de lijst zelf terugscrollen.
            .onGeometryChange(for: CGFloat.self) { inhoud ? $0.frame(in: .named(PlekBoek.ruimte)).minY : .nan } action: { if inhoud { boek?.inhoud[id] = $0; boek?.raster = true } }
            .onDisappear { boek?.boven[id] = nil; boek?.inhoud[id] = nil }
    }
}

struct PlekInhoudKey: EnvironmentKey { static let defaultValue = false }
extension EnvironmentValues {
    /// De lijst heeft de coördinatenruimte `PlekBoek.ruimte` op zijn inhoud (de Editie).
    var plekInhoud: Bool { get { self[PlekInhoudKey.self] } set { self[PlekInhoudKey.self] = newValue } }
}

extension View {
    /// Op de inhoud van de ScrollView (niet op de ScrollView): de ruimte waarin de ankers hun plek meten.
    /// `aan` alleen met een vouw: op iPhone en iPad blijft het herstel na draaien zoals het was (direct scrollTo).
    func plekInhoud(_ aan: Bool = true) -> some View { coordinateSpace(.named(PlekBoek.ruimte)).environment(\.plekInhoud, aan) }
}

struct PlekBewaren: ViewModifier {
    let proxy: ScrollViewProxy
    @State private var boek = PlekBoek()
    @State private var positie = ScrollPosition()
    func body(content: Content) -> some View {
        content
            .environment(\.plekBoek, boek)
            // Alleen scrollen telt, niet een nieuwe breedte: dan verschuift de inhoud vanzelf, en is het anker
            // juist wat we terug willen. (De breedte van het vlak zit daarom in de gemeten waarde.)
            .onScrollGeometryChange(for: CGSize.self) { CGSize(width: $0.containerSize.width, height: $0.contentOffset.y) } action: { oud, nieuw in
                boek.offset = nieuw.height
                guard oud.width == nieuw.width else { boek.stopPlan(); return }
                boek.plan()
            }
            .scrollPosition($positie)
            .onScrollGeometryChange(for: CGFloat.self) { $0.containerSize.height } action: { _, h in boek.hoogte = h }
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { oud, nieuw in
                boek.stopPlan()
                guard oud != nieuw, oud > 0, let anker = boek.anker else { return }
                boek.herstellen = true
                boek.herstel?.cancel()
                boek.herstel = Task { @MainActor in
                    // Eerst de nieuwe opmaak, dan terug naar hetzelfde verhaal. Zonder animatie: vouwen is geen beweging.
                    // Duo 1.2, punt 3: de lazy lijst onthoudt de hoogtes van de oude breedte. Van staand of dicht naar
                    // boek wordt de Editie veel korter, maar de lijst denkt nog dat hij lang is: de scroll bleef op een
                    // plek voorbij het einde, de ankers stonden op hun oude plek en scrollTo landde op het einde. Daarom
                    // eerst naar het begin (de lijst meet dan opnieuw vanaf boven), en dan naar het anker, een paar keer
                    // tot de opmaak stilstaat.
                    var t = Transaction(); t.disablesAnimations = true
                    try? await Task.sleep(for: .milliseconds(PlekBoek.herstelMomenten[0]))
                    guard !Task.isCancelled else { return }
                    if boek.raster {
                        // Alleen de Editie (rasters met paren): andere lijsten hebben elk anker direct in de lazy stapel.
                        withTransaction(t) { positie.scrollTo(edge: .top) }
                        try? await Task.sleep(for: .milliseconds(PlekBoek.herstelMomenten[1]))
                    }
                    // Staat het anker in een raster (de paren van de tabloid en het boek), dan bestaat het pas als dat
                    // raster in beeld komt (lazy), en vindt scrollTo het niet. Dan stap voor stap omlaag tot het er is.
                    var stap = 0
                    while boek.raster && boek.inhoud[anker] == nil && boek.boven[anker] == nil && stap < PlekBoek.zoekStappen {
                        guard !Task.isCancelled else { return }
                        withTransaction(t) { positie.scrollTo(y: boek.offset + max(200, boek.hoogte * 0.8)) }
                        try? await Task.sleep(for: .milliseconds(24))
                        stap += 1
                    }
                    for wacht in PlekBoek.herstelMomenten.dropFirst(2) {
                        guard !Task.isCancelled else { return }
                        withTransaction(t) { proxy.scrollTo(anker, anchor: .top) }
                        try? await Task.sleep(for: .milliseconds(wacht))
                    }
                    try? await Task.sleep(for: .milliseconds(250))
                    guard !Task.isCancelled else { return }
                    boek.anker = anker
                    boek.herstellen = false
                }
            }
    }
}
