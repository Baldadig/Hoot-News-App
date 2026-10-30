import Observation
import SwiftUI
import UserNotifications
import os

// Een seintje als een nieuwe Editie klaarligt: lokaal gepland, zonder server en zonder pushdienst.
// De tijden liggen vast (drie per dag, Amsterdamse tijd) en de Editie ligt er zo'n 20 seconden na
// het hele uur; het seintje komt een paar minuten later, zodat hij er ook ligt als de server een
// tik mist. Stil: geen geluid, geen badge, en Focus gaat voor (geen "tijdgevoelig").
//
// Plannen: losse momenten voor de rest van vandaag en zeven dagen erna (hooguit 24 van de 64 die
// iOS toestaat), elke keer opnieuw als je de app opent. Geen herhalende trigger: die volgt de
// tijdzone van het toestel, en in het buitenland klopt het uur dan niet meer. Kom je een week niet
// in Hoot, dan stopt het vanzelf.
//
// Alleen op dit toestel: toestemming geldt per toestel, en met iPhone én iPad zou je anders twee
// keer een seintje krijgen.
@MainActor
@Observable
final class EditionAlerts {
    static let shared = EditionAlerts()

    // Gelijk aan editionSlot() in netlify/lib/stories.mjs (06:00, 12:00 en 17:00 in Amsterdam).
    // `hour` is alleen om te plannen: in teksten staan geen kloktijden, alleen dagdelen.
    struct Slot: Identifiable {
        let id: String // ochtend | middag | avond, zoals `Edition.slot`
        let hour: Int
        let name: String // de naam van de Editie, zoals overal in de app
        let short: String // "Ochtend": bij heel grote tekst, met "Editie" eronder
        let icon: String
        let title: String
        let body: String
    }
    static let slots = [
        Slot(id: "ochtend", hour: 6, name: "Ochtendeditie", short: "Ochtend", icon: "sunrise", title: "Je Ochtendeditie ligt klaar", body: "Het nieuws van de nacht, rustig op een rij."),
        Slot(id: "middag", hour: 12, name: "Middageditie", short: "Middag", icon: "sun.max", title: "Je Middageditie ligt klaar", body: "Wat er sinds vanochtend gebeurde, op een rij."),
        Slot(id: "avond", hour: 17, name: "Avondeditie", short: "Avond", icon: "sunset", title: "Je Avondeditie ligt klaar", body: "De dag op een rij, voor wanneer het jou uitkomt."),
    ]
    private static let delay = 3 // minuten na het hele uur
    private static let days = 7
    private static var amsterdam: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = HootDate.amsterdam
        return c
    }

    // Wat iOS van Hoot toestaat. `.notDetermined` tot iemand ja of nee zei.
    private(set) var permission: UNAuthorizationStatus = .notDetermined
    var allowed: Bool { [.authorized, .provisional, .ephemeral].contains(permission) }

    // Tikken op een seintje: de Editie openen (RootView kijkt hiernaar). Ook bij een koude start,
    // als RootView er nog niet is: dan bij het verschijnen.
    var openEdition = false
    // Een seintje terwijl de app open is: geen banner, wel stil verversen (HootApp).
    private(set) var arrived = 0
    func arrivedNow() { arrived &+= 1 }

    private let center = UNUserNotificationCenter.current()
    private static let log = Logger(subsystem: "nl.hootnews.Hoot", category: "seintje")

    func refresh() async {
        permission = await center.notificationSettings().authorizationStatus
    }

    // De systeemvraag, pas als iemand zelf "ja" zegt. Alleen meldingen: geen geluid, geen badge.
    func ask() async -> Bool {
        let yes = (try? await center.requestAuthorization(options: [.alert])) ?? false
        await refresh()
        return yes
    }

    // Eén planning tegelijk: een nieuwe breekt de vorige af en wacht tot die gestopt is. Zo komt er
    // nooit een oude ronde achteraan die weer seintjes zet, en wint uitzetten altijd.
    private var planning: Task<Void, Never>?

    // Alles opnieuw plannen: weg wat er stond, en wat je zag verdwijnt uit het berichtencentrum.
    // `shown` is de Editie die de app al heeft ("2026-10-31-ochtend"): daar komt geen seintje meer voor.
    func plan(on: Bool, slots chosen: [String], shown: String?) async {
        let previous = planning
        previous?.cancel()
        let task = Task {
            await previous?.value
            guard !Task.isCancelled else { return }
            await replan(on: on, slots: chosen, shown: shown)
        }
        planning = task
        await task.value
    }

    private func replan(on: Bool, slots chosen: [String], shown: String?) async {
        #if DEBUG
        // Opnamen op een tabblad (zonder `-HootOnboarded`): niets aanraken, ook niet wat er al gepland stond.
        if UserDefaults.standard.string(forKey: "HootStartTab") != nil, !UserDefaults.standard.bool(forKey: "HootOnboarded") { return }
        #endif
        await refresh()
        center.removeAllDeliveredNotifications()
        let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix("editie-") }
        center.removePendingNotificationRequests(withIdentifiers: pending)
        #if DEBUG
        await planTest()
        #endif
        guard on, allowed, !Task.isCancelled else { return }

        let amsterdam = Self.amsterdam
        let now = Date.now
        let today = amsterdam.startOfDay(for: now)
        var planned = 0
        for day in 0...Self.days { // vandaag plus zeven hele dagen
            guard let date = amsterdam.date(byAdding: .day, value: day, to: today) else { continue }
            for slot in Self.slots where chosen.contains(slot.id) {
                guard let at = amsterdam.date(bySettingHour: slot.hour, minute: Self.delay, second: 0, of: date), at.timeIntervalSince(now) > 30 else { continue }
                let d = amsterdam.dateComponents([.year, .month, .day], from: at)
                let id = String(format: "editie-%04d-%02d-%02d-%@", d.year ?? 0, d.month ?? 0, d.day ?? 0, slot.id) // editie-2026-10-31-ochtend
                // Ligt deze Editie al in de app, dan geen seintje: niets melden wat je al ziet.
                if let shown, id == "editie-\(shown)" { continue }
                guard !Task.isCancelled else { return }
                // Een interval in plaats van een kalendermoment: dat blijft hetzelfde absolute moment,
                // ook als je onderweg van tijdzone wisselt.
                let trigger = UNTimeIntervalNotificationTrigger(timeInterval: at.timeIntervalSince(now), repeats: false)
                try? await center.add(UNNotificationRequest(identifier: id, content: Self.content(slot), trigger: trigger))
                planned += 1
            }
        }
        Self.log.info("\(planned) seintjes gepland")
    }

    private static func content(_ slot: Slot) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = slot.title
        c.body = slot.body
        c.sound = nil
        c.interruptionLevel = .active
        c.relevanceScore = 0.5
        c.threadIdentifier = "hoot.editie" // alle seintjes op één stapel
        c.userInfo = ["hoot": "editie"]
        return c
    }

    #if DEBUG
    // `-HootNotifyIn 15`: één echt seintje over 15 seconden (dat van het volgende dagdeel), één keer per start.
    private var tested = false
    private func planTest() async {
        let seconds = UserDefaults.standard.double(forKey: "HootNotifyIn")
        guard seconds > 0, !tested, allowed else { return }
        tested = true
        let hour = Calendar.current.component(.hour, from: .now)
        let slot = Self.slots.first { $0.hour > hour } ?? Self.slots[0]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
        try? await center.add(UNNotificationRequest(identifier: "proef-\(slot.id)", content: Self.content(slot), trigger: trigger))
        Self.log.info("proefseintje over \(seconds) s")
    }
    #endif
}

// Het systeem meldt seintjes hier, ook bij een koude start: daarom zet de app-delegate zich bij
// het opstarten meteen als delegate, nog vóór de eerste scène.
final class HootAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // De app is open: geen banner (je zit er al), wel de nieuwe Editie ophalen.
    // Met de completion handlers, niet de async-varianten: die roepen hem vanaf een achtergronddraad
    // aan, en bij een tik op het seintje liep UIKit daar op vast (een assert, de app viel om).
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let ours = notification.request.content.userInfo["hoot"] as? String == "editie"
        nonisolated(unsafe) let done = completionHandler
        DispatchQueue.main.async {
            if ours { EditionAlerts.shared.arrivedNow() }
            done(ours ? [] : [.banner, .list])
        }
    }

    // Getikt op het seintje: naar de Editie.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let ours = response.notification.request.content.userInfo["hoot"] as? String == "editie"
        nonisolated(unsafe) let done = completionHandler
        DispatchQueue.main.async {
            if ours { EditionAlerts.shared.openEdition = true }
            done()
        }
    }
}
