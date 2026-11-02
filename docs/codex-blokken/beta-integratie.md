# Beta-integratie · overdracht aan Claude

Status: in uitvoering. Basis main 0a209da; werkbranch beta-integratie. Geen releasevrijgave.

## Grenzen

Alleen lokaal integreren, testen, committen en beta-installatie op het aangewezen testtoestel. Geen push, main-merge, deploy, upload, versie-/buildnummerwijziging of schrijven naar Netlify/Apple/Supabase. landing blijft bytegelijk aan main. Build 40 vereist een volgende expliciete opdracht.

## Volgorde en controlelog

A: beveiliging → rustige voorpagina → editiekop/deelkaart → lezer-wachttekst + paneeldelta → onboarding → Stroom/Selectie → nummering → categoriegegevens/docs → Nacht + aparte native profielkoppeling. Daarna B: bundelgrens, bronweging, intro/balans, onderwerp-land, toelating/aanvulling, filler, waarom/eindkaart en lokale feedback. Daarna C: audit/klikcontroles; D: lokale telefoonbeta en testlijst.

Alleen V2a wordt gebruikt voor ontwikkeling/meting. V2b is verzegeld en wordt niet ingezien of gescoord bij het afstellen. De bestaande acceptatiemaat uniekheid is Jaccard-overlap: lager is beter; grens nu maximaal 0,38, niet verruimen.

Per stap komen broncommits, conflictoplossing en echte testresultaten hieronder. Niet-uitgevoerde proeven worden niet als geslaagd vermeld.

### A01 · Beveiliging

Broncommit 3ec9058 overgenomen als 24a05a5; geen conflict. Sessiegeneratie/accountgrens en Sharp 0.35.5 overgenomen. Eigen node_modules met npm ci uit de lockfile: de voorgeschreven gedeelde symlink wees nog op Sharp 0.33.5 en is daarom vervangen zonder Main-dependencies te veranderen. Runtimeversie lokaal werkelijk 0.35.5. Web 906 geslaagd + 1 TODO, build groen; native 59 geslaagd; acceptatie alle harde drempels gehaald. Core opnieuw gebouwd zonder wijziging. Linux/Netlify cold-start blijft een externe releasecontrole, niet uitgevoerd of gedeployd. [Logverwijzingen](beta/controle-A01.json).
