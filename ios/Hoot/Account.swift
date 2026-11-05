import AuthenticationServices
import CryptoKit
import Foundation
import Observation
import Security
import UIKit
import os

// Je Hoot-account: hetzelfde als op gethoot.app/lees (Supabase), zodat je editie, je bronnen en Bewaard
// overal gelijk zijn. Inloggen met Google of Apple; een account is er voor iedereen, net als op de website.
//
// Synchroniseren in het kort (de website doet hetzelfde, zie src/lib/syncEngine.js):
// - Van wie is wat hier staat? `hoot.owner`: niemand (anoniem) of een gebruikers-id. Anonieme
//   gegevens gaan bij het inloggen op in je account; die van een ánder account nooit.
// - Je instellingen: wat je account heeft, gaat voor; behalve als je hier iets veranderde dat nog
//   niet weggeschreven is (`dirty`). Gelezen: alles van beide kanten. Bewaard: per stuk, met wat de
//   server de vorige keer had als basis, zodat ook verwijderen meegaat.
@MainActor
@Observable
final class Account {
    // Alleen via de lokale bouwopdracht; nooit onderdeel van de officiële projectinstellingen.
    static var localBeta: Bool {
        #if HOOT_LOCAL_BETA
        true
        #else
        false
        #endif
    }

    // pending: ingelogd, maar je profiel ontbreekt nog (zie resolve). Dan synchroniseert er niets.
    enum Status: Equatable { case out, loading, member, pending }
    enum SyncState: Equatable { case idle, syncing, ok, failed }

    private(set) var status: Status
    private(set) var sync: SyncState = .idle
    private(set) var syncedAt: Date?
    private(set) var session: Session?
    var message: String? // wat er misging, in gewone woorden
    // Hoot uit je Apple ID halen lukte niet bij het verwijderen: je account bestaat nog en de
    // pagina vraagt Opnieuw of Toch verwijderen. Nooit stil wissen.
    private(set) var appleFailed = false

    private weak var store: HootStore?
    // Ook opnieuw inloggen als dezelfde gebruiker is een nieuwe sessie. Oude antwoorden,
    // fouten en defer-blokken mogen daar niets meer aan veranderen.
    private var generation: UInt64 = 0
    private func current(_ version: UInt64, _ uid: String?) -> Bool {
        generation == version && session?.uid == uid
    }
    private func invalidateWork() {
        generation &+= 1
        pushTask?.cancel()
        refreshing = nil // een transport mag nog antwoorden; de generatieguard beslist
        busy = false
        again = false
        pulled = false
        remoteEdition = nil
        syncedAt = nil
        sync = .idle
    }

    struct Session: Codable {
        var access: String
        var refresh: String
        var expires: Date
        var uid: String
        var email: String?
        var name: String?
        var avatar: String? = nil // de profielfoto van Google (user_metadata avatar_url/picture); alleen https
    }

    // De profielfoto uit user_metadata: avatar_url (Supabase) of picture (Google), alleen een https-adres.
    nonisolated static func avatar(from meta: [String: Any]?) -> String? {
        guard let raw = (meta?["avatar_url"] ?? meta?["picture"]) as? String,
              let url = URL(string: raw.trimmingCharacters(in: .whitespaces)), url.scheme == "https", url.host != nil else { return nil }
        return url.absoluteString
    }

    init() {
        let kept: Session? = Self.localBeta ? nil : Keychain.read()
        session = kept
        status = kept == nil ? .out : .loading
    }

    // Jouw gebruikers-id als lid: de eigenaar van je Editie. Anders niets (dan is die van "anon").
    var uid: String? { status == .member ? session?.uid : nil }
    // Eén geslaagde sync-pull gedaan: pas daarna stelt de app jouw Editie samen (bouwspec-aanvulling
    // P8-2), anders rekent een vers toestel met instellingen die je account nog niet gaf.
    private(set) var pulled = false
    // Jouw Editie zoals je account hem bij de laatste pull had (user_state.edition, met `history`): de
    // kandidaat voor (b) in HootStore.loadPersonal als een verse lezing niet lukt.
    private(set) var remoteEdition: [String: Any]?
    // Waarlangs de verzoeken gaan. De tests (HootTests) zetten hier een URLSession met een nep-URLProtocol.
    var transport: URLSession = .shared

