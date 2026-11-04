import XCTest
import SwiftUI
import WebKit
@testable import Hoot

// Alleen openbare, ongewijzigde proefbeelden. Het netwerk blijft in deze proef lokaal in URLProtocol.
final class PapierImageProtocol: URLProtocol, @unchecked Sendable {
    override class func canInit(with request: URLRequest) -> Bool { request.url?.host == "zacht-papier.invalid" }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let name=request.url!.lastPathComponent
        let file=URL(fileURLWithPath:#filePath).deletingLastPathComponent().appending(path:"Fixtures/ZachtPapier/"+name)
        do {
            let data=try Data(contentsOf:file)
            let response=HTTPURLResponse(url:request.url!,statusCode:200,httpVersion:nil,headerFields:["Content-Type":name.hasSuffix("jpg") ? "image/jpeg" : "image/webp"])!
            client?.urlProtocol(self,didReceive:response,cacheStoragePolicy:.notAllowed)
            client?.urlProtocol(self,didLoad:data);client?.urlProtocolDidFinishLoading(self)
        } catch {client?.urlProtocol(self,didFailWithError:error)}
    }
    override func stopLoading() {}
}
@MainActor final class ZachtPapierRenderTests: XCTestCase {
    func testSceneAttachedReaderAndImageSurfaces() async throws {
        URLProtocol.registerClass(PapierImageProtocol.self)
        defer {URLProtocol.unregisterClass(PapierImageProtocol.self)}
        let scene=try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.first)
        let previous=scene.windows.first(where: \.isKeyWindow)
        defer { previous?.makeKey() }
        for (name,scheme,night) in [("licht",ColorScheme.light,false),("donker",.dark,false),("nacht",.dark,true)] {
            let html=ZachtPapierTests.reader(night:night)
            let content=ArticleWebView(html:html,baseURL:nil).environment(\.nachtActief,night).environment(\.colorScheme,scheme)
            let (window,host)=show(content,scene:scene,scheme:scheme,night:night)
            let web=try XCTUnwrap(findWeb(host.view))
            for _ in 0..<100 {
                if !web.isLoading && web.scrollView.contentSize.height > 1000 {break}
                try await Task.sleep(for:.milliseconds(100))
            }
            XCTAssertFalse(web.isLoading);XCTAssertGreaterThan(web.scrollView.contentSize.height,1000)
            let shot=try await snapshot(web)
            let mean=try luminance(shot)
            if scheme == .light {XCTAssertGreaterThan(mean,0.65,"Papier mag niet zwart gerenderd worden")}
            else {XCTAssertGreaterThan(mean,0.005);XCTAssertLessThan(mean,0.25)}
            attach(shot,"ios-lezer-"+name)
            web.scrollView.setContentOffset(CGPoint(x:0,y:900),animated:false)
            try await Task.sleep(for:.milliseconds(100))
            attach(try await snapshot(web),"ios-lezer-lang-"+name)
            window.isHidden=true

            var item=Item(id:"proef-logo",source:"nos",title:"Ruimte om rustig te lezen",url:"https://example.test/")
            item.avatar="https://zacht-papier.invalid/nos.jpg"
            let imageURL=URL(string:"https://zacht-papier.invalid/foto.webp")!
            // De werkelijke loader moet het vastgelegde beeld kunnen laden; geen getekende vervanger.
            let loader=RemoteImageLoader();await loader.load(imageURL);XCTAssertNotNil(loader.image)
            let page=VStack(alignment:.leading,spacing:Space.s5) {
                Text("Stroom").font(Theme.headline(.largeTitle)).foregroundStyle(Theme.ink)
                HStack(spacing:Space.s3) {SourceMark(item:item);Text("NOS").foregroundStyle(Theme.ink)}
                Text(item.title).font(Theme.headline(.title)).foregroundStyle(Theme.ink)
                FramedImage(url:imageURL).frame(height:200)
                Text("Een foto behoudt zijn oorspronkelijke kleuren. Het bronlogo blijft herkenbaar op wit.").foregroundStyle(Theme.ink2)
                Spacer()
            }.padding(Space.s4).frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.topLeading).background(Theme.paper)
                .environment(\.nachtActief,night).environment(\.colorScheme,scheme)
            let (imageWindow,imageHost)=show(page,scene:scene,scheme:scheme,night:night)
            try await Task.sleep(for:.milliseconds(700))
            let shotImage=UIGraphicsImageRenderer(size:imageHost.view.bounds.size).image {_ in imageHost.view.drawHierarchy(in:imageHost.view.bounds,afterScreenUpdates:true)}
            attach(shotImage,"ios-foto-logo-"+name)
            imageWindow.isHidden=true
        }
    }
    private func show<V:View>(_ content:V,scene:UIWindowScene,scheme:ColorScheme,night:Bool)->(UIWindow,UIHostingController<V>) {
        let host=UIHostingController(rootView:content),window=UIWindow(windowScene:scene)
        window.frame=CGRect(x:0,y:0,width:390,height:844)
        window.overrideUserInterfaceStyle=scheme == .dark ? .dark : .light
        window.traitOverrides[NachtTrait.self]=night
        window.rootViewController=host;window.makeKeyAndVisible()
        host.view.frame=window.bounds;host.view.setNeedsLayout();host.view.layoutIfNeeded()
        return(window,host)
    }
    private func findWeb(_ view:UIView)->WKWebView? {if let web=view as? WKWebView {return web};return view.subviews.lazy.compactMap{self.findWeb($0)}.first}
    private func snapshot(_ web:WKWebView) async throws -> UIImage {
        try await withCheckedThrowingContinuation { continuation in web.takeSnapshot(with:nil) { image,error in
            if let image {continuation.resume(returning:image)} else {continuation.resume(throwing:error ?? NSError(domain:"ReaderSnapshot",code:1))}
        }}
    }
    private func attach(_ image:UIImage,_ name:String) {let a=XCTAttachment(image:image);a.name=name;a.lifetime = .keepAlways;add(a)}
    private func luminance(_ image:UIImage) throws -> Double {
        let cg=try XCTUnwrap(image.cgImage),w=64,h=128
        var pixels=[UInt8](repeating:0,count:w*h*4)
        let ctx=try XCTUnwrap(CGContext(data:&pixels,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue))
        ctx.draw(cg,in:CGRect(x:0,y:0,width:w,height:h))
        func lin(_ n:UInt8)->Double {let s=Double(n)/255;return s<=0.04045 ? s/12.92 : pow((s+0.055)/1.055,2.4)}
        return stride(from:0,to:pixels.count,by:4).reduce(0.0){$0+0.2126*lin(pixels[$1])+0.7152*lin(pixels[$1+1])+0.0722*lin(pixels[$1+2])}/Double(w*h)
    }
}
