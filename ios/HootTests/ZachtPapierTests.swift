import XCTest
import CryptoKit
import SwiftUI
@testable import Hoot

@MainActor final class ZachtPapierTests: XCTestCase {
    static func reader(night: Bool) -> String {
        let item=Item(id:"zacht-papier-baseline",source:"nos",title:"Ruimte om rustig te lezen",url:"https://example.test/leesproef")
        let text="Een goed verhaal vraagt tijd en aandacht. Je leest op je eigen tempo en houdt ruimte voor een andere blik."
        let article=Article(title:item.title,content:(0..<16).map{_ in "<p>\(text)</p>"}.joined(),length:2000)
        return ReaderHTML.page(article,item:item,sourceName:"NOS",size:1,lang:"nl",night:night)
    }
    func testReaderOutsideNightIsByteIdenticalToBaseline() {
        let html=Self.reader(night:false)
        let hash=SHA256.hash(data:Data(html.utf8)).map{String(format:"%02x",$0)}.joined()
        XCTAssertEqual(hash,"5efda9dd70b2472a5f6aa1613d62b4c556c130df42786b590772cd6bbf10df70") // bijgewerkt (b47: Schibsted Grotesk in plaats van Inter in de lezer; b46 B1: kop-css zonder AX-voorwaarde; eerder: de lezer sluit kleine latin-WOFF's in (build-reader-fonts.mjs), geen volle TTF's)
        XCTAssertFalse(html.contains("--paper:#000000"))
    }
    func testOnlyNightUsesChosenInk() {
        let night=UITraitCollection { traits in traits.userInterfaceStyle = .dark; traits[NachtTrait.self] = true }
        let roles:[(String,UIColor,UInt32)]=[("Ink",NachtKleur.ink,NachtLeesinkt.ink),("Ink2",NachtKleur.ink2,NachtLeesinkt.ink2),("Ink3",NachtKleur.ink3,NachtLeesinkt.ink3),("AccentColor",NachtKleur.accent,NachtLeesinkt.accent)]
        for (name,color,hex) in roles {
            var r:CGFloat=0,g:CGFloat=0,b:CGFloat=0,a:CGFloat=0
            color.resolvedColor(with:night).getRed(&r,green:&g,blue:&b,alpha:&a)
            XCTAssertEqual(Int((r*255).rounded()),Int((hex>>16)&255));XCTAssertEqual(Int((g*255).rounded()),Int((hex>>8)&255));XCTAssertEqual(Int((b*255).rounded()),Int(hex&255));XCTAssertEqual(a,1)
            for style in [UIUserInterfaceStyle.light,.dark] {
                let traits=UITraitCollection(userInterfaceStyle:style)
                XCTAssertEqual(color.resolvedColor(with:traits),UIColor(named:name)!.resolvedColor(with:traits))
            }
        }
    }
    func testReaderNightAndBrandAreIndependent() {
        let html=Self.reader(night:true)
        XCTAssertTrue(html.contains("--ink:#d8d0c2"));XCTAssertTrue(html.contains("--accent:#df8276"));XCTAssertTrue(html.contains("line-height: 1.6"))
        XCTAssertEqual(Theme.brandRed.resolve(in:EnvironmentValues()),Color("BrandRed").resolve(in:EnvironmentValues()))
    }
}
