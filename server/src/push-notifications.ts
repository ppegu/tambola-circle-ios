import { INVITATION_NOTIFICATION_CHANNEL } from "../../shared/pushNotifications";

type PushEnv = Env & { FCM_SERVICE_ACCOUNT_JSON?: string };
type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};
type TokenRecord = { token: string };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const encoder = new TextEncoder();
let cachedAccess:
  { projectId: string; accessToken: string; expiresAt: number } | undefined;
let missingConfigLogged = false;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlText(value: string) {
  return base64Url(encoder.encode(value));
}

async function accessToken(env: PushEnv) {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) return undefined;

  let account: ServiceAccount;
  try {
    account = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  } catch {
    console.error("[push] invalid FCM service account configuration");
    return undefined;
  }
  const projectId = account.project_id,
    email = account.client_email,
    privateKey = account.private_key;
  if (!projectId || !email || !privateKey) {
    console.error("[push] incomplete FCM service account configuration");
    return undefined;
  }
  if (
    cachedAccess?.projectId === projectId &&
    cachedAccess.expiresAt > Date.now() + 60_000
  )
    return { projectId, token: cachedAccess.accessToken };

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64UrlText(
      JSON.stringify({
        iss: email,
        scope: FCM_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join(".");
  const pem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (character) =>
    character.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    console.error("[push] FCM authorization failed", {
      status: response.status,
    });
    return undefined;
  }
  const result = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!result.access_token) {
    console.error("[push] FCM authorization response had no access token");
    return undefined;
  }
  cachedAccess = {
    projectId,
    accessToken: result.access_token,
    expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
  };
  return { projectId, token: result.access_token };
}

export async function sendInvitationPush(
  env: PushEnv,
  invitation: {
    id: string;
    tableId: string;
    tableName: string;
    recipientId: string;
    senderName: string;
  },
) {
  try {
    if (!env.FCM_SERVICE_ACCOUNT_JSON) {
      if (!missingConfigLogged) {
        missingConfigLogged = true;
        console.warn("[push] FCM service account secret is not configured");
      }
      return;
    }
    const tokens = await env.DB.prepare(
      "SELECT token FROM online_push_tokens WHERE player_id=? AND platform='android'",
    )
      .bind(invitation.recipientId)
      .all<TokenRecord>();
    if (!tokens.results.length) return;

    const credentials = await accessToken(env);
    if (!credentials) return;
    await Promise.all(
      tokens.results.map(async ({ token }) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(credentials.projectId)}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${credentials.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token,
                notification: {
                  title: `${invitation.senderName} invited you to play`,
                  body: invitation.tableName,
                },
                data: {
                  type: "invitation",
                  invitationId: invitation.id,
                  tableId: invitation.tableId,
                },
                android: {
                  priority: "HIGH",
                  notification: {
                    channelId: INVITATION_NOTIFICATION_CHANNEL,
                    color: "#8033bd",
                    defaultSound: true,
                  },
                },
              },
            }),
          },
        );
        if (response.ok) return;
        let errorStatus: string | undefined;
        try {
          const body = (await response.json()) as {
            error?: { status?: string };
          };
          errorStatus = body.error?.status;
        } catch {
          await response.body?.cancel();
        }
        if (errorStatus === "UNREGISTERED") {
          await env.DB.prepare("DELETE FROM online_push_tokens WHERE token=?")
            .bind(token)
            .run();
        } else {
          console.warn("[push] FCM delivery failed", {
            status: response.status,
            errorStatus,
          });
        }
      }),
    );
  } catch (error) {
    console.error("[push] invitation notification failed", {
      name: error instanceof Error ? error.name : typeof error,
    });
  }
}
