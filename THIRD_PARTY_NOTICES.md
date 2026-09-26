# Third-party notices and asset provenance

- Interface artwork, app icon, gradients, and decorative vectors were created for this project, using the supplied screenshots as visual references. No advertisement, screenshot crop, third-party logo, or extracted game texture is included.
- The female English number-calling WAV pack are generated locally with [Piper 1.8.0](https://github.com/OHF-Voice/piper1-gpl), a GPL-3.0-or-later build tool. The app bundles only the generated PCM audio; Piper, ONNX Runtime, and model weights are not included in the app or Worker. Voice: `en_US-ljspeech-high`. The LJ Speech model card identifies its dataset as public domain. Historical male source assets are unreferenced and not shipped. Model sources, pinned revision, and SHA-256 values are in `scripts/voice-models.json`; bundled audio transcripts and checksums are in `assets/voice/manifest.json`. See [voice provenance](docs/VOICES.md).
- React Native, react-native-svg, and the other dependencies retain their respective licenses. See the installed packages and locked dependency versions in `package-lock.json`.
- The generated `server/worker-configuration.d.ts` includes its upstream Cloudflare/Microsoft copyright and Apache 2.0 notice.

The app uses the user-selected name “Tambola Circle”. Its original vector artwork has been updated to match this branding.

- Native project scaffolding is based on the MIT-licensed React Native Community Template 0.86.0. See `docs/licenses/react-native-template.txt`. The credential adapter retains the prior installed-app storage wire format for update compatibility; no Expo SDK or runtime is included.

The v3 raster game artwork was generated for this project using the approved design concepts as references. The launcher and in-app logo use the same crowned Tambola Circle artwork.

- The rounded game typeface is [Fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka), by the Fredoka Project Authors, distributed under the SIL Open Font License 1.1. Medium and Bold static instances are bundled locally. The license is retained in `docs/licenses/Fredoka-OFL.txt`.
