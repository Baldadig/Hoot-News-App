import SwiftUI

// De kop van de Stroom ("Krantenrubrieken", zelfde vormtaal als de website): de rubrieken in de
// krantenletter op één lijn met een inktlijn eronder, en rechts op die lijn drie van je bronnen als
// stapel, half over elkaar. Eén rode streep glijdt mee naar de actieve rubriek; de rij schuift opzij,
// met een vervaagde rand aan de kant waar nog meer ligt.
// Tik op de stapel: Alle bronnen komt waar de stapel lag, de andere logo's waaieren naar links uit
// over de lijn en de rubrieken wijken. Kies er één of meer (rode ring en vinkje; de rest grijs en
// gedimd, maar te kiezen). De eerste tik op Alle bronnen zet een keuze terug, de tweede (of zonder
// keuze de eerste) klapt de rij dicht; scrollen, ernaast tikken en Escape ook. Dicht met een keuze:
// de gekozen logo's bovenop, hun naam in rood ervoor ("NOS", "3 bronnen") en één klein vinkje.
// De lijn is in elke staat even hoog: er springt niets.
struct StreamLine: View {
    @Binding var rubriek: String // "" is Alles
    @Binding var picks: Set<String> // gekozen bronnen (leeg = alle)
    @Binding var open: Bool
    let lezen: [(id: String, label: String)] // wat je leest: Alles, Buiten je bubbel, Bluesky
    let rubrieken: [(id: String, label: String)] // de acht onderwerpen, na de kolomlijn
    let bronnen: [Source] // in de volgorde van de rij: voorkeur eerst, dan wie het meest brengt
    var stapel = true // geen stapel bij de rubriek Bluesky of met maar één bron
    var knopAs: CGFloat? // midden van de knop rechtsboven (in het venster): daaronder ligt het voorste logo

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var scheme
    // De lijn: aanraakvlak 44 + 2 lucht boven en onder = 48, plus de haarlijn van 1. Groeit mee met
    // grote Dynamische tekst, zodat de rubrieken altijd passen, maar krimpt nooit: onder 44 tikt slecht.
    @ScaledMetric(relativeTo: .body) private var bandMee: CGFloat = Space.tap + Space.s1
    private var band: CGFloat { max(Space.tap + Space.s1, bandMee) }
    @ScaledMetric(relativeTo: .subheadline) private var labelMax: CGFloat = 150 // de naam: hooguit 10 letters breed
    // De naam (SF 15 vet) gecentreerd staat 1 hoger dan de rubrieken (New York 17): zelfde basislijn.
    @ScaledMetric(relativeTo: .body) private var basis: CGFloat = 1
    @State private var lineW: CGFloat = 0
    @State private var lineMaxX: CGFloat = 0
    @State private var labelW: CGFloat = 0
    @State private var label = "" // blijft staan tot hij is vervaagd, ook als de keuze al weg is
    @State private var peek = false // aanwijzer op de stapel (iPad): hij waaiert een stukje open
    @State private var rub = Schuif()
    @State private var rubPos = ScrollPosition()
    @State private var rubFrames: [String: CGRect] = [:]
    @State private var rij = Schuif()
    @State private var rijPos = ScrollPosition(edge: .trailing)
    @State private var stilDicht = false // dichtgeklapt met de focus terug op de stapel: niets voorlezen
    @State private var tikken = 0 // jouw tikken op rubrieken en bronnen: alleen die geven een tikje terug
    @AccessibilityFocusState private var focus: Focus?
    private enum Focus: Hashable { case stapel, alle, bron(String) }

    // Maten (gelijk aan het prototype en de website)
    private static let logo: CGFloat = 36
    private static let small: CGFloat = 28 // dicht: 36 − s2
    private static let scale = small / logo
    private static let step = Space.s4 // dicht: half over elkaar
    private static let peekStep = Space.s4 + Space.s1 // met de aanwijzer erover
    private static let stepOpen = Space.tap + Space.s1 // open: knoppen van 44, 4 ertussen
    private static let pad = Space.s2 // binnenrand van de stapelknop, en tussen naam en logo's
    private static let edgeBasis = (Space.tap - small) / 2 // 8: het voorste logo in een vak van 44 aan de rand
    private static let deckMax = 3
    private static let ring: CGFloat = 3.2 // papierring om het logo; dicht 3,2 × 28/36 = 2,5
    private nonisolated static let ruimte = "rubrieken" // coördinaten van de rubriekenrij

