import SwiftUI

// "hoot." groot, met de ademende punt: het inlogscherm. Een tekening (`BrandWord`) op de maat van
// het opstartscherm (160 breed); één maat, ook bij grote tekst. Het kan melden waar het woord en de
// punt staan (`BrandHandoff`), zodat het opstartscherm er precies naartoe kan bewegen.
struct IntroMark: View {
    @Environment(\.brandHandoff) private var handoff
    @Environment(\.accessibilityReduceMotion) private var still

    var body: some View {
        // Ademen pas als het rood geland is: anders is de punt net kleiner of groter dan waar het rood
        // op uitkomt, en verspringt hij als het opstartscherm weggaat.
        BrandWord(scale: 1, handoff: handoff, breathes: !still && handoff?.landed != false)
            .accessibilityElement()
            .accessibilityLabel("Hoot")
    }
}

// Waar "hoot." staat (in schermcoördinaten), voor de overgang vanaf het opstartscherm: klein
// linksboven op de rode intro van het welkom (`WelcomeMark`) of op het actieve hoofdscherm (`Wordmark(handoff: true)`).
// Het welkom heeft er ook een eigen: voor de iris van de rode intro naar de eerste papieren stap.
@MainActor
@Observable
final class BrandHandoff {
    var word: CGRect?
    var dot: CGRect?
    private(set) var targetOwner: UUID?
    func registerWord(_ frame: CGRect, owner: UUID?) {
        if targetOwner != owner { word = nil; dot = nil }
        targetOwner = owner
        word = frame
    }
    func registerDot(_ frame: CGRect, owner: UUID?) {
        if targetOwner != owner { word = nil; dot = nil }
        targetOwner = owner
        dot = frame
    }
    func clearTarget(owner: UUID) {
        guard targetOwner == owner else { return }
        word = nil; dot = nil; targetOwner = nil
    }
    var onRed = false // "hoot." staat op merkrood (de intro): het rood blijft, alleen het woordmerk landt
    var bounceStart: Date? // wanneer de punt van het opstartscherm begon te stuiteren
    var leaving = false // het opstartscherm beweegt erheen: het rood krimpt tot de punt
    var tinted = false // het rood kleurt naar de kleur van de punt (in donker lichter)
    var fading = false // het opstartscherm vervaagt (zonder iris, of na de iris naar zijn eigen punt)
    var landed = false // het opstartscherm is weg; de punt mag ademen, de Editie staat op zijn plek
    var duration = 0.7 // hoe lang die overgang duurt
}
private struct BrandHandoffKey: EnvironmentKey { static let defaultValue: BrandHandoff? = nil }
extension EnvironmentValues {
    var brandHandoff: BrandHandoff? {
        get { self[BrandHandoffKey.self] }
        set { self[BrandHandoffKey.self] = newValue }
    }
}
