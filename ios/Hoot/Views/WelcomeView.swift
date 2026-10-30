import SwiftUI

// Het welkom, één keer bij de eerste start: drie rustige pagina's om doorheen te vegen (je editie,
// de Stroom, je selectie), elk met een kleine animatie in het midden. De knoppen staan er altijd
// onder: zelf samenstellen of inloggen voorop, even rondkijken als zijweg.
struct WelcomeView: View {
    @Environment(HootStore.self) private var store
    @State private var page = 0
    @State private var setup = false
    @State private var login = false
    @State private var alertStep = DebugLaunch.screen("seintje") // `-HootScreen seintje`: meteen de vraag om een seintje

    private struct Page {
        let art: OnboardingArt.Kind
        let title: String
        let text: String
    }
    // Twee korte regels per pagina; de tweede rondt af (zie de stem in het design system).
    private static let pages = [
        // Eerst de samenvatting, dan de drie onderdelen.
        Page(art: .intro, title: "Minder scrollen.\nMeer lezen.", text: "Het nieuws van jouw bronnen,\nrustig op een rij."),
        Page(art: .editie, title: "Je Editie", text: "Drie keer per dag tien verhalen.\nDan ben je bij."),
        Page(art: .stroom, title: "De Stroom", text: "Alles van je bronnen,\nrustig onder elkaar."),
        Page(art: .digest, title: "Je Selectie", text: "Eén keer per week bijgepraat\nover wat jou bezighoudt."),
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
            }
            .navigationDestination(isPresented: $setup) {
                SetupSteps { store.onboarded = true }
            }
            .navigationDestination(isPresented: $alertStep) {
                AlertStep { store.onboarded = true }
            }
        }
        .tint(Theme.accent)
        .interactiveDismissDisabled()
        .debugAppearance()
    }

    // Eén pagina: de animatie in het midden, de kop en twee regels eronder. Past het niet (heel
    // grote tekst), dan scrolt de pagina; de knoppen blijven staan.
    private func pageView(_ p: Page, active: Bool) -> some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: Space.s5) {
                    // Krap (kleine iPhone, heel grote tekst): de tekst gaat voor, de animatie wijkt.
                    if p.art == .intro {
                        IntroMark().frame(height: OnboardingArt.size.height) // de eerste pagina: het woordmerk zelf
                    } else if geo.size.height > OnboardingArt.size.height + 200 {
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

    // Voorop: zelf samenstellen, of je account. Inloggen is voor leden (Hoot is op uitnodiging; het
    // inlogscherm zegt dat vóór de knoppen). Even rondkijken mag, maar is de zijweg.
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
                Text("Log in als lid").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
            }
            .accessibilityHint("Hoot is nog op uitnodiging.")
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

// Je Hoot samenstellen: interesses, bronnen, je vak en dan of je een seintje wilt. In het welkom en
// vanuit de editie (na even rondkijken). Overslaan mag bij elke stap: dan blijft wat er stond.
struct SetupSteps: View {
    var onDone: () -> Void
    @Environment(HootStore.self) private var store
    @Environment(EditionAlerts.self) private var alerts
    @State private var sources = false
    @State private var fields = false
    @State private var alert = false

    // Het seintje alleen als er nog iets te vragen valt: iOS weet nog niet of je meldingen wilt, en het
    // staat niet al aan. Anders is je vak de laatste stap.
    private var asksAlert: Bool { alerts.permission == .notDetermined && !store.notify }

    var body: some View {
        InterestsList()
            .tint(Theme.accent) // een gewone, lichte lijst: niet het wit van het rode scherm
            .navigationTitle("Interesses")
            // De knoppen in de balk zelf in accent: de balk neemt de tint van het welkom over (wit), en
            // dan stond "Verder" wit op wit glas.
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Verder") { sources = true }.tint(Theme.accent) } }
            .task { await alerts.refresh() }
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
                            .toolbar {
                                ToolbarItem(placement: .confirmationAction) {
                                    if asksAlert {
                                        Button("Verder") { alert = true }.tint(Theme.accent)
                                    } else {
                                        Button("Klaar", systemImage: "checkmark") { onDone() }.tint(Theme.accent)
                                    }
                                }
                            }
                            // Altijd aangehaakt, ook als het niet (meer) gevraagd wordt: zo springt de pagina
                            // niet terug als je net "Ja, graag" zei.
                            .navigationDestination(isPresented: $alert) { AlertStep(onDone: onDone) }
                    }
            }
    }
}

