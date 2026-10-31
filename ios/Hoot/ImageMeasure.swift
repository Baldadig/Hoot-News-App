import SwiftUI

struct ImageMeasure: Codable, Hashable {
    struct Crop: Codable, Hashable { var l: Double; var r: Double; var t: Double; var b: Double }
    var w: Double
    var h: Double
    var crop: Crop
    var ratio: Double
    var valid: Bool {
        [w, h, crop.l, crop.r, crop.t, crop.b].allSatisfy { $0.isFinite } &&
        min(crop.l, crop.r, crop.t, crop.b) >= 0 && w > crop.l + crop.r && h > crop.t + crop.b
    }
    var contentRatio: Double { (w - crop.l - crop.r) / (h - crop.t - crop.b) }
    var portrait: Bool { valid && contentRatio < 4 / 5 }

    func frame(in size: CGSize) -> CGRect {
        let scale = max(size.width / (w - crop.l - crop.r), size.height / (h - crop.t - crop.b))
        return CGRect(x: (size.width - w * scale) / 2 + (crop.r - crop.l) * scale / 2,
                      y: (size.height - h * scale) / 2 + (crop.b - crop.t) * scale / 2,
                      width: w * scale, height: h * scale)
    }
}

struct MeasuredLeadImage: View {
    let item: Item
    let spacious: Bool
    private var measure: ImageMeasure? { item.imageMeta.flatMap { $0.valid ? $0 : nil } }
    private var ratio: CGFloat { measure?.portrait == true ? (spacious ? 3 / 4 : 4 / 5) : 2 }
    var body: some View {
        Color.clear.aspectRatio(ratio, contentMode: .fit)
            .overlay {
                if let measure {
                    GeometryReader { geometry in
                        let rect = measure.frame(in: geometry.size)
                        // Dezelfde pixels als de meting; CDN-varianten kunnen zelf al bijsnijden.
                        AsyncImage(url: item.image.flatMap(URL.init(string:))) { phase in
                            if let image = phase.image {
                                image.resizable().frame(width: rect.width, height: rect.height).offset(x: rect.minX, y: rect.minY)
                            } else { Rectangle().fill(.quaternary) }
                        }
                    }
                } else { RemoteImage(url: ImageURL.url(item.image, .large)) }
            }.clipped().accessibilityHidden(true)
    }
}
