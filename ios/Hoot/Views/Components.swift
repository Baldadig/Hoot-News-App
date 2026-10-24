import SafariServices
import SwiftUI

// Huisstijl: warm papier, inkt, krantenrood. Koppen in New York (de serif van het systeem: past
// bij Newsreader op het web en schaalt mee met Dynamische tekst), de rest in San Francisco.
enum Theme {
    static let paper = Color("Paper")
    static let surface = Color("Surface")
    static let accent = Color.accentColor
    static func headline(_ style: Font.TextStyle) -> Font { .system(style, design: .serif, weight: .bold) }
}

// Een artikel openen: in de app, in Safari-weergave (met Lezer en de inlog van je abonnementen).
@MainActor
@Observable
final class Reader {
    var item: Item?
    func open(_ item: Item, store: HootStore) {
        store.markRead(item)
        if store.openInSafari, let url = item.link {
            UIApplication.shared.open(url)
        } else {
            self.item = item
        }
    }
}

struct SafariView: UIViewControllerRepresentable {
    let url: URL
    var reader = false
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = reader
        let vc = SFSafariViewController(url: url, configuration: config)
        vc.preferredControlTintColor = UIColor(named: "AccentColor")
        vc.dismissButtonStyle = .close
        return vc
    }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

struct Kicker: View {
    let text: String?
    var body: some View {
        if let text, !text.isEmpty {
            Text(text.uppercased())
                .font(.caption.weight(.heavy))
                .tracking(0.6)
                .foregroundStyle(Theme.accent)
        }
    }
}

struct RemoteImage: View {
    let url: URL?
    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Rectangle().fill(.quaternary)
            }
        }
        .clipped()
        .accessibilityHidden(true)
    }
}

// Een beeld in een vaste verhouding over de volle breedte; wat buiten het kader valt wordt
// afgesneden (anders duwt een breed beeld de kolom opzij).
struct FramedImage: View {
    let url: URL?
    var ratio: CGFloat = 16 / 9
    var body: some View {
        Color.clear
            .aspectRatio(ratio, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .overlay { RemoteImage(url: url) }
            .clipped()
    }
}

struct SourceMark: View {
    let item: Item
    var size: CGFloat = 24
    var body: some View {
        AsyncImage(url: item.avatar.flatMap(URL.init(string:))) { phase in
            if let image = phase.image { image.resizable().scaledToFill() } else { Circle().fill(.quaternary) }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(.separator, lineWidth: 0.5))
        .accessibilityHidden(true)
    }
}

// Bron, tijd en (als het verhaal meer bronnen heeft) "+N bronnen".
struct SourceLine: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    let item: Item
    var story: Story?
    var body: some View {
        // Grote tekst of smal scherm: past het niet op één regel, dan de knoppen eronder.
        ViewThatFits(in: .horizontal) {
            line
            VStack(alignment: .leading, spacing: 4) { source; HStack { more; Spacer(); SaveButton(item: item) } }
        }
    }

    private var line: some View {
        HStack(spacing: 8) { source; Spacer(minLength: 8); more; SaveButton(item: item) }
    }