    var body: some View {
        let deck = self.deck
        let deckW = Self.small + CGFloat(max(deck.count, 1) - 1) * Self.step
        // Waar de rubrieken ophouden: de stapelknop (8 + stapel + 8), met een keuze ook de naam.
        let rechts = stapel ? edge + deckW + Self.pad + (picks.isEmpty ? 0 : labelW + Self.pad) : 0
        ZStack(alignment: .topTrailing) {
            Rectangle()
                .fill(scheme == .dark ? Theme.ink3 : Theme.ink)
                .frame(height: 1)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .accessibilityHidden(true)
            rubriekenRij.padding(.trailing, rechts)
            Group {
                if stapel {
                    naam(deckW: deckW, n: deck.count)
                    bronnenRij(deck: deck)
                    stapelKnop(breed: rechts)
                }
            }
            .animation(move(0.2), value: stapel)
        }
        .frame(height: band + 1)
        // Open klapt elke tik naast de lijn de rij dicht: ook op de titel, de werkbalk of de tabbalk.
        .background(Ernaast(actief: open) { sluit(terug: false) })
        // Alleen breedte en rechterrand: die veranderen niet als je scrollt.
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { lineW = $0 }
        .onGeometryChange(for: CGFloat.self) { $0.frame(in: .global).maxX } action: { lineMaxX = $0 }
        .onChange(of: keuze, initial: true) { _, k in if !picks.isEmpty { label = k } }
        .onChange(of: open) { _, nu in nu ? geopend() : dicht() }
        .onChange(of: rub.w) { toon(rubriek, glijd: false) } // eerste meting, of een andere breedte
        .onChange(of: rubriek) { toon(rubriek, glijd: true) } // ook als hij van buiten verandert (terug naar Alles)
        // Verandert de rij zelf (Bluesky of Buiten je bubbel erbij of eraf), dan schuift de actieve
        // rubriek mee: zet haar terug in beeld. Een andere rubriek kiezen doet `rubriek` hierboven.
        .onChange(of: Plek(id: rubriek, frame: rubFrames[rubriek], inhoud: rub.inhoud)) { oud, nu in
            if oud.id == nu.id, !open { toon(nu.id, glijd: false) }
        }
        .sensoryFeedback(.selection, trigger: tikken)
        .onKeyPress(.escape) {
            guard open else { return .ignored }
            sluit(terug: true)
            return .handled
        }
        .onDisappear { if open { stilDicht = true; open = false } }
    }

    // ---- Rubrieken ----

