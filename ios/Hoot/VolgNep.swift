import Foundation

#if DEBUG
// Volgen 1.5 met nepdata, alleen in Debug en alleen met -HootVolgzaken nep: voor schermafdrukken en audits zonder server
// (HOOT_VOLGZAKEN staat daar uit). De vlag gaat aan, je volgt GTA 6 en Kabinetsformatie, een paar echte verhalen uit de feed
// krijgen het veld volgzaak, en /api/volgzaak antwoordt hier (VolgzaakAPI.vraag). De verhalen op de pagina en onder "Er
// speelde al" zijn echte koppen uit de feed van nu; alleen de namen en de tijden van "Eerder" zijn verzonnen.
@MainActor
enum VolgNep {
    private static weak var store: HootStore?
    private static var gekoppeld = false

    struct Def { let slug, label, regel, rubriek: String; let namen, uit: [String] }
    static let defs: [String: Def] = [
        "gta-6": Def(slug: "gta-6", label: "GTA 6", regel: "De nieuwe Grand Theft Auto van Rockstar", rubriek: "cultuur", namen: ["GTA 6", "GTA VI", "Grand Theft Auto VI"], uit: ["oudere GTA-delen"]),
        "kabinetsformatie": Def(slug: "kabinetsformatie", label: "Kabinetsformatie", regel: "Op weg naar een nieuw kabinet", rubriek: "politiek", namen: ["formatie", "informateur", "coalitie"], uit: ["gemeentelijke coalities"]),
        "tata-steel": Def(slug: "tata-steel", label: "Tata Steel", regel: "De rechtszaak van omwonenden tegen de staalfabriek", rubriek: "economie", namen: ["Tata Steel"], uit: []),
        "starship": Def(slug: "starship", label: "Starship", regel: "De grote raket van SpaceX", rubriek: "wetenschap", namen: ["Starship", "SpaceX"], uit: []),
    ]

    // Na het laden van de kern: de nepvolgzaken, de velden op de verhalen en de schermen van -HootScreen volg-….
    static func zet(_ s: HootStore) { if DebugLaunch.volgNep { store = s } }

    static func koppel(_ s: HootStore) {
        guard DebugLaunch.volgNep else { return }
        store = s
        let rows = s.editionRows
        var map: [String: StoryVolgzaak] = [:]
        func zet(_ story: String?, _ slug: String) { if let story, map[story] == nil, let d = defs[slug] { map[story] = StoryVolgzaak(slug: d.slug, label: d.label) } }
        if rows.count > 2 {
            zet(rows[1].story?.id, "kabinetsformatie")
            zet(rows[2].story?.id, "tata-steel")
        }
        // In de Stroom: een verhaal met meer bronnen dat niet bovenaan staat, zodat de voorrang te zien is.
        let kandidaten = s.stream.filter { !$0.isPost && ($0.storyId.flatMap { s.storiesById[$0]?.publisherCount } ?? 0) >= 2 && map[$0.storyId ?? ""] == nil }
        var gehad = Set<String>()
        let verhalen = kandidaten.compactMap { $0.storyId }.filter { gehad.insert($0).inserted }
        if verhalen.count > 4 { zet(verhalen[4], "gta-6") }
        if verhalen.count > 7 { zet(verhalen[7], "kabinetsformatie") }
        DebugLaunch.volgNepVerhalen = map
        guard !gekoppeld else { return }
        gekoppeld = true
        s.volgMelding = nil
        Task {
            try? await Task.sleep(for: .seconds(1.5))
            switch DebugLaunch.screen {
            case "volg-beheer": s.volgBeheer = true
            case "volg-blad": s.volgBlad = StoryVolgzaak(slug: "tata-steel", label: "Tata Steel")
            case "volg-inloggen": s.volgInloggen = StoryVolgzaak(slug: "tata-steel", label: "Tata Steel")
            case "volg-ongedaan": s.ontvolg("gta-6")
            case "volg-gevolgd": s.volgMelding = .gevolgd("Kabinetsformatie")
            default: break
            }
        }
    }

    // De lijst waarmee de nepdata begint (HootStore.init, vóór het laden: de Stroom zet de voorrang vast met de grens).
    nonisolated static func beginLijst() -> [Volgzaak] {
        let nu = Date.now
        return [
            Volgzaak(slug: "gta-6", label: "GTA 6", opdracht: "gta 6", at: Volgzaken.iso(nu.addingTimeInterval(-3 * 86400))),
            Volgzaak(slug: "kabinetsformatie", label: "Kabinetsformatie", opdracht: "kabinetsformatie", at: Volgzaken.iso(nu.addingTimeInterval(-10 * 86400)), gezien: Volgzaken.iso(nu.addingTimeInterval(-86400))),
        ]
    }

