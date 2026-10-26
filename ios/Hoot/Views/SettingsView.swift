import SwiftUI

// Instellingen: een blad achter de knop rechtsboven, volgens de Human Interface Guidelines:
// - alleen wat je in de app vaak wilt aanpassen; wat bij het systeem hoort (meldingen,
//   achtergrond, tekstgrootte) via de pagina van Hoot in de Instellingen-app;
// - geen eigen licht/donker: de app volgt de keuze van je iPhone;
// - geen opties die (nog) niet werken of nu niet van toepassing zijn;
// - wissen alleen na bevestiging, met Annuleer.
struct SettingsView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var confirmClear: String? = DebugLaunch.screen("instellingen-wissen") ? "gelezen" : nil
    @State private var path: [String] = DebugLaunch.screen("instellingen-bronnen") ? ["bronnen"] : DebugLaunch.screen("instellingen-vakken") ? ["vakken"] : []

    private var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        return "\(v) (\(b))"
    }

    var body: some View {
        @Bindable var store = store
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
            Form {
                Section {
                    Picker(selection: $store.images) {
                        Text("Aan").tag("aan")
                        Text("Alleen hoofdverhaal").tag("hoofd")
                        Text("Uit").tag("uit")
                    } label: {
                        Label("Afbeeldingen", systemImage: "photo")
                    }
                    Picker(selection: $store.preview) {
                        Text("1 regel").tag(1)
                        Text("2 regels").tag(2)
                        Text("3 regels").tag(3)
                        Text("Hele intro").tag(0)
                    } label: {
                        Label("Intro bij berichten", systemImage: "text.alignleft")
                    }
                    Toggle(isOn: $store.bubble) {
                        Label("Buiten je bubbel", systemImage: "sparkle.magnifyingglass")
                    }
                } header: {
                    Text("Editie en Stroom")
                } footer: {
                    Text("Buiten je bubbel: één verhaal waar veel mensen nu naar zoeken en dat niet in je editie staat.").foregroundStyle(Theme.muted)
                }

                // Eén keuze (waar openen artikelen), met de uitzonderingen alleen als die gelden.
                Section {
                    Picker(selection: $store.openInSafari.animation()) {
                        Text("In Hoot").tag(false)
                        Text("In Safari").tag(true)
                    } label: {
                        Label("Artikelen openen", systemImage: "safari")
                    }
                    if !store.openInSafari {
                        Toggle(isOn: $store.paidInSafari) {
                            Label("Abonnementsbronnen in Safari", systemImage: "creditcard")
                        }
                        Toggle(isOn: $store.readerFirst) {
                            Label("Lezer automatisch openen", systemImage: "doc.plaintext")
                        }
                    }
                } header: {
                    Text("Lezen")
                } footer: {
                    Text(store.openInSafari ? "In Safari ben je ingelogd bij je abonnementen." : "In Hoot ben je niet ingelogd bij je abonnementen; daarom openen abonnementsbronnen standaard in Safari. De Lezer opent alleen als het artikel dat ondersteunt.").foregroundStyle(Theme.muted)
                }

                Section {
                    Toggle(isOn: $store.bluesky) {
                        Label("Bluesky in de Stroom", systemImage: "bubble.left.and.bubble.right")
                    }
                    if store.bluesky {
                        NavigationLink(value: "bluesky") {
                            LabeledContent { Text("\(store.followedSocial.count) aan") } label: { Label("Bluesky-accounts", systemImage: "person.2") }
                        }
                    }
                } header: {
                    Text("Bluesky")
                } footer: {
                    Text("Bovenaan de Stroom kies je dan tussen het nieuws en de posts van de mensen die je volgt.").foregroundStyle(Theme.muted)
                }

                Section("Bronnen en vakken") {
                    NavigationLink(value: "bronnen") {
                        LabeledContent { Text("\(store.followed.count) aan") } label: { Label("Bronnen", systemImage: "dot.radiowaves.up.forward") }
                    }
                    NavigationLink(value: "vakken") {
                        LabeledContent { Text("\(store.digestFields.filter(store.offersField).count) van \(DigestFieldsList.fields.map(\.0).filter(store.offersField).count)") } label: { Label("Vakgebieden", systemImage: "briefcase") }
                    }
                }

                Section {
                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    } label: {
                        OutboundRow(title: "Meldingen en achtergrond", systemImage: "gearshape")
                    }
                    .foregroundStyle(.primary)
                    .accessibilityHint("Opent Hoot in de Instellingen-app")
                } footer: {
                    Text("In de Instellingen-app van je iPhone. De tekstgrootte volgt je iPhone (Toegankelijkheid › Weergave en tekstgrootte).").foregroundStyle(Theme.muted)
                }

                Section {
                    Button(role: .destructive) { confirmClear = "gelezen" } label: {
                        Label("Alles als ongelezen markeren", systemImage: "eye.slash")
                    }
                    Button(role: .destructive) { confirmClear = "bewaard" } label: {
                        Label("Bewaarde artikelen verwijderen", systemImage: "bookmark.slash")
                    }
                    .disabled(store.saved.isEmpty)
                } header: {
                    Text("Op deze iPhone")
                }

                Section("Over") {
                    LabeledContent("Versie", value: version)
                    LabeledContent("Gemaakt door", value: "Alex Vrees")
                    Link(destination: URL(string: "https://hootnews.nl/#/privacy")!) { OutboundRow(title: "Privacybeleid", systemImage: "hand.raised") }.foregroundStyle(.primary)
                    Link(destination: URL(string: "https://hootnews.nl")!) { OutboundRow(title: "hootnews.nl", systemImage: "globe") }.foregroundStyle(.primary)
                }
                .id("over")
            }
            .debugJump(proxy, to: "over", when: 0)
            .task { await store.loadDigest() } // voor het aantal vakgebieden dat de server levert
            }
            .navigationTitle("Instellingen")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { page in
                if page == "bronnen" {
                    SourcesList().navigationTitle("Bronnen").navigationBarTitleDisplayMode(.inline)
                } else if page == "bluesky" {
                    BlueskyAccountsView()
                } else {
                    DigestFieldsList().navigationTitle("Vakgebieden").navigationBarTitleDisplayMode(.inline)
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { dismiss() } }
            }
            // Een melding met een zichtbare Annuleer (een actieblad zonder die knop laat de veilige
            // uitweg aan een tik ernaast over), en precies wat er verandert.
            .alert(confirmClear == "bewaard" ? "Alle bewaarde artikelen verwijderen?" : "Alles als ongelezen markeren?", isPresented: Binding(get: { confirmClear != nil }, set: { if !$0 { confirmClear = nil } })) {
                Button("Annuleer", role: .cancel) {}
                if confirmClear == "bewaard" {
                    Button("Verwijder", role: .destructive) { store.clearSaved() }
                } else {
                    Button("Markeer als ongelezen", role: .destructive) { store.clearRead() }
                }
            } message: {
                Text(confirmClear == "bewaard" ? "\(store.saved.count == 1 ? "1 artikel verdwijnt" : "\(store.saved.count) artikelen verdwijnen") uit Bewaard. Dit kun je niet ongedaan maken." : "Wat je las, wordt weer gewoon getoond. Je bewaarde artikelen blijven staan.")
            }
        }
    }
}

