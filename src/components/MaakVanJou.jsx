// "Maak Hoot van jou" (keuze r5-maak-van-jou-web, 5 november; review G6), gelijk aan MakeItYours in de
// app (ios/Hoot/Views/EditionView.swift). Wie bij het welkom "Liever meteen lezen" koos, krijgt na
// ongeveer een derde van de Editie één keer de uitnodiging om Hoot van zichzelf te maken. Hij zweeft
// onderaan; "Later" is ook een antwoord en dan komt hij niet terug. Kies je, dan opent het welkom bij
// de interesses (met Sluiten); afronden zet hem uit (applyWelcome: browsing = false).

export default function MaakVanJou({ onChoose, onLater }) {
  return (
    <aside className="maakjou" aria-labelledby="maakjou-kop">
      <h2 id="maakjou-kop" className="maakjou__kop">
        Maak Hoot van jou
      </h2>
      <p className="maakjou__tekst">Je leest nu een keuze uit gratis Nederlandse bronnen. Kies je eigen bronnen en interesses, dan wordt dit echt jouw Editie.</p>
      <div className="maakjou__acts">
        <button type="button" className="btn" onClick={onChoose}>
          Kies je bronnen
        </button>
        <button type="button" className="linkbtn linkbtn--plain maakjou__later" onClick={onLater}>
          Later
        </button>
      </div>
    </aside>
  )
}
