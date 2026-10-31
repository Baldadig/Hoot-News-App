import SwiftUI

// Het welkom, zoals op de website (src/views/Welcome.jsx) en in het onboarding-plan: eerst vegen, dan
// één keer kiezen. Een rode intro met de zon in papier, dan de iris naar papier met drie pagina's
// (Editie, Stroom, Selectie, elk met een eigen zon), en pas op de laatste de knoppen. Daarna je
// interesses, Wat precies? op een eigen pagina met alle onderwerpen open (over te slaan), Je Hoot met
// het voorstel voor je bronnen (Aanpassen: Je bronnen) en je Selectie (Later kiezen: Je Selectie), en
// tot slot Een seintje?. Niets in het welkom scrolt: elke pagina past op één scherm, ook op de kleinste
// iPhone en bij grote tekst. Past iets niet, dan verdelen Wat precies?, Je bronnen en Je Selectie zich
// over meer pagina's (de maten volgen de tekstgrootte); een pagina scrolt alleen als er echt niets meer te splitsen is.
// "Liever meteen lezen" begint zonder vragen met gratis Nederlandse bronnen en zet geen vak.
// Het merk loopt erdoorheen: het opstartscherm landt op "hoot." linksboven op de rode intro (het rood
// blijft), en bij het eerste papier sluit het rood zich als een iris tot de punt van "hoot." op papier.
// Ook vanuit Instellingen (`reopen`: alles begint bij wat je nu hebt, sluiten slaat niets op) en na
// even rondkijken (`start: .interesses`, in een blad met Annuleer).
struct WelcomeView: View {
    enum Step: String { case intro, uitleg, interesses, precies, hoot, bronnen, selectie, seintje }

    var reopen = false
    var start: Step = .intro
    var onCancel: (() -> Void)? = nil
    var onDone: () -> Void

