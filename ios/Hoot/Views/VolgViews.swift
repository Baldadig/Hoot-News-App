import SwiftUI

// Volgen 1.5 op de iPhone (schermen 01 tot 24 in Hoot-design/ontwerp/volgen-1.5): dezelfde plekken en teksten als het web
// (src/components/Volg.jsx, src/views/Volg.jsx), zo native mogelijk: een gepusht scherm met grote titel, een Menu als knop
// Volgend, een gewone List met vegen en slepen, systeembladen, SF Symbols.
// - VolgLabelBeeld en volgLabelKnop: het label "✓ Je volgt" in de rubriekregel, tikbaar naar de pagina.
// - volgBestemming: de pagina als bestemming in een NavigationStack; `openVolg` in de omgeving.
// - VolgKopView: de kop van De Redacteur boven de zoektreffers (en in het blad uit het kaartmenu).
// - JeVolgtRijen: Zoeken zonder zoekterm, het thuis van wat je volgt.
// - VolgPaginaView: de pagina, met rechtsboven Volgend als Menu (Stuur bij, Deel, Stop met volgen).
// - VolgBeheerBlad, StuurBijBlad, VolgBlad, VolgInlogBlad en de melding met Ongedaan maken (volgBladen).
// Alles verschijnt alleen als de server de functie aanzet (HootStore.volgzakenAan).

// ---- Het label ----

// Waar het label in de kaart staat, zodat de kaart er een eigen knop overheen kan leggen.
struct VolgLabelAnker: PreferenceKey {
    static var defaultValue: Anchor<CGRect>? { nil }
    static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) { value = value ?? nextValue() }
}

// "✓ JE VOLGT" in de rubriekregel: de rubriekkleur, geen onderstreping, geen knopvorm. Alleen beeld: de knop ligt erover
// (volgLabelKnop). Zo staat er nooit een knop in de knop van de kaart, en krijgt VoiceOver een aparte knop.
struct VolgLabelBeeld: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let volgt: StoryVolgzaak
    var body: some View {
        let tekst = typeSize.isAccessibilitySize ? VolgTekst.jeVolgt : VolgTekst.jeVolgt.uppercased()
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Image(systemName: "checkmark").font(.system(size: 9, weight: .heavy)).imageScale(.small)
            Text(tekst)
                .font(typeSize.isAccessibilitySize ? .ui(.caption, .semibold) : .ui(.caption, .heavy))
                .tracking(typeSize.isAccessibilitySize ? 0 : 0.6)
        }
        .foregroundStyle(Theme.ink3)
        .fixedSize()
        .accessibilityHidden(true)
        .anchorPreference(key: VolgLabelAnker.self, value: .bounds) { $0 }
    }
}

// De knop over het label: tik opent de pagina; de rest van de kaart opent het verhaal. Het raakvlak is onzichtbaar 44 pt
// hoog en groeit naar boven (de witruimte boven de kaart) en 8 pt opzij, nooit over de kop eronder. Bij aanraken dimt het
// label even, zoals een systeemknop; wegschuiven breekt de tik af (Button doet dat zelf).
private struct VolgLabelKnop: ViewModifier {
    @Environment(\.openVolg) private var openVolg
    @Environment(HootStore.self) private var store
    let volgt: StoryVolgzaak?
    func body(content: Content) -> some View {
        content.overlayPreferenceValue(VolgLabelAnker.self) { anker in
            GeometryReader { g in
                if let volgt, let anker {
                    let r = g[anker]
                    let hoog = max(Space.tap, r.height)
                    Button {
                        open(volgt)
                    } label: {
                        Color.clear
                            .frame(width: r.width + Space.s4, height: hoog)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(VolgLabelStijl(label: CGRect(x: Space.s2, y: hoog - r.height, width: r.width, height: r.height)))
                    .position(x: r.midX, y: r.maxY - hoog / 2)
                    .accessibilityLabel(VolgTekst.label(volgt.label))
                    .accessibilityAddTraits(.isButton)
                }
            }
        }
    }
    private func open(_ volgt: StoryVolgzaak) {
        let route = VolgRoute(slug: volgt.slug, label: volgt.label)
        if let openVolg { openVolg(route) } else { store.volgPaginaBlad = route }
    }
}

// Het dimmen bij aanraken: een vlak in de kleur van het papier over alleen het label, half doorzichtig.
private struct VolgLabelStijl: ButtonStyle {
    let label: CGRect
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.overlay(alignment: .topLeading) {
            Theme.paper.opacity(configuration.isPressed ? 0.55 : 0)
                .frame(width: label.width, height: label.height)
                .offset(x: label.minX, y: label.minY)
                .allowsHitTesting(false)
                .animation(Beweging.kortAnim, value: configuration.isPressed)
        }
    }
}

