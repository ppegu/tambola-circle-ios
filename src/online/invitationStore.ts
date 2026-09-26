import { AppState } from "react-native";
import type { TableInvitation } from "../../shared/invitations";
import { request } from "../api";
import { createRemoteResource } from "../state/remoteResource";

export const invitationResource = createRemoteResource<TableInvitation[]>([]);
let token: string | undefined;
export function refreshInvitations(fresh = false) {
  const current = token;
  return current
    ? invitationResource.load(
        async () =>
          (
            await request<{ invitations: TableInvitation[] }>(
              "/v2/invitations",
              { token: current },
            )
          ).invitations,
        fresh,
      )
    : Promise.resolve();
}
/** Foreground polling for the in-app inbox. Mobile push is deliberately deferred. */
export function startInvitations(key: string) {
  if (token !== key) invitationResource.reset();
  token = key;
  let timer: ReturnType<typeof setTimeout> | undefined,
    stopped = false;
  const poll = async () => {
    clearTimeout(timer);
    if (
      stopped ||
      AppState.currentState === "background" ||
      AppState.currentState === "inactive"
    )
      return;
    await refreshInvitations();
    if (!stopped) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void poll();
      }, 15000);
    }
  };
  const sub = AppState.addEventListener("change", (state) => {
    clearTimeout(timer);
    if (state === "active") void poll();
  });
  void poll();
  return () => {
    stopped = true;
    clearTimeout(timer);
    sub.remove();
    if (token === key) token = undefined;
    invitationResource.reset();
  };
}