    @Environment(HootStore.self) private var store
    @Environment(EditionAlerts.self) private var alerts
    @Environment(\.brandHandoff) private var brand // van het opstartscherm (HootApp)
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .largeTitle) private var hero: CGFloat = 38

    @State private var step: Step
    @State private var page = 0 // de uitleg: 0 Editie, 1 Stroom, 2 Selectie (de rode intro is pagina 1 van 4)
    @State private var subpage = 0 // de subpagina van Wat precies?, Je bronnen en Je Selectie
    @State private var offered: [String] = [] // Je bronnen: het voorstel eerst, dan wat verder past; de volgorde ligt vast
    @State private var rowH: [String: CGFloat] = [:] // Je bronnen: hoe hoog elke rij is (gemeten)
    @State private var interests: [String] = []
    @State private var picked: [String] = [] // Wat precies?: wat je aantikte; niets = alles binnen die interesse
    @State private var chosen: [String]? // bronnen: het voorstel, pas ingevuld als je bij die pagina komt en ze er zijn
    @State private var vak: [String] = [] // de eerste keer leeg: een nieuwe lezer kiest zijn vak zelf, of later
    @State private var prepared = false
    @State private var asksAlert: Bool? // vast bij binnenkomst: dan verspringt er niets
    @State private var asking = false
    @State private var alertShown = false
    @State private var login = false
    @State private var width: CGFloat = 0
    @State private var roomH: CGFloat = 0 // de ruimte voor de pagina zelf (zonder knoppen)
    @State private var headH: CGFloat = 0 // kop en uitleg van de pagina
    @State private var contentH: CGFloat = 0
    @State private var fade = 1.0 // wisselen tussen papieren pagina's
    @State private var turning = false // midden in zo'n wissel: een tweede tik telt niet (anders sla je een pagina over)
    @State private var introSince: Date? // sinds wanneer de zon op de rode intro opkomt
    @AccessibilityFocusState private var headFocus: Bool

    // De iris: het rood ligt over de eerste papieren pagina en sluit tot de punt van het woordmerk daar.
    @State private var iris = BrandHandoff()
    @State private var red: Bool // de rode intro ligt erbovenop
    @State private var closed = false // het rood is gesloten tot de punt
    @State private var tinted = false // het rood kleurt naar de punt (in donker koraal)
    @State private var dotGone = false // de papieren punt op het rood is opgegaan in het rood

    init(reopen: Bool = false, start: Step = .intro, onCancel: (() -> Void)? = nil, onDone: @escaping () -> Void) {
        var first = start
        var firstPage = 0
        #if DEBUG
        // `-HootWelcomeStep uitleg2|interesses|precies|hoot|bronnen|selectie|seintje`
        if first == .intro, let name = DebugLaunch.welcomeStep {
            switch name {
            case "uitleg", "uitleg1": first = .uitleg
            case "uitleg2": first = .uitleg; firstPage = 1
            case "uitleg3": first = .uitleg; firstPage = 2
            default: if let s = Step(rawValue: name) { first = s }
            }
        }
        #endif
        self.reopen = reopen
        self.start = first
        self.onCancel = onCancel
        self.onDone = onDone
        _step = State(initialValue: first)
        _page = State(initialValue: firstPage)
        _red = State(initialValue: first == .intro)
    }

    // Na even rondkijken, in een blad: zonder intro, en Annuleer op de eerste pagina.
    private var inSheet: Bool { onCancel != nil && !reopen }
    private var asks: Bool { asksAlert ?? (start == .seintje || (alerts.permission == .notDetermined && !store.notify)) }
    private var topics: [String] { Rubriek.resolve(interests, picked: picked) }
    private var slow: Double { DebugLaunch.slow } // `-HootSlowSplash 6`: ook de iris in slow motion
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
        .task {
            await alerts.refresh()
            if asksAlert == nil { asksAlert = start == .seintje || (alerts.permission == .notDetermined && !store.notify) }
        }
        .task { await store.loadDigest() } // welke onderwerpen de Selectie heeft
        .onChange(of: store.newsSources.count) { fill() }
        .onChange(of: step) {
            fill()
            offerSources()
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
        if reopen {
            interests = store.interests
            picked = Rubriek.picked(from: store.topics, interests: store.interests)
            vak = store.digestFields
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

    // Het voorstel voor je bronnen, zodra ze er zijn: opnieuw kiezen begint bij wat je volgt, de eerste
    // keer bij wat bij je interesses past (alleen gratis, Nederlands eerst).
    private func fill() {
        guard !store.newsSources.isEmpty, [.hoot, .bronnen, .selectie, .seintje].contains(step), chosen == nil else { return }
        chosen = reopen ? store.followed.map(\.id) : store.suggested(interests: interests)
        offerSources()
    }

    // Je bronnen: wat nu aan staat eerst, dan wat verder bij je interesses past. Eén keer, zodat een bron die je
    // uitzet op zijn plek blijft staan.
    private func offerSources() {
        guard offered.isEmpty, let chosen, !store.newsSources.isEmpty, step == .bronnen else { return }
        var ids = chosen
        for id in HootStore.always + store.alsoSuggested(interests: interests) where !ids.contains(id) && store.source(id) != nil { ids.append(id) }
        offered = ids
    }

    private func toggled(_ list: [String], _ id: String) -> [String] { list.contains(id) ? list.filter { $0 != id } : list + [id] }

    // Klaar met kiezen: je interesses, onderwerpen, bronnen en vak worden je instellingen.
    private func apply() {
        store.applyWelcome(interests: interests, topics: topics, sources: chosen ?? store.suggested(interests: interests), shown: store.newsSources, vak: vak)
    }

    private func primary() {
        switch step {
        case .intro: enterPaper(0)
        case .uitleg: go(.interesses)
        case .interesses:
            // Opnieuw kiezen: wat je volgt (en wat je hier al aan- of uitzette). Eerste keer: opnieuw
            // voorstellen, want je interesses kunnen veranderd zijn.
            if !reopen { chosen = nil }
            offered = []
            subpage = 0
            go(.precies)
        case .precies:
            if subpage + 1 < subCount { turn { subpage += 1 } } else { go(.hoot) }
        case .bronnen, .selectie:
            if subpage + 1 < subCount { turn { subpage += 1 } } else { go(.hoot) }
        case .hoot:
            apply()
            if asks { go(.seintje) } else { onDone() }
        case .seintje:
            asking = true
            Task {
                if await alerts.ask() {
                    store.notifySlots = EditionAlerts.slots.map(\.id)
                    store.notify = true
                }
                onDone()
            }
        }
    }

    private func back() {
        switch step {
        case .interesses: page = 2; go(.uitleg)
        case .precies:
            if subpage > 0 { turn { subpage -= 1 } } else { go(.interesses) }
        case .bronnen, .selectie:
            if subpage > 0 { turn { subpage -= 1 } } else { go(.hoot) }
        case .hoot: subpage = max(0, subCountOf(.precies) - 1); go(.precies)
        case .seintje: go(.hoot)
        case .intro, .uitleg: break
        }
    }

    // ---- Overgangen ----

    private func go(_ next: Step) {
        if step == .intro { leaveIntro(to: next); return }
        if next == .intro { backToIntro(); return }
        // Tussen papieren pagina's: even uit en weer in (0,2 s).
        turn { step = next }
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

    // Van de rode intro naar uitleg-pagina `pg` (de iris).
    private func enterPaper(_ pg: Int) {
        page = pg
        leaveIntro(to: .uitleg)
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
    private func disc(_ color: Color) -> some View {
        GeometryReader { geo in
            let frame = geo.frame(in: .global)
            let full = hypot(geo.size.width, geo.size.height) * 1.1
            let target = closed ? iris.dot : nil
            Circle()
                .fill(color)
                .frame(width: target?.width ?? full, height: target?.height ?? full)
                .position(target.map { CGPoint(x: $0.midX - frame.minX, y: $0.midY - frame.minY) } ?? CGPoint(x: geo.size.width / 2, y: geo.size.height / 2))
        }
        .ignoresSafeArea()
    }

    // ---- De rode intro en de uitleg ----

    private static let pages: [(art: OnboardingArt.Kind, head: String, text: String)] = [
        (.editie, "Je Editie", "Drie keer per dag tien verhalen.\nDan ben je bij."),
        (.stroom, "De Stroom", "Alles van je bronnen, nieuwste eerst."),
        (.selectie, "Je Selectie", "Eén keer per week bijgepraat\nover wat jou bezighoudt."),
    ]

    // De rode intro, pagina 1 van 4: merkrood, alles erop papier (ook in donker). Het rood is de schijf
    // van de iris. Geen knoppen: veeg naar links (of tik op Veeg verder).
    private var introStep: some View {
        VStack(spacing: 0) {
            topRow(onRed: true)
            Spacer(minLength: 0)
            VStack(spacing: Space.s4) {
                OnboardingArt(kind: .intro, onRed: true, active: step == .intro, since: introSince)
                Text("Minder scrollen.\nMeer lezen.")
                    .font(.system(size: min(hero, 56), weight: .heavy, design: .serif))
                    .tracking(-0.8)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityFocused($headFocus)
                Text("Het nieuws van jouw bronnen,\nrustig op een rij.")
                    .font(.body)
                    .opacity(0.85)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, Space.s5)
            Spacer(minLength: 0)
            pagerFoot(current: 0, onRed: true)
        }
        .column()
        .foregroundStyle(Self.paperWhite)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background { disc(tinted ? Theme.accent : Theme.brandRed) }
        .mask { disc(.black) }
        .compositingGroup() // vervagen als één vlak (Verminder beweging), zonder rood door de letters
        .contentShape(Rectangle())
        .gesture(DragGesture(minimumDistance: 24).onEnded { v in
            if v.translation.width < -60, abs(v.translation.height) < 80 { enterPaper(0) }
        })
        .allowsHitTesting(step == .intro)
    }

    // De drie papieren pagina's van de uitleg: veeg door, links terug naar het rood.
    private var pager: some View {
        TabView(selection: $page) {
            ForEach(0 ..< 3, id: \.self) { i in
                VStack(spacing: Space.s4) {
                    Spacer(minLength: 0)
                    OnboardingArt(kind: Self.pages[i].art, active: step == .uitleg && page == i)
                    Text(Self.pages[i].head)
                        .font(.system(size: min(hero, 56), weight: .heavy, design: .serif))
                        .tracking(-0.8)
                        .multilineTextAlignment(.center)
                        .accessibilityAddTraits(.isHeader)
                    Text(Self.pages[i].text)
                        .font(.body)
                        .foregroundStyle(Theme.ink2)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, Space.s5)
                .tag(i)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .simultaneousGesture(DragGesture(minimumDistance: 30).onEnded { v in
            if page == 0, v.translation.width > 70, abs(v.translation.height) < 80 { go(.intro) }
        })
    }

    // Onder de uitleg: de bolletjes en een vast vak. Veeg verder, en op de laatste pagina de twee
    // knoppen (dekking, 0,2 s): het vak heeft een vaste hoogte, dus niets verspringt.
    private func pagerFoot(current: Int, onRed: Bool) -> some View {
        let last = !onRed && current == 2
        let ink = onRed ? Self.paperWhite : Theme.ink
        return VStack(spacing: Space.s2) {
            HStack(spacing: 0) {
                ForEach(0 ..< 4, id: \.self) { i in
                    let here = i == (onRed ? 0 : min(current, 2) + 1)
                    Button { dotTapped(i) } label: {
                        Circle().fill(ink.opacity(here ? 1 : 0.28)).frame(width: 8, height: 8)
                            .frame(width: 28, height: Space.tap)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Pagina \(i + 1) van 4")
                    .accessibilityAddTraits(here ? .isSelected : [])
                }
            }
            ZStack(alignment: .top) {
                Button {
                    if onRed { enterPaper(0) } else { turn { page = min(page + 1, 2) } }
                } label: {
                    HStack(spacing: Space.s1) {
                        Text("Veeg verder").underline()
                        Image(systemName: "arrow.right").font(.footnote.weight(.semibold)).accessibilityHidden(true)
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(ink.opacity(0.85))
                    .frame(minHeight: Space.tap)
                    .padding(.horizontal, Space.s4)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .opacity(last ? 0 : 1)
                .allowsHitTesting(!last)
                .accessibilityHidden(last)
                VStack(spacing: Space.s1) {
                    ctaButton("Stel je Hoot samen", onRed: false, off: false, action: { go(.interesses) })
                    linkButton(reopen ? "Sluiten zonder opslaan" : "Liever meteen lezen", action: reopen ? { onCancel?() } : quickStart)
                }
                .opacity(last ? 1 : 0)
                .allowsHitTesting(last)
                .accessibilityHidden(!last)
            }
            .frame(height: Self.footH)
            .animation(still ? nil : .easeOut(duration: 0.2), value: last)
        }
        .padding(.horizontal, Space.s4)
        .padding(.bottom, Space.s2)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    }

    private func dotTapped(_ i: Int) {
        if step == .intro {
            if i > 0 { enterPaper(i - 1) }
        } else if i == 0 {
            go(.intro)
        } else {
            turn { page = i - 1 }
        }
    }

    // "Liever meteen lezen": zonder vragen een goed begin met gratis Nederlandse bronnen, en geen vak.
    private func quickStart() {
        store.quickStart()
        onDone()
    }

    // De knoppen onderaan: een vaste hoogte (knop 52, lucht, link 44), zodat niets verspringt.
    private static let footH: CGFloat = 52 + Space.s1 + Space.tap

    // ---- De papieren pagina's ----

    private var paperStep: some View {
        VStack(spacing: 0) {
            topRow(onRed: false)
            if step == .uitleg {
                pager.opacity(fade)
                pagerFoot(current: page, onRed: false).opacity(fade)
            } else {
                choicePage
                choiceFoot.opacity(fade)
            }
        }
        .column()
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
        .foregroundStyle(Theme.ink)
        .background(Theme.paper.ignoresSafeArea())
    }

    // Een keuzepagina: kop, uitleg en de keuzes. Past op één scherm; alleen als dat echt niet kan
    // (heel grote tekst) scrolt hij.
    private var choicePage: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: Space.s2) {
                    HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
                        Text(title)
                            .font(.system(.title, design: .serif, weight: .heavy))
                            .tracking(-0.4)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader)
                            .accessibilityFocused($headFocus)
                        Spacer(minLength: 0)
                        if subCount > 1 {
                            Text("\(subpage + 1) van \(subCount)")
                                .font(.subheadline)
                                .foregroundStyle(Theme.ink3)
                                .monospacedDigit()
                        }
                    }
                    Text(sub)
                        .font(.body)
                        .foregroundStyle(Theme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { headH = $0 }
                choices.padding(.top, Space.s5)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Space.s4)
            .padding(.top, Space.s2)
            .padding(.bottom, Space.s4)
            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { contentH = $0 }
            .opacity(fade)
        }
        .id("\(step.rawValue)-\(subpage)") // elke pagina bovenaan
        .scrollBounceBehavior(.basedOnSize)
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { roomH = $0 }
    }

    // Bovenaan: het woordmerk links, op elke pagina op dezelfde plek; rechts terug (of inloggen).
    private func topRow(onRed: Bool) -> some View {
        HStack {
            WelcomeMark(onRed: onRed, handoff: onRed ? brand : iris, hideDot: onRed && dotGone, breathes: onRed && !still && brand?.landed != false)
            Spacer(minLength: Space.s4)
            if onRed || step == .uitleg {
                Button("Inloggen") { login = true }
                    .font(.body.weight(.semibold))
                    .accessibilityHint("Hoot is nog op uitnodiging.")
                    .frame(minHeight: Space.tap)
                    .contentShape(Rectangle())
            } else if inSheet && step == start {
                Button("Annuleer") { onCancel?() }
                    .font(.body)
                    .frame(minHeight: Space.tap)
            } else {
                Button(action: back) {
                    HStack(spacing: Space.s1) {
                        Image(systemName: "chevron.left").font(.body.weight(.semibold))
                        Text("Terug")
                    }
                    .font(.body)
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
        .padding(.top, inSheet ? Space.s2 : 0) // in een blad: even lucht onder de rand
    }

    private var title: String {
        switch step {
        case .interesses: "Wat interesseert je?"
        case .precies: "Wat precies?"
        case .hoot: "Je Hoot"
        case .bronnen: "Je bronnen"
        case .selectie: "Je Selectie"
        case .seintje: "Een seintje?"
        case .intro, .uitleg: ""
        }
    }

    private var sub: String {
        switch step {
        case .interesses: "Kies er een paar. Daarmee maken we je Editie en kiezen we je bronnen."
        case .precies: "Kies wat je boeit. Niets kiezen is alles."
        case .hoot: "Ons voorstel. Pas aan wat je wilt."
        case .bronnen: reopen ? "Zet aan wat je wilt lezen." : "Zet aan wat je wilt lezen. Later pas je alles aan bij Bronnen."
        case .selectie: "Elke maandag de drie beste stukken van de week, per onderwerp. Kies wat bij je werk of hobby past."
        case .seintje: "Een stil seintje als je Editie klaarligt."
        case .intro, .uitleg: ""
        }
    }

    @ViewBuilder private var choices: some View {
        switch step {
        case .interesses: tiles
        case .precies: precies
        case .hoot: hootRows
        case .bronnen: bronnen
        case .selectie: selectie
        case .seintje: preview
        case .intro, .uitleg: EmptyView()
        }
    }

    // Interesses als tegels, liggend en 64 hoog (acht tegels in vier rijen): twee naast elkaar, vier op
    // een brede pagina, één vanaf xxLarge (dan krijgt de naam ruimte en blijven icoon, vinkje en naam onder elkaar).
    private var tiles: some View {
        let count = typeSize >= .xxLarge ? 1 : width >= 560 ? 4 : 2
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Space.s3, alignment: .top), count: count), spacing: Space.s3) {
            ForEach(Rubriek.alle) { r in
                ChoiceTile(label: r.label, icon: r.icon, on: interests.contains(r.id), compact: true) { interests = toggled(interests, r.id) }
            }
        }
    }

    // ---- Pagina's zonder scrollen: Wat precies?, Je bronnen, Je Selectie ----

    // Een groep keuzes (een interesse, een domein) of een stuk ervan als de groep alleen al te hoog is.
    private struct ChipGroup: Identifiable {
        let id: String
        let title: String
        let icon: String?
        let chips: [(id: String, label: String)]
    }

    // Hoeveel ruimte een pagina heeft voor de keuzes zelf (onder kop en uitleg, boven de knoppen).
    private var room: CGFloat { roomH - headH - Space.s2 - Space.s4 - Space.s5 - Space.s4 }
    private var metrics: WelcomePages.Metrics { WelcomePages.Metrics(typeSize) }

    // De groepen van deze stap: je gekozen interesses met hun onderwerpen, of de domeinen van de Selectie.
    private func groups(for step: Step) -> [ChipGroup] {
        switch step {
        case .selectie:
            return DigestFieldsList.domains.enumerated().compactMap { i, d in
                let chips = d.fields.filter { store.offersField($0.id) }.map { (id: $0.id, label: $0.label) }
                return chips.isEmpty ? nil : ChipGroup(id: "d\(i)", title: d.label, icon: nil, chips: chips)
            }
        default:
            return Rubriek.alle.filter { interests.contains($0.id) }.map { r in
                ChipGroup(id: r.id, title: r.label, icon: r.icon, chips: r.topics.map { (id: $0, label: Taste.label($0)) })
            }
        }
    }

    // Groepen verdeeld over pagina's die op een scherm passen (WelcomePages). Past een groep alleen al niet,
    // dan wordt hij zelf in stukken gedeeld, elk met de kop erboven.
    private func chipPages(for step: Step) -> [[ChipGroup]] {
        let all = groups(for: step)
        guard roomH > 0 else { return [all] }
        let m = metrics
        let line = max(120, width - Space.s4 * 2)
        let maxRows = max(1, Int((room - m.header - WelcomePages.headerGap + WelcomePages.gap) / (m.chip + WelcomePages.gap)))
        var parts: [ChipGroup] = []
        for g in all {
            let widths = g.chips.map { chipWidth($0.label) }
            let whole = WelcomePages.groupHeight(chips: widths, width: line, metrics: m)
            if whole <= room {
                parts.append(g)
            } else {
                for (n, idx) in WelcomePages.chunks(chips: widths, width: line, maxRows: maxRows).enumerated() {
                    parts.append(ChipGroup(id: "\(g.id)-\(n)", title: g.title, icon: g.icon, chips: idx.map { g.chips[$0] }))
                }
            }
        }
        let heights = parts.map { WelcomePages.groupHeight(chips: $0.chips.map { chipWidth($0.label) }, width: line, metrics: m) }
        return WelcomePages.split(heights, room: room, gap: Space.s5).map { $0.map { parts[$0] } }
    }

    // Je bronnen: de rijen over pagina's, op de gemeten hoogte van elke rij.
    private var sourcePages: [[String]] {
        guard roomH > 0, !offered.isEmpty, offered.allSatisfy({ rowH[$0] != nil }) else { return [offered] }
        return WelcomePages.split(offered.map { rowH[$0] ?? 0 }, room: room, gap: 0).map { $0.map { offered[$0] } }
    }

    private func subCountOf(_ s: Step) -> Int {
        switch s {
        case .precies, .selectie: chipPages(for: s).count
        case .bronnen: sourcePages.count
        default: 1
        }
    }
    private var subCount: Int { subCountOf(step) }

    // Hoe breed een onderwerp ongeveer wordt (met de ruimte voor het vinkje, dat erbij komt als hij gekozen is).
    private func chipWidth(_ text: String) -> CGFloat {
        let font = UIFont.systemFont(ofSize: metrics.subheadline.pointSize, weight: .semibold)
        return ceil((text as NSString).size(withAttributes: [.font: font]).width) + Space.s3 * 2 + 18
    }

    private func chipPage(_ pages: [[ChipGroup]], isOn: @escaping (String) -> Bool, toggle: @escaping (String) -> Void) -> some View {
        let mine = pages.indices.contains(subpage) ? pages[subpage] : pages.last ?? []
        return VStack(alignment: .leading, spacing: Space.s5) {
            ForEach(mine) { g in
                VStack(alignment: .leading, spacing: Space.s3) {
                    GroupTitle(text: g.title, icon: g.icon)
                    Flow {
                        ForEach(g.chips, id: \.id) { c in
                            ChoiceChip(label: c.label, on: isOn(c.id), dense: true) { toggle(c.id) }
                        }
                    }
                }
            }
        }
        .opacity(roomH > 0 ? 1 : 0) // pas tonen als we weten hoeveel er past
    }

    private var precies: some View {
        chipPage(chipPages(for: .precies), isOn: { picked.contains($0) }) { picked = toggled(picked, $0) }
    }

    private var selectie: some View {
        chipPage(chipPages(for: .selectie), isOn: { vak.contains($0) }) { id in
            let on = vak.contains(id)
            vak = DigestFieldsList.fields.map(\.id).filter { $0 == id ? !on : vak.contains($0) }
        }
    }

    private var bronnen: some View {
        let pages = sourcePages
        let mine = pages.indices.contains(subpage) ? pages[subpage] : pages.last ?? []
        func pick(_ id: String) -> some View {
            SourcePick(source: store.source(id)!, on: chosen?.contains(id) == true) {
                chosen = toggled(chosen ?? [], id)
            }
        }
        return VStack(alignment: .leading, spacing: 0) {
            ForEach(mine.filter { store.source($0) != nil }, id: \.self) { id in pick(id) }
        }
        .opacity(roomH > 0 && offered.allSatisfy { rowH[$0] != nil } ? 1 : 0)
        // Een verborgen kopie meet elke rij; WelcomePages.split verdeelt ze dan over de pagina's.
        .background(alignment: .topLeading) {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(offered.filter { store.source($0) != nil }, id: \.self) { id in
                    pick(id).background(GeometryReader { g in Color.clear.preference(key: RowHeights.self, value: [id: g.size.height]) })
                }
            }
            .frame(width: max(120, width - Space.s4 * 2))
            .fixedSize(horizontal: false, vertical: true) // de eigen hoogte, niet die van de pagina
            .opacity(0)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
        .onPreferenceChange(RowHeights.self) { rowH.merge($0) { _, new in new } }
    }

    // ---- Je Hoot ----

    // Zo ver is het voorstel: "NOS, NU.nl en 4 meer".
    private var sourcesLine: String {
        guard let ids = chosen else { return "De bronnen worden geladen…" }
        let names = ids.compactMap { store.source($0)?.name }
        switch names.count {
        case 0: return "Kies minstens één bron"
        case 1: return names[0]
        case 2: return "\(names[0]) en \(names[1])"
        case 3: return "\(names[0]), \(names[1]) en \(names[2])"
        default: return "\(names[0]), \(names[1]) en \(names.count - 2) meer"
        }
    }

    private var vakLine: String {
        vak.isEmpty ? "Later kiezen" : vak.count == 1 ? "1 onderwerp" : "\(vak.count) onderwerpen"
    }

    private var hootRows: some View {
        VStack(spacing: Space.s3) {
            hootRow("Je bronnen", value: sourcesLine, trailing: AnyView(Text("Aanpassen").font(.subheadline.weight(.semibold))), disabled: chosen == nil) { subpage = 0; go(.bronnen) }
            hootRow("Je Selectie", value: vakLine, trailing: AnyView(Image(systemName: "chevron.right").font(.footnote.weight(.bold)).foregroundStyle(Theme.ink3)), disabled: false) { subpage = 0; go(.selectie) }
        }
    }

    private func hootRow(_ label: String, value: String, trailing: AnyView, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Space.s3) {
                VStack(alignment: .leading, spacing: Space.s0) {
                    Text(label).font(.headline.weight(.heavy))
                    Text(value).font(.subheadline).foregroundStyle(Theme.ink2).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                trailing
            }
            .multilineTextAlignment(.leading)
            .padding(Space.s4)
            .frame(minHeight: 64)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.md))
            .overlay(RoundedRectangle(cornerRadius: Radius.md).strokeBorder(Theme.rule, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: Radius.md))
        }
        .buttonStyle(ChoicePress())
        .disabled(disabled)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label), \(value)")
        .accessibilityHint(label == "Je bronnen" ? "Aanpassen" : "Kies je onderwerpen")
        .accessibilityAddTraits(.isButton)
    }

    // Het seintje: een nagemaakte melding die zacht binnenvalt, zoals een echte.
    private var preview: some View {
        AlertPreview()
            .opacity(alertShown || still ? 1 : 0)
            .offset(y: alertShown || still ? 0 : -Space.s5)
            .frame(maxWidth: .infinity)
            .padding(.top, Space.s2)
            .task {
                guard !still, !alertShown else { return }
                try? await Task.sleep(for: .seconds(0.35))
                withAnimation(.easeOut(duration: 0.7)) { alertShown = true }
            }
    }

    // ---- De knoppen ----

    private func ctaButton(_ label: String, onRed: Bool, off: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.headline.weight(.heavy))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, minHeight: 52)
                .foregroundStyle(onRed ? Theme.brandRed : Theme.paper)
                .background(onRed ? Self.paperWhite : Theme.ink, in: Capsule())
                .contentShape(Capsule())
        }
        .buttonStyle(ChoicePress())
        .disabled(off || asking)
        .opacity(off ? 0.4 : 1)
    }

    private func linkButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(label, action: action)
            .buttonStyle(.plain)
            .font(.subheadline.weight(.bold))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: Space.tap)
            .contentShape(Rectangle())
            .disabled(asking)
    }

    // Onder elke keuzepagina één knop en een vast vak voor een stille link (Overslaan, Nu niet): de
    // knop staat op elke pagina op dezelfde plek. Altijd in beeld, en dus begrensd: bij de grootste
    // tekst blijven ze op één regel (de letter krimpt iets mee). VoiceOver leest de volle tekst.
    private var choiceFoot: some View {
        let cta = cta
        return VStack(spacing: Space.s1) {
            ctaButton(cta.label, onRed: false, off: cta.off, action: primary)
            Group {
                if let link { linkButton(link.label, action: link.action) } else { Color.clear }
            }
            .frame(height: Space.tap)
        }
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .padding(.horizontal, Space.s4)
        .padding(.top, Space.s2)
        .padding(.bottom, Space.s2)
    }

    private var cta: (label: String, off: Bool) {
        switch step {
        case .interesses: (interests.isEmpty ? "Kies minstens één" : "Verder", interests.isEmpty)
        case .precies: ("Verder", false)
        case .bronnen, .selectie: (subpage + 1 < subCount ? "Verder" : "Klaar", step == .bronnen && chosen?.isEmpty == true && subpage + 1 >= subCount)
        case .hoot: (asks ? "Verder" : "Naar je Editie", chosen?.isEmpty == true)
        case .seintje: ("Ja, graag", false)
        case .intro, .uitleg: ("", false)
        }
    }

    private var link: (label: String, action: () -> Void)? {
        switch step {
        case .precies: ("Overslaan", { go(.hoot) })
        case .seintje: ("Nu niet", { onDone() }) // onder het einde van de Editie kan het later nog
        case .interesses where reopen, .hoot where reopen: ("Sluiten zonder opslaan", { onCancel?() })
        default: nil
        }
    }
}

