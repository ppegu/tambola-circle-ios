# Invitation push notifications

Invitation pushes are sent through Firebase Cloud Messaging. Android registration
and the in-app inbox popup are enabled by the app; background delivery requires
the Worker configuration below.

## Firebase and Android

- `android/app/google-services.json` must belong to the same Firebase project as
  the service account used by the Worker.
- Enable the Firebase Cloud Messaging API for that project.
- The app requests Android 13+ notification permission after online sign-in.
- Rebuild and reinstall the Android app after changing the manifest or native
  CircleDevice notification-channel method.

## Cloudflare Worker

Create a Google service account with the Firebase Cloud Messaging API Admin role
for the Firebase project. Store its downloaded JSON as a Worker secret named
`FCM_SERVICE_ACCOUNT_JSON`; do not commit the JSON or paste it into application
logs. Configure it in the Cloudflare dashboard or with Wrangler:

Run this from `server/` so Wrangler uses the Worker configuration:

```text
npx wrangler secret put FCM_SERVICE_ACCOUNT_JSON
```

Apply the D1 migration that creates `online_push_tokens`, then deploy the Worker:

```text
npm run db:remote --workspace server
npm run api:deploy
```

The app registers each authenticated Android FCM token at `/v2/me/push-token`.
The Worker sends pushes only for newly created invitations; FCM failures do not
undo invitations. Invalid/unregistered tokens are removed automatically.

Foreground messages refresh the in-app invitation queue. Background messages
use the high-importance `table_invitations` Android channel and open the
Invitations screen when tapped. The existing in-app popup queue remains
suppressed during active games.

## iOS

iOS push is not enabled by the Android `google-services.json` setup. It requires
`GoogleService-Info.plist`, APNs credentials configured in Firebase, and the
corresponding iOS notification capability/permission setup.
