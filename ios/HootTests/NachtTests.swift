import XCTest
import SwiftUI
@testable import Hoot

@MainActor final class NachtTests: XCTestCase {
    func testChoicesAndAutomaticFallback() {
        XCTAssertEqual(Weergave(stored: "oud"), .system)
        XCTAssertNil(Weergave.system.scheme)
        XCTAssertEqual(Weergave.night.scheme, .dark)
        XCTAssertEqual(Weergave.dark.scheme, .dark)
        XCTAssertEqual(Weergave.light.scheme, .light)
        XCTAssertFalse(Weergave.system.nightActive(systemDark: false, evening: "night"))
        XCTAssertTrue(Weergave.system.nightActive(systemDark: true, evening: "night"))
        XCTAssertFalse(Weergave.system.nightActive(systemDark: true, evening: "oud"))
    }
    func testPaperAndWarmDarkAreIndependent() {
        for dark in [false,true] {
            let original=UITraitCollection(userInterfaceStyle: dark ? .dark : .light)
            XCTAssertEqual(NachtKleur.paper.resolvedColor(with:original), UIColor(named:"Paper")!.resolvedColor(with:original))
        }
        var environment=EnvironmentValues();environment.colorScheme = .dark;environment.nachtActief = true
        let black=Theme.paper.resolve(in:environment)
        XCTAssertEqual(black.red,0);XCTAssertEqual(black.green,0);XCTAssertEqual(black.blue,0)
    }
    func testLocalStorageAndReader() {
        let name="hoot-night-test-"+UUID().uuidString
        let defaults=UserDefaults(suiteName:name)!
        defer { defaults.removePersistentDomain(forName:name) }
        defaults.set("night",forKey:"hoot.weergave")
        XCTAssertEqual(Weergave(stored:defaults.string(forKey:"hoot.weergave")!),.night)
        defaults.removeObject(forKey:"hoot.weergave")
        let item=Item(id:name,source:"nos",title:"Een verhaal",url:"https://nos.nl/a")
        let article=Article(title:"Een verhaal",content:"<p>Een rustige bladzijde.</p>",length:100)
        XCTAssertTrue(ReaderHTML.page(article,item:item,sourceName:"NOS",size:1,night:true).contains("--paper:#000000"))
        XCTAssertFalse(ReaderHTML.page(article,item:item,sourceName:"NOS",size:1).contains("--paper:#000000"))
    }
}
