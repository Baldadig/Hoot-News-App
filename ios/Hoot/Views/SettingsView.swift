import SwiftUI

// Instellingen: een blad achter de account-knop rechtsboven (zoals in de App Store en Apple
// News). Zelfde keuzes als op hootnews.nl, in de vorm van een iOS-formulier.
struct SettingsView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
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
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Inloggen")
                            Text("Met Google of Apple, in de volgende versie.").font(.caption).foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "person.crop.circle.fill").font(.title).foregroundStyle(.secondary)
                    }
                } footer: {
                    Text("Dan gaan je bronnen, Bewaard en wat je las mee naar je andere toestellen en hootnews.nl.")
                }

                Section {
                    Picker("Thema", selection: $store.theme) {
                        Text("Systeem").tag("system")
                        Text("Licht").tag("light")
                        Text("Donker").tag("dark")
                    }
                    .pickerStyle(.segmented)
                    Picker("Beeld", selection: $store.images) {
                        Text("Aan").tag("aan")
                        Text("Alleen hoofdverhaal").tag("hoofd")
                        Text("Uit").tag("uit")
                    }
                } header: {
                    Text("Weergave")
                } footer: {
                    Text("De tekstgrootte volgt je iPhone: Instellingen → Scherm en helderheid → Tekstgrootte.")
                }

                Section {
                    Toggle("Buiten je bubbel", isOn: $store.bubble)
                } header: {
                    Text("Editie")
                } footer: {
                    Text("Eén verhaal waar veel mensen nu naar zoeken en dat niet in je editie staat.")
                }

                Section {
                    Toggle("Openen in Safari", isOn: $store.openInSafari)
                    Toggle("Meteen de Lezer", isOn: $store.readerFirst)
                        .disabled(store.openInSafari)
                } header: {
                    Text("Lezen")
                } footer: {
                    Text(store.openInSafari ? "Artikelen openen in Safari zelf." : "Artikelen openen in de app, met je inlog van Safari. De Lezer toont alleen de tekst, als de site dat toelaat.")
                }

                Section("Bronnen en vakken") {
                    NavigationLink {
                        SourcesList().navigationTitle("Bronnen")
                    } label: {
                        LabeledContent("Bronnen", value: "\(store.followed.count) aan")
                    }
                    NavigationLink {
                        DigestFieldsList().navigationTitle("Vakken in de Digest")
                    } label: {
                        LabeledContent("Vakken in de Digest", value: "\(store.digestFields.count) van 3")
                    }
                }

                Section("Op dit toestel") {
                    Button("Gelezen vergeten") { confirmClear = "gelezen" }
                    Button("Bewaard leegmaken", role: .destructive) { confirmClear = "bewaard" }
                        .disabled(store.saved.isEmpty)
                }

                Section("Over") {
                    LabeledContent("Hoot", value: version)
                    LabeledContent("Gemaakt door", value: "Alex Vrees")
                    Link(destination: URL(string: "https://hootnews.nl/#/privacy")!) { Label("Privacy", systemImage: "hand.raised") }
                    Link(destination: URL(string: "https://hootnews.nl")!) { Label("hootnews.nl", systemImage: "safari") }
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
            }
        }
    }
}

struct DigestFieldsList: View {
    @Environment(HootStore.self) private var store
    private let fields = [("paid-social", "Paid social", "megaphone"), ("ux", "UI/UX", "cursorarrow.click.2"), ("design", "Design in digital", "paintpalette")]
    var body: some View {
        Form {
            Section {
                ForEach(fields, id: \.0) { id, label, icon in
                    Toggle(isOn: Binding(get: { store.digestFields.contains(id) }, set: { on in
                        store.digestFields = on ? fields.map(\.0).filter { $0 == id || store.digestFields.contains($0) } : store.digestFields.filter { $0 != id }
                    })) { Label(label, systemImage: icon) }
                }
            } footer: {
                Text("Elke maandag om 7 uur per vak de drie belangrijkste stukken van de week, door mensen geschreven.")
            }
        }
    }
}

// De account-knop rechtsboven op elk scherm; opent de instellingen.
struct AccountButton: ToolbarContent {
    @Binding var open: Bool
    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button("Instellingen", systemImage: "person.crop.circle") { open = true }
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
