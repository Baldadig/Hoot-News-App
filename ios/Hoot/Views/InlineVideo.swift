import AVKit
import SwiftUI

// Eén video tegelijk: start er een, dan pauzeert de vorige.
@MainActor
final class Playback {
    static let shared = Playback()
    private weak var playing: AVPlayer?
    var started = false // voor `-HootScreen video`: alleen de eerste video start vanzelf

    func play(_ player: AVPlayer) {
        if playing !== player { playing?.pause() }
        // Geluid ook met de stil-schakelaar aan, zoals bij video in andere apps.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
        playing = player
        player.play()
    }
}

// Een video in een post: eerst het stilstaande beeld met een afspeelknop (er wordt niets geladen
// tot je tikt), daarna de speler van het systeem, met volledig scherm. Weg gescrold = pauze.
struct InlineVideo: View {
    let item: Item
    @State private var player: AVPlayer?

    private var ratio: CGFloat { CGFloat(min(max(item.imageRatio ?? 16 / 9, 0.75), 2)) }

    var body: some View {
        ZStack {
            if let player {
                VideoPlayer(player: player)
            } else {
                Button(action: start) {
                    ZStack {
                        Color.black
                        AsyncImage(url: item.videoPosterURL) { phase in
                            if let image = phase.image { image.resizable().scaledToFill() }
                        }
                        Image(systemName: "play.fill")
                            .font(.title)
                            .foregroundStyle(.white)
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
        .onDisappear { player?.pause() }
        .onAppear { if DebugLaunch.screen("video"), !Playback.shared.started { Playback.shared.started = true; start() } }
    }

    private func start() {
        guard let url = item.videoURL else { return }
        let p = AVPlayer(url: url)
        player = p
        Playback.shared.play(p)
    }
}