    private static func def(_ slug: String) -> [String: Any] {
        let d = defs[slug] ?? Def(slug: slug, label: slug.replacingOccurrences(of: "-", with: " ").capitalized, regel: "", rubriek: "binnenland", namen: [], uit: [])
        return ["slug": d.slug, "label": d.label, "regel": d.regel, "soort": "zaak", "mijlpaal": NSNull(), "rubriek": d.rubriek, "namen": d.namen, "uit": d.uit]
    }

    // De momentopname: eerst de verhalen met het veld, dan andere verhalen met meer bronnen; de latere krijgen tijden van
    // dagen en weken terug, zodat Nieuw en Eerder per week te zien zijn.
    private static func stand(_ slug: String, _ s: HootStore) -> [[String: Any]] {
        let eigen = DebugLaunch.volgNepVerhalen.filter { $0.value.slug == slug }.map(\.key)
        var ids = eigen
        for item in s.stream where !item.isPost {
            guard let sid = item.storyId, !ids.contains(sid), (s.storiesById[sid]?.publisherCount ?? 0) >= 2 else { continue }
            ids.append(sid)
            if ids.count >= 8 { break }
        }
        let terug: [Double] = [0, 0, 0, 2, 4, 6, 9, 13]
        return ids.enumerated().compactMap { i, sid in
            guard let story = s.storiesById[sid], let lead = story.leadId.flatMap({ s.itemsById[$0] }) ?? story.itemIds.lazy.compactMap({ s.itemsById[$0] }).first else { return nil }
            let at = i < 3 ? (lead.date ?? .now) : Date.now.addingTimeInterval(-terug[min(i, terug.count - 1)] * 86400)
            return ["verhaal": sid, "kop": lead.title, "bron": lead.source, "url": lead.url, "bronnen": story.publisherCount ?? 1, "at": Volgzaken.iso(at), "betaald": s.source(lead.source)?.paid == true, "rubriek": NSNull()]
        }
    }

    static func antwoord(_ actie: String, _ body: [String: any Sendable]) -> VolgzaakAPI.Antwoord? {
        guard DebugLaunch.volgNep, let s = store else { return nil }
        let uit: [String: Any]
        switch actie {
        case "pagina":
            let slug = body["slug"] as? String ?? ""
            uit = ["volgzaak": def(slug), "status": "actief", "stand": ["verhalen": stand(slug, s)]]
        case "overzicht":
            uit = ["overzicht": ["gta-6": ["laatstNieuw": Volgzaken.iso(.now), "status": "actief"], "kabinetsformatie": ["laatstNieuw": Volgzaken.iso(.now.addingTimeInterval(-2 * 86400)), "status": "actief"]]]
        case "volgen", "ontvolgen":
            uit = ["ok": true, "slug": body["slug"] as? String ?? ""]
        case "duiden":
            let q = (body["opdracht"] as? String ?? "").lowercased()
            if q.contains("tata") {
                uit = ["soort": "bedoel", "keuzes": [["naam": "Tata Steel", "regel": "De staalfabriek in IJmuiden en de rechtszaak", "opdracht": "tata steel ijmuiden"], ["naam": "Tata Consultancy", "regel": "Het Indiase IT-bedrijf", "opdracht": "tata consultancy"]]]
            } else if q == "tech" {
                uit = ["soort": "rubriek", "rubriek": "tech", "binnen": [["naam": "Starship", "regel": "De grote raket van SpaceX", "opdracht": "starship"]]]
            } else if q.contains("buurman") {
                uit = ["soort": "geen", "tekst": VolgTekst.geen]
            } else {
                let slug = q.contains("formatie") ? "kabinetsformatie" : q.contains("starship") ? "starship" : "gta-6"
                let eerder = stand(slug, s)
                var bronnen: [String: Int] = [:]
                if slug == "starship" {
                    // Dunne dekking: alleen een gratis bron die je niet volgt.
                    if let tip = s.newsSources.first(where: { !s.isOn($0) && $0.paid != true && ($0.lang ?? "nl") == "nl" }) { bronnen[tip.id] = 6 }
                } else {
                    for e in eerder { if let b = e["bron"] as? String { bronnen[b, default: 0] += 1 } }
                }
                uit = ["soort": "volgzaak", "volgzaak": def(slug).merging(["loopt": true]) { $1 }, "eerder": slug == "starship" ? [] : eerder, "bronnen": bronnen]
            }
        default:
            return VolgzaakAPI.Antwoord(status: 400, data: Data(#"{"error":"Geen geldige invoer."}"#.utf8))
        }
        return VolgzaakAPI.Antwoord(status: 200, data: try? JSONSerialization.data(withJSONObject: uit))
    }
}
#endif
