import SwiftUI

@main
struct HootApp: App {
    @State private var store = HootStore()
    @State private var account = Account()
    @State private var alerts = EditionAlerts.shared
    @UIApplicationDelegateAdaptor(HootAppDelegate.self) private var delegate // seintjes, ook bij een koude start
    @Environment(\.scenePhase) private var phase

    init() {
        // Beelden bewaren tussen scrollen en starten (AsyncImage cachet zelf pas vanaf iOS 27).
        URLCache.shared = URLCache(memoryCapacity: 64 << 20, diskCapacity: 300 << 20)
        // Schermtitels (Middageditie, Stroom, Selectie …) in Newsreader 800, zoals op de website. Groeit
        // mee met de tekstgrootte, de grote titel tot 40 pt: daarboven werd "Ochtendeditie" op een mini
        // "Ochtended…".
        let bar = UINavigationBar.appearance()
        bar.largeTitleTextAttributes = [.font: UIFont.hoot(Letters.kop, .largeTitle, size: 34, max: 40), .foregroundColor: NachtKleur.label]
        bar.titleTextAttributes = [.font: UIFont.hoot(Letters.kop, .headline, size: 17), .foregroundColor: NachtKleur.label]
        // Het segment van het systeem in Schibsted Grotesk, zoals de bediening van het web.
        let segment = UISegmentedControl.appearance()
        segment.setTitleTextAttributes([.font: UIFont.hoot(Letters.ui(.regular), .footnote, size: 13)], for: .normal)
        segment.setTitleTextAttributes([.font: UIFont.hoot(Letters.ui(.semibold), .footnote, size: 13)], for: .selected)
    }

    // Alleen bij een koude start: het opstartscherm met de stuiterende punt, tot er iets te lezen is.
    @State private var splash = true
    @State private var handoff = BrandHandoff() // waar "hoot." staat: in het welkom of linksboven op het actieve scherm
    private func leaveWelcome() {
        // De eerste keer: Hoot stelt je eerste Editie samen, vanaf de tik (FirstEditionMark.swift).
        store.beginFirstEdition()
        store.welcomeAgain = false
        store.onboarded = true
    }
    // Het welkom vervaagt over de Editie: 0,45 s, en de eerste keer 200 ms (dur-2; Verminder beweging 350).
    private var welcomeFade: Double {
        guard store.tienStart != nil else { return 0.45 }
        return UIAccessibility.isReduceMotionEnabled ? Tien.reduceFade / 1000 : Tien.welcomeFade / 1000
    }

