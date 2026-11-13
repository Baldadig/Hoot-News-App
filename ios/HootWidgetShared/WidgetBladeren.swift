import AppIntents
import SwiftUI
import WidgetKit

// De bladerwidget (concept goedgekeurd door Alex, 13 november 2026): twee knoppen rechtsboven om door de Editie te
// bladeren, zonder de app te openen. Klein en Middel tonen één verhaal tegelijk (en na het laatste het einde), Groot
// drie tegelijk. Bladeren telt NIET als gelezen; alleen een verhaal openen telt (HootLink.verhaal, de app beslist).
// De plek blijft op het toestel, in de App Group; er gaat niets naar de server.

// MARK: - De plek

enum WidgetBlader {
    // Klein en Middel delen één plek (0 tot en met het aantal verhalen; het aantal zelf is het einde). Groot heeft een
    // eigen plek per drie (groep 0 tot en met aantal / 3; de laatste groep draagt het einde).
    enum Soort: String, Codable, Sendable { case enkel, groep }

    struct Stand: Codable, Equatable, Hashable, Sendable {
        var editie: String
        var enkel = 0
        var groep = 0
    }

    static let sleutel = "widget.bladeren"
    // De UserDefaults van de App Group; in toetsen een eigen suite, zodat de echte plek van het toestel blijft staan.
    nonisolated(unsafe) static var suiteOverride: String?
    static var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteOverride ?? (WidgetGroep.inToets ? "nl.hootnews.Hoot.toets.bladeren" : WidgetGroep.id))
    }

    // De plek bij deze Editie. Hoort de bewaarde plek bij een andere (oudere) Editie, dan terug naar het begin (01).
    static func stand(voor editie: String) -> Stand {
        guard let data = defaults?.data(forKey: sleutel),
              let s = try? JSONDecoder().decode(Stand.self, from: data), s.editie == editie else { return Stand(editie: editie) }
        return s
    }

    static func zet(_ soort: Soort, _ plek: Int, editie: String) {
        var s = stand(voor: editie)
        switch soort {
        case .enkel: s.enkel = max(0, plek)
        case .groep: s.groep = max(0, plek)
        }
        if let data = try? JSONEncoder().encode(s) { defaults?.set(data, forKey: sleutel) }
    }

    // Het einde (enkel) en de laatste groep (groep) van een Editie.
    static func einde(_ e: WidgetEditie) -> Int { e.verhalen.count }
    static func laatsteGroep(_ e: WidgetEditie) -> Int { e.verhalen.count / 3 }
    // De verhalen (indices) in groep `g`.
    static func groep(_ g: Int, in e: WidgetEditie) -> Range<Int> {
        let n = e.verhalen.count
        return min(n, 3 * g)..<min(n, 3 * g + 3)
    }

    // De plek die de widget toont: de bewaarde plek als hij bij deze Editie hoort, binnen de grenzen.
    static func enkel(_ stand: Stand?, _ e: WidgetEditie) -> Int {
        guard let stand, stand.editie == e.id else { return 0 }
        return min(max(0, stand.enkel), einde(e))
    }
    static func groep(_ stand: Stand?, _ e: WidgetEditie) -> Int {
        guard let stand, stand.editie == e.id else { return 0 }
        return min(max(0, stand.groep), laatsteGroep(e))
    }

    // De kinds die opnieuw moeten tekenen na een tik: Klein en Middel (één kind) en Groot.
    static let soorten = [WidgetGroep.soort, WidgetGroep.soort + ".overzicht"]
}

// Een tik op een bladerknop: de nieuwe plek bewaren en de widgets opnieuw laten tekenen. De knop rekent zelf uit waar
// hij heen gaat (`plek`), zodat twee snelle tikken op een oude weergave nooit een verhaal overslaan.
struct BladerIntent: AppIntent {
    static let title: LocalizedStringResource = "Bladeren in de Editie"
    static let isDiscoverable = false

    @Parameter(title: "Soort") var soort: String
    @Parameter(title: "Plek") var plek: Int
    @Parameter(title: "Editie") var editie: String

    init() {}
    init(_ soort: WidgetBlader.Soort, plek: Int, editie: String) {
        self.soort = soort.rawValue
        self.plek = plek
        self.editie = editie
    }

    func perform() async throws -> some IntentResult {
        WidgetBlader.zet(WidgetBlader.Soort(rawValue: soort) ?? .enkel, plek, editie: editie)
        for kind in WidgetBlader.soorten { WidgetCenter.shared.reloadTimelines(ofKind: kind) }
        return .result()
    }
}

// MARK: - Koppen zetten

