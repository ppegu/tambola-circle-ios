# Current update validation - 21 September 2026

Version 1.0.1 combines the complete visible Trust branding, caller layout fixes, and offline neural voices.

- Launcher/splash icon regenerated with explicit readable fonts. Installed app label and web title are Trust Tambola; loading and sharing text also use Trust.
- Caller layout uses separate rows for the header, speed label/options, previous/current number, and action button. Settings labels shrink/wrap safely, speed options fit at 320 px width, and decorative icon paths no longer clip or fill the sound waves.
- Browser checks covered 320 x 640 settings and manual caller, 390 x 844 automatic caller, and 414 x 896 home. Native Android project generation confirmed Trust Tambola, version 1.0.1, and version code 2.
- 1-9 announce "Single number nine", for example. Two-digit announcements retain the configured digit-to-number pause.
- Both voice packs regenerated as 342 neural PCM clips using Piper: John male and LJ Speech female. Clip transcripts, model provenance, checksums, PCM format, edge padding, and distinct male/female assets are checked automatically. An earlier candidate male voice was rejected after unusually long clips and extra recognized words; it is not included in this release.
- Local speech-recognition spot checks recognized the selected male voice as "80", "single number nine", and "5-9"; female as "Single number nine", "2, 3", and "23". This is a content check, not a substitute for listening on a physical phone.
- The existing Cloudflare Worker now reports service name trust-tambola. Deployed smoke tests passed guest creation, account registration/login, preference synchronization, and test-profile cleanup. Worker version: 3fc721b2-e329-424e-8f4d-b20213adec39.
- Existing Android package ID, storage keys, signing key, database, and API address remain stable for updates and account compatibility. A new API hostname was not deployed: automatic approval review requires explicit approval to copy its authentication secret.

Physical-device installation, audio interruption, airplane-mode playback, and Android system font-size testing remain pending.

Both TypeScript checks and all 24 automated tests passed. The final asset manifest contains exactly 342 verified clips.

The final signed APK build passed in GitHub Actions: https://github.com/ppegu/trust-tambola/actions/runs/35596822579 (13m 2s). Source commit: de047d1a3c370ab9e93f989f1217e8987d62270b. CI confirmed version 1.0.1 / code 2, Trust Tambola launcher labels, the permission allowlist, the release signature, standalone JavaScript, and all 342 WAV assets.

Downloaded APK SHA-256: bb48d88e06914fd1f3f28a68d410c317e7dc8c571752cb3d3d4656a44561f639. Size: 76,427,950 bytes. The downloaded artifact checksum and signing-certificate fingerprint match the build report and previous release key.

Published release: https://github.com/ppegu/trust-tambola/releases/tag/v1.0.1. GitHub confirms this is the latest published release (not a draft), with the APK and four verification reports attached. The uploaded APK digest matches the local SHA-256 above. The repository is private, so downloads require an authorized GitHub account.
