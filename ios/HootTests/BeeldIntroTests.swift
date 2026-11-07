import XCTest
import UIKit
@testable import Hoot

// Build 46 (BEELD-EN-INTRO.md): intro in 3 regels met hele zinnen, Bing-beeld groot als het kan, en bij een
// beeld dat niet laadt geen grijs vlak maar de beeldloze vorm. Dezelfde regels als het web
// (tests/beeld-intro-web.test.mjs).
@MainActor
final class BeeldIntroTests: XCTestCase {
    func testIntroStandaardDrieRegelsEnOudeTweeWordtDrie() {
        XCTAssertEqual(HootStore.introLines, 3)
        XCTAssertEqual(HootStore.oldPreview(2), 3) // de oude standaard, ook door de app meegestuurd
        XCTAssertEqual(HootStore.oldPreview(1), 1)
        XCTAssertEqual(HootStore.oldPreview(0), 0) // de hele intro
        XCTAssertNil(HootStore.oldPreview(nil))
    }

    func testDrieRegelsHoudtEenZinDieInTweeWegviel() {
        let intro = "De Democraten hebben bij de tussentijdse verkiezingen in de Verenigde Staten een grote overwinning behaald op de Republikeinen en ook in staten waar Trump twee jaar geleden nog ruim won. Trump erkent zijn verlies niet."
        XCTAssertEqual(wholeSentences(intro, max: introMax(lines: 2, thumb: false)), "")
        let drie = wholeSentences(intro, max: introMax(lines: 3, thumb: false))
        XCTAssertTrue(drie.hasPrefix("De Democraten hebben") && drie.hasSuffix("ruim won."))
        for t in ["Een zin die stopt middenin…", "Eerste zin is af. Tweede zin stopt mid..."] {
            for n in 1 ... 3 { XCTAssertFalse(wholeSentences(t, max: introMax(lines: n, thumb: n == 2)).hasSuffix("…")) }
        }
    }

    func testGeleendeIntroDraagtZijnBron() throws {
        let json = #"{"id":"a","source":"volkskrant","url":"https://www.volkskrant.nl/a","title":"Kop","summary":"Een hele zin.","borrowedFrom":"NOS"}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        XCTAssertEqual(item.introWithSource("Een hele zin."), "Een hele zin. — via NOS")
        XCTAssertEqual(item.viaLength, 11)
    }

    func testBingBeeldGemetenMagGroot() {
        let ongemeten = "https://www.bing.com/th?id=ONUT.abc&pid=News&w=1200&h=675&c=7"
        XCTAssertEqual(ImageURL.knownWidth(ongemeten), 320)
        XCTAssertFalse(ImageURL.fitsLarge(ongemeten))
        let groot = "https://www.bing.com/th?id=ONUT.abc&pid=News&w=700&h=393"
        XCTAssertEqual(ImageURL.knownWidth(groot), 700)
        XCTAssertTrue(ImageURL.fitsLarge(groot))
        XCTAssertTrue(ImageURL.fitsHero(groot)) // The Economist in het hoofdverhaal
        XCTAssertFalse(ImageURL.fitsLarge("https://www.bing.com/th?id=ONUT.k&pid=News&w=300&h=200"))
    }

    func testBeeldDatNietLaadtWordtBeeldloosGeenGrijsVlak() async {
        ImageFallbackProtocol.reset()
        ImageFallbackProtocol.originalStatus = 404
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [ImageFallbackProtocol.self]
        let loader = RemoteImageLoader()
        await loader.load(URL(string: "https://images.nrc.nl/weg.png"), transport: URLSession(configuration: config))
        XCTAssertNil(loader.image)
        XCTAssertTrue(loader.failed)
        // Geen adres is ook beeldloos.
        let leeg = RemoteImageLoader()
        await leeg.load(nil)
        XCTAssertTrue(leeg.failed)
        // Wel geladen: niet mislukt.
        ImageFallbackProtocol.reset()
        let goed = RemoteImageLoader()
        await goed.load(URL(string: "https://images.nrc.nl/goed.png"), transport: URLSession(configuration: config))
        XCTAssertNotNil(goed.image)
        XCTAssertFalse(goed.failed)
        ImageFallbackProtocol.reset()
    }

