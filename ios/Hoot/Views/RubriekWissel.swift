import SwiftUI

// Bestaande dur-2 en ease-glide; geen verticale beweging bij een rubriekwissel.
enum RubriekWissel {
    static let duration = 0.2
    static var animation: Animation { .timingCurve(0.2, 0.8, 0.2, 1, duration: duration) }
    static func images(_ items:[Item],enabled:Bool,kind:ImageURL.Kind)->[URL] {
        guard enabled else {return []}
        var seen=Set<URL>()
        return items.prefix(3).compactMap { ImageURL.url($0.image,kind) }.filter { seen.insert($0).inserted }
    }
    static func preload(_ urls:[URL]) async {
        guard !urls.isEmpty,!Task.isCancelled else {return}
        await withTaskGroup(of:Void.self) { race in
            race.addTask {
                await withTaskGroup(of:Void.self) { downloads in
                    for url in urls { downloads.addTask { _ = try? await URLSession.shared.data(from:url) } }
                    await downloads.waitForAll()
                }
            }
            race.addTask { try? await Task.sleep(for:.milliseconds(600)) }
            await race.next();race.cancelAll()
        }
    }
}

// Hetzelfde vlak in de Stroom en de renderproef: tekst en beeld vervagen samen.
struct RubriekVlak<Content:View>: View {
    @Environment(\.accessibilityReduceMotion) private var still
    let id: String
    let minimumHeight: CGFloat
    var reduceMotion: Bool? = nil
    @ViewBuilder let content: Content
    var body: some View {
        ZStack(alignment: .topLeading) {
            content.frame(minHeight: minimumHeight, alignment: .topLeading)
                .id(id).transition(.asymmetric(insertion: .opacity, removal: .opacity.combined(with: .modifier(active: OudRubriekVlak(hidden:true), identity: OudRubriekVlak(hidden:false)))))
        }.animation((reduceMotion ?? still) ? nil : RubriekWissel.animation,value:id)
    }
}

private struct OudRubriekVlak:ViewModifier {
    let hidden:Bool
    func body(content:Content)->some View {content.allowsHitTesting(!hidden).accessibilityHidden(hidden)}
}
