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
    func testOpenSettingsSheetFollowsLiveChoice() async throws {
        let suite="hoot-night-sheet-"+UUID().uuidString,defaults=UserDefaults(suiteName:suite)!
        let oldScreen=UserDefaults.standard.object(forKey:"HootScreen")
        UserDefaults.standard.set("instellingen",forKey:"HootScreen")
        defaults.set("night",forKey:"hoot.weergave")
        let root=Text("Hoot").settingsButton().environment(HootStore()).environment(Account()).environment(EditionAlerts.shared).modifier(HootWeergave()).defaultAppStorage(defaults)
        let host=UIHostingController(rootView:root)
        let scene=try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.first)
        let previous=scene.windows.first(where:{$0.isKeyWindow})
        let window=UIWindow(windowScene:scene);window.frame=CGRect(x:0,y:0,width:390,height:844);window.rootViewController=host;window.makeKeyAndVisible()
        defer {window.isHidden=true;previous?.makeKey();defaults.removePersistentDomain(forName:suite);if let oldScreen{UserDefaults.standard.set(oldScreen,forKey:"HootScreen")}else{UserDefaults.standard.removeObject(forKey:"HootScreen")}}
        try await Task.sleep(for:.milliseconds(900))
        let sheet=try XCTUnwrap(host.presentedViewController)
        XCTAssertEqual(sheet.traitCollection.userInterfaceStyle,.dark)
        defaults.set("light",forKey:"hoot.weergave")
        try await Task.sleep(for:.milliseconds(500))
        XCTAssertEqual(sheet.traitCollection.userInterfaceStyle,.light,"Ook het al geopende instellingenblad moet licht worden")
        defaults.set("night",forKey:"hoot.weergave")
        try await Task.sleep(for:.milliseconds(500))
        XCTAssertEqual(sheet.traitCollection.userInterfaceStyle,.dark)
    }

}
