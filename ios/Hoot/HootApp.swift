import SwiftUI

@main
struct HootApp: App {
    @State private var store = HootStore()
    @State private var reader = Reader()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(reader)
                .tint(Theme.accent)
        }
    }
}

// De vijf bestemmingen in de Liquid Glass-tabbalk; zoeken als eigen knop ernaast (rol .search).
// Bij omlaag scrollen krimpt de balk, zodat het lezen voorgaat.
struct RootView: View {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader
    @Environment(\.scenePhase) private var phase
    @SceneStorage("tab") private var tab: Destination = .editie

    enum Destination: String { case editie, stroom, digest, bewaard, zoek }

    var body: some View {
        @Bindable var reader = reader
        TabView(selection: $tab) {
            Tab("Editie", systemImage: "newspaper", value: Destination.editie) { EditionView() }
            Tab("Stroom", systemImage: "water.waves", value: Destination.stroom) { StreamView() }
            Tab("Digest", systemImage: "briefcase", value: Destination.digest) { DigestView() }
            Tab("Bewaard", systemImage: "bookmark", value: Destination.bewaard) { SavedView() }
            Tab(value: Destination.zoek, role: .search) { SearchView() }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .task { await store.load() }
        .onChange(of: phase) { _, now in
            // Terug in de app na een tijdje weg: verversen.
            if now == .active, let at = store.updatedAt, Date.now.timeIntervalSince(at) > 15 * 60 { Task { await store.load() } }
        }
        .fullScreenCover(item: $reader.item) { item in
            if let url = item.link { SafariView(url: url, reader: store.readerFirst).ignoresSafeArea() }
        }
        .preferredColorScheme(store.theme == "light" ? .light : store.theme == "dark" ? .dark : nil)
    }
}
