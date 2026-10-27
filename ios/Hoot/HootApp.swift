import SwiftUI

@main
struct HootApp: App {
    @State private var store = HootStore()

    init() {
        // Beelden bewaren tussen scrollen en starten (AsyncImage cachet zelf pas vanaf iOS 27).
        URLCache.shared = URLCache(memoryCapacity: 64 << 20, diskCapacity: 300 << 20)
    }

    var body: some Scene {
        WindowGroup {
            WidthReader { RootView() }
                .environment(store)
                .tint(Theme.accent)
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

    enum Destination: String { case editie, stroom, digest, bewaard, zoek }

    // Met een toetsenbord (iPad): ⌘1–4 voor de tabbladen, ⌘F zoeken, ⌘R verversen.
    private var shortcuts: some View {
        Group {
            Button("Editie") { tab = .editie }.keyboardShortcut("1")
            Button("Stroom") { tab = .stroom }.keyboardShortcut("2")
            Button("Digest") { tab = .digest }.keyboardShortcut("3")
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
            Tab("Digest", systemImage: "briefcase", value: Destination.digest) { DigestView() }
            Tab("Bewaard", systemImage: "bookmark", value: Destination.bewaard) { SavedView() }
            Tab(value: Destination.zoek, role: .search) { SearchView() }
        }
        .tabViewStyle(.sidebarAdaptable) // iPad en brede vensters: zijbalk of tabbalk bovenaan
        .background { shortcuts }
        .tabBarMinimizeBehavior(.onScrollDown)
        .task { await store.load() }
        #if DEBUG
        .onAppear {
            // Alleen in Debug, voor schermafbeeldingen: start op een tabblad met `-HootStartTab digest`.
            if let t = UserDefaults.standard.string(forKey: "HootStartTab"), let d = Destination(rawValue: t) { tab = d }
        }
        .task(id: store.editionRows.count) {
            // `-HootScreen lezer`: het eerste artikel van de editie in de lezer.
            if DebugLaunch.screen("lezer"), reader.item == nil, let row = store.editionRows.first { reader.item = row.item }
        }
        #endif
        .debugAppearance()
        .onChange(of: phase) { _, now in
            // Terug in de app na een tijdje weg: verversen.
            if now == .active, let at = store.updatedAt, Date.now.timeIntervalSince(at) > 15 * 60 { Task { await store.load() } }
        }
        .environment(reader)
        .fullScreenCover(item: $reader.item) { item in
            // Reader.open laat alleen http(s) door; mocht er toch niets te tonen zijn, dan meteen dicht.
            if let url = item.link, Reader.canShow(url) {
                if store.openWith == "web" {
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
