import SwiftUI

// Het welkom, één keer bij de eerste start: een merkmoment in merkrood, met dezelfde belofte als
// op de website. Daarna meteen lezen, of eerst je interesses kiezen.
struct WelcomeView: View {
    @Environment(HootStore.self) private var store
    @State private var interests = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.s5) {
                    Text("hoot.")
                        .font(.system(.title2, design: .serif, weight: .heavy))
                        .accessibilityLabel("Hoot")
                    Text("Minder scrollen. Meer lezen.")
                        .font(.system(size: 44, weight: .heavy, design: .serif))
                        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, Space.s5)
                        .accessibilityAddTraits(.isHeader)
                    VStack(alignment: .leading, spacing: Space.s4) {
                        point("newspaper", "Drie keer per dag een editie", "Tien verhalen die ertoe doen, met een einde. Om 6, 12 en 17 uur.")
                        point("water.waves", "De Stroom", "Alles van jouw bronnen, nieuwste eerst. Met de lezer lees je rustig, zonder de rest van de website.")
                        point("briefcase", "Elke maandag de Digest", "Per vakgebied de drie belangrijkste stukken van de week, door mensen geschreven.")
                    }
                    .padding(.top, Space.s3)
                }
                .padding(Space.s5)
                .frame(maxWidth: Layout.readable, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: Space.s2) {
                    Button { store.onboarded = true } label: {
                        Text("Begin met lezen").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap)
                    }
                    .foregroundStyle(Theme.brandRed)
                    .background(Theme.onBrandRed, in: Capsule())
                    Button("Kies eerst je interesses") { interests = true }
                        .font(.subheadline.weight(.semibold))
                        .frame(minHeight: Space.tap)
                }
                .padding(.horizontal, Space.s5)
                .padding(.bottom, Space.s3)
                .frame(maxWidth: Layout.readable)
            }
            .foregroundStyle(Theme.onBrandRed)
            .background(Theme.brandRed)
            .navigationDestination(isPresented: $interests) {
                InterestsList()
                    .navigationTitle("Interesses")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { store.onboarded = true } }
                    }
            }
        }
        .tint(Theme.onBrandRed)
        .interactiveDismissDisabled()
    }

    private func point(_ icon: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Space.s3) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(Theme.brandRed)
                .frame(width: Space.tap, height: Space.tap)
                .background(Theme.onBrandRed, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: Space.s0) {
                Text(title).font(.headline)
                Text(text).font(.subheadline)
            }
            .accessibilityElement(children: .combine)
        }
    }
}
