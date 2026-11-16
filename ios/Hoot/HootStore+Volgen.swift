import Foundation

// Een pagina van één volgzaak, als bestemming in een NavigationStack (VolgPaginaView).
struct VolgRoute: Hashable, Identifiable, Sendable {
    let slug: String
    var label: String? = nil
    var id: String { slug }
}

// De melding onderaan na volgen of stoppen, zoals "Verwijderd uit Bewaard" (zelfde vorm, zelfde Ongedaan maken).
enum VolgMelding: Equatable {
    case gevolgd(String) // "Je volgt Kabinetsformatie."
    case gestopt(Volgzaak, index: Int) // "Je volgt GTA 6 niet meer." met Ongedaan maken
    case tekst(String) // "Je volgt er al drie.", een fout van de server

    var tekst: String {
        switch self {
        case let .gevolgd(label): VolgTekst.jeVolgtNaam(label)
        case let .gestopt(zaak, _): VolgTekst.nietMeer(zaak.label)
        case let .tekst(t): t
        }
    }
    var sleutel: String {
        switch self {
        case let .gevolgd(l): "g:\(l)"
        case let .gestopt(z, _): "s:\(z.slug)"
        case let .tekst(t): "t:\(t)"
        }
    }
}

// Volgen 1.5 in de staat van de app: gelijk aan volgZaak, ontvolgZaak en undoVolg in src/App.jsx. Alles achter de vlag:
// `volgzakenAan` is alleen waar met `meta.volgzaken: true` van de server (of -HootVolgzaken nep in Debug).
extension HootStore {
    enum VolgUitkomst: Equatable { case ok, login, vol, mis }

    var volgzakenAan: Bool { volgzakenServer || DebugLaunch.volgNep }
    // Wat je volgt, voor de schermen: leeg met de vlag uit (dan ziet niemand iets).
    var volgzakenZichtbaar: [Volgzaak] { volgzakenAan ? volgzaken : [] }
    var volgtIets: Bool { !Volgzaken.actief(volgzakenZichtbaar).isEmpty }
    // Volgen, duiden en bijsturen vragen een account.
    var volgLid: Bool { account?.status == .member || DebugLaunch.volgNepLid }

    // Het veld `volgzaak` van een verhaal (server), alleen met de vlag.
    func volgzaakVan(_ story: Story?) -> StoryVolgzaak? {
        guard volgzakenAan, let story else { return nil }
        return story.volgzaak ?? DebugLaunch.volgzaak(story.id)
    }
    func volgzaakVan(_ item: Item) -> StoryVolgzaak? { volgzaakVan(story(of: item)) }
    // Het label "Je volgt" in de Editie en Vergelijken: het verhaal hoort bij iets wat je volgt.
    func volgtVan(_ story: Story?) -> StoryVolgzaak? {
        guard let zaak = volgzaakVan(story) else { return nil }
        return Volgzaken.actieveVolgzaken(volgzaken).first { $0.slug == zaak.slug }
    }
    // Het label "Je volgt" op een plek van de Editie: vast op de server (de plek draagt `volgt`, Altijd server, 16 november 2026),
    // en alleen zolang de slug nog in je lijst staat. Alleen met de vlag. In de nep-opstelling van de ontwikkelaar
    // (-HootVolgzaken nep) staat de server niet klaar om te stempelen: daar telt het veld van het verhaal als de stempel.
    func volgtOpPlek(_ plek: EditionEntry, story: Story?) -> StoryVolgzaak? {
        guard volgzakenAan else { return nil }
        if let z = Volgzaken.volgtVanPlek(plek, volgzaken) { return z }
        guard DebugLaunch.volgNep, plek.desk != "bubbel", let story, let zaak = DebugLaunch.volgzaak(story.id) else { return nil }
        return Volgzaken.actieveVolgzaken(volgzaken).first { $0.slug == zaak.slug }
    }
    func volgt(_ slug: String) -> Bool { Volgzaken.volgt(volgzakenZichtbaar, slug) }

    // Volgen: zonder account de vraag om in te loggen; bij drie het beheerblad met "Je volgt er al drie."; anders bovenaan
    // in je lijst, de melding "Je volgt X." en een anonieme +1 naar de server.
    @discardableResult
    func volg(_ zaak: StoryVolgzaak, opdracht: String = "") -> VolgUitkomst {
        guard volgzakenAan else { return .mis }
        guard volgLid else {
            volgInloggen = zaak
            return .login
        }
        let r = Volgzaken.volg(volgzaken, zaak, opdracht: opdracht)
        if r.vol {
            volgMelding = .tekst(VolgTekst.alDrie)
            volgBeheer = true
            return .vol
        }
        guard r.ok else { return .mis }
        if r.list != volgzaken {
            volgzaken = r.list
            volgMelding = .gevolgd(zaak.label)
            volgTel("volgen", zaak.slug)
        }
        return .ok
    }