    #if DEBUG
    // Voor de tests: een nepsessie als lid, zonder Keychain en zonder netwerk (de `transport` bepaalt wat
    // de "server" antwoordt). Alleen in Debug.
    func stub(uid: String, transport: URLSession, expires: Date = .distantFuture) {
        invalidateWork()
        session = Session(access: "test", refresh: "test", expires: expires, uid: uid, email: nil, name: nil)
        status = .member
        self.transport = transport
    }
    #endif

    func start(_ store: HootStore) async {
        self.store = store
        store.account = self
        guard !Self.localBeta else { return }
        if session != nil { await resolve() }
    }

    // ---- Inloggen met Google ----
    // De app-client van Google (type iOS, bundel nl.hootnews.Hoot) met PKCE: geen geheim in de app.
    // Google geeft een id-token; dat wisselt Supabase in voor een sessie, net als op de website.
    struct GoogleRequest { let url: URL; let scheme: String; fileprivate let verifier, nonce, state, redirect: String; fileprivate let generation: UInt64 }

    func googleRequest() -> GoogleRequest {
        let verifier = Self.random(32)
        let nonce = Self.random(16)
        let state = Self.random(16)
        let scheme = HootConfig.googleScheme
        let redirect = "\(scheme):/oauthredirect"
        var c = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        c.queryItems = [
            .init(name: "client_id", value: HootConfig.googleClientID),
            .init(name: "redirect_uri", value: redirect),
            .init(name: "response_type", value: "code"),
            .init(name: "scope", value: "openid email profile"),
            .init(name: "code_challenge", value: Self.base64url(Data(SHA256.hash(data: Data(verifier.utf8))))),
            .init(name: "code_challenge_method", value: "S256"),
            .init(name: "nonce", value: Self.sha256(nonce)),
            .init(name: "state", value: state),
            .init(name: "prompt", value: "select_account"),
        ]
        return GoogleRequest(url: c.url!, scheme: scheme, verifier: verifier, nonce: nonce, state: state, redirect: redirect, generation: generation)
    }

    func finishGoogle(_ request: GoogleRequest, callback: URL) async {
        guard !Self.localBeta else { return }
        guard request.generation == generation else { return }
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard items.first(where: { $0.name == "state" })?.value == request.state,
              let code = items.first(where: { $0.name == "code" })?.value
        else {
            if items.contains(where: { $0.name == "error" }) { message = "Inloggen met Google is niet gelukt." }
            return
        }
        status = .loading
        do {
            var r = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
            r.httpMethod = "POST"
            r.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            var form = URLComponents()
            form.queryItems = [
                .init(name: "code", value: code), .init(name: "client_id", value: HootConfig.googleClientID),
                .init(name: "code_verifier", value: request.verifier), .init(name: "redirect_uri", value: request.redirect),
                .init(name: "grant_type", value: "authorization_code"),
            ]
            r.httpBody = form.percentEncodedQuery?.data(using: .utf8)
            let (data, _) = try await URLSession.shared.data(for: r)
            guard request.generation == generation else { return }
            guard let token = (try JSONSerialization.jsonObject(with: data) as? [String: Any])?["id_token"] as? String else { throw Failure.login }
            try await signIn(provider: "google", token: token, nonce: request.nonce)
        } catch {
            guard request.generation == generation else { return }
            fail("Inloggen met Google is niet gelukt.")
        }
    }

