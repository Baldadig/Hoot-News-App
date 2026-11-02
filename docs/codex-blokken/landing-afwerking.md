# Landingspagina · pakket klaar voor samenvoegen

Branch **landing-afwerking**, vanaf de gecontroleerde actuele `origin/main` op `78cd0a0` (2 november 2026). Alex vroeg de landingswijzigingen in Git klaar te zetten en merge’t zelf. Geen merge, push naar main of directe productiepublicatie door Codex.

## Inhoud

1. **Meer ademruimte in het rode slotblok en de footer.** Overgenomen uit `landing-footer-ruimte` (`81a908c`, op deze branch `8272717`). Ruimere afstanden tussen kop, uitleg, webknop en kleine tekst; meer ruimte rond logo, navigatie en makersregel. Tablet krijgt een aparte makersregel; mobiel ruimere verticale groepen en omwikkelende links.
2. **Goedgekeurde voordelenrij gebouwd**, commit `5bd2f31`. Bronvergelijking voorop; alleen payoff en begeleidende tekst. Alle drie de koppen op twee regels, dezelfde hoogte en gelijke alineastart. Geen iconen, bronlogo’s, extra labels of geselecteerde streep. Alle scheidingslijnen zijn gelijk en subtiel. Drie kolommen vanaf 960 px, daaronder één kolom. Typografie en kleuren gebruiken de bestaande landingsvariabelen.
3. **Nieuw Selectie-voorbeeld**, commit `f7b4e7c`. Alex koos Werk & organisatie met een scherpere titel. Definitieve voorbeeldkop: **‘Hoe duidelijke afspraken teams sterker maken’**; ondertitel **‘Samenwerken met aandacht’**. Een rustige vectorillustratie van een werkplek met afsprakenbord vervangt het sportbeeld. Het eerdere AI-voorstel is niet overgenomen. De fictieve voorbeeldbron Weekblad Wereld blijft behouden. De mobiele uitsnede toont beeld, kop en bron.

Productwijzigingen uitsluitend `landing/index.src.html` en `landing/hoot.css`. Geen app, Redacteur, serverfunctie, iOS-build of configuratiewijziging. De bestaande signature-animaties en instellingen voor verminderde beweging blijven behouden; landings-JavaScript is bytegelijk aan main.

## Controle

- `npm test`: 999 geslaagd, 0 mislukt, 1 bestaande TODO (1000 totaal).
- `npm run build`: geslaagd; CSS `hoot.99876168.css`, JavaScript ongewijzigd `hoot.f0318c13.js`.
- Gebouwde secties gecontroleerd op 1440, 768, 390 en 320 px; geen horizontale overloop in de gemeten onderdelen. Desktop in Licht en Donker bekeken.
- Voordelen op 1440 px: alle koppen twee regels en begeleidende alinea’s exact dezelfde start (244,52 px binnen het controledocument). Op 320 en 768 px eveneens twee regels per kop. Alle drie de regels 1 px en dezelfde kleur.
- Selectie op 1440/390/320 px: de kop past binnen de telefoonscène. Illustratie en tekst op desktop en mobiel bekeken. Footer op 768/320 px opnieuw bekeken; eerdere volledige footerbeelden zijn meegeleverd.
- Controlebeelden en JSON in `landing-afwerking/`. Het lokale controlevenster toont de daadwerkelijke gebouwde secties, met een link naar de volledige gebouwde pagina: http://127.0.0.1:61229/review.html.
- `git diff --check` schoon. Geen native tests nodig; iOS is ongewijzigd.

## Publiceren en mergen

**Push nog niet uitgevoerd.** `git push -u origin landing-afwerking` stopt met `could not read Username for https://github.com: Device not configured`. De bestaande GitHub Desktop-sessie is geprobeerd, maar de native bediening viel uit met opnamefout -3812, ook na één herstelpoging. Geen nieuwe login of credentials aangevraagd. De branch staat lokaal volledig klaar.

Open in GitHub Desktop de bestaande werkmap **Hoot-beta-integratie**, branch **landing-afwerking**, en kies **Publish branch**. Daarna pas mergen naar main. De gewone werkmap Hoot-News-App staat nog op main. De werkmapkeuze in GitHub Desktop voorkomt dat je de branch probeert uit te checken terwijl die al in de andere werkmap actief is.


Merge **landing-afwerking → main** als één pakket. De footer zit er al in: `landing-footer-ruimte` niet nog apart overnemen. `landing-selectie-tech` evenmin mergen: de AI-inhoud daarvan is vervangen door Werk & organisatie. Het losse voordelenconcept is hiermee naar productcode vertaald; de meest recente controlebeelden staan bij dit pakket.

De app hoeft hiervoor niet opnieuw naar TestFlight. Na de merge kan de bestaande Git/Netlify-route de website bouwen. Controleer daarna op het echte adres de drie onderdelen en kleine mobiele breedte. Alex doet de merge; Claude krijgt deze overdracht voor de woensdagcontrole.
