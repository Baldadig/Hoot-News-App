import XCTest
import SwiftUI
@testable import Hoot

// "Tien en de bubbel · je eerste Editie": dezelfde punten, kring en tijden als het web.
// tests/fixtures/tien.json komt uit tests/tien.test.mjs (de webrekensom); hier rekent de app dezelfde
// invoer na. Daarnaast stills voor het ontwerp (Hoot-design/woensdag-2026-11-04/bouw-1.1.0/laadtekens).
@MainActor
final class TienTests: XCTestCase {
    private struct Fixture: Decodable {
        struct St: Decodable { let R: Double?; let F: Double?; let reduce: Bool }
        struct F: Decodable {
            let ring: [Double]; let dots: [[Double]]; let ghost: [Double]
            let line1: Double; let line2: Double; let err: Double; let show: Double; let tick: Double; let say: String; let done: Bool
        }
        struct Case: Decodable { let name: String; let st: St; let t: Double; let f: F }
        let cases: [Case]
        let blocks: [[Double]]
        let curves: [[Double]]
    }

    private static var root: URL { URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent() }
    private func fixture() throws -> Fixture {
        try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: Self.root.appendingPathComponent("tests/fixtures/tien.json")))
    }
    private func num(_ v: Double?) -> Double { guard let v else { return -1 }; return v == .infinity ? 1e9 : v }

    func testHetzelfdeTekenAlsHetWeb() throws {
        let f = try fixture()
        XCTAssertGreaterThan(f.cases.count, 200)
        for c in f.cases {
            let got = Tien.frame(Tien.State(R: c.st.R, F: c.st.F, reduce: c.st.reduce), c.t)
            let n = c.name
            for (a, b) in zip([Double(got.ring.r), got.ring.deg, got.ring.shut, got.ring.o], c.f.ring) { XCTAssertEqual(a, b, accuracy: 0.01, "\(n) · kring") }
            XCTAssertEqual(got.dots.count, 10, n)
            for (k, (d, w)) in zip(got.dots, c.f.dots).enumerated() {
                for (a, b) in zip([Double(d.x), Double(d.y), d.o, d.shut, d.red], w) { XCTAssertEqual(a, b, accuracy: 0.01, "\(n) · punt \(k + 1)") }
            }
            for (a, b) in zip([Double(got.ghost.x), Double(got.ghost.y), got.ghost.o, got.ghost.red], c.f.ghost) { XCTAssertEqual(a, b, accuracy: 0.01, "\(n) · lege plek") }
            XCTAssertEqual(got.line1, c.f.line1, accuracy: 0.01, "\(n) · zin")
            XCTAssertEqual(got.line2, c.f.line2, accuracy: 0.01, "\(n) · tweede zin")
            XCTAssertEqual(got.err, c.f.err, accuracy: 0.01, "\(n) · fout")
            XCTAssertEqual(num(got.show), c.f.show, accuracy: 0.01, "\(n) · Editie")
            XCTAssertEqual(num(got.tick), c.f.tick, accuracy: 0.01, "\(n) · tik")
            XCTAssertEqual(got.say, c.f.say, "\(n) · VoiceOver")
            XCTAssertEqual(got.done, c.f.done, "\(n) · klaar")
        }
        for b in f.blocks {
            let got = Tien.block(Int(b[0]), show: b[1], b[2], reduce: b[3] == 1)
            XCTAssertEqual(got.o, b[4], accuracy: 0.01); XCTAssertEqual(Double(got.y), b[5], accuracy: 0.01)
        }
        for row in f.curves {
            XCTAssertEqual(Tien.glide(row[0]), row[1], accuracy: 1e-5)
            XCTAssertEqual(Tien.irisCurve(row[0]), row[2], accuracy: 1e-5)
            XCTAssertEqual(Tien.ease(row[0]), row[3], accuracy: 1e-5)
        }
    }

    func testMatenEnTijdenUitDeSpecRij() {
        XCTAssertEqual(Tien.w, 240); XCTAssertEqual(Tien.h, 128); XCTAssertEqual(Tien.r * 2, 96); XCTAssertEqual(Tien.dot, 8)
        XCTAssertEqual(Tien.out - Tien.r, 24); XCTAssertEqual(Tien.hair, 1)
        let p = Tien.plan(0, nil)
        XCTAssertEqual(p.a.first, 240); XCTAssertEqual(p.close, 1460); XCTAssertEqual(p.open, 2400); XCTAssertEqual(p.ed, 2680)
        XCTAssertEqual(Tien.ready, "Je eerste Editie staat klaar. Dan ben je zo bij.")
        XCTAssertEqual(Tien.busy, "Hoot stelt je eerste Editie samen")
    }

    // Het model: verborgen vanaf de tik, Opnieuw na een fout begint opnieuw, klaar zet alles terug.
    func testModelVolgtHetLaden() async throws {
        let m = TienModel()
        XCTAssertFalse(m.active); XCTAssertTrue(m.shown)
        var finished = false
        m.onDone = { finished = true }
        m.start(at: TienModel.clock() - 8000, reduce: false) // punt 10 wachtte al: R = nu
        XCTAssertTrue(m.active); XCTAssertFalse(m.shown); XCTAssertFalse(m.errShown)
        m.update(loading: false, failed: false)
        XCTAssertNotNil(m.state.R)
        try await Task.sleep(for: .milliseconds(2900)) // R = nu: nog 140 + 260 + 680 + 560 tot klaar, dan 840 voor de blokken
        XCTAssertTrue(m.shown); XCTAssertTrue(finished); XCTAssertFalse(m.active)

        let f = TienModel()
        f.start(at: TienModel.clock(), reduce: true)
        f.update(loading: false, failed: true)
        XCTAssertNotNil(f.state.F)
        f.update(loading: true, failed: false) // Opnieuw
        XCTAssertNil(f.state.F); XCTAssertTrue(f.active)
        f.stop()
    }

    // Stills: de fasen van Snel, Traag, Fout en Verminder beweging, licht en donker, onder de titel.
    func testStills() throws {
        let dir = Self.root.deletingLastPathComponent().appendingPathComponent("Hoot-design/woensdag-2026-11-04/bouw-1.1.0/laadtekens")
        let write = FileManager.default.fileExists(atPath: dir.path)
        let shots: [(String, Tien.State, Double)] = [
            ("tien-1-punten", Tien.State(R: 0), 700),
            ("tien-2-kring", Tien.State(R: 0), 1560),
            ("tien-3-een-eruit", Tien.State(R: 0), 2100),
            ("tien-4-iris", Tien.State(R: 0), 2560),
            ("tien-5-traag", Tien.State(R: nil), 7000),
            ("tien-6-fout", Tien.State(R: nil, F: 3500), 3660),
            ("tien-7-stil", Tien.State(R: 0, reduce: true), 1100),
        ]
        for (name, scheme) in [("licht", ColorScheme.light), ("donker", .dark)] {
            for (shot, st, t) in shots {
                let view = VStack(alignment: .leading, spacing: 0) {
                    Text("Ochtendeditie").font(Theme.headline(.largeTitle)).foregroundStyle(Theme.ink).padding(.top, 56)
                    FirstEditionMark(frame: Tien.frame(st, t))
                        .frame(maxWidth: .infinity, minHeight: Tien.area)
                        .padding(.top, Space.s2)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 16)
                .frame(width: 390, height: 640)
                .background(Theme.paper)
                .environment(\.colorScheme, scheme)
                let renderer = ImageRenderer(content: view); renderer.scale = 3
                guard let image = renderer.uiImage else { return XCTFail("teken moet renderen (\(shot) \(name))") }
                XCTAssertEqual(image.size.width, 390)
                if write, let png = image.pngData() { try png.write(to: dir.appendingPathComponent("ios-\(shot)-\(name).png")) }
            }
        }
    }
}
