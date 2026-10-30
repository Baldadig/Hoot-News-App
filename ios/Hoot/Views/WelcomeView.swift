import SwiftUI

// Het welkom, zoals op hootnews.nl (src/views/Welcome.jsx): een rode intro, dan in stappen je
// interesses, Wat precies?, je bronnen, je Selectie en of je een seintje wilt. Elke stap heeft een
// kop, een korte uitleg, tegels of keuzeknoppen, en onderaan één knop om door te gaan. "Liever meteen
// lezen" geeft een goed begin met gratis Nederlandse bronnen.
// Het merk loopt erdoorheen: het opstartscherm landt op "hoot." linksboven op de rode intro (het rood
// blijft), en bij de eerste papieren stap sluit het rood zich als een iris tot de punt van "hoot." op
// papier, op precies dezelfde plek.
// Ook vanuit Instellingen (`reopen`: alles begint bij wat je nu hebt, sluiten slaat niets op) en na
// even rondkijken (`start: .interesses`, in een blad met Annuleer).
struct WelcomeView: View {
    enum Step: String { case intro, interesses, precies, bronnen, selectie, seintje, snel }

    var reopen = false
    var start: Step = .intro
    var onCancel: (() -> Void)? = nil
    var onDone: () -> Void

    @Environment(HootStore.self) private var store
    @Environment(EditionAlerts.self) private var alerts
    @Environment(\.brandHandoff) private var brand // van het opstartscherm (HootApp)
    @Environment(\.accessibilityReduceMotion) private var still
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .largeTitle) private var hero: CGFloat = 46

    @State private var step: Step
    @State private var interests: [String] = []
    @State private var picked: [String] = [] // Wat precies?: wat je aantikte; niets = alles binnen die interesse
    @State private var chosen: [String]? // bronnen: pas ingevuld als je bij die stap komt en ze er zijn
    @State private var quick: [String]? // een goed begin: de startset
    @State private var freeOnly = false
    @State private var vak: [String] = [] // de eerste keer leeg, zoals op het web
    @State private var prepared = false
    @State private var asksAlert: Bool? // vast bij binnenkomst: dan verspringt de teller niet
    @State private var asking = false
    @State private var alertShown = false
    @State private var login = false
    @State private var width: CGFloat = 0
    @State private var fade = 1.0 // wisselen tussen papieren stappen
    @AccessibilityFocusState private var headFocus: Bool

    // De iris: het rood ligt over de papieren stap en sluit tot de punt van het woordmerk daar.
    @State private var iris = BrandHandoff()
    @State private var red: Bool // de rode intro ligt erbovenop
    @State private var closed = false // het rood is gesloten tot de punt
    @State private var tinted = false // het rood kleurt naar de punt (in donker koraal)
    @State private var dotGone = false // de papieren punt op het rood is opgegaan in het rood

    init(reopen: Bool = false, start: Step = .intro, onCancel: (() -> Void)? = nil, onDone: @escaping () -> Void) {
        var first = start
        #if DEBUG
        if first == .intro, let s = DebugLaunch.welcomeStep.flatMap(Step.init(rawValue:)) { first = s } // `-HootWelcomeStep bronnen`
        #endif
        self.reopen = reopen
        self.start = first
        self.onCancel = onCancel
        self.onDone = onDone
        _step = State(initialValue: first)
        _red = State(initialValue: first == .intro)
    }

    // Na even rondkijken, in een blad: zonder intro, en Annuleer op de eerste stap.
    private var inSheet: Bool { onCancel != nil && !reopen }
    private var asks: Bool { asksAlert ?? (start == .seintje || (alerts.permission == .notDetermined && !store.notify)) }
    // De stappen met een teller ("2/6"); een goed begin staat erbuiten.
    private var flow: [Step] { (inSheet ? [] : [.intro]) + [.interesses, .precies, .bronnen, .selectie] + (asks ? [.seintje] : []) }
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
        .tint(Theme.accent)
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
            // De kop van de nieuwe stap voorlezen (VoiceOver), zoals de focus op de kop op het web.
            Task {
                try? await Task.sleep(for: .milliseconds(400))
                headFocus = true
            }
        }
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
        fill()
    }

    // Bronnen vooraf aanzetten, zodra ze er zijn: opnieuw kiezen begint bij wat je volgt, de eerste
    // keer bij wat bij je interesses past. Een goed begin: de startset.
    private func fill() {
        guard !store.newsSources.isEmpty else { return }
        if step == .bronnen, chosen == nil {
            chosen = reopen ? store.followed.map(\.id) : store.suggested(interests: interests, topics: topics)
        }
        if step == .snel, quick == nil { quick = starter.flatMap { $0.sources.map(\.id) } }
    }

    private func toggled(_ list: [String], _ id: String) -> [String] { list.contains(id) ? list.filter { $0 != id } : list + [id] }

    // Zoals HootStore.starter, alleen wat bestaat en gratis is (starterGroups op het web).
    private var starter: [(label: String, sources: [Source])] {
        HootStore.starterGroups.map { g in (g.label, g.ids.compactMap { id in store.newsSources.first { $0.id == id && $0.paid != true } }) }.filter { !$0.sources.isEmpty }
    }

    // Klaar met kiezen: je interesses, onderwerpen, bronnen en vak worden je instellingen.
    private func apply() {
        store.applyWelcome(interests: interests, topics: topics, sources: chosen ?? store.suggested(interests: interests, topics: topics), shown: store.newsSources, vak: vak)
    }

    private func primary() {
        switch step {
        case .intro: go(.interesses)
        case .interesses: go(.precies)
        case .precies:
            // Opnieuw kiezen: wat je volgt (en wat je hier al aan- of uitzette). Eerste keer: opnieuw
            // voorstellen, want je interesses kunnen veranderd zijn.
            if !reopen { chosen = nil }
            go(.bronnen)
        case .bronnen: go(.selectie)
        case .selectie:
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
        case .snel:
            store.quickStart(ids: quick ?? HootStore.starter) // nog niet geladen: de hele startset, bij het laden
            onDone()
        }
    }

    private func back() {
        switch step {
        case .interesses, .snel: go(.intro)
        case .precies: go(.interesses)
        case .bronnen: go(.precies)
        case .selectie: go(.bronnen)
        case .seintje: go(.selectie)
        case .intro: break
        }
    }

    // ---- Overgangen ----

    private func go(_ next: Step) {
        if step == .intro { leaveIntro(to: next); return }
        if next == .intro { backToIntro(); return }
        // Tussen papieren stappen: even uit en weer in (0,2 s), bovenaan beginnen.
        Task {
            withAnimation(.easeOut(duration: 0.08)) { fade = 0 }
            try? await Task.sleep(for: .seconds(0.08))
            step = next
            withAnimation(.easeIn(duration: 0.12)) { fade = 1 }
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

    // Terug naar de intro: de iris andersom, het rood gaat weer open uit de punt.
    private func backToIntro() {
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

    // ---- De schermen ----

    // De rode intro: merkrood, alles erop papier (ook in donker). Het rood is de schijf van de iris.
    private var introStep: some View {
        VStack(spacing: 0) {
            topRow(onRed: true)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    counter(.intro, onRed: true)
                    Text("Minder scrollen. Meer lezen.")
                        .font(.system(size: min(hero, 72), weight: .heavy, design: .serif))
                        .tracking(-1)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityFocused($headFocus)
                        .padding(.top, Space.s5)
                    VStack(alignment: .leading, spacing: Space.s5) {
                        point("newspaper", "Je Editie", "Drie keer per dag tien verhalen, met een einde.")
                        point("water.waves", "De Stroom", "Alles van je bronnen, nieuwste eerst.")
                        point("books.vertical", "Je Selectie", "Eén keer per week bijgepraat over wat jou bezighoudt.")
                    }
                    .padding(.top, Space.s6)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Space.s4)
                .padding(.bottom, Space.s5)
            }
            .scrollBounceBehavior(.basedOnSize)
            .safeAreaInset(edge: .bottom, spacing: 0) { foot(onRed: true) }
        }
        .column()
        .foregroundStyle(Self.paperWhite)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background { disc(tinted ? Theme.accent : Theme.brandRed) }
        .mask { disc(.black) }
        .compositingGroup() // vervagen als één vlak (Verminder beweging), zonder rood door de letters
        .allowsHitTesting(step == .intro)
    }

    // Een onderdeel van Hoot: een papieren schijf met het icoon in merkrood, en twee regels.
    private func point(_ icon: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Space.s3) {
            Image(systemName: icon)
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(Theme.brandRed)
                .frame(width: Space.tap, height: Space.tap)
                .background(Self.paperWhite, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: Space.s0) {
                Text(title).font(.title3.weight(.bold))
                Text(text).font(.body).opacity(0.85).fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, Space.s0)
        }
        .accessibilityElement(children: .combine)
    }

    // Een papieren stap: kop, uitleg en de keuzes; onderaan de knop.
    private var paperStep: some View {
        VStack(spacing: 0) {
            topRow(onRed: false)
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if flow.contains(step) { counter(step, onRed: false) }
                    Text(title)
                        .font(.system(.largeTitle, design: .serif, weight: .heavy))
                        .tracking(-0.6)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityFocused($headFocus)
                        .padding(.top, flow.contains(step) ? Space.s4 : Space.s2)
                    Text(sub)
                        .font(.body)
                        .lineSpacing(Space.s1)
                        .foregroundStyle(Theme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, Space.s2)
                    choices.padding(.top, Space.s5)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Space.s4)
                .padding(.bottom, Space.s5)
                .opacity(fade)
            }
            .id(step) // elke stap bovenaan
            .scrollBounceBehavior(.basedOnSize)
            .safeAreaInset(edge: .bottom, spacing: 0) { foot(onRed: false).opacity(fade) }
        }
        .column()
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
        .foregroundStyle(Theme.ink)
        .background(Theme.paper.ignoresSafeArea())
    }

    // Bovenaan: het woordmerk links, op elke stap op dezelfde plek; rechts terug (of inloggen).
    private func topRow(onRed: Bool) -> some View {
        HStack {
            WelcomeMark(onRed: onRed, handoff: onRed ? brand : iris, hideDot: onRed && dotGone, breathes: onRed && !still && brand?.landed != false)
            Spacer(minLength: Space.s4)
            if onRed {
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

    // Waar je bent: "2/6", het cijfer groot in de krantenletter.
    private func counter(_ s: Step, onRed: Bool) -> some View {
        let n = (flow.firstIndex(of: s) ?? 0) + 1
        return HStack(alignment: .firstTextBaseline, spacing: Space.s0) {
            Text("\(n)")
                .font(.system(size: 36, weight: .heavy, design: .serif))
                .foregroundStyle(onRed ? Self.paperWhite : Theme.accent)
            Text("/\(flow.count)")
                .font(.system(.body, design: .serif, weight: .heavy))
                .foregroundStyle(onRed ? Self.paperWhite : Theme.ink3)
        }
        .padding(.top, Space.s2)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Stap \(n) van \(flow.count)")
    }

    private var title: String {
        switch step {
        case .intro: "Minder scrollen. Meer lezen."
        case .interesses: "Wat interesseert je?"
        case .precies: "Wat precies?"
        case .bronnen: "Jouw bronnen"
        case .selectie: "Wat volg je graag?"
        case .seintje: "Een seintje?"
        case .snel: "Een goed begin"
        }
    }

    private var sub: String {
        switch step {
        case .intro: ""
        case .interesses: "Daarmee stellen we je bronnen voor en vormen we je Editie: wat bij je interesses past, krijgt voorrang."
        case .precies: "Kies wat je het meest boeit. Kies je niets, dan krijg je alles binnen dat onderwerp."
        case .bronnen: (reopen ? "Aan staan de bronnen die je nu volgt." : "We kozen er alvast een paar die bij je interesses passen.") + " Tik om ze aan of uit te zetten. Van een bron met abonnement zie je altijd de koppen; het hele artikel lees je als je abonnee bent."
        case .selectie: "Eén keer per week bijgepraat over wat jou bezighoudt: elke maandag zet de Selectie per onderwerp de drie beste stukken van de week voor je klaar, geschreven door mensen. Kies wat bij je werk past of wat je graag volgt, of sla het over."
        case .seintje: "Als je Editie klaarligt: in de ochtend, middag en vroege avond. Stil, zonder geluid."
        case .snel: "Bekende Nederlandse bronnen, van nieuws tot cultuur. Allemaal gratis: elk stuk lees je helemaal, zonder abonnement. Tik op een bron om hem weg te laten; later pas je alles aan bij Bronnen."
        }
    }

    @ViewBuilder private var choices: some View {
        switch step {
        case .intro: EmptyView()
        case .interesses: tiles
        case .precies: TopicsPicker(interests: interests, picked: $picked)
        case .bronnen: sources
        case .selectie: fields
        case .seintje: preview
        case .snel: starterList
        }
    }

    // Interesses als tegels: twee naast elkaar, vier op een brede pagina, één bij heel grote tekst.
    private var tiles: some View {
        let count = typeSize.isAccessibilitySize ? 1 : width >= 560 ? 4 : 2
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Space.s3, alignment: .top), count: count), spacing: Space.s3) {
            ForEach(Rubriek.alle) { r in
                ChoiceTile(label: r.label, icon: r.icon, on: interests.contains(r.id)) { interests = toggled(interests, r.id) }
            }
        }
    }

    // De bronnen per groep, gratis eerst. De rubrieken alleen bij die interesse (Games bij dat
    // onderwerp); Regionaal en Vlaanderen ingeklapt.
    private static let groups: [(cat: String, label: String, interest: String?, topic: String?, folded: Bool)] = [
        ("nl", "Nederland", nil, nil, false), ("int", "Internationaal", nil, nil, false),
        ("economie", "Economie", "economie", nil, false), ("tech", "Tech", "tech", nil, false), ("games", "Games", nil, "games", false),
        ("wetenschap", "Wetenschap", "wetenschap", nil, false), ("sport", "Sport", "sport", nil, false), ("cultuur", "Cultuur en muziek", "cultuur", nil, false),
        ("regio", "Regionaal", nil, nil, true), ("vl", "Vlaanderen", nil, nil, true),
    ]

    private var sources: some View {
        let mine = topics
        let groups = Self.groups.filter { g in g.interest.map(interests.contains) ?? true && g.topic.map(mine.contains) ?? true }
        return VStack(alignment: .leading, spacing: Space.s5) {
            Flow {
                ChoiceChip(label: "Alle bronnen", on: !freeOnly) { freeOnly = false }
                ChoiceChip(label: "Alleen gratis", on: freeOnly) {
                    freeOnly = true
                    chosen = chosen?.filter { id in store.source(id)?.paid != true }
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Welke bronnen tonen")
            if store.newsSources.isEmpty {
                Text("De bronnen worden geladen…").font(.body).foregroundStyle(Theme.ink2)
            }
            ForEach(groups, id: \.cat) { g in
                let all = store.newsSources.filter { $0.cat == g.cat && (!freeOnly || $0.paid != true) }
                let list = all.filter { $0.paid != true } + all.filter { $0.paid == true }
                if !list.isEmpty {
                    if g.folded {
                        let count = list.filter { (chosen ?? []).contains($0.id) }.count
                        DisclosureGroup {
                            rows(list, on: chosen ?? []) { chosen = toggled(chosen ?? [], $0) }
                        } label: {
                            HStack(spacing: Space.s2) {
                                GroupTitle(text: g.label)
                                Text(count > 0 ? "\(count) gekozen" : "\(list.count) bronnen")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Theme.ink3)
                            }
                            .frame(minHeight: Space.tap)
                        }
                        .tint(Theme.ink3)
                    } else {
                        VStack(alignment: .leading, spacing: Space.s1) {
                            GroupTitle(text: g.label)
                            rows(list, on: chosen ?? []) { chosen = toggled(chosen ?? [], $0) }
                        }
                    }
                }
            }
        }
    }

    private func rows(_ list: [Source], on: [String], toggle: @escaping (String) -> Void) -> some View {
        VStack(spacing: 0) {
            ForEach(list) { s in SourcePick(source: s, on: on.contains(s.id)) { toggle(s.id) } }
        }
    }

    // Je vak, voor de Selectie: de onderwerpen die de server heeft, per domein.
    private var fields: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            ForEach(DigestFieldsList.domains, id: \.label) { domain in
                let offered = domain.fields.filter { store.offersField($0.id) }
                if !offered.isEmpty {
                    VStack(alignment: .leading, spacing: Space.s3) {
                        GroupTitle(text: domain.label)
                        Flow {
                            ForEach(offered, id: \.id) { f in
                                ChoiceChip(label: f.label, on: vak.contains(f.id)) {
                                    let on = vak.contains(f.id)
                                    vak = DigestFieldsList.fields.map(\.id).filter { $0 == f.id ? !on : vak.contains($0) }
                                }
                            }
                        }
                    }
                }
            }
        }
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

    private var starterList: some View {
        VStack(alignment: .leading, spacing: Space.s5) {
            if starter.isEmpty {
                Text("De bronnen worden geladen…").font(.body).foregroundStyle(Theme.ink2)
            }
            ForEach(starter, id: \.label) { g in
                VStack(alignment: .leading, spacing: Space.s1) {
                    GroupTitle(text: g.label)
                    rows(g.sources, on: quick ?? HootStore.starter) { quick = toggled(quick ?? HootStore.starter, $0) }
                }
            }
        }
    }

    // Onderaan altijd één knop, met hooguit een stille link eronder. Op papier inkt, op rood papier
    // met rode letters. Altijd in beeld, en dus begrensd: bij de grootste tekst blijven ze op één
    // regel (de letter krimpt iets mee). VoiceOver leest de volle tekst.
    private func foot(onRed: Bool) -> some View {
        let ground = onRed ? Theme.brandRed : Theme.paper
        let s = onRed ? Step.intro : step
        return VStack(spacing: Space.s1) {
            Button(action: primary) {
                Text(cta(s).label)
                    .font(.headline.weight(.heavy))
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .foregroundStyle(onRed ? Theme.brandRed : Theme.paper)
                    .background(onRed ? Self.paperWhite : Theme.ink, in: Capsule())
                    .contentShape(Capsule())
            }
            .buttonStyle(ChoicePress())
            .disabled(cta(s).off || asking)
            .opacity(cta(s).off ? 0.4 : 1)
            if let link = link(s) {
                Button(link.label, action: link.action)
                    .buttonStyle(.plain)
                    .font(.subheadline.weight(.bold))
                    .frame(maxWidth: .infinity, minHeight: Space.tap)
                    .contentShape(Rectangle())
                    .disabled(asking)
            }
            if s == .seintje {
                Text("Per Editie aan of uit in Instellingen.")
                    .font(.footnote)
                    .foregroundStyle(Theme.ink3)
                    .frame(minHeight: Space.tap - Space.s3, alignment: .top)
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
        .padding(.horizontal, Space.s4)
        .padding(.top, Space.s4)
        .padding(.bottom, Space.s2)
        .background {
            // Een zacht verloop: de lijst loopt eronder door.
            VStack(spacing: 0) {
                LinearGradient(colors: [ground.opacity(0), ground], startPoint: .top, endPoint: .bottom).frame(height: Space.s4)
                ground
            }
            .ignoresSafeArea(edges: .bottom)
        }
    }

    private func cta(_ s: Step) -> (label: String, off: Bool) {
        switch s {
        case .intro: ("Stel je Hoot samen", false)
        case .interesses: (interests.isEmpty ? "Kies minstens één" : "Verder", interests.isEmpty)
        case .precies: ("Verder", false)
        case .bronnen: ("Verder", chosen?.isEmpty == true)
        case .selectie: (asks ? "Verder" : "Naar je Editie", false)
        case .seintje: ("Ja, graag", false)
        case .snel: ("Begin met lezen", quick?.isEmpty == true)
        }
    }

    private func link(_ s: Step) -> (label: String, action: () -> Void)? {
        switch s {
        case .snel: ("Liever zelf kiezen", { go(.interesses) })
        case .seintje: ("Nu niet", { onDone() }) // onder het einde van de Editie kan het later nog
        case _ where reopen: ("Sluiten zonder opslaan", { onCancel?() })
        case .intro: ("Liever meteen lezen", { go(.snel) })
        default: nil
        }
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

    private var check: some View {
        ZStack {
            Circle().strokeBorder(Theme.ink, lineWidth: 2).opacity(on ? 0 : 1)
            Circle().fill(Theme.accent).opacity(on ? 1 : 0)
            Image(systemName: "checkmark")
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(Theme.onAccent)
                .opacity(on ? 1 : 0)
        }
        .frame(width: 28, height: 28)
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
