# Table voice — Game V4 implementation

25 September 2026. The selected transport is **managed Cloudflare Realtime SFU**, with managed TURN fallback. This supersedes the earlier P2P proposal. The approved images remain visual references; they are not evidence of multi-device voice testing.

## V4 screen contract

Latest user direction: two simple binary toggles, identical in the table lobby and live game. This supersedes all earlier popover, three-choice and host-mute proposals.

- Exactly one small mic icon and one small speaker icon at the right of the existing header. No overlay, picker, menu, tooltip, extra audio icons or text buttons. Keep V4 purple/gold styling, settings access, main title, current call, full-width tickets and lobby footer clear.
- Each tap immediately toggles only that control. Crossed icon means muted; normal icon means unmuted. Use shape as well as color. Small 24–28 logical-pixel artwork sits in nonoverlapping 44–48 logical-pixel touch targets. Accessible labels announce current state and next action, without visible helper UI.
- Phone mic defaults MUTED on every fresh table session. Tap once to unmute your phone mic: all connected table participants with their speakers enabled can hear you. Tap again to mute your phone mic. It never controls anyone else's microphone.
- Speaker defaults UNMUTED, honoring saved volume levels. Tap once to mute all incoming table voice and number announcements locally; tap again to unmute all and restore those levels. This retains the previously confirmed all-audio scope. Other non-caller sound effects retain their separate preference. It does not change the phone's system-wide volume or anyone else's playback.
- Mic and speaker are independent. Muting the speaker does not mute your mic: others can still hear you if your mic remains enabled. The two icons always expose these independent states.
- First mic-unmute requests OS microphone permission if needed. Until permission, connection and capture succeed, the effective mic remains muted. Denial/failure leaves it muted and gameplay usable. No microphone permission on merely viewing the table. A mandatory OS permission prompt is the only first-use exception to direct toggling; no app picker is introduced.
- Table voice joins receive-only with capture off; verify actual no-capture behavior on both native platforms. Keep one table-scoped service across lobby, live game, results and next round. Preserve mute settings across these transitions and brief reconnects. Leaving the table stops tracks and closes voice connections. Returning from background or an OS interruption leaves the mic muted until tapped again.
- No host mute-all, individual-player mute or voice options panel in this first version. These are deferred by the user's simplified scope. Authorization still prevents removed/nonmember users from joining voice.
- Use guarded async transitions: a second tap to mute cancels an in-flight unmute; late permission/connection callbacks must never turn capture on against current intent. Do not show an unmuted mic if publishing failed. Apply the speaker mask before any reconnect audio or caller replay. Voice failures must not block tickets, calling or claims.

| Control   | Muted                                                            | Unmuted                                             |
| --------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| Phone mic | Default; no outgoing voice                                       | Your voice goes to everyone listening at this table |
| Speaker   | All incoming table voice and number announcements silent for you | Incoming audio restored at saved levels             |

State model: independent `micMuted` and `speakerMuted` booleans plus actual permission/capture/connection status and saved audio levels. Keep volume preferences intact; speaker mute is a playback mask, not a destructive zero-volume write. No third state, host speaking policy or individual mute list is required. Mic defaults muted, speaker defaults unmuted for a fresh session. Existing saved zero volume remains zero when the speaker is unmuted.

## Implemented architecture

