import Foundation

// De dagdeelwissel (Editie sneller C3, besluit Alex 13 november 2026), gelijk aan shared/dagdeel-wissel.mjs op het web
// (tests/dagdeel-wissel.test.mjs houdt de twee gelijk). Bij een nieuw dagdeel blijft de vorige Editie staan tot de
// nieuwe er is, met in de kop "De Avondeditie komt eraan". Komt de nieuwe binnen: bovenaan en niet aan het lezen
// = wisselen met het drukken; anders bovenin "De Avondeditie staat klaar" (tik = wisselen, bovenaan). Een vers
// toestel zonder vorige Editie houdt de laadstrepen. De vorige Editie wordt alleen getoond, nooit opnieuw bewaard.
enum DagdeelWissel {
    // Een dag en een beetje: de Avondeditie van gisteren tot de Ochtendeditie, ook als je een dagdeel oversloeg.
    static let holdMax: TimeInterval = 26 * 60 * 60
    // Bovenaan: hooguit zoveel punten gescrold.
    static let atTop: CGFloat = 8

    // Mag deze Editie blijven staan terwijl de Editie van de kern `kern` komt? Alleen van deze lezer, van een eerder
    // dagdeel, met plekken, en niet ouder dan `holdMax`. Zonder tijd aan een van beide: nee.
    static func mayHold(_ prev: Edition?, kern: Edition?, owner: String) -> Bool {
        guard let prev, let kern, !prev.entries.isEmpty, prev.owner == owner, prev.id != kern.id,
              let a = prev.builtAt.flatMap(HootDate.parse), let b = kern.builtAt.flatMap(HootDate.parse) else { return false }
        let gap = b.timeIntervalSince(a)
        return gap > 0 && gap <= holdMax
    }

    // Wisselen zonder te vragen: alleen bovenaan en als je niet leest (geen verhaal of lezer open).
    static func swapsNow(atTop: Bool, reading: Bool) -> Bool { atTop && !reading }

    private static func naam(_ slot: String?) -> String { slot.flatMap { Slots.all[$0]?.naam }.map { "De \($0)" } ?? "De nieuwe Editie" }
    static func comingLine(_ slot: String?) -> String { "\(naam(slot)) komt eraan" }
    static func readyLine(_ slot: String?) -> String { "\(naam(slot)) staat klaar" }
}