    private var rubriekenRij: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(Array(lezen.enumerated()), id: \.element.id) { i, r in rubriekKnop(r, eerste: i == 0) }
                // Kolomlijn tussen wat je leest en de rubrieken.
                Rectangle().fill(Theme.rule).frame(width: 1, height: Space.s4).padding(.bottom, 1).accessibilityHidden(true)
                ForEach(rubrieken, id: \.id) { r in rubriekKnop(r, eerste: false) }
            }
            .frame(maxHeight: .infinity)
            .coordinateSpace(.named(Self.ruimte))
            // Eén rode streep van 3, óp de haarlijn, die naar de nieuwe rubriek glijdt.
            .overlayPreferenceValue(Streep.self) { anker in
                GeometryReader { g in
                    if let anker {
                        let r = g[anker]
                        Rectangle()
                            .fill(Theme.accent)
                            .frame(width: r.width, height: 3)
                            .offset(x: r.minX, y: g.size.height - 3)
                            .animation(move(), value: rubriek)
                    }
                }
                .accessibilityHidden(true)
            }
        }
        .scrollPosition($rubPos)
        .scrollBounceBehavior(.basedOnSize)
        .onScrollGeometryChange(for: Schuif.self) { Schuif($0) } action: { _, s in rub = s }
        .mask(rand(links: rub.links ? Space.s4 : 0, rechts: rub.rechts ? Space.s4 : 0))
        // Open: de rubrieken wijken zacht naar links en vervagen; terug na 80 ms, als de stapel plaats maakt.
        .offset(x: open ? -Space.s5 : 0)
        .animation(open ? move() : move(delay: 0.08), value: open)
        .opacity(open ? 0 : 1)
        .animation(open ? move(0.28) : move(0.28, delay: 0.08), value: open)
        .allowsHitTesting(!open)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Rubriek")
        .accessibilityHidden(open)
    }

    private func rubriekKnop(_ r: (id: String, label: String), eerste: Bool) -> some View {
        let aan = r.id == rubriek
        return Button { kies(r) } label: {
            Text(r.label)
                .font(.system(.body, design: .serif))
                .foregroundStyle(aan ? Theme.ink : Theme.ink2)
                .animation(move(0.2), value: aan)
                .fixedSize()
                .anchorPreference(key: Streep.self, value: .bounds) { aan ? $0 : nil }
                .padding(.bottom, 1)
                .frame(maxHeight: .infinity)
                .padding(.leading, eerste ? 0 : Space.s2) // ‘Alles’ op de kolomlijn, onder ‘Stroom’
                .padding(.trailing, Space.s2)
                // Tikvlak minstens 44 breed, zonder dat een kort woord (Alles bij kleine tekst) de
                // rubrieken uit hun ritme duwt: het vlak loopt een stukje onder de volgende door.
                .contentShape(MinstensTik())
        }
        .buttonStyle(.plain)
        .zIndex(eerste ? 1 : 0) // ‘Alles’ boven de volgende, anders neemt die het extra stukje
        .accessibilityAddTraits(aan ? .isSelected : [])
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(Self.ruimte)) } action: { rubFrames[r.id] = $0 }
    }

    private func kies(_ r: (id: String, label: String)) {
        guard r.id != rubriek else { return } // een tik op de actieve rubriek doet niets
        rubriek = r.id
        tikken += 1
        zeg("Rubriek \(r.label).")
    }

    // Een rubriek helemaal in beeld: buiten de vervaagde rand.
    private func toon(_ id: String, glijd: Bool) {
        guard let f = rubFrames[id], rub.w > 0 else { return }
        let rand = Space.s4
        var naar = rub.x
        if rub.x > 0 && f.minX < rub.x + rand { naar = f.minX - rand }
        else if f.maxX > rub.x + rub.w - rand { naar = f.maxX - rub.w + rand }
        naar = min(max(0, naar), max(0, rub.inhoud - rub.w))
        guard abs(naar - rub.x) > 0.5 else { return }
        if glijd, let a = move() { withAnimation(a) { rubPos.scrollTo(x: naar) } } else { rubPos.scrollTo(x: naar) }
    }

    // ---- Bronnen ----

    // Open staat elk bolletje op zijn eigen plek in de rij (van rechts naar links, stap 48). Dicht
    // schuift het terug naar zijn plek in de stapel (stap 16, 28 groot) of verdwijnt erachter; Alle
    // bronnen ligt dan onzichtbaar op het voorste logo, en verschijnt daar bij openen.
    private func bronnenRij(deck: [String]) -> some View {
        let bollen = [Bol(id: Bol.alle, bron: nil)] + bronnen.map { Bol(id: $0.id, bron: $0) }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Space.s1) {
                ForEach(Array(bollen.enumerated().reversed()), id: \.element.id) { i, b in
                    bolletje(b, i: i, deck: deck)
                        // Voorlezen zoals je kijkt: eerst Alle bronnen (rechts), dan naar links.
                        .accessibilitySortPriority(Double(bollen.count - i))
                }
            }
            // Alle bronnen (en dicht het voorste logo) recht onder de knop rechtsboven.
            .padding(.trailing, edge - Self.edgeBasis)
            .frame(minWidth: lineW, maxHeight: .infinity, alignment: .trailing)
        }
        .scrollPosition($rijPos)
        .defaultScrollAnchor(.trailing)
        .scrollDisabled(!open)
        .scrollBounceBehavior(.basedOnSize)
        .onScrollGeometryChange(for: Schuif.self) { Schuif($0) } action: { _, s in rij = s }
        .mask(rand(links: open && rij.links ? Space.s5 : 0, rechts: open && rij.vanRechts > 1 ? Space.s5 : 0))
        .frame(height: band)
        .allowsHitTesting(open)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Kies bronnen")
        .accessibilityAction(.escape) { sluit(terug: true) }
        .accessibilityHidden(!open)
    }

    private func bolletje(_ b: Bol, i: Int, deck: [String]) -> some View {
        let alle = b.bron == nil
        let aan = alle ? picks.isEmpty : picks.contains(b.id)
        let k = deck.firstIndex(of: b.id)
        let stap = peek ? Self.peekStep : Self.step
        var x: CGFloat = 0, schaal: CGFloat = 1, zicht: Double = 1
        if !open {
            schaal = Self.scale
            if alle { zicht = 0 }
            else if let k { x = CGFloat(i) * Self.stepOpen - CGFloat(k) * stap }
            else { x = CGFloat(i) * Self.stepOpen - CGFloat(deck.count - 1) * stap; schaal *= 0.8; zicht = 0 }
            x -= rij.vanRechts // was de open rij opgeschoven: de stapel ligt toch op zijn plek
        }
        let ring = open && aan // rood = gekozen, alleen open
        // Dicht met een keuze: hooguit één klein vinkje, op het voorste logo; de rode naam draagt de staat.
        let vinkje = open ? aan : !picks.isEmpty && k == 0
        let dim = !alle && !picks.isEmpty && !aan
        let stand = Stand(open: open, deck: deck, peek: peek)
        // De bolletjes vertrekken kort na elkaar: Alle bronnen eerst, 6 ms per stap, hooguit 90.
        let vertrek = open ? min(Double(i) * 0.006, 0.09) : 0
        return Button { tik(b) } label: {
            ZStack {
                logo(b)
                    .grayscale(dim ? 1 : 0)
                    .opacity(dim ? (scheme == .dark ? 0.6 : 0.5) : 1)
                    .animation(snel, value: dim)
                Circle().strokeBorder(Theme.accent, lineWidth: 2).opacity(ring ? 1 : 0).animation(snel, value: ring)
            }
            .frame(width: Space.tap, height: Space.tap)
            .overlay(alignment: .bottomTrailing) {
                // Het vinkje snijdt met een rand papier door de ring, zodat beide scherp blijven.
                Image(systemName: "checkmark")
                    .font(.system(size: 8, weight: .black))
                    .foregroundStyle(Theme.onAccent)
                    .frame(width: Space.s4, height: Space.s4)
                    .background(Theme.accent, in: Circle())
                    .padding(Space.s0)
                    .background(Theme.paper, in: Circle())
                    .offset(x: Space.s0, y: Space.s0)
                    .scaleEffect(vinkje ? 1 : 0.6)
                    .opacity(vinkje ? 1 : 0)
                    .animation(vinkje && !open ? snel?.delay(0.22) : snel, value: vinkje)
            }
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .scaleEffect(schaal)
        .offset(x: x)
        .animation(move(delay: vertrek), value: stand)
        .opacity(zicht)
        .animation(move(0.24, delay: vertrek), value: stand)
        .zIndex(alle ? 50 : k.map { 40 - Double($0) } ?? 1)
        .accessibilityLabel(b.bron?.name ?? "Alle bronnen")
        .accessibilityAddTraits(aan ? .isSelected : [])
        .accessibilityHint(alle ? (picks.isEmpty ? "Klapt de rij dicht." : "Zet de keuze terug op alle bronnen.") : "")
        .accessibilityFocused($focus, equals: alle ? .alle : .bron(b.id))
        // Geen .help: op iOS zet die ook de toegankelijkheidshint, en dan zegt VoiceOver alles dubbel.
    }

    // Leesbaarheid in de stapel: een papierring en een randje van 1 binnen, zodat witte logo's (NOS,
    // NRC, de Volkskrant) van elkaar loskomen. Hoort bij de stapel, niet bij SourceAvatar.
    @ViewBuilder private func logo(_ b: Bol) -> some View {
        if let s = b.bron {
            SourceAvatar(source: s, size: Self.logo)
                .overlay(Circle().strokeBorder(Theme.ink.opacity(0.14), lineWidth: 1))
                .background(Circle().fill(Theme.paper).padding(-Self.ring))
        } else {
            Circle()
                .fill(Theme.rule)
                .frame(width: Self.logo, height: Self.logo)
                .overlay(Image(systemName: "square.3.layers.3d").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.ink2))
        }
    }

    // De naam van de keuze, in rood voor de dichte stapel; zelfde basislijn als de rubrieken.
    private func naam(deckW: CGFloat, n: Int) -> some View {
        let toon = !picks.isEmpty && !open
        let opzij = peek && !open ? -CGFloat(n - 1) * (Self.peekStep - Self.step) : 0
        return Text(label)
            .font(.subheadline.weight(.bold))
            .foregroundStyle(Theme.accent)
            .lineLimit(1)
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { labelW = $0 }
            .frame(maxWidth: labelMax, alignment: .trailing)
            .offset(y: basis)
            .opacity(toon ? 1 : 0)
            .animation(toon ? move(0.2, delay: 0.22) : move(0.2), value: toon) // pas als de stapel dicht is
            .offset(x: open ? -Self.pad : opzij)
            .animation(move(), value: Stand(open: open, deck: deck, peek: peek))
            .padding(.trailing, edge + deckW + Self.pad)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .frame(height: band)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    // Dicht is de stapel één knop over naam en logo's.
    private func stapelKnop(breed: CGFloat) -> some View {
        Button(action: openRij) {
            Color.clear
                .frame(width: max(breed, Space.tap), height: Space.tap)
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .onHover { peek = $0 && !open && !reduceMotion }
        .frame(height: band)
        .allowsHitTesting(!open)
        .accessibilityLabel("Bronnen kiezen")
        .accessibilityValue(picks.isEmpty ? "alle bronnen" : namen)
        .accessibilityHint("Klapt de rij met je bronnen open.")
        .accessibilityFocused($focus, equals: .stapel)
        .accessibilityHidden(open)
    }

    private func tik(_ b: Bol) {
        guard open else { return }
        guard let s = b.bron else {
            // Eerste tik met een keuze: alles terug; de volgende (of zonder keuze de eerste): dicht.
            if picks.isEmpty { sluit(terug: true) } else {
                picks = []
                tikken += 1
                zeg("Alle bronnen. Nog een tik klapt de rij dicht.")
            }
            return
        }
        let was = picks.contains(s.id)
        if was { picks.remove(s.id) } else { picks.insert(s.id) }
        tikken += 1
        zeg("\(s.name) \(was ? "uit" : "aan"). \(picks.isEmpty ? "Alle bronnen." : "Nu: \(namen).")")
    }

    private func openRij() {
        peek = false
        open = true
    }

    private func sluit(terug: Bool) {
        guard open else { return }
        stilDicht = terug
        open = false
        if terug { Task { try? await Task.sleep(for: .milliseconds(60)); focus = .stapel } }
    }

    private func geopend() {
        stilDicht = false
        // De rij begint bij Alle bronnen (rechts), ook als hij de vorige keer was opgeschoven.
        if rij.vanRechts > 0.5 {
            if let a = move() { withAnimation(a) { rijPos.scrollTo(edge: .trailing) } } else { rijPos.scrollTo(edge: .trailing) }
        }
        Task { try? await Task.sleep(for: .milliseconds(100)); if open { focus = .alle } }
    }

    private func dicht() {
        if !stilDicht { zeg(picks.isEmpty ? "Rij dicht. Alle bronnen." : "Rij dicht. Bronnen: \(namen).") }
        stilDicht = false
        Task { try? await Task.sleep(for: .milliseconds(520)); if !open { toon(rubriek, glijd: true) } }
    }

    // ---- Hulp ----

    private var chosen: [Source] { bronnen.filter { picks.contains($0.id) } } // in de volgorde van de rij
    private var deck: [String] { (picks.isEmpty ? bronnen : chosen).prefix(Self.deckMax).map(\.id) }
    private var namen: String { Self.opsomming(chosen.map(\.name)) }
    private var keuze: String { picks.count == 1 ? chosen.first?.name ?? "1 bron" : "\(picks.count) bronnen" }

    // Kolomrand tot het voorste logo, zodat het op de as van de knop rechtsboven ligt: 8 als de
    // werkbalk dezelfde marge heeft als de kolom (16). Die marge meten we, want hij verschilt per
    // toestel (20 op de grote iPhones: dan 12). Valt de knop buiten de kolom (iPad), dan gewoon 8.
    private var edge: CGFloat {
        guard let knopAs, knopAs > 0, lineMaxX > 0 else { return Self.edgeBasis }
        let e = lineMaxX - knopAs - Self.small / 2
        return (Space.s1...Space.s4).contains(e) ? e : Self.edgeBasis
    }

    // Beweging: 400 ms met een zachte uitloop, cubic-bezier(.2,.8,.2,1); met Verminder beweging direct.
    private func move(_ duur: Double = 0.4, delay: Double = 0) -> Animation? {
        reduceMotion ? nil : .timingCurve(0.2, 0.8, 0.2, 1, duration: duur).delay(delay)
    }
    private var snel: Animation? { reduceMotion ? nil : .timingCurve(0.2, 0.7, 0.2, 1, duration: 0.14) } // gewone bediening

    // Vervaagde randen van een rij: alleen aan de kant waar nog iets ligt.
    private func rand(links: CGFloat, rechts: CGFloat) -> some View {
        HStack(spacing: 0) {
            LinearGradient(colors: [.clear, .black], startPoint: .leading, endPoint: .trailing).frame(width: links)
            Rectangle()
            LinearGradient(colors: [.black, .clear], startPoint: .leading, endPoint: .trailing).frame(width: rechts)
        }
    }

    private func zeg(_ tekst: String) { AccessibilityNotification.Announcement(tekst).post() }

    // "NOS, NRC en de Volkskrant"
    static func opsomming(_ namen: [String]) -> String {
        namen.count < 2 ? namen.joined() : namen.dropLast().joined(separator: ", ") + " en " + namen[namen.count - 1]
    }
}

// Een bolletje in de bronnenrij: een bron, of Alle bronnen.
private struct Bol: Identifiable {
    static let alle = "__alle"
    let id: String
    let bron: Source?
}

// Waar de stapel staat; verandert dit, dan bewegen de bolletjes.
private struct Stand: Equatable {
    var open: Bool
    var deck: [String]
    var peek: Bool
}

// Waar een rij staat: hoe ver opzij, hoe breed het venster en hoe breed de inhoud.
private struct Schuif: Equatable {
    var x: CGFloat = 0
    var w: CGFloat = 0
    var inhoud: CGFloat = 0
    init() {}
    init(_ g: ScrollGeometry) { x = g.visibleRect.minX; w = g.containerSize.width; inhoud = g.contentSize.width }
    var links: Bool { x > 1 } // er ligt nog iets links
    var rechts: Bool { x + w < inhoud - 1 } // en rechts
    var vanRechts: CGFloat { max(0, inhoud - x - w) } // hoe ver de bronnenrij van zijn begin (rechts) is
}

// De plek van de actieve rubriek, voor de rode streep.
private struct Streep: PreferenceKey {
    static var defaultValue: Anchor<CGRect>? { nil }
    static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) { value = value ?? nextValue() }
}

