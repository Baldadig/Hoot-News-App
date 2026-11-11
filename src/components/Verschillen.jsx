import { verschillenDelen, VERSCHILLEN_LABEL, VERSCHILLEN_VOET } from '../../shared/verschillen.mjs'

// "Waar media verschillen" in Vergelijken (gelijk aan VerschillenSectie in ios/Hoot/Views/EditionView.swift):
// drie korte alinea's (wat iedereen zegt, waar ze verschillen, wat open is) en een voetregel. Geen kaart,
// geen knop: tussen twee lijnen, onder de bronregel. Zonder gekeurd blok niets.
export function Verschillen({ story }) {
  const delen = verschillenDelen(story)
  if (!delen) return null
  return (
    <section className="mv" aria-labelledby={`mv-${story.id}`}>
      <h3 className="label label--kicker mv__label" id={`mv-${story.id}`}>
        {VERSCHILLEN_LABEL}
      </h3>
      {delen.map((d) => (
        <p key={d.soort} className="mv__p">
          {d.tekst}
        </p>
      ))}
      <p className="mv__voet">{VERSCHILLEN_VOET}</p>
    </section>
  )
}
