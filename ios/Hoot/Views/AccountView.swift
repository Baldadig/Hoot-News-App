import AuthenticationServices
import SwiftUI

// Bovenaan de instellingen: wie je bent, of een uitnodiging om in te loggen.
struct AccountRow: View {
    @Environment(Account.self) private var account

    var body: some View {
        NavigationLink(value: "account") {
            HStack(spacing: Space.s3) {
                AccountBadge(size: 40)
                VStack(alignment: .leading, spacing: Space.s0) {
                    switch account.status {
                    case .member, .noInvite:
                        Text(account.session?.name ?? account.session?.email ?? "Je account").font(.headline)
                        Text(account.status == .noInvite ? "Nog geen lid" : account.syncLine).font(.subheadline).foregroundStyle(Theme.ink3)
                    case .loading:
                        Text("Je account").font(.headline)
                        Text("Even geduld …").font(.subheadline).foregroundStyle(Theme.ink3)
                    case .out:
                        Text("Inloggen").font(.headline)
                        Text("Je editie en Bewaard op al je apparaten").font(.subheadline).foregroundStyle(Theme.ink3)
                    }
                }
            }
            .padding(.vertical, Space.s1)
        }
    }
}

// Rond: de eerste letter van je naam, of een silhouet als je niet bent ingelogd.
struct AccountBadge: View {
    @Environment(Account.self) private var account
    var size: CGFloat
    var body: some View {
        let letter = (account.session?.name ?? account.session?.email)?.first.map { String($0).uppercased() }
        ZStack {
            Circle().fill(letter == nil ? Theme.ink3.opacity(0.15) : Theme.accent)
            if let letter {
                Text(letter).font(.system(size: size * 0.45, weight: .bold, design: .serif)).foregroundStyle(.white)
            } else {
                Image(systemName: "person.fill").font(.system(size: size * 0.45)).foregroundStyle(Theme.ink3)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

extension Account {
    var syncLine: String {
        switch sync {
        case .syncing: "Synchroniseren …"
        case .failed: "Synchroniseren lukte niet; straks opnieuw"
        case .ok, .idle: syncedAt.map { "Gesynchroniseerd om \($0.formatted(date: .omitted, time: .shortened))" } ?? "Ingelogd"
        }
    }
}

// De pagina zelf: inloggen, lid worden met een uitnodiging, of je account beheren.
struct AccountView: View {
    @Environment(Account.self) private var account
    @Environment(\.webAuthenticationSession) private var webAuth
    @Environment(\.colorScheme) private var scheme
    @State private var code = ""
    @State private var confirmDelete = false
    var onMember: (() -> Void)? = nil // in het welkom: verder zodra je lid bent
    private static let buttonHeight: CGFloat = 50
    private static let buttonRadius: CGFloat = 10

    var body: some View {
        Group {
            if account.status == .out || account.status == .loading {
                signIn
            } else {
                Form {
                    if account.status == .noInvite { invite } else { member }
                    if let message = account.message {
                        Section { Label(message, systemImage: "exclamationmark.circle").foregroundStyle(Theme.accent) }
                    }
                }
                .navigationTitle("Account")
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: account.status) { _, now in if now == .member { onMember?() } }
        .alert("Je account verwijderen?", isPresented: $confirmDelete) {
            Button("Annuleer", role: .cancel) {}
            Button("Verwijder", role: .destructive) { Task { _ = await account.deleteAccount() } }
        } message: {
            Text("Je account, je instellingen en je bewaarde stukken verdwijnen van de server, ook op hootnews.nl. Wat op deze iPhone staat, blijft. Dit kun je niet ongedaan maken.")
        }
    }

    // Inloggen zoals je het kent: het merk, één korte kop en twee knoppen. Geen uitleg nodig.
    private var signIn: some View {
        VStack(spacing: 0) {
            Spacer()
            IntroMark() // "hoot." met de ademende punt, zoals het welkom
                .environment(\.brandHandoff, nil)
            Text("Inloggen")
                .font(Theme.headline(.title))
                .padding(.top, Space.s4)
            Text("Je Hoot op al je apparaten.")
                .font(.body)
                .foregroundStyle(Theme.ink2)
                .multilineTextAlignment(.center)
                .padding(.top, Space.s2)
            Spacer()
            VStack(spacing: Space.s3) {
                // Elk in de eigen huisstijl, maar even groot: zelfde hoogte, afronding en letter.
                // Apple (Human Interface Guidelines): zwart op licht, wit op donker; de tekst geeft iOS zelf.
                SignInWithAppleButton(.signIn) { account.prepare($0) } onCompletion: { result in Task { await account.finishApple(result) } }
                    .signInWithAppleButtonStyle(scheme == .dark ? .white : .black)
                    .id(scheme) // de knop van Apple neemt een nieuwe stijl pas over als hij opnieuw wordt gemaakt
                    .frame(height: Self.buttonHeight)
                    .clipShape(RoundedRectangle(cornerRadius: Self.buttonRadius))
                // Google (branding guidelines "Sign in with Google"): licht thema wit met grijze rand,
                // donker thema #131314; het gekleurde G-logo los, en hun eigen Nederlandse tekst.
                if HootConfig.googleReady {
                    Button { google() } label: {
                        HStack(spacing: Space.s3) {
                            Image("GoogleG").resizable().frame(width: 20, height: 20)
                            Text("Inloggen met Google")
                        }
                        .font(.system(size: 19, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: Self.buttonHeight)
                        .foregroundStyle(Color(hex: scheme == .dark ? 0xE3E3E3 : 0x1F1F1F))
                        .background(Color(hex: scheme == .dark ? 0x131314 : 0xFFFFFF), in: RoundedRectangle(cornerRadius: Self.buttonRadius))
                        .overlay(RoundedRectangle(cornerRadius: Self.buttonRadius).strokeBorder(Color(hex: scheme == .dark ? 0x8E918F : 0x747775), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .disabled(account.status == .loading)
            .overlay { if account.status == .loading { ProgressView() } }
            if let message = account.message {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(Theme.accent)
                    .multilineTextAlignment(.center)
                    .padding(.top, Space.s3)
            }
            Text("Nog op uitnodiging.")
                .font(.footnote)
                .foregroundStyle(Theme.ink3)
                .padding(.top, Space.s4)
        }
        .padding(.horizontal, Space.s5)
        .padding(.bottom, Space.s4)
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .navigationTitle("")
    }

    private var invite: some View {
        Group {
            Section {
                LabeledContent("Ingelogd als", value: account.session?.email ?? "–")
            } footer: {
                Text("Hoot is nog op uitnodiging. Heb je een uitnodigingslink gekregen? Plak hem hieronder, of alleen de code erin.").foregroundStyle(Theme.ink3)
            }
            Section {
                TextField("Uitnodigingslink of code", text: $code)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("Word lid") { Task { await account.redeem(code) } }
                    .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            manage
        }
    }

    private var member: some View {
        Group {
            Section {
                HStack(spacing: Space.s3) {
                    AccountBadge(size: 48)
                    VStack(alignment: .leading, spacing: Space.s0) {
                        Text(account.session?.name ?? "Je account").font(.headline)
                        if let email = account.session?.email { Text(email).font(.subheadline).foregroundStyle(Theme.ink3) }
                    }
                }
                .padding(.vertical, Space.s1)
            }
            Section {
                LabeledContent("Synchroniseren", value: account.syncLine)
                Button("Nu synchroniseren") { Task { await account.pull() } }
                    .disabled(account.sync == .syncing)
            } footer: {
                Text("Je bronnen, interesses, vakgebieden, gelezen en bewaarde stukken gaan mee met je account. Weergave en lezen (zoals waar artikelen openen) blijven per toestel.").foregroundStyle(Theme.ink3)
            }
            manage
        }
    }

    private var manage: some View {
        Section {
            Button("Uitloggen") { Task { await account.signOut() } }
            Button("Account verwijderen", role: .destructive) { confirmDelete = true }
        }
    }

    private func google() {
        let request = account.googleRequest()
        Task {
            guard let url = try? await webAuth.authenticate(using: request.url, callbackURLScheme: request.scheme, preferredBrowserSession: .shared) else { return }
            await account.finishGoogle(request, callback: url)
        }
    }
}

// Vaste kleuren uit de huisstijl van een ander bedrijf (hier: de knop van Google).
private extension Color {
    init(hex: UInt32) {
        self.init(red: Double(hex >> 16 & 0xFF) / 255, green: Double(hex >> 8 & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}
