const encoder = new TextEncoder();
export function randomToken(prefix = ""): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return (
    prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}
export async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(encoder.encode(a), encoder.encode(b));
}
export async function passwordHash(
  password: string,
  salt: string,
  pepper: string,
): Promise<string> {
  // Workers Web Crypto caps PBKDF2 at 100,000 iterations. The independent server
  // pepper also keeps a database-only leak from enabling offline password checks.
  const pepperKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const secret = await crypto.subtle.sign(
    "HMAC",
    pepperKey,
    encoder.encode(password),
  );
  const key = await crypto.subtle.importKey("raw", secret, "PBKDF2", false, [
    "deriveBits",
  ]);
  const result = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100_000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(result), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
