import SwiftUI

// Het welkom (1.1.0), gelijk aan de website (src/views/Welcome.jsx). Vier schermen:
//   1. de rode intro: de zon komt op achter de horizon, "Begin". Inloggen klein rechtsboven.
//   2. Zo werkt Hoot: Editie, Stroom en Selectie als gelijken op één scherm, elk met zijn eigen zon
//      (OnboardingArt: de zon achter de horizon, rustig; bij Verminder beweging stil). Kies je
//      interesses, of Liever meteen lezen (de gratis startset, zonder sport).
//   3. Wat interesseert je?: de hoofdrubrieken (je Stroom-tabs) en, uitklapbaar, je Selectie.
//   4. Volg je bronnen, zoals accounts volgen: niets staat vooraf aan. Bovenaan de Basis (Nederlands
//      nieuws, het gratis begin voorop), dan per gekozen interesse een blok met een gratis aanrader;
//      de rest ingeklapt; zoeken vindt alles. Een voorbeeld-Editie met echte koppen groeit mee
//      (breed rechts, smal in een uitklapbalk boven de knop).
// Eerst de interesses, dan de bronnen: zo staan de vak- en nichebronnen bij wat je koos. "Later
// kiezen" kan altijd. Het seintje komt pas na de eerste Editie (EditionView, AlertOffer), niet hier.
// Het merk loopt erdoorheen: het opstartscherm landt op "hoot." linksboven op de rode intro, en bij
// het eerste papier sluit het rood zich als een iris tot de punt van "hoot." op papier.
// Opnieuw kiezen (Instellingen, `reopen`) en na even rondkijken (een blad met `onCancel`): geen intro
// en geen uitleg; je begint bij je interesses met wat nu aan staat, en Sluiten slaat niets op.
struct WelcomeView: View {
    enum Step: String { case intro, uitleg, interesses, bronnen }

    var reopen = false
    var start: Step = .intro
    var onCancel: (() -> Void)? = nil
    var onDone: () -> Void