extension View {
    func volgLabelKnop(_ volgt: StoryVolgzaak?) -> some View { modifier(VolgLabelKnop(volgt: volgt)) }
}

// ---- Naar de pagina ----

struct OpenVolgKey: EnvironmentKey { static let defaultValue: (@MainActor (VolgRoute) -> Void)? = nil }
extension EnvironmentValues {
    var openVolg: (@MainActor (VolgRoute) -> Void)? {
        get { self[OpenVolgKey.self] }
        set { self[OpenVolgKey.self] = newValue }
    }
}

// De pagina als bestemming in deze NavigationStack: via een NavigationLink(value: VolgRoute) of via `openVolg` (het label,
// "Naar GTA 6" in het kaartmenu). Hoort binnen de NavigationStack, naast navigationDestination(for: Story.self).
private struct VolgBestemming: ViewModifier {
    @State private var route: VolgRoute?
    var debug = false
    func body(content: Content) -> some View {
        content
            .environment(\.openVolg) { route = $0 }
            .overlay(alignment: .bottom) { VolgMeldingStrook() } // boven de tabbalk, zoals "Verwijderd uit Bewaard"
            .navigationDestination(for: VolgRoute.self) { VolgPaginaView(route: $0) }
            .navigationDestination(item: $route) { VolgPaginaView(route: $0) }
            #if DEBUG
            .task { if debug, let r = DebugLaunch.volgPaginaStart { try? await Task.sleep(for: .seconds(12)); route = r } }
            #endif
    }
}
extension View {
    func volgBestemming(debug: Bool = false) -> some View { modifier(VolgBestemming(debug: debug)) }
}

// ---- Het kaartmenu en Vergelijken ----

// "Volg GTA 6" bij Meer hiervan en Minder hiervan; volg je het al, dan "Naar GTA 6" en "Stop met volgen". Het veld staat al
// bij het verhaal, dus het menu klopt meteen. "Volg" opent de kop als blad (scherm 04).
struct VolgMenuRegels: View {
    @Environment(HootStore.self) private var store
    @Environment(\.openVolg) private var openVolg
    let zaak: StoryVolgzaak
    var body: some View {
        if store.volgt(zaak.slug) {
            let label = Volgzaken.actief(store.volgzaken).first { $0.slug == zaak.slug }?.label ?? zaak.label
            Button(VolgTekst.naar(label), systemImage: "arrow.forward.circle") {
                let route = VolgRoute(slug: zaak.slug, label: label)
                if let openVolg { openVolg(route) } else { store.volgPaginaBlad = route }
            }
            Button(VolgTekst.stop, systemImage: "minus.circle") { store.ontvolg(zaak.slug) }
        } else {
            Button(VolgTekst.volgNaam(zaak.label), systemImage: "plus.circle") { store.volgBlad = zaak }
        }
    }
}

// ---- Een verhaal op de pagina en onder "Er speelde al" ----