- `react-native-webrtc@124.0.7`, audio only. One publishing and one receiving peer connection per phone. No camera, recording, transcription, P2P mesh, host moderation or individual mute menu.
- Retained `ApplicationServices` owns `src/voiceChat/runtime.ts`, separate from table screen mounts. One session spans lobby/game/next round. Leaving, backgrounding, lost table connection and audio interruption close native capture; recovery defaults to mic muted.
- `VoiceController` serializes negotiation, checks cancellation after every asynchronous publishing step, and applies receiver mute before applying offers. Microphone permission is requested only after an unmute tap. Failure remains muted and does not stop gameplay.
- The speaker switch applies a transient receive/caller mask. It does not modify saved caller volume or the other phone's audio. Announcement replay also checks the mask.
- Native audio coordination selects Android communication mode/audio focus and iOS PlayAndRecord/VoiceChat while chat has a peer. Caller playback preserves the chat session. Physical-device route/interruption validation remains required, especially Bluetooth and iOS.
- Authenticated `POST /v2/tables/:id/voice` authorizes current table membership. A separate SQLite `VoiceRoom` Durable Object keeps provider latency outside the game command queue. It owns SFU session IDs and selects subscriptions; clients cannot supply arbitrary remote session/track IDs.
- Each admitted phone has a 45-second renewable lease; roster polling is every 5 seconds. New speakers can take one poll plus negotiation to become audible. Failed sessions retry with backoff. Only fully connected publishers become discoverable.
- Initial voice admission cap: 16 people per table, including spectators. Gameplay is unaffected by this cap. Server validates audio-only bounded SDP and rejects video/data channels. Existing per-player API rate limits apply.
- Muting closes the local publishing connection immediately. Expiry, removal and superseded sessions are retired durably and reclaimed by 15-second alarms in bounded batches. Failed provider cleanup retains identifiers and retries. Revocation of a malicious client's already-established media is eventual, not instantaneous; cleanup backlog/provider outages can delay it.

## Cloudflare setup and operation

The Worker has the additive `VOICE_ROOMS` binding and `v2-voice` SQLite DO migration. No game database migration is needed. Four **Worker-only secrets** are required:

| Secret           | Source                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `SFU_APP_ID`     | Dedicated Realtime SFU app ID                                           |
| `SFU_APP_SECRET` | That app's secret                                                       |
| `TURN_KEY_ID`    | Dedicated Realtime TURN key ID                                          |
| `TURN_API_TOKEN` | TURN key's bearer credential (not the general Cloudflare account token) |

Store local values in ignored `server/.dev.vars`; set deployment values with `wrangler secret put NAME`. Never put them in `APP_PUBLIC_*`, commit them, or print them. `VOICE_ENABLED=true` only activates voice when all four are configured. Missing configuration returns `available:false`; local speaker control and gameplay still work. Set `VOICE_ENABLED=false` and redeploy to stop admissions and retire current rooms on their cleanup alarm.

Deploy from `server` with the existing authenticated Wrangler workflow, after tests/dry run. Rebuild Android and run CocoaPods/Xcode for iOS: this native dependency cannot ship as a JavaScript-only update. Existing release signing and saved app data remain unchanged.

## Free-start costs

Cloudflare currently includes **1,000 GB/month shared across SFU and TURN**, then charges **$0.05/GB egress**. Workers/DO/storage are separate; other SFU apps on the same account share the allowance. There is no automatic account-wide spending cap in this implementation. Check account analytics before enabling a broader rollout and disable voice before exhausting available allowance if zero spend is required. No paid plan upgrade is required by this implementation.

Audio publisher bitrate is capped at 32 kbit/s where the native sender exposes encodings. Actual transport overhead, codec behavior and TURN add traffic. For illustration only, budgeting 50 kbit/s per delivered stream yields 0.1125 GB per hour for one speaker and five listeners, or 0.675 GB per hour for six continuously speaking participants. Speaker mute alone does not stop subscriptions or guarantee lower billing.

TURN credentials last one hour and are renewed when a voice session rejoins. A failed connection is replaced rather than reusing uncertain SDP state; capture stays muted until the user taps again. Cloudflare receives live encrypted-transport media; this is not participant-to-participant end-to-end encryption.

Sources: [SFU connection patterns](https://developers.cloudflare.com/realtime/sfu/get-started/connection-patterns/), [Connection API](https://developers.cloudflare.com/realtime/sfu/api/), [pricing](https://developers.cloudflare.com/realtime/sfu/platform/pricing/).

## Verification and release gate

Automated tests cover default-muted join, independent switches, speaker masking before offers, cancellation during permission/connection, readiness, stale device sessions, partial provider allocations, expiry/removal and cleanup retries, plus rejection of video/data SDP. Run `npm run check`, `npm run bundle:native`, Worker dry run, and native Android build.

Before claiming production voice reliability: test two real phones on separate Wi-Fi/mobile networks, forced TURN, both directions, full speaker mute including announcements/replay, denied permission, repeated taps, lobby→game, background/return, phone-call interruption, wired/Bluetooth routes, kick/leave and provider failure. iOS needs a Mac/Xcode native build and a physical iPhone. Do not mark these manual checks passed based on TypeScript, mocks or bundle generation.
