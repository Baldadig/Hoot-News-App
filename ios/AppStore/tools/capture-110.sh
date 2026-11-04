#!/bin/zsh
# Opnamen voor de App Store-beelden van 1.1.0 (iPhone 6,9" = 1320x2868 en iPad 13" = 2064x2752), licht,
# statusbalk 9:41, plus Nacht. Gebruikt alleen de bestaande simulators "Hoot Pro Max" en
# "iPad Pro 13-inch (M5)". Vanuit Hoot-release-1.1.0 (of Hoot-News-App):
#   APP=pad/naar/Hoot.app FEATURE="id:Rubriek,…" zsh ios/AppStore/tools/capture-110.sh
# Opnamen komen in ios/AppStore/screenshots/raw/ ; daarna: node ios/AppStore/tools/store.mjs
set -e
OUT=ios/AppStore/screenshots/raw-110
mkdir -p "$OUT"
declare -A DEV=( [iphone]=900C1B49-35E5-4251-81B1-B6B155B7B7AF [ipad]=72890E60-1AC8-4B10-B2A8-FDD4753E0EDD )
for name in ${=DEVICES:-iphone ipad}; do
  dev=${DEV[$name]}
  xcrun simctl boot $dev 2>/dev/null || true
  xcrun simctl bootstatus $dev -b >/dev/null
  xcrun simctl ui $dev appearance light
  xcrun simctl status_bar $dev override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularMode active --cellularBars 4 --operatorName ""
  xcrun simctl uninstall $dev nl.hootnews.Hoot 2>/dev/null || true # schone staat; een eerder opgeslagen lege Editie verstoort de opname
  xcrun simctl install $dev "$APP"
  hex() { printf '%s' "$1" | xxd -p | tr -d '\n'; }
  xcrun simctl spawn $dev defaults write nl.hootnews.Hoot hoot.enabled -data $(hex '["nu","rtl","nos-sport","tweakers","vi","wielerflits","sporza","nos-cultuur"]')
  xcrun simctl spawn $dev defaults write nl.hootnews.Hoot hoot.digestFields -data $(hex '["ux","design","ai"]')
  xcrun simctl spawn $dev defaults write nl.hootnews.Hoot hoot.weergave light
  # FEATURE_LEZER: een gratis Nederlands verhaal bovenaan voor de lezer (zonder cookiemuur van de uitgever).
  shot() { fa=(); f=$FEATURE; [[ $1 == lezer && -n "$FEATURE_LEZER" ]] && f=$FEATURE_LEZER; [[ -n "$f" ]] && fa=(-HootFeature "$f")
    xcrun simctl launch --terminate-running-process $dev nl.hootnews.Hoot "${@:2}" "${fa[@]}" >/dev/null; sleep $SLEEP; xcrun simctl io $dev screenshot "$OUT/$name-$1.png" >/dev/null 2>&1; }
  SLEEP=24
  shot editie -HootStartTab editie
  shot verhaal -HootStartTab editie -HootScreen verhaal
  shot stroom -HootStartTab stroom
  shot selectie -HootStartTab digest -HootOnboarded YES # de eerste start na het installeren blijft op het opstartscherm hangen
  SLEEP=4
  shot selectie -HootStartTab digest -HootOnboarded YES
  SLEEP=22
  shot selectie -HootStartTab digest -HootOnboarded YES
  SLEEP=26
  shot lezer -HootStartTab editie -HootScreen lezer
  SLEEP=24
  xcrun simctl spawn $dev defaults write nl.hootnews.Hoot hoot.weergave night
  shot nacht -HootStartTab editie
  xcrun simctl spawn $dev defaults write nl.hootnews.Hoot hoot.weergave light
  xcrun simctl shutdown $dev
done
echo "Klaar: $OUT"