struct VolgVerhaalRij: View {
    @Environment(HootStore.self) private var store
    let v: EditionEngine.VolgVerhaal
    var compact = false
    var body: some View {
        let bron = store.source(v.bron)
        VStack(alignment: .leading, spacing: Space.s2) {
            Kop(v.kop, compact ? .headline : .title3)
                .lineSpacing(2)
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Space.s2) {
                SourceMark(item: Item(id: "volg-\(v.verhaal)", source: v.bron, sourceName: bron?.name, avatar: bron?.avatar, brandColor: bron?.brandColor, title: v.kop, url: v.url ?? ""), size: 20)
                Text(bron?.name ?? v.bron).font(.ui(.footnote, .semibold)).foregroundStyle(Theme.ink2)
                let meer = VolgTekst.bronnen(v.bronnen)
                if !meer.isEmpty { Text(meer).font(.ui(.footnote)).foregroundStyle(Theme.ink3) }
                if v.buiten { Text(StoryLabel.outsideText).font(.ui(.footnote)).foregroundStyle(Theme.ink3) }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.9)
        }
        .padding(.vertical, Space.s1)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

// Een rij die opent: het verhaal in Vergelijken als het in de feed staat, anders het stuk in de lezer.
private struct VolgVerhaalLink: View {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader
    let v: EditionEngine.VolgVerhaal
    var body: some View {
        if let story = store.storiesById[v.verhaal] {
            NavigationLink(value: story) { VolgVerhaalRij(v: v) }
        } else if let url = v.url, !url.isEmpty {
            Button {
                let bron = store.source(v.bron)
                reader.open(Item(id: "volg-\(v.verhaal)", source: v.bron, kind: "article", sourceName: bron?.name, avatar: bron?.avatar, title: v.kop, url: url, publishedAt: v.at), store: store)
            } label: { VolgVerhaalRij(v: v) }
            .buttonStyle(.plain)
        } else {
            VolgVerhaalRij(v: v)
        }
    }
}

// ---- De kop in Zoeken ----

// De kop van De Redacteur boven de treffers (scherm 01): naam, één regel, Volg en "Er speelde al". Of: Bedoel je (02), een
// hele rubriek (17), niets om te volgen (18), en bij dunne dekking een gratis bron in jouw taal (19).
struct VolgKopView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.openTab) private var openTab
    let antwoord: VolgzaakAPI.Duiding
    var onKies: (String) -> Void = { _ in }
    var onStuurBij: (() -> Void)? = nil
    var opdracht = ""
    @State private var eerder: [EditionEngine.VolgVerhaal] = []

    var body: some View {
        switch antwoord.soort {
        case "geen":
            Text(VolgTekst.geen).font(.ui(.subheadline)).foregroundStyle(Theme.ink2)
        case "bedoel":
            VStack(alignment: .leading, spacing: Space.s2) {
                Kicker(text: VolgTekst.bedoelJe).accessibilityAddTraits(.isHeader)
                ForEach(antwoord.keuzes ?? []) { k in keuze(k) }
            }
        case "rubriek":
            let r = antwoord.rubriek.flatMap { Rubriek.byId[$0] }
            VStack(alignment: .leading, spacing: Space.s3) {
                HStack(spacing: Space.s3) {
                    VolgTegel(rubriek: antwoord.rubriek)
                    Kop(VolgTekst.heleRubriek(r?.label ?? antwoord.rubriek ?? ""), .title3).fixedSize(horizontal: false, vertical: true)
                }
                if let r {
                    Button(VolgTekst.naarRubriek(r.label)) {
                        store.stroomNaarRubriek = r.id
                        openTab(.stroom)
                    }
                    .buttonStyle(.bordered).tint(Theme.ink).font(.ui(.subheadline, .semibold))
                }
                ForEach(antwoord.binnen ?? []) { k in keuze(k) }
            }
        default:
            if let def = antwoord.volgzaak { volgzaak(def) }
        }
    }

    private func keuze(_ k: VolgzaakAPI.Keuze) -> some View {
        Button { onKies(k.opdracht ?? k.naam) } label: {
            HStack(spacing: Space.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(k.naam).font(.ui(.body, .semibold)).foregroundStyle(Theme.ink)
                    if let regel = k.regel { Text(regel).font(.ui(.subheadline)).foregroundStyle(Theme.ink2) }
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.ink3)
            }
            .frame(minHeight: Space.tap)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder private func volgzaak(_ def: VolgzaakAPI.Def) -> some View {
        let eigen = Set(store.volgEigen)
        // Alleen als de server de treffers per bron meegaf (duiden); het blad uit het kaartmenu weet dat niet.
        let weinig = antwoord.bronnen.map { Volgzaken.weinigInEigen($0, eigen: eigen) } ?? false
        let tip = weinig ? Volgzaken.gratisTip(antwoord.bronnen ?? [:], sources: store.newsSources, eigen: eigen) : nil
        VStack(alignment: .leading, spacing: Space.s3) {
            HStack(alignment: .top, spacing: Space.s3) {
                VolgTegel(rubriek: def.rubriek)
                VStack(alignment: .leading, spacing: 2) {
                    Kop(def.label, .title2).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                    if let regel = def.regel, !regel.isEmpty {
                        Text(regel).font(.ui(.subheadline)).foregroundStyle(Theme.ink2).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            VolgKnop(def: def, opdracht: opdracht, onStuurBij: onStuurBij)
            if weinig {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Kicker(text: VolgTekst.weinig)
                    if let tip {
                        HStack(alignment: .firstTextBaseline) {
                            Text(VolgTekst.tip(tip.name)).font(.ui(.subheadline)).foregroundStyle(Theme.ink2).fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: Space.s2)
                            Button(VolgTekst.voegToe) { store.setOn(tip, true) }
                                .font(.ui(.subheadline, .semibold)).tint(Theme.ink)
                                .disabled(store.isOn(tip))
                        }
                    }
                }
                .padding(.top, Space.s1)
            } else if !eerder.isEmpty {
                VStack(alignment: .leading, spacing: Space.s1) {
                    Kicker(text: VolgTekst.erSpeeldeAl).accessibilityAddTraits(.isHeader)
                    ForEach(eerder) { v in
                        if let story = store.storiesById[v.verhaal] {
                            NavigationLink(value: story) { VolgVerhaalRij(v: v, compact: true) }.buttonStyle(.plain)
                        } else {
                            VolgVerhaalRij(v: v, compact: true)
                        }
                    }
                }
                .padding(.top, Space.s1)
            }
        }
        .task(id: antwoord) { eerder = await Self.erSpeeldeAl(antwoord, store: store) }
    }

    // "Er speelde al" per lezer (het antwoord is gedeeld per volgzaak): de regels van de pagina, uit de rekenkern.
    static func erSpeeldeAl(_ a: VolgzaakAPI.Duiding, store: HootStore) async -> [EditionEngine.VolgVerhaal] {
        guard let eerder = a.eerder, !eerder.isEmpty else { return [] }
        let invoer: [String: Any] = ["eerder": VolgJSON.object(eerder) ?? [], "bronnen": store.volgBronnen, "eigen": store.volgEigen, "now": (Date.now.timeIntervalSince1970 * 1000).rounded()]
        guard let data = try? JSONSerialization.data(withJSONObject: invoer) else { return [] }
        return (try? await EditionEngine.volg.erSpeeldeAl(data)) ?? []
    }
}

// JSON van een Encodable als object voor JSONSerialization (de invoer van de rekenkern).
enum VolgJSON {
    static func object<T: Encodable>(_ v: T) -> Any? {
        (try? JSONEncoder().encode(v)).flatMap { try? JSONSerialization.jsonObject(with: $0) }
    }
}

// Het symbool van de rubriek in een rustig vlak (zoals de rij in Zoeken).
struct VolgTegel: View {
    let rubriek: String?
    var body: some View {
        Image(systemName: rubriek.flatMap { Rubriek.byId[$0]?.icon } ?? "newspaper")
            .font(.system(size: 17, weight: .medium))
            .foregroundStyle(Theme.ink2)
            .frame(width: 40, height: 40)
            .background(Theme.ink.opacity(0.06), in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
            .accessibilityHidden(true)
    }
}

// De knop onder de naam: Volg, Volgend (menu), of bij drie "Je volgt er al drie." met Beheer.
struct VolgKnop: View {
    @Environment(HootStore.self) private var store
    let def: VolgzaakAPI.Def
    var opdracht = ""
    var onStuurBij: (() -> Void)? = nil
    var body: some View {
        if store.volgt(def.slug) {
            VolgendMenu(zaak: def.zaak, onStuurBij: onStuurBij) { label in
                label.font(.ui(.subheadline, .semibold)).padding(.horizontal, Space.s3).frame(minHeight: 36)
                    .background(Theme.ink.opacity(0.08), in: Capsule())
            }
        } else if Volgzaken.isVol(store.volgzaken) {
            HStack(spacing: Space.s3) {
                Text(VolgTekst.alDrie).font(.ui(.subheadline)).foregroundStyle(Theme.ink2)
                Button(VolgTekst.beheer) { store.volgBeheer = true }.buttonStyle(.bordered).tint(Theme.ink).font(.ui(.subheadline, .semibold))
            }
        } else {
            Button { store.volg(def.zaak, opdracht: opdracht) } label: {
                Label(VolgTekst.volg, systemImage: "plus").font(.ui(.subheadline, .semibold)).padding(.horizontal, Space.s1)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.accent)
            .sensoryFeedback(.success, trigger: store.volgt(def.slug))
        }
    }
}

// Volgend als Menu (scherm 03, 12): Stuur bij, Deel, en apart Stop met volgen. Eén tik ontvolgt nooit per ongeluk.
struct VolgendMenu<Vorm: View>: View {
    @Environment(HootStore.self) private var store
    let zaak: StoryVolgzaak
    var onStuurBij: (() -> Void)? = nil
    var vorm: (AnyView) -> Vorm
    init(zaak: StoryVolgzaak, onStuurBij: (() -> Void)? = nil, @ViewBuilder vorm: @escaping (AnyView) -> Vorm) {
        self.zaak = zaak; self.onStuurBij = onStuurBij; self.vorm = vorm
    }
    var body: some View {
        Menu {
            if let onStuurBij { Button(VolgTekst.stuurBij, systemImage: "pencil") { onStuurBij() } }
            ShareLink(item: Volgzaken.deelLink(zaak.slug), subject: Text(zaak.label)) { Label(VolgTekst.deel, systemImage: "square.and.arrow.up") }
            Divider()
            Button(VolgTekst.stop, systemImage: "minus.circle") { store.ontvolg(zaak.slug) }
        } label: {
            vorm(AnyView(Label(VolgTekst.volgend, systemImage: "checkmark").labelStyle(.titleAndIcon)))
        }
        .labelStyle(.titleAndIcon) // ook in de werkbalk: "✓ Volgend", niet alleen het vinkje
        .tint(Theme.ink)
        .accessibilityLabel("\(VolgTekst.volgend), \(zaak.label)")
    }
}

// ---- Zoeken zonder zoekterm ----

// "Je volgt": één rij per volgzaak, met "Nieuw" of "Niets nieuws" (nooit een getal), wat nieuw is bovenaan. De volgorde ligt
// vast zodra het overzicht er is (zolang je kijkt).
struct JeVolgtRijen: View {
    @Environment(HootStore.self) private var store
    @State private var overzicht: [String: VolgzaakOverzicht]?
    @State private var vast: [String]?
    var body: some View {
        let lijst = Volgzaken.inVolgorde(store.volgzaken, overzicht: overzicht ?? [:])
        let geordend = vast.map { v in v.compactMap { s in lijst.first { $0.zaak.slug == s } } + lijst.filter { !v.contains($0.zaak.slug) } } ?? lijst
        ForEach(geordend, id: \.zaak.slug) { rij in
            NavigationLink(value: VolgRoute(slug: rij.zaak.slug, label: rij.zaak.label)) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(rij.zaak.label).font(.ui(.body, .semibold)).foregroundStyle(Theme.ink)
                    Text(VolgTekst.nieuwTekst(rij.nieuw))
                        .font(.ui(.subheadline, rij.nieuw ? .semibold : .regular))
                        .foregroundStyle(rij.nieuw ? Theme.accent : Theme.ink3)
                }
                .padding(.vertical, Space.s1)
            }
        }
        .task(id: Volgzaken.actief(store.volgzaken).map(\.slug).joined(separator: ",")) {
            let slugs = Volgzaken.actief(store.volgzaken).map(\.slug)
            guard !slugs.isEmpty else { return }
            let a = await VolgzaakAPI.vraag("overzicht", ["slugs": slugs])
            let o = (a.ok ? a.lees(VolgzaakAPI.Overzicht.self)?.overzicht.compactMapValues { $0 } : nil) ?? [:]
            overzicht = o
            if vast == nil { vast = Volgzaken.inVolgorde(store.volgzaken, overzicht: o).map(\.zaak.slug) }
        }
    }
}

