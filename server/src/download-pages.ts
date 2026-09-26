import { type ReleaseDescriptor } from "../../shared/appAccess";
import { latestRelease, type ReleaseRow } from "./app-access";
import { releaseForOrigin } from "./release-origin";

const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const size = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
const android = (sdk: number) =>
  "Android " +
  ((
    {
      24: "7.0",
      25: "7.1",
      26: "8.0",
      27: "8.1",
      28: "9",
      29: "10",
      30: "11",
      31: "12",
      32: "12L",
      33: "13",
      34: "14",
      35: "15",
      36: "16",
    } as Record<number, string>
  )[sdk] ?? "API " + sdk);
const retired = (row: ReleaseRow) =>
  ["deprecated", "archived", "revoked"].includes(row.status) &&
  row.effective_at <= Date.now();
const publicRelease = (row: ReleaseRow) =>
  row.status !== "draft" && !!row.verified_at;
const notes = (r: ReleaseDescriptor) =>
  `<ul class="notes">${r.notes.map((n) => `<li><span aria-hidden="true">✓</span>${escape(n)}</li>`).join("")}</ul>`;
const details = (r: ReleaseDescriptor) =>
  `<details><summary>File details &amp; SHA-256</summary><dl><dt>Version</dt><dd>${escape(r.versionName)} · Build ${r.versionCode}</dd><dt>Android compatibility</dt><dd>Android API ${r.minSdk}+ · ${escape(r.abis.join(", "))}</dd><dt>File size</dt><dd>${size(r.bytes)} (${r.bytes.toLocaleString("en-IN")} bytes)</dd><dt>Published</dt><dd>${new Date(r.publishedAt).toISOString().slice(0, 10)}</dd><dt>SHA-256</dt><dd class="hash">${escape(r.sha256)}</dd><dt>Signing certificate SHA-256</dt><dd class="hash">${escape(r.signerSha256)}</dd></dl></details>`;
