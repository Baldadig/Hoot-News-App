import Foundation

// Gelijk aan shared/social-stream.mjs. Dit verandert uitsluitend de Stroom, niet de Editie.
enum SocialStream {
    static func allows(_ item: Item, enabled: Bool, followed: Set<String>, selected: Set<String>, now: Date = .now) -> Bool {
        guard enabled, item.isPost, followed.contains(item.source), selected.contains(item.source),
              item.editionOnly != true, let time = item.date else { return false }
        return time >= now.addingTimeInterval(-36 * 3600) && time <= now.addingTimeInterval(5 * 60)
    }
}
