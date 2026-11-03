import XCTest
import SwiftUI
@testable import Hoot

@MainActor @Observable private final class RubriekProef {
    var selected="tech"
    var frames:[CGRect]=[]
}
@MainActor final class RubriekWisselRenderTests:XCTestCase {
    func testActualTransitionPanelThemesRapidSwitchAndReducedMotion() async throws {
        let scene=try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.first)
        let old=scene.windows.first(where: \.isKeyWindow);defer {old?.makeKey()}
        let imagePath=URL(fileURLWithPath:#filePath).deletingLastPathComponent().appending(path:"Fixtures/rubriek-foto.webp")
        let image=try XCTUnwrap(UIImage(contentsOfFile:imagePath.path))
        for (name,scheme,night,reduced) in [("licht",ColorScheme.light,false,false),("donker",.dark,false,false),("nacht",.dark,true,false),("verminder-beweging",.light,false,true)] {
            let model=RubriekProef()
            let content=RubriekProefView(model:model,image:image,reduced:reduced).environment(\.colorScheme,scheme).environment(\.nachtActief,night)
            let host=UIHostingController(rootView:content),window=UIWindow(windowScene:scene)
            window.frame=CGRect(x:0,y:0,width:390,height:844);window.rootViewController=host
            window.overrideUserInterfaceStyle=scheme == .dark ? .dark : .light;window.traitOverrides[NachtTrait.self]=night
            window.makeKeyAndVisible();host.view.layoutIfNeeded()
            try await Task.sleep(for:.milliseconds(250));capture(host,"ios-\(name)-voor")
            model.selected="binnenland"
            try await Task.sleep(for:.milliseconds(100));capture(host,"ios-\(name)-tijdens")
            model.selected="tech";model.selected="binnenland" // laatste keuze wint; geen blijvend oud vlak
            try await Task.sleep(for:.milliseconds(250));capture(host,"ios-\(name)-na")
            XCTAssertEqual(model.selected,"binnenland")
            XCTAssertFalse(model.frames.isEmpty)
            if let first=model.frames.first {for frame in model.frames {XCTAssertEqual(frame.minY,first.minY,accuracy:0.5);XCTAssertEqual(frame.height,first.height,accuracy:0.5)}}
            window.isHidden=true
        }
    }
    private func capture<V:View>(_ host:UIHostingController<V>,_ name:String){let image=UIGraphicsImageRenderer(size:host.view.bounds.size).image {_ in host.view.drawHierarchy(in:host.view.bounds,afterScreenUpdates:true)};let attachment=XCTAttachment(image:image);attachment.name=name;attachment.lifetime = .keepAlways;add(attachment)}
}
private struct RubriekProefView:View {
    let model:RubriekProef
    let image:UIImage
    let reduced:Bool
    var body:some View {
        VStack(alignment:.leading,spacing:Space.s4){
            Text("Stroom").font(Theme.headline(.largeTitle)).foregroundStyle(Theme.ink)
            Text(model.selected == "tech" ? "Tech" : "Binnenland").foregroundStyle(Theme.accent)
            RubriekVlak(id:model.selected,minimumHeight:600,reduceMotion:reduced){
                VStack(alignment:.leading,spacing:Space.s4){
                    Text(model.selected == "tech" ? "Nieuwe inzichten maken onderzoek toegankelijk" : "Een groene buurt begint met kleine ingrepen").font(Theme.headline(.title)).foregroundStyle(Theme.ink)
                    Image(uiImage:image).resizable().scaledToFill().frame(height:200).clipped()
                    Text("Beeld en tekst wisselen samen, zonder verticale beweging.").foregroundStyle(Theme.ink2)
                }.frame(maxWidth:.infinity,alignment:.topLeading)
            }.onGeometryChange(for:CGRect.self){$0.frame(in:.global)}action:{model.frames.append($0)}
            Spacer(minLength:0)
        }.padding(Space.s4).frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.topLeading).background(Theme.paper)
    }
}
