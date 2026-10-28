import SwiftUI

@main
struct HootApp: App {
    @State private var store = HootStore()
    @State private var account = Account()
    @Environment(\.scenePhase) private var phase

    init() {
        // Beelden bewaren tussen scrollen en starten (AsyncImage cachet zelf pas vanaf iOS 27).
        URLCache.shared = URLCache(memoryCapacity: 64 << 20, diskCapacity: 300 << 20)
        // Schermtitels (Middageditie, Stroom, Selectie …) in de krantenletter, zoals op de website: groot
        // op 800, klein in de balk op 700. Groeit mee met de tekstgrootte, de grote titel tot 40 pt:
        // daarboven werd "Ochtendeditie" op een mini "Ochtended…".
        func serif(_ style: UIFont.TextStyle, _ weight: UIFont.Weight, max: CGFloat = .infinity) -> UIFont {
            let d = UIFontDescriptor.preferredFontDescriptor(withTextStyle: style)
            let serif = (d.withDesign(.serif) ?? d).addingAttributes([.traits: [UIFontDescriptor.TraitKey.weight: weight]])
            return UIFont(descriptor: serif, size: min(d.pointSize, max))
        }
        let bar = UINavigationBar.appearance()
        bar.largeTitleTextAttributes = [.font: serif(.largeTitle, .heavy, max: 40)]
        bar.titleTextAttributes = [.font: serif(.headline, .bold)]
    }

    // Alleen bij een koude start: het opstartscherm met de stuiterende punt, tot er iets te lezen is.
    @State private var splash = true
    @State private var handoff = BrandHandoff() // waar "hoot." in het welkom staat

    var body: some Scene {
        WindowGroup {
            // De eerste keer het welkom, daarna de app. Op dezelfde plek (geen blad eroverheen), zodat
            // het opstartscherm naadloos overgaat in het welkom en het welkom in de editie.
            Group {
                if store.onboarded {
                    WidthReader { RootView() }
                } else {
                    WelcomeView()
                }
            }
            .accessibilityHidden(splash) // VoiceOver niet achter het opstartscherm
            .environment(\.brandHandoff, handoff)
            .animation(.easeInOut(duration: 0.45), value: store.onboarded)
            .environment(store)
            .environment(account)
            .tint(Theme.accent)
            .overlay {
                if splash { SplashView(handoff: handoff).transition(.opacity) }
            }
            .task { await endSplash() }
            .task { await store.load() } // ook al tijdens het welkom: de editie staat klaar als je begint
            .task { await account.start(store) }
            // Wat met je account meegaat: wegschrijven; terug in de app: ophalen.
            .onChange(of: store.syncTick) { account.changed() }
            .onChange(of: phase) { _, now in if now == .active { Task { await account.pull() } } }
        }
    }

    // Minstens één hele sprong, dan weg zodra de editie er is (of laden mislukt); hooguit 5 seconden.
    private func endSplash() async {
        guard splash else { return }
        #if DEBUG
        if DebugLaunch.screen("opstart") { return } // `-HootScreen opstart`: blijft staan voor opnamen
        if UserDefaults.standard.string(forKey: "HootStartTab") != nil { splash = false; return }
        #endif
        let start = Date.now
        try? await Task.sleep(for: .seconds(SplashView.bounce))
        while store.status != .ready && store.status != .failed && Date.now.timeIntervalSince(start) < 5 {
            try? await Task.sleep(for: .milliseconds(100))
        }
        // Naar het welkom: het woordmerk landt op "hoot." en het rood sluit zich als een iris tot de rode
        // punt; de rand veegt de witte letters weg en de inkt staat er al. Naar de app, zonder plek of
        // met "Verminder beweging": gewoon vervagen.
        if !store.onboarded, handoff.dot != nil, handoff.word != nil, !UIAccessibility.isReduceMotionEnabled {
            var duration = 1.0
            #if DEBUG
            duration *= max(1, UserDefaults.standard.double(forKey: "HootSlowSplash")) // `-HootSlowSplash 6`: in slow motion
            #endif
            handoff.duration = duration
            withAnimation(.smooth(duration: duration)) { handoff.leaving = true }
            try? await Task.sleep(for: .seconds(duration))
            splash = false
        } else {
            withAnimation(.easeOut(duration: 0.35)) { splash = false }
        }
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
            Tab("Editie", systemImage: "newspaper", value: Destination.editie) { EditionView() }
            Tab("Stroom", systemImage: "water.waves", value: Destination.stroom) { StreamView() }
            Tab("Selectie", systemImage: "sparkles", value: Destination.digest) { DigestView() }
            Tab("Bewaard", systemImage: "bookmark", value: Destination.bewaard) { SavedView() }
            Tab(value: Destination.zoek, role: .search) { SearchView() }
        }
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
        .environment(reader)
        .fullScreenCover(item: $reader.item) { item in
            // Reader.open laat alleen http(s) door; mocht er toch niets te tonen zijn, dan meteen dicht.
            if let url = item.link, Reader.canShow(url) {
                // Een Bluesky-post zonder eigen link heeft geen artikel: meteen de post op bsky.app.
                if store.openWith == "web" || (item.isPost && url.host()?.hasSuffix("bsky.app") == true) {
                    SafariView(url: url, reader: store.readerFirst).ignoresSafeArea()
                } else {
                    ArticleReaderView(item: item)
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
