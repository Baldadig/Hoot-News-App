import XCTest
import SwiftUI
@testable import Hoot

// De laadstrepen ("A · De stapel"): dezelfde standen en tijden als het web. tests/fixtures/load-lines.json
// komt uit tests/load-lines.test.mjs (de webrekensom); hier rekent de app dezelfde invoer na.
@MainActor
final class LoadLinesTests: XCTestCase {
    private struct Fixture: Decodable {
        struct Rect: Decodable { let x: Double; let y: Double; let w: Double }
        struct Targets: Decodable { let rule: Rect?; let rows: [Rect] }
        struct St: Decodable { let t0: Double; let reduce: Bool?; let doneAt: Double?; let failAt: Double?; let box: Rect; let targets: Targets? }
        struct F: Decodable { let text: Double; let rise: Double; let rule: Double; let err: Double; let done: Bool; let lines: [[Double]] }
        struct Case: Decodable { let name: String; let st: St; let now: Double; let f: F }
        let cases: [Case]
        let settle: [[Double]]
        let curves: [[Double]]
    }

    private func fixture() throws -> Fixture {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("tests/fixtures/load-lines.json")
        return try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
    }

    private func state(_ s: Fixture.St) -> LoadLines.State {
        LoadLines.State(
            t0: s.t0, reduce: s.reduce ?? false, doneAt: s.doneAt, failAt: s.failAt,
            box: LoadLines.Box(x: s.box.x, y: s.box.y, w: s.box.w),
            targets: s.targets.map { t in
                LoadLines.Targets(rule: t.rule.map { LoadLines.Target(x: $0.x, y: $0.y, w: $0.w) }, rows: t.rows.map { LoadLines.Target(x: $0.x, y: $0.y, w: $0.w) })
            })
    }

    func testDezelfdeStrepenAlsHetWeb() throws {
        let f = try fixture()
        XCTAssertGreaterThan(f.cases.count, 50)
        for c in f.cases {
            let got = LoadLines.frame(state(c.st), now: c.now)
            XCTAssertEqual(got.text, c.f.text, accuracy: 0.01, "\(c.name) · text")
            XCTAssertEqual(Double(got.rise), c.f.rise, accuracy: 0.01, "\(c.name) · rise")
            XCTAssertEqual(got.rule, c.f.rule, accuracy: 0.01, "\(c.name) · rule")
            XCTAssertEqual(got.err, c.f.err, accuracy: 0.01, "\(c.name) · err")
            XCTAssertEqual(got.done, c.f.done, "\(c.name) · done")
            XCTAssertEqual(got.lines.count, c.f.lines.count, "\(c.name) · aantal strepen")
            for (line, web) in zip(got.lines, c.f.lines) {
                let app = [Double(line.n), Double(line.x), Double(line.y), Double(line.w), Double(line.h), line.o, line.accent, line.ink]
                for (k, (a, b)) in zip(app, web).enumerated() { XCTAssertEqual(a, b, accuracy: 0.01, "\(c.name) · streep \(line.n) · \(k)") }
            }
        }
    }

    func testTijdenEnCurvesGelijkAanHetWeb() throws {
        let f = try fixture()
        for pair in f.settle { XCTAssertEqual(LoadLines.settleAt(pair[0]), pair[1], accuracy: 0.001, "settle \(pair[0])") }
        for row in f.curves {
            XCTAssertEqual(LoadLines.inOut(row[0]), row[1], accuracy: 1e-5)
            XCTAssertEqual(LoadLines.glide(row[0]), row[2], accuracy: 1e-5)
            XCTAssertEqual(LoadLines.ease(row[0]), row[3], accuracy: 1e-5)
        }
    }

    func testMatenUitHetConcept() {
        XCTAssertEqual(LoadLines.len, 56); XCTAssertEqual(LoadLines.step, 8); XCTAssertEqual(LoadLines.offs, [-4, 0, 4, -2])
        XCTAssertEqual(LoadLines.period, 2000); XCTAssertEqual(LoadLines.move, 640); XCTAssertEqual(LoadLines.land, 480); XCTAssertEqual(LoadLines.text, 320)
        let still = LoadLines.stackAt(0, LoadLines.Box(), still: true)
        XCTAssertEqual(still.map(\.y), [180, 188, 196, 204])
        XCTAssertTrue(still.allSatisfy { $0.h == 1 && $0.w == 56 && $0.accent == 0 })
        for t in stride(from: 0.0, to: 9000, by: 13) { XCTAssertLessThanOrEqual(LoadLines.settleAt(t) - t, LoadLines.settleMax) }
    }