// ---- De pagina ----

// Eén volgzaak (scherm 08 tot 16, 24): gepusht met grote titel, rechtsboven Volgend als Menu. Wat je ziet rekent de
// gedeelde rekenkern uit (volgzaakView): eerst je taal en je eigen bronnen, gratis van buiten met "Buiten je bronnen", Nieuw
// sinds je vorige bezoek en Eerder per week, dan "Je bent bij.". Openen zet de rij in Zoeken op "Niets nieuws"; wat nieuw
// was blijft hier nieuw tot je weer opent (de grens ligt vast bij het openen). De stand van zaken staat er alleen als de
// server die meegeeft (achter HOOT_VOLGZAAK_STAND); de slotregel en "Drie weken stil" ook alleen op zijn aanwijzing.
struct VolgPaginaView: View {
    @Environment(HootStore.self) private var store
    @State private var slug: String
    @State private var label: String?
    @State private var pagina: VolgzaakAPI.Pagina?
    @State private var fout: String?
    @State private var view = EditionEngine.VolgPagina()
    @State private var grens: String?? = .none // vast bij het openen
    @State private var stuurBij = false

    init(route: VolgRoute) {
        _slug = State(initialValue: route.slug)
        _label = State(initialValue: route.label)
    }

    private var zaak: Volgzaak? { store.volgzaken.first { $0.slug == slug } }
    private var volgend: Bool { zaak?.actief == true }
    private var def: VolgzaakAPI.Def { pagina?.volgzaak ?? VolgzaakAPI.Def(slug: slug, label: zaak?.label ?? label ?? "") }
    private var stil: Bool { pagina?.status == "stil" || zaak?.status == "gestopt" }

