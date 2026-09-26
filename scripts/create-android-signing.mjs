// Creates one local signing identity. Never prints or overwrites credentials.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
const dir = path.resolve(".credentials");
const key = path.join(dir, "trust-tambola-release.jks");
const credentials = path.join(dir, "android-signing.json");
if (existsSync(key) || existsSync(credentials))
  throw new Error("Signing material already exists; reuse it.");
mkdirSync(dir, { recursive: true });
const password = randomBytes(32).toString("base64url");
const keytool = process.env.JAVA_HOME
  ? path.join(
      process.env.JAVA_HOME,
      "bin",
      process.platform === "win32" ? "keytool.exe" : "keytool",
    )
  : "keytool";
execFileSync(
  keytool,
  [
    "-genkeypair",
    "-noprompt",
    "-storetype",
    "PKCS12",
    "-keystore",
    key,
    "-alias",
    "trust-tambola",
    "-keyalg",
    "RSA",
    "-keysize",
    "3072",
    "-validity",
    "10000",
    "-dname",
    "CN=Trust Tambola, OU=Mobile, O=Trust Tambola, C=IN",
    "-storepass:env",
    "TAMBOLA_SIGNING_PASSWORD",
    "-keypass:env",
    "TAMBOLA_SIGNING_PASSWORD",
  ],
  {
    env: { ...process.env, TAMBOLA_SIGNING_PASSWORD: password },
    stdio: "pipe",
  },
);
writeFileSync(
  credentials,
  JSON.stringify({ alias: "trust-tambola", password }, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(
  "Created signing key and credentials in ignored .credentials/. Back up this directory securely.",
);