// Wat precies?, Je bronnen en Je Selectie verdeeld over pagina's die op een scherm passen: nooit scrollen.
// De onderwerpen van een interesse staan bij elkaar; past een heel groepje niet meer op de pagina, dan
// begint er een nieuwe, en past een groepje alleen al niet, dan wordt het zelf gedeeld (chunks).
// De maten volgen de tekstgrootte (Metrics). Zuiver rekenwerk, getoetst in OnboardingTests.
enum WelcomePages {
    static let chip: CGFloat = Space.tap - Space.s1 // hoogte van één onderwerp bij normale tekst
    static let gap: CGFloat = Space.s2 // tussen onderwerpen
    static let header: CGFloat = 20 // de kop van een groep (icoon en naam) bij normale tekst
    static let headerGap: CGFloat = Space.s3

    // De hoogtes bij een tekstgrootte: een onderwerp is minstens 40 hoog en groeit mee met de regel; de kop
    // van een groep met zijn icoon ook.
    struct Metrics {
        var chip = WelcomePages.chip
        var header = WelcomePages.header
        var subheadline = UIFont.preferredFont(forTextStyle: .subheadline)

        init() {}
        init(_ size: DynamicTypeSize) {
            let category: UIContentSizeCategory = switch size {
            case .xSmall: .extraSmall
            case .small: .small
            case .medium: .medium
            case .large: .large
            case .xLarge: .extraLarge
            case .xxLarge: .extraExtraLarge
            case .xxxLarge: .extraExtraExtraLarge
            case .accessibility1: .accessibilityMedium
            case .accessibility2: .accessibilityLarge
            case .accessibility3: .accessibilityExtraLarge
            case .accessibility4: .accessibilityExtraExtraLarge
            case .accessibility5: .accessibilityExtraExtraExtraLarge
            @unknown default: .large
            }
            let traits = UITraitCollection(preferredContentSizeCategory: category)
            subheadline = UIFont.preferredFont(forTextStyle: .subheadline, compatibleWith: traits)
            let body = UIFont.preferredFont(forTextStyle: .body, compatibleWith: traits)
            chip = max(WelcomePages.chip, ceil(subheadline.lineHeight) + Space.s2 * 2)
            header = max(WelcomePages.header, ceil(body.lineHeight))
        }
    }

