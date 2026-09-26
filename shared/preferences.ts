export const SPEEDS = [3, 4, 5, 6, 7] as const;
export type Speed = (typeof SPEEDS)[number];
export type Voice = "classic" | "female";
export const CALL_PAUSES = [0.5, 1, 1.5, 2] as const;
export type CallPause = (typeof CALL_PAUSES)[number];
export type Preferences = {
  auto: boolean;
  speed: Speed;
  sound: boolean;
  voice: Voice;
  callPause: CallPause;
};
export const DEFAULT_PREFERENCES: Preferences = {
  auto: true,
  speed: 4,
  sound: true,
  voice: "female",
  callPause: 1,
};

export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    Object.keys(p).length === 5 &&
    typeof p.auto === "boolean" &&
    typeof p.sound === "boolean" &&
    SPEEDS.includes(p.speed as Speed) &&
    (p.voice === "classic" || p.voice === "female") &&
    CALL_PAUSES.includes(p.callPause as CallPause)
  );
}

export type Profile = {
  id: string;
  kind: "guest" | "user";
  username: string | null;
};
export type CloudState = {
  profile: Profile;
  preferences: Preferences;
  version: number;
};
export type AuthResult = CloudState & { token: string; recoveryCode?: string };
