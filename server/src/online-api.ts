import { assertAvatarOwner, avatarImage, uploadAvatar } from './avatar-photos';
import { isVoiceRequest } from '../../shared/tableVoice';
import { listInvitations } from './invitations';
import { isInviteMobile } from '../../shared/invitations';
import { isAvatarId } from '../../shared/avatars';
import { DEFAULT_TABLE_CONFIG, validConfig, validTableCreationOptions, type OnlineProfile, type RoomCommand } from '../../shared/online';
import { secureInt } from '../../shared/tickets';
import { randomToken, sha256 } from './security';
import { RoomError } from './room-engine';
import { isDeviceUuid } from '../../shared/device';
import { recordDevice, type DeviceRow } from './device-records';
import { deviceForKey, enforceDevice, enforcePlayer, evaluateDevice, signAccess } from './app-access';
import { wallet, walletTransactions, testPurchase, coinCatalog } from './wallet';
import { getPastGame, listPastGames, listTables } from './table-listings';

type PlayerRow = { id: string; name: string; mobile: string; mobile_source: 'device_selected' | 'manual_ios'; avatar_photo: string | null; avatar_id: number | null };
const profile = (p: PlayerRow): OnlineProfile => ({ id: p.id, name: p.name, ...(isAvatarId(p.avatar_id) ? { avatarId: p.avatar_id } : {}), avatarPhoto: p.avatar_photo ?? undefined, mobile: p.mobile, mobileSource: p.mobile_source, verificationStatus: 'unverified' });
const json = (value: unknown, status = 200) => Response.json(value, { status });
async function body(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new RoomError(415, 'Use application/json.');
  const reader = request.body?.getReader();
  if (!reader) throw new RoomError(400, 'Missing request body.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RoomError(413, 'Request is too large.'); } chunks.push(next.value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value as Record<string, unknown>;
  } catch { throw new RoomError(400, 'Invalid JSON.'); }
}
async function limited(env: Env, key: string, auth = false) {
  if (!(await (auth ? env.AUTH_LIMITER : env.API_LIMITER).limit({ key: await sha256(key) })).success) throw new RoomError(429, 'Too many requests. Please wait.');
}
async function authenticate(request: Request, env: Env): Promise<OnlineProfile> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!/^d_[a-f0-9]{64}$/.test(token)) throw new RoomError(401, 'Sign in on this device to play online.');
  const row = await env.DB.prepare('SELECT id,name,mobile,mobile_source,avatar_id,avatar_photo FROM online_players WHERE device_hash=?').bind(await sha256(token)).first<PlayerRow>();
  if (!row) throw new RoomError(401, 'This device is not registered.');
  await limited(env, 'online:' + row.id); await enforcePlayer(env, row.id); return profile(row);
}
export async function onlineRoute(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  const photoMatch = path.match(/^\/v2\/avatars\/([a-f0-9-]{36})\.jpg$/);
  if (photoMatch && method === 'GET') return avatarImage(env, photoMatch[1]!);
  if (path === '/v2/avatars' && method === 'POST') {
    const key = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    if (!/^d_[a-f0-9]{64}$/.test(key)) throw new RoomError(401, 'Open the app before choosing a photo.');
    const device = await deviceForKey(env, key);
    if (!device) throw new RoomError(401, 'Open the app before choosing a photo.');
    await enforceDevice(env, device); await limited(env, 'avatar:' + await sha256(key), true);
    return uploadAvatar(request, env, await sha256(key));
  }
  if (path.startsWith('/invite/') && method === 'GET') {
    const parts = path.split('/'), id = parts[2] ?? '', token = parts[3] ?? '';
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(token)) throw new RoomError(404, 'Invite unavailable.');
    const link = `tambolacircle://join?table=${id}&invite=${token}`;
    return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><title>Join Tambola Circle</title><style>body{font:20px system-ui;background:#290435;color:#fffaf2;text-align:center;padding:12vh 24px}a{display:inline-block;background:#efd080;color:#290435;padding:18px;border-radius:14px;font-weight:700}p{max-width:480px;margin:28px auto}</style><h1>Tambola Circle</h1><p>Your people. Your game.</p><a href="${link}">Open table in Tambola Circle</a><p>Open this invite on a device with the app installed. Device sign-in is required to join.</p>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'Referrer-Policy': 'no-referrer' } });
  }
  if (path === '/v2/devices/open' && method === 'POST') {
    await limited(env, 'device-open-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'));
    const key = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    const recorded = await recordDevice(env, key, await body(request));
    const device = await deviceForKey(env, key);
    const decision = device ? await evaluateDevice(env, device) : null;
    return json({ ...recorded, ...(decision && device!.access_capability >= 1 ? { access: await signAccess(env, decision, new URL(request.url).origin) } : {}) });
  }
  if (path === '/v2/device' && method === 'POST') {
    const b = await body(request);
    await limited(env, 'device-ip:' + (request.headers.get('CF-Connecting-IP') ?? 'local'), true);
    if (typeof b.deviceKey !== 'string' || !/^d_[a-f0-9]{64}$/.test(b.deviceKey) || typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 40 ||
      typeof b.mobile !== 'string' || !/^\+[1-9]\d{7,14}$/.test(b.mobile) || b.consent !== true || (b.source !== 'device_selected' && b.source !== 'manual_ios')) throw new RoomError(400, 'Provide a mobile number with country code, your name and agreement to the terms and privacy policy.');
    if (b.avatarId !== undefined && !isAvatarId(b.avatarId)) throw new RoomError(400, 'Choose an avatar from the gallery.');
    const hash = await sha256(b.deviceKey);
    await assertAvatarOwner(env, b.avatarPhoto, hash);
    const device = await env.DB.prepare('SELECT * FROM online_devices WHERE device_hash=?').bind(hash).first<DeviceRow>();
    await enforceDevice(env, device);
    if (b.deviceUuid !== undefined && (!isDeviceUuid(b.deviceUuid) || !device || device.device_uuid !== b.deviceUuid.toLowerCase())) throw new RoomError(400, 'Record this device before creating the account.');
    if (b.source === 'manual_ios' && (!device || device.platform !== 'ios' || !isDeviceUuid(b.deviceUuid))) throw new RoomError(400, 'Manual number entry requires an iOS device record.');
    if (b.source === 'device_selected' && device?.platform === 'ios') throw new RoomError(400, 'Enter your mobile number on iOS.');
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO online_players(id,device_hash,name,mobile,mobile_source,consent_at,created_at,avatar_id,avatar_photo) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), hash, b.name.trim(), b.mobile, b.source, Date.now(), Date.now(), b.avatarId ?? null, b.avatarPhoto ?? null),
      env.DB.prepare('UPDATE online_devices SET player_id=(SELECT id FROM online_players WHERE device_hash=?) WHERE device_hash=?').bind(hash, hash),
    ]);
    const player = await env.DB.prepare('SELECT id,name,mobile,mobile_source,avatar_id,avatar_photo FROM online_players WHERE device_hash=?').bind(hash).first<PlayerRow>();
    return json({ profile: profile(player!) }, 201);
  }
  const socketMatch = path.match(/^\/v2\/tables\/([a-f0-9-]{36})\/ws$/);
  if (socketMatch && method === 'GET') {
    const ticket = url.searchParams.get('ticket') ?? '';
    if (!/^w_[a-f0-9]{64}$/.test(ticket)) throw new RoomError(401, 'Invalid connection ticket.');
    const result = await env.DB.prepare('DELETE FROM online_socket_tickets WHERE token_hash=? AND table_id=? AND expires_at>? RETURNING player_id').bind(await sha256(ticket), socketMatch[1], Date.now()).first<{ player_id: string }>();
    if (!result) throw new RoomError(401, 'Connection ticket expired.');
    await enforcePlayer(env, result.player_id);
    const headers = new Headers(request.headers); headers.set('X-Player-Id', result.player_id);
    return env.TABLES.getByName(socketMatch[1]!).fetch(new Request(request.url, { headers }));
  }
  const user = await authenticate(request, env);
  const voiceMatch = path.match(/^\/v2\/tables\/([a-f0-9-]{36})\/voice$/);
  if (voiceMatch && method === 'POST') {
    const b = await body(request, 56_000);
    if (!isVoiceRequest(b)) throw new RoomError(400, 'Invalid voice request.');
    return json(await env.VOICE_ROOMS.getByName(voiceMatch[1]!).act(voiceMatch[1]!, user.id, b));
  }
  if (path === '/v2/invitations' && method === 'GET') return json({ invitations: await listInvitations(env, user.id) });
  const responseMatch = path.match(/^\/v2\/invitations\/([a-f0-9-]{36})\/respond$/);
  if (responseMatch && method === 'POST') {
    const b = await body(request);
    if (b.response !== 'accept' && b.response !== 'decline') throw new RoomError(400, 'Choose Accept or Decline.');
    const invite = await env.DB.prepare('SELECT table_id FROM online_invitations WHERE id=? AND recipient_id=?').bind(responseMatch[1], user.id).first<{ table_id: string }>();
    if (!invite) throw new RoomError(404, 'Invitation unavailable.');
    return json(await env.TABLES.getByName(invite.table_id).respondInvite(user, responseMatch[1]!, b.response));
  }
  const invitationMatch = path.match(/^\/v2\/tables\/([a-f0-9-]{36})\/(invite-search|invitations)$/);
  if (invitationMatch && method === 'POST') {
    await limited(env, 'invite:' + user.id, true);
    const room = env.TABLES.getByName(invitationMatch[1]!);
    await room.captain(user.id);
    const b = await body(request);
    if (invitationMatch[2] === 'invite-search') {
      if (!isInviteMobile(b.mobile)) throw new RoomError(400, 'Enter the complete 10-digit mobile number.');
      const users = await env.DB.prepare('SELECT id,name,avatar_id AS avatarId,avatar_photo AS avatarPhoto FROM online_players WHERE substr(mobile,-10)=? AND id<>? ORDER BY created_at DESC LIMIT 10').bind(b.mobile, user.id).all();
      return json({ players: users.results });
    }
    if (typeof b.playerId !== 'string' || !/^[a-f0-9-]{36}$/.test(b.playerId)) throw new RoomError(400, 'Select a player.');
    return json(await room.invitePlayer(user.id, b.playerId), 201);
  }
  if (path === '/v2/wallet' && method === 'GET') return json({ wallet: await wallet(env, user.id) });
  if (path === '/v2/wallet/transactions' && method === 'GET') return json(await walletTransactions(env, user.id, url.searchParams));
  if (path === '/v2/coin-plans' && method === 'GET') return json(await coinCatalog(env));
  if (path === '/v2/wallet/test-purchase' && method === 'POST') {
    await limited(env, 'test-coins:' + user.id, true);
    const b = await body(request); return json(await testPurchase(env, user.id, b.id, b.planId, b.amount));
  }
  if (path === '/v2/me/avatar' && method === 'POST') {
    const b = await body(request);
    if (!isAvatarId(b.avatarId)) throw new RoomError(400, 'Choose an avatar from the gallery.');
    const owner = await sha256(request.headers.get('Authorization')!.replace(/^Bearer /, ''));
    await assertAvatarOwner(env, b.avatarPhoto, owner);
    await env.DB.prepare('UPDATE online_players SET avatar_id=?,avatar_photo=? WHERE id=?').bind(b.avatarId, b.avatarPhoto ?? null, user.id).run();
    return json({ profile: { ...user, avatarId: b.avatarId, avatarPhoto: b.avatarPhoto ?? undefined } });
  }
  if (path === '/v2/me' && method === 'GET') return json({ profile: user });
  if (path === '/v2/tables' && method === 'GET') {
    return json({ tables: await listTables(env.DB, user.id) });
  }
  if (path === '/v2/table-history' && method === 'GET') return json({ games: await listPastGames(env.DB, user.id) });
  const pastMatch = path.match(/^\/v2\/table-history\/([a-f0-9-]{36})\/([1-9]\d{0,8})$/);
  if (pastMatch && method === 'GET') {
    const detail = await getPastGame(env.DB, user.id, pastMatch[1]!, Number(pastMatch[2]));
    if (!detail) throw new RoomError(404, 'This past game is unavailable.');
    return json(detail);
  }
  if (path === '/v2/tables' && method === 'POST') {
    const b = await body(request);
    if (b.visibility !== 'private') throw new RoomError(400, 'Only private tables are available.');
    if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 50 || typeof b.createId !== 'string' || !/^[a-f0-9-]{36}$/.test(b.createId)) throw new RoomError(400, 'Invalid table name or creation identifier.');
    const config = b.config ?? DEFAULT_TABLE_CONFIG;
    if (!validConfig(config)) throw new RoomError(400, 'Invalid timing settings.');
    const options = b.options ?? {};
    if (!validTableCreationOptions(options)) throw new RoomError(400, 'Invalid table start options.');
    await assertAvatarOwner(env, options.tableAvatarPhoto, await sha256(request.headers.get('Authorization')!.replace(/^Bearer /, '')));
    await limited(env, 'create:' + user.id, true);
    let existing = await env.DB.prepare('SELECT code,owner_id FROM online_tables WHERE id=?').bind(b.createId).first<{ code: string; owner_id: string }>();
    if (existing && existing.owner_id !== user.id) throw new RoomError(403, 'Invalid creation identifier.');
    for (let attempt = 0; !existing && attempt < 8; attempt++) {
      const code = String(100000 + secureInt(900000));
      try { await env.DB.prepare('INSERT INTO online_tables(id,code,name,owner_id,updated_at,created_at) VALUES(?,?,?,?,?,?)').bind(b.createId, code, b.name.trim(), user.id, Date.now(), Date.now()).run(); existing = { code, owner_id: user.id }; }
      catch (error) { if (!(error instanceof Error && error.message.includes('UNIQUE'))) throw error; }
    }
    if (!existing) throw new RoomError(503, 'Could not reserve a table code. Try again.');
    const snapshot = await env.TABLES.getByName(b.createId).initialize(b.createId, b.name, existing.code, randomToken(), user, config, options);
    await env.DB.prepare('INSERT OR IGNORE INTO online_memberships(table_id,player_id) VALUES(?,?)').bind(b.createId, user.id).run();
    return json({ snapshot }, 201);
  }
  if (path === '/v2/join' && method === 'POST') {
    const b = await body(request); await limited(env, 'join:' + user.id, true);
    let id: string | undefined;
    if (typeof b.code === 'string' && /^\d{6}$/.test(b.code)) id = (await env.DB.prepare('SELECT id FROM online_tables WHERE code=?').bind(b.code).first<{ id: string }>())?.id;
    else if (typeof b.tableId === 'string' && /^[a-f0-9-]{36}$/.test(b.tableId) && typeof b.invite === 'string' && /^[a-f0-9]{64}$/.test(b.invite)) id = b.tableId;
    if (!id) throw new RoomError(404, 'Table not found. Check the code or invite.');
    const room = env.TABLES.getByName(id);
    const snapshot = await room.join(user, typeof b.invite === 'string' ? b.invite : undefined);
    await env.DB.prepare('INSERT OR IGNORE INTO online_memberships(table_id,player_id) VALUES(?,?)').bind(id, user.id).run();
    return json({ snapshot });
  }
  if (path === '/v2/preview' && method === 'POST') {
    const b = await body(request); await limited(env, 'preview:' + user.id, true);
    if (typeof b.tableId === 'string' && /^[a-f0-9-]{36}$/.test(b.tableId) && typeof b.invite === 'string' && /^[a-f0-9]{64}$/.test(b.invite)) {
      const table = await env.DB.prepare('SELECT id FROM online_tables WHERE id=?').bind(b.tableId).first<{ id: string }>();
      if (!table) throw new RoomError(404, 'Table not found.');
      return json(await env.TABLES.getByName(table.id).preview(b.invite));
    }
    const table = typeof b.code === 'string' && /^\d{6}$/.test(b.code) ? await env.DB.prepare('SELECT id FROM online_tables WHERE code=?').bind(b.code).first<{ id: string }>() : null;
    if (!table) throw new RoomError(404, 'Table not found.');
    return json(await env.TABLES.getByName(table.id).preview());
  }
  const match = path.match(/^\/v2\/tables\/([a-f0-9-]{36})(?:\/(commands|socket|history|rejoin))?$/);
  if (!match) throw new RoomError(404, 'Not found.');
  const id = match[1]!, action = match[2], room = env.TABLES.getByName(id);
  if (!action && method === 'GET') return json({ snapshot: await room.getSnapshot(user.id) });
  if (action === 'rejoin' && method === 'POST') {
    const membership = await env.DB.prepare('SELECT removed FROM online_memberships WHERE table_id=? AND player_id=?').bind(id, user.id).first<{ removed: number }>();
    if (!membership || membership.removed) throw new RoomError(403, 'Use a valid invite to join this table.');
    return json({ snapshot: await room.join(user) });
  }
  if (action === 'socket' && method === 'POST') {
    await room.getSnapshot(user.id);
    const ticket = randomToken('w_');
    await env.DB.prepare('INSERT INTO online_socket_tickets(token_hash,table_id,player_id,expires_at) VALUES(?,?,?,?)').bind(await sha256(ticket), id, user.id, Date.now() + 60_000).run();
    return json({ ticket });
  }
  if (action === 'commands' && method === 'POST') {
    const b = await body(request);
    if (typeof b.id !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(b.id) || typeof b.roundId !== 'string' || typeof b.type !== 'string' || !b.payload || typeof b.payload !== 'object' || Array.isArray(b.payload)) throw new RoomError(400, 'Invalid table command.');
    if (b.type === 'TABLE_AVATAR') await assertAvatarOwner(env, (b.payload as Record<string, unknown>).tableAvatarPhoto, await sha256(request.headers.get('Authorization')!.replace(/^Bearer /, '')));
    if (b.type === 'ROTATE_INVITE') b.payload = { invite: randomToken() };
    return json({ snapshot: await room.command(user.id, b as RoomCommand) });
  }
  if (action === 'history' && method === 'GET') {
    const round = url.searchParams.has('round') ? Number(url.searchParams.get('round')) : undefined;
    const after = Number(url.searchParams.get('after') ?? 0);
    if ((round !== undefined && (!Number.isInteger(round) || round < 1)) || !Number.isSafeInteger(after) || after < 0) throw new RoomError(400, 'Invalid history cursor.');
    return json(await room.history(user.id, round, after));
  }
  throw new RoomError(405, 'Method not allowed.');
}
