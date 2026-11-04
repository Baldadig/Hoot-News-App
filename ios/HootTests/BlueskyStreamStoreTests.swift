import XCTest
@testable import Hoot

@MainActor
final class BlueskyStreamStoreTests: XCTestCase {
    nonisolated(unsafe) private var savedDefaults:[String:Any] = [:]
    nonisolated(unsafe) private var savedFiles:[String:Data] = [:]
    nonisolated private static let files=["saved.json","read.json","import.json","edition.json"]
    nonisolated private var folder:URL { FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Hoot") }
    override func setUp() {
        savedDefaults=UserDefaults.standard.dictionaryRepresentation().filter{$0.key.hasPrefix("hoot.")}
        for k in savedDefaults.keys { UserDefaults.standard.removeObject(forKey:k) }
        // Ook import.json en edition.json: een eerdere keuring kan ze op het toestel hebben laten staan, en een
        // nieuwe HootStore() leest ze (import.json zet er eigen Bluesky-accounts van de keurder in). Eerst bewaren, dan weg.
        for name in Self.files { if let d=try? Data(contentsOf:folder.appendingPathComponent(name)){savedFiles[name]=d}; try? FileManager.default.removeItem(at:folder.appendingPathComponent(name)) }
    }
    override func tearDown() {
        for k in UserDefaults.standard.dictionaryRepresentation().keys where k.hasPrefix("hoot.") { UserDefaults.standard.removeObject(forKey:k) }
        for (k,v) in savedDefaults { UserDefaults.standard.set(v,forKey:k) }
        for name in Self.files {
            let url=folder.appendingPathComponent(name)
            if let data=savedFiles[name] {try? data.write(to:url,options:.atomic)} else {try? FileManager.default.removeItem(at:url)}
        }
        super.tearDown()
    }
    private func post(_ source:String)->Item { Item(id:"p-"+source,source:source,kind:"post",title:"",summary:"Eigen post",url:"https://bsky.app/profile/"+source+"/post/test",publishedAt:ISO8601DateFormatter().string(from:.now)) }
    private func apply(_ store:HootStore,_ object:[String:Any],unite:Bool=false)throws {store.applyRemote(prefs:try JSONSerialization.data(withJSONObject:object),read:[],saved:nil,unite:unite)}
    func testChoiceSyncAndImmediateDisableWithoutChangingOwnDestination() async throws {
        UserDefaults.standard.set("remote", forKey: HootStore.streamRepairKey) // dit gaat over de keuze zelf, niet over het herstel
        let store=HootStore(), a=post("bsky:a.example"), b=post("bsky:b.example")
        store.socialPostsLoader = {account in account.handle=="a.example" ? [a]:[b]}
        try apply(store,["bluesky":false,"social":[["handle":"a.example","name":"A"],["handle":"b.example","name":"B"]],"bskyInStream":[a.source]])
        store.bluesky=true
        await Task.yield();await store.loadOwnPosts()
        XCTAssertEqual(Set(store.stream.map(\.id)),[a.id])
        XCTAssertEqual(Set(store.posts.map(\.id)),[a.id,b.id])
        XCTAssertEqual(store.syncedPrefs["bskyInStream"] as? [String],[a.source])
        let tick=store.syncTick
        store.bskyInStream=[]
        XCTAssertTrue(store.stream.isEmpty);XCTAssertEqual(store.posts.count,2);XCTAssertGreaterThan(store.syncTick,tick)
        store.bskyInStream=[a.source];XCTAssertEqual(store.stream.count,1)
        store.setOn(store.socialSources.first{$0.id==a.source}!,false);XCTAssertTrue(store.stream.isEmpty)
        store.setOn(store.socialSources.first{$0.id==a.source}!,true);XCTAssertEqual(store.stream.count,1)
        store.bluesky=false;XCTAssertTrue(store.stream.isEmpty)
        store.forgetChoices();XCTAssertTrue(store.bskyInStream.isEmpty);XCTAssertTrue(store.posts.isEmpty)
    }
    func testLegacyFollowedAccountsDefaultOnButExplicitEmptySurvivesRestart() throws {
        let accounts = [BlueskyAccount(handle: "legacy.example", name: "Legacy", avatar: nil)]
        UserDefaults.standard.set(try JSONEncoder().encode(accounts), forKey: "hoot.ownBluesky")
        let store = HootStore()
        XCTAssertEqual(store.bskyInStream, ["bsky:legacy.example"])
        store.bskyInStream = []
        XCTAssertTrue(HootStore().bskyInStream.isEmpty)
    }
    func testLegacyImportedAccountsDefaultOn() throws {
        let store = HootStore()
        try apply(store, ["social": [["handle": "legacy.example", "name": "Legacy"]]])
        XCTAssertEqual(store.bskyInStream, ["bsky:legacy.example"])
    }
    func testMissingOldClientPreferenceIsPreservedButExplicitEmptyClears() throws {
        let store=HootStore();store.bskyInStream=["bsky:a.example"]
        try apply(store,["layout":"krant"])
        XCTAssertEqual(store.bskyInStream,["bsky:a.example"])
        try apply(store,["bskyInStream":["bsky:b.example"]],unite:true)
        XCTAssertEqual(store.bskyInStream,["bsky:a.example","bsky:b.example"])
        try apply(store,["bskyInStream":[]])
        XCTAssertTrue(store.bskyInStream.isEmpty)
    }
    func testDifferentOwnerDoesNotInheritMissingOldClientChoice() throws {
        let store=HootStore(), account=Account()
        account.stub(uid:"B",transport:URLSession(configuration:.ephemeral))
        store.account=account
        UserDefaults.standard.set("A",forKey:"hoot.owner")
        store.bskyInStream=["bsky:a.example"]
        try apply(store,["layout":"krant"])
        XCTAssertTrue(store.bskyInStream.isEmpty)
        XCTAssertTrue(store.ownBluesky.isEmpty)
    }
    func testLateOwnPostResponseCannotRestoreRemovedAccount() async throws {
        let store=HootStore(), a=post("bsky:a.example")
        let started=expectation(description:"publieke postrequest wacht")
        let gate=PostGate(started:started)
        store.socialPostsLoader={_ in await gate.wait();return [a]}
        try apply(store,["bluesky":false,"social":[["handle":"a.example","name":"A"]],"bskyInStream":[a.source]])
        store.bluesky=true
        let task=Task{await store.loadOwnPosts()}
        await fulfillment(of:[started],timeout:3)
        store.removeBluesky(a.source)
        await gate.release();await task.value
        XCTAssertTrue(store.stream.isEmpty);XCTAssertTrue(store.posts.isEmpty);XCTAssertTrue(store.bskyInStream.isEmpty)
    }
    // Build 45: een account toevoegen zette het niet in de Stroom (bskyInStream bleef leeg).
    func testAddedAccountAppearsInStreamAndSyncs() async throws {
        UserDefaults.standard.set("remote", forKey: HootStore.streamRepairKey)
        let store=HootStore(), a=post("bsky:a.example")
        store.socialProfileLoader={_ in BlueskyAccount(handle:"a.example",name:"A",avatar:nil)}
        store.socialPostsLoader={_ in [a]}
        store.bluesky=true
        try await store.addBluesky("@a.example")
        XCTAssertEqual(store.bskyInStream,[a.source])
        XCTAssertEqual(store.stream.map(\.id),[a.id])
        XCTAssertEqual(store.syncedPrefs["bskyInStream"] as? [String],[a.source])
        XCTAssertEqual(HootStore().bskyInStream,[a.source]) // ook na opnieuw starten
    }
    func testAddingTurnsBlueskyOnLikeTheWeb() async throws {
        UserDefaults.standard.set("remote", forKey: HootStore.streamRepairKey)
        let store=HootStore()
        store.socialProfileLoader={_ in BlueskyAccount(handle:"a.example",name:"A",avatar:nil)}
        store.socialPostsLoader={_ in []}
        try await store.addBluesky("a.example")
        XCTAssertTrue(store.bluesky)
    }
    // Wat build 44/45 naar je account schreef (accounts, lege Stroom-keuze) komt na een (her)installatie
    // terug mét de accounts in de Stroom, en dat gaat in dezelfde pull terug naar je account.
    func testReinstallRestoresAccountsFromProfileAndRepairsEmptyChoice() async throws {
        let store=HootStore(), a=post("bsky:a.example")
        store.socialPostsLoader={_ in [a]}
        try apply(store,["bluesky":true,"social":[["handle":"a.example","name":"A","avatar":NSNull()]],"bskyInStream":[]],unite:true)
        XCTAssertEqual(store.ownBluesky.map(\.handle),["a.example"])
        XCTAssertEqual(store.bskyInStream,[a.source])
        XCTAssertEqual(store.syncedPrefs["bskyInStream"] as? [String],[a.source])
        await store.loadOwnPosts()
        for _ in 0..<50 where store.stream.isEmpty { try await Task.sleep(for:.milliseconds(20)) } // de laadtaken van apply lopen ook
        XCTAssertEqual(store.stream.map(\.id),[a.id])
        // Daarna is een lege keuze weer een bewuste keuze.
        try apply(store,["bskyInStream":[]])
        XCTAssertTrue(store.bskyInStream.isEmpty)
    }
    func testUpdateFromBuild45RepairsLocalChoiceOnce() throws {
        UserDefaults.standard.set(try JSONEncoder().encode([BlueskyAccount(handle:"a.example",name:"A",avatar:nil)]),forKey:"hoot.ownBluesky")
        UserDefaults.standard.set(try JSONEncoder().encode([String]()),forKey:"hoot.bskyInStream")
        UserDefaults.standard.set(try JSONEncoder().encode(true),forKey:"hoot.bluesky")
        let store=HootStore()
        XCTAssertEqual(store.bskyInStream,["bsky:a.example"])
        store.bskyInStream=[]
        XCTAssertTrue(HootStore().bskyInStream.isEmpty)
    }
    func testProfileWithoutSwitchOrNamesStillRestores() throws {
        let store=HootStore()
        try apply(store,["social":[["handle":"a.example"],["name":"kapot"],["handle":"b.example","name":"B"]]],unite:true)
        XCTAssertEqual(store.ownBluesky.map(\.handle),["a.example","b.example"])
        XCTAssertEqual(store.ownBluesky.first?.name,"a.example")
        XCTAssertTrue(store.bluesky)
    }
}
private actor PostGate {
    let started:XCTestExpectation
    var notified=false,open=false
    var continuations:[CheckedContinuation<Void,Never>]=[]
    init(started:XCTestExpectation){self.started=started}
    func wait()async {
        if !notified {notified=true;started.fulfill()}
        if open{return}
        await withCheckedContinuation{continuations.append($0)}
    }
    func release(){open=true;for c in continuations{c.resume()};continuations=[]}
}
