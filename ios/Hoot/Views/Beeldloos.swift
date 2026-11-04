import SwiftUI

// Beeldloos (build 46): de vorm van een bericht zonder beeld. Eén plek, voor de app; het web spiegelt
// hem in Beeldloos (src/components/Beeld.jsx). Hij staat waar anders het beeld zou staan: het stuk heeft
// geen beeld, het beeld is te klein voor die plek, of het laadt niet. Nooit een grijs vlak en nooit een
// beeld van een ander artikel.
// Tijdelijk: geen eigen vlak. De tekst neemt de plek in (de kop over de volle breedte), net als voorheen.
// Alex kiest het blijvende ontwerp nog uit zes concepten; dat komt hier, en alleen hier.
struct BeeldloosView: View {
    enum Kind { case lead, tijdlijn, krant }
    let item: Item
    let kind: Kind
    var body: some View { EmptyView() }
}
