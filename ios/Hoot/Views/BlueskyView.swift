import SwiftUI

// Bluesky (een rubriek in de Stroom): posts van de mensen die je volgt, nieuwste eerst, met bovenaan
// een rij mensen om op één persoon te filteren.
struct BlueskyFeed: View {
    @Environment(HootStore.self) private var store
    @State private var who: String?
    @State private var lines = LoadLinesModel() // de laadstrepen bij het eerste laden (LoadLines.swift)
    // Opent het toevoegen (het blad met accounts), voor de knop in het lege scherm.
    var onAdd: (() -> Void)? = nil

    var body: some View {
        let people = store.followedSocial
        // Een filter op iemand die je niet meer volgt, telt niet meer (anders een lege lijst zonder uitweg).
        let who = people.contains { $0.id == self.who } ? self.who : nil
        let posts = store.posts.filter { who == nil || $0.source == who }
        LazyVStack(alignment: .leading, spacing: 0) {
            if people.count > 1 { chips(people, who: who) }
            if store.status == .loading && posts.isEmpty {
                LoadLinesBox()
            } else if posts.isEmpty {
                Group {
                    if people.isEmpty {
                        EmptyState(title: "Je volgt nog niemand", systemImage: "bubble.left.and.bubble.right", text: "Voeg mensen toe met hun @-naam, bijvoorbeeld @naam.bsky.social.", action: onAdd.map { (label: "Iemand toevoegen", systemImage: "plus", run: $0) })
                    } else {
                        let empty = Self.emptyText(people: people, who: who, state: store.ownState)
                        EmptyState(title: empty.title, systemImage: "bubble.left.and.bubble.right", text: empty.text)
                    }
                }
                .loadLinesError(lines)
            } else {
                Group {
                    StaleNotice()
                    ForEach(posts) { post in
                        PostRow(item: post)
                        Rule()
                    }
                }
                .loadLinesText(lines)
            }
        }
        .loadLines(lines, loading: store.status == .loading && posts.isEmpty, ok: !posts.isEmpty)
    }

    // Waarom het leeg is, zonder klokkijden: wie niets plaatste in de afgelopen 36 uur ("anderhalve dag")
    // staat er gewoon niet in; een account dat weg is of een Bluesky die niet reageert, zeggen we ook.
    static func emptyText(people: [Source], who: String?, state: [String: HootStore.OwnState]) -> (title: String, text: String) {
        let shown = people.filter { who == nil || $0.id == who }
        let mine = shown.compactMap { state[$0.id] }
        let name = shown.count == 1 ? shown[0].name : nil
        if !mine.isEmpty, mine.allSatisfy({ $0 == .gone }) {
            return (name.map { "\($0) bestaat niet meer" } ?? "Deze accounts bestaan niet meer", "Haal het weg bij je Bluesky-accounts en voeg het opnieuw toe als het van naam veranderde.")
        }
        if !mine.isEmpty, mine.allSatisfy({ $0 == .unreachable }) {
            return ("Bluesky reageert niet", "Probeer het straks nog eens.")
        }
        if !mine.isEmpty, mine.allSatisfy({ if case .posts = $0 { true } else { false } }) {
            return (name.map { "\($0) plaatste niets in de afgelopen anderhalve dag" } ?? "Geen posts in de afgelopen anderhalve dag", "Alleen eigen posts tellen mee: geen reposts en geen antwoorden.")
        }
        return ("Nog geen posts", "Zodra de mensen die je volgt iets plaatsen, staat het hier.")
    }

    private func chips(_ people: [Source], who: String?) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Space.s2) {
                chip("Iedereen", on: who == nil) { self.who = nil }
                ForEach(people) { s in chip(s.name, on: who == s.id) { self.who = who == s.id ? nil : s.id } }
            }
            .padding(.vertical, Space.s1)
        }
        .scrollClipDisabled()
        .padding(.bottom, Space.s2)
    }

    private func chip(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label).font(.ui(.subheadline, .semibold)).foregroundStyle(on ? Theme.accent : Theme.ink3)
        }
        .buttonStyle(.glass)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// Eén post: wie, wanneer, de tekst, en een foto of gedeelde link.