// Welke tekst in welke maat, met of zonder bronregel. Een kop wordt nooit afgekapt (WidgetZet): past de hele kop niet,
// dan de korte kop (shared/kort-kop.mjs: de kop zelf of herschreven, nooit ingekort), dan kleiner (tot de ondergrens),
// dan zonder bronregel. Past ook dat niet, dan "Tik om te lezen." onder het nummer: het verhaal blijft bereikbaar.
enum BladerZet {
    static let rij: CGFloat = 28 // de kopregel met de knoppen
    // Afronding: iOS zet elke rij op hele (of halve) punten, met regels van 18,4 punt is dat tot een punt per rij meer
    // dan gerekend. Die punt houden we per rij vrij, zodat de onderste bronregel nooit over de marge valt.
    static let afronding: CGFloat = 1
    static let reserve = "Tik om te lezen."

    struct Keuze: Hashable, Sendable {
        let gezet: WidgetZet.Gezet
        let m: WidgetLetter.Maat
        let bron: Bool
        var reserve: Bool { gezet.tekst == BladerZet.reserve }
        var hoogte: CGFloat { CGFloat(gezet.regels) * m.regel }
    }

    // De mogelijkheden voor een verhaal, van best naar minst goed. `kortEerst`: Klein toont de korte kop.
    static func opties(_ v: WidgetVerhaal, breedte: CGFloat, kortEerst: Bool) -> [Keuze] {
        let heel = KortKop.schoon(v.kop)
        let kort = KortKop.schoon(v.kortKop)
        var teksten = kortEerst ? [kort, heel] : [heel, kort]
        if kort == heel { teksten = [heel] }
        var uit: [Keuze] = []
        for bron in [true, false] {
            for m in WidgetZet.trap(WidgetLetter.widgetKop) {
                for t in teksten {
                    uit.append(Keuze(gezet: .init(tekst: t, regels: WidgetZet.regels(t, m, breedte: breedte)), m: m, bron: bron))
                }
            }
        }
        uit.append(Keuze(gezet: .init(tekst: reserve, regels: WidgetZet.regels(reserve, WidgetLetter.widgetKop, breedte: breedte)), m: WidgetLetter.widgetKop, bron: false))
        return uit
    }

    // De hoogte van een rij: de kop, en met bronregel de lucht en de bronregel(s). Zonder bronregel blijft onder de kop de
    // daalhoogte vrij (s1): de staarten van g, j en y vallen onder de regelhoogte (zoals VergrendelRechthoek.daal).
    static func hoogte(_ k: Keuze, bron naam: String, breedte: CGFloat, lucht: CGFloat) -> CGFloat {
        k.hoogte + (k.bron ? lucht + CGFloat(WidgetZet.bronRegels(naam, breedte: breedte)) * WidgetZet.bronRegel : WidgetRuimte.s1)
    }

    // Eén verhaal in `hoogte`: de eerste mogelijkheid die past.
    static func een(_ v: WidgetVerhaal, breedte: CGFloat, hoogte: CGFloat, lucht: CGFloat, kortEerst: Bool) -> Keuze {
        let o = opties(v, breedte: breedte, kortEerst: kortEerst)
        return o.first { Self.hoogte($0, bron: v.bron, breedte: breedte, lucht: lucht) <= hoogte } ?? o.last!
    }

    // Drie verhalen (Groot) in `hoogte`, met `tussen` tussen twee rijen: eerst elk zijn beste vorm; past het niet, dan
    // zet telkens de hoogste rij een stap terug, tot het past. Nooit een rij weg: elk verhaal van de groep blijft staan.
    static func groep(_ vs: [WidgetVerhaal], breedte: CGFloat, hoogte: CGFloat, tussen: CGFloat, lucht: CGFloat) -> [Keuze] {
        let o = vs.map { opties($0, breedte: breedte, kortEerst: false) }
        var stap = Array(repeating: 0, count: vs.count)
        func h(_ i: Int) -> CGFloat { Self.hoogte(o[i][stap[i]], bron: vs[i].bron, breedte: breedte, lucht: lucht) }
        func totaal() -> CGFloat { vs.indices.reduce(0) { $0 + h($1) } + tussen * CGFloat(max(0, vs.count - 1)) }
        while totaal() > hoogte {
            guard let i = vs.indices.filter({ stap[$0] < o[$0].count - 1 }).max(by: { h($0) < h($1) }) else { break }
            stap[i] += 1
        }
        return vs.indices.map { o[$0][stap[$0]] }
    }
}

// MARK: - Onderdelen

