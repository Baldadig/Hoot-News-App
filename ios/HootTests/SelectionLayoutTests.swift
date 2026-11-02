import XCTest
import SwiftUI
@testable import Hoot

@MainActor
final class SelectionLayoutTests: XCTestCase {
    func testActualClosedHeadersAtLargeXXXLAndAX5() async {
        for (name,size,width) in [("Large",DynamicTypeSize.large,358.0),("XXXL",.xxxLarge,358.0),("AX5",.accessibility5,358.0),("iPad",.large,760.0)] {
            let field=DigestField(id:"leiderschap",label:"Leiderschap & management",about:"Leidinggeven, organisaties en strategie",top:[],more:[])
            let probe=ClosedSectionProbe(field:field).dynamicTypeSize(size).environment(\.colorScheme,.light)
            let root=UIHostingController(rootView:probe.fixedSize(horizontal:false,vertical:true).padding(16).background(Theme.paper).ignoresSafeArea())
            let window=UIWindow(frame:CGRect(x:0,y:0,width:width+32,height:2000))
            window.rootViewController=root; window.isHidden=false
            root.view.frame=window.bounds
            await Task.yield()
            root.view.setNeedsLayout();root.view.layoutIfNeeded()
            let measured=root.sizeThatFits(in:CGSize(width:width+32,height:10000))
            XCTAssertTrue(measured.height.isFinite);XCTAssertGreaterThanOrEqual(measured.height,44)
            window.frame.size.height=ceil(measured.height)
            root.view.frame=window.bounds
            root.view.setNeedsLayout();root.view.layoutIfNeeded()
            let image=UIGraphicsImageRenderer(size:window.bounds.size).image { _ in
                root.view.drawHierarchy(in:window.bounds,afterScreenUpdates:true)
            }
            let a=XCTAttachment(image:image);a.name="selectie-kop-"+name;a.lifetime = .keepAlways;add(a)
            window.isHidden=true
        }
    }
}
private struct ClosedSectionProbe: View {
    let field:DigestField
    @AccessibilityFocusState private var focus:String?
    @FocusState private var keyboardFocus:String?
    var body:some View {FieldSection(field:field,icon:"person.3",expanded:false,focus:$focus,keyboardFocus:$keyboardFocus,toggle:{})}
}