    func testBeeldloosStaatOpEenPlek() throws {
        // De rijen en het hoofdverhaal tonen bij geen of mislukt beeld BeeldloosView; RemoteImage laat bij een
        // mislukking geen grijs vlak staan.
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let components = try String(contentsOf: root.appending(path: "Hoot/Views/Components.swift"), encoding: .utf8)
        XCTAssertEqual(components.components(separatedBy: "BeeldloosView(item: item, kind:").count - 1, 7) // hoofdverhaal (2), tijdlijn, krant, plus de kaart A+ van het hoofdverhaal en van de tijdlijn, en 01 boven de vouw
        XCTAssertTrue(components.contains("} else if loader.failed {\n                Color.clear"))
        XCTAssertTrue(components.contains("onFail: mislukt"))
    }

    // Kaartkwaliteit (7 november): past de eigen intro niet, dan de reserve uit hetzelfde verhaal (introAlt), met zijn
    // bron; gelijk aan cardIntro in shared/kaart-intro.mjs.
    func testReserveIntroUitHetzelfdeVerhaal() throws {
        let pope = "Less than a month after losing part of a lung, Pope Leo XIV set out this morning on one of the longest and most ambitious trips of his pontificate."
        let kort = "Pope Leo travels to Uruguay just three weeks after having surgery for lung cancer."
        let json = #"{"id":"a","source":"atlantic","url":"https://www.theatlantic.com/a","title":"The Pope","summary":"\#(pope)","introAlt":"\#(kort)","introAltFrom":"BBC"}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        let smal = item.cardIntro(max: 86, rek: 116)
        XCTAssertEqual(smal?.text, kort)
        XCTAssertEqual(smal?.via, "BBC")
        XCTAssertEqual(Item.withVia(smal?.via)(kort), kort + " — via BBC")
        // Ruim genoeg: de eigen intro, zonder via.
        XCTAssertEqual(item.cardIntro(max: 160)?.text, pope)
        XCTAssertNil(item.cardIntro(max: 160)?.via)
    }

    // Ronde 2: de tekst van een blog is geen intro, ook niet de rest, ook niet als reserve (Aanhef, gelijk aan shared/aanhef.mjs).
    // Pas bij het tonen: `summary` zelf blijft (de redacteur rekent ermee).
    func testBlogaanhefIsGeenIntro() throws {
        let blog = "Welkom in het blog over de midtermverkiezingen in de Verenigde Staten."
        let json = #"{"id":"b","source":"volkskrant","url":"https://www.volkskrant.nl/b","title":"Rechter blokkeert bouw triomfboog","summary":"\#(blog)","introAlt":"Volg alle ontwikkelingen over het Midden-Oosten in onze liveblog.","introAltFrom":"HLN"}"#
        let item = try JSONDecoder().decode(Item.self, from: Data(json.utf8))
        XCTAssertNil(item.cardIntro(max: 200))
        XCTAssertNil(item.shownSummary)
        XCTAssertEqual(item.summary, blog)
        XCTAssertEqual(Aanhef.shown(blog + " De rechter legt de bouw stil."), "")
        XCTAssertEqual(Aanhef.shown("Op deze pagina blijft u op de hoogte van al het nieuws in het wielrennen."), "")
        // Restanten van een liveblog: geen intro.
        XCTAssertEqual(Aanhef.shown("Hallo en welkom in dit liveblog. Hier houden we je op de hoogte van de oorlog. Heb je een vraag? Mail die naar redactie@nu.nl."), "")
        XCTAssertEqual(Aanhef.shown("De Formule 1 dendert door in deze periode. Volg alle ontwikkelingen hier."), "")
        // Een losse verwijzing gaat er alleen zelf uit; een welkom verderop is gewoon tekst.
        XCTAssertEqual(Aanhef.shown("Sony has snatched up the movie rights for Mouthwashing. Read more"), "Sony has snatched up the movie rights for Mouthwashing.")
        XCTAssertEqual(Aanhef.shown("Gone are the days of scooping and smells. Welcome to the future."), "Gone are the days of scooping and smells. Welcome to the future.")
        // Gewoon nieuws blijft staan.
        for z in ["Vluchtelingen zijn welkom in de gemeente.", "Het kabinet houdt de Kamer op de hoogte.", "The blogger was arrested on Friday."] {
            XCTAssertEqual(Aanhef.shown(z), z)
        }
    }

