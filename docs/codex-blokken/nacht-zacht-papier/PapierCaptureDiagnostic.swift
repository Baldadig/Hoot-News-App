import XCTest
import SwiftUI
import WebKit
@testable import Hoot

// Aanvullende diagnose: plaats tijdelijk in ios/HootTests, geen productwijziging.
@MainActor final class PapierCaptureDiagnostic:XCTestCase {
    func testExactOriginalPaperHTMLInSceneAttachedWebKit() async throws {
        let root=URL(fileURLWithPath:#filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let html=try String(contentsOf:root.appending(path:"docs/codex-blokken/nacht-zacht-papier/voor-ios-reader-html-papier.html"),encoding:.utf8)
        XCTAssertTrue(html.contains("d8d0c2"))
        let scene=try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.first)
        let previous=scene.windows.first(where: \.isKeyWindow)
        let content=ArticleWebView(html:html,baseURL:nil).environment(\.nachtActief,true).environment(\.colorScheme,.dark)
        let host=UIHostingController(rootView:content),window=UIWindow(windowScene:scene)
        window.frame=CGRect(x:0,y:0,width:390,height:844);window.rootViewController=host;window.overrideUserInterfaceStyle = .dark;window.traitOverrides[NachtTrait.self]=true
        window.makeKeyAndVisible();host.view.layoutIfNeeded()
        defer {window.isHidden=true;previous?.makeKey()}
        func find(_ v:UIView)->WKWebView? {if let w=v as? WKWebView{return w};return v.subviews.lazy.compactMap{find($0)}.first}
        let web=try XCTUnwrap(find(host.view))
        for _ in 0..<100 {if !web.isLoading && web.scrollView.contentSize.height>1000 {break};try await Task.sleep(for:.milliseconds(100))}
        XCTAssertFalse(web.isLoading);XCTAssertGreaterThan(web.scrollView.contentSize.height,1000)
        let image:UIImage=try await withCheckedThrowingContinuation {c in web.takeSnapshot(with:nil){image,error in if let image {c.resume(returning:image)}else{c.resume(throwing:error ?? NSError(domain:"PapierCapture",code:1))}}}
        let cg=try XCTUnwrap(image.cgImage),width=64,height=128
        var bytes=[UInt8](repeating:0,count:width*height*4)
        let context=try XCTUnwrap(CGContext(data:&bytes,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue))
        context.draw(cg,in:CGRect(x:0,y:0,width:width,height:height))
        let lit=stride(from:0,to:bytes.count,by:4).filter{max(bytes[$0],max(bytes[$0+1],bytes[$0+2]))>50}.count
        XCTAssertGreaterThan(lit,100,"De originele Papier-HTML bevat zichtbare tekst, geen volledig zwart vlak")
        print("ORIGINAL_PAPIER_VISIBLE_SAMPLES=\(lit)/\(width*height)")
        let a=XCTAttachment(image:image);a.name="originele-papier-html-heropname";a.lifetime = .keepAlways;add(a)
    }
}
