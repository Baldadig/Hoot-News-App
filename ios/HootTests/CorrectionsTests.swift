import XCTest
@testable import Hoot

@MainActor final class CorrectionsTests: XCTestCase {
    func testOwnerIsolationBoundedStorageAndNoTasteEffect() throws {
        let name = "HootTests.Corrections." + UUID().uuidString
        let defaults = try XCTUnwrap(UserDefaults(suiteName:name))
        defer { defaults.removePersistentDomain(forName:name) }
        let store = HootStore(), tick = store.syncTick, taste = store.taste
        let item = Item(id:"a",source:"nos",title:"Een verhaal",url:"https://nos.nl/a?token=private#deel")
        XCTAssertTrue(store.reportMistake(item,reason:.country,defaults:defaults))
        XCTAssertEqual(store.syncTick,tick)
        XCTAssertEqual(store.taste,taste)
        XCTAssertNil(store.syncedPrefs["corrections"])
        XCTAssertEqual(CorrectionStore.read(owner:"anon",defaults:defaults).first?.url,"https://nos.nl/a")
        XCTAssertTrue(CorrectionStore.read(owner:"other-user",defaults:defaults).isEmpty)
        XCTAssertTrue(CorrectionStore.read(owner:nil,defaults:defaults).isEmpty)
        for i in 0..<205 { XCTAssertTrue(CorrectionStore.record(owner:"alice",articleId:String(i),storyId:nil,reason:.desk,title:"Titel",url:nil,defaults:defaults)) }
        XCTAssertEqual(CorrectionStore.read(owner:"alice",defaults:defaults).count,200)
        XCTAssertTrue(CorrectionStore.record(owner:"alice",articleId:"204",storyId:nil,reason:.desk,title:"Herhaald",url:nil,defaults:defaults))
        XCTAssertEqual(CorrectionStore.read(owner:"alice",defaults:defaults).count,200)
        XCTAssertFalse(CorrectionStore.record(owner:nil,articleId:"a",storyId:nil,reason:.desk,title:"Titel",url:nil,defaults:defaults))
    }
}