    // Stop met volgen: geen vraag, wel "Je volgt X niet meer." met Ongedaan maken. Het label verdwijnt meteen; een stuk in de
    // Stroom blijft staan tot je opnieuw opent (de voorrang ligt vast per weergave). Werkt ook zonder netwerk.
    func ontvolg(_ slug: String) {
        let r = Volgzaken.ontvolg(volgzaken, slug)
        guard let weg = r.weg else { return }
        volgzaken = r.list
        volgMelding = .gestopt(weg, index: r.index)
        if weg.actief { volgTel("ontvolgen", slug) }
    }

    func ongedaanVolg() {
        guard case let .gestopt(weg, index) = volgMelding else { return }
        let terug = Volgzaken.herstel(volgzaken, weg, index: index)
        if terug != volgzaken {
            volgzaken = terug
            if weg.actief { volgTel("volgen", weg.slug) }
        }
        volgMelding = nil
    }

    // De pagina geopend: Zoeken zegt daarna "Niets nieuws".
    func volgBekeken(_ slug: String) {
        guard volgt(slug) else { return }
        volgzaken = Volgzaken.bekeken(volgzaken, slug)
    }
    // Bijsturen naar een andere volgzaak: je volgt voortaan die, op dezelfde plek (de server deed -1 en +1).
    func volgWissel(van: String, naar: StoryVolgzaak) { volgzaken = Volgzaken.wissel(volgzaken, van: van, naar: naar) }
    func volgVerplaats(van: Int, naar: Int) { volgzaken = Volgzaken.verplaats(volgzaken, van: van, naar: naar) }

    // Het token voor /api/volgzaak (lid). Nooit gelogd.
    func volgToken() async -> String? { await account?.editionToken() }

    // De anonieme +1 of -1. Mislukt het (geen netwerk), dan blijft je keuze staan: de teller bepaalt alleen de volgorde.
    private func volgTel(_ actie: String, _ slug: String) {
        Task { [weak self] in
            let token = await self?.volgToken()
            _ = await VolgzaakAPI.vraag(actie, ["slug": slug], token: token)
        }
    }

    // De rekenkern alvast laden zodra je iets volgt (de voorrang in de Stroom rekent in dezelfde tekenronde).
    func volgzakenGewijzigd() {
        guard volgzakenAan, !Volgzaken.actief(volgzaken).isEmpty else { return }
        Task.detached(priority: .utility) { await EditionEngine.volg.warm() }
    }

    // De invoer van volgzaakVoorrang (shared/volgzaak-weergave.mjs) voor een weergave van de Stroom.
    // `weergave`: alles, rubriek, bubbel of tab; `grens`: de index van de grens (nil: alles telt).
    func voorrangInvoer(_ items: [Item], weergave: String, grens: Int?, now: Date = .now) -> Data {
        struct Stuk: Encodable { let id: String; let storyId: String?; let publishedAt: String?; let kind: String? }
        struct Verhaal: Encodable { let volgzaak: StoryVolgzaak }
        struct In: Encodable {
            let lijst: [Stuk]; let verhalen: [String: Verhaal]; let volgzaken: [Volgzaak]; let grens: Int?
            let gezien: [String]; let gelezen: [String]; let now: Double; let weergave: String
        }
        var verhalen: [String: Verhaal] = [:]
        for item in items {
            guard let sid = item.storyId, verhalen[sid] == nil, let z = volgzaakVan(story(of: item)) else { continue }
            verhalen[sid] = Verhaal(volgzaak: z)
        }
        let invoer = In(lijst: items.map { Stuk(id: $0.id, storyId: $0.storyId, publishedAt: $0.publishedAt, kind: $0.isPost ? "post" : ($0.kind ?? "article")) },
                        verhalen: verhalen, volgzaken: volgzaken, grens: grens,
                        gezien: Array(streamGezien.keys), gelezen: readIds, now: (now.timeIntervalSince1970 * 1000).rounded(), weergave: weergave)
        return (try? JSONEncoder().encode(invoer)) ?? Data("{}".utf8)
    }

    // Alle bronnen voor de pagina en "Er speelde al", en welke van jou zijn (gevolgd en niet uitgezet).
    var volgBronnen: [[String: Any]] { newsSources.map { ["id": $0.id, "lang": $0.lang ?? "nl", "paid": $0.paid == true] } }
    var volgEigen: [String] { followed.map(\.id) }
    // De verhalen die je al las (ook in de Editie): die tellen op de pagina niet als nieuw.
    var gelezenVerhalen: [String] { Array(Set(readIds.compactMap { itemsById[$0]?.storyId })) }
}
