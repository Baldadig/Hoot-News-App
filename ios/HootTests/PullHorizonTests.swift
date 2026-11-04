import XCTest
import SwiftUI
@testable import Hoot

// Horizon v2: dezelfde standen en tijden als het web. tests/fixtures/pull-horizon.json komt uit
// tests/pull-horizon.test.mjs (de webrekensom); hier rekent de app dezelfde invoer na.
final class PullHorizonTests: XCTestCase {
    private struct Fixture: Decodable {
        struct Case: Decodable { let name: String; let st: [String: Value]; let now: Double; let g: [String: Value] }
        struct Journey: Decodable { let responseMs: Double; let ok: Bool; let reduce: Bool; let set: Double?; let close: Double; let done: Double }
        enum Value: Decodable {
            case num(Double), bool(Bool), text(String)
            init(from decoder: Decoder) throws {
                let c = try decoder.singleValueContainer()
                if let b = try? c.decode(Bool.self) { self = .bool(b) } else if let n = try? c.decode(Double.self) { self = .num(n) } else { self = .text(try c.decode(String.self)) }
            }
            var num: Double { if case .num(let n) = self { return n }; if case .bool(let b) = self { return b ? 1 : 0 }; return 0 }
            var bool: Bool { if case .bool(let b) = self { return b }; return num != 0 }
            var text: String { if case .text(let t) = self { return t }; return "" }
        }
        let width: Double
        let cases: [Case]
        let journeys: [Journey]
        let resist: [[Double]]
    }

    private func fixture() throws -> Fixture {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("tests/fixtures/pull-horizon.json")
        return try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
    }

    func testDezelfdeTekeningAlsHetWeb() throws {
        let f = try fixture()
        XCTAssertGreaterThan(f.cases.count, 40)
        for c in f.cases {
            var s = HorizonState()
            s.phase = HorizonState.Phase(rawValue: c.st["phase"]?.text ?? "pull") ?? .pull
            s.pull = c.st["pull"]?.num ?? 0
            s.glow = c.st["glow"]?.num ?? 0
            s.artOp = c.st["artOp"]?.num ?? 1
            s.reduce = c.st["reduce"]?.bool ?? false
            s.loadT0 = c.st["loadT0"]?.num ?? 0
            s.leg2T0 = c.st["leg2T0"]?.num ?? 0
            s.s0 = c.st["s0"]?.num ?? 1
            s.setT0 = c.st["setT0"]?.num ?? 0
            s.failT0 = c.st["failT0"]?.num ?? 0
            s.tf = c.st["tf"]?.num ?? 0
            let g = Horizon.geom(s, now: c.now, width: f.width)
            let got: [String: Double] = ["w": g.w, "lineOp": g.lineOp, "arcOp": g.arcOp, "sx": g.sx, "sy": g.sy, "sunOp": g.sunOp,
                                         "scale": g.scale, "grow": g.grow, "ringOp": g.ringOp, "msg": g.msg]
            for (key, value) in got {
                XCTAssertEqual(value, c.g[key]?.num ?? .nan, accuracy: 0.01, "\(c.name) · \(key)")
            }
            XCTAssertEqual(g.strong, c.g["strong"]?.bool, "\(c.name) · strong")
        }
        for pair in f.resist { XCTAssertEqual(Horizon.resist(pair[0]), pair[1], accuracy: 0.01) }
    }

    func testTijdenGelijkAanHetWeb() throws {
        for j in try fixture().journeys {
            let mine = Horizon.journey(responseMs: j.responseMs, ok: j.ok, reduce: j.reduce)
            XCTAssertEqual(mine.set, j.set, "set \(j)")
            XCTAssertEqual(mine.close, j.close, "close \(j)")
            XCTAssertEqual(mine.done, j.done, "done \(j)")
        }
    }

    // De spec-rij van de proef: drempel, strook, ondergang, van antwoord tot dicht.
    func testStandenEnTijdenUitDeSpec() {
        XCTAssertEqual(Horizon.threshold, 72); XCTAssertEqual(Horizon.strip, 56); XCTAssertEqual(RefreshPull.threshold, 72)
        XCTAssertEqual(Horizon.noon, 1200)
        let snel = Horizon.journey(responseMs: 1000)
        XCTAssertEqual(snel.set, 2000); XCTAssertEqual(snel.done - 1000, 1840, "van antwoord tot dicht")
        let traag = Horizon.journey(responseMs: 7000)
        XCTAssertEqual(traag.set, 7800)
        let fout = Horizon.journey(responseMs: 2000, ok: false)
        XCTAssertNil(fout.set); XCTAssertEqual(fout.close, 4600); XCTAssertEqual(fout.done, 5000)
        let stil = Horizon.journey(responseMs: 1000, reduce: true)
        XCTAssertEqual(stil.done, 1350, "Verminder beweging: één vervaging van 350 ms")
        // Trekken: de lijn op 72 van kantlijn tot kantlijn, de zon rust op de lijn.
        let drempel = Horizon.geom(HorizonState(phase: .pull, pull: 72, glow: 1), now: 0, width: 390)
        XCTAssertEqual(drempel.w, 358); XCTAssertEqual(drempel.sy, 8); XCTAssertTrue(drempel.strong)
        XCTAssertEqual(Horizon.geom(HorizonState(phase: .pull, pull: 56), now: 0, width: 390).sy, 0, accuracy: 0.001, "halve zon op 56")
        // Ondergang: x +68, van y 8 naar −8 in 600 ms; lijn uit tussen 440 en 580.
        let set = HorizonState(phase: .set, setT0: 0)
        XCTAssertEqual(Horizon.geom(set, now: 600, width: 390).sy, -8, accuracy: 0.001)
        XCTAssertEqual(Horizon.geom(set, now: 440, width: 390).lineOp, 1, accuracy: 0.001)
        XCTAssertEqual(Horizon.geom(set, now: 580, width: 390).lineOp, 0, accuracy: 0.001)
        // Adem op de middag.
        let load = HorizonState(phase: .load, loadT0: 0)
        XCTAssertEqual(Horizon.geom(load, now: 1200 + 2750, width: 390).scale, 1.06, accuracy: 0.001)
        XCTAssertEqual(Horizon.message, "Niet ververst. Trek opnieuw.")
    }

