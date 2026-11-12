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

extension Item {
    /// De meting, als we het gemeten origineel tonen (ImageURL.measuredOriginal). Bij een variant op maat niet: die
    /// heeft andere pixels (de Volkskrant: 3:2 in plaats van het gemeten vierkant) en zou anders worden uitgerekt.
    var measure: ImageMeasure? { ImageURL.measuredOriginal(self) ? imageMeta : nil }
    /// Met een meting het originele beeld, anders de variant van die maat (uitgever of beeld-CDN).
    func pictureURL(_ kind: ImageURL.Kind) -> URL? {
        ImageURL.measuredOriginal(self, kind) ? image.flatMap(URL.init(string:)) : ImageURL.url(image, kind)
    }
}

struct MeasuredLeadImage: View {
    let item: Item
    let spacious: Bool
    var onFail: (() -> Void)? = nil // laadt niet: de beeldloze vorm (LeadCard), geen grijs vlak
    var landscape: CGFloat? = nil // een vaste verhouding voor een liggend beeld (kaart A+: 3:2); een staand beeld houdt zijn eigen
    private var measure: ImageMeasure? { item.measure }
    private var ratio: CGFloat { item.imageMeta?.portrait == true ? (spacious ? 3 / 4 : 4 / 5) : landscape ?? 2 }
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
                            } else if case .failure = phase {
                                Color.clear.onAppear { onFail?() }
                            } else { Rectangle().fill(.quaternary) }
                        }
                    }
                } else { RemoteImage(url: ImageURL.url(item.image, .large), onFail: onFail) }
            }.clipped().accessibilityHidden(true)
    }
}
