# C · Bluesky-video volledig scherm

Branch bluesky-video-fullscreen **vanaf B, bluesky-stroom-web 6c3420d**. B is dus inbegrepen. Geen push, merge, distributiebuild of upload; 40/41 niet veranderd.

## Wat is veranderd

Web: standaard video controls, playsInline en een expliciete gelabelde knop Volledig scherm na afspelen. Eerst de standaard fullscreen-API, op Safari waar nodig webkitEnterFullscreen. Bij weigeren een rustige statusmelding. MP4 kan nu ook spelen als de browser geen native HLS ondersteunt; unsupported HLS houdt de verwijzing naar de oorspronkelijke post. Geen extra videobibliotheek. Geen autoplay. Eén speler tegelijk en pauzeren buiten beeld blijven; een fullscreenvideo wordt daarbij niet voortijdig als buiten beeld behandeld.

iOS: dezelfde AVPlayer wordt aan een AVPlayerViewController gekoppeld. Daardoor zijn de systeemknoppen voor volledig scherm, terug en systeemtoegankelijkheid beschikbaar. Geen automatisch fullscreen, afspelen of beeld-in-beeld. Bestaande één-spelerlogica en pauzeren bij verdwijnen blijven. De bestaande projectoriëntaties bevatten liggend links/rechts; geen nieuwe oriëntatielock. Native en web hebben een zwarte videobasis; de systeemspeler krijgt dark appearance, onafhankelijk van de rest van de app.

Een native test vond dat AVKit de viewachtergrond terugzet op clear. Daarom zit het zwart ook op de spelerlaag en de omringende SwiftUI-weergave; het wordt na layout opnieuw bevestigd. Dit is getest, geen screenshotkleurcorrectie.

## Bewijs

- Websuite laatste versie: 1005 geslaagd, nul fouten, één bestaande TODO; totaal 1006. Twee nieuwe tests voor API-fallback en speelbare video/HLS.
- Native suite: 103 geslaagd, nul fouten. Nieuwe test voor speleridentiteit, systeemcontrols, geen autoplay/auto-fullscreen en zwarte laag na layout.
- Na de Dropbox-placeholderstoring productiebuild, build:core en externe harde acceptatie opnieuw geslaagd. Core heeft geen diff. Alle harde drempels groen; zachtere rekentijddoelen blijven op deze drukke Mac niet allemaal gehaald. Geen classificatie gewijzigd.
- Echte lokale webcomponent met een door een knop aangemaakte geluidloze proefclip: eerst expliciet afspelen, daarna Volledig scherm. De browser toont de systeemvideo over het scherm; screenshot [web-systeemfullscreen.jpg](bluesky-video-fullscreen/web-systeemfullscreen.jpg). Escape terug naar de gewone pagina gecontroleerd. Geen echte Bluesky-publicatie gemaakt.
- De gebruikte browser presenteert systeemmediafullscreen zonder dat document.fullscreenElement dit als standaard DOM-fullscreen rapporteert. Het zichtbare systeemscherm is daarom het bewijs; er wordt geen onjuist DOM-fullscreenresultaat geclaimd.

## Nog handmatig toetsen

Native fullscreen openen, naar liggend draaien en terug naar dezelfde post/speler is **niet interactief afgevinkt**. Device Hub was bereikbaar maar gaf slechts een klein overzichtsvenster zonder bruikbare AX-controls; de simulator-unitproef is geen vervanging voor deze klikproef. Ook echte HLS-streams op Safari/iPhone, VoiceOver en de grootste toegankelijkheidstekst blijven de toestelcheck. Geen fysieke iPhone-installatie gedaan.

Claude: eerst B keuren/integreren, daarna alleen C's toevoegingen beoordelen. Bij een cherry-pick de C-commit gebruiken nadat B is overgenomen; niet nogmaals het volledige main…C-pakket én B importeren. De volledige C-patch bevat B als voorwaarde; de aparte C-delta wordt daarnaast geleverd.

Bronnen: [AVPlayerViewController](https://developer.apple.com/documentation/AVKit/AVPlayerViewController), [systeemvideo afspelen](https://developer.apple.com/documentation/avkit/playing-video-content-in-a-standard-user-interface), [showsPlaybackControls](https://developer.apple.com/documentation/avkit/avplayerviewcontroller/showsplaybackcontrols), [automatisch fullscreen bij afspelen](https://developer.apple.com/documentation/avkit/avplayerviewcontroller/entersfullscreenwhenplaybackbegins). Geraadpleegd op 3 november 2026.