    var body: some View {
        List {
            if let regel = def.regel, !regel.isEmpty {
                Section {
                    Text(regel).font(.ui(.subheadline)).foregroundStyle(Theme.ink2).listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 0, leading: Space.s4, bottom: 0, trailing: Space.s4))
                }
            }
            if let fout {
                Section { Text(fout).foregroundStyle(Theme.ink2).listRowBackground(Color.clear) }
            } else if pagina == nil {
                Section { ProgressView().frame(maxWidth: .infinity).listRowBackground(Color.clear) }
            } else {
                if let slot = pagina?.slot, volgend {
                    Section {
                        VStack(alignment: .leading, spacing: Space.s3) {
                            Kop(slot, .title3).fixedSize(horizontal: false, vertical: true)
                            HStack(spacing: Space.s3) {
                                Button(VolgTekst.blijfVolgen) { store.volgBekeken(slug) }.buttonStyle(.bordered)
                                Button(VolgTekst.klaar) { store.ontvolg(slug) }.buttonStyle(.bordered)
                            }
                            .tint(Theme.ink).font(.ui(.subheadline, .semibold))
                        }
                        .padding(.vertical, Space.s1)
                        .listRowBackground(Theme.surface)
                    }
                }
                if stil {
                    Section { Text(VolgTekst.stil).foregroundStyle(Theme.ink2).listRowBackground(Theme.surface) }
                }
                if let s = pagina?.stand?.samenvatting, let tekst = s.tekst, !tekst.isEmpty {
                    Section {
                        VStack(alignment: .leading, spacing: Space.s2) {
                            Text(tekst).leestekst(.body).fixedSize(horizontal: false, vertical: true)
                            if let volgens = s.volgens { Text(volgens).font(.ui(.footnote)).foregroundStyle(Theme.ink3) }
                        }
                        .listRowBackground(Theme.surface)
                    }
                }
                if !view.nieuw.isEmpty {
                    Section {
                        ForEach(view.nieuw) { v in VolgVerhaalLink(v: v).listRowBackground(Theme.surface) }
                    } header: { Kicker(text: VolgTekst.nieuw).textCase(nil).accessibilityAddTraits(.isHeader) }
                }
                ForEach(Array(view.eerder.enumerated()), id: \.element.week) { i, w in
                    Section {
                        ForEach(w.verhalen) { v in VolgVerhaalLink(v: v).listRowBackground(Theme.surface) }
                    } header: {
                        VStack(alignment: .leading, spacing: 2) {
                            if i == 0 { Kicker(text: VolgTekst.eerder).accessibilityAddTraits(.isHeader) }
                            Text(w.week).font(.ui(.footnote)).foregroundStyle(Theme.ink3)
                        }
                        .textCase(nil)
                    }
                }
                Section {
                    Text(view.nieuw.isEmpty && volgend ? VolgTekst.nietsNieuwsBij : VolgTekst.bij)
                        .font(.ui(.footnote)).foregroundStyle(Theme.ink3)
                        .frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .readableList()
        .background(Theme.paper)
        .navigationTitle(def.label)
        .navigationBarTitleDisplayMode(.large)
        .overlay(alignment: .bottom) { VolgMeldingStrook() } // Stop met volgen hier: de melding met Ongedaan maken
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                if fout != nil {
                    EmptyView()
                } else if volgend && !stil {
                    VolgendMenu(zaak: def.zaak, onStuurBij: { stuurBij = true }) { $0 }
                } else {
                    Button(stil ? VolgTekst.volgWeer : VolgTekst.volg) { store.volg(def.zaak) }
                        .disabled(def.label.isEmpty)
                }
            }
        }
        .sheet(isPresented: $stuurBij) {
            StuurBijBlad(def: def) { naar in slug = naar.slug; label = naar.label; pagina = nil; grens = .none }
                .debugAppearance()
        }
        .task(id: slug) { await laad() }
        #if DEBUG
        .task { if DebugLaunch.screen("volg-stuurbij") { try? await Task.sleep(for: .seconds(1.5)); stuurBij = true } }
        #endif
    }

    private func laad() async {
        fout = nil
        if case .none = grens { grens = .some(volgend ? (zaak?.gezien ?? zaak?.at) : nil) }
        let a = await VolgzaakAPI.vraag("pagina", ["slug": slug])
        guard a.ok, let p = a.lees(VolgzaakAPI.Pagina.self), p.volgzaak != nil else {
            fout = a.status == 404 ? VolgTekst.geen : VolgTekst.mislukt
            return
        }
        pagina = p
        if volgend { store.volgBekeken(slug) }
        // De pagina per lezer, uit de rekenkern.
        var invoer: [String: Any] = ["bronnen": store.volgBronnen, "eigen": store.volgEigen, "gelezen": store.gelezenVerhalen, "now": (Date.now.timeIntervalSince1970 * 1000).rounded()]
        invoer["stand"] = p.stand.flatMap { VolgJSON.object($0) } ?? ["verhalen": []]
        invoer["gezien"] = (grens ?? nil) ?? NSNull()
        do {
            let data = try JSONSerialization.data(withJSONObject: invoer)
            view = try await EditionEngine.volg.volgzaakView(data)
        } catch {
            view = EditionEngine.VolgPagina() // de rekenkern faalde: alleen het einde, geen halve pagina
        }
    }
}