    // Hoeveel regels de onderwerpen vullen als ze met `gap` ertussen op regels van `width` komen.
    static func rows(chips: [CGFloat], width: CGFloat) -> Int {
        var rows = 1
        var x: CGFloat = 0
        for w in chips {
            let w = min(w, width)
            if x > 0, x + w > width {
                rows += 1
                x = 0
            }
            x += w + gap
        }
        return chips.isEmpty ? 0 : rows
    }

    static func groupHeight(rows: Int, metrics m: Metrics = Metrics()) -> CGFloat {
        m.header + headerGap + CGFloat(rows) * m.chip + CGFloat(max(0, rows - 1)) * gap
    }

    // Een onderwerp breder dan de regel breekt zijn naam af op een tweede regel: die regel telt mee.
    static func groupHeight(chips: [CGFloat], width: CGFloat, metrics m: Metrics) -> CGFloat {
        let wrapped = chips.reduce(0) { $0 + ($1 > width ? Int(ceil($1 / width)) - 1 : 0) }
        return groupHeight(rows: rows(chips: chips, width: width), metrics: m) + CGFloat(wrapped) * ceil(m.subheadline.lineHeight)
    }

    // Een groep die alleen al te hoog is, in stukken van hooguit `maxRows` regels (de indices van de onderwerpen).
    static func chunks(chips: [CGFloat], width: CGFloat, maxRows: Int) -> [[Int]] {
        var out: [[Int]] = [[]]
        var rows = 1
        var x: CGFloat = 0
        for (i, w) in chips.enumerated() {
            let w = min(w, width)
            if x > 0, x + w > width {
                rows += 1
                x = 0
            }
            if rows > maxRows {
                out.append([])
                rows = 1
                x = 0
            }
            out[out.count - 1].append(i)
            x += w + gap
        }
        return out
    }

