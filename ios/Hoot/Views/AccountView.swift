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

    var body: some View {
        Form {
            switch account.status {
            case .out, .loading: signIn
            case .noInvite: invite
            case .member: member
            }
            if let message = account.message {
                Section { Label(message, systemImage: "exclamationmark.circle").foregroundStyle(Theme.accent) }
            }
        }
        .onChange(of: account.status) { _, now in if now == .member { onMember?() } }
        .alert("Je account verwijderen?", isPresented: $confirmDelete) {
            Button("Annuleer", role: .cancel) {}
            Button("Verwijder", role: .destructive) { Task { _ = await account.deleteAccount() } }
        } message: {
            Text("Je account, je instellingen en je bewaarde stukken verdwijnen van de server, ook op hootnews.nl. Wat op deze iPhone staat, blijft. Dit kun je niet ongedaan maken.")
        }
    }

    // Inloggen: twee gelijke knoppen, met dezelfde hoogte en vorm.
    private var signIn: some View {
        Section {
            VStack(alignment: .leading, spacing: Space.s3) {
                Text("Log in met het account dat je ook op hootnews.nl gebruikt. Dan heb je hier dezelfde editie, bronnen en bewaarde stukken.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.ink3)
                    .padding(.bottom, Space.s1)
                if HootConfig.googleReady {
                    Button { google() } label: {
                        HStack(spacing: Space.s2) {
                            Image("GoogleG").resizable().frame(width: 16, height: 16)
                                .padding(4)
                                .background(.white, in: Circle()) // het logo van Google op wit, zoals hun eigen knoppen
                            Text("Log in met Google") // zelfde woorden als de knop van Apple
                        }
                        .font(.system(size: 19, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .foregroundStyle(scheme == .dark ? .black : .white)
                        .background(scheme == .dark ? Color.white : Color.black, in: RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
                SignInWithAppleButton(.signIn) { account.prepare($0) } onCompletion: { result in Task { await account.finishApple(result) } }
                    .signInWithAppleButtonStyle(scheme == .dark ? .white : .black)
                    .frame(height: 50)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                if account.status == .loading { ProgressView().frame(maxWidth: .infinity) }
            }
            .padding(.vertical, Space.s2)
            .disabled(account.status == .loading)
        } footer: {
            Text("Hoot is nog op uitnodiging. Inloggen is niet nodig: zonder account werkt alles, alleen op dit toestel.").foregroundStyle(Theme.ink3)
        }
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