    private var source: some View {
        HStack(spacing: 8) {
            SourceMark(item: item)
            VStack(alignment: .leading, spacing: 0) {
                Text(item.sourceName ?? item.source).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                HStack(spacing: 4) {
                    Text(HootDate.ago(item.date))
                    if store.source(item.source)?.paid == true { Text("· abonnement") }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .fixedSize(horizontal: true, vertical: false)
        }
    }

    @ViewBuilder private var more: some View {
        if let story, (story.sourceCount ?? 1) > 1 {
            NavigationLink(value: story) {
                Text((story.sourceCount ?? 1) == 2 ? "+1 bron" : "+\((story.sourceCount ?? 1) - 1) bronnen")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Theme.accent)
                    .fixedSize()
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Vergelijk \((story.sourceCount ?? 1) - 1) andere bronnen")
        }
    }
}

struct SaveButton: View {
    @Environment(HootStore.self) private var store
    let item: Item
    var body: some View {
        let on = store.isSaved(item)
        Button {
            store.toggleSave(item)
        } label: {
            Image(systemName: on ? "bookmark.fill" : "bookmark")
                .font(.body)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundStyle(on ? Theme.accent : .secondary)
        .sensoryFeedback(.selection, trigger: on)
        .accessibilityLabel(on ? "Bewaard, tik om te verwijderen" : "Bewaar")
    }
}

// Tik = lezen; lang drukken = bewaren, delen of openen in Safari.
struct ArticleActions: ViewModifier {
    @Environment(HootStore.self) private var store
    @Environment(Reader.self) private var reader
    let item: Item
    func body(content: Content) -> some View {
        Button { reader.open(item, store: store) } label: { content }
            .buttonStyle(.plain)
            .contextMenu {
                Button(store.isSaved(item) ? "Verwijder uit Bewaard" : "Bewaar", systemImage: store.isSaved(item) ? "bookmark.slash" : "bookmark") { store.toggleSave(item) }
                if let link = item.link {
                    ShareLink(item: link, subject: Text(item.title)) { Label("Deel", systemImage: "square.and.arrow.up") }
                    Link(destination: link) { Label("Open in Safari", systemImage: "safari") }
                }
            }
    }
}

extension View {
    func opensArticle(_ item: Item) -> some View { modifier(ArticleActions(item: item)) }
}

// ---- Vorm 1: hoofdverhaal ----
// Smal: beeld boven de kop. Breed (iPad, opengevouwen Duo): beeld en tekst naast elkaar, zoals
// de voorpagina van een krant, zodat het beeld niet het hele scherm vult.
struct LeadCard: View {
    @Environment(HootStore.self) private var store
    @Environment(\.isWide) private var wide
    let item: Item
    var label: String?
    var story: Story?

    private var hasImage: Bool { store.showsImage(lead: true) && ImageURL.fitsHero(item.image) }

    private var image: some View {
        FramedImage(url: ImageURL.url(item.image, .large), ratio: wide ? 3 / 2 : 16 / 9)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var text: some View {
        VStack(alignment: .leading, spacing: 10) {
            Kicker(text: label)
            Text(item.title)
                .font(Theme.headline(wide ? .largeTitle : .title))
                .foregroundStyle(store.isRead(item) ? .secondary : .primary)
                .fixedSize(horizontal: false, vertical: true)
            if let summary = item.summary, !summary.isEmpty {
                Text(summary).font(wide ? .title3 : .body).foregroundStyle(.secondary).lineLimit(wide ? 6 : 4)
            }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Group {
                if wide && hasImage {
                    HStack(alignment: .top, spacing: 28) {
                        image.frame(maxWidth: .infinity)
                        text.frame(maxWidth: .infinity, alignment: .leading)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        if hasImage { image }
                        text
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .opensArticle(item)
            SourceLine(item: item, story: story)
        }
    }
}

// ---- Vorm 2: compact bericht ----
struct ItemRow: View {
    @Environment(HootStore.self) private var store
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric(relativeTo: .title3) private var thumb: CGFloat = 76
    let item: Item
    var label: String?
    var story: Story?
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Kicker(text: label)
                    Text(item.title)
                        .font(Theme.headline(.title3))
                        .foregroundStyle(store.isRead(item) ? .secondary : .primary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let summary = item.summary, !summary.isEmpty {
                        Text(summary).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                // Bij heel grote tekst geen miniatuur naast de kop: de kop krijgt de hele breedte.
                if item.image != nil, store.showsImage(lead: false), !typeSize.isAccessibilitySize {
                    RemoteImage(url: ImageURL.url(item.image, .thumb))
                        .frame(width: min(thumb, 96), height: min(thumb, 96))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
            .contentShape(Rectangle())
            .opensArticle(item)
            SourceLine(item: item, story: story)
        }
        .padding(.vertical, 6)
    }
}

struct EmptyState: View {
    let title: String
    let systemImage: String
    var text: String = ""
    var body: some View {
        ContentUnavailableView(title, systemImage: systemImage, description: Text(text))
    }
}