struct DigestFieldsList: View {
    @Environment(HootStore.self) private var store
    static let fields = [("paid-social", "Paid social", "megaphone"), ("ux", "UI/UX", "cursorarrow.click.2"), ("design", "Digital Design", "paintpalette"), ("ai", "AI", "sparkles"), ("ecommerce", "E-commerce", "cart")]
    var body: some View {
        Form {
            Section {
                ForEach(Self.fields, id: \.0) { id, label, icon in
                    // Een vak dat de server (nog) niet levert, kun je niet aanzetten.
                    let offered = store.offersField(id)
                    Toggle(isOn: Binding(get: { offered && store.digestFields.contains(id) }, set: { on in
                        store.digestFields = on ? Self.fields.map(\.0).filter { $0 == id || store.digestFields.contains($0) } : store.digestFields.filter { $0 != id }
                    })) {
                        Label {
                            HStack(spacing: 6) {
                                Text(label)
                                if !offered { Text("binnenkort").font(.caption).foregroundStyle(Theme.muted) }
                            }
                        } icon: { Image(systemName: icon) }
                    }
                    .disabled(!offered)
                }
            } footer: {
                Text("Elke maandag om 7 uur per vak de drie belangrijkste stukken van de week, door mensen geschreven.").foregroundStyle(Theme.muted)
            }
        }
        .task { await store.loadDigest() }
    }
}

// De knop rechtsboven op elk scherm; opent de instellingen. (Wordt je account-foto zodra je kunt inloggen.)
struct AccountButton: ToolbarContent {
    @Binding var open: Bool
    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button("Instellingen", systemImage: "gearshape") { open = true }
        }
    }
}

extension View {
    // Account-knop plus het instellingenblad.
    func settingsButton() -> some View { modifier(SettingsButton()) }
}

private struct SettingsButton: ViewModifier {
    @State private var open = false
    func body(content: Content) -> some View {
        content
            .toolbar { AccountButton(open: $open) }
            .sheet(isPresented: $open) { SettingsView().debugAppearance() }
            .onAppear { if DebugLaunch.screen?.hasPrefix("instellingen") == true { open = true } }
    }
}

// Een rij die de app verlaat (Instellingen-app, website): gewone tekst met ↗ rechts, zoals Apple.
struct OutboundRow: View {
    let title: String
    let systemImage: String
    var body: some View {
        HStack {
            Label { Text(title).foregroundStyle(.primary) } icon: { Image(systemName: systemImage).foregroundStyle(Theme.accent) }
            Spacer()
            Image(systemName: "arrow.up.forward").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
        }
    }
}