const steps = `<section class="card install"><h2>Install in 3 steps</h2><ol class="steps"><li><h3>Download the APK</h3><p>Tap the Download APK button above.</p></li><li><h3>Allow this source when Android asks</h3><p>Grant permission to install from this source.</p></li><li><h3>Confirm Update or Install</h3><p>Tap Update if you have the app already, or Install if not.</p></li></ol><div class="links"><a href="/help/install-android">Trouble installing?</a><a href="#file-details">APK details and checksum →</a></div></section>`;
function page(title: string, content: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#31065b"><meta name="description" content="Download and update Tambola Circle for Android. Keep your saved data and play with your circle."><title>${escape(title)} · Tambola Circle</title><link rel="stylesheet" href="/assets/updates/site.css"><script src="/assets/updates/site.js" defer></script></head><body><header><a href="/download/android" aria-label="Tambola Circle download"><span class="logo"><img src="/assets/updates/hero.png" alt="Tambola Circle"></span></a><nav aria-label="Main"><a href="/download/android">Download</a><a href="/download/android#release-notes">Release notes</a><a href="/help/install-android">Install help</a></nav></header><main>${content}</main><footer>★ &nbsp; PLAY TOGETHER BRIGHTER &nbsp; ★<p>Tambola Circle · Your people. Your game.</p></footer><p role="status" id="notice" class="toast" hidden></p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
function help() {
  return page(
    "Install your update",
    `<article class="help card"><h1>Install your update</h1><p>Follow these steps on your Android device.</p><ol class="help-steps"><li><h2>Download from this page</h2><p>Tap Download APK and wait for the download to finish. If you started inside Tambola Circle, keep the app open while it downloads.</p><div class="example">↓ &nbsp; Tambola Circle APK<br><small>Download complete</small></div></li><li><h2>Allow this installation source</h2><p>When Android asks, allow installation from the app that opened the APK. That is Tambola Circle for an in-app update, or your browser or file manager for a web download.</p><div class="example">Allow from this source &nbsp; ✓</div><small>Android screens and wording may vary.</small></li><li><h2>Return and tap Update</h2><p>Return to Tambola Circle and tap Install update, or open the downloaded APK. Review Android’s confirmation and tap Update (or Install for a new installation).</p><div class="example">Tambola Circle<br><small>Update this app?</small><strong>Cancel &nbsp; &nbsp; Update</strong></div></li></ol><aside class="saved"><strong>Keep your saved data</strong><p>Install over the current app. Do not uninstall first.</p></aside><h2>Need a hand?</h2><details open><summary>The download stopped</summary><p>Check your connection and free storage. In the app, tap Resume download or Retry download. A failed verification needs a fresh download.</p></details><details><summary>Android did not install the update</summary><p>Return to the app and tap Install update again. Allow installation for the correct source. Keep enough free space for both the APK and the installed app. Android may show an additional safety confirmation; review it before continuing.</p></details><details><summary>The app or signature is incompatible</summary><p>Check the Android compatibility and package details on the release page. Only an APK signed by the same publisher can update your existing app. Do not uninstall to work around a signature conflict. Ask your app administrator for the correct signed release.</p></details><details id="access"><summary>App access or device restrictions</summary><p>Go online and tap Check again in Tambola Circle. If access remains restricted, copy the support reference shown in the app and give it to your app administrator. Installing a new APK does not remove a device restriction. A temporary app lock clears only when service is restored.</p></details><a class="button secondary" href="/download/android">‹ &nbsp; Back to download</a></article>`,
  );
}
async function apk(request: Request, env: Env, match: RegExpMatchArray) {
  const row = await env.DB.prepare(
    "SELECT * FROM app_releases WHERE package_id=? AND version_code=?",
  )
    .bind(match[1], Number(match[2]))
    .first<ReleaseRow>();
  if (!row || !publicRelease(row))
    return page(
      "Download unavailable",
      '<section class="card"><h1>Download unavailable</h1><p>This release has not been published.</p><a class="button" href="/download/android">View latest version</a></section>',
      404,
    );
  const r = JSON.parse(row.descriptor) as ReleaseDescriptor;
  if (retired(row) || r.sha256 !== match[3])
    return page(
      "Release retired",
      '<section class="card"><h1>This version has retired</h1><p>Download the latest version to continue.</p><a class="button" href="/download/android">View latest version</a></section>',
      410,
    );
  const etag = `"${r.sha256}"`,
    range = request.headers.get("Range");
  let offset = 0,
    length = r.bytes,
    partial = false;
  if (
    range &&
    (!request.headers.has("If-Range") ||
      request.headers.get("If-Range") === etag)
  ) {
    const parts = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!parts || (!parts[1] && !parts[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${r.bytes}` },
      });
    offset = parts[1]
      ? Number(parts[1])
      : Math.max(0, r.bytes - Number(parts[2]));
    const end =
      parts[1] && parts[2]
        ? Math.min(Number(parts[2]), r.bytes - 1)
        : r.bytes - 1;
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(end) ||
      offset >= r.bytes ||
      end < offset
    )
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${r.bytes}` },
      });
    length = end - offset + 1;
    partial = true;
  }
  const object =
    request.method === "HEAD"
      ? await env.RELEASES.head(row.object_key)
      : await env.RELEASES.get(row.object_key, { range: { offset, length } });
  if (!object || object.size !== r.bytes)
    return page(
      "Download temporarily unavailable",
      '<section class="card"><h1>We’ll be back soon</h1><p>The APK is temporarily unavailable. Please try again later.</p><a class="button" href="/download/android">Back to download</a></section>',
      503,
    );
  return new Response(
    "body" in object ? (object.body as ReadableStream) : null,
    {
      status: partial ? 206 : 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="TambolaCircle-${r.versionName}.apk"`,
        "Content-Length": String(length),
        ETag: etag,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        ...(partial
          ? {
              "Content-Range": `bytes ${offset}-${offset + length - 1}/${r.bytes}`,
            }
          : {}),
      },
    },
  );
}
export async function downloadRoute(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  if (path.startsWith("/assets/updates/")) {
    const response = await env.WEB_ASSETS.fetch(request);
    return new Response(response.body, response);
  }
  if (path === "/help/install-android") return help();
  const file = path.match(
    /^\/download\/android\/files\/(com\.ppegu\.tambola(?:\.dev)?)\/([1-9]\d*)\/([a-f0-9]{64})\.apk$/,
  );
  if (file) return apk(request, env, file);
  const latest = await latestRelease(env);
  if (path === "/download/android/latest.apk")
    return latest
      ? Response.redirect(
          releaseForOrigin(
            JSON.parse(latest.descriptor) as ReleaseDescriptor,
            url.origin,
          ).url,
          302,
        )
      : page(
          "Coming soon",
          '<section class="card"><h1>Your next game is on its way</h1><p>The Android download is not available yet. Please check back soon.</p></section>',
          503,
        );
  const version = path.match(
    /^\/releases\/android\/([0-9A-Za-z._-]{1,40})$/,
  )?.[1];
  let row = latest;
  if (version)
    row = await env.DB.prepare(
      "SELECT * FROM app_releases WHERE package_id='com.ppegu.tambola' AND json_extract(descriptor,'$.versionName')=? AND status!='draft' ORDER BY version_code DESC LIMIT 1",
    )
      .bind(version)
      .first<ReleaseRow>();
  else if (path !== "/download/android" && path !== "/download/android/")
    return page(
      "Page not found",
      '<section class="card"><h1>Page not found</h1><a class="button" href="/download/android">Back to download</a></section>',
      404,
    );
  if (!row || !publicRelease(row))
    return page(
      "Download coming soon",
      `<section class="card empty"><h1>${version ? "Release unavailable" : "Your next game is on its way"}</h1><p>${version ? "This release link is not available. Check the latest download instead." : "The Android download is not available yet. Please check back soon."}</p><a class="button" href="${version ? "/download/android" : "/help/install-android"}">${version ? "View latest version" : "Installation help"}</a></section>`,
      version ? 404 : 200,
    );
  const r = JSON.parse(row.descriptor) as ReleaseDescriptor,
    old = retired(row),
    current = latest?.version_code === r.versionCode;
  const object = !old ? await env.RELEASES.head(row.object_key) : null;
  const available = object?.size === r.bytes;
  const button = old
    ? '<a class="button" href="/download/android">View latest version</a>'
    : available
      ? `<a class="button" href="${escape(new URL(r.url).pathname)}">↓ &nbsp; Download APK</a>`
      : '<p class="warning">The APK is temporarily unavailable. Please try again later.</p>';
  const badge = `<span class="badge ${old ? "retired" : ""}">${old ? "Release retired" : current ? "Latest stable" : "Older release"}</span>`;
  if (version)
    return page(
      `Version ${r.versionName}`,
      `<article class="release card"><h1>What’s new</h1><div class="links"><h2>Version ${escape(r.versionName)}</h2>${badge}</div>${old ? '<p class="warning">This version has retired. Install the latest version to keep playing.</p>' : ""}${notes(r)}${button}<button class="button secondary" data-share="${escape(url.origin + path)}">Share this release</button>${details(r)}${!current && !old ? '<p class="warning">An older release may require an update. For the best experience, use the latest version.</p>' : ""}<a href="/help/install-android">Installation help</a></article>`,
    );
  return page(
    "Download for Android",
    `<section class="hero"><div class="hero-copy"><h1>Tambola Circle<br><span>for Android</span></h1><h2>Your people. Your game.</h2>${badge}<p class="version">Version ${escape(r.versionName)} &nbsp;•&nbsp; ${size(r.bytes)}</p><p>${escape(android(r.minSdk))} and later</p></div><svg class="hero-art" viewBox="0 50 100 50" role="img" aria-label="Tambola Circle bingo ticket and numbered balls"><image href="/assets/updates/hero.png" width="100" height="100"/></svg><div class="hero-actions">${button}<button class="button secondary" data-copy="${escape(url.origin + "/download/android")}">🔗 &nbsp; Copy download link</button><p>Already installed? Update over your existing app to keep your saved data.</p></div></section>${steps}<section id="release-notes" class="card"><h2>What’s new in ${escape(r.versionName)}</h2>${notes(r)}<a href="/releases/android/${escape(r.versionName)}">View and share this release →</a></section><section id="file-details" class="card">${details(r)}</section>`,
  );
}
