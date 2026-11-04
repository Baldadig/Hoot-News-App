# B · Bluesky uitsluitend in de web-Stroom

3 november 2026. Branch bluesky-stroom-web vanaf main e09202c. Geen iOS-/Redacteur-/accountkern, landing of tokens gewijzigd. Geen push, versie of upload.

## Voor en na

Web had een aparte hoofdbestemming Bluesky, een eigen postlijst en nog een link daarheen bij Bronnen. De Stroom kon posts al toelaten, maar die dubbele plek bleef bestaan. iOS voegt gekozen posts al toe aan store.stream en beheert accounts onder Instellingen; geen aparte hoofdtab. Web toont nu uitsluitend de Stroom; bronbeheer staat rechtstreeks bij Bronnen, niet in een tweede Bluesky-feed of submenu. De oude component is verwijderd.

Bewaarde #/bluesky-links gaan naar de Stroom; een persoonslink behoudt zijn bronfilter, de oude Oekraïne-groep gaat naar Wereld. Die groepslink krijgt dus een bredere hoofdrubriek, geen nieuwe verborgen subrubriek. De gewone Stroom-tabs blijven alleen hoofdrubrieken.

## Gedrag en gegevens

- Eén chronologische lijst met deduplicatie, stabiele gelijke-datumvolgorde, maximaal60posts per sociaal account en de bestaande36uursgrens (plus bestaande5minuut-tolerantie voor toekomstige publicaties).
- Bestaande velden social, bluesky en bskyInStream blijven. Geen databaseschema, accountdata of iOS HootStore aangepast. Ontbrekende oude per-accountkeuzes migreren naar gevolgde accounts. Ontbreekt ook het oude globale veld bij een profiel met gevolgde accounts, dan staat het aan. Expliciet false of expliciet [] blijven uit: bestaande bewuste uitschakeling wordt niet overschreven. Geen echte voorkeuren van Alex gewijzigd.
- Nieuw volgen zet dat account bewust aan in de Stroom. Ontvolgen verwijdert profiel én per-accountkeuze. Uitgeschakelde/onbekende bronnen en een laat terugkerende oude post komen niet alsnog in de lijst.
- Alle bestaande synchronisatievelden blijven in pickSynced; gerichte test controleert de profielpayload. Dit is geen nieuwe echte twee-apparatensyncproef.
- Posts in passende rubrieken uitsluitend op bestaande onderwerpen/bronrubriek, gelijk aan iOS. Niet-getagde eigen posts blijven onder Alles; geen classifier toegevoegd.

## Testbewijs

Gerichte tests17/17. Volledige websuite1003geslaagd, nul fouten, één bestaande TODO (1004totaal). Productiebuild, kern/golden en alle harde externe acceptatiechecks groen; kern en beide fixtures bytegelijk, Jaccard0,32≤0,38. Logs /tmp/hoot-ronde2-B-{tests,build,core,golden,acceptatie}.log. Geen native codewijziging, dus geen afzonderlijke native suite op deze branch.

Echte Stream/Sources/Nav-componenten met expliciet synthetische fixtures:390/768/1280 × Licht/Donker/Nacht,18screenshots en DOMmetingen in bluesky-stroom-web/. Geen horizontale overloop of ontbrekende fixturebeelden; mobiele beelden bekeken. De UI-klikproef telt2posts aan,0na uitschakelen,2na weer aanzetten,0na ontvolgen. Geen dubbele Bluesky-hoofdbestemming in de echte Nav. Geen nieuwe beweging toegevoegd; bestaande reduced-motionregels behouden. Geen volledige gesproken VoiceOver-proef geclaimd.

## Review en integratie

Echte Bluesky-netwerkbeschikbaarheid/alle videocodecs en accountsync blijven aanvullende proeven; dit pakket verandert geen ophaalprotocol. TaakC vertrekt van deze branch en voegt systeem-fullscreen toe. De visuele fixture is geen nieuwe productroute en komt niet in de productie-entry. Oude src/views/Bluesky.jsx niet opnieuw overnemen. Volledige bestaande expliciet uitgezette accounts blijven uit; toevoegen kan bij Bronnen.
