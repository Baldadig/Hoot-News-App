import XCTest
import SwiftUI
import WebKit
@testable import Hoot

// Werkelijke views op een opgegeven viewport. Dit is renderbewijs, geen native klikacceptatie.
@MainActor final class NachtRenderTests: XCTestCase {
    func testScreensAndAutomaticVariants() async throws {
        let store=HootStore(),account=Account(),reader=Reader()
        await store.load()
        await store.loadDigest()
        let oldImages=store.images
        defer {store.images=oldImages}
        store.images="uit" // foto-onafhankelijke kleurmeting; webbeelden toetsen foto's afzonderlijk.
        let suite="hoot-night-render-"+UUID().uuidString,defaults=UserDefaults(suiteName:suite)!
        defer { defaults.removePersistentDomain(forName:suite) }
        let modes:[(String,String,String,ColorScheme)] = [("licht","light","dark",.light),("donker","dark","dark",.dark),("nacht","night","dark",.dark),("auto-licht","system","night",.light),("auto-donker","system","dark",.dark),("auto-nacht","system","night",.dark)]
        for (name,value,evening,scheme) in modes {
            defaults.set(value,forKey:"hoot.weergave");defaults.set(evening,forKey:"hoot.weergave.donker")
            let item=Item(id:"nacht-lezer",source:"nos",title:"Een rustige bladzijde",url:"https://nos.nl/")
            let article=Article(title:item.title,content:"<p>Lees het verhaal in de kleuren van Hoot. Ook bij laden en doorschuiven blijft de achtergrond rustig.</p><p><a href='https://nos.nl/'>Meer bij de uitgever</a></p>",length:400)
            let html=ReaderHTML.page(article,item:item,sourceName:"NOS",size:1,night:value == "night" || (value == "system" && scheme == .dark && evening == "night"))
            let views:[(String,AnyView)] = [("editie",AnyView(EditionView())),("stroom",AnyView(StreamView())),("selectie",AnyView(DigestView())),("instellingen",AnyView(SettingsView())),("onboarding",AnyView(WelcomeView(onDone:{}))), ("laden",AnyView(WaitingMark().frame(maxWidth:.infinity,maxHeight:.infinity).background(Theme.paper))), ("keuze",AnyView(Form{Section{WeergaveKeuze()}.hootRows()}.hootForm())), ("lezer-html",AnyView(ArticleWebView(html:html,baseURL:nil))), ("account",AnyView(AccountView()))]
            for (screen,view) in views {
                let content=view.environment(store).environment(account).environment(reader).environment(EditionAlerts.shared).tint(Theme.ink).toggleStyle(InkSwitch())
                    .environment(\.colorScheme,scheme).modifier(HootWeergave()).defaultAppStorage(defaults)
                try await render(content,width:390,height:844,scheme:scheme,name:"ios-\(screen)-\(name)")
            }
            if ["licht","donker","nacht"].contains(name) {
                for (w,h,orientation) in [(744.0,1133.0,"staand"),(1133.0,744.0,"liggend")] {
                    for (screen,view) in [("editie",AnyView(WidthReader {EditionView()})),("instellingen",AnyView(SettingsView()))] {
                        let content=view.environment(store).environment(account).environment(reader).environment(EditionAlerts.shared).tint(Theme.ink).toggleStyle(InkSwitch()).environment(\.colorScheme,scheme).modifier(HootWeergave()).defaultAppStorage(defaults)
                        try await render(content,width:w,height:h,scheme:scheme,name:"ipad-\(screen)-\(orientation)-\(name)")
                    }
                }
            }
        }
        defaults.set("night",forKey:"hoot.weergave")
        for (label,size) in [("xxxl",DynamicTypeSize.xxxLarge),("ax5",DynamicTypeSize.accessibility5)] {
            let content=Form{Section{WeergaveKeuze()}.hootRows()}.hootForm().environment(\.dynamicTypeSize,size).modifier(HootWeergave()).defaultAppStorage(defaults)
            try await render(content,width:390,height:844,scheme:.dark,name:"ios-keuze-nacht-\(label)")
        }
    }
    func testEndcards() async throws {
        let store=HootStore(),account=Account(),reader=Reader()
        await store.load()
        let suite="hoot-night-details-"+UUID().uuidString,defaults=UserDefaults(suiteName:suite)!
        let oldScroll=UserDefaults.standard.object(forKey:"HootScroll")
        defer {defaults.removePersistentDomain(forName:suite);if let oldScroll {UserDefaults.standard.set(oldScroll,forKey:"HootScroll")}else{UserDefaults.standard.removeObject(forKey:"HootScroll")}}
        let modes:[(String,String,String,ColorScheme)] = [("licht","light","dark",.light),("donker","dark","dark",.dark),("nacht","night","dark",.dark),("auto-licht","system","night",.light),("auto-donker","system","dark",.dark),("auto-nacht","system","night",.dark)]
        for (name,value,evening,scheme) in modes {
            defaults.set(value,forKey:"hoot.weergave");defaults.set(evening,forKey:"hoot.weergave.donker")
            UserDefaults.standard.set("onder",forKey:"HootScroll")
            let end=EditionView().environment(store).environment(account).environment(reader).environment(EditionAlerts.shared).environment(\.colorScheme,scheme).modifier(HootWeergave()).defaultAppStorage(defaults)
            try await render(end,width:390,height:844,scheme:scheme,name:"ios-eindkaart-"+name,settle:2200)
        }
    }
    private func render<V:View>(_ content:V,width:Double,height:Double,scheme:ColorScheme,name:String,settle:Int=1400) async throws {
        let host=UIHostingController(rootView:content)
        host.overrideUserInterfaceStyle=scheme == .dark ? .dark : .light
        host.view.frame=CGRect(x:0,y:0,width:width,height:height)
        let window=UIWindow(frame:host.view.frame);window.rootViewController=host;window.isHidden=false
        host.view.setNeedsLayout();host.view.layoutIfNeeded()
        try await Task.sleep(for:.milliseconds(settle))
        let image=UIGraphicsImageRenderer(size:host.view.bounds.size).image {_ in host.view.drawHierarchy(in:host.view.bounds,afterScreenUpdates:true)}
        let attachment=XCTAttachment(image:image);attachment.name=name;attachment.lifetime = .keepAlways;add(attachment)
        window.isHidden=true
    }
}
