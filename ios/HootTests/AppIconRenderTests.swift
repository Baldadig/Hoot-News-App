import XCTest
import SwiftUI
@testable import Hoot

@MainActor final class AppIconRenderTests: XCTestCase {
    func testPickerAtNormalAndLargeText() async throws {
        let scene=try XCTUnwrap(UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.first)
        let old=scene.windows.first(where: \.isKeyWindow)
        defer {old?.makeKey()}
        for (name,scheme,night,size) in [("licht",ColorScheme.light,false,DynamicTypeSize.large),("donker",.dark,false,.large),("nacht",.dark,true,.large),("xxxl",.light,false,.xxxLarge),("ax5",.dark,true,.accessibility5)] {
            let content=NavigationStack {AppIconPicker()}.environment(\.colorScheme,scheme).environment(\.nachtActief,night).environment(\.dynamicTypeSize,size)
            let host=UIHostingController(rootView:content),window=UIWindow(windowScene:scene)
            window.frame=CGRect(x:0,y:0,width:390,height:844);window.rootViewController=host
            window.overrideUserInterfaceStyle=scheme == .dark ? .dark : .light
            window.traitOverrides[NachtTrait.self]=night
            window.makeKeyAndVisible();host.view.layoutIfNeeded()
            try await Task.sleep(for:.milliseconds(500))
            let image=UIGraphicsImageRenderer(size:host.view.bounds.size).image {_ in host.view.drawHierarchy(in:host.view.bounds,afterScreenUpdates:true)}
            let attachment=XCTAttachment(image:image);attachment.name="ios-appicoon-"+name;attachment.lifetime = .keepAlways;add(attachment)
            window.isHidden=true
        }
    }
    func testActualIOSAlternateIconsAndRestorePrimary() async throws {
        // Deze systeemproef is los van de keuzelogica. Een Simulator zonder actieve app
        // of zonder callback is geen bewijs dat een beginschermicoon is veranderd.
        guard ProcessInfo.processInfo.environment["HOOT_ICON_SYSTEM_PROOF"] == "1" else {
            throw XCTSkip("Losse, begrensde systeemproef; zie verslag appicoon-keuze")
        }
        XCTAssertTrue(UIApplication.shared.supportsAlternateIcons)
        XCTAssertEqual(UIApplication.shared.applicationState,.active)
        let system=UIKitAppIconSystem()
        for choice in [AppIconChoice.roomy,.paper,.black,.red] {
            try await system.change(to:choice.iconName)
            XCTAssertEqual(UIApplication.shared.alternateIconName,choice.iconName)
            print("IOS_ICON_PROOF=\(choice.rawValue):\(UIApplication.shared.alternateIconName ?? "primary")")
        }
    }
}
