#!/bin/zsh
# Schermafbeeldingen van elk scherm van Hoot op een echte iPhone, voor een audit.
# Opent de app (Debug-build) steeds opnieuw op een ander scherm via de startargumenten uit
# ios/Hoot/DebugLaunch.swift en legt het scherm vast. Licht, donker en heel grote tekst.
# Houd de iPhone ontgrendeld en aan de Mac.
# Gebruik (vanuit de map Hoot-News-App): zsh ios/AppStore/tools/device-screens.sh [toestel]
set -e
DEV=${1:-$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && /connected/ {for (i=1;i<=NF;i++) if ($i ~ /^[0-9A-F]{8}-[0-9A-F]{16}$/) print $i; exit}')}
[[ -n $DEV ]] || { echo "Geen iPhone gevonden"; exit 1; }
OUT=ios/Audit-schermen/$(date +%Y-%m-%d)
mkdir -p $OUT

shot() { # naam, wachttijd, argumenten...
  local name=$1 wait=$2; shift 2
  xcrun devicectl device process launch --terminate-existing --device $DEV nl.hootnews.Hoot -- "$@" >/dev/null 2>&1
  sleep $wait
  xcrun devicectl device capture screenshot --device $DEV --destination "$OUT/$name.png" >/dev/null 2>&1
  echo "  $name"
}

for mode in licht donker groot; do
  extra=()
  [[ $mode == donker ]] && extra=(-HootDark YES)
  [[ $mode == groot ]] && extra=(-HootLargeText YES)
  echo "$mode:"
  shot $mode-01-editie 8 -HootStartTab editie $extra
  shot $mode-02-editie-midden 8 -HootStartTab editie -HootScroll midden $extra
  shot $mode-03-editie-einde 8 -HootStartTab editie -HootScroll onder $extra
  shot $mode-04-verhaal-vergelijken 10 -HootStartTab editie -HootScreen verhaal $extra
  shot $mode-06-stroom 8 -HootStartTab stroom $extra
  shot $mode-08-bronnen 9 -HootStartTab stroom -HootScreen bronnen $extra
  shot $mode-10-digest 9 -HootStartTab digest $extra
  shot $mode-11-digest-midden 9 -HootStartTab digest -HootScroll midden $extra
  shot $mode-12-digest-einde 9 -HootStartTab digest -HootScroll onder $extra
  shot $mode-13-bewaard 6 -HootStartTab bewaard $extra
  shot $mode-15-zoeken-resultaten 8 -HootStartTab zoek -HootQuery kabinet $extra
  shot $mode-17-instellingen 8 -HootStartTab editie -HootScreen instellingen $extra
  shot $mode-18-instellingen-einde 8 -HootStartTab editie -HootScreen instellingen -HootScroll onder $extra
  [[ $mode == groot ]] && continue
  shot $mode-19-instellingen-bronnen 8 -HootStartTab editie -HootScreen instellingen-bronnen $extra
  shot $mode-20-instellingen-vakken 8 -HootStartTab editie -HootScreen instellingen-vakken $extra
  [[ $mode == donker ]] && continue
  shot $mode-05-lezer 14 -HootStartTab editie -HootScreen lezer
  shot $mode-07-stroom-midden 8 -HootStartTab stroom -HootScroll midden
  shot $mode-09-bronnen-einde 9 -HootStartTab stroom -HootScreen bronnen -HootScroll onder
  shot $mode-14-zoeken 6 -HootStartTab zoek
  shot $mode-16-zoeken-niets 7 -HootStartTab zoek -HootQuery xqzwv
  shot $mode-21-wissen-bevestigen 8 -HootStartTab editie -HootScreen instellingen-wissen
  shot $mode-22-offline 8 -HootStartTab editie -HootOffline YES
done
# Terug naar gewoon gebruik.
xcrun devicectl device process launch --terminate-existing --device $DEV nl.hootnews.Hoot >/dev/null 2>&1
echo "Klaar: $OUT"
