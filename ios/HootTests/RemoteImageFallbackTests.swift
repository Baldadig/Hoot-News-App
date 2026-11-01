import XCTest
import UIKit
@testable import Hoot

@MainActor
final class RemoteImageFallbackTests: XCTestCase {
    private let original = URL(string:"https://images.nrc.nl/hoot-test-image.png")!
    private func session() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [ImageFallbackProtocol.self]
        return URLSession(configuration:config)
    }
    override func tearDown() { ImageFallbackProtocol.reset(); super.tearDown() }
    func testOnlyOwnCdnCanFallBackToKnownOriginal() {
        let sized = ImageURL.url(original.absoluteString,.large)!
        XCTAssertEqual(ImageURL.originalFallback(for:sized),original)
        XCTAssertNil(ImageURL.originalFallback(for:original))
        XCTAssertNil(ImageURL.originalFallback(for:URL(string:"https://other.example/.netlify/images?url=https%3A%2F%2Fimages.nrc.nl%2Fa.png")!))
        var c = URLComponents(url:sized,resolvingAgainstBaseURL:false)!
        c.queryItems = [.init(name:"url",value:"https://unknown.example/a.png")]
        XCTAssertNil(ImageURL.originalFallback(for:c.url!))
        c.queryItems = [.init(name:"url",value:original.absoluteString),.init(name:"url",value:original.absoluteString)]
        XCTAssertNil(ImageURL.originalFallback(for:c.url!))
    }
    func testCdnFailureAndBrokenImageTryOriginalExactlyOnce() async {
        for mode in [503,200] {
            ImageFallbackProtocol.reset()
            ImageFallbackProtocol.primaryStatus = mode
            let loader = RemoteImageLoader()
            await loader.load(ImageURL.url(original.absoluteString,.large),transport:session())
            XCTAssertNotNil(loader.image)
            XCTAssertEqual(ImageFallbackProtocol.paths,["/.netlify/images","/hoot-test-image.png"])
        }
    }
    func testFailedDirectImageDoesNotLoopOrSearchOtherHosts() async {
        ImageFallbackProtocol.originalStatus = 404
        let loader = RemoteImageLoader()
        await loader.load(original,transport:session())
        XCTAssertNil(loader.image); XCTAssertEqual(ImageFallbackProtocol.paths,["/hoot-test-image.png"])
    }
    func testCancelledRequestDoesNotStartFallback() async {
        let loader = RemoteImageLoader()
        let task = Task { await loader.load(ImageURL.url(original.absoluteString,.large),transport:session()) }
        task.cancel(); await task.value
        XCTAssertNil(loader.image); XCTAssertTrue(ImageFallbackProtocol.paths.isEmpty)
    }
}

final class ImageFallbackProtocol: URLProtocol {
    private static let lock = NSLock()
    nonisolated(unsafe) static var primaryStatus = 503
    nonisolated(unsafe) static var originalStatus = 200
    nonisolated(unsafe) static var paths: [String] = []
    static func reset() { lock.withLock { primaryStatus=503; originalStatus=200; paths=[] } }
    override class func canInit(with request:URLRequest)->Bool { true }
    override class func canonicalRequest(for request:URLRequest)->URLRequest { request }
    override func stopLoading() {}
    override func startLoading() {
        let path = request.url!.path
        let status = Self.lock.withLock { Self.paths.append(path); return path == "/.netlify/images" ? Self.primaryStatus : Self.originalStatus }
        let data:Data
        if path == "/.netlify/images" { data=Data("kapot beeld".utf8) }
        else { data = Data(base64Encoded:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDBkAAAAASUVORK5CYII=")! }
        client?.urlProtocol(self,didReceive:HTTPURLResponse(url:request.url!,statusCode:status,httpVersion:nil,headerFields:["Content-Type":"image/png"])!,cacheStoragePolicy:.notAllowed)
        client?.urlProtocol(self,didLoad:data); client?.urlProtocolDidFinishLoading(self)
    }
}
