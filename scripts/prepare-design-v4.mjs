// Consolidate original reference bytes; do not regenerate or alter approved art.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
const root = resolve('design-v4');
const v3 = 'artifacts/design-v3-gameplay/screens/';
const recent = 'artifacts/design-v4/';
const approved = 'docs/ui-revision-2026-09-23/';
const rows = [
  ['01-home', 'Game home', 'Start', v3+'01-home.png', 'v3 + copy changes', 'Keep the artwork and shared coin chip. Only Play online and Offline caller remain; remove My tables.'],
  ['02-online-hub', 'Play online', 'Start', v3+'02-online-hub-v3.png', 'Latest hub revision', 'Create/join widgets sit apart from ongoing table cards. History opens separately; pull to refresh only.'],
  ['03-table-history', 'Table history', 'Start', v3+'02-online-history-v1.png', 'Latest history revision', 'Separate history page with card items and pull to refresh. Round details show outcome and called-number board.'],
  ['04-registration', 'Registration & avatar', 'Start', v3+'03-device-number.png', 'v3 + copy changes', 'Use Name, Mobile number and Registration. Fifteen avatars; iOS manual entry; Android selected SIM. Continuing agrees to linked Terms and Privacy Policy. Remove explanatory device text.'],
  ['05-join-table', 'Join a table', 'Start', v3+'04-join-table.png', 'v3 reference', 'Join with an invite link or table code; show real table and player information.'],
  ['06-create-table', 'Create a table', 'Table', v3+'05-table-settings.png', 'v3 + control changes', 'Large centered table avatar replaces the Create table / Private heading. Choose from 20 bundled avatars with a large picker preview. Calls 3–10 seconds, half/full prices and optional scheduled start; no co-host picker before creation.'],
  ['07-table-lobby', 'Table lobby', 'Table', recent+'table-lobby-v2.png', 'Latest approved', 'Use the same coin chip as Home. Compact code/share row, settings beside title, readiness below roster and fixed footer. Hide My tickets when watching.'],
  ['08-ticket-selection', 'Choose tickets', 'Table', v3+'08-ticket-chooser.png', 'v3 + compact controls', 'Half = 3 tickets; Full = 6. Include price in selectors; regenerate/check icon footer. Remove duplicate coin explanation.'],
  ['09-live-game', 'Live game', 'Game', v3+'09-live-game.png', 'v3 + live caller changes', 'Maximize ticket height. One volume badge and native slider; previous call inside Numbers, glowing central number and compact called/left strip. Numbers and Players open native modal stacks with outside-tap dismissal. Manual marking only.'],
  ['10-numbers-board', 'Called numbers', 'Game', v3+'10-numbers-board.png', 'v3 reference', 'Called/remaining totals and history. Icon-only close, modern light board and clear marked states.'],
  ['11-ranked-players', 'Players & progress', 'Game', v3+'11-ranked-players.png', 'v3 + player actions', 'Rank real progress. Player details hold remove, transfer host and co-host actions for the authorized host.'],
  ['12-table-settings', 'Table settings', 'Table', approved+'host-controls.png', 'Approved + later simplification', 'Use this visual styling; merge controls into Table settings. Rules inline, share opens OS sheet, no More options or Back to game. End round appears only during an active round. Player management moves to details.'],
  ['13-auto-verification', 'Verifying a win', 'Game', v3+'13-auto-verification.png', 'v3 reference', 'Server pauses calls and verifies the claim. Everyone sees progress, ticket and called board. No manual review/challenge pipeline.'],
  ['14-round-result', 'Winner / round result', 'Game', v3+'14-verified-winner.png', 'v3 + result variants', 'One result layout for winner, ended, cancelled and unfinished states. Use actual reason, winner, counts and refund status.'],
  ['15-verification-recovery', 'Verification recovery', 'Game', v3+'15-verification-recovery.png', 'v3 reference', 'Explain the actual verification outcome and provide the supported return/resume action; never fabricate a winner.'],
  ['16-wallet', 'Your wallet', 'Wallet', approved+'wallet.png', 'Latest approved', 'Real available and reserved balances, Top up, recent activity and See all. Remove duplicate Transaction history button.'],
  ['17-transactions', 'Transaction history', 'Wallet', approved+'transactions.png', 'Latest approved', 'Backend pagination and filters; real signed amounts, dates and entry/refund status.'],
  ['18-top-up', 'Top up coins', 'Wallet', v3+'16-coins-shop.png', 'v3 + wallet separation', 'Fetch coin plans from the backend. Free test purchase for now. No duplicate history button; real payments and ads remain TODO.'],
  ['19-low-coins', 'Low coin balance', 'Wallet', v3+'17-low-coins.png', 'v3 reference', 'Offer top-up or watching. Balance is server-authoritative; invalid or absent header values display 0.'],
  ['20-preferences', 'Game preferences', 'Settings', v3+'18-game-preferences.png', 'v3 + current settings', 'Native sliders, manual mark preferences, female voice previews, Language and App Updates. No auto-mark or Replay last call.'],
  ['21-end-round', 'End round confirmation', 'Table', v3+'20-end-round.png', 'v3 reference', 'Explicit destructive confirmation with the actual refund behavior; this is distinct from the result screen.'],
  ['22-offline-caller', 'Offline caller', 'Offline', recent+'offline-caller-v2.png', 'Latest approved + speed change', 'App logo, one volume speaker with percentage badge and slider. Direct speed choices 4 / 5 / 7. Light number board, red circles, red Play/Pause, gold current number.'],
  ['23-offline-menu', 'Game paused dialog', 'Offline', recent+'offline-menu.png', 'Latest approved', 'Small native modal: Keep playing, Restart game, Back to home. Restart and Home reset the round.'],
  ['24-caller-voices', 'Caller voice selection', 'Settings', 'docs/caller-voice-design-v1/caller-voice-flow.png', 'Voice workflow reference', 'Female packs with bundled ready-to-play previews. Prepare previews on entry and release on exit. No Replay last call.'],
  ['25-app-updates', 'App update journey', 'Updates', 'docs/android-updates-design-v1/images/01-update-journey.png', 'Update workflow reference', 'Optional update banner, dedicated App Updates screen, explicit download, progress and verified Android installation.'],
  ['26-access-guards', 'Update and access states', 'Updates', 'docs/android-updates-design-v1/images/02-access-guards.png', 'Update workflow reference', 'Required update, app/device restrictions and recovery states use the signed server policy. An APK update does not remove a restriction.'],
  ['27-download-pages', 'Android download pages', 'Updates', 'docs/android-updates-design-v1/images/03-download-pages.png', 'Download workflow reference', 'Public download, release notes and installation help. Version and APK details come from the active release descriptor.'],
  ['a01-original-online-hub', 'Original online hub', 'Archive', v3+'02-online-hub.png', 'Superseded', 'Replaced by the separate create/join widgets and ongoing cards.'],
  ['a02-online-hub-tabs', 'Hub with history tabs', 'Archive', v3+'02-online-hub-v2.png', 'Superseded', 'Ongoing/history tabs were removed in favor of a separate history page.'],
  ['a03-original-host-lobby', 'Original host lobby', 'Archive', v3+'06-host-lobby.png', 'Superseded', 'Replaced by the compact approved lobby and fixed footer.'],
  ['a04-scheduled-player-lobby', 'Original scheduled lobby', 'Archive', v3+'07-player-lobby-scheduled.png', 'Superseded layout', 'The optional scheduled countdown remains, within the latest lobby layout.'],
  ['a05-original-host-controls', 'Original live controls', 'Archive', v3+'12-host-live-controls.png', 'Superseded', 'Controls are merged into Table settings; player actions live in player details.'],
  ['a06-my-tables', 'My tables', 'Archive', v3+'19-my-tables.png', 'Removed screen', 'Removed from Home and routing. Ongoing tables are in Play online.'],
  ['a07-first-caller', 'First offline caller draft', 'Archive', recent+'offline-caller.png', 'Superseded', 'Replaced by the logo header and single volume control design.'],
  ['a08-first-lobby', 'First lobby draft', 'Archive', recent+'table-lobby.png', 'Superseded', 'Replaced by the compact code/title and fixed footer revision.'],
];
mkdirSync(root, { recursive: true });
const screens = rows.map(([id, title, group, source, revision, note]) => {
  const path = `${group === 'Archive' ? 'archive' : 'screens'}/${id}.png`;
  const dest = resolve(root, path);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  const bytes = readFileSync(dest);
  return { id, title, group, status: group === 'Archive' ? 'archive' : 'current', revision, note, path, source, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: createHash('sha256').update(bytes).digest('hex') };
});
const catalog = { version: 4, updated: '2026-09-24', screens };
writeFileSync(resolve(root, 'manifest.json'), JSON.stringify(catalog, null, 2)+'\n');
writeFileSync(resolve(root, 'catalog.js'), `window.DESIGN_CATALOG = ${JSON.stringify(catalog)};\n`);
// A readable offline guide alongside its maintainable Markdown source.
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline = value => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>');
const lines = readFileSync(resolve(root, 'DESIGN_GUIDE.md'), 'utf8').split(/\r?\n/);
let body = '', list = false, table = false, header = false;
for (const line of lines) {
  if (!line.startsWith('- ') && list) { body += '</ul>'; list = false; }
  if (!line.startsWith('|') && table) { body += '</tbody></table></div>'; table = false; }
  if (line.startsWith('|')) {
    if (!table) { body += '<div class="guide-table"><table><thead>'; table = true; header = true; }
    if (/^\|[\s|:-]+$/.test(line)) continue;
    const tag = header ? 'th' : 'td';
    body += '<tr>'+line.split('|').slice(1,-1).map(cell=>`<${tag}>${inline(cell.trim())}</${tag}>`).join('')+'</tr>';
    if (header) { body += '</thead><tbody>'; header = false; }
  } else if (line.startsWith('- ')) {
    if (!list) { body += '<ul>'; list = true; } body += '<li>'+inline(line.slice(2))+'</li>';
  } else if (line.startsWith('## ')) body += '<h2>'+inline(line.slice(3))+'</h2>';
  else if (line.startsWith('# ')) body += '<h1>'+inline(line.slice(2))+'</h1>';
  else if (line.trim()) body += '<p>'+inline(line)+'</p>';
}
if (list) body += '</ul>';
if (table) body += '</tbody></table></div>';
writeFileSync(resolve(root, 'guide.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design v4 guide · Tambola Circle</title><link rel="stylesheet" href="gallery.css"></head><body><header class="hero"><a href="index.html">← Back to the gallery</a> · <a href="DESIGN_GUIDE.md">Markdown source</a></header><main class="guide-copy">${body}</main></body></html>\n`);
console.log(`Consolidated ${screens.length} unmodified images: ${screens.filter(s=>s.status==='current').length} current references, ${screens.filter(s=>s.status==='archive').length} archived revisions.`);
