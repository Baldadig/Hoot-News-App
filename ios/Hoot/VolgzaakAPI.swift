import Foundation

// POST /api/volgzaak (netlify/lib/volgzaak.mjs), gelijk aan vraagVolgzaak op het web. De naam van wat je volgt (de slug)
// en je opdracht gaan alleen in de body, nooit in een adres, header of log. Nooit uit een cache.
//
// Acties: duiden { opdracht } (lid, kost iets, telt voor je quotum), volgen en ontvolgen
// { slug } (lid, een anonieme +1 of -1), pagina { slug } en overzicht { slugs } (iedereen, gratis).
// Een server zonder deze functie (of met HOOT_VOLGZAKEN uit) antwoordt 404: de app toont dan niets nieuws.
enum VolgzaakAPI {
    // De uitkomst: de status (0 = geen verbinding of te traag) en het ruwe antwoord.
    struct Antwoord: Sendable {
        var status: Int
        var data: Data?
        var ok: Bool { status == 200 && data != nil }
        func lees<T: Decodable>(_ type: T.Type) -> T? { data.flatMap { try? JSONDecoder().decode(T.self, from: $0) } }
        // De foutzin van de server ("Vandaag kun je niet meer opzoeken."), of de vaste.
        var fout: String {
            struct F: Decodable { var error: String? }
            return lees(F.self)?.error ?? VolgTekst.mislukt
        }
    }

    nonisolated(unsafe) static var transport: URLSession = HootAPI.session // alleen tests zetten hem
    nonisolated(unsafe) static var timeout: TimeInterval = 20

    static func vraag(_ actie: String, _ body: [String: any Sendable] = [:], token: String? = nil) async -> Antwoord {
        #if DEBUG
        if let nep = await VolgNep.antwoord(actie, body) { return nep }
        #endif
        guard !DebugLaunch.offline else { return Antwoord(status: 0) }
        var all = body
        all["actie"] = actie
        let obj = all as [String: Any]
        guard JSONSerialization.isValidJSONObject(obj), let payload = try? JSONSerialization.data(withJSONObject: obj) else { return Antwoord(status: 0) }
        var request = URLRequest(url: HootAPI.base.appendingPathComponent("api/volgzaak"))
        request.httpMethod = "POST"
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = payload
        request.timeoutInterval = timeout
        guard let (data, response) = try? await transport.data(for: request) else { return Antwoord(status: 0) }
        return Antwoord(status: (response as? HTTPURLResponse)?.statusCode ?? 0, data: data)
    }

    // ---- De antwoorden ----
    // De duiding zoals de server haar publiek maakt (publiek in netlify/lib/volgzaak.mjs).
    struct Def: Codable, Hashable, Sendable, Identifiable {
        var id: String { slug }
        var slug: String
        var label: String
        var regel: String?
        var soort: String?
        var mijlpaal: String?
        var rubriek: String?
        var loopt: Bool?
        var namen: [String]?
        var uit: [String]?
        var zaak: StoryVolgzaak { StoryVolgzaak(slug: slug, label: label) }
    }
    // Een verhaal onder "Er speelde al" of op de pagina (momentopname per dagdeel).
    struct Stuk: Codable, Hashable, Sendable {
        var verhaal: String
        var kop: String
        var bron: String
        var url: String?
        var bronnen: Int?
        var at: String?
        var betaald: Bool?
        var rubriek: String?
    }
    struct Keuze: Codable, Hashable, Sendable, Identifiable {
        var naam: String
        var regel: String?
        var opdracht: String?
        var id: String { opdracht ?? naam }
    }
    // Duiden: soort volgzaak, bedoel, rubriek of geen.
    struct Duiding: Codable, Hashable, Sendable {
        var soort: String
        var volgzaak: Def?
        var eerder: [Stuk]?
        var bronnen: [String: Int]?
        var keuzes: [Keuze]?
        var rubriek: String?
        var binnen: [Keuze]?
        var tekst: String?
    }
    struct Samenvatting: Codable, Hashable, Sendable { var tekst: String?; var volgens: String? }
    struct Stand: Codable, Hashable, Sendable {
        var verhalen: [Stuk]?
        var samenvatting: Samenvatting? // alleen achter HOOT_VOLGZAAK_STAND
    }
    struct Pagina: Codable, Hashable, Sendable {
        var volgzaak: Def?
        var status: String?
        var stand: Stand?
        var slot: String? // de slotregel bij afloop ("GTA 6 is uit."), alleen op aanwijzing van de server
    }
    struct Overzicht: Codable, Sendable {
        var overzicht: [String: VolgzaakOverzicht?]
    }
}