    var body: some Scene {
        WindowGroup {
            // De eerste keer het welkom, daarna de app. Op dezelfde plek (geen blad eroverheen), zodat
            // het opstartscherm naadloos overgaat in het welkom en het welkom in de editie.
            Group {
                if store.onboarded {
                    WidthReader { RootView() }
                        .modifier(HootLetterMaat()) // tekst zonder eigen rol: Schibsted Grotesk, zoals het web (Letters.swift)
                } else {
                    // Opnieuw kiezen (Instellingen): alles begint bij wat je nu hebt; sluiten slaat niets op.
                    WelcomeView(reopen: store.welcomeAgain, onCancel: store.welcomeAgain ? { leaveWelcome() } : nil) { leaveWelcome() }
                }
            }
            .modifier(HootWeergave())
            .accessibilityHidden(splash) // VoiceOver niet achter het opstartscherm
            .environment(\.brandHandoff, handoff)
            .animation(.easeInOut(duration: welcomeFade), value: store.onboarded)
            .environment(store)
            .environment(account)
            .environment(alerts)
            .tint(Theme.ink) // bediening is inkt: schakelaars, waarden, tekstknoppen; rood is voor wat gekozen is
            .toggleStyle(InkSwitch())
            .overlay {
                if splash { SplashView(handoff: handoff) }
            }
            .task { await endSplash() }
            .task { await store.load() } // ook al tijdens het welkom: de Editie staat klaar als je begint
            .task { await account.start(store) }
            // Wat met je account meegaat: wegschrijven; terug in de app: ophalen.
            .onChange(of: store.syncTick) { account.changed() }
            .onReceive(NotificationCenter.default.publisher(for: UserDefaults.didChangeNotification).receive(on: RunLoop.main)) { _ in
                store.themePreferencesChanged()
            }
            .onChange(of: phase) { _, now in if now == .active { Task { await account.pull() } } }
            // Seintjes: opnieuw plannen bij elke wijziging, bij een nieuwe Editie, terug in de app en als
            // de klok verspringt.
            .task(id: alertPlan) { await planAlerts() }
            .onChange(of: phase) { _, now in if now == .active { Task { await planAlerts() } } }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.significantTimeChangeNotification)) { _ in Task { await planAlerts() } }
            .onChange(of: alerts.arrived) { Task { await store.load() } } // seintje terwijl de app open is
        }
    }

    private var alertPlan: String { "\(store.onboarded && store.notify) \(store.notifySlots.joined(separator: ",")) \(shownEdition ?? "")" }
    private func planAlerts() async { await alerts.plan(on: store.onboarded && store.notify, slots: store.notifySlots, shown: shownEdition) }
    // De Editie die de app al heeft, als "2026-10-31-ochtend": daarvoor geen seintje meer.
    private var shownEdition: String? { store.edition.flatMap { e in e.date.flatMap { d in e.slot.map { "\(d)-\($0)" } } } }

    // Minstens één hele sprong, dan weg zodra de Editie er is, uit de cache of vers (of laden mislukt);
    // hooguit 5 seconden. Niet meer wachten tot alle delen per bron binnen zijn (keuze r5-opstart, review C2):
    // die laden onder de Editie verder. De iris blijft.
    static func splashMayEnd(status: HootStore.Status, hasEdition: Bool, waited: TimeInterval) -> Bool {
        hasEdition || status == .ready || status == .failed || waited >= 5
    }

    private func endSplash() async {
        guard splash else { return }
        #if DEBUG
        if DebugLaunch.screen("opstart") { return } // `-HootScreen opstart`: blijft staan voor opnamen
        // Opnamen op een tabblad slaan het opstartscherm over; met `-HootOnboarded YES` erbij niet (zo
        // test je de opstart naar de Stroom).
        if UserDefaults.standard.string(forKey: "HootStartTab") != nil, !UserDefaults.standard.bool(forKey: "HootOnboarded") {
            splash = false; handoff.landed = true; return
        }
        #endif
        let start = Date.now
        try? await Task.sleep(for: .seconds(SplashView.bounce))
        while !Self.splashMayEnd(status: store.status, hasEdition: !store.editionRows.isEmpty, waited: Date.now.timeIntervalSince(start)) {
            try? await Task.sleep(for: .milliseconds(100))
        }
        // Dan nog even wachten tot de Editie eronder getekend is: dat houdt de hoofddraad een paar
        // tienden bezig, en een overgang die dan begint, slaat zijn eerste stuk over (het merk stond in
        // één beeld al halverwege). Rustig is: twee tikjes van 40 ms op tijd; hooguit 1 s.
        let settle = Date.now
        var calm = 0
        while calm < 2 && Date.now.timeIntervalSince(settle) < 1 {
            let tick = Date.now
            try? await Task.sleep(for: .milliseconds(40))
            calm = Date.now.timeIntervalSince(tick) < 0.07 ? calm + 1 : 0
        }
        // Naar de rode intro van het welkom: het rood blijft, alleen het woordmerk landt op "hoot."
        // linksboven, met de punt stil in zijn rust (geen sprong halverwege). De iris komt daarna, bij
        // de eerste papieren stap (WelcomeView).
        if !UIAccessibility.isReduceMotionEnabled, handoff.onRed, !store.onboarded, handoff.word != nil, handoff.dot != nil {
            if let start = handoff.bounceStart {
                // Een sprong: 1,06 s in beweging, dan 0,54 s stil. Vertrekken in het begin van die rust.
                let phase = Date.now.timeIntervalSince(start).truncatingRemainder(dividingBy: SplashView.bounce)
                if phase < 1.08 || phase > 1.5 {
                    try? await Task.sleep(for: .seconds((1.08 - phase + SplashView.bounce).truncatingRemainder(dividingBy: SplashView.bounce)))
                }
            }
            var duration = 0.7
            #if DEBUG
            duration *= max(1, UserDefaults.standard.double(forKey: "HootSlowSplash"))
            #endif
            handoff.duration = duration
            withAnimation(.timingCurve(0.6, 0, 0.2, 1, duration: duration)) { handoff.leaving = true }
            // Het woord landt in 0,55 van die tijd (SplashView); dan ligt het precies op de intro, in
            // dezelfde kleuren. Het opstartscherm vervaagt: woordmerk en rood blijven gelijk, alleen de
            // tekst van de intro komt rustig op.
            try? await Task.sleep(for: .seconds(duration * 0.55 + 0.1))
            await fadeSplash(0.3)
            splash = false
            handoff.landed = true
            return
        }
        // Op elk hoofdscherm landt de iris op de punt linksboven. Wacht bij een trage eerste
        // layout kort op de echte gemeten positie; geen geschatte coördinaten bij andere tekstmaten.
        // Met Verminder beweging blijft de overgang een rustige vervaging.
        if store.onboarded && !UIAccessibility.isReduceMotionEnabled {
            let layoutStart = Date.now
            while (handoff.word == nil || handoff.dot == nil) && Date.now.timeIntervalSince(layoutStart) < 1 {
                try? await Task.sleep(for: .milliseconds(40))
            }
        }
        // Eerst vervagen, dan reizen (IrisTimes, keuze 1.1.0): het woord vervaagt op zijn plek, de iris
        // vertrekt als het half weg is en reist in één beweging naar de gemeten punt. Een vaste curve in
        // plaats van een veer: die heeft een staart, en dan verspringt de punt op het eind.
        if !UIAccessibility.isReduceMotionEnabled {
            let lands = handoff.dot != nil && handoff.word != nil
            var slow = 1.0
            #if DEBUG
            slow = max(1, UserDefaults.standard.double(forKey: "HootSlowSplash")) // `-HootSlowSplash 6`: in slow motion
            #endif
            let duration = IrisTimes.travel * slow
            handoff.duration = duration
            withAnimation(.timingCurve(0.6, 0, 0.2, 1, duration: duration)) { handoff.leaving = true }
            // Een paar beelden marge: de curve begint later dan de klok, en het rood krimpt van
            // schermgroot tot een paar punt, dus ook het laatste procent is nog zichtbaar.
            try? await Task.sleep(for: .seconds((IrisTimes.delay + IrisTimes.travel) * slow + 0.05))
            // Op de punt: het rood wordt de kleur van de punt (in Donker en Nacht lichter), dan neemt de
            // echte punt het over. Nooit twee punten tegelijk: de iris ligt precies op de echte.
            withAnimation(.easeInOut(duration: IrisTimes.tint * slow)) { handoff.tinted = true }
            try? await Task.sleep(for: .seconds(IrisTimes.tint * slow + 0.05))
            if !lands { await fadeSplash(0.15) }
        } else {
            await fadeSplash(IrisTimes.reduced)
        }
        splash = false
        handoff.landed = true
    }

    // Vervagen en dan pas weghalen. Via `handoff`, dat SplashView zelf leest: een animatie op staat
    // van de App zelf (`.transition(.opacity)` bij het weghalen) kwam niet aan en werd een harde knip.
    private func fadeSplash(_ duration: Double) async {
        withAnimation(.easeOut(duration: duration)) { handoff.fading = true }
        try? await Task.sleep(for: .seconds(duration))
    }
}