// Een bladerknop: rond, 28 punt, haarlijn `rule`, een chevron. Uitgeschakeld aan het begin of het eind (`doel` nil).
struct WBladerKnop: View {
    let links: Bool
    let doel: Int?
    let soort: WidgetBlader.Soort
    let editie: String
    let label: String
    var body: some View {
        Button(intent: BladerIntent(soort, plek: doel ?? 0, editie: editie)) {
            Image(systemName: links ? "chevron.left" : "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(WidgetKleur.ink)
                .frame(width: BladerZet.rij, height: BladerZet.rij)
                .overlay(Circle().strokeBorder(WidgetKleur.rule, lineWidth: 1))
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .disabled(doel == nil)
        .opacity(doel == nil ? 0.3 : 1)
        .accessibilityLabel(label)
    }
}

struct WBladerKnoppen: View {
    let soort: WidgetBlader.Soort
    let plek: Int
    let laatste: Int
    let editie: String
    var body: some View {
        HStack(spacing: WidgetRuimte.s2) {
            WBladerKnop(links: true, doel: plek > 0 ? plek - 1 : nil, soort: soort, editie: editie,
                        label: soort == .enkel ? "Vorig verhaal" : "Vorige drie")
            WBladerKnop(links: false, doel: plek < laatste ? plek + 1 : nil, soort: soort, editie: editie,
                        label: soort == .enkel ? "Volgend verhaal" : "Volgende drie")
        }
    }
    static let breedte = 2 * BladerZet.rij + WidgetRuimte.s2
}

// Het einde van de Editie in de widget: de eindzin, de volgende Editie en "Terug naar 01".
struct WBladerEinde: View {
    let editie: WidgetEditie
    let breedte: CGFloat
    let maat: WidgetLetter.Maat // item in Klein en Middel, lead in Groot
    var body: some View {
        let m = WidgetZet.trap(maat).first { WidgetZet.regels(editie.eindzin, $0, breedte: breedte) == 1 } ?? WidgetLetter.widgetKop.op(WidgetZet.ondergrens)
        let volgende = WidgetZet.voet(WidgetDagdeel.volgendeZin(na: editie.dagdeel), breedte: breedte)
        VStack(alignment: .leading, spacing: 0) {
            Text(editie.eindzin).widgetKop(m, regels: 1).foregroundStyle(WidgetKleur.ink)
            Text(volgende).font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink3)
                .lineHeight(.exact(points: WidgetZet.bronRegel)).fixedSize(horizontal: false, vertical: true)
                .widgetMeting(.voet(volgende))
                .padding(.top, WidgetRuimte.s1)
        }
        .accessibilityElement(children: .combine)
    }
    static func hoogte(_ editie: WidgetEditie, breedte: CGFloat, maat: WidgetLetter.Maat) -> CGFloat {
        let m = WidgetZet.trap(maat).first { WidgetZet.regels(editie.eindzin, $0, breedte: breedte) == 1 } ?? WidgetLetter.widgetKop.op(WidgetZet.ondergrens)
        return m.regel + WidgetRuimte.s1 + WidgetZet.bronRegel
    }
}

struct WTerugNaarBegin: View {
    let soort: WidgetBlader.Soort
    let editie: String
    var body: some View {
        Button(intent: BladerIntent(soort, plek: 0, editie: editie)) {
            Text("Terug naar 01").font(WidgetLetter.meta).foregroundStyle(WidgetKleur.ink)
                .lineHeight(.exact(points: WidgetZet.bronRegel)).fixedSize()
        }
        .buttonStyle(.plain)
    }
}

// Een kop in de bladerwidget: de hele kop of de korte, of de reserve ("Tik om te lezen.") in ink-3.
private struct WBladerKop: View {
    let k: BladerZet.Keuze
    let gelezen: Bool
    var body: some View {
        if k.reserve {
            // In de letter van het nummer ernaast (dan blijft de rij precies zo hoog als gemeten), in ink-3.
            Text(k.gezet.tekst).widgetKop(k.m, regels: k.gezet.regels).foregroundStyle(WidgetKleur.ink3)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            WKop(gezet: k.gezet, m: k.m, gelezen: gelezen)
        }
    }
}

// MARK: - Klein · Bladeren

// Bovenaan het nummer en de knoppen; daaronder de korte kop en onderaan de bron. Na 10 het einde. Klein kent geen
// losse tikvlakken (alleen de knoppen): een tik elders opent het verhaal, of aan het einde de Editie.
struct KleinBladeren: View {
    let editie: WidgetEditie
    let maat: CGSize
    let marge: CGFloat
    let plek: Int

    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat, plek: Int) -> BladerZet.Keuze? {
        guard plek < editie.verhalen.count else { return nil }
        let breedte = maat.width - 2 * marge
        let hoogte = maat.height - 2 * marge - BladerZet.rij - WidgetRuimte.s2 - BladerZet.afronding
        return BladerZet.een(editie.verhalen[plek], breedte: breedte, hoogte: hoogte, lucht: WidgetRuimte.s2, kortEerst: true)
    }

