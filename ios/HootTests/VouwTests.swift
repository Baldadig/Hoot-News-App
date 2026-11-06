import XCTest
import SwiftUI
import UIKit
@testable import Hoot

// 01 boven de vouw, variant e (Vouw.swift). Er is geen mini-simulator: de kaart wordt op de exacte maten van de
// iPhone mini (375 × 812) en de iPhone 17 Pro (402 × 874) gerenderd, met de echte kopregel van de Editie erboven.
// De vouw is de bovenkant van de tabbalk (83 onder: 49 + 34, gemeten op Hoot Pro Max). Drie koppen uit de meting:
// kort, mediaan en lang (Russell Brand, 6 regels op 30). Stills naar Hoot-design/vouw-1.1.1/ als die map bestaat.
@MainActor final class VouwTests: XCTestCase {
    struct Scherm { let naam: String; let breedte: CGFloat; let hoogte: CGFloat; let boven: CGFloat }
    static let mini = Scherm(naam: "mini", breedte: 375, hoogte: 812, boven: 50)
    static let pro = Scherm(naam: "pro", breedte: 402, hoogte: 874, boven: 62)
    static let onder: CGFloat = 83

    static let koppen: [(String, String, String)] = [
        ("kort", "Rubberboot met tientallen migranten van zee gehaald bij Breskens", "Hulpdiensten hebben vanochtend een rubberboot met 38 mensen van zee gehaald bij Breskens. De boot is naar een jachthaven in Cadzand gesleept, meldt Omroep Zeeland."),
        ("mediaan", "Ahold Delhaize ziet schade van tientallen miljoenen door cyberaanval", "De cyberaanval vorige maand scheelt Ahold Delhaize 200 à 250 miljoen euro aan omzet. De uiteindelijke winst valt hierdoor tussen de 75 en 100 miljoen euro lager uit."),
        ("lang", "Britse komiek Russell Brand schuldig aan verkrachting en aanranding, aanklager noemt hem ‘berekenend seksueel roofdier’", "De Britse komiek Russell Brand is schuldig bevonden aan verkrachting en aanranding. Dat heeft de rechtbank in Londen zojuist geoordeeld."),
    ]

    private func item(_ k: (String, String, String)) -> Item {
        var item = Item(id: "vouw-\(k.0)", source: "nos", title: k.1, url: "https://nos.nl/a")
        item.sourceName = "NOS"; item.summary = k.2
        return item
    }

    private func size<V: View>(_ view: V, width: CGFloat) -> CGFloat {
        let host = UIHostingController(rootView: view.frame(width: width, alignment: .topLeading).environment(\.dynamicTypeSize, .large))
        return host.sizeThatFits(in: CGSize(width: width, height: 4000)).height
    }