// Waar de actieve rubriek in de rij ligt, en hoe breed de rij is: verschuift dat, dan moet ze terug in beeld.
private struct Plek: Equatable {
    var id: String
    var frame: CGRect?
    var inhoud: CGFloat
}

// Het tikvlak van een rubriek: haar eigen vak, maar minstens 44 breed (naar rechts verlengd).
private struct MinstensTik: Shape {
    func path(in r: CGRect) -> Path {
        Path(CGRect(x: r.minX, y: r.minY, width: max(r.width, Space.tap), height: r.height))
    }
}

// Ernaast tikken, waar dan ook in het venster (ook op de titel, de werkbalk of de tabbalk), zoals
// pointerdown op de website. Een tik-herkenner op het venster die alleen meekijkt: hij houdt niets
// tegen, de tik zelf gaat gewoon door. Hij hangt er alleen zolang de rij open is; het vlak zelf ligt
// precies onder de lijn, en een tik daarbinnen telt niet.
private struct Ernaast: UIViewRepresentable {
    let actief: Bool
    let tik: () -> Void

    func makeUIView(context: Context) -> Vlak { Vlak() }
    func updateUIView(_ vlak: Vlak, context: Context) {
        vlak.tik = tik
        vlak.actief = actief
    }

    final class Vlak: UIView, UIGestureRecognizerDelegate {
        var tik: () -> Void = {}
        var actief = false { didSet { if actief != oldValue { herzie() } } }
        private var herkenner: UITapGestureRecognizer?

        override init(frame: CGRect) {
            super.init(frame: frame)
            isUserInteractionEnabled = false // zelf vangt het niets
        }
        required init?(coder: NSCoder) { fatalError() }

        override func didMoveToWindow() {
            super.didMoveToWindow()
            herzie()
        }

        // Hang de herkenner aan het venster als de rij open is, en haal hem weg als hij dichtgaat.
        private func herzie() {
            let venster = actief ? window : nil
            guard herkenner?.view !== venster else { return }
            if let h = herkenner { h.view?.removeGestureRecognizer(h) }
            herkenner = nil
            guard let venster else { return }
            let h = UITapGestureRecognizer(target: self, action: #selector(getikt))
            h.cancelsTouchesInView = false
            h.delaysTouchesEnded = false
            h.delegate = self
            venster.addGestureRecognizer(h)
            herkenner = h
        }

        @objc private func getikt(_ h: UITapGestureRecognizer) {
            if !bounds.contains(h.location(in: self)) { tik() }
        }

        func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }
    }
}
