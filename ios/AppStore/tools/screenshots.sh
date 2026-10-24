#!/bin/zsh
# Schermafbeeldingen voor de App Store, op een rustig nieuwsmoment.
# Maakt de simulators aan als ze er nog niet zijn, zet de statusbalk op 9:41, opent elk tabblad
# (Editie, Stroom, Digest) en bewaart de opnamen; daarna de versies met kop.
# Gebruik (vanuit de map Hoot-News-App): zsh ios/AppStore/tools/screenshots.sh
set -e
OUT=$(mktemp -d)
DD=$(mktemp -d)
xcodebuild -project ios/Hoot.xcodeproj -scheme Hoot -destination 'generic/platform=iOS Simulator' -derivedDataPath "$DD" build -quiet
APP="$DD/Build/Products/Debug-iphonesimulator/Hoot.app"
make() { xcrun simctl list devices | grep -q "$1 (" || xcrun simctl create "$1" "com.apple.CoreSimulator.SimDeviceType.$2" >/dev/null; }
make "Hoot Pro Max" iPhone-17-Pro-Max
make "Hoot iPad 13" iPad-Pro-13-inch-M5-12GB
make "Hoot mini" iPhone-13-mini
for dev in "Hoot Pro Max" "Hoot iPad 13" "Hoot mini"; do
  xcrun simctl boot "$dev" 2>/dev/null || true
  xcrun simctl bootstatus "$dev" -b >/dev/null
  xcrun simctl ui "$dev" appearance light
  xcrun simctl status_bar "$dev" override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularMode active --cellularBars 4 --operatorName ""
  xcrun simctl install "$dev" "$APP"
  n=1
  for tab in editie stroom digest; do
    xcrun simctl launch --terminate-running-process "$dev" nl.hootnews.Hoot -HootStartTab $tab >/dev/null
    sleep 12
    xcrun simctl io "$dev" screenshot "$OUT/${dev// /-}-$n-$tab.png" >/dev/null
    n=$((n+1))
  done
done
for n in 1 2 3; do t=$(echo "editie stroom digest" | cut -d' ' -f$n)
  cp "$OUT/Hoot-Pro-Max-$n-$t.png" "ios/AppStore/screenshots/iphone-6.9/0$n-$t.png"
  cp "$OUT/Hoot-iPad-13-$n-$t.png" "ios/AppStore/screenshots/ipad-13/0$n-$t.png"
done
node ios/AppStore/tools/frames.mjs "$OUT" ios/AppStore
echo "Klaar: ios/AppStore/screenshots/"