    func testVoiceOverHoortDeZin() {
        XCTAssertEqual(LoadLinesBox().label, "Even kijken bij je bronnen")
        XCTAssertEqual(LoadLines.label, "Even kijken bij je bronnen")
    }

    // De model-tijden: klaar binnen 400 ms toont de inhoud meteen; zonder kop vervaagt de stapel.
    func testModelVolgtHetLaden() async throws {
        let m = LoadLinesModel()
        XCTAssertFalse(m.active); XCTAssertTrue(m.textShown)
        m.start(reduce: false)
        XCTAssertTrue(m.active); XCTAssertFalse(m.textShown); XCTAssertFalse(m.ruleShown)
        m.finish(ok: true)
        try await Task.sleep(for: .milliseconds(80))
        XCTAssertTrue(m.textShown); XCTAssertTrue(m.ruleShown); XCTAssertFalse(m.active)
    }

    // Kopregels zoals SwiftUI de kop zet: hooguit drie, binnen de kolom, op stijgende basislijnen.
    func testKopregelsBinnenDeKolom() {
        let frame = CGRect(x: 16, y: 300, width: 358, height: 200)
        let rows = LoadLines.headRows("Kabinet en boeren vinden elkaar in een nieuw stikstofplan na maanden overleg", style: .largeTitle, in: frame)
        XCTAssertGreaterThanOrEqual(rows.count, 2); XCTAssertLessThanOrEqual(rows.count, 3)
        for (i, r) in rows.enumerated() {
            XCTAssertEqual(r.x, 16, accuracy: 0.5); XCTAssertLessThanOrEqual(r.w, 358.5); XCTAssertGreaterThan(r.w, 0)
            if i > 0 { XCTAssertGreaterThan(r.y, rows[i - 1].y) }
        }
    }

    // Stills voor het ontwerp (licht, donker, Nacht-achtig donker): de lus, het landen en de rust.
    func testStills() throws {
        let box = LoadLines.Box(x: 0, y: 0, w: 390)
        let targets = LoadLines.Targets(rule: LoadLines.Target(x: 16, y: 28, w: 358), rows: [LoadLines.Target(x: 16, y: 300, w: 296), LoadLines.Target(x: 16, y: 336, w: 336), LoadLines.Target(x: 16, y: 372, w: 140)])
        let shots: [(String, LoadLines.State, Double)] = [
            ("1-rust", LoadLines.State(box: box), 900),
            ("2-eraf", LoadLines.State(box: box), 1320),
            ("3-landen", LoadLines.State(doneAt: 1200, box: box, targets: targets), 1880),
            ("4-geland", LoadLines.State(doneAt: 1200, box: box, targets: targets), 2120),
            ("5-vervagen", LoadLines.State(doneAt: 1200, box: box), 1800),
        ]
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Hoot-design/woensdag-2026-11-04/bouw-1.1.0/laadtekens")
        let write = FileManager.default.fileExists(atPath: dir.path)
        for (name, scheme) in [("licht", ColorScheme.light), ("donker", .dark)] {
            for (shot, st, now) in shots {
                let view = LoadLinesArt(frame: LoadLines.frame(st, now: now)).frame(width: 390, height: 420).background(Theme.paper).environment(\.colorScheme, scheme)
                let renderer = ImageRenderer(content: view); renderer.scale = 3
                guard let image = renderer.uiImage else { return XCTFail("laadstrepen moeten renderen (\(name) \(shot))") }
                XCTAssertEqual(image.size.width, 390)
                if write, let png = image.pngData() { try png.write(to: dir.appendingPathComponent("ios-\(shot)-\(name).png")) }
            }
        }
    }

    // De lezer: de kop en de bron, daaronder dezelfde stapel (zonder landen).
    func testLezerStill() async throws {
        let waiting = ReaderWaitingState()
        await waiting.wait()
        XCTAssertNotNil(waiting.startedAt)
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Hoot-design/woensdag-2026-11-04/bouw-1.1.0/laadtekens")
        try await Task.sleep(for: .milliseconds(500))
        for (name, scheme) in [("licht", ColorScheme.light), ("donker", .dark)] {
            let view = ReaderLoadingView(title: "Kabinet en boeren vinden elkaar in nieuw stikstofplan", sourceName: "NOS", waiting: waiting)
                .frame(width: 390, height: 680).background(Theme.paper).environment(\.colorScheme, scheme)
            let renderer = ImageRenderer(content: view); renderer.scale = 3
            guard let image = renderer.uiImage else { return XCTFail("lezer moet renderen") }
            if FileManager.default.fileExists(atPath: dir.path), let png = image.pngData() { try png.write(to: dir.appendingPathComponent("ios-6-lezer-\(name).png")) }
        }
    }
}