    var body: some View {
        let breedte = maat.width - 2 * marge
        let einde = plek >= editie.verhalen.count
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                if !einde {
                    let v = editie.verhalen[plek]
                    WNummer(nummer: v.nummer, gelezen: v.gelezen(in: Set(editie.gelezen)))
                }
                Spacer(minLength: WidgetRuimte.s2)
                WBladerKnoppen(soort: .enkel, plek: plek, laatste: WidgetBlader.einde(editie), editie: editie.id)
            }
            .frame(height: BladerZet.rij)
            Group {
                if einde {
                    VStack(alignment: .leading, spacing: 0) {
                        WBladerEinde(editie: editie, breedte: breedte, maat: WidgetLetter.item)
                        Spacer(minLength: WidgetRuimte.s2)
                        WTerugNaarBegin(soort: .enkel, editie: editie.id)
                    }
                } else if let k = Self.zet(editie, maat: maat, marge: marge, plek: plek) {
                    let v = editie.verhalen[plek]
                    VStack(alignment: .leading, spacing: 0) {
                        WBladerKop(k: k, gelezen: v.gelezen(in: Set(editie.gelezen)))
                        Spacer(minLength: WidgetRuimte.s2)
                        if k.bron { WBron(naam: v.bron) }
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Verhaal \(v.nummer) van \(editie.verhalen.count): \(v.kop). \(v.bron)")
                }
            }
            .padding(.top, WidgetRuimte.s2)
            .id(plek)
            .transition(.opacity)
        }
        .padding(marge)
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        .widgetURL(einde ? HootLink.editie : HootLink.verhaal(editie.verhalen[plek].itemId))
    }
}

// MARK: - Middel · Bladeren

// De kopregel met de Editienaam (tik: de Editie) en de knoppen; daaronder het nummer en de kop (de hele als hij heel
// past, anders de korte), onderaan de bron. Na 10 het einde.
struct MiddelBladeren: View {
    let editie: WidgetEditie
    let maat: CGSize
    let marge: CGFloat
    let plek: Int

    static func kolom(_ maat: CGSize, marge: CGFloat) -> CGFloat { maat.width - 2 * marge - MiddelTop3.nummerKolom - WidgetRuimte.s2 }
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat, plek: Int) -> BladerZet.Keuze? {
        guard plek < editie.verhalen.count else { return nil }
        let hoogte = maat.height - 2 * marge - BladerZet.rij - WidgetRuimte.s2 - BladerZet.afronding
        return BladerZet.een(editie.verhalen[plek], breedte: kolom(maat, marge: marge), hoogte: hoogte, lucht: WidgetRuimte.s2, kortEerst: false)
    }

    var body: some View {
        let breedte = maat.width - 2 * marge
        let einde = plek >= editie.verhalen.count
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                Link(destination: HootLink.editie) {
                    WKopregel(naam: editie.naam, breedte: breedte - WBladerKnoppen.breedte - WidgetRuimte.s2)
                }
                Spacer(minLength: WidgetRuimte.s2)
                WBladerKnoppen(soort: .enkel, plek: plek, laatste: WidgetBlader.einde(editie), editie: editie.id)
            }
            .frame(height: BladerZet.rij)
            Group {
                if einde {
                    VStack(alignment: .leading, spacing: 0) {
                        WBladerEinde(editie: editie, breedte: breedte, maat: WidgetLetter.item)
                        Spacer(minLength: WidgetRuimte.s2)
                        WTerugNaarBegin(soort: .enkel, editie: editie.id)
                    }
                } else if let k = Self.zet(editie, maat: maat, marge: marge, plek: plek) {
                    let v = editie.verhalen[plek]
                    let lees = v.gelezen(in: Set(editie.gelezen))
                    Link(destination: HootLink.verhaal(v.itemId)) {
                        VStack(alignment: .leading, spacing: 0) {
                            HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                                WNummer(nummer: v.nummer, gelezen: lees, grootte: k.m.grootte, regel: k.m.regel).frame(width: MiddelTop3.nummerKolom, alignment: .leading)
                                WBladerKop(k: k, gelezen: lees)
                            }
                            Spacer(minLength: WidgetRuimte.s2)
                            if k.bron { WBron(naam: v.bron).padding(.leading, MiddelTop3.nummerKolom + WidgetRuimte.s2) }
                        }
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Verhaal \(v.nummer) van \(editie.verhalen.count): \(v.kop). \(v.bron)")
                }
            }
            .padding(.top, WidgetRuimte.s2)
            .id(plek)
            .transition(.opacity)
        }
        .padding(marge)
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        .widgetURL(HootLink.editie)
    }
}

