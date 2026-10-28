#!/bin/zsh
# Opnamen voor de App Store-beelden (iPhone 6,9" en iPad 13"): Editie, Stroom, Lezer, Vergelijken en
# Digest, licht, statusbalk 9:41. De opnamen komen in ios/AppStore/screenshots/raw/; daarna
# maakt frames.mjs de opgemaakte versies.
# Gebruik (vanuit de map Hoot-News-App): zsh ios/AppStore/tools/capture.sh
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
  xcrun simctl status_bar "$dev" override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularMode active --cellularBars 4 --operatorName ""
  xcrun simctl install "$dev" "$APP"
  name=${dev// /-}
  shot() { xcrun simctl launch --terminate-running-process "$dev" nl.hootnews.Hoot "${@:2}" >/dev/null; sleep $SLEEP; xcrun simctl io "$dev" screenshot "$OUT/$name-$1.png" >/dev/null; }
  SLEEP=12
  shot editie -HootStartTab editie
  shot stroom -HootStartTab stroom
  shot digest -HootStartTab digest
  shot verhaal -HootStartTab editie -HootScreen verhaal
  SLEEP=22
  shot lezer -HootStartTab editie -HootScreen lezer
  xcrun simctl shutdown "$dev"
done
echo "Klaar: $OUT"
