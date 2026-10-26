import SwiftUI

// Bluesky (in de Stroom): posts van de mensen die je volgt, nieuwste eerst, met bovenaan een rij
// mensen om op één persoon te filteren.
struct BlueskyFeed: View {
    @Environment(HootStore.self) private var store
    @State private var who: String?

    var body: some View {
        let people = store.followedSocial
        let posts = store.posts.filter { who == nil || $0.source == who }
        LazyVStack(alignment: .leading, spacing: 0) {
            Text("De mensen die je volgt, nieuwste eerst.")
                .font(.footnote)
                .foregroundStyle(Theme.muted)
                .padding(.bottom, 8)
            if people.count > 1 { chips(people) }
            if store.status == .loading && posts.isEmpty {
                ProgressView().frame(maxWidth: .infinity, minHeight: 240)
            } else if posts.isEmpty {
                EmptyState(title: people.isEmpty ? "Je volgt nog niemand" : "Nog geen posts", systemImage: "bubble.left.and.bubble.right", text: people.isEmpty ? "Tik rechtsboven op Accounts om iemand op Bluesky te volgen." : "Zodra de mensen die je volgt iets plaatsen, staat het hier.")
            } else {
                StaleNotice()
                ForEach(posts) { post in
                    PostRow(item: post)
                    Divider()
                }
            }
        }
    }

    private func chips(_ people: [Source]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("Iedereen", on: who == nil) { who = nil }
                ForEach(people) { s in chip(s.name, on: who == s.id) { who = who == s.id ? nil : s.id } }
            }
            .padding(.vertical, 4)
        }
        .scrollClipDisabled()
        .padding(.bottom, 8)
    }

    private func chip(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label).font(.subheadline.weight(.semibold)).foregroundStyle(on ? Theme.accent : Theme.muted)
        }
        .buttonStyle(.glass)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// Eén post: wie, wanneer, de tekst, en een foto of gedeelde link.
private struct PostRow: View {
    @Environment(HootStore.self) private var store
    let item: Item

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SourceMark(item: item, size: 40)
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(item.sourceName ?? item.source).font(.subheadline.weight(.semibold))
                        Text([item.handle, HootDate.ago(item.date)].compactMap { $0 }.joined(separator: " · ")).font(.caption).foregroundStyle(Theme.muted)
                    }
                    Spacer(minLength: 8)
                    SaveButton(item: item)
                }
                Group {
                    if let text = item.summary, !text.isEmpty {
                        Text(text).font(.body).fixedSize(horizontal: false, vertical: true)
                    }
                    if let title = item.linkTitle {
                        LinkCard(item: item, title: title)
                    } else if item.image != nil, store.showsImage(lead: false) {
                        FramedImage(url: item.image.flatMap(URL.init(string:)), ratio: CGFloat(min(max(item.imageRatio ?? 4 / 3, 0.75), 2)))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
                .contentShape(Rectangle())
                .opensArticle(item)
            }
        }
        .padding(.vertical, 12)
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
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(.primary).fixedSize(horizontal: false, vertical: true)
                if let host = item.link?.host() { Text(host.replacing(/^www\./, with: "")).font(.caption).foregroundStyle(Theme.muted) }
            }
            .padding(12)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(.separator, lineWidth: 0.5))
    }
}

// Wie je volgt: zelf toevoegen (naam of link van bsky.app), en accounts aan- en uitzetten.
struct BlueskyAccountsView: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var input = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        TextField("naam.bsky.social of een link", text: $input)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                            .submitLabel(.done)
                            .onSubmit(add)
                        if busy { ProgressView() } else { Button("Volg", action: add).disabled(input.trimmingCharacters(in: .whitespaces).isEmpty) }
                    }
                } header: {
                    Text("Iemand volgen")
                } footer: {
                    if let error { Text(error).foregroundStyle(.red) } else { Text("Je ziet hun eigen posts van de afgelopen twee dagen: geen reposts en geen antwoorden.").foregroundStyle(Theme.muted) }
                }
                let own = store.socialSources.filter { store.isOwn($0.id) }
                if !own.isEmpty {
                    Section("Door jou toegevoegd") {
                        ForEach(own) { s in row(s) }
                            .onDelete { idx in for i in idx { store.removeBluesky(own[i].id) } }
                    }
                }
                let hoot = store.socialSources.filter { !store.isOwn($0.id) }
                if !hoot.isEmpty {
                    Section("Van Hoot") {
                        ForEach(hoot) { s in row(s) }
                    }
                }
            }
            .navigationTitle("Bluesky-accounts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Klaar", systemImage: "checkmark") { dismiss() } }
            }
        }
    }

    private func row(_ s: Source) -> some View {
        Toggle(isOn: Binding(get: { store.isOn(s) }, set: { on in
            store.setOn(s, on)
            if on, store.isOwn(s.id) { Task { await store.loadOwnPosts() } }
        })) {
            HStack(spacing: 10) {
                AsyncImage(url: s.avatar.flatMap(URL.init(string:))) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() } else { Circle().fill(.quaternary) }
                }
                .frame(width: 28, height: 28)
                .clipShape(Circle())
                .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 0) {
                    Text(s.name)
                    Text("@" + s.id.replacing(/^bsky:/, with: "")).font(.caption).foregroundStyle(Theme.muted)
                }
            }
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