    // De kopregel van de Editie zoals EditionView hem zet: woordmerk, titel met zon, metaregel 20 + 16, sterke lijn + 16.
    private func kopregel() -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HootKop()
            EditionHeader(title: "Avondeditie", slot: "avond")
            Text("Donderdag 5 november").font(.ui(.footnote)).foregroundStyle(Theme.ink3).frame(minHeight: 20, alignment: .leading).padding(.bottom, Space.s4)
            StrongRule().padding(.bottom, Space.s4)
        }
    }

    private func ruimte(_ s: Scherm, store: HootStore) -> CGFloat {
        let kop = size(kopregel().padding(.horizontal, 16).environment(store), width: s.breedte)
        return s.hoogte - s.boven - Self.onder - kop
    }

    private func kaart(_ it: Item, vouw: VouwRuimte?) -> some View {
        LeadCard(item: it, number: 1, label: "Binnenland", why: "Acht bronnen brengen dit", story: nil)
            .environment(\.vouw, vouw)
    }

    // De sterke lijn onder 01 hoort niet bij wat boven de vouw moet: 20 lucht en 2 lijn.
    private let lijn: CGFloat = Space.s4 + Space.s1 + 2

    func testProfielen() {
        XCTAssertEqual(Vouw.profiel(vensterHoogte: 812, typeSize: .large), .mini)
        XCTAssertEqual(Vouw.profiel(vensterHoogte: 852, typeSize: .large), .pro)
        XCTAssertEqual(Vouw.profiel(vensterHoogte: 874, typeSize: .medium), .pro)
        XCTAssertEqual(Vouw.profiel(vensterHoogte: 956, typeSize: .large), .pro)
        XCTAssertNil(Vouw.profiel(vensterHoogte: 667, typeSize: .large), "SE: gewoon doorlopen")
        XCTAssertNil(Vouw.profiel(vensterHoogte: 874, typeSize: .xLarge), "grotere tekst: gewoon doorlopen")
        XCTAssertNil(Vouw.profiel(vensterHoogte: 874, typeSize: .accessibility3))
        // De intro hooguit 5 regels, op de mini net als op de Pro (de oude mini-regel van 2 is vervallen).
        XCTAssertEqual(Vouw.introRegels(.mini), 5)
        XCTAssertEqual(Vouw.introRegels(.pro), 5)
        XCTAssertEqual(Vouw.kop26Vanaf(.mini), 4)
    }

    func testBeeldTussen3op2En2op1() {
        XCTAssertEqual(Vouw.beeld(ruimte: 600, tekst: 200, breedte: 402), 268, accuracy: 0.01) // ruim: 3:2
        XCTAssertEqual(Vouw.beeld(ruimte: 600, tekst: 380, breedte: 402), 220, accuracy: 0.01) // ertussen
        XCTAssertEqual(Vouw.beeld(ruimte: 600, tekst: 500, breedte: 402), 201, accuracy: 0.01) // krap: 2:1
    }

    func testRussellBrandIsZesRegelsOp30() {
        XCTAssertEqual(Vouw.kopRegels(Self.koppen[2].1, size: 30, width: 370, typeSize: .large), 6)
        XCTAssertLessThan(Vouw.kopRegels(Self.koppen[2].1, size: 26, width: 370, typeSize: .large), 6)
    }

    // De kern: op beide maten staat de bronregel van 01 boven de tabbalk, voor alle drie de koppen.
    func testBronregelBovenDeVouwOpMiniEnPro() {
        let store = HootStore()
        for s in [Self.mini, Self.pro] {
            let r = ruimte(s, store: store)
            let profiel = Vouw.profiel(vensterHoogte: s.hoogte, typeSize: .large)!
            for k in Self.koppen {
                let met = size(kaart(item(k), vouw: VouwRuimte(profiel: profiel, hoogte: r)).padding(.horizontal, 16).environment(store).environment(Reader()), width: s.breedte) - lijn
                XCTAssertLessThanOrEqual(met, r + 0.5, "\(s.naam) \(k.0): de bronregel moet boven de vouw staan")
                XCTAssertGreaterThan(met, r - 140, "\(s.naam) \(k.0): het beeld vult de ruimte (tot 3:2)")
            }
            // Zonder de vouw (zoals nu) valt de lange kop eronder.
            let nu = size(kaart(item(Self.koppen[2]), vouw: nil).padding(.horizontal, 16).environment(store).environment(Reader()), width: s.breedte) - lijn
            XCTAssertGreaterThan(nu, r, "\(s.naam): zonder vouw valt de lange kop onder de tabbalk")
        }
    }

    // SE en grote tekst: LeadCard negeert de vouw (EditionView zet hem daar ook niet).
    func testGroteTekstLooptDoor() {
        let store = HootStore()
        let it = item(Self.koppen[1])
        let vouw = VouwRuimte(profiel: .pro, hoogte: 590)
        func h(_ ruimte: VouwRuimte?) -> CGFloat {
            let host = UIHostingController(rootView: kaart(it, vouw: ruimte).padding(.horizontal, 16).environment(store).environment(Reader()).frame(width: 402).environment(\.dynamicTypeSize, .xxLarge))
            return host.sizeThatFits(in: CGSize(width: 402, height: 4000)).height
        }
        XCTAssertEqual(h(vouw), h(nil), accuracy: 0.5)
    }

    func testFocusOpHetBovensteDerdeEnOpGezichten() {
        // Een liggend beeld 3:2 in een vak 2:1: 1/3 van boven betekent een derde van de overloop boven het vak.
        let rect = BeeldFocus.frame(beeld: CGSize(width: 1500, height: 1000), measure: nil, in: CGSize(width: 402, height: 201), y: BeeldFocus.terugval)
        XCTAssertEqual(rect.height, 268, accuracy: 0.01)
        XCTAssertEqual(rect.minY, -(268 - 201) / 3, accuracy: 0.01)
        let boven = BeeldFocus.frame(beeld: CGSize(width: 1500, height: 1000), measure: nil, in: CGSize(width: 402, height: 201), y: 0)
        XCTAssertEqual(boven.minY, 0, accuracy: 0.01)
        // Een vlak beeld heeft geen gezicht: dan de terugval.
        let leeg = UIGraphicsImageRenderer(size: CGSize(width: 300, height: 200)).image { c in UIColor.gray.setFill(); c.fill(CGRect(x: 0, y: 0, width: 300, height: 200)) }
        XCTAssertNil(BeeldFocus.gezichten(leeg.cgImage!))
    }

    // Stills: mini en Pro, Licht en Nacht, drie koppen. Het hele eerste scherm met de tabbalk als vlak eronder.
    func testStills() async throws {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Hoot-design/vouw-1.1.1")
        let write = FileManager.default.fileExists(atPath: dir.path)
        let store = HootStore()
        var volgende = Item(id: "vouw-02", source: "nos", title: "Kabinet wil boeren meer ruimte geven bij stikstofregels", url: "https://nos.nl/b")
        volgende.sourceName = "de Volkskrant"; volgende.summary = "Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders."
        for s in [Self.mini, Self.pro] {
            let r = ruimte(s, store: store)
            let profiel = Vouw.profiel(vensterHoogte: s.hoogte, typeSize: .large)!
            for (thema, dark) in [("licht", false), ("nacht", true)] {
                for k in Self.koppen {
                    let view = VStack(alignment: .leading, spacing: 0) {
                        Color.clear.frame(height: s.boven)
                        VStack(alignment: .leading, spacing: 0) {
                            kopregel()
                            kaart(item(k), vouw: VouwRuimte(profiel: profiel, hoogte: r))
                            ItemRow(item: volgende, number: 2, label: "Politiek", why: nil, story: nil, form: .tijdlijn).padding(.top, Space.s2)
                        }.padding(.horizontal, 16)
                        Spacer(minLength: 0)
                    }
                    .frame(width: s.breedte, height: s.hoogte, alignment: .top).clipped()
                    .overlay(alignment: .bottom) {
                        // De tabbalk als vlak, met de vouw als rode stippellijn erop.
                        Rectangle().fill(Theme.paper.opacity(0.94)).frame(height: Self.onder)
                            .overlay(alignment: .top) { Rectangle().stroke(Theme.accent, style: StrokeStyle(lineWidth: 1, dash: [4, 3])).frame(height: 1) }
                    }
                    .background(Theme.paper).environment(store).environment(Reader()).environment(\.isWide, false)
                    .environment(\.colorScheme, dark ? .dark : .light).environment(\.nachtActief, dark).environment(\.dynamicTypeSize, .large)
                    .ignoresSafeArea() // het venster van de simulator heeft zelf een veilige zone: niet dubbel tellen
                    let host = UIHostingController(rootView: view)
                    let frame = CGRect(x: 0, y: 0, width: s.breedte, height: s.hoogte)
                    host.view.frame = frame
                    let window = UIWindow(frame: frame); window.rootViewController = host; window.isHidden = false
                    host.view.layoutIfNeeded()
                    try await Task.sleep(for: .milliseconds(300))
                    let image = UIGraphicsImageRenderer(size: frame.size).image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
                    let naam = "app-\(s.naam)-\(k.0)-\(thema).png"
                    let attachment = XCTAttachment(image: image); attachment.name = naam; attachment.lifetime = .keepAlways; add(attachment)
                    if write, let png = image.pngData() { try png.write(to: dir.appendingPathComponent(naam)) }
                    window.isHidden = true
                }
            }
        }
    }
}