struct PostRow: View {
    @Environment(HootStore.self) private var store
    let item: Item

    // De tekst zonder kale links (Stroom-kaart B): de link staat in de linkkaart. Gelijk aan
    // withoutBareLinks in shared/bluesky.mjs.
    static func withoutBareLinks(_ text: String, domain: String?) -> String {
        let host = (domain ?? "").replacingOccurrences(of: #"^www\."#, with: "", options: .regularExpression).lowercased()
        let words = text.split(whereSeparator: \.isWhitespace).filter { token in
            let w = String(token).replacingOccurrences(of: #"[)\].,;:!?]+$"#, with: "", options: .regularExpression).lowercased()
            if w.hasPrefix("http://") || w.hasPrefix("https://") { return false }
            if w.range(of: #"^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/\S*$"#, options: .regularExpression) != nil { return false }
            if !host.isEmpty, w == host || w == "www." + host || (w.hasPrefix(host) && w.hasSuffix("…")) { return false }
            return true
        }
        return words.joined(separator: " ")
    }

    private var text: String {
        Self.withoutBareLinks(item.summary ?? "", domain: item.linkTitle != nil ? item.link?.host() : nil)
    }

    // Op het raster van het artikel (Stroom-kaart B, keuze 1.1.0): de tekst zelf schreefloos, dan het
    // beeld of de linkkaart over de hele kolom, en de bron onderaan op dezelfde plek als bij een
    // artikel (logo 24, naam, en de @-naam waar bij een artikel de tijd staat), bewaren rechts. Geen
    // hangende inspringing onder een grote avatar meer. 12 tussen tekst, beeld en bron.
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            VStack(alignment: .leading, spacing: Space.s3) {
                if !text.isEmpty {
                    // Schreefloos (Alex, 6 november 2026): een post is een korte zin, geen artikeltekst.
                    Text(text).zin().foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                }
                if item.videoURL != nil {
                    // de video staat hieronder, buiten de tik naar de post
                } else if let title = item.linkTitle {
                    LinkCard(item: item, title: title)
                } else if item.image != nil, store.showsImage(lead: false) {
                    FramedImage(url: item.image.flatMap(URL.init(string:)), ratio: CGFloat(min(max(item.imageRatio ?? 4 / 3, 0.8), 2.4)))
                        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .opensArticle(item)
            if item.videoURL != nil { InlineVideo(item: item) }
            HStack(spacing: Space.s2) {
                HStack(alignment: .top, spacing: Space.s2) {
                    SourceMark(item: item)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(item.sourceName ?? item.source).font(.ui(.subheadline, .semibold)).foregroundStyle(Theme.ink)
                        Text([item.handle, HootDate.ago(item.date)].compactMap { $0 }.joined(separator: " · ")).font(.ui(.caption)).monospacedDigit().foregroundStyle(Theme.hint)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
                .frame(minHeight: Space.tap)
                .accessibilityElement(children: .combine)
                Spacer(minLength: 8)
                SaveButton(item: item)
            }
        }
        .padding(.vertical, Space.s2)
    }
}

// Een gedeelde link: beeld, titel en website, als één kaart.
private struct LinkCard: View {
    @Environment(HootStore.self) private var store
    let item: Item
    let title: String
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if item.image != nil, store.showsImage(lead: false) {
                FramedImage(url: item.image.flatMap(URL.init(string:)), ratio: 1.91)
            }
            VStack(alignment: .leading, spacing: Space.s0) {
                Text(title).font(.ui(.subheadline, .semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                if let host = item.link?.host() { Text(host.replacing(/^www\./, with: "")).font(.ui(.caption)).foregroundStyle(Theme.hint) }
            }
            .padding(Space.s3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.rule, lineWidth: 1))
    }
}

// Wie je volgt, vanuit de Stroom: iemand toevoegen met de @-naam (of een link van bsky.app), en
// accounts aan- en uitzetten of weghalen.
// `pushed`: als pagina in Instellingen (geen eigen navigatiestapel en geen Klaar); anders als blad.
struct BlueskyAccountsView: View {
    var pushed = false
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var input = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        if pushed {
            list
        } else {
            NavigationStack { list }
        }
    }

    private var list: some View {
            List {
                Section {
                    HStack {
                        TextField("@naam.bsky.social", text: $input)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                            .submitLabel(.done)
                            .onSubmit(add)
                        if busy { WaitingMark(size: 16, text: false) } else { Button("Volg", action: add).disabled(input.trimmingCharacters(in: .whitespaces).isEmpty) }
                    }
                } header: {
                    FormHeader("Iemand volgen")
                } footer: {
                    if let error { Text(error).foregroundStyle(Theme.warn) } else { Text("Je ziet hun eigen posts van de afgelopen 36 uur: geen reposts en geen antwoorden.").foregroundStyle(Theme.ink3) }
                }
                .hootRows()
                let own = store.socialSources.filter { store.isOwn($0.id) }
                if !own.isEmpty {
                    Section {
                        ForEach(own) { s in row(s) }
                            .onDelete { idx in for i in idx { store.removeBluesky(own[i].id) } }
                    } header: {
                        FormHeader("Door jou toegevoegd")
                    }
                    .hootRows()
                }
                let hoot = store.socialSources.filter { !store.isOwn($0.id) }
                if !hoot.isEmpty {
                    Section {
                        ForEach(hoot) { s in row(s) }
                    } header: {
                        FormHeader("Van Hoot")
                    }
                    .hootRows()
                }
            }
            .hootForm()
            .navigationTitle("Bluesky-accounts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !pushed { ToolbarItem(placement: .topBarTrailing) { Button("Klaar") { dismiss() } } } // tekst in inkt, zoals Instellingen
            }
    }

    private func row(_ s: Source) -> some View {
        VStack(alignment: .leading, spacing: Space.s2) {
            Toggle(isOn: Binding(get: { store.isOn(s) }, set: { on in
                store.setOn(s, on)
                if on, store.isOwn(s.id) { Task { await store.loadOwnPosts() } }
            })) {
                HStack(spacing: Space.s3) {
                    AsyncImage(url: s.avatar.flatMap(URL.init(string:))) { phase in
                        if let image = phase.image { image.resizable().scaledToFill() } else { Circle().fill(.quaternary) }
                    }
                    .frame(width: 28, height: 28)
                    .clipShape(Circle())
                    .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(s.name)
                        Text("@" + s.id.replacing(/^bsky:/, with: "")).font(.ui(.caption)).foregroundStyle(Theme.hint)
                        if store.ownState[s.id] == .gone { Text("Bestaat niet meer").font(.ui(.caption)).foregroundStyle(Theme.warn) }
                    }
                }
            }
            Toggle("Ook in de Stroom", isOn: Binding(get: { store.bskyInStream.contains(s.id) }, set: { on in
                if on { store.bskyInStream.insert(s.id) } else { store.bskyInStream.remove(s.id) }
            }))
            .disabled(!store.isOn(s))
            .accessibilityLabel("\(s.name) ook in de Stroom")
        }
    }

    private func add() {
        let text = input
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty, !busy else { return }
        busy = true
        error = nil
        Task {
            do {
                try await store.addBluesky(text)
                input = ""
            } catch {
                self.error = error.localizedDescription
            }
            busy = false
        }
    }
}

// Bluesky op een eigen pagina (Instellingen › Bluesky › Posts): de posts van wie je volgt, met een
// plus om iemand toe te voegen. De rij van de Stroom heeft alleen je rubrieken.
struct BlueskyPage: View {
    @Environment(HootStore.self) private var store
    @State private var adding = false
    var body: some View {
        ScrollView {
            BlueskyFeed { adding = true }.padding(.horizontal).column()
        }
        .background(Theme.paper)
        .navigationTitle("Bluesky")
        .navigationBarTitleDisplayMode(.inline)
        // Opent de pagina leeg (de ronde bij de start mislukte, of een oud account werd net omgezet), dan nog eens.
        .task { if store.posts.isEmpty { await store.loadOwnPosts() } }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { adding = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("Bluesky-account toevoegen")
                    .tint(Theme.ink3)
            }
        }
        .sheet(isPresented: $adding) { BlueskyAccountsView().debugAppearance() }
    }
}
