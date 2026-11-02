import Foundation

enum CorrectionReason: String, Codable, CaseIterable {
    case desk, country, event, duplicate
    var label: String { switch self { case .desk: "Verkeerde rubriek"; case .country: "Verkeerd land"; case .event: "Andere gebeurtenis"; case .duplicate: "Dubbel verhaal" } }
}
struct Correction: Codable, Equatable {
    let articleId: String
    let storyId: String?
    let reason: CorrectionReason
    let title: String
    let url: String?
    let at: Date
}
// Zelfde betekenis en limiet als corrections.mjs, buiten prefs en buiten de smaakberekening.
enum CorrectionStore {
    static let limit = 200
    private static func key(_ owner: String?) -> String? {
        guard let owner, !owner.isEmpty, owner.utf8.count <= 200 else { return nil }
        return "hoot.corrections." + owner
    }
    static func read(owner: String?, defaults: UserDefaults = .standard) -> [Correction] {
        guard let key = key(owner), let data = defaults.data(forKey:key), data.count <= 500_000,
              let rows = try? JSONDecoder().decode([Correction].self,from:data) else { return [] }
        return Array(rows.filter{ !$0.articleId.isEmpty && $0.articleId.count <= 200 }.prefix(limit))
    }
    @discardableResult static func record(owner: String?, articleId: String, storyId: String?, reason: CorrectionReason, title: String, url: String?, at: Date = .now, defaults: UserDefaults = .standard) -> Bool {
        guard let key = key(owner), !articleId.isEmpty, articleId.count <= 200 else { return false }
        var safe: String?
        if let url, var c = URLComponents(string:url), ["https","http"].contains(c.scheme?.lowercased() ?? ""), c.user == nil, c.password == nil, c.host != nil {
            c.query = nil; c.fragment = nil
            safe = c.string.map{String($0.prefix(2048))}
        }
        let row = Correction(articleId:articleId,storyId:storyId.map{String($0.prefix(200))},reason:reason,title:String(title.prefix(300)),url:safe,at:at)
        let rows = Array(([row] + read(owner:owner,defaults:defaults).filter{$0.articleId != articleId || $0.reason != reason}).prefix(limit))
        guard let data = try? JSONEncoder().encode(rows) else { return false }
        defaults.set(data,forKey:key)
        return read(owner:owner,defaults:defaults).first == row
    }
}


@MainActor
extension HootStore {
    @discardableResult func reportMistake(_ item: Item, reason: CorrectionReason, defaults: UserDefaults = .standard) -> Bool {
        guard account?.status != .loading else { return false }
        return CorrectionStore.record(owner:account?.uid ?? "anon",articleId:item.id,storyId:story(of:item)?.id,reason:reason,title:item.title,url:item.url,defaults:defaults)
    }
}