// ---- Stuur bij ----

// Hoe Hoot het leest (Let op en Niet, als gewone tekst als de server ze meegeeft) en één veld "Zeg het scherper" (scherm 21).
// Gedeeld: komt er een andere volgzaak uit, dan volg je voortaan die. Je gewone zoekterm wijst naar de gewone volgzaak.
struct StuurBijBlad: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let def: VolgzaakAPI.Def
    var onWissel: (StoryVolgzaak) -> Void = { _ in }
    @State private var tekst = ""
    @State private var bezig = false
    @State private var fout: String?
    @FocusState private var veld: Bool

    var body: some View {
        NavigationStack {
            Form {
                if let regel = def.regel, !regel.isEmpty { Section { Text(regel).foregroundStyle(Theme.ink2) } }
                if let namen = def.namen, !namen.isEmpty { Section(VolgTekst.letOp) { Text(namen.joined(separator: " · ")) } }
                if let uit = def.uit, !uit.isEmpty { Section(VolgTekst.niet) { Text(uit.joined(separator: " · ")) } }
                Section {
                    TextField(VolgTekst.scherper, text: $tekst, axis: .vertical)
                        .focused($veld)
                        .submitLabel(.send)
                        .onSubmit { Task { await stuur() } }
                        .onChange(of: tekst) { _, t in if t.count > Volgzaken.opdrachtMax { tekst = String(t.prefix(Volgzaken.opdrachtMax)) } }
                } header: { Text(VolgTekst.scherper) } footer: {
                    if let fout { Text(fout).foregroundStyle(Theme.accent) }
                }
            }
            .navigationTitle(VolgTekst.stuurBij)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Sluiten", systemImage: "xmark") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if bezig { ProgressView() } else {
                        Button(VolgTekst.stuurBij) { Task { await stuur() } }.disabled(tekst.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .onAppear { veld = true }
        }
        .presentationDetents([.medium, .large])
    }

    private func stuur() async {
        let scherper = tekst.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !scherper.isEmpty, !bezig else { return }
        bezig = true
        fout = nil
        let a = await VolgzaakAPI.vraag("bijsturen", ["slug": def.slug, "scherper": scherper], token: await store.volgToken())
        bezig = false
        guard a.ok, let d = a.lees(VolgzaakAPI.Duiding.self) else { fout = a.fout; return }
        if let naar = d.naar, let nieuw = d.volgzaak {
            let zaak = StoryVolgzaak(slug: naar, label: nieuw.label)
            store.volgWissel(van: def.slug, naar: zaak)
            onWissel(zaak)
        } else if d.soort == "geen" {
            fout = d.tekst ?? VolgTekst.geen
            return
        }
        dismiss()
    }
}