    // Zinnen knippen met de afkortingenregel (Sentences.ends): "No. 150" is geen zinseinde, net als sentencesOf op het web.
    func testZinnenMetAfkortingen() {
        XCTAssertEqual(Aanhef.sentences("Hi, friends! Welcome to Installer No. 150, your guide to the best stuff."), ["Hi, friends!", " Welcome to Installer No. 150, your guide to the best stuff."])
        XCTAssertEqual(Aanhef.sentences("Dat zei dr. Jansen. Lees hier meer."), ["Dat zei dr. Jansen.", " Lees hier meer."])
        XCTAssertEqual(Aanhef.shown("Hi, friends! Welcome to Installer No. 150, your guide to the best and Verge-iest stuff in the world."), "")
        XCTAssertEqual(Aanhef.shown("De bus van lijn nr. 12 reed door rood. Lees ook ons achtergrondstuk."), "De bus van lijn nr. 12 reed door rood.")
    }

    // Een geleende intro over een ander feit (introLoose, server: looseBorrow) staat er niet; een reserve alleen als hele zin.
    func testLosseLeningEnReserveAlsHeleZin() throws {
        let loose = try JSONDecoder().decode(Item.self, from: Data(#"{"id":"e","source":"rtl","url":"https://www.rtlnieuws.nl/e","title":"Eerbetoon aan Paulien Cornelisse","summary":"Mats Akkerman is uitgeroepen tot de winnaar.","borrowedFrom":"NU.nl","introLoose":true}"#.utf8))
        XCTAssertNil(loose.shownSummary)
        XCTAssertNil(loose.cardIntro(max: 200))
        let ahold = "Ahold Delhaize, eigenaar van onder meer Albert Heijn, Etos, Gall & Gall en bol, verwacht dat de omzet in het vierde kwartaal tussen de 200 miljoen en 250 miljoen euro lager uitvalt."
        let r = try JSONDecoder().decode(Item.self, from: Data(#"{"id":"f","source":"volkskrant","url":"https://www.volkskrant.nl/f","title":"Ahold","introAlt":"\#(ahold)","introAltFrom":"AD"}"#.utf8))
        XCTAssertNil(r.reserveIntro(max: 120)) // alleen een stuk tot een komma: geen reserve
        XCTAssertEqual(r.reserveIntro(max: 300)?.text, ahold)
        // Ook een geleende eigen intro ("via") alleen als hele zin.
        let g = try JSONDecoder().decode(Item.self, from: Data(#"{"id":"h","source":"volkskrant","url":"https://www.volkskrant.nl/h","title":"Ahold","summary":"\#(ahold)","borrowedFrom":"AD"}"#.utf8))
        XCTAssertNil(g.cardIntro(max: 120))
        XCTAssertEqual(g.cardIntro(max: 300)?.via, "AD")
    }

    // Het rek-vangnet van het web (fitem__sum--rek): past de eerste zin niet binnen de maat, dan mag hij een regel
    // langer zijn; en valt de eigen intro bij het meten weg, dan probeert IntroText de reserve.
    func testRekVangnetEnReserveBijHetMeten() throws {
        let pope = "Less than a month after losing part of a lung, Pope Leo XIV set out this morning on one of the longest and most ambitious trips of his pontificate."
        let kort = "Pope Leo travels to Uruguay just three weeks after having surgery for lung cancer."
        let own = try JSONDecoder().decode(Item.self, from: Data(#"{"id":"c","source":"atlantic","url":"https://www.theatlantic.com/c","title":"The Pope","summary":"\#(pope)"}"#.utf8))
        XCTAssertNil(own.cardIntro(max: 120))
        XCTAssertEqual(own.cardIntro(max: 120, line: 48)?.text, pope)
        XCTAssertEqual(own.cardIntro(max: Int.max, line: 48)?.text, pope) // "alles" loopt niet over
        let both = try JSONDecoder().decode(Item.self, from: Data(#"{"id":"d","source":"atlantic","url":"https://www.theatlantic.com/d","title":"The Pope","summary":"\#(pope)","introAlt":"\#(kort)","introAltFrom":"BBC"}"#.utf8))
        let chosen = try XCTUnwrap(both.cardIntro(max: 160, line: 48))
        XCTAssertEqual(chosen.text, pope)
        let fallback = try XCTUnwrap(both.introFallback(for: chosen, max: 160, line: 48))
        XCTAssertEqual(fallback.suffix(fallback.text), kort + " — via BBC")
    }
}
