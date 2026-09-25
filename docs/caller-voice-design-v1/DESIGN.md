# Caller voice selection — UX concept

The mockup was approved and implemented locally. See `IMPLEMENTATION.md` for validation and the user's hold on release builds and Cloudflare upload pending a complete audio review.

## Confirmed product direction

- Aria is the default female caller voice. Bundle its complete number-call pack with both Android APK and iOS IPA so first use works offline.
- Offer Neerja, Ava, Emma and Sonia as optional voice packs hosted on Cloudflare.
- Users can preview each voice, download a complete pack to their device, and select it in Game settings → Caller voice.
- Downloaded packs and the user's selection persist for later use, including offline use.
- These existing five audition files are samples, not complete number-call packs. Complete packs still need generation and verification during implementation.

## Proposed interaction

1. **Game settings:** show Aria as active and included, with a shortcut to Caller voices, a volume slider and Test voice.
2. **Caller voices:** give each voice a Preview action. Aria shows Included and Active. Other voices show Download and the actual download size.
3. **Downloading:** show progress and Cancel download. Keep the active voice working while downloading. Downloading a pack does not automatically select it.
4. **Ready and selected:** after successful download, offer Use voice. An explicit selection makes that voice active. The mockup shows the resulting state after choosing Emma as an example; Aria remains the bundled default for a fresh install and stays available on the device.
5. **Manage downloads:** permit removing optional packs. Keep bundled Aria available. Switching to Aria before removing an active optional pack avoids losing the caller voice.

The image's 12 MB sizes and 64% progress are illustrative. Replace sizes with verified pack metadata in the implementation.

## Implementation considerations to carry forward

- Cloudflare is the asset hosting provider; keep provider and storage details out of the user interface.
- Use complete downloads with integrity verification before showing Ready offline. Interrupted downloads should offer retry without breaking the active pack.
- When offline, allow selecting already downloaded voices. Explain that an internet connection is required for new previews/downloads that are not cached.
- Verify storage availability before downloading. Keep downloaded packs in persistent app-managed storage rather than an evictable temporary cache.
- Do not interrupt a number already being spoken when changing voices; apply the new selection to subsequent calls.
- Check the chosen speech provider's distribution terms before generating and shipping the complete downloadable packs. The current audition source is Microsoft Edge online speech via edge-tts, recorded in each sample's manifest.

## Design artifact

- `caller-voice-flow.png`: four-screen concept, matching the existing purple, cream and gold Tambola Circle style.
- `generation-prompt.txt`: exact image generation prompt.
- Tool: built-in `image_gen.imagegen` (no CLI fallback).

This document records the original design decisions. Current implementation and release status are tracked in `IMPLEMENTATION.md`.