// ---- Het beheerblad ----

// "Je volgt" met Klaar (scherm 11): naar links vegen geeft Stop met volgen, slepen verandert de volgorde (List met onMove,
// zonder aparte Wijzig-stand). Wat stopte staat nog een week onder Gestopt, met Volg weer.
struct VolgBeheerBlad: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            let actief = Volgzaken.actief(store.volgzaken)
            let gestopt = Volgzaken.gestopt(store.volgzaken)
            List {
                Section {
                    if actief.isEmpty {
                        Text(VolgTekst.nietsNieuws).foregroundStyle(Theme.ink3)
                    }
                    ForEach(actief) { z in
                        Text(z.label).font(.ui(.body)).foregroundStyle(Theme.ink)
                            .frame(minHeight: Space.tap, alignment: .leading)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(VolgTekst.stop, systemImage: "minus.circle", role: .destructive) { store.ontvolg(z.slug) }
                            }
                    }
                    .onMove { van, naar in
                        guard let v = van.first else { return }
                        store.volgVerplaats(van: v, naar: naar > v ? naar - 1 : naar)
                    }
                }
                if !gestopt.isEmpty {
                    Section(VolgTekst.gestopt) {
                        ForEach(gestopt) { z in
                            HStack {
                                Text(z.label).foregroundStyle(Theme.ink3)
                                Spacer()
                                Button(VolgTekst.volgWeer) { store.volg(StoryVolgzaak(slug: z.slug, label: z.label)) }
                                    .buttonStyle(.bordered).tint(Theme.ink).font(.ui(.subheadline, .semibold))
                                    .disabled(Volgzaken.isVol(store.volgzaken))
                            }
                        }
                    }
                }
            }
            .navigationTitle(VolgTekst.jeVolgt)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(VolgTekst.klaar) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}

