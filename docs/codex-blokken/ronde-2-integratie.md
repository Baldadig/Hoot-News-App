# H · Ronde 2 gecombineerd

Branch ronde-2-integratie vanaf main e09202c. Alleen A/B/C: 81cbac3 → 1e6ce39, 6c3420d → d60adee, f6e775a → 9731b96. Eén commit per pakket, geen conflicten. C's eerdere B-basis is niet dubbel toegepast. Geen andere voorstel-/audit-/opschoon-/pull-refreshpakketten geïntegreerd.

## Gecombineerde controle

Volledige websuite **1008 geslaagd, 0 fouten, 1 bestaande TODO**. Dat zijn de 1005 van B/C plus A's drie tests. Productiebuild, build:core en alle harde acceptatiedrempels groen; uniekheid 0,32 ≤ 0,38. De gedeelde kern bleef bytegelijk (geen Git-diff). Native suite **103 geslaagd, 0 fouten**. Lokale logs /tmp/hoot-ronde3-H-*.log, samenvattingen onder ronde-2-integratie/. Geen testdrempel of bestaande test verwijderd. Zachtere rekentijddoelen blijven los van de harde acceptatie.

## Echte gezamenlijke browserproef

Twee productiebuilds op localhost: N vanaf main en N1 vanaf deze gecombineerde stand. Alleen HOOT_VERSION verschilt als proeflabel; geen productversie/buildnummer veranderd. Vaste openbare feed aangevuld met één duidelijk synthetische Bluesky-post en een zelfgemaakte stille H264-proefvideo. Geen account of private data gebruikt.

N geladen: tien genummerde verhalen, synthetische instellingen/Bewaard/leesstatus aanwezig. N1-worker volledig geïnstalleerd en geactiveerd terwijl de pagina nog de N-bundel toonde: de open sessie is niet gedwongen herladen. Daarna één gewone volgende laadbeurt: nieuwe N1-bundel, tien nummers en alle proefdata behouden. Zie de drie proof-N*.json-bestanden.

In precies die N1-bouw staat de proefpost tussen het nieuws in de Stroom; geen aparte Bluesky-menulink. Video heeft controls en autoplay=false. Via de post afspelen en systeemfullscreen geopend, zichtbaar vastgelegd in fullscreen-gecombineerd.jpg, Escape terug naar dezelfde Stroom. Daarna dezelfde videospeler aanwezig, duur drie seconden. Zie proof-bluesky-video.json. Dit bewijst B/C samen met A in de vernieuwde productiebuild, geen los componentvenster.

De iframepagina/server zijn localhost-testhulpmiddelen, niet productcode. De videomaker gebruikt de beschikbare AVFoundation-API; de lokale macOS 27-SDK geeft deprecatiemeldingen voor de fixturegenerator. Dat is geen nieuwe API in de app en heeft de proefclip niet verhinderd.

## Grenzen en overdracht

A's contract blijft: nieuwe versie na succesvolle volledige installatie/ontdekking. Een mislukte of onderbroken installatie garandeert niet vanaf het exacte deploymoment een nieuwe bundel. Fysiek geïnstalleerde PWA, echte oude-domeinmigratie en bfcache/terugknop niet opnieuw bediend.

Native fullscreen/draaien/terug is nog niet handmatig als interactie gekeurd; de 103 tests bewijzen spelerconfiguratie en codewerking, geen volledig toestelgebaar. Echte HLS/VoiceOver/AX5 blijven de bestaande native keuring. Apple-tokenintrekking en Redacteur zijn niet aangepast. Alle beschermde bestanden, landing en design-systembronnen ongewijzigd.

I/J/K vertrekken vanaf deze integratiebranch en blijven onafhankelijke pakketten. L blijft vanaf main een conceptbranch. Geen push, merge in main, publicatie, nieuw buildnummer of Apple-upload. De losse pull-to-refresh is uitsluitend als browserconcept aan Alex getoond en zit niet in H.
