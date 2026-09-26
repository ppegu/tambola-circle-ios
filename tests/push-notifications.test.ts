import { afterEach, describe, expect, it, vi } from "vitest";
import { sendInvitationPush } from "../server/src/push-notifications";
import { INVITATION_NOTIFICATION_CHANNEL } from "../shared/pushNotifications";

afterEach(() => vi.unstubAllGlobals());

describe("Firebase invitation push", () => {
  it("authenticates with the service account and sends a styled Android invite", async () => {
    const keys = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const privateKey = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "short-lived-access-token",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ name: "projects/test/messages/1" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const env = {
      FCM_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: "test-project",
        client_email: "push@test-project.iam.gserviceaccount.com",
        private_key: `-----BEGIN PRIVATE KEY-----\n${Buffer.from(privateKey).toString("base64")}\n-----END PRIVATE KEY-----`,
      }),
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ results: [{ token: "fcm-device-token" }] }),
          }),
        }),
      },
    } as unknown as Env;

    await sendInvitationPush(env, {
      id: "invite-id",
      tableId: "table-id",
      tableName: "Friday game",
      recipientId: "player-id",
      senderName: "Mira",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://oauth2.googleapis.com/token",
    );
    expect(fetchMock.mock.calls[1]![0]).toBe(
      "https://fcm.googleapis.com/v1/projects/test-project/messages:send",
    );
    const sent = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(sent.message.notification).toEqual({
      title: "Mira invited you to play",
      body: "Friday game",
    });
    expect(sent.message.data).toEqual({
      type: "invitation",
      invitationId: "invite-id",
      tableId: "table-id",
    });
    expect(sent.message.android.notification).toEqual({
      channelId: INVITATION_NOTIFICATION_CHANNEL,
      color: "#8033bd",
      defaultSound: true,
    });
  });
});