// ---- Het blad uit het kaartmenu en Vergelijken ----

// "Volg GTA 6" uit het kaartmenu (scherm 04): dezelfde kop als in Zoeken, als blad. Geen wachttijd: de naam staat al bij
// het verhaal; de regel en "Er speelde al" komen uit de pagina van de server (gratis, zonder account).
struct VolgBlad: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let zaak: StoryVolgzaak
    @State private var antwoord: VolgzaakAPI.Duiding?
    var body: some View {
        NavigationStack {
            ScrollView {
                VolgKopView(antwoord: antwoord ?? VolgzaakAPI.Duiding(soort: "volgzaak", volgzaak: VolgzaakAPI.Def(slug: zaak.slug, label: zaak.label)))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, Space.s4)
                    .padding(.top, Space.s2)
                    .padding(.bottom, Space.s6)
            }
            .background(Theme.paper)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(VolgTekst.klaar) { dismiss() } } }
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .task {
            let a = await VolgzaakAPI.vraag("pagina", ["slug": zaak.slug])
            guard let p = a.ok ? a.lees(VolgzaakAPI.Pagina.self) : nil, let def = p.volgzaak else { return }
            antwoord = VolgzaakAPI.Duiding(soort: "volgzaak", volgzaak: def, eerder: p.stand?.verhalen, bronnen: nil)
        }
    }
}

// Volg zonder account: de vraag om in te loggen, met het gewone inloggen. Ben je lid, dan volg je het alsnog.
struct VolgInlogBlad: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let zaak: StoryVolgzaak
    var body: some View {
        NavigationStack {
            AccountView(onMember: {
                dismiss()
                Task { try? await Task.sleep(for: .milliseconds(400)); store.volg(zaak) }
            })
            .safeAreaInset(edge: .top) {
                Text(VolgTekst.inloggen)
                    .font(.ui(.subheadline, .semibold)).foregroundStyle(Theme.ink2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Space.s2)
                    .background(Theme.paper)
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Sluiten", systemImage: "xmark") { dismiss() } } }
        }
    }
}

// ---- De bladen en de melding, één keer voor de hele app (RootView) ----

private struct VolgBladen: ViewModifier {
    @Environment(HootStore.self) private var store
    func body(content: Content) -> some View {
        @Bindable var store = store
        content
            .sheet(item: $store.volgBlad) { VolgBlad(zaak: $0).debugAppearance() }
            .sheet(isPresented: $store.volgBeheer) { VolgBeheerBlad().debugAppearance() }
            .sheet(item: $store.volgInloggen) { VolgInlogBlad(zaak: $0).debugAppearance() }
            .sheet(item: $store.volgPaginaBlad) { route in
                NavigationStack {
                    VolgPaginaView(route: route)
                        .navigationDestination(for: Story.self) { StoryView(story: $0) }
                }
                .debugAppearance()
            }
    }
}
extension View {
    func volgBladen() -> some View { modifier(VolgBladen()) }
}

// "Je volgt Kabinetsformatie." of "Je volgt GTA 6 niet meer." met Ongedaan maken: dezelfde strook als "Verwijderd uit
// Bewaard". Zwevend boven de tabbalk, een paar seconden.
struct VolgMeldingStrook: View {
    @Environment(HootStore.self) private var store
    var body: some View {
        Group {
            if let m = store.volgMelding {
                HStack {
                    Text(m.tekst).foregroundStyle(Theme.ink2).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: Space.s2)
                    if case .gestopt = m {
                        Button(VolgTekst.ongedaan) { store.ongedaanVolg() }
                            .font(.ui(.subheadline, .semibold))
                            .tint(Theme.ink)
                            .frame(minHeight: Space.tap)
                    }
                }
                .font(.ui(.subheadline))
                .padding(.horizontal, Space.s4)
                .frame(minHeight: Space.tap)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                .shadow(color: .black.opacity(0.12), radius: 8, y: 2)
                .padding(.horizontal)
                .padding(.bottom, Space.s2)
                .frame(maxWidth: Layout.readable)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .accessibilityElement(children: .contain)
                .task(id: m.sleutel) {
                    AccessibilityNotification.Announcement(m.tekst).post()
                    try? await Task.sleep(for: .seconds(DebugLaunch.volgMeldingVast ? 600 : 6))
                    // Afgebroken (de strook verdwijnt, of een ander tabblad toont hem): niet wissen.
                    if !Task.isCancelled, store.volgMelding?.sleutel == m.sleutel { withAnimation { store.volgMelding = nil } }
                }
            }
        }
        .animation(Beweging.gewoonAnim, value: store.volgMelding?.sleutel)
    }
}