// De vijf bestemmingen in de Liquid Glass-tabbalk; zoeken als eigen knop ernaast (rol .search).
// Bluesky zit in de Stroom: een zesde tabblad verstopt iOS achter "Meer".
// Bij omlaag scrollen krimpt de balk, zodat het lezen voorgaat.
struct RootView: View {
    @Environment(HootStore.self) private var store
    // Eén lezer per venster: op iPad met twee vensters opent een artikel alleen waar je tikt.
    @State private var reader = Reader()
    @Environment(\.scenePhase) private var phase
    @SceneStorage("tab") private var tab: Destination = .editie
    @Environment(EditionAlerts.self) private var alerts
    @Environment(\.brandHandoff) private var handoff

    enum Destination: String, Sendable { case editie, stroom, digest, bewaard, zoek }

    // Met een toetsenbord (iPad): ⌘1–4 voor de tabbladen, ⌘F zoeken, ⌘R verversen.
    private var shortcuts: some View {
        Group {
            Button("Editie") { tab = .editie }.keyboardShortcut("1")
            Button("Stroom") { tab = .stroom }.keyboardShortcut("2")
            Button("Selectie") { tab = .digest }.keyboardShortcut("3")
            Button("Bewaard") { tab = .bewaard }.keyboardShortcut("4")
            Button("Zoeken") { tab = .zoek }.keyboardShortcut("f")
            Button("Ververs") { Task { await store.load() } }.keyboardShortcut("r")
        }
        .opacity(0)
        .frame(width: 0, height: 0)
        .accessibilityHidden(true)
    }