    // Beelden van de standen op ware grootte (390 pt, 2x), boven de kop van een Editie. Met
    // TEST_RUNNER_HOOT_PULL_OUT=<map> komen ze ook als png in die map (Hoot-design/…/pull-horizon).
    @MainActor
    func testStandenRenderen() throws {
        let out = ProcessInfo.processInfo.environment["HOOT_PULL_OUT"]
        let n = 100_000.0
        let standen: [(String, HorizonState, Bool, CGFloat)] = [
            ("1-trek-36", HorizonState(phase: .pull, pull: 36), false, 36),
            ("2-trek-56", HorizonState(phase: .pull, pull: 56), false, 56),
            ("3-drempel-72", HorizonState(phase: .pull, pull: 72, glow: 1), true, 72),
            ("4-laden-ochtend-naar-middag", HorizonState(phase: .load, loadT0: n - 800), false, 56),
            ("5-laden-middag-adem", HorizonState(phase: .load, loadT0: n - Horizon.noon - Horizon.Ms.breath), false, 56),
            ("6-klaar-vroege-avond", HorizonState(phase: .go, loadT0: n - 3000, leg2T0: n - 800, s0: 1), false, 56),
            ("7-klaar-ondergang", HorizonState(phase: .set, setT0: n - 200), false, 56),
            ("8-fout", HorizonState(phase: .fail, failT0: n - 1200, tf: 0.5), false, 56),
            ("9-stil-trek-30", HorizonState(phase: .pull, pull: 30, reduce: true), false, 30),
            ("10-stil-laden", HorizonState(phase: .load, reduce: true, loadT0: n - 800), false, 56),
        ]
        for theme in ["licht", "donker", "nacht"] {
            for (name, state, armed, height) in standen {
                let view = VStack(alignment: .leading, spacing: 0) {
                    PullHorizonStrip(amount: height, busy: state.phase != .pull, mark: state, reduceMotion: state.reduce, armed: armed, height: height, frozen: n)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Ochtendeditie").font(Theme.headline(.largeTitle)).foregroundStyle(Theme.ink)
                        Text("Woensdag 4 november").font(.subheadline).foregroundStyle(Theme.ink3)
                        StrongRule().padding(.top, 12)
                    }.padding(.horizontal, 16).padding(.top, 8)
                }
                .frame(width: 390, alignment: .top).background(Theme.paper)
                .environment(\.colorScheme, theme == "licht" ? .light : .dark)
                .environment(\.nachtActief, theme == "nacht")
                let renderer = ImageRenderer(content: view); renderer.scale = 2
                let image = try XCTUnwrap(renderer.uiImage, name)
                XCTAssertEqual(image.size.width, 390)
                let attachment = XCTAttachment(image: image); attachment.name = "horizon-\(theme)-\(name)"
                attachment.lifetime = .keepAlways; add(attachment)
                if let out, let png = image.pngData() {
                    try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
                    try png.write(to: URL(fileURLWithPath: out).appendingPathComponent("ios-\(theme)-\(name).png"))
                }
            }
        }
    }

    // De foutzin bij de grootste tekst (AX5) en op 320 breed (iPhone SE): één regel, binnen de kantlijnen
    // van 16 (288 pt), desnoods gekrompen tot 70 %. Vervangt de oude laad-test op AX5.
    @MainActor
    func testFoutzinPastOpAX5En320Breed() throws {
        for size in [DynamicTypeSize.large, .xxLarge, .accessibility3, .accessibility5] {
            let probe = UIHostingController(rootView: PullMessage().fixedSize(horizontal: true, vertical: false)
                .environment(\.dynamicTypeSize, size))
            let ideal = probe.sizeThatFits(in: CGSize(width: 10_000, height: 200))
            let text = ideal.width - 2 * Horizon.gutter
            XCTAssertLessThanOrEqual(text * 0.7, 288, "\(size): ook na krimpen tot 70 % past de zin in 320 − 2 × 16")
            XCTAssertLessThanOrEqual(text, 288 / 0.7, "\(size)")
            XCTAssertEqual(ideal.height, 20 + 24, accuracy: 0.5, "\(size): één regel, 20 hoog, 24 boven de onderrand")
        }
        let n = 100_000.0
        for theme in ["licht", "nacht"] {
            let state = HorizonState(phase: .fail, failT0: n - 1200, tf: 0.5)
            let view = PullHorizonStrip(amount: 56, busy: true, mark: state, reduceMotion: false, armed: false, height: 56, frozen: n)
                .frame(width: 320, alignment: .top).background(Theme.paper)
                .environment(\.dynamicTypeSize, .accessibility5)
                .environment(\.colorScheme, theme == "licht" ? .light : .dark)
                .environment(\.nachtActief, theme == "nacht")
            let renderer = ImageRenderer(content: view); renderer.scale = 2
            let image = try XCTUnwrap(renderer.uiImage, theme)
            XCTAssertEqual(image.size.width, 320)
            let attachment = XCTAttachment(image: image); attachment.name = "horizon-fout-ax5-320-\(theme)"
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }
}
