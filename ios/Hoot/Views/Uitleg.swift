import SwiftUI

// Begrippen uitgelegd (concept A met de Begrippen uit C, gekeurd 12 november; Hoot-design/uitleg-ios).
// Onder een bericht met een begrip staat dezelfde pil als op het web ("Uitleg: formateur", stippelrand, zie
// TermHelp in src/components/Terms.jsx). Een tik opent een halfhoog blad met de uitleg en Wikipedia; omlaag
// vegen sluit het. De pil staat buiten het tikvlak dat het artikel opent. In het verhaal (Vergelijken) staan
// onderaan alle begrippen bij elkaar (BegrippenSectie). De lijst is gedeeld met het web (Glossary.swift).

// De pillen onder een bericht: hooguit `max` (kaart 1, hoofdverhaal op iPad 2, zoals op het web).
struct UitlegPillen: View {
    let text: String
    var max = 2
    var top: CGFloat = 0 // lucht erboven, alleen als er een pil staat (zonder begrip neemt de rij geen plek in)
    @State private var open: Begrip?

    init(text: String, max: Int = 2, top: CGFloat = 0) { self.text = text; self.max = max; self.top = top }
    init(item: Item, max: Int = 2, top: CGFloat = 0) { self.init(text: Glossary.text(of: item), max: max, top: top) }

    var body: some View {
        let terms = Glossary.termsIn(text, max: max)
        if !terms.isEmpty {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Space.s2) { pills(terms) }
                VStack(alignment: .leading, spacing: 0) { pills(terms) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, -(Space.tap - UitlegPil.height) / 2) // in de opmaak telt de pil (36); het raakvlak (44) steekt erbuiten
            .padding(.top, top)
            .sheet(item: $open) { BegripBlad(begrip: $0).debugAppearance() }
            #if DEBUG
            .task { await DebugUitleg.open(terms) { open = $0 } }
            #endif
        }
    }

    private func pills(_ terms: [Begrip]) -> some View {
        ForEach(terms) { b in UitlegPil(begrip: b) { open = b } }
    }
}

// De pil: klein (36 hoog, het raakvlak 44), Schibsted 13 halfvet in ink2, een stippelrand in edge: de stippel zegt
// "begrip, klapt uit" (.pill--sm.pill--dashed op het web). Bij heel grote tekst mag het label over twee regels;
// dan een afgeronde rechthoek, want een capsule snijdt de tekst af.
struct UitlegPil: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let begrip: Begrip
    let action: () -> Void
    static func label(_ b: Begrip) -> String { "Uitleg: \(b.term)" }
    static let hint = "Opent een korte uitleg, met een link naar Wikipedia."
    static let height: CGFloat = 36 // --control-sm

    private var shape: AnyShape { typeSize.isAccessibilitySize ? AnyShape(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)) : AnyShape(Capsule()) }

    var body: some View {
        Button(action: action) {
            Text(Self.label(begrip))
                .font(.ui(.footnote, .semibold))
                .foregroundStyle(Theme.ink2)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, Space.s3)
                .padding(.vertical, Space.s1)
                .frame(minHeight: Self.height)
                .overlay { shape.stroke(Theme.edge, style: StrokeStyle(lineWidth: 1, dash: [3, 3])).padding(0.5) }
                .frame(minHeight: Space.tap) // het raakvlak: 44, ook al is de pil 36
                .contentShape(Rectangle())
        }
        .buttonStyle(UitlegDruk())
        .accessibilityLabel(Self.label(begrip))
        .accessibilityHint(Self.hint)
    }
}

private struct UitlegDruk: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.opacity(configuration.isPressed ? 0.55 : 1)
    }
}

// Het halfhoge blad: "Uitleg" als bovenregel, het begrip als titel, de uitleg, en een knop naar Wikipedia (in de
// Safari-weergave, zoals de app links toont). Groeit de tekst groter dan het blad, dan scrolt hij.
struct BegripBlad: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let begrip: Begrip
    @State private var wiki: WikiLink?

    var body: some View {
        ScrollView {
            BegripInhoud(begrip: begrip) { wiki = $0 }
                .padding(.horizontal, Space.s5)
                .padding(.top, Space.s6)
                .padding(.bottom, Space.s5)
                .frame(maxWidth: Layout.readable, alignment: .leading)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollBounceBehavior(.basedOnSize)
        .background(Theme.paper)
        .presentationBackground(Theme.paper)
        .presentationDetents(typeSize.isAccessibilitySize ? [.medium, .large] : [.medium]) // bij heel grote tekst mag het blad omhoog
        .presentationDragIndicator(.visible)
        .sheet(item: $wiki) { SafariView(url: $0.url).ignoresSafeArea() }
    }
}

