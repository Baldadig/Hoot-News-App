import SwiftUI

// Eén rustige uitnodiging; de artikellezer bepaalt of hij voor deze bron zichtbaar mag zijn.
struct ReaderLoginPanel: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let sourceName: String
    let login: () -> Void
    let close: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s3) {
            HStack(alignment: .top, spacing: Space.s2) {
                Text("Abonnee? Log één keer in en lees het hele stuk hier.")
                    .font(.system(.subheadline, design: .serif))
                    .foregroundStyle(Theme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Button(action: close) {
                    Image(systemName: "xmark")
                        .font(.body).foregroundStyle(Theme.ink3)
                        .frame(width: Space.tap, height: Space.tap)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Sluiten")
            }
            Button(action: login) {
                Group {
                    if typeSize.isAccessibilitySize {
                        Text("Log in bij \(sourceName)")
                            .fixedSize(horizontal: false, vertical: true)
                    } else {
                        // SwiftUI meet de werkelijke tekst, lettermaat en beschikbare breedte.
                        // Alleen als de volledige éénregelige tekst niet past, volgt de vrije variant.
                        ViewThatFits(in: .horizontal) {
                            Text("Log in bij \(sourceName)").lineLimit(1)
                                .fixedSize(horizontal: true, vertical: true)
                            Text("Log in bij \(sourceName)")
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.vertical, Space.s3)
            }
            .buttonStyle(.ink)
        }
        .padding(Space.s4)
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .overlay(alignment: .top) { Rectangle().fill(Theme.rule).frame(height: 1).accessibilityHidden(true) }
        // Laat kleine horizontale of opwaartse bewegingen met rust.
        .simultaneousGesture(DragGesture(minimumDistance: 30).onEnded { value in
            if value.translation.height > 44 && value.translation.height > abs(value.translation.width) { close() }
        })
        .accessibilityAction(.escape, close)
    }
}