// MARK: - Groot · Bladeren per drie

// De kopregel met de Editienaam en de knoppen; drie koppen met nummer en bron, gescheiden door haarlijnen (alleen
// koppen: geen samenvatting, geen beeld). Groepen 01-03, 04-06, 07-09, dan 10 met daaronder het einde.
struct GrootBladeren: View {
    let editie: WidgetEditie
    let maat: CGSize
    let marge: CGFloat
    let groep: Int

    static let tussen = 2 * WidgetRuimte.s2 + 1 // haarlijn met lucht
    static func kolom(_ maat: CGSize, marge: CGFloat) -> CGFloat { maat.width - 2 * marge - MiddelTop3.nummerKolom - WidgetRuimte.s2 }
    static func eindeHoogte(_ editie: WidgetEditie, breedte: CGFloat) -> CGFloat {
        WidgetRuimte.s5 + WBladerEinde.hoogte(editie, breedte: breedte, maat: WidgetLetter.lead) + WidgetRuimte.s3 + WidgetZet.bronRegel
    }

    // De rijen van deze groep: welk verhaal, in welke vorm. Ook gebruikt door de toetsen.
    static func zet(_ editie: WidgetEditie, maat: CGSize, marge: CGFloat, groep g: Int) -> [(index: Int, keuze: BladerZet.Keuze)] {
        let r = WidgetBlader.groep(g, in: editie)
        let einde = g >= WidgetBlader.laatsteGroep(editie)
        let hoogte = maat.height - 2 * marge - BladerZet.rij - WidgetRuimte.s3 - (einde ? eindeHoogte(editie, breedte: maat.width - 2 * marge) : 0)
            - BladerZet.afronding * CGFloat(r.count)
        let keuzes = BladerZet.groep(Array(editie.verhalen[r]), breedte: kolom(maat, marge: marge), hoogte: hoogte, tussen: tussen, lucht: WidgetRuimte.s1)
        return Array(zip(r, keuzes)).map { (index: $0.0, keuze: $0.1) }
    }

    var body: some View {
        let breedte = maat.width - 2 * marge
        let laatste = WidgetBlader.laatsteGroep(editie)
        let gelezen = Set(editie.gelezen)
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                Link(destination: HootLink.editie) {
                    WKopregel(naam: editie.naam, breedte: breedte - WBladerKnoppen.breedte - WidgetRuimte.s2)
                }
                Spacer(minLength: WidgetRuimte.s2)
                WBladerKnoppen(soort: .groep, plek: groep, laatste: laatste, editie: editie.id)
            }
            .frame(height: BladerZet.rij)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(Self.zet(editie, maat: maat, marge: marge, groep: groep).enumerated()), id: \.element.index) { i, rij in
                    let v = editie.verhalen[rij.index]
                    let lees = v.gelezen(in: gelezen)
                    if i > 0 { Rectangle().fill(WidgetKleur.rule).frame(height: 1).padding(.vertical, WidgetRuimte.s2) }
                    Link(destination: HootLink.verhaal(v.itemId)) {
                        VStack(alignment: .leading, spacing: WidgetRuimte.s1) {
                            HStack(alignment: .firstTextBaseline, spacing: WidgetRuimte.s2) {
                                WNummer(nummer: v.nummer, gelezen: lees, grootte: rij.keuze.m.grootte, regel: rij.keuze.m.regel).frame(width: MiddelTop3.nummerKolom, alignment: .leading)
                                WBladerKop(k: rij.keuze, gelezen: lees)
                            }
                            if rij.keuze.bron { WBron(naam: v.bron).padding(.leading, MiddelTop3.nummerKolom + WidgetRuimte.s2) }
                        }
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Verhaal \(v.nummer) van \(editie.verhalen.count): \(v.kop). \(v.bron)")
                }
                Spacer(minLength: 0)
                if groep >= laatste {
                    WBladerEinde(editie: editie, breedte: breedte, maat: WidgetLetter.lead)
                    WTerugNaarBegin(soort: .groep, editie: editie.id).padding(.top, WidgetRuimte.s3)
                }
            }
            .padding(.top, WidgetRuimte.s3)
            .id(groep)
            .transition(.opacity)
        }
        .padding(marge)
        .frame(width: maat.width, height: maat.height, alignment: .topLeading)
        .widgetURL(HootLink.editie)
    }
}
