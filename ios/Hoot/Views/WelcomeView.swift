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
                    Text("Hoot zet het nieuws van jouw bronnen voor je klaar: overzichtelijk, rustig en met een einde.")
                        .font(.title3)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: Space.s4) {
                        point("newspaper", "Je eigen editie, drie keer per dag", "Om 6, 12 en 17 uur de tien verhalen die ertoe doen, uit jouw bronnen. Ben je erdoorheen, dan ben je bij.")
                        point("water.waves", "De Stroom", "Alles van je bronnen, het nieuwste bovenaan. Artikelen lees je in de lezer, zonder de drukte van de website.")
                        point("briefcase", "Elke maandag je Digest", "Het beste uit je vak van de afgelopen week: per vakgebied drie stukken, geschreven door vakmensen.")
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
                    Button("Eerst kiezen wat je interesseert") { interests = true }
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
                    .tint(Theme.accent) // een gewone, lichte lijst: niet het wit van het rode scherm
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
