import SwiftUI
import UIKit

// Instellingen, indeling van 17 november (Hoot-design/ontwerp/instellingen-2026-11-17/concept.html):
// elke rij op het hoofdblad krijgt een gekleurd tegeltje met een wit SF Symbol, zoals de Instellingen-app
// van iOS. Eén bron voor symbool en kleur; het web spiegelt dit in src/lib/settings-tegels.js
// (tests/instellingen-tegels.test.mjs houdt ze gelijk).

// De tegelkleuren: warm en gedempt, Hoot-rood als anker. In Licht en Donker gelijk (wit erop is in
// beide goed leesbaar); in Nacht iets zachter, zodat een tegel op zwart niet oplicht.
enum TegelKleur: String, CaseIterable {
    case rood, amber, groen, teal, blauw, paars, inkt, zand
    var hex: UInt32 {
        switch self {
        case .rood: 0x9a3324
        case .amber: 0xb0802f
        case .groen: 0x4f6b3a
        case .teal: 0x2f6b68
        case .blauw: 0x36577a
        case .paars: 0x6a4a6c
        case .inkt: 0x4b453b
        case .zand: 0x8a7a5c
        }
    }
    // Nacht: dezelfde tint op 80 % helderheid.
    static let nachtDemping: CGFloat = 0.8
    var color: Color {
        let hex = hex
        return Color(uiColor: UIColor { traits in
            let f: CGFloat = traits[NachtTrait.self] && traits.userInterfaceStyle == .dark ? Self.nachtDemping : 1
            return UIColor(red: CGFloat((hex >> 16) & 255) / 255 * f, green: CGFloat((hex >> 8) & 255) / 255 * f, blue: CGFloat(hex & 255) / 255 * f, alpha: 1)
        })
    }
}

// Welke rij welk tegeltje heeft (symbool en kleur), zoals in het concept.
enum SettingsIcoon: String, CaseIterable {
    case interesses, editie, stroom, selectie, bronnen, abonnementen, podcasts, appicoon, tekstEnBeeld, artikelen, toestel, over
    var symbol: String {
        switch self {
        case .interesses: "sparkles"
        case .editie: "newspaper"
        case .stroom: "water.waves"
        case .selectie: "star"
        case .bronnen: "antenna.radiowaves.left.and.right"
        case .abonnementen: "key"
        case .podcasts: "headphones"
        case .appicoon: "square.grid.2x2"
        case .tekstEnBeeld: "photo"
        case .artikelen: "doc.text"
        case .toestel: "iphone"
        case .over: "info"
        }
    }
    var kleur: TegelKleur {
        switch self {
        case .interesses, .over: .rood
        case .editie: .inkt
        case .stroom, .appicoon: .teal
        case .selectie: .amber
        case .bronnen, .artikelen: .blauw
        case .abonnementen: .groen
        case .podcasts: .paars
        case .tekstEnBeeld, .toestel: .zand
        }
    }
}

// Het tegeltje: 29 pt met hoekradius 7, een wit symbool; groeit mee met Dynamic Type zoals bij Apple.
struct IconTile: View {
    let icoon: SettingsIcoon
    static let basis: CGFloat = 29
    @ScaledMetric(relativeTo: .body) private var size: CGFloat = 29
    var body: some View {
        RoundedRectangle(cornerRadius: size * 7 / 29, style: .continuous)
            .fill(icoon.kleur.color)
            .frame(width: size, height: size)
            .overlay {
                Image(systemName: icoon.symbol)
                    .font(.system(size: size * 0.55, weight: .medium))
                    .foregroundStyle(.white)
            }
            .accessibilityHidden(true)
    }
}

// Weergave: vier tegels met een klein scherm en een icoon (Licht, Donker, Nacht, Systeem), zoals Licht en
// Donker in de Instellingen van iOS. Onder Systeem: "Als het donker is" met Donker of Nacht, zodat Nacht
// ook met het toestel mee kan. De keuze en de opslag zijn dezelfde als voorheen (hoot.weergave,
// hoot.weergave.donker), dus wat je al gekozen had, blijft.
struct WeergaveKeuze: View {
    @AppStorage("hoot.weergave") private var value = "system"
    @AppStorage("hoot.weergave.donker") private var evening = "dark"
    @Environment(\.dynamicTypeSize) private var typeSize
    static let volgorde: [Weergave] = [.light, .dark, .night, .system]