    @Environment(HootStore.self) private var store
    @Environment(\.brandHandoff) private var brand // van het opstartscherm (HootApp)
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.nachtActief) private var nacht
    @ScaledMetric(relativeTo: .largeTitle) private var hero: CGFloat = 38
    @ScaledMetric(relativeTo: .body) private var trioArt: CGFloat = 72

    @State private var step: Step
    @State private var query = ""
    @State private var showFollowed = false // de pil Gevolgd (anders Aanbevolen)
    @State private var more = false // Meer bronnen uitgeklapt
    @State private var sourcesEdited = false // jij koos zelf een bron aan of uit: dan zet het voorstel niets meer aan
    @State private var voorstel: [EditionEngine.VoorstelBron]? = nil // het voorstel bovenaan (shared/voorstel.mjs); nil: de vaste Basis
    @State private var fold: [String: Bool] = [:] // inklapbare categorieën: wat jij open- of dichtklapte (anders FollowList.startsOpen)
    @State private var peekOpen = false
    @State private var selOpen = false
    @State private var chosen: [String]? // je bronnen; pas ingevuld als ze er zijn
    @State private var original: [String] = [] // wat er aan stond (opnieuw kiezen)
    @State private var interests: [String] = []
    @State private var picked: [String] = [] // je fijne onderwerpen van vroeger (blijven als je de interesse houdt)
    @State private var vak: [String] = [] // de eerste keer leeg: een nieuwe lezer kiest zijn vak zelf, of later
    @State private var prepared = false
    @State private var login = false
    @State private var width: CGFloat = 0
    @State private var fade = 1.0 // wisselen tussen papieren pagina's
    @State private var turning = false // midden in zo'n wissel: een tweede tik telt niet
    @State private var introSince: Date? // sinds wanneer de zon op de rode intro opkomt
    @AccessibilityFocusState private var headFocus: Bool

    // De iris: het rood ligt over de eerste papieren pagina en sluit tot de punt van het woordmerk daar.
    @State private var iris = BrandHandoff()
    @State private var red: Bool // de rode intro ligt erbovenop
    @State private var closed = false // het rood is gesloten tot de punt
    @State private var tinted = false // het rood kleurt naar de punt (in donker koraal)
    @State private var dotGone = false // de papieren punt op het rood is opgegaan in het rood

    init(reopen: Bool = false, start: Step = .intro, onCancel: (() -> Void)? = nil, onDone: @escaping () -> Void) {
        var first = reopen ? .interesses : start
        #if DEBUG
        // `-HootWelcomeStep uitleg|bronnen|interesses`
        if first == .intro, let name = DebugLaunch.welcomeStep, let s = Step(rawValue: name) { first = s }
        #endif
        self.reopen = reopen
        self.start = first
        self.onCancel = onCancel
        self.onDone = onDone
        _step = State(initialValue: first)
        _red = State(initialValue: first == .intro)
    }

    // Opnieuw kiezen of na even rondkijken: je begint bij wat je nu hebt.
    private var again: Bool { reopen || onCancel != nil }
    private var slow: Double { DebugLaunch.slow } // `-HootSlowSplash 6`: ook de iris in slow motion
    private var wide: Bool { width >= 834 } // het voorbeeld naast de lijst (iPad), zoals het web
    private static let paperWhite = SplashView.paperWhite // op merkrood is alles papier (ook in donker)

    var body: some View {
        NavigationStack {
            ZStack {
                if step != .intro {
                    paperStep.accessibilityHidden(red)
                }
                if red {
                    introStep.transition(.opacity) // alleen zichtbaar bij "Verminder beweging"
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .statusBarHidden(red) // op rood geen donkere klok; terug zodra het papier er is
            .navigationDestination(isPresented: $login) {
                AccountView { onDone() }
            }
        }
        .tint(Theme.ink) // bediening is inkt; rood is voor wat gekozen is
        .interactiveDismissDisabled(onCancel == nil)
        .debugAppearance()
        .onAppear(perform: prepare)
        .task { await store.loadDigest() } // welke onderwerpen de Selectie heeft
        .onChange(of: store.newsSources.count) { fill() }
        .onChange(of: step) {
            // De kop van de nieuwe pagina voorlezen (VoiceOver), zoals de focus op de kop op het web.
            Task {
                try? await Task.sleep(for: .milliseconds(400))
                headFocus = true
            }
        }
        .onChange(of: brand?.landed ?? true) { startSun() }
    }

    // ---- Keuzes ----

    private func prepare() {
        guard !prepared else { return }
        prepared = true
        if again {
            interests = store.interests
            picked = Rubriek.picked(from: store.topics, interests: store.interests)
            vak = store.digestFields
            selOpen = !vak.isEmpty
        }
        #if DEBUG
        if let list = DebugLaunch.interests { interests = list } // `-HootInterests politiek,tech,cultuur`
        #endif
        startSun()
        fill()
    }

    // De zon op de rode intro komt op zodra het opstartscherm weg is.
    private func startSun() {
        guard step == .intro, brand?.landed ?? true, introSince == nil else { return }
        introSince = .now
    }

    // Je bronnen, zodra ze er zijn: opnieuw kiezen begint bij wat je volgt, de eerste keer bij niets.
    private func fill() {
        guard !store.newsSources.isEmpty, chosen == nil else { return }
        original = again ? store.followed.map(\.id) : []
        chosen = original
    }

    private func toggled(_ list: [String], _ id: String) -> [String] { list.contains(id) ? list.filter { $0 != id } : list + [id] }
    private var mine: [String] { chosen ?? [] }

    // Klaar: je interesses, onderwerpen, bronnen en vak worden je instellingen.
    private func finish(interests ids: [String], vak fields: [String]) {
        store.applyWelcome(interests: ids, topics: Rubriek.resolve(ids, picked: picked), sources: mine, shown: store.newsSources, vak: fields)
        onDone()
    }

    // "Liever meteen lezen": zonder vragen een goed begin met gratis Nederlandse bronnen, geen sport en geen vak.
    private func quickStart() {
        store.quickStart()
        onDone()
    }

    // Later kiezen bij de interesses: zoals het was (de eerste keer dus leeg), door naar de bronnen.
    private func laterInterests() {
        interests = again ? store.interests : []
        vak = again ? store.digestFields : []
        go(.bronnen)
    }

    // Later kiezen bij de bronnen: zoals het was, en de eerste keer zonder iets gevolgd de startset.
    private func laterSources() {
        if mine.isEmpty { chosen = again ? original : FollowList.startIds(store.newsSources) }
        finish(interests: interests, vak: vak)
    }

    private func back() {
        switch step {
        case .uitleg: go(.intro)
        case .interesses: if again { onCancel?() } else { go(.uitleg) }
        case .bronnen: go(.interesses)
        case .intro: break
        }
    }

    // ---- Overgangen ----

    private func go(_ next: Step) {
        if step == .intro { leaveIntro(to: next); return }
        if next == .intro { backToIntro(); return }
        // Tussen papieren pagina's: even uit en weer in (0,2 s).
        turn {
            step = next
            query = ""
            peekOpen = false
        }
    }

    private func turn(_ change: @escaping () -> Void) {
        guard !turning else { return }
        turning = true
        Task {
            withAnimation(.easeOut(duration: 0.08)) { fade = 0 }
            try? await Task.sleep(for: .seconds(0.08))
            change()
            withAnimation(.easeIn(duration: 0.12)) { fade = 1 }
            turning = false
        }
    }

    // De iris: dezelfde curve en duur als bij het opstarten. Het rood krimpt tot de punt van "hoot."
    // op papier; de rand veegt de papieren letters weg en de inkt staat er al. De papieren punt gaat
    // op in het rood, en het laatste stuk kleurt het rood mee naar de punt (in donker koraal).
    private func leaveIntro(to next: Step) {
        closed = false
        tinted = false
        dotGone = false
        step = next
        Task {
            guard !still else {
                withAnimation(.easeOut(duration: 0.35)) { red = false }
                return
            }
            // Wachten tot het woordmerk op papier zijn plek heeft (een beeld of twee).
            let begin = Date.now
            while iris.dot == nil && Date.now.timeIntervalSince(begin) < 0.3 { try? await Task.sleep(for: .milliseconds(16)) }
            guard iris.dot != nil else {
                withAnimation(.easeOut(duration: 0.35)) { red = false }
                return
            }
            let duration = 0.7 * slow
            withAnimation(.timingCurve(0.6, 0, 0.2, 1, duration: duration)) { closed = true }
            withAnimation(.easeOut(duration: duration * 0.35)) { dotGone = true }
            try? await Task.sleep(for: .seconds(duration * 0.6))
            withAnimation(.easeInOut(duration: duration * 0.4)) { tinted = true }
            // Een tiende langer dan de curve, zoals bij het opstarten: anders springt de punt op het eind.
            try? await Task.sleep(for: .seconds(duration * 0.4 + 0.1))
            red = false
        }
    }

    // Terug naar de intro: de iris andersom, het rood gaat weer open uit de punt. De zon komt opnieuw op.
    private func backToIntro() {
        introSince = nil
        defer { Task { introSince = .now } }
        guard !still, iris.dot != nil else {
            closed = false
            tinted = false
            dotGone = false
            withAnimation(.easeOut(duration: 0.35)) { red = true }
            Task {
                try? await Task.sleep(for: .seconds(0.35))
                step = .intro
            }
            return
        }
        var instant = Transaction()
        instant.disablesAnimations = true
        withTransaction(instant) {
            closed = true
            tinted = true
            dotGone = true
            red = true
        }
        let duration = 0.7 * slow
        Task {
            try? await Task.sleep(for: .milliseconds(32)) // eerst gesloten in beeld
            withAnimation(.timingCurve(0.8, 0, 0.4, 1, duration: duration)) { closed = false }
            withAnimation(.easeInOut(duration: duration * 0.4)) { tinted = false }
            try? await Task.sleep(for: .seconds(duration * 0.65))
            withAnimation(.easeIn(duration: duration * 0.35)) { dotGone = false }
            try? await Task.sleep(for: .seconds(duration * 0.35 + 0.05))
            step = .intro
        }
    }

    // De schijf van de iris, in schermcoördinaten: schermvullend, of zo groot als de punt op papier.
    // Als op het web (irisKeyframes) en bij het opstarten (SplashView.iris): het middelpunt staat vast op
    // de punt en alleen de straal beweegt (IrisCircle). De schijf schuift dus nooit naar de punt toe.
    private func disc(_ color: Color) -> some View {
        GeometryReader { geo in
            let frame = geo.frame(in: .global)
            let shape = Self.irisShape(size: geo.size, dot: iris.dot, origin: frame.origin, closed: closed)
            IrisCircle(center: shape.center, radius: shape.radius).fill(color)
        }
        .ignoresSafeArea()
    }

    // Middelpunt en straal van de iris (lokale coördinaten). Met een punt ligt het middelpunt er vanaf
    // het eerste beeld op en is open de straal de diagonaal van het scherm, dicht de straal van de punt.
    static func irisShape(size: CGSize, dot: CGRect?, origin: CGPoint, closed: Bool) -> (center: CGPoint, radius: CGFloat) {
        SplashView.iris(size: size, target: dot?.offsetBy(dx: -origin.x, dy: -origin.y), closed: closed)
    }

    // ---- 1. De rode intro ----

    // Merkrood, alles erop papier (ook in donker). Het rood is de schijf van de iris. Eén knop: Begin.
    private var introStep: some View {
        VStack(spacing: 0) {
            topRow(onRed: true)
            Spacer(minLength: 0)
            VStack(spacing: Space.s4) {
                OnboardingArt(kind: .intro, onRed: true, active: step == .intro, since: introSince)
                Text("Minder scrollen.\nMeer lezen.")
                    .font(.kop(size: min(hero, 56)))
                    .tracking(-0.8)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityFocused($headFocus)
                Text("Het nieuws van jouw bronnen,\nrustig op een rij.")
                    .zin() // zoals .ob__lede op het web
                    .opacity(0.85)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, Space.s5)
            Spacer(minLength: 0)
            ctaButton("Begin", onRed: true, off: false) { go(.uitleg) }
                .dynamicTypeSize(...DynamicTypeSize.accessibility1)
                .padding(.horizontal, Space.s4)
                .padding(.top, Space.s3)
                .padding(.bottom, Space.s3 + Space.tap + Space.s1) // de knop op dezelfde hoogte als op papier
        }
        .column()
        .foregroundStyle(Self.paperWhite)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background { disc(tinted ? Theme.accent : Theme.brandRed) }
        .mask { disc(.black) }
        .compositingGroup() // vervagen als één vlak (Verminder beweging), zonder rood door de letters
        .allowsHitTesting(step == .intro)
    }

    // ---- De papieren schermen ----

    private var paperStep: some View {
        VStack(spacing: 0) {
            topRow(onRed: false)
            ScrollView {
                Group {
                    switch step {
                    case .uitleg: uitleg
                    case .bronnen: bronnen
                    default: interessesView
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Space.s4)
                .padding(.top, Space.s2)
                .padding(.bottom, Space.s6)
                .opacity(fade)
            }
            .id(step) // elk scherm bovenaan
            .scrollDismissesKeyboard(.interactively)
            if step == .bronnen && !wide && !typeSize.isAccessibilitySize { peekBar } // bij heel grote tekst onder de lijst
            Rectangle().fill(Theme.rule).frame(height: 1)
            foot.opacity(fade)
        }
        .column()
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
        .foregroundStyle(Theme.ink)
        .background(Theme.paper.ignoresSafeArea())
    }

    // Bovenaan: het woordmerk links, op elke pagina op dezelfde plek; rechts Inloggen, Terug of Sluiten.
    private func topRow(onRed: Bool) -> some View {
        HStack {
            WelcomeMark(onRed: onRed, handoff: onRed ? brand : iris, hideDot: onRed && dotGone, breathes: onRed && !still && brand?.landed != false)
            Spacer(minLength: Space.s4)
            if onRed {
                Button("Inloggen") { login = true }
                    .font(.ui(.body, .semibold))
                    .accessibilityHint("Lezen kan ook zonder account.")
                    .frame(minHeight: Space.tap)
                    .contentShape(Rectangle())
            } else if again && step == .interesses {
                Button("Sluiten") { onCancel?() }
                    .font(.ui(.body, .semibold))
                    .accessibilityHint("Er verandert niets.")
                    .frame(minHeight: Space.tap)
                    .contentShape(Rectangle())
            } else {
                Button(action: back) {
                    HStack(spacing: Space.s1) {
                        Image(systemName: "chevron.left").font(.body.weight(.semibold))
                        Text("Terug")
                    }
                    .font(.ui(.body))
                    .frame(minHeight: Space.tap)
                    .contentShape(Rectangle())
                }
            }
        }
        .buttonStyle(.plain)
        .foregroundStyle(onRed ? Self.paperWhite : Theme.ink)
        .frame(height: Space.tap)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1) // de bovenregel blijft één regel
        .padding(.horizontal, Space.s4)
        .padding(.top, onCancel != nil ? Space.s2 : 0) // in een blad: even lucht onder de rand
    }

    // De kop en de zin eronder, op elk papieren scherm gelijk. Bij heel grote tekst begrensd (AX2 en
    // AX1), zodat een lang woord als "interesseert" heel blijft en de inhoud eronder in beeld komt;
    // `compact` laat de zin dan weg (de bronnen: de lijst moet boven de knoppen te zien zijn).
    private func heading(_ title: String, _ sub: String, compact: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Kop(title.replacingOccurrences(of: "?", with: "\u{2060}?"), .title) // het vraagteken blijft bij zijn woord; een te lang woord breekt met een streepje
                .tracking(-0.4)
                .fixedSize(horizontal: false, vertical: true)
                .dynamicTypeSize(...DynamicTypeSize.accessibility2)
                .accessibilityLabel(title)
                .accessibilityAddTraits(.isHeader)
                .accessibilityFocused($headFocus)
            if !(compact && typeSize.isAccessibilitySize) {
                Text(sub)
                    .zin() // zoals .ob__sub
                    .foregroundStyle(Theme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
            }
        }
    }

    // ---- 2. Zo werkt Hoot ----

    private static let trio: [(art: OnboardingArt.Kind, title: String, text: String)] = [
        (.editie, "Editie", "Drie keer per dag hooguit tien verhalen. Dan ben je bij."),
        (.stroom, "Stroom", "Alles van je bronnen, nieuwste eerst."),
        (.selectie, "Selectie", "Eén keer per week het beste over wat jou bezighoudt."),
    ]

    private var uitleg: some View {
        VStack(alignment: .leading, spacing: 0) {
            heading("Zo werkt Hoot", "Drie manieren om bij te blijven. Jij kiest de bronnen.")
            Rectangle().fill(Theme.ink).frame(height: 2).padding(.top, Space.s5)
            ForEach(Self.trio, id: \.title) { t in
                let art = OnboardingArt(kind: t.art, active: step == .uitleg, scale: min(trioArt, 120) / OnboardingArt.size.width)
                let words = VStack(alignment: .leading, spacing: Space.s1) {
                    Text(t.title)
                        .font(.kop(.title2))
                        .accessibilityAddTraits(.isHeader)
                    Text(t.text)
                        .zin() // zoals .ob__ttext
                        .foregroundStyle(Theme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Group {
                    if typeSize.isAccessibilitySize {
                        VStack(alignment: .leading, spacing: Space.s2) { art; words }
                    } else {
                        HStack(alignment: .center, spacing: Space.s4) { art; words }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, Space.s4)
                .accessibilityElement(children: .combine)
                Rectangle().fill(Theme.rule).frame(height: 1)
            }
        }
    }

    // ---- 3. Volg je bronnen ----

    private var bronnen: some View {
        HStack(alignment: .top, spacing: Space.s6) {
            VStack(alignment: .leading, spacing: 0) {
                heading("Volg je bronnen", "Kies wie je wilt lezen. Je Editie komt uit wat je volgt.", compact: true)
                searchField.padding(.top, Space.s5)
                    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
                Flow {
                    ChoiceChip(label: "Aanbevolen", on: !showFollowed && query.isEmpty) { showFollowed = false; query = "" }
                    ChoiceChip(label: mine.isEmpty ? "Gevolgd" : "Gevolgd · \(mine.count)", on: showFollowed && query.isEmpty) { showFollowed = true; query = "" }
                }
                .padding(.top, Space.s3)
                .dynamicTypeSize(...DynamicTypeSize.accessibility2)
                sourceList
                    .onChange(of: mine) { before, _ in freezeFolds(before: before) }
                    .task(id: "\(interests)|\(picked)|\(store.newsSources.count)") {
                        let next = try? await EditionEngine.shared.voorstel(sources: store.newsSources, interests: interests, topics: picked)
                        guard !Task.isCancelled else { return }
                        voorstel = next ?? nil
                        // De eerste keer staat het voorstel alvast aan (review G2), zolang je zelf nog niets koos.
                        fill()
                        if !again && !sourcesEdited && chosen != nil { chosen = (next ?? nil)?.map(\.id) ?? [] }
                    }
                if !wide && typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 0) {
                        Rectangle().fill(Theme.ink).frame(height: 2).padding(.bottom, Space.s3)
                        peek(bare: false)
                    }
                    .padding(.top, Space.s6)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if wide {
                VStack(alignment: .leading, spacing: 0) {
                    Rectangle().fill(Theme.ink).frame(height: 2).padding(.bottom, Space.s3)
                    peek(bare: false)
                }
                .frame(width: 256)
                .padding(.top, Space.s4)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Voorbeeld van je Editie")
            }
        }
    }

    private var searchField: some View {
        HStack(spacing: Space.s2) {
            Image(systemName: "magnifyingglass").foregroundStyle(Theme.ink3).accessibilityHidden(true)
            TextField("Zoek een bron", text: $query)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
                .accessibilityLabel("Zoek een bron")
            if !query.isEmpty {
                Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.ink3) }
                    .buttonStyle(.plain)
                    .frame(minWidth: Space.tap, minHeight: Space.tap)
                    .accessibilityLabel("Zoekterm wissen")
            }
        }
        .font(.ui(.body))
        .padding(.leading, Space.s4)
        .padding(.trailing, query.isEmpty ? Space.s4 : 0)
        .frame(minHeight: Space.tap)
        .background(Theme.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.edge, lineWidth: 1))
    }

    // Ontvolg je alles in een open categorie, dan blijft hij open: bij elke wijziging leggen we de stand vast
    // zoals hij vóór die wijziging was.
    private func freezeFolds(before: [String]) {
        let g = FollowList.groups(store.newsSources, interests, voorstel: voorstel)
        var groups: [(String, [Source])] = [("basis", g.basis), ("nl", g.kranten)]
        groups += g.blocks.map { ("b-\($0.id)", $0.sources) }
        groups += g.more.map { ("g-\($0.cat)", $0.sources) }
        for (id, list) in groups where fold[id] == nil { fold[id] = isOpen(id, list, in: before) }
    }

    @ViewBuilder private var sourceList: some View {
        let all = store.newsSources
        if chosen == nil || all.isEmpty {
            ProgressView("Bronnen laden…").padding(.top, Space.s5).frame(maxWidth: .infinity)
        } else if !query.trimmingCharacters(in: .whitespaces).isEmpty {
            let hits = FollowList.find(all, query)
            if hits.isEmpty {
                Text("Niets gevonden voor ‘\(query.trimmingCharacters(in: .whitespaces))’. Probeer een andere naam.")
                    .zin().foregroundStyle(Theme.ink2).padding(.top, Space.s5)
            } else {
                rows(hits).padding(.top, Space.s3)
            }
        } else if showFollowed {
            let list = FollowList.followed(all, mine)
            if list.isEmpty {
                Text(voorstel == nil ? "Je volgt nog niets. Begin bij de Basis." : "Je volgt nog niets. Begin bij het voorstel.")
                    .zin().foregroundStyle(Theme.ink2).padding(.top, Space.s5)
            } else {
                rows(list).padding(.top, Space.s3)
            }
        } else {
            let groups = FollowList.groups(all, interests, voorstel: voorstel)
            let start = groups.start
            let startOn = !start.isEmpty && start.allSatisfy { mine.contains($0.id) }
            let blocks = groups.blocks
            let rest = groups.more
            let restCount = rest.reduce(0) { $0 + $1.sources.count }
            let basis = groups.basis
            if !basis.isEmpty {
                foldGroup(id: "basis", title: voorstel == nil ? "Basis" : "Voorstel", list: basis, picks: Set(start.map(\.id)), count: false) {
                    if start.count > 1 {
                        Button(startOn ? "Alle \(FollowList.allWord(start.count)) gevolgd" : "Volg alle \(FollowList.allWord(start.count))") {
                            let ids = start.map(\.id)
                            sourcesEdited = true
                            chosen = startOn ? mine.filter { !ids.contains($0) } : mine + ids.filter { !mine.contains($0) }
                        }
                        .buttonStyle(.plain)
                        .font(typeSize.isAccessibilitySize ? .ui(.caption, .bold) : .ui(.subheadline, .bold)) // bij grote tekst niet groter dan de kop
                        .underline()
                        .lineLimit(1)
                        .fixedSize()
                        .frame(minHeight: Space.tap)
                        .padding(.leading, Space.s3)
                        .accessibilityAddTraits(startOn ? .isSelected : [])
                    }
                }
            }
            if voorstel != nil && !again && !sourcesEdited && startOn {
                Text("Alvast gevolgd. Uitzetten kan met één tik.")
                    .font(.ui(.footnote)).foregroundStyle(Theme.ink3)
                    .padding(.top, Space.s2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if !groups.kranten.isEmpty {
                foldGroup(id: "nl", title: "Nederlands nieuws", list: groups.kranten) { EmptyView() }
            }
            ForEach(blocks, id: \.id) { b in
                foldGroup(id: "b-\(b.id)", title: b.label, list: b.sources, picks: Set([b.pick].compactMap { $0 })) { EmptyView() }
            }
            if restCount > 0 {
                if more {
                    ForEach(rest, id: \.cat) { g in
                        foldGroup(id: "g-\(g.cat)", title: g.label, list: g.sources) { EmptyView() }
                    }
                } else {
                    Button { more = true } label: {
                        sectionHead("Meer bronnen") {
                            Text("Toon \(restCount)").font(.ui(.subheadline, .bold)).underline()
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityValue("Dicht")
                }
            }
        }
    }

    // Is deze categorie open? Wat jij koos, anders de beginstand (de Basis, of er staat al iets gevolgd in).
    private func isOpen(_ id: String, _ list: [Source], in followed: [String]) -> Bool {
        fold[id] ?? FollowList.startsOpen(id, chosen: FollowList.chosenIn(list, followed))
    }

    // Een inklapbare categorie (1.1.1, gelijk aan Fold in src/views/Welcome.jsx): de kop is een knop met de
    // naam, het aantal gekozen bronnen en een pijl (dicht naar rechts, open omlaag); ingeklapt alleen de kop.
    // `action`: een knop naast de kop (Volg alle drie in de Basis).
    @ViewBuilder private func foldGroup<Action: View>(id: String, title: String, list: [Source], picks: Set<String> = [], count: Bool = true, @ViewBuilder action: () -> Action) -> some View {
        let open = isOpen(id, list, in: mine)
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 0) {
                Button {
                    withAnimation(still ? nil : .easeOut(duration: 0.2)) { fold[id] = !open }
                } label: {
                    HStack(alignment: .center, spacing: Space.s2) {
                        GroupTitle(text: title, tone: Theme.ink)
                        Spacer(minLength: Space.s2)
                        if count { // niet bij de Basis of het voorstel: daar staat "Volg alle …" al (Alex, ronde 2)
                            Text(FollowList.foldCount(FollowList.chosenIn(list, mine), list.count))
                                .font(.ui(.subheadline, .semibold)).foregroundStyle(Theme.ink3).monospacedDigit()
                                .lineLimit(1)
                        }
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.ink3)
                            .rotationEffect(.degrees(open ? 90 : 0))
                            .accessibilityHidden(true)
                    }
                    .frame(minHeight: Space.tap)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityValue(open ? "Open" : "Dicht")
                .accessibilityHint(open ? "Klapt \(title) in" : "Toont de bronnen van \(title)")
                action()
            }
            .dynamicTypeSize(...DynamicTypeSize.accessibility1) // de kop en "Volg alle drie" breken niet af
            Rectangle().fill(Theme.ink).frame(height: 2)
        }
        .padding(.top, Space.s5)
        if open { rows(list, picks: picks) }
    }

    private func section<Trailing: View>(_ title: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        sectionHead(title, trailing: trailing)
    }

    // Een rubriekkop zoals op het web: kapitalen links, rechts een aantal of een actie, een dikke lijn eronder.
    private func sectionHead<Trailing: View>(_ title: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: Space.s3) {
                GroupTitle(text: title, tone: Theme.ink)
                Spacer(minLength: Space.s2)
                trailing()
            }
            .frame(minHeight: Space.tap)
            .dynamicTypeSize(...DynamicTypeSize.accessibility1) // de kop en "Volg alle drie" breken niet af
            Rectangle().fill(Theme.ink).frame(height: 2)
        }
        .padding(.top, Space.s5)
        .contentShape(Rectangle())
    }

    private func rows(_ list: [Source], picks: Set<String> = []) -> some View {
        LazyVStack(spacing: 0) {
            ForEach(list) { s in
                sourceRow(s, pick: picks.contains(s.id))
                Rectangle().fill(Theme.rule).frame(height: 1)
            }
        }
    }

    // Eén bron: logo 40, naam, omschrijving, gratis (of de gratis aanrader van zijn blok) of
    // abonnement; rechts Volg of Volgend. Alles in inkt: geen rood in de lijst. Bij grote tekst staat
    // de knop onder de tekst.
    private func sourceRow(_ s: Source, pick: Bool = false) -> some View {
        let stacked = typeSize >= .xxxLarge
        return HStack(alignment: stacked ? .top : .center, spacing: Space.s4) {
            SourceAvatar(source: s, size: 40)
            VStack(alignment: .leading, spacing: Space.s0) {
                Text(s.name).font(.ui(.headline))
                if let about = s.about, !typeSize.isAccessibilitySize { Text(about).font(.ui(.subheadline)).foregroundStyle(Theme.ink2).lineLimit(stacked ? 2 : nil).fixedSize(horizontal: false, vertical: true) } // bij grote tekst twee regels: de Volg-knop blijft boven de voet
                let why = voorstel?.first { $0.id == s.id }?.why
                Text((why.map { "\($0) · " } ?? "") + (s.paid == true ? "Abonnement" : pick && why == nil ? "Gratis aanrader" : "Gratis") + (s.lang == "en" ? " · Engels" : ""))
                    .font(.ui(.caption, .semibold))
                    .foregroundStyle(Theme.ink3)
                if stacked { followButton(s).padding(.top, Space.s2) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if !stacked { followButton(s) }
        }
        .padding(.vertical, Space.s3)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2) // bij AX5 staat de eerste Volg-knop nog boven de voet
    }

    // Volg (inkt) of Volgend (stil, met vinkje): één vorm, gelijk aan .ob__follow op het web.
    private func followButton(_ s: Source) -> some View {
        let on = mine.contains(s.id)
        return Button {
            sourcesEdited = true
            withAnimation(still ? nil : .easeOut(duration: 0.14)) { chosen = toggled(mine, s.id) }
        } label: {
            HStack(spacing: Space.s1) {
                if on { Image(systemName: "checkmark").font(.caption.weight(.heavy)).accessibilityHidden(true) }
                Text(on ? "Volgend" : "Volg")
            }
            .font(.ui(.subheadline, .heavy))
            .foregroundStyle(FollowPill.label(on: on, nacht: nacht))
            .padding(.horizontal, Space.s4)
            .frame(minWidth: 104, minHeight: Space.tap)
            .background(FollowPill.fill(on: on, nacht: nacht), in: Capsule())
            .overlay(Capsule().strokeBorder(FollowPill.edge(on: on, nacht: nacht), lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(ChoicePress())
        .accessibilityLabel("\(s.name) \(on ? "volgend" : "volgen")")
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    // Het meegroeiende voorbeeld: de nieuwste kop van elke bron die je volgt (echte koppen).
    @ViewBuilder private func peek(bare: Bool) -> some View {
        let lines = FollowList.preview(Array(store.itemsById.values), store.newsSources, mine)
        VStack(alignment: .leading, spacing: 0) {
            if !bare {
                GroupTitle(text: "Voorbeeld")
                Text("Zo ziet je Editie eruit")
                    .font(.kop(.headline))
                    .padding(.top, Space.s1)
            }
            if lines.isEmpty {
                Text("Uit \(FollowList.sourceLine((mine.isEmpty ? FollowList.freeStart(store.newsSources) : FollowList.followed(store.newsSources, mine)).map(\.name))).")
                    .font(.ui(.footnote)).foregroundStyle(Theme.hint).padding(.top, Space.s2)
            } else {
                ForEach(Array(lines.enumerated()), id: \.element.id) { i, l in
                    HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                        Text("\(i + 1)").font(.kop(.body)).foregroundStyle(Theme.ink3).frame(width: 20, alignment: .leading)
                        VStack(alignment: .leading, spacing: Space.s0) {
                            Text(l.title).font(.leesVet(.body)).fixedSize(horizontal: false, vertical: true)
                            Text(l.source).font(.ui(.footnote)).foregroundStyle(Theme.hint)
                        }
                    }
                    .padding(.vertical, Space.s2)
                    .accessibilityElement(children: .combine)
                    if i < lines.count - 1 { Rectangle().fill(Theme.rule).frame(height: 1) }
                }
                // Review G1: volg je meer bronnen dan er koppen staan, dan zegt het voorbeeld dat ook (gelijk aan Peek op het web).
                let shown = Set(lines.map(\.source))
                let missing = lines.count < 4 ? FollowList.followed(store.newsSources, mine).map(\.name).filter { !shown.contains($0) } : []
                if !mine.isEmpty && !missing.isEmpty {
                    Text("Ook uit \(FollowList.sourceLine(missing)).").font(.ui(.footnote)).foregroundStyle(Theme.hint).padding(.top, Space.s2)
                }
            }
            if mine.isEmpty {
                Text("Je volgt nog niets; dit is het gratis begin.").font(.ui(.footnote)).foregroundStyle(Theme.hint).padding(.top, Space.s2)
            }
        }
    }

    // Op een smal scherm: het voorbeeld in een uitklapbalk boven de knop.
    private var peekBar: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Theme.rule).frame(height: 1)
            Button {
                peekOpen.toggle() // zonder beweging: de lijst erboven krimpt, er schuift niets over elkaar
            } label: {
                HStack(spacing: Space.s3) {
                    VStack(alignment: .leading, spacing: Space.s0) {
                        Text("Zo ziet je Editie eruit").font(.kop(.body))
                        Text(mine.isEmpty ? "Gratis begin" : "Uit \(FollowList.sourceLine(FollowList.followed(store.newsSources, mine).map(\.name)))")
                            .font(.ui(.footnote)).foregroundStyle(Theme.hint).lineLimit(2)
                    }
                    Spacer(minLength: Space.s2)
                    Image(systemName: peekOpen ? "chevron.up" : "chevron.down").font(.footnote.weight(.semibold)).accessibilityHidden(true)
                }
                .frame(maxWidth: .infinity, minHeight: Space.tap, alignment: .leading)
                .padding(.vertical, Space.s2)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue(peekOpen ? "Open" : "Dicht")
            if peekOpen {
                ScrollView { peek(bare: true).frame(maxWidth: .infinity, alignment: .leading).padding(.bottom, Space.s3) }
                    .frame(maxHeight: 260)
                    .fixedSize(horizontal: false, vertical: true) // zo hoog als het voorbeeld, hooguit 260
            }
        }
        .padding(.horizontal, Space.s4)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
    }

    // ---- 4. Wat interesseert je? ----

    private var interessesView: some View {
        VStack(alignment: .leading, spacing: 0) {
            heading("Wat interesseert je?", "Dit worden je tabs in de Stroom. Daarna kies je je bronnen.")
            Flow {
                ForEach(Rubriek.alle) { r in
                    ChoiceChip(label: r.label, on: interests.contains(r.id)) { interests = toggled(interests, r.id) }
                }
            }
            .padding(.top, Space.s5)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Rubrieken")
            VStack(spacing: 0) {
                Rectangle().fill(Theme.rule).frame(height: 1)
                Button {
                    selOpen.toggle()
                } label: {
                    HStack(spacing: Space.s3) {
                        VStack(alignment: .leading, spacing: Space.s0) {
                            Text("Kies onderwerpen voor je Selectie").font(.ui(.body, .semibold)).fixedSize(horizontal: false, vertical: true)
                            Text(vak.isEmpty ? "Mag ook later" : "\(vak.count) gekozen").font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                        }
                        Spacer(minLength: Space.s2)
                        Image(systemName: selOpen ? "chevron.up" : "chevron.down").font(.footnote.weight(.semibold)).accessibilityHidden(true)
                    }
                    .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                    .padding(.vertical, Space.s2)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityValue(selOpen ? "Open" : "Dicht")
                Rectangle().fill(Theme.rule).frame(height: 1)
            }
            .padding(.top, Space.s6)
            if selOpen {
                Text("Eén keer per week het beste over je werk of hobby.")
                    .font(.ui(.subheadline)).foregroundStyle(Theme.ink2)
                    .padding(.top, Space.s4)
                ForEach(DigestFieldsList.domains, id: \.label) { d in
                    let fields = d.fields.filter { store.offersField($0.id) }
                    if !fields.isEmpty {
                        VStack(alignment: .leading, spacing: Space.s3) {
                            GroupTitle(text: d.label)
                            Flow {
                                ForEach(fields, id: \.id) { f in
                                    ChoiceChip(label: f.label, on: vak.contains(f.id)) { vak = toggled(vak, f.id) }
                                }
                            }
                        }
                        .padding(.top, Space.s5)
                    }
                }
            }
        }
    }

    // ---- De knoppen ----

    // Onderaan elk papieren scherm: (bij de bronnen) het aantal, één knop en eronder een stille link.
    // Altijd in beeld, en dus begrensd: bij de grootste tekst blijven ze op één regel.
    private var foot: some View {
        VStack(spacing: Space.s1) {
            switch step {
            case .uitleg:
                ctaButton("Kies je interesses", onRed: false, off: false) { go(.interesses) }
                linkButton("Liever meteen lezen", action: quickStart).disabled(store.newsSources.isEmpty)
            case .interesses:
                ctaButton("Verder", onRed: false, off: false) { go(.bronnen) }
                linkButton("Later kiezen", action: laterInterests)
            default:
                if !typeSize.isAccessibilitySize { // bij heel grote tekst staat het aantal al in "Gevolgd · n"
                    Text(store.newsSources.isEmpty ? "Bronnen laden…" : FollowList.line(mine.count))
                        .font(.ui(.footnote)).foregroundStyle(Theme.hint)
                        .accessibilityAddTraits(.updatesFrequently)
                }
                // Review G3: de knop is nooit dood. Volg je niets, dan begin je met het gratis begin, en dat zegt hij.
                ctaButton(mine.isEmpty ? "Begin met het gratis begin" : "Naar je Editie", onRed: false, off: store.newsSources.isEmpty) {
                    if mine.isEmpty { chosen = FollowList.freeStart(store.newsSources).map(\.id) }
                    finish(interests: interests, vak: vak)
                }
                linkButton("Later kiezen", action: laterSources).disabled(store.newsSources.isEmpty)
            }
        }
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .padding(.horizontal, Space.s4)
        .padding(.top, Space.s3)
        .padding(.bottom, Space.s3)
    }

    private func ctaButton(_ label: String, onRed: Bool, off: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            ZStack {
                Capsule().fill(onRed ? Self.paperWhite : Theme.ink)
                Text(label)
                    .font(.ui(.headline, .heavy))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .foregroundStyle(onRed ? Theme.brandRed : Theme.paper)
                    .padding(.horizontal, Space.s4)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .contentShape(Capsule())
        }
        .buttonStyle(ChoicePress())
        .disabled(off)
        .opacity(off ? 0.4 : 1)
    }

    private func linkButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(label, action: action)
            .buttonStyle(.plain)
            .font(.ui(.subheadline, .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: Space.tap)
            .contentShape(Rectangle())
    }
}

// Volg je bronnen, als zuiver rekenwerk (getoetst in OnboardingTests), gelijk aan
// src/lib/follow-welcome.js: de Basis, de blokken per interesse, Meer bronnen, zoeken, de startset en
// het voorbeeld.
enum FollowList {
    static let freeStart = ["nos", "nu", "rtl"]
    static let sport = "sport"
    // Gelijk aan SOURCE_CATS in src/lib/topics.js.
    static let cats: [(id: String, label: String)] = [
        ("nl", "Nederland"), ("int", "Internationaal"), ("regio", "Regionaal"), ("vl", "Vlaanderen"), ("economie", "Economie"),
        ("tech", "Tech"), ("games", "Games"), ("wetenschap", "Wetenschap"), ("sport", "Sport"), ("cultuur", "Cultuur en muziek"),
    ]

    private static func byName(_ a: Source, _ b: Source) -> Bool { a.name.compare(b.name, locale: Locale(identifier: "nl")) == .orderedAscending }

    // Het gratis begin: de drie die bestaan en gratis zijn, in vaste volgorde.
    static func freeStart(_ sources: [Source]) -> [Source] {
        freeStart.compactMap { id in sources.first { $0.id == id && $0.paid != true } }
    }

    // Later kiezen en Liever meteen lezen: de startset (gratis, Nederlands, geen sport).
    @MainActor static func startIds(_ sources: [Source]) -> [String] {
        let free = Set(sources.filter { $0.paid != true }.map(\.id))
        return HootStore.starter.filter(free.contains)
    }

    // De Basis: het Nederlandse nieuws in het kort: het gratis begin voorop, dan de kranten als losse
    // rijen in vaste volgorde (gekozen, niet alfabetisch). De andere Nederlandse titels staan onder Meer bronnen.
    static let basisCat = "nl"
    static let basisKranten = ["volkskrant", "nrc", "trouw", "parool", "ad", "telegraaf"]
    static func basis(_ sources: [Source]) -> [Source] {
        let start = freeStart(sources)
        let taken = Set(start.map(\.id))
        return start + basisKranten.compactMap { id in sources.first { $0.id == id && !taken.contains($0.id) } }
    }

    // Bij een interesse horen de bronnen uit zijn rubrieken (Wereld krijgt er Internationaal bij), die
    // de catalogus ervoor aanraadt (`for`) en die van een van zijn onderwerpen (`forTopic`). Niet de Basis.
    private static let extraCats: [String: Set<String>] = ["wereld": ["int"]]
    static func fits(_ s: Source, _ r: Rubriek) -> Bool {
        guard s.cat != basisCat else { return false }
        let cats = r.cats.union(extraCats[r.id] ?? [])
        return cats.contains(s.cat ?? "") || (s.forInterests ?? []).contains(r.id) || s.forTopic.map(r.topics.contains) == true
    }

    // De gratis aanrader: gratis, liefst Nederlands en door de catalogus aangeraden (voor de interesse
    // zelf telt zwaarder dan voor een onderwerp). Gelijk aan freePick op het web.
    static func freePick(_ list: [Source], _ interest: String? = nil) -> Source? {
        func score(_ s: Source) -> Int { (s.lang == "nl" ? 4 : 0) + ((s.forInterests ?? []).contains(interest ?? "") ? 2 : 0) + (s.pick == true ? 1 : 0) }
        return list.filter { $0.paid != true }.sorted { score($0) != score($1) ? score($0) > score($1) : byName($0, $1) }.first
    }

    struct Block { let id: String; let label: String; let pick: String?; let sources: [Source] }

    // Per gekozen interesse (vaste volgorde) een blok: de gratis aanrader voorop, dan de rest op naam.
    // Elke bron staat één keer: in het eerste blok waar hij hoort. Zo heeft elk blok ook één aanrader.
    // `exclude`: wat al in het voorstel staat, komt niet nog eens in een blok (gelijk aan het web).
    static func blocks(_ sources: [Source], _ interests: [String], exclude: [String] = []) -> [Block] {
        var seen = Set<String>(exclude)
        return Rubriek.alle.filter { interests.contains($0.id) }.compactMap { r in
            let list = sources.filter { !seen.contains($0.id) && fits($0, r) }.sorted(by: byName)
            guard !list.isEmpty else { return nil }
            seen.formUnion(list.map(\.id))
            let pick = freePick(list, r.id)
            return Block(id: r.id, label: r.label, pick: pick?.id, sources: pick.map { p in [p] + list.filter { $0.id != p.id } } ?? list)
        }
    }

    // Meer bronnen (ingeklapt): wat niet in de Basis of een blok staat, per rubriek (ook de andere
    // Nederlandse titels); geen sport.
    static func more(_ sources: [Source], _ interests: [String], exclude: [String] = []) -> [(cat: String, label: String, sources: [Source])] {
        let shown = Set(exclude + basis(sources).map(\.id) + blocks(sources, interests, exclude: exclude).flatMap { $0.sources.map(\.id) })
        return groups(sources.filter { !shown.contains($0.id) && $0.cat != sport })
    }

    // Alle bronnen per rubriek, zonder het gratis begin; wat in geen rubriek valt als Overig achteraan.
    static func groups(_ sources: [Source]) -> [(cat: String, label: String, sources: [Source])] {
        let rest = sources.filter { !freeStart.contains($0.id) }
        let known = Set(cats.map(\.id))
        var out = cats.map { c in (cat: c.id, label: c.label, sources: rest.filter { $0.cat == c.id }.sorted(by: byName)) }
        out.append((cat: "overig", label: "Overig", sources: rest.filter { !known.contains($0.cat ?? "") }.sorted(by: byName)))
        return out.filter { !$0.sources.isEmpty }
    }

    // De groepen van de bronnenstap. Met een voorstel (shared/voorstel.mjs via HootCore): het voorstel bovenaan,
    // de kranten van de Basis als "Nederlands nieuws" eronder, en de blokken en Meer bronnen zonder wat al boven
    // staat. Zonder voorstel de vaste Basis, zoals het web (Bronnen in src/views/Welcome.jsx).
    struct Groups { var start: [Source]; var basis: [Source]; var kranten: [Source]; var blocks: [Block]; var more: [(cat: String, label: String, sources: [Source])] }
    static func groups(_ all: [Source], _ interests: [String], voorstel: [EditionEngine.VoorstelBron]?) -> Groups {
        guard let voorstel else {
            return Groups(start: freeStart(all), basis: basis(all), kranten: [], blocks: blocks(all, interests), more: more(all, interests))
        }
        let ids = voorstel.map(\.id)
        let start = ids.compactMap { id in all.first { $0.id == id } }
        let kranten = basis(all).filter { !ids.contains($0.id) }
        return Groups(start: start, basis: start, kranten: kranten, blocks: blocks(all, interests, exclude: ids), more: more(all, interests, exclude: ids + kranten.map(\.id)))
    }
    // "Volg alle drie" tot "Volg alle vijf".
    static func allWord(_ n: Int) -> String { n >= 2 && n <= 5 ? ["twee", "drie", "vier", "vijf"][n - 2] : "\(n)" }

    // Inklapbare categorieën (1.1.1, gelijk aan src/lib/follow-welcome.js): hoeveel je in een categorie volgt,
    // of hij bij het openen van de stap open staat (de Basis altijd, anders als je er iets in volgt) en wat de
    // kop rechts zegt ("2 van 8 gevolgd", of zonder keuze "8 bronnen").
    static func chosenIn(_ list: [Source], _ followed: [String]) -> Int { list.filter { followed.contains($0.id) }.count }
    static func startsOpen(_ id: String, chosen: Int) -> Bool { id == "basis" || chosen > 0 }
    static func foldCount(_ chosen: Int, _ total: Int) -> String { chosen > 0 ? "\(chosen) van \(total) gevolgd" : "\(total) \(total == 1 ? "bron" : "bronnen")" }

    // Zoeken op naam en omschrijving, in alle bronnen (ook sport: zoeken is een keuze).
    static func find(_ sources: [Source], _ query: String) -> [Source] {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return [] }
        return sources.filter { ($0.name + " " + ($0.about ?? "")).localizedCaseInsensitiveContains(q) }.sorted(by: byName)
    }

    // Wat je volgt, op volgorde van volgen.
    static func followed(_ sources: [Source], _ ids: [String]) -> [Source] {
        ids.compactMap { id in sources.first { $0.id == id } }
    }

    static func line(_ n: Int) -> String { n == 0 ? "Nog niets gevolgd" : "\(n) \(n == 1 ? "bron" : "bronnen") gevolgd" }

    // 'NOS', 'NOS en NU.nl', 'NOS, NU.nl en RTL Nieuws' of 'NOS, NU.nl en 3 meer' (sourceLine op het web).
    static func sourceLine(_ names: [String]) -> String {
        switch names.count {
        case 0: "Geen bronnen"
        case 1, 2: names.joined(separator: " en ")
        case 3: "\(names[0]), \(names[1]) en \(names[2])"
        default: "\(names[0]), \(names[1]) en \(names.count - 2) meer"
        }
    }

    struct Line: Identifiable, Equatable { let id: String; let title: String; let source: String }

    // Het voorbeeld: per gevolgde bron het nieuwste artikel, de nieuwste eerst; nog niets gevolgd: het gratis begin.
    static func preview(_ items: [Item], _ sources: [Source], _ followed: [String], max: Int = 4) -> [Line] {
        let ids = Set(followed.isEmpty ? freeStart : followed)
        var newest: [String: Item] = [:]
        for it in items where (it.kind ?? "article") == "article" && ids.contains(it.source) && !it.title.isEmpty {
            if let prev = newest[it.source], (prev.publishedAt ?? "") >= (it.publishedAt ?? "") { continue }
            newest[it.source] = it
        }
        let names = Dictionary(sources.map { ($0.id, $0.name) }, uniquingKeysWith: { a, _ in a })
        return newest.values
            .sorted { ($0.publishedAt ?? "") > ($1.publishedAt ?? "") }
            .prefix(max)
            .map { Line(id: $0.id, title: $0.title, source: names[$0.source] ?? $0.sourceName ?? $0.source) }
    }
}

// "hoot." klein linksboven in het welkom, als tekening (`BrandWord`) op 0,4 van het opstartscherm:
// 64 breed, de kleinste maat van het merk, net als in de Editie. Op merkrood alles papier, op papier
// inkt met de punt in accent. Op rood en op papier op precies dezelfde plek en maat: het opstartscherm
// landt erop, en de iris sluit tot de punt. Eén maat, ook bij grote tekst. Meldt waar woord en punt
// staan (`handoff`).
struct WelcomeMark: View {
    var onRed: Bool
    var handoff: BrandHandoff?
    var hideDot = false
    var breathes = false // de punt op rood ademt, pas als het opstartscherm weg is
    static let scale: CGFloat = 0.4

    var body: some View {
        BrandWord(scale: Self.scale, ink: onRed ? SplashView.paperWhite : Theme.ink, dot: onRed ? SplashView.paperWhite : Theme.accent, handoff: handoff, hideDot: hideDot, breathes: breathes)
        .onAppear { if onRed { handoff?.onRed = true } }
        .onDisappear {
            handoff?.word = nil
            handoff?.dot = nil
            if onRed { handoff?.onRed = false }
        }
        .accessibilityElement()
        .accessibilityLabel("Hoot")
    }
}


// Kleuren van de Volg-pil. In Nacht is inkt een licht vlak, te fel op zwart: daar, net als de hoofdknop
// (InkButtonStyle) en .btn in de Nacht-regels van src/styles.css, een gedempt vlak (inkt op 20 %) met de
// leesinkt als tekst. Volgend blijft stil: geen vlak, een haarlijn.
enum FollowPill {
    static func fill(on: Bool, nacht: Bool) -> Color { on ? .clear : (nacht ? Theme.ink.opacity(0.2) : Theme.ink) }
    static func label(on: Bool, nacht: Bool) -> Color { on || nacht ? Theme.ink : Theme.paper }
    static func edge(on: Bool, nacht: Bool) -> Color { on ? Theme.edge : fill(on: false, nacht: nacht) }
}
