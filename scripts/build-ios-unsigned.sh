#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'The iOS build requires macOS and Xcode.' >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
shopt -s nullglob
workspaces=(ios/*.xcworkspace)
if [[ ${#workspaces[@]} -ne 1 ]]; then
  echo 'Expected one workspace. Run pod install --project-directory=ios first.' >&2
  exit 1
fi
workspace="${workspaces[0]}"
scheme="$(basename "$workspace" .xcworkspace)"
version="$(node -p 'require("./app.json").version')"
build_number="$(node -p 'require("./app.json").android.versionCode')"
out="$ROOT/artifacts/ios"
logs="$ROOT/artifacts/ios-logs"
build_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/trust-ios.XXXXXX")"
archive="$build_dir/TambolaCircle.xcarchive"
mkdir -p "$out" "$logs" "$build_dir/staging/Payload"

# The public build kit (scripts/sync-public-ios-repo.ps1) carries the app's
# JavaScript already compiled to Hermes bytecode, with its assets, in prebuilt/:
# Xcode then skips Metro and those files are added to the app below.
prebuilt="$ROOT/prebuilt"
skip_bundling=""
if [[ -f "$prebuilt/main.jsbundle" ]]; then
  skip_bundling="SKIP_BUNDLING=1"
fi

# Release embeds the JS and assets. Device SDK + generic iOS excludes simulators.
# No Apple account, provisioning profile, certificate, or team is used in CI.
xcodebuild archive \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$archive" \
  -derivedDataPath "$build_dir/DerivedData" \
  -jobs 3 \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  DEVELOPMENT_TEAM= \
  MARKETING_VERSION="$version" \
  CURRENT_PROJECT_VERSION="$build_number" \
  ${skip_bundling:+"$skip_bundling"} \
  2>&1 | tee "$logs/xcodebuild.log"

apps=("$archive"/Products/Applications/*.app)
if [[ ${#apps[@]} -ne 1 ]]; then
  echo 'Archive must contain exactly one iOS app.' >&2
  exit 1
fi
app="$build_dir/staging/Payload/$(basename "${apps[0]}")"
ditto --norsrc "${apps[0]}" "$app"
if [[ -n "$skip_bundling" ]]; then
  cp "$prebuilt/main.jsbundle" "$app/main.jsbundle"
  if [[ -d "$prebuilt/assets" ]]; then
    ditto --norsrc "$prebuilt/assets" "$app/assets"
  fi
fi

# Remove any linker/ad-hoc signature. Sideloadly signs the app and its frameworks.
if codesign --display "$app" >/dev/null 2>&1; then
  codesign --remove-signature "$app"
fi
ipa="$build_dir/tambola-circle-${version}-ios-unsigned.ipa"
(
  cd "$build_dir/staging"
  zip -q -r -y "$ipa" Payload
)
python3 scripts/verify-ipa.py "$ipa" --output "$out/ipa-info.json"
mv "$ipa" "$out/$(basename "$ipa")"
(
  cd "$out"
  shasum -a 256 "$(basename "$ipa")" > SHA256SUMS.txt
)
# The public build kit has no docs.
if [[ -f docs/IOS-SIDELOAD.md ]]; then
  cp docs/IOS-SIDELOAD.md "$out/INSTALL.md"
fi
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '### Verified unsigned iOS build\n\n' >> "$GITHUB_STEP_SUMMARY"
  printf 'Source: `%s`\n\n' "${GITHUB_SHA:-local}" >> "$GITHUB_STEP_SUMMARY"
  printf 'Device Release IPA with bundled JavaScript and all 90 Aria calls. Four optional voices download from Cloudflare for offline use. Sign and install using Sideloadly.\n\n' >> "$GITHUB_STEP_SUMMARY"
  cat "$out/SHA256SUMS.txt" >> "$GITHUB_STEP_SUMMARY"
fi
