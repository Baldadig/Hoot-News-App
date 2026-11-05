import XCTest
@testable import Hoot

// Lezer bij een tijdelijke fout (backlog build 47): één stille nieuwe poging, daarna de melding
// "Dit artikel lukt even niet in de lezer" met Probeer opnieuw, Open op de website en Toon de pagina hier.
@MainActor
final class ReaderRetryTests: XCTestCase {
    // Een adres dat meteen weigert (niets luistert op poort 9): didFailProvisionalNavigation.
    private let dead = URL(string: "http://127.0.0.1:9/artikel")!

    private func waitFor(_ loader: ArticleLoader, _ wanted: ArticleLoader.State, seconds: Double = 30) async {
        let end = Date().addingTimeInterval(seconds)
        while loader.state != wanted && Date() < end { try? await Task.sleep(for: .milliseconds(100)) }
    }

    func testEersteFoutGeeftEenNieuwePogingGeenMelding() {
        let loader = ArticleLoader()
        loader.load(dead)
        XCTAssertEqual(loader.autoRetries, 0)
        loader.temporaryFailure()
        XCTAssertEqual(loader.state, .loading, "na de eerste fout laadt de lezer opnieuw, zonder melding")
        XCTAssertEqual(loader.autoRetries, 1)
        loader.temporaryFailure()
        XCTAssertEqual(loader.state, .failed, "na de nieuwe poging volgt de melding")
        XCTAssertEqual(loader.autoRetries, 1, "maar één automatische nieuwe poging")
        loader.stop()
    }

    func testProbeerOpnieuwGeeftWeerEenStillePoging() {
        let loader = ArticleLoader()
        loader.load(dead)
        loader.temporaryFailure()
        loader.temporaryFailure()
        XCTAssertEqual(loader.state, .failed)
        loader.reload()
        XCTAssertEqual(loader.state, .loading)
        XCTAssertEqual(loader.autoRetries, 0)
        loader.temporaryFailure()
        XCTAssertEqual(loader.state, .loading, "ook na Probeer opnieuw eerst één stille poging")
        loader.stop()
    }

    func testEchteNetwerkfoutProbeertEenKeerOpnieuwEnMeldtDan() async {
        let loader = ArticleLoader()
        loader.load(dead)
        await waitFor(loader, .failed)
        XCTAssertEqual(loader.state, .failed)
        XCTAssertEqual(loader.autoRetries, 1, "de lezer probeerde het één keer opnieuw voor de melding")
        loader.stop()
    }

    func testFoutNaToonDePaginaNietMeerOpnieuw() {
        let loader = ArticleLoader()
        loader.load(dead)
        loader.showPage()
        loader.temporaryFailure()
        XCTAssertEqual(loader.state, .visit, "jij koos de pagina: geen nieuwe poging en geen melding eroverheen")
        loader.stop()
    }

    func testMeldingTekst() {
        XCTAssertEqual(ArticleReaderView.failedTitle, "Dit artikel lukt even niet in de lezer")
        XCTAssertEqual(ArticleReaderView.failedText, "Soms laadt de pagina niet goed. Probeer het opnieuw, of lees het op de website.")
    }
}
