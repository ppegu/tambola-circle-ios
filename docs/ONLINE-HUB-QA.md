# Online hub and History — Android Metro QA

Implemented against `02-online-hub-v3.png` and `02-online-history-v1.png` on 23 September 2026.

- Separate Create and Join widgets; ongoing tables shown directly, without tabs.
- History icon opens a separate card list. Saved round details include the result, called numbers, tickets and marks.
- Native pull-to-refresh only on both lists. No refresh buttons or loading text. Existing cards remain during refresh and errors; an error explains that the user can pull down to retry.
- First-load failures, empty lists and stale-data failures are distinct. Concurrent refresh requests share one request, and late responses cannot update a different account.
- Names, balances, dates, player counts and history come from the API. The banner uses only the decorative part of the approved reference; all controls and data are native views.

## Validation

- App and Worker TypeScript checks passed.
- 69 existing unit tests passed; 3 additional table-list read-model tests passed.
- `npm run test:table-lists`: 37 local API checks passed, including empty lists, player metadata, retained old rounds after starting a new round, saved marks/tickets, and rejection of unauthenticated, unrelated, late-joining and removed players. List/detail responses exclude phone numbers and invite credentials.
- Real Android dev app (`com.ppegu.tambola.dev`), realme RMX3951, 1080×2400. Fictional QA identity only.
- Verified Create, Live/Rejoin and Lobby card states, opening History, reading a completed round and returning to the hub.
- A local proxy delayed list responses by 6.5 seconds and returned 503 errors to verify refreshing, retained cards and recovery on both lists. The temporary proxy was stopped and normal API forwarding restored.
- Final user revision removes the temporary header refresh buttons and all refresh progress text. Native pull-to-refresh remains.

Screenshots are under `artifacts/android-qa/`: `online-hub-final-device.png`, `online-history-final-device.png`, `online-hub-refresh-error.png`, `online-history-refresh-error.png`. Earlier intermediate screenshots may show the subsequently removed refresh controls.

## Development setup

Metro remains on port 8081; the isolated local Worker is on 8791. Both are forwarded to the selected Wi-Fi Android transport. `scripts/android-qa.py` accepts `CIRCLE_QA_DEVICE` and supports mDNS device names containing spaces.

Migration `server/migrations/0008_table_listing.sql` was applied only to `.tools/v3-integration-state`. Apply this migration before a future production Worker deployment. Existing table metadata is filled when the room next archives its state; until then, unavailable counts/avatars are omitted. No production deployment or release build was made for this screen update.
