import AuthenticationServices
import SwiftUI

// Bovenaan de instellingen: wie je bent, of de weg naar inloggen.
struct AccountRow: View {
    @Environment(Account.self) private var account

    var body: some View {
        NavigationLink(value: "account") {
            HStack(spacing: Space.s3) {
                AccountBadge(size: 40)
                VStack(alignment: .leading, spacing: Space.s0) {
                    if Account.localBeta {
                        Text("Lokale beta").font(.ui(.headline))
                        Text("Accountsynchronisatie uit").font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                    } else { switch account.status {
                    case .member, .pending:
                        Text(account.session?.name ?? account.session?.email ?? "Je account").font(.ui(.headline))
                        Text(account.status == .pending ? Account.pendingText : account.syncLine).font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                    case .loading:
                        Text("Je account").font(.ui(.headline))
                        Text("Even geduld …").font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                    case .out:
                        Text("Inloggen").font(.ui(.headline))
                        Text("Op al je toestellen").font(.ui(.subheadline)).foregroundStyle(Theme.ink3)
                    }}
                }
            }
            .padding(.vertical, Space.s1)
        }
    }
}

// Rond: de eerste letter van je naam, of een silhouet als je niet bent ingelogd.
struct AccountBadge: View {
    @Environment(\.nachtActief) private var nacht
    @Environment(Account.self) private var account
    var size: CGFloat
    var body: some View {
        let letter = (account.session?.name ?? account.session?.email)?.first.map { String($0).uppercased() }
        ZStack {
            Circle().fill(letter == nil ? Theme.ink3.opacity(0.15) : Theme.accent)
            if let letter {
                Text(letter).font(.kop(size: size * 0.45)).foregroundStyle(nacht ? Theme.paper : .white)
            } else {
                Image(systemName: "person.fill").font(.system(size: size * 0.45)).foregroundStyle(Theme.ink3)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

extension Account {
    // Ingelogd, maar het profiel ontbreekt nog. Zelfde zin als de website (src/lib/membership.js).
    static let pendingText = "Je account is er bijna. Probeer het zo nog eens."

    var syncLine: String {
        switch sync {
        case .syncing: "Synchroniseren …"
        case .failed: "Synchroniseren lukte niet; straks opnieuw"
        case .ok, .idle: syncedAt == nil ? "Ingelogd" : "Gesynchroniseerd"
        }
    }
}

// De pagina zelf: inloggen, of je account beheren.
struct AccountView: View {
    @Environment(Account.self) private var account
    @Environment(\.webAuthenticationSession) private var webAuth
    @Environment(\.nachtActief) private var nacht
    @Environment(\.colorScheme) private var scheme
    @State private var confirmDelete = false
    var onMember: (() -> Void)? = nil // in het welkom: verder zodra je lid bent
    private static let buttonHeight: CGFloat = 50
    private static let buttonRadius: CGFloat = 10

    var body: some View {
        Group {
            if Account.localBeta {
                VStack(alignment: .leading, spacing: Space.s3) {
                    Text("Lokale beta").font(Theme.headline(.title2))
                    Text("Je leest met de keuzes op dit toestel. Accountsynchronisatie is in deze beta uitgeschakeld.").foregroundStyle(Theme.ink2)
                }
                .padding(Space.s5)
                .navigationTitle("Account")
            } else if account.status == .out || account.status == .loading {
                signIn
            } else {
                Form {
                    Group {
                        if account.status == .pending { pending } else { member }
                        if let message = account.message {
                            Section { Label(message, systemImage: "exclamationmark.circle").foregroundStyle(Theme.accent) }
                        }
                    }
                    .hootRows() // Group geeft het door aan elke sectie
                }
                .hootForm()
                .navigationTitle("Account")
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: account.status) { _, now in if now == .member { onMember?() } }
        .alert("Je account verwijderen?", isPresented: $confirmDelete) {
            Button("Annuleer", role: .cancel) {}
            Button("Verwijder", role: .destructive) { Task { _ = await account.deleteAccount() } }
        } message: {
            Text("Je account en Bewaard verdwijnen, ook op de website. Wat op deze iPhone staat, blijft. Dit kun je niet ongedaan maken.")
        }
        // Hoot uit je Apple ID halen lukte niet: er is nog niets gewist. Jij kiest.
        .alert("Hoot uit je Apple ID halen lukte niet", isPresented: Binding(get: { account.appleFailed }, set: { if !$0 { account.dismissAppleFailure() } })) {
            Button("Opnieuw") { Task { _ = await account.deleteAccount() } }
            Button("Annuleer", role: .cancel) { account.cancelAppleFailure() }
            Button("Toch verwijderen", role: .destructive) { Task { _ = await account.deleteAccount(skipApple: true) } }
        } message: {
            Text("Je account bestaat nog. Probeer het opnieuw, of verwijder het toch.")
        }
    }

    // Inloggen zoals je het kent: het merk, één korte kop en twee knoppen. Daaronder dezelfde zin als
    // op de website: lezen kan zonder account; met een account gaat je Hoot mee.
    private var signIn: some View {
        VStack(spacing: 0) {
            Spacer()
            IntroMark() // "hoot." met de ademende punt, zoals het welkom
                .environment(\.brandHandoff, nil)
            Text("Inloggen")
                .font(Theme.headline(.title))
                .padding(.top, Space.s5) // het getekende merk heeft geen lucht onder de letters, zoals tekst
            Text("Hoot op al je toestellen.")
                .font(.ui(.body))
                .foregroundStyle(Theme.ink2)
                .multilineTextAlignment(.center)
                .padding(.top, Space.s2)
            Text("Lezen kan zonder account. Met een account reist je Hoot mee naar je andere toestellen.")
                .font(.ui(.subheadline))
                .foregroundStyle(Theme.ink3)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, Space.s3)
            Spacer()
            VStack(spacing: Space.s3) {
                // Elk in de eigen huisstijl, maar even groot: zelfde hoogte, afronding en letter.
                // Apple (Human Interface Guidelines): zwart op licht, wit op donker; de tekst geeft iOS zelf.
                SignInWithAppleButton(.signIn) { account.prepare($0) } onCompletion: { result in Task { await account.finishApple(result) } }
                    .signInWithAppleButtonStyle(scheme == .dark && !nacht ? .white : .black)
                    .colorMultiply(nacht ? Theme.ink : .white)
                    .id("\(scheme)-\(nacht)") // de knop van Apple neemt een nieuwe stijl pas over als hij opnieuw wordt gemaakt
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
            .overlay { if account.status == .loading { WaitingMark(size: 16, text: false) } }
            if let message = account.message {
                Text(message)
                    .font(.ui(.footnote))
                    .foregroundStyle(Theme.accent)
                    .multilineTextAlignment(.center)
                    .padding(.top, Space.s3)
            }
        }
        .padding(.horizontal, Space.s5)
        .padding(.bottom, Space.s4)
        .frame(maxWidth: Layout.readable)
        .frame(maxWidth: .infinity)
        .background(Theme.paper)
        .navigationTitle("")
    }

    // Ingelogd, maar je profiel ontbreekt nog (zeldzaam): zeggen hoe het zit, en opnieuw proberen.
    private var pending: some View {
        Group {
            Section {
                LabeledContent("Ingelogd als", value: account.session?.email ?? "–")
                Button("Opnieuw") { Task { await account.retry() } }
            } footer: {
                Text(Account.pendingText).foregroundStyle(Theme.ink3)
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
                        Text(account.session?.name ?? "Je account").font(.ui(.headline))
                        if let email = account.session?.email { Text(email).font(.ui(.subheadline)).foregroundStyle(Theme.ink3) }
                    }
                }
                .padding(.vertical, Space.s1)
            }
            Section {
                LabeledContent("Synchroniseren", value: account.syncLine)
                Button("Nu synchroniseren") { Task { await account.pull() } }
                    .disabled(account.sync == .syncing)
            } footer: {
                Text("Weergave en lezen blijven per toestel.").foregroundStyle(Theme.ink3)
            }
            manage
        }
    }

    private var manage: some View {
        Section {
            Button("Uitloggen") { Task { await account.signOut() } }
            Button("Account verwijderen", role: .destructive) { confirmDelete = true }
                .foregroundStyle(Theme.ink) // bediening in inkt; de melding erna heeft Verwijder in rood
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
