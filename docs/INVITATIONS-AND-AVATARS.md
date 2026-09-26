# Invitations and gallery avatars

Captains can open **Invite a player** from the lobby or Table settings, enter a complete 10-digit mobile number, select a registered profile and send an invitation. Search matches the national-number suffix of the stored international number; it never searches partial numbers or reads device contacts. If multiple profiles match, the Captain chooses the profile by name/avatar. Mobile ownership remains unverified.

The Home and Play online bells open **Invitations**. Pending invitations can be declined or accepted to join the table. The inbox refreshes on opening, pull-to-refresh and every 15 seconds while the app is foregrounded. Invitations persist in D1 across app restarts. OS push notifications remain TODO.

Invites expire after 24 hours. Duplicate sends and repeated accepts are safe. Declining prevents the same table from inviting that person again for 24 hours. The table Durable Object serializes responses with membership changes; only the intended recipient can respond. Rotating the table invite invalidates pending invitations. Removed players cannot rejoin through an invitation. Accepting during a round joins as a spectator. Acceptance never buys tickets or spends coins.

Join-by-code previews display Half/Full ticket prices as informational fee text. Ticket selection still happens in the lobby.

## Gallery photos

Both avatar pickers retain all bundled choices and add **Choose from phone gallery**, a large preview and **Use avatar**. Profile registration/settings and table creation/settings support the same flow.

- Android 13+: system Photo Picker when available; otherwise the system document picker. Older Android: document picker. No broad storage/photo permission is requested.
- iOS: PHPicker grants access to the selected image without requesting whole-library access. No camera/contact access is used.
- Native background processing corrects orientation, crops the center square and encodes a 512px JPEG capped at 256 KiB. Re-encoding removes original EXIF/location metadata.
- Uploads require a recorded device and return an opaque photo ID. The backend checks dimensions, JPEG headers, size and ownership before attaching the photo to a profile/table. Arbitrary URLs are not accepted.
- The private R2 bucket is served through `/v2/avatars/:id.jpg`. Anyone with that opaque image URL can view the shared avatar. Images have immutable caching, and bundled avatars remain visible while photos load or when loading fails.
- Canceling the system picker keeps the current selection. Switching to a bundled avatar clears the custom photo. Original photos and device paths are not stored.

Platform references: [Android selected-document access](https://developer.android.com/training/data-storage/shared/documents-files), [Apple PHPicker](https://developer.apple.com/documentation/photosui/phpickerviewcontroller).

## Backend rollout and validation

Apply additive migration `0012_invitations_avatars.sql`, create R2 bucket `tambola-circle-avatars`, then deploy the Worker with the `AVATARS` binding. Existing app versions can keep using bundled avatar IDs and joining through codes/links.

Local integration: run Wrangler on port 8794 with an isolated persisted state, apply migrations to that state, then run `node scripts/test-invitations.mjs`. The script refuses external destinations by using a fixed localhost URL and uses fictional profiles plus `tests/fixtures/avatar.jpg`.

Unit tests cover photo identity/base64/JPEG validation. Integration checks cover exact search, authorization, recipient isolation, accept/decline retries, revoked invitations, photo ownership, upload limits, cached downloads and avatar propagation. Android must be rebuilt for the new native picker; Metro refresh alone cannot add it. iOS native compilation/device testing requires macOS/Xcode.

Follow-ups: OS push delivery, uploaded-photo deletion/retention tools, and signed-in account recovery remain separate work. Do not overwrite the published 1.5.2 APK; these client features require a subsequent app build.

## Verification on 24 September 2026

- 165 unit tests passed (163-suite run plus 2 focused acceptance-recovery tests); 58 isolated Worker/API assertions passed.
- App/server TypeScript checks and 3 native configuration tests passed.
- Android dev APK compiled and installed over the existing dev app without clearing data. Android and iOS standalone JS bundles and bundled audio assets verified.
- Migration 0012 applied to production and the existing local QA database. Worker version `9f02baef-787d-4295-a8dc-ed1ec4ad9c02` deployed with the avatar bucket; production health and unauthenticated API responses checked.
- Native iOS compilation/picker testing requires Xcode. Physical Android picker/invitation interaction testing was awaiting the owner bringing the dev app past the system overlay; installation alone is not an end-to-end UI test.