    var body: some View {
        TabView(selection: $tab) {
            Tab("Editie", systemImage: "newspaper", value: Destination.editie) { EditionView().tint(Theme.ink).environment(\.brandHandoff, tab == .editie ? handoff : nil) }
            Tab("Stroom", systemImage: "water.waves", value: Destination.stroom) { StreamView().tint(Theme.ink).environment(\.brandHandoff, tab == .stroom ? handoff : nil) }
            Tab("Selectie", systemImage: "books.vertical", value: Destination.digest) { DigestView().tint(Theme.ink).environment(\.brandHandoff, tab == .digest ? handoff : nil) }
            Tab("Bewaard", systemImage: "bookmark", value: Destination.bewaard) { SavedView().tint(Theme.ink).environment(\.brandHandoff, tab == .bewaard ? handoff : nil) }
            Tab(value: Destination.zoek, role: .search) { SearchView().tint(Theme.ink).environment(\.brandHandoff, tab == .zoek ? handoff : nil) }
        }
        // De actieve tab is rood, zoals op het web: dat is waar je bent. De inhoud houdt de inkt.
        .tint(Theme.accent)
        .tabViewStyle(.sidebarAdaptable) // iPad en brede vensters: zijbalk of tabbalk bovenaan
        .environment(\.openTab) { tab = $0 }
        .background { if reader.item == nil { shortcuts } } // niet achter de open lezer
        .tabBarMinimizeBehavior(.onScrollDown)
        .task { await store.load() }
        #if DEBUG
        .onAppear {
            // Alleen in Debug, voor schermafbeeldingen: start op een tabblad met `-HootStartTab digest`.
            if let t = UserDefaults.standard.string(forKey: "HootStartTab"), let d = Destination(rawValue: t) { tab = d }
        }
        .task(id: store.editionRows.count) {
            // `-HootScreen lezer`: het eerste artikel van de editie in de lezer.
            // `-HootScreen lezer`: bij voorkeur een gratis, Nederlandstalig stuk (dan het hele artikel), ook
            // als dat niet het hoofdstuk van het verhaal is.
            if DebugLaunch.screen("lezer"), reader.item == nil, !store.editionRows.isEmpty {
                let all = store.editionRows.flatMap { row in [row.item] + (row.story?.itemIds.compactMap { store.itemsById[$0] } ?? []) }
                let free = { (i: Item) in store.source(i.source).map { $0.paid != true } ?? false }
                reader.item = all.first { free($0) && store.source($0.source)?.lang == "nl" } ?? all.first(where: free) ?? all.first
            }
            // `-HootScreen inloggen [-HootSource nrc]`: een stuk van die (of een andere betaalde) bron, met het
            // inlogscherm open.
            if DebugLaunch.screen("inloggen"), reader.item == nil, !store.editionRows.isEmpty {
                let id = UserDefaults.standard.string(forKey: "HootSource")
                let all = store.editionRows.flatMap { row in [row.item] + (row.story?.itemIds.compactMap { store.itemsById[$0] } ?? []) } + store.stream
                reader.item = all.first { $0.source == id && $0.link != nil }
                    ?? all.first { store.source($0.source)?.paid == true && $0.link != nil }
            }
        }
        #endif
        .debugAppearance()
        .onChange(of: phase) { _, now in
            // Terug in de app na een tijdje weg: verversen.
            // Ook na een mislukte koude start (nog niets geladen): dan meteen opnieuw proberen.
            guard now == .active else { return }
            if store.updatedAt.map({ Date.now.timeIntervalSince($0) > 15 * 60 }) ?? true || store.status == .failed { Task { await store.load() } }
        }
        // Getikt op een seintje: de lezer dicht, naar de Editie, en de nieuwe ophalen.
        .onChange(of: alerts.openEdition, initial: true) { _, open in
            guard open else { return }
            alerts.openEdition = false
            reader.item = nil
            tab = .editie
            Task { await store.load() }
        }
        .environment(reader)
        .fullScreenCover(item: $reader.item) { item in
            // Reader.open laat alleen http(s) door; mocht er toch niets te tonen zijn, dan meteen dicht.
            if let url = item.link, Reader.canShow(url) {
                // Een Bluesky-post zonder eigen link heeft geen artikel: meteen de post op bsky.app.
                if item.isPost && url.host()?.hasSuffix("bsky.app") == true {
                    SafariView(url: url, reader: false).ignoresSafeArea()
                } else {
                    ArticleReaderView(item: item).tint(Theme.ink) // niet het rood van de tabbalk
                }
            } else {
                Color.clear.onAppear { reader.item = nil }
            }
        }
    }
}

// Naar een ander tabblad gaan vanuit een scherm (bijvoorbeeld "Verder in de Stroom" onder de editie).
struct OpenTabKey: EnvironmentKey { static let defaultValue: @MainActor (RootView.Destination) -> Void = { _ in } }
extension EnvironmentValues {
    var openTab: @MainActor (RootView.Destination) -> Void {
        get { self[OpenTabKey.self] }
        set { self[OpenTabKey.self] = newValue }
    }
}