    var body: some View {
        let gekozen = Weergave(stored: value)
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: Space.s2) { tegels(gekozen) }
            Grid(horizontalSpacing: Space.s2, verticalSpacing: Space.s4) {
                GridRow { tegels(gekozen, Array(Self.volgorde.prefix(2))) }
                GridRow { tegels(gekozen, Array(Self.volgorde.suffix(2))) }
            }
        }
        .padding(.vertical, Space.s3)
        // De haarlijn eronder begint waar de labels van de rijen met een tegel beginnen.
        .alignmentGuide(.listRowSeparatorLeading) { $0[.leading] + IconTile.basis + Space.s3 }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Weergave")
        if gekozen == .system {
            let donker = Binding(get: { evening == "night" ? "night" : "dark" }, set: { evening = $0 })
            if typeSize.isAccessibilitySize {
                // Heel grote tekst: een menu, dat groeit mee (een segment niet).
                Picker(selection: donker) { donkerKeuzes } label: { Text("Als het donker is") }
                    .frame(minHeight: Space.tap)
            } else {
                LabeledContent {
                    Picker(selection: donker) { donkerKeuzes } label: { Text("Als het donker is") }
                        .pickerStyle(.segmented)
                        .labelsHidden()
                        .fixedSize()
                } label: { Text("Als het donker is") }
                .frame(minHeight: Space.tap)
            }
        }
    }

    @ViewBuilder private var donkerKeuzes: some View {
        Text("Donker").tag("dark")
        Text("Nacht").tag("night").accessibilityLabel("Nacht, echt zwart")
    }

    private func tegels(_ gekozen: Weergave, _ keuzes: [Weergave] = volgorde) -> some View {
        ForEach(keuzes, id: \.rawValue) { keuze in
            WeergaveTegel(keuze: keuze, gekozen: gekozen == keuze) {
                withAnimation(Beweging.bediening(Beweging.gewoon)) { value = keuze.rawValue }
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct WeergaveTegel: View {
    let keuze: Weergave
    let gekozen: Bool
    let kies: () -> Void
    var body: some View {
        Button(action: kies) {
            VStack(spacing: Space.s2) {
                MiniScherm(keuze: keuze)
                    .overlay {
                        RoundedRectangle(cornerRadius: MiniScherm.hoek, style: .continuous)
                            .strokeBorder(gekozen ? Theme.accent : Theme.rule, lineWidth: gekozen ? 2 : 1)
                    }
                Text(keuze.tegel)
                    .font(.ui(.footnote, .medium))
                    .foregroundStyle(Theme.ink)
                    .lineLimit(1)
                    .fixedSize()
                Image(systemName: gekozen ? "checkmark.circle.fill" : "circle")
                    .font(.ui(.title3))
                    .foregroundStyle(gekozen ? Theme.accent : Theme.ink3)
                    .contentTransition(.symbolEffect(.replace))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(keuze.tegelLabel)
        .accessibilityAddTraits(gekozen ? [.isSelected, .isButton] : .isButton)
    }
}

// Een klein scherm: twee koplijnen, een beeld en twee regels tekst, in de kleuren van die weergave.
// Systeem: links Licht, rechts Donker. Rechtsonder het icoon (SF Symbols: sun.max, moon, moon.stars,
// circle.lefthalf.filled).
private struct MiniScherm: View {
    let keuze: Weergave
    static let maat = CGSize(width: 54, height: 92)
    static let hoek: CGFloat = 11
    struct Kleuren { let bg: UInt32; let lijn: UInt32; let beeld: UInt32 }
    static let licht = Kleuren(bg: 0xf5f1e8, lijn: 0x1a1814, beeld: 0xd8cdb8)
    static let donker = Kleuren(bg: 0x151310, lijn: 0xf1ece2, beeld: 0x3a342c)
    static let nacht = Kleuren(bg: 0x000000, lijn: 0xd8d0c2, beeld: 0x24211d)

    var body: some View {
        ZStack {
            switch keuze {
            case .light: scherm(Self.licht)
            case .dark: scherm(Self.donker)
            case .night: scherm(Self.nacht)
            case .system:
                scherm(Self.licht)
                scherm(Self.donker).mask(HStack(spacing: 0) { Color.clear; Color.black })
            }
        }
        .frame(width: Self.maat.width, height: Self.maat.height)
        .clipShape(RoundedRectangle(cornerRadius: Self.hoek, style: .continuous))
        .overlay(alignment: .bottomTrailing) {
            Circle().fill(.white.opacity(0.88))
                .frame(width: 20, height: 20)
                .overlay { Image(systemName: keuze.symbool).font(.system(size: 11, weight: .semibold)).foregroundStyle(Color(hex: 0x1a1814)) }
                .padding(Space.s1 + 1)
        }
        .accessibilityHidden(true)
    }

    private func scherm(_ k: Kleuren) -> some View {
        let lijn = Color(hex: k.lijn)
        return ZStack(alignment: .topLeading) {
            Color(hex: k.bg)
            balk(lijn, y: 12, inspring: 0)
            balk(lijn, y: 21, inspring: 11)
            RoundedRectangle(cornerRadius: 3).fill(Color(hex: k.beeld))
                .frame(width: Self.maat.width - 14, height: 22).offset(x: 7, y: 30)
            balk(lijn.opacity(0.5), y: 60, inspring: 0)
            balk(lijn.opacity(0.5), y: 69, inspring: 13)
        }
    }
    private func balk(_ kleur: Color, y: CGFloat, inspring: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 2).fill(kleur)
            .frame(width: Self.maat.width - 14 - inspring, height: 5).offset(x: 7, y: y)
    }
}

extension Weergave {
    // Het woord onder de tegel (concept 17 november): kort, één woord.
    var tegel: String { switch self { case .system: "Systeem"; case .light: "Licht"; case .dark: "Donker"; case .night: "Nacht" } }
    var tegelLabel: String { switch self { case .system: "Systeem, zoals je toestel"; case .night: "Nacht, echt zwart"; default: tegel } }
    var symbool: String { switch self { case .system: "circle.lefthalf.filled"; case .light: "sun.max"; case .dark: "moon"; case .night: "moon.stars" } }
}

private extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}
