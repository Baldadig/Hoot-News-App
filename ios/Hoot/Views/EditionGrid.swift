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

// De paren (A): een Grid, zodat de twee verhalen van een rij even hoog zijn. Eerst meet het raster
// elk verhaal in zijn gewone vorm; daarna krijgt een kort verhaal zijn beeld groot erboven en zakken
// de bronregels naar de onderkant van de rij.
struct EditionPairsGrid<Cell: View>: View {
    let rows: [EditionRowModel]
    let width: CGFloat
    @ViewBuilder let cell: (EditionRowModel, CGFloat?, Bool) -> Cell // rij, beeld erboven, bronregel onderaan

    @State private var heights: [String: CGFloat] = [:]
    @State private var plan: [String: CGFloat]? = nil
    @State private var planKey = ""

    private var key: String { "\(Int(width))|" + rows.map(\.id).joined(separator: ",") }

    var body: some View {
        let measuring = plan == nil || planKey != key
        let pairs = stride(from: 0, to: rows.count, by: 2).map { Array(rows[$0..<min($0 + 2, rows.count)]) }
        Grid(alignment: .topLeading, horizontalSpacing: Space.s6, verticalSpacing: 0) {
            ForEach(pairs, id: \.first!.id) { pair in
                GridRow(alignment: .top) {
                    ForEach(pair) { row in
                        VStack(alignment: .leading, spacing: 0) {
                            Rule().padding(.vertical, Space.s2)
                            cell(row, measuring ? nil : plan?[row.id], !measuring)
                                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { h in
                                    if measuring { heights[row.id] = h; settle() }
                                }
                        }
                        .frame(maxHeight: measuring ? nil : .infinity, alignment: .top)
                        .gridCellColumns(pair.count == 1 ? 2 : 1) // een los laatste verhaal krijgt de hele rij
                    }
                }
            }
        }
        .onChange(of: key) { plan = nil }
    }

    private func settle() {
        guard rows.allSatisfy({ heights[$0.id] != nil }) else { return }
        let column = (width - Space.s6) / 2
        let cells = rows.map { EditionPairs.Cell(key: $0.id, height: heights[$0.id] ?? 0, image: $0.item.image != nil) }
        plan = EditionPairs.plan(cells, width: column)
        planKey = key
    }
}
