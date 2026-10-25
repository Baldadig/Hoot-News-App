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
    @State private var confirmClear: String?

    private var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        return "\(v) (\(b))"
    }

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                Section {
                    Picker(selection: $store.images) {
                        Text("Aan").tag("aan")
                        Text("Alleen hoofdverhaal").tag("hoofd")
                        Text("Uit").tag("uit")
                    } label: {
                        Label("Beeld", systemImage: "photo")
                    }
                    Toggle(isOn: $store.bubble) {
                        Label("Buiten je bubbel", systemImage: "sparkle.magnifyingglass")
                    }
                } header: {
                    Text("Editie en Stroom")
                } footer: {
                    Text("Buiten je bubbel: één verhaal waar veel mensen nu naar zoeken en dat niet in je editie staat.")
                }

                Section {
                    Toggle(isOn: $store.openInSafari.animation()) {
                        Label("Openen in Safari", systemImage: "safari")
                    }
                    if !store.openInSafari {
                        Toggle(isOn: $store.paidInSafari) {
                            Label("Betaalde bronnen in Safari", systemImage: "creditcard")
                        }
                        Toggle(isOn: $store.readerFirst) {
                            Label("Meteen de Lezer", systemImage: "doc.plaintext")
                        }
                    }
                } header: {
                    Text("Lezen")
                } footer: {
                    Text(store.openInSafari ? "Artikelen openen in Safari, waar je ingelogd bent bij je abonnementen." : "Artikelen openen in Hoot. Daar ben je niet ingelogd bij je abonnementen; daarom openen betaalde bronnen standaard in Safari.")
                }

                Section("Bronnen en vakken") {
                    NavigationLink {
                        SourcesList().navigationTitle("Bronnen").navigationBarTitleDisplayMode(.inline)
                    } label: {
                        LabeledContent { Text("\(store.followed.count) aan") } label: { Label("Bronnen", systemImage: "dot.radiowaves.up.forward") }
                    }
                    NavigationLink {
                        DigestFieldsList().navigationTitle("Vakken").navigationBarTitleDisplayMode(.inline)
                    } label: {
                        LabeledContent { Text("\(store.digestFields.count) van \(DigestFieldsList.count)") } label: { Label("Vakken in de Digest", systemImage: "briefcase") }
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
                    Text("In de Instellingen-app van je iPhone. De tekstgrootte volgt je iPhone (Scherm en helderheid).")
                }

                Section {
                    Button(role: .destructive) { confirmClear = "gelezen" } label: {
                        Label("Gelezen vergeten", systemImage: "eye.slash")
                    }
                    Button(role: .destructive) { confirmClear = "bewaard" } label: {
                        Label("Bewaard leegmaken", systemImage: "bookmark.slash")
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
            }
            .navigationTitle("Instellingen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { dismiss() } }
            }
            .confirmationDialog(confirmClear == "bewaard" ? "Alles uit Bewaard verwijderen?" : "Vergeten wat je las?", isPresented: Binding(get: { confirmClear != nil }, set: { if !$0 { confirmClear = nil } }), titleVisibility: .visible) {
                if confirmClear == "bewaard" {
                    Button("Bewaard leegmaken", role: .destructive) { store.clearSaved() }
                } else {
                    Button("Gelezen vergeten", role: .destructive) { store.clearRead() }
                }
                Button("Annuleer", role: .cancel) {}
            } message: {
                Text(confirmClear == "bewaard" ? "Dit kun je niet ongedaan maken." : "Gelezen berichten worden weer gewoon getoond.")
            }
        }
    }
}

struct DigestFieldsList: View {
    static var count: Int { fields.count }
    @Environment(HootStore.self) private var store
    static let fields = [("paid-social", "Paid social", "megaphone"), ("ux", "UI/UX", "cursorarrow.click.2"), ("design", "Digital Design", "paintpalette"), ("ai", "AI", "sparkles"), ("ecommerce", "E-commerce", "cart")]
    var body: some View {
        Form {
            Section {
                ForEach(Self.fields, id: \.0) { id, label, icon in
                    Toggle(isOn: Binding(get: { store.digestFields.contains(id) }, set: { on in
                        store.digestFields = on ? Self.fields.map(\.0).filter { $0 == id || store.digestFields.contains($0) } : store.digestFields.filter { $0 != id }
                    })) { Label(label, systemImage: icon) }
                }
            } footer: {
                Text("Elke maandag om 7 uur per vak de drie belangrijkste stukken van de week, door mensen geschreven.")
            }
        }
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
            .sheet(isPresented: $open) { SettingsView() }
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
