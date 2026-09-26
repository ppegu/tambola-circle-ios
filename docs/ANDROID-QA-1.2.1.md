# Android verification — 22 September 2026

Tested through Wi-Fi ADB on a realme RMX3951, Android 16, 1080×2400 pixels (360×800 logical), using the separate `com.ppegu.tambola.dev` app and Metro. Production app data was preserved. Files, caches, local backend state and captures remained on D:.

The Android number picker returned a device number, but it was not registered. At the user's request, online tests used fictional QA Host, QA Arjun and QA Meera accounts on the isolated local backend. No real SIM number was submitted.

## Device results

| Screen or workflow     | Result                                                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                   | Fixed viewport; all three actions and footer visible. Header handles missing/NaN balances as zero (also checked in compact browser preview).                                                                         |
| Registration           | Name/mobile labels, disabled Android number field, Change/Choose SIM control, Terms agreement, and guest action. Terms and privacy tabs inspected.                                                                   |
| Guest caller           | Red Play/Pause under current number; styled previous badge; padded board fills remaining viewport. Icon-only history dismissal. Calling and replay exercised.                                                        |
| Game preferences       | Mark colour, preview, effects toggles, native voice volume/test, and fixed Done action exercised.                                                                                                                    |
| Coins                  | Backend offers loaded; a free 500-coin test purchase updated balance from 1200 to 1700 and appeared in the ledger. Ready and round charges changed the displayed balance.                                            |
| Private table          | Creation, six-digit join, saved-table rejoin, Half/Full selection, shuffle, strip confirmation, and six-ticket scrolling exercised.                                                                                  |
| Watching host          | No forced ticket or ready action; explicit Play this round option; settings icon in lobby. Ready peers did not start the manual round until host started it.                                                         |
| Live play              | Manual phone marks reached the server; remote marks displayed on a viewed ticket. Arjun ranked above the unmarked player. Number board/history and outside-tap drawer dismissal worked.                              |
| Audio/media keys       | New native player exercised in guest and online rounds. Media key increased music volume 8→9 while ring volume stayed 10, then music was restored to 8. No audio error appeared in the final tested online sessions. |
| Invalid full house     | Incomplete ticket rejected automatically, missing numbers shown, calls resumed.                                                                                                                                      |
| Valid full house       | Round 4 finished after 87 calls; all 15 numbers of Arjun's ticket 2 verified. Phone displayed the same winner and ticket. Peer marks persisted (43 marks across the strip).                                          |
| Disconnect and co-host | Force-stopping only the dev app allowed Arjun to become acting host without stopping calls. Relaunch recovered the account/table; owner reclaimed host controls.                                                     |
| Scheduled start        | Two-minute countdown displayed on the host. Round 5 started automatically with two ready peers.                                                                                                                      |
| End/refund             | Host ended round 5 after 30 calls. Both peers received exactly one 50-coin refund, had zero held coins, and returned to balances of 1050.                                                                            |
| Ownership/leave        | Ownership transferred to Meera; former host lost host-only controls, left, and rejoined by code. Fixed and retested the misleading access-ended warning on voluntary leave.                                          |

Screenshots and backend evidence are under `artifacts/android-qa`. `verified-round.json` and `terminated-round.json` contain the observed round and ledger results. The screenshot gallery contains real device captures, not mock account/table data rendered by the app.

## Automated checks and limits

App and Worker type checks, 60 unit tests, 2 native configuration checks, 9 SQLite coin tests, and 139 local API/WebSocket checks passed. All 90 female clips passed hash, duration and 500 ms inter-part silence validation; the prior speech-recognition audit found no unexpected filler. Responsive previews supplement the native checks; preview fixtures are isolated from the app's backend-backed views.

This is a physical Android pass, not an iPhone runtime test or an exhaustive test of every device, accessibility setting, carrier, and network condition. iOS manual number entry and native audio changes still require an iPhone build/device pass. Payment checkout, advertisements, voice chat, and catalog administration remain deferred; current coin purchases are explicitly free test purchases.
