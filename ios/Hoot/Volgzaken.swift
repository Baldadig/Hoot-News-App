import Foundation

// Volgen in Hoot 1.5 (codenaam volgzaak), op het toestel. Gelijk aan src/lib/follow-volgzaken.js en src/lib/volgzaak.js op
// het web; de rekenregels per lezer (voorrang in de Stroom, de pagina, "Er speelde al") komen uit de gedeelde rekenkern
// (shared/volgzaak-weergave.mjs in Resources/edition-core.js, via EditionEngine).
//
// Je volgt niet één bundel maar iets wat over vele verhalen loopt (GTA 6, de kabinetsformatie). Hooguit drie tegelijk; wat
// je volgt staat alleen in je prefs (`volgzaken`, gaat mee met je account). De server krijgt alleen een anonieme +1 of -1 in
// een POST-body en kent nooit wie iets volgt.
//
// Alles achter de vlag: zonder `meta.volgzaken: true` van de server (HOOT_VOLGZAKEN=aan) ziet de lezer niets nieuws, ook niet
// met een server die deze functie niet kent. Het woord "onderwerp" staat nergens in de app (VolgzakenTests).

// Het veld `volgzaak { slug, label }` op een verhaal (server, alleen zekere treffers). Leest nooit fout: een kapot veld
// gooit hier, en Story maakt er nil van.
struct StoryVolgzaak: Codable, Hashable, Sendable, Identifiable {
    let slug: String
    let label: String
    var id: String { slug }

    init(slug: String, label: String) {
        self.slug = slug
        self.label = label
    }

    private enum CodingKeys: String, CodingKey { case slug, label }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let slug = try c.decode(String.self, forKey: .slug)
        let label = try c.decode(String.self, forKey: .label).trimmingCharacters(in: .whitespaces)
        guard Volgzaken.geldigeSlug(slug), !label.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .slug, in: c, debugDescription: "geen geldige volgzaak")
        }
        self.slug = slug
        self.label = label
    }
}

// Eén rij van de pref `volgzaken`, in de vorm van het web:
//   { slug, label, opdracht, at, gezien, status: 'actief' | 'gestopt', gestoptAt }
struct Volgzaak: Codable, Hashable, Sendable, Identifiable {
    var slug: String
    var label: String
    var opdracht: String = ""
    var at: String
    var gezien: String? = nil
    var status: String = "actief"
    var gestoptAt: String? = nil

    var id: String { slug }
    var actief: Bool { status != "gestopt" }

    private enum CodingKeys: String, CodingKey { case slug, label, opdracht, at, gezien, status, gestoptAt }
    init(slug: String, label: String, opdracht: String = "", at: String, gezien: String? = nil, status: String = "actief", gestoptAt: String? = nil) {
        self.slug = slug; self.label = label; self.opdracht = opdracht; self.at = at; self.gezien = gezien; self.status = status; self.gestoptAt = gestoptAt
    }
    // Leest ruim (zoals normalizePrefs): wat ontbreekt krijgt een lege waarde; Volgzaken.normaliseer controleert daarna.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        slug = try c.decode(String.self, forKey: .slug)
        label = try c.decode(String.self, forKey: .label)
        opdracht = ((try? c.decodeIfPresent(String.self, forKey: .opdracht)) ?? nil) ?? ""
        at = ((try? c.decodeIfPresent(String.self, forKey: .at)) ?? nil) ?? ""
        gezien = (try? c.decodeIfPresent(String.self, forKey: .gezien)) ?? nil
        status = ((try? c.decodeIfPresent(String.self, forKey: .status)) ?? nil) ?? "actief"
        gestoptAt = (try? c.decodeIfPresent(String.self, forKey: .gestoptAt)) ?? nil
    }
    // Voor je account: precies de sleutels van het web, `null` waar niets is.
    var alsPref: [String: Any] {
        ["slug": slug, "label": label, "opdracht": opdracht, "at": at, "gezien": gezien as Any? ?? NSNull(), "status": status, "gestoptAt": gestoptAt as Any? ?? NSNull()]
    }
}

enum Volgzaken {
    static let max = 3 // hooguit drie tegelijk (VOLGZAKEN_MAX)
    static let gestoptDagen: TimeInterval = 7 // gestopt blijft nog een week staan, met Volg weer (GESTOPT_DAGEN)
    static let labelMax = 24
    static let opdrachtMax = 200

