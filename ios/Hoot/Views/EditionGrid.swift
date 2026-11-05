import SwiftUI

// Het brede Editie-raster (keuze 1.1.0). Gelijk aan src/lib/pairs.js en de container-regels van .front
// en .pairs op het web.
// - iPad staand (B · Eén leeskolom): na het hoofdverhaal één kolom op leesbreedte, de nummers in de
//   kantlijn (Layout.hang), zodat koppen en tekst op één lijn staan. Een gat kan hier niet ontstaan.
// - iPad liggend (A · Paren): het hoofdverhaal met 02 en 03 ernaast (het beeld rekt mee tot beide even
//   hoog zijn), daarna paren in twee kolommen, elk paar even hoog en de bronregels per rij op één lijn.
enum EditionPairs {
    static let slack: CGFloat = 48 // twee regels: kleiner verschil laat het paar zoals het is
    static let leadMin: CGFloat = 240 // het beeld van het hoofdverhaal wordt nooit lager dan dit

    struct Cell { let key: String; let height: CGFloat; let image: Bool }

    // Is het ene verhaal van een paar meer dan twee regels korter en heeft het een beeld, dan staat dat
    // beeld groot boven het verhaal, zo hoog als het verschil (tussen een kwart en de helft van de
    // kolombreedte). Maakt dat het verschil niet kleiner, dan blijft het klein.
    static func plan(_ cells: [Cell], width: CGFloat, gap: CGFloat = Space.s3) -> [String: CGFloat] {
        var out: [String: CGFloat] = [:]
        var i = 0
        while i + 1 < cells.count {
            let a = cells[i], b = cells[i + 1]
            i += 2
            let d0 = abs(a.height - b.height)
            guard d0 > slack, width > 0 else { continue }
            let short = a.height < b.height ? a : b
            let other = short.key == a.key ? b : a
            guard short.image else { continue }
            let x = (min(width / 2, max(width / 4, other.height - short.height - gap))).rounded()
            guard abs(short.height + x + gap - other.height) < d0 else { continue }
            out[short.key] = x
        }
        return out
    }

    // Het beeld van het hoofdverhaal naast zijn zijkolom: even hoog als die, en minstens leadMin.
    static func leadImage(side: CGFloat, text: CGFloat, min: CGFloat = leadMin) -> CGFloat { (max(min, side - text)).rounded() }

    // Staand of liggend: B op een staande iPad, A op een liggende (en breder).
    static func paired(_ size: CGSize) -> Bool { size.width > size.height }
}

// Een verhaal met het nummer in de kantlijn (B): het nummer op de eerste regel van de rubriek.
struct HangRow<Content: View>: View {
    let number: Int?
    var read = false
    @ViewBuilder var content: () -> Content
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s3) {
            EditionNumber(number: number, read: read)
                .frame(width: Layout.hang - Space.s3, alignment: .leading)
                .accessibilityHidden(true) // het nummer staat ook in het label van het verhaal
            content()
        }
    }
}

// De paren (A): een Grid, zodat de twee verhalen van een rij even hoog zijn en de bronregels per rij
// onderaan op één lijn staan. Poetsbeurt 5 november (gelijk aan src/styles/rust.css): geen groot beeld
// meer boven het kortere verhaal; een rij is altijd kop links en een klein beeld rechts, op één hoogte.
// Heeft het ene verhaal van een rij een waarom-regel en het andere niet, dan houdt het andere die regel
// leeg vrij (`whySpace`), zodat beide koppen en beide beelden op één lijn beginnen. Een los laatste
// verhaal blijft één kolom breed, links. (EditionPairs.plan blijft bestaan voor de toetsen, maar het
// raster gebruikt hem niet meer.)
struct EditionPairsGrid<Cell: View>: View {
    let rows: [EditionRowModel]
    let width: CGFloat
    @ViewBuilder let cell: (EditionRowModel, Bool) -> Cell // rij, waarom-regel vrijhouden

    // Houdt dit verhaal een lege waarom-regel vrij? Alleen als het zelf geen waarom heeft en zijn buur wel.
    static func whySpace(_ rows: [EditionRowModel], at i: Int) -> Bool {
        let buur = i % 2 == 0 ? i + 1 : i - 1
        guard rows.indices.contains(buur) else { return false }
        return !WhyLine.shows(rows[i].why) && WhyLine.shows(rows[buur].why)
    }

    var body: some View {
        let pairs = stride(from: 0, to: rows.count, by: 2).map { Array(rows.indices[$0..<min($0 + 2, rows.count)]) }
        Grid(alignment: .topLeading, horizontalSpacing: Space.s6, verticalSpacing: 0) {
            ForEach(pairs, id: \.first!) { pair in
                GridRow(alignment: .top) {
                    ForEach(pair, id: \.self) { i in
                        VStack(alignment: .leading, spacing: 0) {
                            Rule().padding(.vertical, Space.s2)
                            cell(rows[i], Self.whySpace(rows, at: i))
                        }
                        .frame(maxHeight: .infinity, alignment: .top)
                    }
                    if pair.count == 1 { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) } // de rechterbaan blijft leeg
                }
            }
        }
    }
}