    // Welke groepen (op volgorde) op welke pagina komen; een groep die alleen al te hoog is, staat op
    // een eigen pagina.
    static func split(_ heights: [CGFloat], room: CGFloat, gap between: CGFloat) -> [[Int]] {
        var pages: [[Int]] = []
        var used: CGFloat = 0
        for (i, h) in heights.enumerated() {
            if let last = pages.indices.last, used + between + h <= room {
                pages[last].append(i)
                used += between + h
            } else {
                pages.append([i])
                used = h
            }
        }
        return pages.isEmpty ? [[]] : pages
    }
}

// De hoogte van elke bronrij, gemeten in een verborgen kopie (Je bronnen).
private struct RowHeights: PreferenceKey {
    static let defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) { value.merge(nextValue()) { _, new in new } }
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

// Een bron om aan of uit te zetten (.ob__src): logo, naam met labels, wat het is, en een rond vinkje.
private struct SourcePick: View {
    let source: Source
    let on: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Space.s3) {
                SourceAvatar(source: source, size: 40).opacity(on ? 1 : 0.5)
                VStack(alignment: .leading, spacing: Space.s0) {
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: Space.s2) { name; tags }
                        VStack(alignment: .leading, spacing: Space.s1) { name; HStack(spacing: Space.s2) { tags } }
                    }
                    if let about = source.about, !about.isEmpty {
                        Text(about)
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink3)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                check
            }
            .multilineTextAlignment(.leading)
            .padding(.vertical, Space.s3)
            .frame(minHeight: 64)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { Rule() }
        }
        .buttonStyle(ChoicePress())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel([source.name, source.paid == true ? "abonnement" : "gratis", source.lang == "en" ? "Engels" : nil, source.about].compactMap { $0 }.joined(separator: ", "))
        .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    }

    private var name: some View {
        Text(source.name).font(.body.weight(.heavy)).foregroundStyle(Theme.ink)
    }

    // Labels in een inkttint (rood is voor wat aan staat).
    @ViewBuilder private var tags: some View {
        tag(source.paid == true ? "abonnement" : "gratis")
        if source.lang == "en" { tag("EN") }
    }

    private func tag(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.bold))
            .foregroundStyle(Theme.ink2)
            .padding(.horizontal, Space.s2)
            .padding(.vertical, Space.s0)
            .background(Theme.rule, in: Capsule())
            .fixedSize()
    }

    // Het ronde vinkje in de grammatica van gekozen (zie Choice.swift): in rust een rand `edge`, gekozen
    // rood zacht met een rode rand en het vinkje in accent. Geen wit op rood: dat is voor het merk.
    private var check: some View {
        ZStack {
            Circle().strokeBorder(Theme.edge, lineWidth: 1).opacity(on ? 0 : 1)
            Circle().fill(Theme.accentSoft).overlay(Circle().strokeBorder(Theme.accent, lineWidth: 1)).opacity(on ? 1 : 0)
            Image(systemName: "checkmark")
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(Theme.accent)
                .opacity(on ? 1 : 0)
        }
        .frame(width: Space.s6, height: Space.s6)
        .animation(.easeOut(duration: 0.15), value: on)
        .accessibilityHidden(true)
    }
}