    // ^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$, minstens twee tekens (follow-volgzaken.js).
    static func geldigeSlug(_ s: String) -> Bool {
        s.count >= 2 && s.wholeMatch(of: /[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?/) != nil
    }
    static func geldig(slug: String, label: String) -> Bool {
        geldigeSlug(slug) && !label.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // De tijd zoals JavaScript hem schrijft (toISOString): 2026-11-20T09:30:00.000Z.
    static func iso(_ d: Date) -> String { d.formatted(Date.ISO8601FormatStyle(includingFractionalSeconds: true)) }
    private static func isoOf(_ s: String?) -> String? { s.flatMap { HootDate.parse($0) != nil ? $0 : nil } }
    private static func knip(_ label: String) -> String { String(label.trimmingCharacters(in: .whitespaces).prefix(labelMax)) }

    // Opschonen bij het lezen (normalizeVolgzaken): geldige rijen, geen dubbelen, hooguit drie actief (de rest wordt
    // gestopt), gestopt alleen jonger dan een week, velden op hun maat.
    static func normaliseer(_ ruw: [Volgzaak], now: Date = .now) -> [Volgzaak] {
        var uit: [Volgzaak] = []
        var gehad = Set<String>()
        var actief = 0
        for z in ruw {
            guard geldig(slug: z.slug, label: z.label), gehad.insert(z.slug).inserted else { continue }
            var status = z.status == "gestopt" ? "gestopt" : "actief"
            var gestoptAt = status == "gestopt" ? isoOf(z.gestoptAt) : nil
            if status == "actief" && actief >= max {
                status = "gestopt"
                gestoptAt = iso(now)
            }
            if status == "gestopt", let g = gestoptAt.flatMap(HootDate.parse), now.timeIntervalSince(g) > gestoptDagen * 86400 { continue }
            if status == "actief" { actief += 1 }
            uit.append(Volgzaak(slug: z.slug, label: knip(z.label), opdracht: String(z.opdracht.prefix(opdrachtMax)), at: isoOf(z.at) ?? iso(now), gezien: isoOf(z.gezien), status: status, gestoptAt: gestoptAt))
        }
        return uit
    }

    static func actief(_ l: [Volgzaak]) -> [Volgzaak] { l.filter(\.actief) }
    static func gestopt(_ l: [Volgzaak]) -> [Volgzaak] { l.filter { !$0.actief } }
    static func volgt(_ l: [Volgzaak], _ slug: String) -> Bool { actief(l).contains { $0.slug == slug } }
    static func isVol(_ l: [Volgzaak]) -> Bool { actief(l).count >= max }

    // Volgen. Al gevolgd is ok zonder verandering; gestopt wordt weer actief (bovenaan); bij drie actieve volg je niets en
    // is `vol` waar ("Je volgt er al drie." met Beheer).
    static func volg(_ l: [Volgzaak], _ zaak: StoryVolgzaak, opdracht: String = "", now: Date = .now) -> (list: [Volgzaak], ok: Bool, vol: Bool) {
        guard geldig(slug: zaak.slug, label: zaak.label) else { return (l, false, false) }
        if volgt(l, zaak.slug) { return (l, true, false) }
        if isVol(l) { return (l, false, true) }
        let rest = l.filter { $0.slug != zaak.slug }
        let rij = Volgzaak(slug: zaak.slug, label: knip(zaak.label), opdracht: String(opdracht.prefix(opdrachtMax)), at: iso(now), gezien: nil, status: "actief", gestoptAt: nil)
        return ([rij] + rest, true, false)
    }

    // Stop met volgen: de rij gaat weg. `weg` en `index` zijn voor Ongedaan maken.
    static func ontvolg(_ l: [Volgzaak], _ slug: String) -> (list: [Volgzaak], weg: Volgzaak?, index: Int) {
        guard let i = l.firstIndex(where: { $0.slug == slug }) else { return (l, nil, -1) }
        var out = l
        let weg = out.remove(at: i)
        return (out, weg, i)
    }

    // Ongedaan maken: de rij terug op haar plek, zoals ze was. Intussen elders weer gevolgd: niets dubbel.
    static func herstel(_ l: [Volgzaak], _ weg: Volgzaak?, index: Int) -> [Volgzaak] {
        guard let weg, !l.contains(where: { $0.slug == weg.slug }) else { return l }
        if weg.actief && isVol(l) { return l }
        var out = l
        out.insert(weg, at: Swift.max(0, Swift.min(index, out.count)))
        return out
    }

    // Slepen in het beheerblad: van plek `van` naar `naar` binnen de actieve rijen; gestopte rijen blijven achteraan.
    static func verplaats(_ l: [Volgzaak], van: Int, naar: Int) -> [Volgzaak] {
        var a = actief(l)
        guard van >= 0, van < a.count, naar >= 0, naar < a.count, van != naar else { return l }
        let rij = a.remove(at: van)
        a.insert(rij, at: naar)
        return a + gestopt(l)
    }

    // De pagina geopend: wat er tot nu was, is gezien (Zoeken zegt dan "Niets nieuws").
    static func bekeken(_ l: [Volgzaak], _ slug: String, now: Date = .now) -> [Volgzaak] {
        l.map { z in
            var z = z
            if z.slug == slug { z.gezien = iso(now) }
            return z
        }
    }

    // "Nieuw" of "Niets nieuws" in Zoeken, nooit een getal: is er een nieuw verhaal sinds je de pagina het laatst opende (of
    // sinds je volgt)? `laatstNieuw` komt uit /api/volgzaak overzicht.
    static func isNieuw(_ zaak: Volgzaak, laatstNieuw: String?) -> Bool {
        guard let t = laatstNieuw.flatMap(HootDate.parse) else { return false }
        guard let sinds = HootDate.parse(zaak.gezien ?? zaak.at) else { return true }
        return t > sinds
    }

    // De rijen in Zoeken: eerst wat nieuw is, verder in je eigen volgorde.
    static func inVolgorde(_ l: [Volgzaak], overzicht: [String: VolgzaakOverzicht]) -> [(zaak: Volgzaak, nieuw: Bool)] {
        actief(l).enumerated()
            .map { (i: $0.offset, zaak: $0.element, nieuw: isNieuw($0.element, laatstNieuw: overzicht[$0.element.slug]?.laatstNieuw)) }
            .sorted { a, b in a.nieuw == b.nieuw ? a.i < b.i : a.nieuw }
            .map { ($0.zaak, $0.nieuw) }
    }

    // Het label in de Editie en Vergelijken (volgtVan in de rekenkern): { slug, label } als het verhaal bij iets hoort dat je
    // volgt. De naam komt uit je eigen lijst. Getoetst tegen tests/fixtures/volgzaak-golden.json (VolgzaakParityTests).
    static func volgtVan(_ story: Story?, _ l: [Volgzaak]) -> StoryVolgzaak? {
        guard let slug = story?.volgzaak?.slug else { return nil }
        return actieveVolgzaken(l).first { $0.slug == slug }
    }
    // Het label in de Editie, vast op de server (volgtVanPlek in de rekenkern): { slug, label } als de plek een `volgt` draagt
    // én die volgzaak nog in je lijst staat; niet onder Buiten je bubbel. Getoetst tegen tests/fixtures/volgzaak-golden.json.
    static func volgtVanPlek(_ plek: EditionEntry?, _ l: [Volgzaak]) -> StoryVolgzaak? {
        guard let plek, plek.desk != "bubbel", let slug = plek.volgt?.slug, !slug.isEmpty else { return nil }
        return actieveVolgzaken(l).first { $0.slug == slug }
    }
    // actieveVolgzaken in de rekenkern: status actief (of zonder status), geldige slug en naam, hooguit drie, in je volgorde.
    static func actieveVolgzaken(_ l: [Volgzaak]) -> [StoryVolgzaak] {
        var out: [StoryVolgzaak] = []
        var gehad = Set<String>()
        for z in l where !z.slug.isEmpty && !z.label.isEmpty && z.actief && gehad.insert(z.slug).inserted {
            out.append(StoryVolgzaak(slug: z.slug, label: z.label))
            if out.count >= max { break }
        }
        return out
    }

    // De rubriekregel (rubriekRegel in de rekenkern): hooguit twee delen; "Je volgt" gaat voor "Buiten je bronnen".
    static func rubriekRegel(rubriek: String?, volgt: Bool, buiten: Bool) -> (delen: [String], volgt: Bool, buiten: Bool) {
        var delen: [String] = []
        if let rubriek, !rubriek.isEmpty { delen.append(rubriek) }
        if volgt { delen.append(VolgTekst.jeVolgt) } else if buiten { delen.append(StoryLabel.outsideText) }
        return (delen, volgt, !volgt && buiten)
    }

    // Weinig in je bronnen: hooguit één treffer in je eigen bronnen (weinigInEigen).
    static func weinigInEigen(_ treffers: [String: Int], eigen: Set<String>) -> Bool {
        treffers.filter { eigen.contains($0.key) }.reduce(0) { $0 + $1.value } <= 1
    }
    // Een gratis bron in jouw taal die er vaak over schrijft en die je nog niet volgt (gratisTip). Nooit een betaalmuur,
    // nooit een taal die je niet koos, nooit Bluesky. Nil als er niets te tippen is.
    static func gratisTip(_ treffers: [String: Int], sources: [Source], eigen: Set<String>) -> Source? {
        var talen = Set(sources.filter { eigen.contains($0.id) }.map { $0.lang ?? "nl" })
        if talen.isEmpty { talen.insert("nl") }
        var kandidaten: [(s: Source, n: Int)] = []
        for (id, n) in treffers {
            guard let s = sources.first(where: { $0.id == id }), !eigen.contains(s.id), s.paid != true, s.kind != "sociaal" else { continue }
            if talen.contains(s.lang ?? "nl") { kandidaten.append((s, n)) }
        }
        kandidaten.sort { a, b in a.n != b.n ? a.n > b.n : a.s.id < b.s.id }
        return kandidaten.first?.s
    }

    // De link die Deel maakt: de pagina in Hoot (opent ook zonder account). Alleen Deel zet de slug in een adres, en dat
    // kies je zelf.
    static func deelLink(_ slug: String) -> URL {
        URL(string: "https://gethoot.app/lees/#/volg?naam=\(slug.addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(.init(charactersIn: "-"))) ?? slug)")!
    }
}

// Wat /api/volgzaak overzicht per slug teruggeeft.
struct VolgzaakOverzicht: Codable, Hashable, Sendable {
    var laatstNieuw: String?
    var status: String?
}

// Alle teksten van Volgen, gelijk aan TEKST in src/lib/volgzaak.js.
enum VolgTekst {
    static let volg = "Volg"
    static func volgNaam(_ label: String) -> String { "Volg \(label)" }
    static let volgend = "Volgend"
    static let jeVolgt = "Je volgt"
    static func jeVolgtNaam(_ label: String) -> String { "Je volgt \(label)." }
    static func nietMeer(_ label: String) -> String { "Je volgt \(label) niet meer." }
    static let ongedaan = "Ongedaan maken"
    static func naar(_ label: String) -> String { "Naar \(label)" }
    static let stop = "Stop met volgen"
    static let deel = "Deel"
    static let wijzig = "Wijzig"
    static let klaar = "Klaar"
    static let beheer = "Beheer"
    static let alDrie = "Je volgt er al drie."
    static let erSpeeldeAl = "Er speelde al"
    static let bedoelJe = "Bedoel je…"
    static func heleRubriek(_ r: String) -> String { "\(r) is een hele rubriek." }
    static func naarRubriek(_ r: String) -> String { "Naar \(r) in de Stroom" }
    static let geen = "Hier valt geen nieuws te volgen."
    static let weinig = "Weinig in je bronnen"
    static func tip(_ naam: String) -> String { "\(naam) schrijft hier vaak over, gratis." }
    static let voegToe = "Voeg toe"
    static let nieuw = "Nieuw"
    static let nietsNieuws = "Niets nieuws"
    static let eerder = "Eerder"
    static let bij = "Je bent bij."
    static let nietsNieuwsBij = "Niets nieuws. Je bent bij."
    static let stil = "Drie weken stil. Gestopt met volgen."
    static let volgWeer = "Volg weer"
    static let blijfVolgen = "Blijf volgen"
    static let gestopt = "Gestopt"
    static let inloggen = "Volgen kan met een account."
    static func bronnen(_ n: Int) -> String { n > 1 ? "+\(n - 1) \(n - 1 == 1 ? "bron" : "bronnen")" : "" }
    static func label(_ label: String) -> String { "Je volgt \(label), opent de pagina" }
    static let mislukt = "Dat lukte nu niet."
    static func nieuwTekst(_ nieuw: Bool) -> String { nieuw ? nieuw_ : nietsNieuws }
    private static let nieuw_ = "Nieuw"
    // Alle vaste teksten, voor de toets op het woord "onderwerp" en op em-dashes.
    static let alles: [String] = [volg, volgend, jeVolgt, ongedaan, stop, deel, wijzig, klaar, beheer, alDrie, erSpeeldeAl, bedoelJe, geen, weinig, voegToe, nieuw, nietsNieuws, eerder, bij, nietsNieuwsBij, stil, volgWeer, blijfVolgen, gestopt, inloggen, mislukt,
                                   volgNaam("X"), jeVolgtNaam("X"), nietMeer("X"), naar("X"), heleRubriek("X"), naarRubriek("X"), tip("X"), label("X")]
}
