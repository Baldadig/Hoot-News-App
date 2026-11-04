import XCTest
import SwiftUI
@testable import Hoot

@MainActor final class AppIconChoiceTests: XCTestCase {
    final class System: AppIconSystem {
        var supported = true
        var currentName: String?
        var failure = false
        var requests: [String?] = []
        var gate: CheckedContinuation<Void, Never>?
        var suspend = false
        func change(to name: String?) async throws {
            requests.append(name)
            if suspend { await withCheckedContinuation { gate = $0 } }
            if failure { throw NSError(domain:"Icoonproef",code:1) }
            currentName = name
        }
    }
    func testDefaultRestoreAndReopeningUseIOSAsTruth() async {
        let system=System(),selection=AppIconSelection(system:system)
        XCTAssertEqual(selection.selected,.red)
        await selection.choose(.paper)
        XCTAssertEqual(selection.selected,.paper)
        XCTAssertEqual(AppIconSelection(system:system).selected,.paper)
        await selection.choose(.red)
        XCTAssertNil(system.currentName);XCTAssertEqual(selection.selected,.red)
        XCTAssertEqual(system.requests.count,2)
        await selection.choose(.red);XCTAssertEqual(system.requests.count,2)
        system.currentName="OnbekendIcoon";selection.refresh();XCTAssertNil(selection.selected)
    }
    func testFailureAndUnsupportedKeepActualChoice() async {
        let system=System();system.currentName=AppIconChoice.black.iconName
        let selection=AppIconSelection(system:system)
        system.failure=true;await selection.choose(.red)
        XCTAssertEqual(selection.selected,.black);XCTAssertNotNil(selection.error);XCTAssertFalse(selection.busy)
        system.supported=false;await selection.choose(.paper)
        XCTAssertEqual(system.requests.count,1);XCTAssertEqual(selection.selected,.black)
    }
    func testBusyCannotStartSecondRequestOrShowFalseCheckmark() async {
        let system=System();system.suspend=true
        let selection=AppIconSelection(system:system)
        let first=Task { await selection.choose(.roomy) }
        for _ in 0..<20 { if system.gate != nil {break};await Task.yield() }
        XCTAssertTrue(selection.busy);XCTAssertEqual(selection.selected,.red)
        await selection.choose(.black);XCTAssertEqual(system.requests.count,1)
        system.gate?.resume();await first.value
        XCTAssertEqual(selection.selected,.roomy);XCTAssertFalse(selection.busy)
    }
    func testBuiltBundleIncludesAllIconsAndPreviews() {
        let icons=Bundle.main.infoDictionary?["CFBundleIcons"] as? [String:Any]
        let alternates=icons?["CFBundleAlternateIcons"] as? [String:Any]
        XCTAssertEqual(Set(alternates?.keys.map{$0} ?? []),Set(AppIconChoice.allCases.compactMap(\.iconName)))
        for choice in AppIconChoice.allCases { XCTAssertNotNil(UIImage(named:choice.asset)) }
    }
}
