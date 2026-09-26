import { isPreferences, type CloudState } from "../shared/preferences";
import { PUBLIC_API_URL } from "./config";
import { accessHeaders, dispatchAccess } from "./updates/events";
import { publicAppUrl } from "../shared/publicLinks";
export const API_URL = publicAppUrl(PUBLIC_API_URL);
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public data?: unknown,
  ) {
    super(message);
  }
}
export function isCloudState(data: unknown): data is CloudState {
  if (!data || typeof data !== "object") return false;
  const d = data as CloudState;
  return (
    isPreferences(d.preferences) &&
    Number.isSafeInteger(d.version) &&
    d.version >= 0 &&
    !!d.profile &&
    typeof d.profile.id === "string" &&
    ["guest", "user"].includes(d.profile.kind)
  );
}
export async function request<T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  if (!API_URL)
    throw new ApiError(
      "Cloud sync is not connected. Everything is saved on this device.",
    );
  if (!API_URL.startsWith("https://") && !__DEV__)
    throw new ApiError("Cloud sync requires a secure HTTPS connection.");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 10_000,
  );
  try {
    const response = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      signal: controller.signal,
      headers: {
        ...accessHeaders(),
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = await response.json();
    if (!response.ok && data.access) await dispatchAccess(data.access);
    if (!response.ok)
      throw new ApiError(
        response.status >= 500
          ? "Could not connect. Please try again."
          : typeof data.error === "string"
            ? data.error
            : "Could not connect.",
        response.status,
        data,
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "No connection. Your game and preferences are saved on this device.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