    // ---- Inloggen met Apple ----
    private var appleNonce = ""
    private var appleGeneration: UInt64?
    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        appleGeneration = generation
        appleNonce = Self.random(16)
        request.requestedScopes = [.email]
        request.nonce = Self.sha256(appleNonce)
    }
    func finishApple(_ result: Result<ASAuthorization, Error>) async {
        guard !Self.localBeta else { return }
        guard appleGeneration == generation else { return }
        let version = generation
        guard case let .success(auth) = result,
              let credential = auth.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken, let token = String(data: data, encoding: .utf8)
        else {
            // Zelf geannuleerd: geen melding.
            if case let .failure(error) = result, (error as? ASAuthorizationError)?.code != .canceled { message = "Inloggen met Apple is niet gelukt." }
            return
        }
        status = .loading
        do { try await signIn(provider: "apple", token: token, nonce: appleNonce) }
        catch { if version == generation { fail("Inloggen met Apple is niet gelukt.") } }
    }

    private func signIn(provider: String, token: String, nonce: String) async throws {
        let data = try await call("auth/v1/token?grant_type=id_token", method: "POST", body: ["provider": provider, "id_token": token, "nonce": nonce], authorized: false)
        try keep(data)
        message = nil
        await resolve()
    }

    private func fail(_ text: String) {
        message = text
        if session == nil { status = .out } else if status == .loading { status = .out }
    }

    // ---- Je profiel ----
    // Wie inlogt, krijgt in de database meteen een profiel (supabase/migrations/20261104_open_accounts.sql).
    // Ontbreekt het toch, dan één keer het vangnet rpc/join en opnieuw lezen, net als de website
    // (src/lib/membership.js). Lukt ook dat niet: `pending`, en Opnieuw op de accountpagina.
    private func resolve() async {
        guard let s = session else { status = .out; return }
        let version = generation
        do {
            var found = try await hasProfile(s.uid)
            guard current(version, s.uid) else { return }
            if !found {
                do {
                    _ = try await call("rest/v1/rpc/join", method: "POST", body: [String: String]())
                    guard current(version, s.uid) else { return }
                    found = try await hasProfile(s.uid)
                    guard current(version, s.uid) else { return }
                } catch Failure.signedOut {
                    throw Failure.signedOut
                } catch {
                    guard current(version, s.uid) else { return } // geen verbinding of geen vangnet: pending
                }
            }
            status = found ? .member : .pending
            if status == .member { await pull() }
        } catch Failure.signedOut {
            guard current(version, s.uid) else { return }
            forget()
        } catch {
            guard current(version, s.uid) else { return }
            // Geen verbinding: je bent nog steeds ingelogd; straks opnieuw. Jouw Editie wacht niet.
            if status == .loading { status = .member }
            store?.refreshPersonal()
        }
    }

    private func hasProfile(_ uid: String) async throws -> Bool {
        let data = try await call("rest/v1/profiles?select=id&id=eq.\(uid)")
        return !((try JSONSerialization.jsonObject(with: data) as? [Any]) ?? []).isEmpty
    }

    // Je account is er bijna: nog eens proberen (de knop Opnieuw).
    func retry() async {
        guard status == .pending else { return }
        await resolve()
    }

    func signOut() async {
        if Self.localBeta {
            invalidateWork()
            session = nil
            status = .out
            return // geen echte Keychain-sessie of opgeslagen keuzes wissen
        }
        let previous = session
        forget()
        if let store {
            store.forgetChoices() // wie hierna leest begint neutraal: je keuzes gaan van het toestel
            // Pas na het wissen is de lokale inhoud anoniem. Bij een verlopen sessie (forget)
            // blijft de eigenaar juist staan, zodat privégegevens niet met een ander account mengen.
            UserDefaults.standard.removeObject(forKey: "hoot.owner")
        }
        // Lokaal meteen uitgelogd. Een trage uitlogrespons kan een nieuwe login niet uitwissen.
        if let previous {
            var request = URLRequest(url: URL(string: "auth/v1/logout", relativeTo: HootConfig.supabaseURL)!)
            request.httpMethod = "POST"
            request.setValue(HootConfig.supabaseKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(previous.access)", forHTTPHeaderField: "Authorization")
            request.timeoutInterval = 20
            _ = try? await transport.data(for: request)
        }
    }

    // Account verwijderen: alles op de server weg (profiel, instellingen, Bewaard). Wat op dit
    // toestel staat, blijft. Ingelogd met Apple? Dan eerst Hoot uit je Apple ID halen (Apple eist
    // dit, richtlijn 5.1.1(v)): Apple vraagt even om een bevestiging, en met die verse code trekt
    // de server de toegang in. Daarna pas wissen.
    // - Zelf geannuleerd: niets gewist, een korte melding.
    // - Apple of de server faalt: niets gewist; `appleFailed` en de pagina vraagt Opnieuw of Toch
    //   verwijderen. Na het wissen weet niemand meer welk Apple-account het was, dus niet stil.
    // - `skipApple` (Toch verwijderen): wissen zonder intrekken, en zeggen wat je zelf nog doet.
    func deleteAccount(skipApple: Bool = false) async -> Bool {
        guard !Self.localBeta else { return false }
        let version = generation, identity = session?.uid
        appleFailed = false
        message = nil
        do {
            let apple = skipApple ? false : try await signedInWithApple()
            guard current(version, identity) else { return false }
            if apple {
                let code: String?
                do { code = try await reauth() }
                catch let error as ASAuthorizationError where error.code == .canceled {
                    guard current(version, identity) else { return false }
                    message = "Je account blijft bestaan."
                    return false
                } catch {
                    code = nil
                }
                guard current(version, identity) else { return false }
                var revoked = false
                if let code { revoked = await revokeApple(code) }
                guard current(version, identity) else { return false }
                if !revoked {
                    Self.log.error("Intrekken bij Apple mislukt; niets verwijderd")
                    appleFailed = true
                    return false
                }
            }
            guard current(version, identity) else { return false }
            _ = try await call("rest/v1/rpc/delete_my_account", method: "POST", body: [String: String]())
            guard current(version, identity) else { return false }
            forget()
            UserDefaults.standard.removeObject(forKey: "hoot.owner")
            if skipApple { message = "Je account is verwijderd. Haal Hoot nog weg in Instellingen › je naam › Inloggen en beveiliging › Inloggen met Apple." }
            return true
        } catch {
            guard current(version, identity) else { return false }
            message = "Verwijderen is niet gelukt. Probeer het opnieuw."
            return false
        }
    }

    // De melding over Apple sluiten zonder te kiezen: je account blijft bestaan.
    func dismissAppleFailure() { appleFailed = false }

    // Annuleer in die melding: niets gewist, en je hoort dat je account blijft bestaan.
    func cancelAppleFailure() {
        appleFailed = false
        message = "Je account blijft bestaan."
    }

    // Apple om een verse code vragen. De tests zetten hier een nep (zonder Apple-blad).
    var reauth: @MainActor () async throws -> String? = { try await AppleReauth().code() }

    // Hangt er een Apple-account aan dit account? Supabase weet het (ook als je Apple later koppelde).
    private func signedInWithApple() async throws -> Bool {
        let user = try JSONSerialization.jsonObject(with: try await call("auth/v1/user")) as? [String: Any]
        let providers = (user?["app_metadata"] as? [String: Any])?["providers"] as? [String] ?? []
        let identities = (user?["identities"] as? [[String: Any]] ?? []).compactMap { $0["provider"] as? String }
        return (providers + identities).contains("apple")
    }

    // Het geheim staat niet in de app: de server (api/apple-revoke) wisselt de code in en trekt het
    // token in. Geeft true als Apple het bevestigde; elke fout (ook 503: niet ingesteld) is false.
    private func revokeApple(_ code: String) async -> Bool {
        guard !Self.localBeta else { return false }
        let version = generation, identity = session?.uid
        do {
            try await refreshIfNeeded()
            guard current(version, identity) else { return false }
            guard let s = session else { return false }
            var r = URLRequest(url: HootAPI.base.appendingPathComponent("api/apple-revoke"))
            r.httpMethod = "POST"
            r.setValue("application/json", forHTTPHeaderField: "Content-Type")
            r.setValue("Bearer \(s.access)", forHTTPHeaderField: "Authorization")
            r.httpBody = try JSONSerialization.data(withJSONObject: ["code": code])
            r.timeoutInterval = 20
            let (_, response) = try await transport.data(for: r)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            if (200 ..< 300).contains(status) { return true }
            Self.log.error("Intrekken bij Apple mislukt: \(status)")
            return false
        } catch {
            Self.log.error("Intrekken bij Apple mislukt: \(error.localizedDescription)")
            return false
        }
    }

    private func forget() {
        invalidateWork()
        session = nil
        if !Self.localBeta { Keychain.delete() }
        status = .out
        sync = .idle
        pulled = false
        remoteEdition = nil
        pushTask?.cancel()
        store?.refreshPersonal() // jouw Editie is nu weer die van "anon"
        Defaults.remove(["hoot.syncDirty", "hoot.remotePrefs", "hoot.savedBase"])
        dirty = false
    }

    // ---- Synchroniseren ----
    private var dirty = UserDefaults.standard.bool(forKey: "hoot.syncDirty") {
        didSet { UserDefaults.standard.set(dirty, forKey: "hoot.syncDirty") }
    }
    private var pushTask: Task<Void, Never>?
    private var busy = false
    private var again = false // tijdens het synchroniseren werd er weer om gevraagd
    private var edits = 0 // telt elke wijziging; `dirty` gaat pas uit als er tijdens het wegschrijven niets bijkwam

    // Er veranderde hier iets dat met je account meegaat: even bundelen, dan wegschrijven. Ook
    // terwijl je account nog laadt (bij het opstarten): anders zet wat je account heeft het terug.
    func changed() {
        guard status == .member || (status == .loading && session != nil) else { return }
        dirty = true
        edits &+= 1
        schedule()
    }

    // Over 3 seconden synchroniseren. Loopt er al een, dan niet afbreken (dan mislukt hij half en
    // staat er even "lukte niet"), maar daarna nog een keer.
    private func schedule() {
        if busy { again = true; return }
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            if !Task.isCancelled { await self?.pull() }
        }
    }

    // Ophalen en samenvoegen, daarna wegschrijven wat hier nog openstaat.
    func pull() async {
        guard status == .member, let store, let uid = session?.uid else { return }
        let version = generation
        if busy { again = true; return }
        busy = true
        let editsAtStart = edits
        defer {
            if current(version, uid) {
                busy = false
                if again { again = false; schedule() }
            }
        }
        sync = .syncing
        do {
            // Met `edition` erbij (bouwspec-aanvulling P8-1b): wat een ander toestel al vastlegde, komt zo
            // in dezelfde ronde mee als je instellingen.
            let stateData = try await call("rest/v1/user_state?select=prefs,read_ids,edition&user_id=eq.\(uid)")
            guard current(version, uid) else { return }
            let savedData = try await call("rest/v1/saved_items?select=key,entry&user_id=eq.\(uid)")
            guard current(version, uid) else { return }
            let row = ((try JSONSerialization.jsonObject(with: stateData) as? [[String: Any]]) ?? []).first ?? [:]
            let remotePrefs = row["prefs"] as? [String: Any] ?? [:]
            let remoteRead = row["read_ids"] as? [String] ?? []
            remoteEdition = row["edition"] as? [String: Any]
            let rows = (try JSONSerialization.jsonObject(with: savedData) as? [[String: Any]]) ?? []

            let owner = UserDefaults.standard.string(forKey: "hoot.owner")
            let mode = owner == uid ? "continue" : owner == nil ? "merge" : "replace"

            // Bewaard: alleen losse stukken (een bewaard verhaal van de website laat de app staan).
            var remote: [String: (item: Item, at: Double)] = [:]
            for r in rows {
                guard let key = r["key"] as? String, let entry = r["entry"] as? [String: Any], entry["kind"] as? String == "item",
                      let obj = entry["item"], let json = try? JSONSerialization.data(withJSONObject: obj),
                      let item = try? JSONDecoder().decode(Item.self, from: json) else { continue }
                remote[key] = (item, entry["savedAt"] as? Double ?? 0)
            }
            let base = Set(Defaults.strings("hoot.savedBase"))
            let local = mode == "replace" ? [] : store.saved
            let localIds = Set(local.map(\.id))
            let added = local.filter { remote[$0.id] == nil && (mode == "merge" || !base.contains($0.id)) }
            let removed = mode == "continue" ? base.filter { !localIds.contains($0) && remote[$0] != nil } : []
            let kept = remote.filter { !removed.contains($0.key) }.sorted { $0.value.at > $1.value.at }.map(\.value.item)
            // Volgorde: wat je hier net bewaarde bovenaan, dan de rest zoals je account die heeft.
            let order = Dictionary(local.enumerated().map { ($1.id, $0) }, uniquingKeysWith: { a, _ in a })
            let merged = added + kept.sorted { (order[$0.id] ?? .max) < (order[$1.id] ?? .max) }

            // Instellingen: je account gaat voor, behalve wat hier nog openstaat.
            let useRemote = !remotePrefs.isEmpty && !(dirty && mode == "continue")
            let prefsData = useRemote ? try? JSONSerialization.data(withJSONObject: remotePrefs) : nil
            pulled = true // applyRemote laat jouw Editie opnieuw samenstellen: nu met wat je account heeft
            store.applyRemote(prefs: prefsData, read: remoteRead, saved: merged, unite: mode == "merge")
            UserDefaults.standard.set(uid, forKey: "hoot.owner")

            // Wegschrijven: instellingen (aangevuld, wat alleen de website kent blijft staan) en gelezen.
            var prefs = remotePrefs
            for (k, v) in store.syncedPrefs { prefs[k] = v }
            let read = Array(store.readIds.suffix(1500))
            if !NSDictionary(dictionary: prefs).isEqual(to: remotePrefs) || read != remoteRead {
                _ = try await call("rest/v1/user_state?user_id=eq.\(uid)", method: "PATCH", body: ["prefs": prefs, "read_ids": read, "updated_at": ISO8601DateFormatter().string(from: .now)] as [String: Any])
                guard current(version, uid) else { return }
            }
            if !added.isEmpty {
                let now = Date.now.timeIntervalSince1970 * 1000
                let rows: [[String: Any]] = added.enumerated().compactMap { i, item in
                    guard let json = try? JSONEncoder().encode(item), let obj = try? JSONSerialization.jsonObject(with: json) else { return nil }
                    let at = now - Double(i) // de bovenste is de nieuwste
                    return ["user_id": uid, "key": item.id, "entry": ["kind": "item", "savedAt": at, "item": obj], "saved_at": ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: at / 1000))]
                }
                _ = try await call("rest/v1/saved_items", method: "POST", body: rows, prefer: "resolution=merge-duplicates")
                guard current(version, uid) else { return }
            }
            if !removed.isEmpty {
                let list = removed.map { "\"\($0)\"" }.joined(separator: ",")
                _ = try await call("rest/v1/saved_items?user_id=eq.\(uid)&key=in.(\(list.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? list))", method: "DELETE")
                guard current(version, uid) else { return }
            }
            // De basis is wat de server nu heeft (wat we net samenvoegden), niet wat er intussen hier
            // bij kwam: anders ziet de volgende ronde een net bewaard stuk als elders verwijderd.
            Defaults.set(merged.map(\.id), "hoot.savedBase")
            if edits == editsAtStart { dirty = false }
            sync = .ok
            syncedAt = .now
        } catch Failure.signedOut {
            guard current(version, uid) else { return }
            forget()
        } catch {
            guard current(version, uid) else { return }
            sync = .failed // de volgende wijziging of de volgende keer openen probeert het opnieuw
            store.refreshPersonal() // jouw Editie wacht niet langer op je account (zoals de website bij sync 'failed')
        }
    }

    // ---- Jouw Editie in je account (user_state.edition) ----
    // De Editie die een ander toestel of de website vastlegde, met `history`. Geen kolom of geen rij:
    // dan niets. De aanroeper toetst id, eigenaar en afdruk (HootStore.loadPersonal).
    func fetchEdition() async throws -> [String: Any]? {
        guard let uid = session?.uid else { return nil }
        let data = try await call("rest/v1/user_state?select=edition&user_id=eq.\(uid)")
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        remoteEdition = rows.first?["edition"] as? [String: Any]
        return remoteEdition
    }

    // Vastleggen, maar de eerste schrijver wint (bouwspec-aanvulling P8-3): alleen als er nog geen
    // Editie staat of een van een ander dagdeel. `edition->>id=neq.<id>` alleen is niet genoeg, want
    // `null ->> id` is null en matcht niet. Nul rijen terug = een ander toestel was eerder; dan die.
    func claimEdition(_ edition: [String: Any], id: String) async throws -> (won: Bool, edition: [String: Any]?) {
        guard let uid = session?.uid else { return (false, nil) }
        let filter = "or=(edition.is.null,edition-%3E%3Eid.neq.\(id))"
        let data = try await call("rest/v1/user_state?user_id=eq.\(uid)&\(filter)", method: "PATCH", body: ["edition": edition], prefer: "return=representation")
        let rows = (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
        if let mine = rows.first?["edition"] as? [String: Any] { remoteEdition = mine; return (true, mine) }
        return (false, try await fetchEdition())
    }

    // ---- Supabase ----
    private enum Failure: Error { case signedOut, login, http(Int) }
    private static let log = Logger(subsystem: "nl.hootnews.Hoot", category: "account") // nooit tokens of codes

    private func call(_ path: String, method: String = "GET", body: Any? = nil, authorized: Bool = true, prefer: String? = nil) async throws -> Data {
        guard !Self.localBeta else { throw Failure.signedOut }
        let version = generation, identity = session?.uid
        var r = URLRequest(url: URL(string: path, relativeTo: HootConfig.supabaseURL)!)
        r.httpMethod = method
        r.setValue(HootConfig.supabaseKey, forHTTPHeaderField: "apikey")
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let prefer { r.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if authorized {
            try await refreshIfNeeded()
            guard current(version, identity) else { throw CancellationError() }
            guard let s = session else { throw Failure.signedOut }
            r.setValue("Bearer \(s.access)", forHTTPHeaderField: "Authorization")
        }
        if let body { r.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await transport.data(for: r)
        guard current(version, identity) else { throw CancellationError() }
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if code == 401 && authorized { throw Failure.signedOut }
        guard (200 ..< 300).contains(code) else { throw Failure.http(code) }
        return data
    }

    // Eén verversing tegelijk: Supabase geeft bij elke verversing een nieuw refresh-token, en twee
    // tegelijk met hetzelfde oude kan je uitloggen.
    private var refreshing: Task<Void, Error>?
    private func refreshIfNeeded() async throws {
        guard let s = session, s.expires < .now.addingTimeInterval(60) else { return }
        let version = generation
        if let refreshing { return try await refreshing.value }
        let task = Task { try await refresh(s, version: version) }
        refreshing = task
        defer { if current(version, s.uid) { refreshing = nil } }
        try await task.value
    }

    private func refresh(_ s: Session, version: UInt64) async throws {
        guard !Self.localBeta else { throw Failure.signedOut }
        var r = URLRequest(url: URL(string: "auth/v1/token?grant_type=refresh_token", relativeTo: HootConfig.supabaseURL)!)
        r.httpMethod = "POST"
        r.setValue(HootConfig.supabaseKey, forHTTPHeaderField: "apikey")
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        r.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": s.refresh])
        let (data, response) = try await transport.data(for: r)
        guard current(version, s.uid) else { throw CancellationError() }
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if [400, 401, 403].contains(code) { throw Failure.signedOut } // ingetrokken of verlopen (niet: te veel verzoeken)
        guard code == 200 else { throw Failure.http(code) }
        try keep(data, replacingSession: false)
    }

    // Een sessie van Supabase bewaren (in de Keychain, alleen op dit toestel).
    private func keep(_ data: Data, replacingSession: Bool = true) throws {
        guard !Self.localBeta else { throw Failure.signedOut }
        guard let o = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = o["access_token"] as? String, let refresh = o["refresh_token"] as? String,
              let user = o["user"] as? [String: Any], let uid = user["id"] as? String
        else { throw Failure.login }
        if replacingSession { invalidateWork() }
        else if uid != session?.uid { throw Failure.login }
        let meta = user["user_metadata"] as? [String: Any]
        let s = Session(access: access, refresh: refresh, expires: .now.addingTimeInterval(o["expires_in"] as? Double ?? 3600), uid: uid,
                        email: user["email"] as? String, name: (meta?["full_name"] ?? meta?["name"]) as? String, avatar: Self.avatar(from: meta))
        session = s
        Keychain.write(s)
    }

    // ---- Hulpjes ----
    private static func random(_ bytes: Int) -> String {
        var b = [UInt8](repeating: 0, count: bytes)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes, &b)
        return base64url(Data(b))
    }
    private static func base64url(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    private static func sha256(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
}

// Even opnieuw bevestigen bij Apple, voor een verse code (die is kort geldig en maar één keer te
// gebruiken; daarom niet bij het inloggen bewaard). Zelf annuleren gooit .canceled; een andere
// fout gooit die fout; geen code in het antwoord geeft nil.
@MainActor
private final class AppleReauth: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<ASAuthorization, Error>?
    private var controller: ASAuthorizationController? // vasthouden zolang Apple bezig is (de delegate is zwak)

    func code() async throws -> String? {
        let controller = ASAuthorizationController(authorizationRequests: [ASAuthorizationAppleIDProvider().createRequest()])
        controller.delegate = self
        controller.presentationContextProvider = self
        self.controller = controller
        defer { self.controller = nil }
        let auth = try await withCheckedThrowingContinuation { continuation = $0; controller.performRequests() }
        guard let credential = auth.credential as? ASAuthorizationAppleIDCredential, let data = credential.authorizationCode else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        continuation?.resume(returning: authorization)
        continuation = nil
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        if let window = scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? scenes.first?.windows.first { return window }
        return ASPresentationAnchor(windowScene: scenes.first!) // je tikte op een knop, dus er is een scène
    }
}

// Openbare gegevens van de diensten (geen geheimen: wat een gebruiker mag, bepaalt de database).
enum HootConfig {
    static let supabaseURL = URL(string: "https://vlimcejjkeltooplsijx.supabase.co/")!
    static let supabaseKey = "sb_publishable_oUemZmIojuqGI_djGbtWOg_YiRkKjgV"
    // Google Cloud → Credentials → "Hoot iOS" (type iOS, bundel nl.hootnews.Hoot).
    static let googleClientID = "1052632752108-3qhk08hifedbnrl33c9ch7b7panvu4t6.apps.googleusercontent.com"
    // Google stuurt terug naar de omgekeerde client-id als schema.
    static var googleScheme: String { "com.googleusercontent.apps." + googleClientID.replacingOccurrences(of: ".apps.googleusercontent.com", with: "") }
    static var googleReady: Bool { !googleClientID.hasPrefix("GOOGLE_") }
}

private enum Defaults {
    static func strings(_ key: String) -> [String] { UserDefaults.standard.stringArray(forKey: key) ?? [] }
    static func set(_ value: [String], _ key: String) { UserDefaults.standard.set(value, forKey: key) }
    static func remove(_ keys: [String]) { keys.forEach { UserDefaults.standard.removeObject(forKey: $0) } }
}

// De sessie in de Keychain: blijft op dit toestel, niet in back-ups naar een ander toestel.
private enum Keychain {
    static var query: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "nl.hootnews.Hoot", kSecAttrAccount as String: "session"] }
    static func read() -> Account.Session? {
        var q = query
        q[kSecReturnData as String] = true
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(Account.Session.self, from: data)
    }
    static func write(_ s: Account.Session) {
        guard let data = try? JSONEncoder().encode(s) else { return }
        delete()
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
    }
    static func delete() { SecItemDelete(query as CFDictionary) }
}