// Een melding zoals iOS hem toont, met het icoon van Hoot ("h." op papier): wat je straks krijgt.
// Een plaatje, dus voor VoiceOver verborgen; de tekst erboven zegt het al.
private struct AlertPreview: View {
    var body: some View {
        let slot = EditionAlerts.slots[0]
        HStack(alignment: .center, spacing: Space.s3) {
            AppMark()
            VStack(alignment: .leading, spacing: Space.s0) {
                HStack(alignment: .firstTextBaseline) {
                    Text(slot.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Spacer(minLength: Space.s2)
                    Text("nu").font(.footnote).foregroundStyle(Theme.ink3)
                }
                Text(slot.body).font(.subheadline).foregroundStyle(Theme.ink2).lineLimit(2) // zoals iOS: liever een tweede regel dan "…"
            }
        }
        .padding(.horizontal, Space.s4)
        .padding(.vertical, Space.s3)
        .frame(maxWidth: 360)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.lg + Space.s2, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg + Space.s2, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
        .shadow(color: .black.opacity(0.06), radius: 16, y: 6)
        .dynamicTypeSize(...DynamicTypeSize.xLarge) // een plaatje: groeit beperkt mee
        .accessibilityHidden(true)
    }
}

// Het app-icoon in het klein: het teken "h." op papier, met de rode punt. Op de plek en maat van
// public/brand/hoot-app-icon.svg (vlak 192, hoek 42; de h van x 30,2 en y 40,6, 115 hoog).
private struct AppMark: View {
    private static let side: CGFloat = 38
    private static let k = side / 192

    var body: some View {
        BrandMark(height: 114.95 * Self.k)
            .padding(.leading, 30.17 * Self.k)
            .padding(.top, 40.55 * Self.k)
            .frame(width: Self.side, height: Self.side, alignment: .topLeading)
            .background(Theme.paper, in: RoundedRectangle(cornerRadius: 42 * Self.k, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 42 * Self.k, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
    }
}
