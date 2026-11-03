import SwiftUI
import UIKit
import Observation

// iOS bewaart de keuze. De leesstand van Hoot verandert het beginschermicoon nooit.
enum AppIconChoice: String, CaseIterable, Identifiable {
    case red, roomy, paper, black
    var id: String { rawValue }
    var name: String { switch self { case .red: "Papier op rood"; case .roomy: "Ruim rood"; case .paper: "Rood op papier"; case .black: "Papier op inkt" } }
    var asset: String { switch self { case .red: "IcoonRood"; case .roomy: "IcoonRuim"; case .paper: "IcoonPapier"; case .black: "IcoonZwart" } }
    var iconName: String? { switch self { case .red: nil; case .roomy: "AppIconRuim"; case .paper: "AppIconPapier"; case .black: "AppIconZwart" } }
}
@MainActor protocol AppIconSystem {
    var supported: Bool { get }
    var currentName: String? { get }
    func change(to name: String?) async throws
}
@MainActor struct UIKitAppIconSystem: AppIconSystem {
    var supported: Bool { UIApplication.shared.supportsAlternateIcons }
    var currentName: String? { UIApplication.shared.alternateIconName }
    func change(to name: String?) async throws { try await IOSIconChange(name:name).run() }
}
// Sommige simulatorversies melden de wissel niet terug hoewel iOS de nieuwe naam al
// bewaart. Lees daarom de systeemwaarheid; laat een ontbrekende callback de knop niet vastzetten.
@MainActor private final class IOSIconChange {
    let name: String?
    private var continuation: CheckedContinuation<Void, Error>?
    private var watcher: Task<Void, Never>?
    init(name:String?) {self.name=name}
    func run() async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation=continuation
            UIApplication.shared.setAlternateIconName(name) { error in
                Task { @MainActor in self.finish(error) }
            }
            watcher=Task { @MainActor in
                for _ in 0..<40 {
                    do {try await Task.sleep(for:.milliseconds(250))} catch {return}
                    guard self.continuation != nil else {return}
                    if UIApplication.shared.alternateIconName == self.name {self.finish(nil);return}
                }
                self.finish(NSError(domain:"HootAppIcon",code:1,userInfo:[NSLocalizedDescriptionKey:"iOS heeft de icoonwissel nog niet bevestigd."]))
            }
        }
    }
    private func finish(_ error:Error?) {
        guard let continuation else {return}
        self.continuation=nil;watcher?.cancel();watcher=nil
        if let error {continuation.resume(throwing:error)} else {continuation.resume()}
    }
}
@MainActor @Observable final class AppIconSelection {
    private let system: any AppIconSystem
    private(set) var currentName: String?
    private(set) var busy = false
    var error: String?
    var supported: Bool { system.supported }
    var selected: AppIconChoice? { AppIconChoice.allCases.first { $0.iconName == currentName } }
    init(system: any AppIconSystem = UIKitAppIconSystem()) {
        self.system = system
        currentName = system.currentName
    }
    func refresh() { currentName = system.currentName }
    func choose(_ choice: AppIconChoice) async {
        guard !busy, choice.iconName != system.currentName else { refresh(); return }
        guard supported else { error = "Je toestel kan het app-icoon nu niet veranderen."; return }
        busy = true; error = nil
        defer { refresh(); busy = false }
        do { try await system.change(to: choice.iconName) }
        catch { self.error = "Het app-icoon is niet veranderd. Probeer het opnieuw." }
    }
}
struct AppIconPicker: View {
    @State private var selection = AppIconSelection()
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        @Bindable var selection = selection
        Form {
            Section {
                ForEach(AppIconChoice.allCases) { choice in
                    Button {
                        Task { await selection.choose(choice) }
                    } label: {
                        HStack(spacing: Space.s3) {
                            Image(choice.asset).resizable().scaledToFit()
                                .frame(width: Space.tap, height: Space.tap)
                                .clipShape(RoundedRectangle(cornerRadius: Radius.md))
                                .overlay(RoundedRectangle(cornerRadius: Radius.md).stroke(selection.selected == choice ? Theme.accent : Theme.rule, lineWidth: 1))
                                .accessibilityHidden(true)
                            Text(choice.name).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: Space.s2)
                            if selection.selected == choice { Image(systemName: "checkmark").foregroundStyle(Theme.accent).accessibilityHidden(true) }
                        }.frame(minHeight: Space.tap).contentShape(Rectangle())
                    }
                    .disabled(selection.busy || !selection.supported)
                    .accessibilityLabel(choice.name)
                    .accessibilityAddTraits(selection.selected == choice ? [.isSelected] : [])
                    .accessibilityHint("Verandert het icoon op je beginscherm")
                }
            } footer: {
                Text("Bij donkere iOS-iconen is elke keuze zwart. Je leesstand in Hoot verandert het icoon niet. iOS kan een bevestiging tonen.").foregroundStyle(Theme.ink3)
            }.hootRows()
        }.hootForm()
            .navigationTitle("App-icoon").navigationBarTitleDisplayMode(.inline)
            .onChange(of: scenePhase) { _, next in if next == .active { selection.refresh() } }
            .alert("App-icoon", isPresented: Binding(get: { selection.error != nil }, set: { if !$0 { selection.error = nil } })) {
                Button("OK", role: .cancel) { selection.error = nil }
            } message: { Text(selection.error ?? "") }
    }
}
