# Cloudflare service names and migration — 2026-09-24

Production uses the Tambola Circle names. The website and API run in one Worker; there is no separate Pages deployment for this app.

| Service               | Active resource                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Website and API       | `tambola-circle` — https://tambola-circle.ffegu0617.workers.dev                              |
| Android download page | https://tambola-circle.ffegu0617.workers.dev/download/android                                |
| Voice downloads       | `tambola-circle-voices` — https://tambola-circle-voices.ffegu0617.workers.dev                |
| D1                    | `tambola-circle` (`0e6773c3-3908-477c-948d-63ebc8baf2d6`)                                    |
| R2 release APKs       | `tambola-circle-releases` (APAC, private)                                                    |
| Live table storage    | Existing `TableRoom` namespace `d4a3982fb8de4db9a5810f48e7b63575`, owned by `tambola-circle` |

The namespace's original internal display label, `tambola-circle_TableRoom`, remains to preserve the live objects and their data. It is not a public service address. Rate-limit namespace IDs, app package IDs, signing keys, secrets and table IDs are unchanged. Unrelated Cloudflare services were not modified.

## Compatibility

`tambola-circle` and `tambola-circle-voices` are now the canonical Workers. Their service bindings forward to the new Workers, retaining authentication, streams, range requests and WebSocket responses. They do not have their own database, release bucket, table namespace or scheduled jobs.

The server signs release URLs for the caller's trusted API origin, including HTTP access errors and WebSocket access notices. This preserves the Android updater's strict same-origin rule for old and new builds. The public latest-APK redirect also stays on the requested origin. Release descriptors, artifact hashes and package signatures were not rewritten.

App source, native voice-download host checks, local release scripts and Android/iOS CI now use the new origins. Native development installs must be rebuilt when changing the native voice-download host check; Metro alone cannot update native code.

## Deployment

From the repository root on Windows, first dot-source `scripts/use-d-drive.ps1`.

```powershell
npx wrangler deploy --config server/wrangler.jsonc
npx wrangler deploy --config voice-packs/wrangler.jsonc
npx wrangler deploy --config server/legacy-proxy/api.wrangler.jsonc
npx wrangler deploy --config server/legacy-proxy/voices.wrangler.jsonc
```

Deploy the canonical services before their compatibility proxies. The main Worker owns the daily cleanup cron. `MIGRATION_PAUSED` defaults to `false`; the temporary write pause used during copying is over.

## Preservation and rollback

The Workers were renamed by immutable Worker ID, retaining the backend's secrets and Durable Object namespace. Writes and alarms were briefly paused while D1 was exported and imported. At that point there were three lobbies and one finished table, with no running round.

All 19 D1 tables matched by row count and a hash of their complete contents, both before and after export. The new database passed foreign-key and integrity checks. The two R2 APKs were copied without removing their originals. Local migration evidence and the private SQL backup are in ignored `artifacts/cloudflare-migration-2026-09-24/` on D:. Never commit the SQL backup or credentials.

The previous D1 `tambola-circle` (`415a952b-ba96-4c8e-bb9c-c4e050245c33`) and R2 `tambola-circle-releases` are retained as cutover backups. They are not active bindings. They become stale after cutover: do not switch production back to the old database without migrating subsequent writes. For a code rollback, redeploy the previous code while retaining the new resource bindings and compatibility proxies. Do not recreate the table namespace.

## Validation

- TypeScript checks, 142 unit tests and 2 native configuration tests passed.
- Both old and new API hosts passed website/assets, account registration/access, existing table preview, RSA-signed same-origin update and HTTP range-download checks.
- All four pre-existing tables remained accessible from the preserved Durable Object namespace.
- The production smoke test used a fictional QA identity, removed afterward.
- Both public APKs (builds 9 and 10) passed full byte-count/SHA-256 verification through the new backend.
- All 360 downloadable voice files (37,672,794 bytes) and the catalog passed checksums on the new voice origin. A sample from each of the four downloadable packs also passed through the old proxy.
- Production binding checks confirmed the new D1/R2, original table namespace, four secret bindings and disabled maintenance flag.
- Checksum results and deployment evidence are recorded in the migration evidence directory.

Useful checks:

```powershell
node scripts/smoke-deployed.mjs
node scripts/verify-voice-cdn.mjs
```

For the compatibility endpoints, set `APP_PUBLIC_API_URL` or `VOICE_CDN` for the respective command. The smoke script creates and removes only its own synthetic legacy account.
