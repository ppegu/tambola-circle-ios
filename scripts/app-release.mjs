/**
 * Operator CLI. Never bundles admin/signing secrets into the app.
 * Run from the repository after dot-sourcing scripts/use-d-drive.ps1 on Windows.
 * inspect <apk> --notes <text file> --out <release.json>
 * publish <apk> --notes <text file> --out <release.json> [--api <origin>]
 * status | audit | devices <UUID> | apply <policy|release-status|block|unblock> <json>
 * provision-secrets  (uploads existing signing material to the configured Worker)
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
const argv = process.argv.slice(2),
  command = argv[0],
  argument = argv[1];
const option = (name) => {
  const i = argv.indexOf("--" + name);
  return i < 0 ? undefined : argv[i + 1];
};
const api = (
  option("api") ?? "https://tambola-circle.ffegu0617.workers.dev"
).replace(/\/+$/, "");
if (!/^https:\/\/[^/]+$/.test(api) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(api))
  throw new Error("Use a secure API origin or local test server.");
const local = api.startsWith("http://127.0.0.1:"),
  wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
function credentials() {
  const data = read(".credentials/update-signing.json"),
    keys = read("shared/update-keys.json");
  if (keys[data.keyId] !== data.publicKey)
    throw new Error(
      "Signing key does not match the public key bundled into the app.",
    );
  return data;
}
async function admin(path, body, method = body ? "POST" : "GET") {
  const response = await fetch(api + "/v2/admin/app/" + path, {
    method,
    headers: {
      Connection: "close",
      Authorization: "Bearer " + credentials().adminToken,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(300000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(path + ": " + data.error);
  return data;
}
function cli(args, input) {
  const result = spawnSync(
    process.execPath,
    [wrangler, ...args, "--config", "server/wrangler.jsonc"],
    {
      encoding: "utf8",
      input,
      stdio: input ? ["pipe", "pipe", "pipe"] : ["inherit", "pipe", "pipe"],
      maxBuffer: 4 * 1048576,
    },
  );
  if (result.status !== 0)
    throw new Error("Wrangler failed: " + result.stderr + result.stdout);
  return result.stdout;
}
function inspect() {
  if (!argument || !existsSync(argument))
    throw new Error("Provide an existing signed APK.");
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (!sdk)
    throw new Error("ANDROID_HOME must point to the existing SDK on D:.");
  const buildTools = join(
    sdk,
    "build-tools",
    readdirSync(join(sdk, "build-tools"))
      .filter((v) => /^\d[\d.]+$/.test(v))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0] ??
      "",
  );
  const apk = resolve(argument),
    aapt = join(buildTools, process.platform === "win32" ? "aapt.exe" : "aapt");
  const java = process.env.JAVA_HOME
    ? join(
        process.env.JAVA_HOME,
        "bin",
        process.platform === "win32" ? "java.exe" : "java",
      )
    : "java";
  const info = execFileSync(aapt, ["dump", "badging", apk], {
    encoding: "utf8",
  });
  const certificate = execFileSync(
    java,
    [
      "-jar",
      join(buildTools, "lib/apksigner.jar"),
      "verify",
      "--verbose",
      "--print-certs",
      apk,
    ],
    { encoding: "utf8" },
  );
  const packageMatch =
    /package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/.exec(
      info,
    );
  const signers = [
    ...new Set(
      [
        ...certificate.matchAll(/certificate SHA-256 digest: ([a-f0-9]{64})/gi),
      ].map((m) => m[1].toLowerCase()),
    ),
  ];
  const signer =
    signers.length === 1 && /Number of signers: 1\b/.test(certificate)
      ? signers[0]
      : undefined;
  const minSdk = Number(/sdkVersion:'(\d+)'/.exec(info)?.[1]);
  const abis = [
    ...(/native-code: ([^\r\n]+)/.exec(info)?.[1] ?? "").matchAll(/'([^']+)'/g),
  ].map((m) => m[1]);
  if (!packageMatch || !signer || !minSdk || !abis.length)
    throw new Error(
      "Could not read verified APK metadata: " +
        JSON.stringify({
          package: !!packageMatch,
          signer: !!signer,
          minSdk,
          abis,
          buildTools,
        }),
    );
  const [, packageId, code, versionName] = packageMatch;
  if (!/^com\.ppegu\.tambola(?:\.dev)?$/.test(packageId))
    throw new Error("Unexpected APK package.");
  if (
    !packageId.endsWith(".dev") &&
    (info.includes("application-debuggable") ||
      signer !==
        "2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071")
  )
    throw new Error(
      "Release must retain the existing production signer and be non-debuggable.",
    );
  if (local && !packageId.endsWith(".dev"))
    throw new Error("Local HTTP publication is only for a debug package.");
  const bytes = statSync(apk).size,
    sha256 = createHash("sha256").update(readFileSync(apk)).digest("hex");
  if (bytes > 350 * 1048576)
    throw new Error("APK exceeds the app download limit.");
  const notesPath = option("notes");
  if (!notesPath)
    throw new Error("Provide --notes with one release note per line.");
  const notes = readFileSync(notesPath, "utf8")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  if (!notes.length || notes.length > 12 || notes.some((n) => n.length > 240))
    throw new Error("Provide 1–12 release notes, at most 240 characters each.");
  const release = {
    id: packageId + "-" + code,
    packageId,
    versionCode: Number(code),
    versionName,
    bytes,
    sha256,
    signerSha256: signer,
    minSdk,
    abis,
    url:
      api +
      "/download/android/files/" +
      packageId +
      "/" +
      code +
      "/" +
      sha256 +
      ".apk",
    notes,
    publishedAt: Date.now(),
  };
  const out = resolve(
    option("out") ?? "artifacts/release-" + versionName + "/release.json",
  );
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(release, null, 2) + "\n");
  writeFileSync(join(dirname(out), "signature.txt"), certificate);
  writeFileSync(join(dirname(out), "apk-info.txt"), info);
  console.log("Verified descriptor: " + out);
  return { release, apk };
}
if (command === "inspect") inspect();
else if (command === "publish") {
  const { release, apk } = inspect(),
    state = await admin("status");
  if (
    state.releases.some(
      (r) =>
        r.package_id === release.packageId &&
        r.version_code === release.versionCode,
    )
  )
    throw new Error(
      "This build already exists. Do not overwrite a published APK.",
    );
  console.log("Uploading verified APK to the configured R2 release bucket…");
  console.log(
    cli([
      "r2",
      "object",
      "put",
      "tambola-circle-releases/android/" +
        release.packageId +
        "/" +
        release.versionCode +
        "/" +
        release.sha256 +
        ".apk",
      "--file",
      apk,
      "--content-type",
      "application/vnd.android.package-archive",
      "--storage-class",
      "Standard",
      ...(local
        ? ["--local", "--persist-to", ".tools/update-test-state"]
        : ["--remote"]),
    ]),
  );
  await admin("releases", { release });
  const policy = (await admin("status")).policies.find(
    (p) => p.package_id === release.packageId,
  );
  await admin("policy", {
    packageId: release.packageId,
    expectedRevision: policy.revision,
    latestBuild: release.versionCode,
    minimumBuild: policy.minimum_build,
    locked: !!policy.locked,
    message: policy.message,
    offlineHours: policy.offline_hours,
    requireMetadata: !!policy.require_metadata,
    reason: "Publish verified optional release " + release.versionName,
  });
  // Verify the public bytes, not merely the upload response.
  const response = await fetch(release.url, {
    signal: AbortSignal.timeout(300000),
  });
  if (!response.ok)
    throw new Error("Published download failed: HTTP " + response.status);
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of response.body) {
    hash.update(chunk);
    bytes += chunk.byteLength;
  }
  if (bytes !== release.bytes || hash.digest("hex") !== release.sha256)
    throw new Error(
      "Public artifact verification failed. Investigate before increasing the mandatory floor.",
    );
  console.log("Published and verified: " + api + "/download/android");
} else if (command === "status" || command === "audit")
  console.log(JSON.stringify(await admin(command), null, 2));
else if (command === "devices") {
  if (!/^[a-f0-9-]{36}$/.test(argument ?? ""))
    throw new Error("Provide a device or player UUID.");
  console.log(JSON.stringify(await admin("devices?id=" + argument), null, 2));
} else if (command === "apply") {
  if (!["policy", "release-status", "block", "unblock"].includes(argument))
    throw new Error("Unknown operator action.");
  console.log(JSON.stringify(await admin(argument, read(argv[2])), null, 2));
} else if (command === "provision-secrets") {
  const data = credentials();
  const stdout = cli(
    ["secret", "bulk"],
    JSON.stringify({
      UPDATE_SIGNING_KEY: data.privateKey,
      UPDATE_KEY_ID: data.keyId,
      UPDATE_ADMIN_TOKEN: data.adminToken,
    }),
  );
  console.log(stdout); // Wrangler reports only secret names, never values.
} else
  throw new Error(
    "Commands: inspect, publish, status, audit, devices, apply, provision-secrets. See scripts/app-release.mjs.",
  );
