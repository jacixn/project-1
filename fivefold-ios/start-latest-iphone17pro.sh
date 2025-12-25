#!/bin/bash
set -euo pipefail

# Ensure consistent locale for CocoaPods/tools
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

PROJECT_DIR="/Users/jz/Desktop/guthub/project-1/fivefold-ios"

# Optional: pass --boot-only to just boot the sim without building
BOOT_ONLY="0"
if [ "${1:-}" = "--boot-only" ]; then
  BOOT_ONLY="1"
fi

echo "🚀 Starting Biblely on latest iPhone 17 Pro simulator runtime..."
cd "$PROJECT_DIR"

echo "🧹 Clearing caches..."
rm -rf .expo || true
rm -rf node_modules/.cache || true
rm -rf ios/build || true
TMP_CLEAN="${TMPDIR%/}"
rm -rf "$TMP_CLEAN"/react-* 2>/dev/null || true
rm -rf "$TMP_CLEAN"/metro-* 2>/dev/null || true
echo "✅ Caches cleared"

echo "🔎 Finding latest installed iPhone 17 Pro simulator..."
UDID="$(
python3 - <<'PY'
import json, re, subprocess, sys

out = subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"], text=True)
j = json.loads(out)

best_udid = ""
best_ver = None

for runtime, devices in (j.get("devices") or {}).items():
    m = re.search(r"iOS-(\d+)-(\d+)", runtime)
    if not m:
        continue
    ver = (int(m.group(1)), int(m.group(2)))
    for d in devices or []:
        if d.get("name") != "iPhone 17 Pro":
            continue
        udid = d.get("udid") or ""
        if not udid:
            continue
        if best_ver is None or ver > best_ver:
            best_ver = ver
            best_udid = udid

sys.stdout.write(best_udid)
PY
)"

if [ -z "$UDID" ]; then
  echo "❌ Could not find an available 'iPhone 17 Pro' simulator."
  echo "Open Xcode → Settings → Platforms and install the latest iOS Simulator runtime, then try again."
  exit 1
fi

echo "📱 Using iPhone 17 Pro UDID: $UDID"

# Make sure no other simulators stay running (prevents Expo from targeting the wrong sim)
echo "🧯 Shutting down any other booted simulators..."
xcrun simctl shutdown all 2>/dev/null || true

echo "📱 Booting simulator..."
open -a Simulator || true
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b

if [ "$BOOT_ONLY" = "1" ]; then
  echo "✅ Boot-only mode complete."
  exit 0
fi

echo "🔨 Building and launching app..."
npx expo run:ios --device "$UDID"


