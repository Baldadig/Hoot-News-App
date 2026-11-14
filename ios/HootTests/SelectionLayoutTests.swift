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

    // Selectie-index B: gelijk aan selectionOverview in src/lib/selection-index.js (tests/selectie-index.test.mjs).
    func testOverviewOrdersEmptyFieldsLastAndNeverSaysZero() {
        func field(_ id:String,_ label:String,_ n:Int)->DigestField {
            DigestField(id:id,label:label,top:(0..<n).map { i in DigestItem(id:"\(id)\(i)",source:"s",title:"t",url:"https://example.nl") },more:[])
        }
        let full=SelectionOverview([field("foto","Fotografie",0),field("ux","UI/UX",3),field("ai","AI",2)],offered:["ux","ai","foto"])
        XCTAssertEqual(full.state, .full)
        XCTAssertEqual(full.fields.map(\.id),["ux","ai","foto"])
        XCTAssertEqual(full.summary,"5 stukken in 2 onderwerpen")
        XCTAssertEqual(SelectionOverview.pieces(0),"Nog geen stukken")
        let empty=SelectionOverview([field("foto","Fotografie",0),field("gaming","Games",0)],offered:["foto","gaming"])
        XCTAssertEqual(empty.state, .empty)
        XCTAssertEqual(empty.names,"Fotografie en Games")
        XCTAssertFalse(empty.unoffered)
        // "Tot dan verbergen." (14 november): een onderwerp buiten de weekbundel staat er niet, zoals op het web.
        let half=SelectionOverview([field("foto","Fotografie",0),field("gaming","Games",0)],offered:["gaming"])
        XCTAssertEqual(half.names,"Games")
        XCTAssertFalse(half.unoffered)
        let vol=SelectionOverview([field("ux","UI/UX",2),field("nieuw","Nieuw",0)],offered:["ux"])
        XCTAssertEqual(vol.fields.map(\.id),["ux"])
        XCTAssertTrue(SelectionOverview([field("foto","Fotografie",0)],offered:[]).unoffered)
        XCTAssertEqual(SelectionOverview.join(["AI","Fotografie","Games"]),"AI, Fotografie en Games")
    }
}
private struct ClosedSectionProbe: View {
    let field:DigestField
    @AccessibilityFocusState private var focus:String?
    @FocusState private var keyboardFocus:String?
    var body:some View {FieldSection(field:field,expanded:false,focus:$focus,keyboardFocus:$keyboardFocus,toggle:{})}
}
