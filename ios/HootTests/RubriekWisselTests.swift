import XCTest
@testable import Hoot
final class RubriekWisselTests:XCTestCase {
    func testPreloadRespectsImagesOffAndVisibleLimit() {
        var one=Item(id:"1",source:"nos",title:"A",url:"https://example.test/a");one.image="https://example.test/one.jpg"
        let two=one
        var three=one;three.image="https://example.test/two.jpg"
        var four=one;four.image="https://example.test/not-visible.jpg"
        XCTAssertEqual(RubriekWissel.images([one,two,three,four],enabled:true,kind:.large).map(\.lastPathComponent),["one.jpg","two.jpg"])
        XCTAssertEqual(RubriekWissel.images([one],enabled:false,kind:.large),[])
    }
    func testCancelledPreloadReturnsWithoutNetwork() async {
        let task=Task { await RubriekWissel.preload([URL(string:"https://example.invalid/proef")!]) }
        task.cancel();await task.value
        XCTAssertTrue(task.isCancelled)
    }
}
