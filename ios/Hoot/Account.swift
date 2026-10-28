import AuthenticationServices
import CryptoKit
import Foundation
import Observation
import Security

// Je Hoot-account: hetzelfde als op hootnews.nl (Supabase), zodat je editie, je bronnen en Bewaard
// overal gelijk zijn. Inloggen met Google of Apple; Hoot is (nog) op uitnodiging, net als de website.
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
    enum Status: Equatable { case out, loading, member, noInvite }
    enum SyncState: Equatable { case idle, syncing, ok, failed }

    private(set) var status: Status
    private(set) var sync: SyncState = .idle
    private(set) var syncedAt: Date?
    private(set) var session: Session?
    var message: String? // wat er misging, in gewone woorden

    private weak var store: HootStore?

    struct Session: Codable {
        var access: String
        var refresh: String
        var expires: Date
        var uid: String
        var email: String?
        var name: String?
    }

    init() {
        let kept = Keychain.read()
        session = kept
        status = kept == nil ? .out : .loading
    }

    func start(_ store: HootStore) async {
        self.store = store
        if session != nil { await resolve() }
    }

    // ---- Inloggen met Google ----
    // De app-client van Google (type iOS, bundel nl.hootnews.Hoot) met PKCE: geen geheim in de app.
    // Google geeft een id-token; dat wisselt Supabase in voor een sessie, net als op de website.
    struct GoogleRequest { let url: URL; let scheme: String; fileprivate let verifier, nonce, state, redirect: String }

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
        return GoogleRequest(url: c.url!, scheme: scheme, verifier: verifier, nonce: nonce, state: state, redirect: redirect)
    }

    func finishGoogle(_ request: GoogleRequest, callback: URL) async {
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard items.first(where: { $0.name == "state" })?.value == request.state,
              let code = items.first(where: { $0.name == "code" })?.value
        else {
            if items.contains(where: { $0.name == "error" }) { message = "Inloggen bij Google is niet gelukt." }
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
            guard let token = (try JSONSerialization.jsonObject(with: data) as? [String: Any])?["id_token"] as? String else { throw Failure.login }
            try await signIn(provider: "google", token: token, nonce: request.nonce)
        } catch {
            fail("Inloggen met Google is niet gelukt. Probeer het nog eens.")
        }
    }

    // ---- Inloggen met Apple ----
    private var appleNonce = ""
    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        appleNonce = Self.random(16)
        request.requestedScopes = [.email]
        request.nonce = Self.sha256(appleNonce)
    }
    func finishApple(_ result: Result<ASAuthorization, Error>) async {
        guard case let .success(auth) = result,
              let credential = auth.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken, let token = String(data: data, encoding: .utf8)
        else {
            // Zelf geannuleerd: geen melding.
            if case let .failure(error) = result, (error as? ASAuthorizationError)?.code != .canceled { message = "Inloggen met Apple is niet gelukt." }
            return
        }
        status = .loading
        do { try await signIn(provider: "apple", token: token, nonce: appleNonce) } catch { fail("Inloggen met Apple is niet gelukt. Probeer het nog eens.") }
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

    // ---- Lid of niet ----
    private func resolve() async {
        guard let s = session else { status = .out; return }
        do {
            let data = try await call("rest/v1/profiles?select=id&id=eq.\(s.uid)")
            let rows = (try JSONSerialization.jsonObject(with: data) as? [Any]) ?? []
            status = rows.isEmpty ? .noInvite : .member
            if status == .member { await pull() }
        } catch Failure.signedOut {
            forget()
        } catch {
            // Geen verbinding: je bent nog steeds ingelogd; straks opnieuw.
            if status == .loading { status = .member }
        }
    }

    // Een uitnodigingscode (de code achter ?uitnodiging= in je link, of de hele link).
    func redeem(_ input: String) async {
        let code = input.split(separator: "uitnodiging=").last.map { String($0.prefix { $0 != "&" }) }?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !code.isEmpty else { return }
        do {
            let data = try await call("rest/v1/rpc/redeem_invite", method: "POST", body: ["p_code": code])
            if String(data: data, encoding: .utf8)?.contains("true") == true {
                message = nil
                status = .member
                await pull()
            } else {
                message = "Deze code werkt niet (meer). Vraag om een nieuwe uitnodiging."
            }
        } catch {
            message = "Dat lukte niet. Controleer je verbinding en probeer het opnieuw."
        }
    }

    func signOut() async {
        if session != nil { _ = try? await call("auth/v1/logout", method: "POST") }
        forget()
    }

    // Account verwijderen: alles op de server weg (profiel, instellingen, Bewaard). Wat op dit
    // toestel staat, blijft.
    func deleteAccount() async -> Bool {
        do {
            _ = try await call("rest/v1/rpc/delete_my_account", method: "POST", body: [String: String]())
            forget()
            UserDefaults.standard.removeObject(forKey: "hoot.owner")
            return true
        } catch {
            message = "Verwijderen is niet gelukt. Controleer je verbinding en probeer het opnieuw."
            return false
        }
    }

    private func forget() {
        session = nil
        Keychain.delete()
        status = .out
        sync = .idle
        pushTask?.cancel()
        Defaults.remove(["hoot.syncDirty", "hoot.remotePrefs", "hoot.savedBase"])
        dirty = false
    }

    // ---- Synchroniseren ----
    private var dirty = UserDefaults.standard.bool(forKey: "hoot.syncDirty") {
        didSet { UserDefaults.standard.set(dirty, forKey: "hoot.syncDirty") }
    }
    private var pushTask: Task<Void, Never>?
    private var busy = false
    private var again = false // tijdens het synchroniseren veranderde er weer iets

    // Er veranderde hier iets dat met je account meegaat: even bundelen, dan wegschrijven.
    func changed() {
        guard status == .member else { return }
        dirty = true
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            if !Task.isCancelled { await self?.pull() }
        }
    }

    // Ophalen en samenvoegen, daarna wegschrijven wat hier nog openstaat.
    func pull() async {
        guard status == .member, let store, let uid = session?.uid else { return }
        if busy { again = true; return }
        busy = true
        defer {
            busy = false
            if again { again = false; changed() }
        }
        sync = .syncing
        do {
            let stateData = try await call("rest/v1/user_state?select=prefs,read_ids&user_id=eq.\(uid)")
            let savedData = try await call("rest/v1/saved_items?select=key,entry&user_id=eq.\(uid)")
            let row = ((try JSONSerialization.jsonObject(with: stateData) as? [[String: Any]]) ?? []).first ?? [:]
            let remotePrefs = row["prefs"] as? [String: Any] ?? [:]
            let remoteRead = row["read_ids"] as? [String] ?? []
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
            store.applyRemote(prefs: prefsData, read: remoteRead, saved: merged)
            UserDefaults.standard.set(uid, forKey: "hoot.owner")

            // Wegschrijven: instellingen (aangevuld, wat alleen de website kent blijft staan) en gelezen.
            var prefs = remotePrefs
            for (k, v) in store.syncedPrefs { prefs[k] = v }
            let read = Array(store.readIds.suffix(1500))
            if !NSDictionary(dictionary: prefs).isEqual(to: remotePrefs) || read != remoteRead {
                _ = try await call("rest/v1/user_state?user_id=eq.\(uid)", method: "PATCH", body: ["prefs": prefs, "read_ids": read, "updated_at": ISO8601DateFormatter().string(from: .now)] as [String: Any])
            }
            if !added.isEmpty {
                let now = Date.now.timeIntervalSince1970 * 1000
                let rows: [[String: Any]] = added.enumerated().compactMap { i, item in
                    guard let json = try? JSONEncoder().encode(item), let obj = try? JSONSerialization.jsonObject(with: json) else { return nil }
                    let at = now - Double(i) // de bovenste is de nieuwste
                    return ["user_id": uid, "key": item.id, "entry": ["kind": "item", "savedAt": at, "item": obj], "saved_at": ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: at / 1000))]
                }
                _ = try await call("rest/v1/saved_items", method: "POST", body: rows, prefer: "resolution=merge-duplicates")
            }
            if !removed.isEmpty {
                let list = removed.map { "\"\($0)\"" }.joined(separator: ",")
                _ = try await call("rest/v1/saved_items?user_id=eq.\(uid)&key=in.(\(list.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? list))", method: "DELETE")
            }
            Defaults.set(store.saved.map(\.id), "hoot.savedBase")
            dirty = false
            sync = .ok
            syncedAt = .now
        } catch Failure.signedOut {
            forget()
        } catch {
            sync = .failed // de volgende wijziging of de volgende keer openen probeert het opnieuw
        }
    }

    // ---- Supabase ----
    private enum Failure: Error { case signedOut, login, http(Int) }

    private func call(_ path: String, method: String = "GET", body: Any? = nil, authorized: Bool = true, prefer: String? = nil) async throws -> Data {
        var r = URLRequest(url: URL(string: path, relativeTo: HootConfig.supabaseURL)!)
        r.httpMethod = method
        r.setValue(HootConfig.supabaseKey, forHTTPHeaderField: "apikey")
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let prefer { r.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if authorized {
            try await refreshIfNeeded()
            guard let s = session else { throw Failure.signedOut }
            r.setValue("Bearer \(s.access)", forHTTPHeaderField: "Authorization")
        }
        if let body { r.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: r)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if code == 401 && authorized { throw Failure.signedOut }
        guard (200 ..< 300).contains(code) else { throw Failure.http(code) }
        return data
    }

    private func refreshIfNeeded() async throws {
        guard let s = session, s.expires < .now.addingTimeInterval(60) else { return }
        var r = URLRequest(url: URL(string: "auth/v1/token?grant_type=refresh_token", relativeTo: HootConfig.supabaseURL)!)
        r.httpMethod = "POST"
        r.setValue(HootConfig.supabaseKey, forHTTPHeaderField: "apikey")
        r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        r.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": s.refresh])
        let (data, response) = try await URLSession.shared.data(for: r)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if (400 ..< 500).contains(code) { throw Failure.signedOut } // ingetrokken of verlopen
        guard code == 200 else { throw Failure.http(code) }
        try keep(data)
    }

    // Een sessie van Supabase bewaren (in de Keychain, alleen op dit toestel).
    private func keep(_ data: Data) throws {
        guard let o = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = o["access_token"] as? String, let refresh = o["refresh_token"] as? String,
              let user = o["user"] as? [String: Any], let uid = user["id"] as? String
        else { throw Failure.login }
        let meta = user["user_metadata"] as? [String: Any]
        let s = Session(access: access, refresh: refresh, expires: .now.addingTimeInterval(o["expires_in"] as? Double ?? 3600), uid: uid,
                        email: user["email"] as? String, name: (meta?["full_name"] ?? meta?["name"]) as? String)
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
