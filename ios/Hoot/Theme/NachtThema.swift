import SwiftUI
import UIKit

// De gevalideerde weergavekeuze; HootStore koppelt dezelfde strings aan het webprofiel.
enum Weergave: String, CaseIterable {
    case system, light, dark, night
    init(stored: String) { self = Self(rawValue: stored) ?? .system }
    var label: String { switch self { case .system: "Systeem"; case .light: "Licht"; case .dark: "Donker"; case .night: "Nacht" } }
    var scheme: ColorScheme? { switch self { case .system: nil; case .light: .light; case .dark, .night: .dark } }
    func nightActive(systemDark: Bool, evening: String) -> Bool { self == .night || (self == .system && systemDark && evening == "night") }
}
struct NachtTrait: UITraitDefinition {
    static let defaultValue = false
    static let affectsColorAppearance = true
}
private struct NachtKey: UITraitBridgedEnvironmentKey {
    static let defaultValue = false
    static func read(from traits: UITraitCollection) -> Bool { traits[NachtTrait.self] }
    static func write(to traits: inout any UIMutableTraits, value: Bool) { traits[NachtTrait.self] = value }
}
extension EnvironmentValues {
    var nachtActief: Bool { get { self[NachtKey.self] } set { self[NachtKey.self] = newValue } }
}
enum NachtKleur {
    static let label = UIColor { traits in
        traits[NachtTrait.self] ? UIColor(named: "Ink")!.resolvedColor(with: traits) : .label
    }
    static let paper = UIColor { traits in
        traits[NachtTrait.self] && traits.userInterfaceStyle == .dark ? .black : UIColor(named: "Paper")!.resolvedColor(with: traits)
    }
}
private struct NachtBridge: UIViewRepresentable {
    let active: Bool
    let scheme: UIUserInterfaceStyle
    final class Probe: UIView {
        var active = false { didSet { apply() } }
        var scheme: UIUserInterfaceStyle = .unspecified { didSet { apply() } }
        override func didMoveToWindow() { super.didMoveToWindow(); apply() }
        func apply() {
            guard let window else { return }
            window.overrideUserInterfaceStyle = scheme
            window.traitOverrides[NachtTrait.self] = active
        }
    }
    func makeUIView(context: Context) -> Probe { Probe() }
    func updateUIView(_ view: Probe, context: Context) { view.scheme = scheme; view.active = active }
}
private struct NachtResolved: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    let choice: Weergave
    let evening: String
    func body(content: Content) -> some View {
        let active = choice.nightActive(systemDark: scheme == .dark, evening: evening)
        content.environment(\.nachtActief, active)
            .foregroundStyle(active ? Theme.ink : Color.primary)
            .background(NachtBridge(active: active, scheme: choice.scheme.map { $0 == .dark ? .dark : .light } ?? .unspecified).frame(width: 0, height: 0))
    }
}
struct HootWeergave: ViewModifier {
    @AppStorage("hoot.weergave") private var value = "system"
    @AppStorage("hoot.weergave.donker") private var evening = "dark"
    func body(content: Content) -> some View {
        let choice = Weergave(stored: value)
        content.modifier(NachtResolved(choice: choice, evening: evening)).preferredColorScheme(choice.scheme)
    }
}
struct WeergaveKeuze: View {
    @AppStorage("hoot.weergave") private var value = "system"
    @AppStorage("hoot.weergave.donker") private var evening = "dark"
    var body: some View {
        Picker("Thema", selection: Binding(get: { Weergave(stored: value).rawValue }, set: { value = $0 })) {
            ForEach(Weergave.allCases, id: \.rawValue) { option in
                Text(option.label).tag(option.rawValue).accessibilityLabel(option == .night ? "Nacht, echt zwart" : option.label)
            }
        }.frame(minHeight: Space.tap)
        if Weergave(stored: value) == .system {
            Picker("Als het donker is", selection: Binding(get: { evening == "night" ? "night" : "dark" }, set: { evening = $0 })) {
                Text("Donker").tag("dark")
                Text("Nacht").tag("night").accessibilityLabel("Nacht, echt zwart")
            }.frame(minHeight: Space.tap)
        }
    }
}

// AppStorage bewaart gewone strings, geen JSON-data zoals de overige HootStore-voorkeuren.
struct ThemePreferences: Equatable {
    let theme: String
    let dark: String
    init(theme: String, dark: String) {
        self.theme = Weergave(stored: theme).rawValue
        self.dark = ["dark", "night"].contains(dark) ? dark : "dark"
    }
    static func read(_ defaults: UserDefaults = .standard) -> Self {
        Self(theme: defaults.string(forKey: "hoot.weergave") ?? "system",
             dark: defaults.string(forKey: "hoot.weergave.donker") ?? "dark")
    }
    func write(_ defaults: UserDefaults = .standard) {
        if defaults.string(forKey: "hoot.weergave") != theme { defaults.set(theme, forKey: "hoot.weergave") }
        if defaults.string(forKey: "hoot.weergave.donker") != dark { defaults.set(dark, forKey: "hoot.weergave.donker") }
    }
}
