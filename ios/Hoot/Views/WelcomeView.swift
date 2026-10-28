import SwiftUI

// Het welkom, één keer bij de eerste start: een merkmoment in merkrood, met dezelfde belofte als
// op de website. Daarna meteen lezen, of eerst je interesses kiezen.
struct WelcomeView: View {
    @Environment(HootStore.self) private var store
    @State private var setup = false
    @State private var login = false

    var body: some View {
        NavigationStack {
            // Eén scherm, in één oogopslag: belofte, drie onderdelen en de knoppen eronder (nooit
            // eroverheen). Past het niet (heel grote tekst), dan scrolt het.
            GeometryReader { geo in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("hoot.")
                            .font(.system(.title3, design: .serif, weight: .heavy))
                            .accessibilityLabel("Hoot")
                        Spacer(minLength: Space.s6)
                        // Twee zinnen, twee regels; de letter krimpt mee op een smal scherm.
                        Text("Minder scrollen.\nMeer lezen.")
                            .font(.system(size: 44, weight: .heavy, design: .serif))
                            .lineLimit(2)
                            .minimumScaleFactor(0.6)
                            .accessibilityAddTraits(.isHeader)
                        Text("Het nieuws van jouw bronnen,\nrustig op een rij.") // twee gelijke regels, ook op de mini
                            .font(.title3)
                            .foregroundStyle(Theme.onBrandRed.opacity(0.85))
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, Space.s3)
                        VStack(alignment: .leading, spacing: Space.s4) {
                            point("newspaper", "Je editie", "Drie keer per dag tien verhalen.")
                            point("water.waves", "De Stroom", "Alles van je bronnen, nieuwste eerst.")
                            point("briefcase", "Je Digest", "Eén keer per week bijgepraat over wat jou bezighoudt.")
                        }
                        .padding(.top, Space.s6)
                        Spacer(minLength: Space.s6)
                        // Voorop: zelf samenstellen, of je account. Even rondkijken mag, maar is de zijweg.
                        VStack(spacing: Space.s2) {
                            Button { setup = true } label: {
                                Text("Stel je Hoot samen").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
                            }
                            .foregroundStyle(Theme.brandRed)
                            .background(Theme.onBrandRed, in: Capsule())
                            Button { login = true } label: {
                                Text("Log in met je account").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
                            }
                            .overlay(Capsule().strokeBorder(Theme.onBrandRed.opacity(0.6), lineWidth: 1.5))
                            // Gratis Nederlandse bronnen (HootStore.starter); na een stukje editie vraagt Hoot of je zelf kiest.
                            Button { store.quickStart() } label: {
                                Text("Of kijk eerst even rond").underline()
                            }
                            .font(.subheadline)
                            .foregroundStyle(Theme.onBrandRed.opacity(0.85))
                            .frame(maxWidth: .infinity, minHeight: Space.tap)
                            .padding(.top, Space.s1)
                        }
                    }
                    .padding(.horizontal, Space.s5)
                    .padding(.vertical, Space.s4)
                    .frame(maxWidth: Layout.readable, alignment: .leading)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
            .foregroundStyle(Theme.onBrandRed)
            .background(Theme.brandRed)
            .navigationDestination(isPresented: $login) {
                AccountView { store.onboarded = true }
                    .tint(Theme.accent)
                    .navigationTitle("Inloggen")
            }
            .navigationDestination(isPresented: $setup) {
                SetupSteps { store.onboarded = true }
            }
        }
        .tint(Theme.onBrandRed)
        .interactiveDismissDisabled()
    }

    // Icoon op de regel van de titel; de uitleg gedempt, zodat de titel voorgaat.
    private func point(_ icon: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
            Image(systemName: icon)
                .font(.headline)
                .frame(width: Space.s5)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: Space.s0) {
                Text(title).font(.headline)
                Text(text).font(.subheadline).foregroundStyle(Theme.onBrandRed.opacity(0.85))
            }
            .accessibilityElement(children: .combine)
        }
    }
}

// Je Hoot samenstellen: interesses, bronnen, dan je vak. In het welkom en vanuit de editie (na
// even rondkijken). Overslaan mag bij elke stap: dan blijft wat er stond.
struct SetupSteps: View {
    var onDone: () -> Void
    @State private var sources = false
    @State private var fields = false

    var body: some View {
        InterestsList()
            .tint(Theme.accent) // een gewone, lichte lijst: niet het wit van het rode scherm
            .navigationTitle("Interesses")
            // De knoppen in de balk zelf in accent: de balk neemt de tint van het welkom over (wit), en
            // dan stond "Verder" wit op wit glas.
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Verder") { sources = true }.tint(Theme.accent) } }
            .navigationDestination(isPresented: $sources) {
                SourcesList()
                    .tint(Theme.accent)
                    .navigationTitle("Je bronnen")
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Verder") { fields = true }.tint(Theme.accent) } }
                    .navigationDestination(isPresented: $fields) {
                        // Daarna je vak, voor de Digest.
                        DigestFieldsList()
                            .tint(Theme.accent)
                            .navigationTitle("En je vak?")
                            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { onDone() }.tint(Theme.accent) } }
                    }
            }
    }
}