// Het seintje, als laatste stap: één rustige vraag in de stijl van het welkom, met een nagemaakte
// melding erboven. De systeemvraag komt pas na "Ja, graag"; "Nu niet" vraagt niets (onder het einde
// van de Editie kan het later nog). Daarna ben je in beide gevallen klaar.
struct AlertStep: View {
    var onDone: () -> Void
    @Environment(HootStore.self) private var store
    @Environment(EditionAlerts.self) private var alerts
    @Environment(\.accessibilityReduceMotion) private var still
    @State private var shown = false // de melding is binnen
    @State private var asking = false

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { geo in
                ScrollView {
                    VStack(spacing: Space.s6) {
                        // Krap (kleine iPhone, heel grote tekst): de tekst gaat voor, de melding wijkt.
                        if geo.size.height > OnboardingArt.size.height + 200 {
                            AlertPreview()
                                .opacity(shown || still ? 1 : 0)
                                .offset(y: shown || still ? 0 : -Space.s5)
                        }
                        VStack(spacing: Space.s2) {
                            Text("Een seintje?")
                                .font(Theme.headline(.title))
                                .multilineTextAlignment(.center)
                                .accessibilityAddTraits(.isHeader)
                            Text("Als je Editie klaarligt, om 6, 12 en 17 uur.\nStil, zonder geluid.")
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
            buttons
                .padding(.horizontal, Space.s5)
                .padding(.bottom, Space.s2)
        }
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .foregroundStyle(Theme.ink)
        .navigationBarTitleDisplayMode(.inline)
        // De melding valt zacht binnen, zoals een echte, als je op de pagina bent.
        .task {
            guard !still, !shown else { return }
            try? await Task.sleep(for: .seconds(0.35))
            withAnimation(.easeOut(duration: 0.7)) { shown = true }
        }
    }

    // Zoals de knoppen van het welkom: ja voorop, nee als stille tekstknop, en de kleine lettertjes.
    private var buttons: some View {
        VStack(spacing: Space.s2) {
            Button {
                asking = true
                Task {
                    if await alerts.ask() {
                        store.notifySlots = EditionAlerts.slots.map(\.id)
                        store.notify = true
                    }
                    onDone()
                }
            } label: {
                Text("Ja, graag").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
            }
            .foregroundStyle(Theme.onAccent)
            .background(Theme.accent, in: Capsule())
            .disabled(asking)
            Button { onDone() } label: {
                Text("Nu niet").font(.headline).frame(maxWidth: .infinity, minHeight: Space.tap + Space.s1)
            }
            .foregroundStyle(Theme.ink)
            .disabled(asking)
            Text("Per editie aan of uit in Instellingen.")
                .font(.footnote)
                .foregroundStyle(Theme.ink3)
                .frame(minHeight: Space.tap - Space.s3)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    }
}

// Een melding zoals iOS hem toont, met het icoon van Hoot ("h." op papier): wat je straks krijgt.
// Een plaatje, dus voor VoiceOver verborgen; de tekst eronder zegt het al.
private struct AlertPreview: View {
    var body: some View {
        let slot = EditionAlerts.slots[0]
        HStack(alignment: .center, spacing: Space.s3) {
            AppMark()
            VStack(alignment: .leading, spacing: Space.s0) {
                HStack(alignment: .firstTextBaseline) {
                    Text(slot.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Spacer(minLength: Space.s2)
                    Text("nu").font(.footnote).foregroundStyle(Theme.ink3)
                }
                Text(slot.body).font(.subheadline).foregroundStyle(Theme.ink2).lineLimit(2) // zoals iOS: liever een tweede regel dan "…"
            }
        }
        .padding(.horizontal, Space.s4)
        .padding(.vertical, Space.s3)
        .frame(maxWidth: 360)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: Radius.lg + Space.s2, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg + Space.s2, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
        .shadow(color: .black.opacity(0.06), radius: 16, y: 6)
        .dynamicTypeSize(...DynamicTypeSize.xLarge) // een plaatje: groeit beperkt mee
        .accessibilityHidden(true)
    }
}

// Het app-icoon in het klein: "h." in de krantenletter op papier, met de rode punt.
private struct AppMark: View {
    var body: some View {
        HStack(alignment: .lastTextBaseline, spacing: 1) {
            Text("h").font(.system(size: 26, weight: .heavy, design: .serif)).foregroundStyle(Theme.ink)
            Circle().fill(Theme.accent).frame(width: 6, height: 6)
        }
        .offset(y: -1)
        .frame(width: 38, height: 38)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
    }
}
