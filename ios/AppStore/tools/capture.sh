#!/bin/zsh
# Opnamen voor de App Store-beelden (iPhone 6,9" en iPad 13"): Editie, Vergelijken, het einde van de
# editie, Digest en de lezer, licht, statusbalk 9:41. De opnamen komen in
# ios/AppStore/screenshots/raw/; daarna maakt store.mjs de opgemaakte versies.
# Kies op de dag zelf neutrale of positieve echte verhalen (verhaal-id's uit /api/feed?deel=start):
#   FEATURE="s19u8ade:Cultuur,s1hzionf:Tech,…" zsh ios/AppStore/tools/capture.sh
# Het eerste verhaal is het hoofdverhaal en het verhaal in Vergelijken.
set -e
OUT=ios/AppStore/screenshots/raw
mkdir -p "$OUT"
DD=$(mktemp -d)
xcodebuild -project ios/Hoot.xcodeproj -scheme Hoot -destination 'generic/platform=iOS Simulator' -derivedDataPath "$DD" build -quiet
APP="$DD/Build/Products/Debug-iphonesimulator/Hoot.app"
make() { xcrun simctl list devices | grep -q "$1 (" || xcrun simctl create "$1" "com.apple.CoreSimulator.SimDeviceType.$2" >/dev/null; }
make "Hoot Pro Max" iPhone-17-Pro-Max
make "Hoot iPad 13" iPad-Pro-13-inch-M5-12GB
for dev in "Hoot Pro Max" "Hoot iPad 13"; do
  xcrun simctl boot "$dev" 2>/dev/null || true
  xcrun simctl bootstatus "$dev" -b >/dev/null
  xcrun simctl ui "$dev" appearance light
  xcrun simctl status_bar "$dev" override --time "9:41" --batteryState discharging --batteryLevel 100 --wifiBars 3 --cellularMode active --cellularBars 4 --operatorName ""
  xcrun simctl install "$dev" "$APP"
  # Gratis Nederlandse bronnen aan (staan standaard uit): die krijgen voorrang in de beelden.
  xcrun simctl spawn "$dev" defaults write nl.hootnews.Hoot hoot.enabled -data $(printf '%s' '["nu","rtl","nos-sport","tweakers","vi","wielerflits","sporza","nos-cultuur"]' | xxd -p | tr -d '\n')
  name=${dev// /-}
  fa=(); [[ -n "$FEATURE" ]] && fa=(-HootFeature "$FEATURE") # twee losse argumenten (zsh splitst niet vanzelf)
  shot() { xcrun simctl launch --terminate-running-process "$dev" nl.hootnews.Hoot "${@:2}" "${fa[@]}" >/dev/null; sleep $SLEEP; xcrun simctl io "$dev" screenshot "$OUT/$name-$1.png" >/dev/null; }
  SLEEP=14
  shot editie -HootStartTab editie
  shot verhaal -HootStartTab editie -HootScreen verhaal
  shot einde -HootStartTab editie -HootScroll onder
  shot stroom -HootStartTab stroom
  shot digest -HootStartTab digest
  SLEEP=24
  shot lezer -HootStartTab editie -HootScreen lezer
  xcrun simctl shutdown "$dev"
done
echo "Klaar: $OUT"
