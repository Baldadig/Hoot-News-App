import SwiftUI

// Het welkom, één keer bij de eerste start: een merkmoment in merkrood, met dezelfde belofte als
// op de website. Daarna meteen lezen, of eerst je interesses kiezen.
struct WelcomeView: View {
    @Environment(HootStore.self) private var store
    @State private var interests = false
    @State private var fields = false

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
                            point("briefcase", "Je Digest", "Elke maandag het beste uit je vak.")
                        }
                        .padding(.top, Space.s6)
                        Spacer(minLength: Space.s6)
                        VStack(spacing: Space.s2) {
                            Button { store.onboarded = true } label: {
                                Text("Begin met lezen").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
                            }
                            .foregroundStyle(Theme.brandRed)
                            .background(Theme.onBrandRed, in: Capsule())
                            Button("Kies eerst je interesses") { interests = true }
                                .font(.subheadline.weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: Space.tap)
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
            .navigationDestination(isPresented: $interests) {
                InterestsList()
                    .tint(Theme.accent) // een gewone, lichte lijst: niet het wit van het rode scherm
                    .navigationTitle("Interesses")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) { Button("Verder") { fields = true } }
                    }
                    .navigationDestination(isPresented: $fields) {
                        // Daarna je vak, voor de Digest. Overslaan mag: dan blijft wat er stond.
                        DigestFieldsList()
                            .tint(Theme.accent)
                            .navigationTitle("En je vak?")
                            .toolbar {
                                ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { store.onboarded = true } }
                            }
                    }
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
