import SwiftUI

// Het welkom, één keer bij de eerste start: drie rustige pagina's om doorheen te vegen (je editie,
// de Stroom, je selectie), elk met een kleine animatie in het midden. De knoppen staan er altijd
// onder: zelf samenstellen of inloggen voorop, even rondkijken als zijweg.
struct WelcomeView: View {
    @Environment(HootStore.self) private var store
    @State private var page = 0
    @State private var setup = false
    @State private var login = false

    private struct Page {
        let art: OnboardingArt.Kind
        let title: String
        let text: String
    }
    // Twee korte regels per pagina; de tweede rondt af (zie de stem in het design system).
    private static let pages = [
        // Eerst de samenvatting, dan de drie onderdelen.
        Page(art: .intro, title: "Minder scrollen.\nMeer lezen.", text: "Het nieuws van jouw bronnen,\nrustig op een rij."),
        Page(art: .editie, title: "Je editie", text: "Drie keer per dag tien verhalen.\nDan ben je bij."),
        Page(art: .stroom, title: "De Stroom", text: "Alles van je bronnen,\nrustig onder elkaar."),
        Page(art: .digest, title: "Je selectie", text: "Eén keer per week bijgepraat\nover wat jou bezighoudt."),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Wordmark().opacity(page == 0 ? 0 : 1) // op de eerste pagina staat het woordmerk groot
                    Spacer()
                }
                .animation(.easeInOut(duration: 0.3), value: page)
                .padding(.horizontal, Space.s5)
                .padding(.top, Space.s3)

                TabView(selection: $page) {
                    ForEach(Self.pages.indices, id: \.self) { i in
                        pageView(Self.pages[i], active: page == i).tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                dots.padding(.bottom, Space.s5)
                buttons
                    .padding(.horizontal, Space.s5)
                    .padding(.bottom, Space.s2)
            }
            .frame(maxWidth: Layout.readable)
            .frame(maxWidth: .infinity)
            .background(Theme.paper)
            .foregroundStyle(Theme.ink)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $login) {
                AccountView { store.onboarded = true }
                    .navigationTitle("Inloggen")
            }
            .navigationDestination(isPresented: $setup) {
                SetupSteps { store.onboarded = true }
            }
        }
        .tint(Theme.accent)
        .interactiveDismissDisabled()
    }

    // Eén pagina: de animatie in het midden, de kop en twee regels eronder. Past het niet (heel
    // grote tekst), dan scrolt de pagina; de knoppen blijven staan.
    private func pageView(_ p: Page, active: Bool) -> some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: Space.s5) {
                    // Krap (kleine iPhone, heel grote tekst): de tekst gaat voor, de animatie wijkt.
                    if geo.size.height > OnboardingArt.size.height + 200 {
                        OnboardingArt(kind: p.art, active: active)
                    }
                    VStack(spacing: Space.s2) {
                        Text(p.title)
                            .font(Theme.headline(.title))
                            .multilineTextAlignment(.center)
                            .accessibilityAddTraits(.isHeader)
                        Text(p.text)
                            .font(.body)
                            .foregroundStyle(Theme.ink2)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .accessibilityElement(children: .combine)
                }
                .padding(.horizontal, Space.s5)
                .frame(maxWidth: .infinity, minHeight: geo.size.height)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
    }

    // Waar je bent: drie puntjes, de huidige in inkt. Tikken mag ook.
    private var dots: some View {
        HStack(spacing: Space.s2) {
            ForEach(Self.pages.indices, id: \.self) { i in
                Button { withAnimation(.easeInOut(duration: 0.35)) { page = i } } label: {
                    Circle()
                        .fill(Theme.ink.opacity(i == page ? 0.85 : 0.2))
                        .frame(width: 7, height: 7)
                        .frame(width: 22, height: 22) // ruimer aanraakvlak dan het puntje
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Self.pages[i].title)
                .accessibilityAddTraits(i == page ? .isSelected : [])
            }
        }
    }

    // Voorop: zelf samenstellen, of je account. Even rondkijken mag, maar is de zijweg.
    // Altijd in beeld, en dus begrensd: bij de grootste tekst blijven ze op één regel (de letter
    // krimpt iets mee) in plaats van het halve scherm te vullen. VoiceOver leest de volle tekst.
    private var buttons: some View {
        VStack(spacing: Space.s2) {
            Button { setup = true } label: {
                Text("Stel je Hoot samen").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
            }
            .foregroundStyle(Theme.onAccent)
            .background(Theme.accent, in: Capsule())
            Button { login = true } label: {
                Text("Log in met je account").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
            }
            .foregroundStyle(Theme.ink)
            .overlay(Capsule().strokeBorder(Theme.edge, lineWidth: 1))
            // Gratis Nederlandse bronnen (HootStore.starter); na een stukje editie vraagt Hoot of je zelf kiest.
            Button { store.quickStart() } label: {
                Text("Of kijk eerst even rond").underline()
            }
            .font(.subheadline)
            .foregroundStyle(Theme.ink2)
            .frame(maxWidth: .infinity, minHeight: Space.tap)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
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
                        // Daarna je vak, voor de Selectie.
                        DigestFieldsList()
                            .tint(Theme.accent)
                            .navigationTitle("En je vak?")
                            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { onDone() }.tint(Theme.accent) } }
                    }
            }
    }
}
