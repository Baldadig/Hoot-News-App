import AVKit
import SwiftUI

// Eén video tegelijk: start er een, dan pauzeert de vorige.
@MainActor
final class Playback {
    static let shared = Playback()
    private weak var playing: AVPlayer?

    func play(_ player: AVPlayer) {
        if playing !== player { playing?.pause() }
        // Geluid ook met de stil-schakelaar aan, zoals bij video in andere apps.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
        playing = player
        player.play()
    }

    // Weg gescrold: pauze, en het geluid terug aan wat er eerder speelde (muziek, een podcast).
    func stop(_ player: AVPlayer?) {
        player?.pause()
        guard let player, playing === player else { return }
        playing = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

// Een video in een post: eerst het stilstaande beeld met een afspeelknop (er wordt niets geladen
// tot je tikt), daarna de speler van het systeem, met volledig scherm. Weg gescrold = pauze.
struct InlineVideo: View {
    @Environment(\.nachtActief) private var nacht
    let item: Item
    @State private var player: AVPlayer?

    private var ratio: CGFloat { CGFloat(min(max(item.imageRatio ?? 16 / 9, 0.75), 2)) }

    var body: some View {
        ZStack {
            if let player {
                SystemVideoPlayer(player: player, label: "Video van \(item.sourceName ?? "Bluesky")").background(Color.black)
            } else {
                Button(action: start) {
                    ZStack {
                        Color.black
                        AsyncImage(url: item.videoPosterURL) { phase in
                            if let image = phase.image { image.resizable().scaledToFill() }
                        }
                        Image(systemName: "play.fill")
                            .font(.title)
                            .foregroundStyle(nacht ? Theme.ink : .white)
                            .frame(width: 64, height: 64)
                            .glassEffect(.regular.tint(.black.opacity(0.25)), in: .circle)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Video van \(item.sourceName ?? "Bluesky") afspelen")
            }
        }
        .aspectRatio(ratio, contentMode: .fit)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .onDisappear { Playback.shared.stop(player) }
    }

    private func start() {
        guard let url = item.videoURL else { return }
        let p = AVPlayer(url: url)
        player = p
        Playback.shared.play(p)
    }
}

// AVKit levert de standaard fullscreen-/terugbediening en de systeemrotatie.
// Dezelfde AVPlayer blijft behouden bij SwiftUI-updates; nooit automatisch afspelen.
struct SystemVideoPlayer: UIViewControllerRepresentable {
    let player: AVPlayer
    let label: String
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        Self.controller(player: player, label: label)
    }
    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {
        if controller.player !== player { controller.player = player }
        controller.view.accessibilityLabel = label
    }
    static func controller(player: AVPlayer, label: String) -> AVPlayerViewController {
        let controller = HootPlayerController()
        controller.player = player
        controller.showsPlaybackControls = true
        controller.entersFullScreenWhenPlaybackBegins = false
        controller.canStartPictureInPictureAutomaticallyFromInline = false
        controller.videoGravity = .resizeAspect
        controller.overrideUserInterfaceStyle = .dark
        controller.view.layer.backgroundColor = UIColor.black.cgColor
        controller.view.accessibilityLabel = label
        return controller
    }
}

// AVKit kan zijn UIView-achtergrond terugzetten op transparant. De videolaag en de
// omringende SwiftUI-view blijven zwart, ook tijdens layout/fullscreen-overgangen.
final class HootPlayerController: AVPlayerViewController {
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        view.layer.backgroundColor = UIColor.black.cgColor
    }
}