struct BegripInhoud: View {
    let begrip: Begrip
    let openWiki: (WikiLink) -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            VStack(alignment: .leading, spacing: Space.s1) {
                Kicker(text: "Uitleg")
                Text(begrip.term)
                    .font(.kop(.title2))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
            }
            Text(begrip.text)
                .leestekst()
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            if let url = begrip.wikipedia {
                Button { openWiki(WikiLink(url: url)) } label: { Label("Meer op Wikipedia", systemImage: "safari") }
                    .buttonStyle(.ink)
                    .padding(.top, Space.s2)
                    .accessibilityHint("Opent Wikipedia in Hoot.")
            }
        }
    }
}

struct WikiLink: Identifiable, Hashable {
    let url: URL
    var id: URL { url }
}

// Onderaan het verhaal: alle begrippen bij elkaar, ingeklapt; per begrip klapt de uitleg open met Wikipedia.
// Alleen als het verhaal begrippen heeft. Kop en intro van elk stuk tellen; tussen de stukken een nieuwe regel,
// zodat een begrip nooit over twee stukken heen gevonden wordt.
struct BegrippenSectie: View {
    let begrippen: [Begrip]
    @State private var open: Bool
    @State private var openTerms: Set<String>
    @State private var wiki: WikiLink?

    init(begrippen: [Begrip], open: Bool = false, openTerms: Set<String> = []) {
        self.begrippen = begrippen
        _open = State(initialValue: open)
        _openTerms = State(initialValue: openTerms)
    }

    static func of(_ items: [Item]) -> [Begrip] {
        Glossary.termsIn(items.map(Glossary.text(of:)).joined(separator: "\n"), max: Glossary.all.count)
    }

    var body: some View {
        DisclosureGroup(isExpanded: $open) {
            ForEach(begrippen) { b in
                DisclosureGroup(isExpanded: Binding(get: { openTerms.contains(b.term) }, set: { if $0 { openTerms.insert(b.term) } else { openTerms.remove(b.term) } })) {
                    VStack(alignment: .leading, spacing: Space.s2) {
                        Text(b.text)
                            .leestekst()
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        if let url = b.wikipedia {
                            Button { wiki = WikiLink(url: url) } label: { Label("Meer op Wikipedia", systemImage: "safari") }
                                .font(.ui(.subheadline, .semibold))
                                .foregroundStyle(Theme.ink)
                                .buttonStyle(.borderless)
                                .frame(minHeight: Space.tap)
                                .accessibilityHint("Opent Wikipedia in Hoot.")
                        }
                    }
                    .padding(.vertical, Space.s1)
                } label: {
                    Text(b.term).font(.ui(.body, .semibold)).foregroundStyle(Theme.ink)
                }
            }
        } label: {
            HStack(alignment: .firstTextBaseline, spacing: Space.s2) {
                Text("Begrippen").font(.ui(.headline)).foregroundStyle(Theme.ink)
                Text("\(begrippen.count)").font(.ui(.subheadline)).foregroundStyle(Theme.ink3).monospacedDigit()
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(begrippen.count == 1 ? "Begrippen, 1 begrip" : "Begrippen, \(begrippen.count) begrippen")
        }
        .tint(Theme.ink3)
        .sheet(item: $wiki) { SafariView(url: $0.url).ignoresSafeArea() }
    }
}

#if DEBUG
// `-HootUitleg <begrip>`: het blad van dat begrip gaat vanzelf open bij de eerste pil die het heeft (schermafbeeldingen).
@MainActor enum DebugUitleg {
    private static var done = false
    static func open(_ terms: [Begrip], _ show: (Begrip) -> Void) async {
        guard !done, let want = DebugLaunch.uitleg, let b = terms.first(where: { $0.term.caseInsensitiveCompare(want) == .orderedSame }) else { return }
        done = true
        try? await Task.sleep(for: .seconds(2))
        show(b)
    }
}
#endif
