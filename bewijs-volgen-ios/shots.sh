#!/bin/zsh
# Schermafdrukken van Volgen 1.5 op de iPhone, met nepdata (-HootVolgzaken nep, VolgNep.swift), via xcrun simctl.
#   ./shots.sh <toestel-udid> <voorvoegsel> <varianten: licht donker groot> <schermen…>
# De app moet al geïnstalleerd zijn (xcodebuild met eigen -derivedDataPath, xcrun simctl install).
D=$1; PRE=$2; VARS=(${=3}); shift 3
OUT=${0:A:h}
for scherm in "$@"; do
  for v in $VARS; do
    extra=()
    # Donker: het toestel zelf in de donkere stand (de app volgt het systeem), en -HootDark voor de bladen.
    if [[ $v == donker ]]; then extra+=(-HootDark YES); xcrun simctl ui $D appearance dark; else xcrun simctl ui $D appearance light; fi
    [[ $v == groot ]] && extra+=(-HootLargeText YES)
    wacht=17
    case $scherm in
      stroom-voorrang) args=(-HootStartTab editie -HootTabReeks editie,editie,editie,stroom); wacht=24 ;;
      editie-label) args=(-HootStartTab editie -HootScroll rijen) ;;
      zoeken-je-volgt) args=(-HootStartTab zoek) ;;
      zoeken-kop) args=(-HootStartTab zoek -HootQuery "gta 6" -HootScreen volg-zoeken); wacht=19 ;;
      zoeken-bedoel) args=(-HootStartTab zoek -HootQuery "tata" -HootScreen volg-zoeken); wacht=19 ;;
      zoeken-rubriek) args=(-HootStartTab zoek -HootQuery "tech" -HootScreen volg-zoeken); wacht=19 ;;
      zoeken-geen) args=(-HootStartTab zoek -HootQuery "mijn buurman" -HootScreen volg-zoeken); wacht=19 ;;
      zoeken-weinig) args=(-HootStartTab zoek -HootQuery "starship" -HootScreen volg-zoeken); wacht=19 ;;
      pagina) args=(-HootStartTab stroom -HootScreen volg-pagina); wacht=20 ;;
      beheer) args=(-HootStartTab zoek -HootScreen volg-beheer) ;;
      blad) args=(-HootStartTab editie -HootScreen volg-blad) ;;
      inloggen) args=(-HootStartTab editie -HootScreen volg-inloggen -HootVolgLid NO) ;;
      ongedaan) args=(-HootStartTab editie -HootTabReeks editie,editie,editie,stroom -HootScreen volg-ongedaan -HootVolgMelding vast); wacht=24 ;;
      vlag-uit) args=(-HootStartTab zoek) ;;
    esac
    nep=(-HootVolgzaken nep); [[ $scherm == vlag-uit ]] && nep=()
    xcrun simctl launch --terminate-running-process $D nl.hootnews.Hoot $nep -HootOnboarded YES $args $extra >/dev/null
    sleep $wacht
    xcrun simctl io $D screenshot "$OUT/$PRE$scherm-$v.png" >/dev/null 2>&1 && echo "$PRE$scherm-$v.png"
  done
done
xcrun simctl terminate $D nl.hootnews.Hoot 2>/dev/null
