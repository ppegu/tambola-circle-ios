import { describe, expect, it } from 'vitest';
import { applyRoomCommand, advanceRoom, createRoom, joinRoom, nextDeadline } from '../server/src/room-engine';
import { DEFAULT_TABLE_CONFIG, type OnlineProfile, type RoomCommand, type RoomState } from '../shared/online';
import { generateStrip, type RandomInt } from '../shared/tickets';
import voiceDurations from '../shared/voiceTiming.json';
import { numberCallDelayMs } from '../shared/voiceTiming';

function random(seed = 123): RandomInt { return max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; }; }
const player = (id: string): OnlineProfile => ({ id, name: id, mobile: '+919000004321', mobileSource: 'device_selected', verificationStatus: 'unverified' });
let commandId = 0;
const cmd = (s: RoomState, type: RoomCommand['type'], payload: Record<string, unknown> = {}): RoomCommand => ({ id: 'command-' + ++commandId, roundId: s.roundId, authorityEpoch: s.authorityEpoch, type, payload });
function fixture(count = 3) {
  const rng = random();
  let s = createRoom('table', 'Family', '123456', 'a'.repeat(64), player('a'), DEFAULT_TABLE_CONFIG, 0).state;
  for (let i = 1; i < count; i++) s = joinRoom(s, player(String.fromCharCode(97 + i)), 0).state;
  const run = (actor: string, type: RoomCommand['type'], payload: Record<string, unknown> = {}, now = 10) => { s = applyRoomCommand(s, actor, cmd(s, type, payload), now, rng).state; return s; };
  const start = (waitForFirstCall = true) => {
    for (const id of Object.keys(s.members)) { if (s.members[id]!.ready) continue; run(id, 'SELECT', { kind: 'full' }); run(id, 'CONFIRM_STRIP', { stripVersion: s.members[id]!.stripVersion }); run(id, 'READY', { ready: true }); }
    run('a', 'START');
    if (waitForFirstCall) s = advanceRoom(s, s.nextCallAt!, rng).state;
    return s;
  };
  return { get state() { return s; }, set state(value: RoomState) { s = value; }, run, start, rng };
}
describe('server-generated Tambola strips', () => {
  it('generates complete valid strips across 200 random seeds', { timeout: 30000 }, () => {
    for (let seed = 1; seed <= 200; seed++) {
      const panels = generateStrip('full', random(seed));
      expect(panels).toHaveLength(6);
      const all: number[] = [];
      for (const p of panels) {
        expect(p).toHaveLength(3);
        for (const row of p) { expect(row).toHaveLength(9); expect(row.filter(v => v !== null)).toHaveLength(5); }
        for (let col = 0; col < 9; col++) {
          const numbers = p.map(row => row[col]).filter((v): v is number => v !== null && v !== undefined);
          expect(numbers.length).toBeGreaterThan(0); expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
          for (const n of numbers) { expect(n).toBeGreaterThanOrEqual(col === 0 ? 1 : col * 10); expect(n).toBeLessThanOrEqual(col === 8 ? 90 : col * 10 + 9); }
        }
        all.push(...p.flat().filter((v): v is number => v !== null));
      }
      expect(all.sort((a, b) => a - b)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
      expect(generateStrip('half', random(seed)).flat(2).filter(v => v !== null)).toHaveLength(45);
    }
  });
});
describe('v3 authoritative round rules', () => {
  it('persists a selected table avatar and rejects IDs outside the bundled pack', () => {
    const room = (tableAvatarId: unknown) => createRoom('table', 'Family', '123456', 'invite', player('a'), DEFAULT_TABLE_CONFIG, 1, { tableAvatarId } as any);
    expect(room(19).state.tableAvatarId).toBe(19);
    for (const invalid of [-1, 20, 1.5, '2', null]) expect(() => room(invalid)).toThrow('Invalid table start options.');
  });
  it('allows only the current host to change artwork without altering a live round or coin holds', () => {
    const f = fixture(); f.start();
    expect(() => f.run('b', 'TABLE_AVATAR', { tableAvatarId: 3 })).toThrow('Captain authority changed');
    const before = structuredClone(f.state);
    const result = applyRoomCommand(f.state, 'a', cmd(f.state, 'TABLE_AVATAR', { tableAvatarId: 3 }), 11);
    expect(result.state.tableAvatarId).toBe(3);
    expect(result.state.members).toEqual(before.members);
    expect(result.state.calls).toEqual(before.calls);
    expect(result.state.nextCallAt).toBe(before.nextCallAt);
    expect(result.walletEffects).toEqual([]);
    expect(result.events.map(e => e.type)).toEqual(['TABLE_AVATAR_CHANGED']);
    expect(() => f.run('a', 'TABLE_AVATAR', { tableAvatarId: 20 })).toThrow('Choose a valid table avatar.');
    const stale = { ...cmd(f.state, 'TABLE_AVATAR', { tableAvatarId: 2 }), authorityEpoch: 0 };
    expect(() => applyRoomCommand(f.state, 'a', stale, 12)).toThrow('Captain authority changed');
  });
  it('creates a watching host with manual start by default', () => {
    const { state, walletEffects } = createRoom('table', 'Family', '123456', 'invite', player('a'), DEFAULT_TABLE_CONFIG, 1000);
    expect(state.members.a!.spectator).toBe(true);
    expect(state.members.a!.panels).toEqual([]);
    expect(state.scheduledAt).toBeNull();
    expect(walletEffects).toEqual([]);
  });
  it('saves the host seat and countdown together without reserving coins', () => {
    const change = createRoom('table', 'Family', '123456', 'invite', player('a'), DEFAULT_TABLE_CONFIG, 1000, { hostPlaying: true, startInSeconds: 120 });
    expect(change.state.members.a!.spectator).toBe(false);
    expect(change.state.members.a!.ready).toBe(false);
    expect(change.state.members.a!.panels).toEqual([]);
    expect(change.state.scheduledAt).toBe(121000);
    expect(change.walletEffects).toEqual([]);
    expect(change.events.map(event => event.type)).toEqual(['TABLE_CREATED', 'START_SCHEDULED']);
    expect(advanceRoom(change.state, 120999).state.phase).toBe('lobby');
    const finished = advanceRoom(change.state, 121000).state;
    expect(finished.phase).toBe('finished');
    expect(finished.result?.reason).toBe('not_enough_ready_players');
  });
  it.each([-1, 0, 119, 120.5, 604801, Number.NaN])('rejects invalid creation countdown %s', startInSeconds => {
    expect(() => createRoom('table', 'Family', '123456', 'invite', player('a'), DEFAULT_TABLE_CONFIG, 0, { startInSeconds })).toThrow('Invalid table start options');
  });
  it('lets the longest announcement finish even at the fastest table setting', () => {
    const [number, duration] = Object.entries(voiceDurations).sort((a, b) => b[1] - a[1])[0]!;
    const f = fixture(); f.start();
    f.state.config.callSeconds = 3; f.state.calls = []; f.state.nextCallAt = 1000;
    const called = advanceRoom(f.state, 1000, () => Number(number) - 1).state;
    expect(called.calls).toEqual([Number(number)]);
    expect(called.nextCallAt).toBe(1000 + Math.max(3000, duration + 250));
    expect(advanceRoom(called, called.nextCallAt! - 1, f.rng).state.calls).toEqual(called.calls);
  });
  it('has no ready timeout and never starts because everyone is ready', () => {
    const f = fixture(2);
    for (const id of ['a','b']) { f.run(id,'SELECT',{kind:'half'}); f.run(id,'CONFIRM_STRIP',{stripVersion:1}); f.run(id,'READY',{ready:true}); }
    expect(f.state.phase).toBe('lobby'); expect(nextDeadline(f.state, 100)).toBeNull();
    f.state = advanceRoom(f.state, 999999, f.rng).state; expect(f.state.phase).toBe('lobby');
    expect(() => f.run('b','START')).toThrow('authority'); f.run('a','START'); expect(f.state.phase).toBe('live');
  });
  it('allows a host to watch free while two other players pay and play', () => {
    const f = fixture(3); expect(f.state.members.a!.spectator).toBe(true);
    for (const id of ['b','c']) { f.run(id,'SELECT',{kind:'full'}); f.run(id,'CONFIRM_STRIP',{stripVersion:1}); f.run(id,'READY',{ready:true}); }
    const change = applyRoomCommand(f.state,'a',cmd(f.state,'START'),20,f.rng);
    expect(change.state.roster).toEqual(['b','c']); expect(change.walletEffects?.map(e=>e.type)).toEqual(['consume','consume']); expect(change.state.members.a!.paid).toBeUndefined();
  });
  it('reserves only once, releases on unready, and creates a fresh reservation for re-ready', () => {
    const f=fixture(); f.run('b','SELECT',{kind:'half'}); f.run('b','CONFIRM_STRIP',{stripVersion:1});
    let change=applyRoomCommand(f.state,'b',cmd(f.state,'READY',{ready:true}),10,f.rng); const first=change.state.members.b!.coinHold;
    expect(change.walletEffects).toHaveLength(1); expect(change.walletEffects![0]).toMatchObject({type:'reserve',amount:50}); f.state=change.state;
    expect(applyRoomCommand(f.state,'b',cmd(f.state,'READY',{ready:true}),11).walletEffects).toHaveLength(0);
    change=applyRoomCommand(f.state,'b',cmd(f.state,'READY',{ready:false}),12); expect(change.walletEffects![0]!.type).toBe('release'); f.state=change.state;
    f.run('b','READY',{ready:true}); expect(f.state.members.b!.coinHold).not.toBe(first);
    expect(()=>f.run('b','SELECT',{kind:'full'})).toThrow('unready');
  });
  it('lets paid players watch and resume without refunds or a second charge', () => {
    const f = fixture(); f.start();
    const cell = f.state.members.b!.panels[0]!.flat().findIndex(n => n !== null);
    f.run('b', 'MARK', { panel: 0, cell, marked: true, version: 0 });
    const before = structuredClone(f.state.members.b!);
    const watching = applyRoomCommand(f.state, 'b', cmd(f.state, 'WATCH'), 20);
    expect(watching.walletEffects).toEqual([]);
    expect(watching.state.members.b).toMatchObject({ paid: true, coinHold: before.coinHold, spectator: true, marks: before.marks });
    expect(() => applyRoomCommand(watching.state, 'b', cmd(watching.state, 'MARK', { panel: 0, cell, marked: false, version: 1 }), 21)).toThrow('read only');
    const resumed = applyRoomCommand(watching.state, 'b', cmd(watching.state, 'WATCH', { watching: false }), 22);
    expect(resumed.walletEffects).toEqual([]);
    expect(resumed.state.members.b).toEqual(before);
    const late = joinRoom(resumed.state, player('late'), 23).state;
    expect(() => applyRoomCommand(late, 'late', cmd(late, 'WATCH', { watching: false }), 24)).toThrow('next round');
    const ended = applyRoomCommand(resumed.state, 'a', cmd(resumed.state, 'END'), 25);
    expect(ended.walletEffects?.filter(e => e.playerId === 'b')).toEqual([expect.objectContaining({ type: 'refund', id: before.coinHold })]);
  });
  it('releases a lobby reservation only once when switching to watch', () => {
    const f = fixture(); f.run('b', 'SELECT', { kind: 'half' }); f.run('b', 'CONFIRM_STRIP', { stripVersion: 1 }); f.run('b', 'READY', { ready: true });
    const watching = applyRoomCommand(f.state, 'b', cmd(f.state, 'WATCH'), 20);
    expect(watching.walletEffects).toEqual([expect.objectContaining({ type: 'release' })]);
    expect(applyRoomCommand(watching.state, 'b', cmd(watching.state, 'WATCH'), 21).walletEffects).toEqual([]);
    const resumed = applyRoomCommand(watching.state, 'b', cmd(watching.state, 'WATCH', { watching: false }), 22);
    expect(resumed.walletEffects).toEqual([]);
    expect(resumed.state.members.b).toMatchObject({ spectator: false, selected: true, ready: false });
    expect(resumed.state.members.b?.coinHold).toBeUndefined();
  });
  it('starts a schedule at its deadline and never before', () => {
    const f=fixture(); for(const id of ['b','c']) {f.run(id,'SELECT',{kind:'half'});f.run(id,'CONFIRM_STRIP',{stripVersion:1});f.run(id,'READY',{ready:true});}
    f.run('a','SCHEDULE',{at:20000},0); expect(nextDeadline(f.state,100)).toBe(20000);
    expect(advanceRoom(f.state,19999).state.phase).toBe('lobby'); const change=advanceRoom(f.state,20000,f.rng); expect(change.state.phase).toBe('live'); expect(change.state.roster).toEqual(['b','c']);
  });
  it('cancels an underfunded scheduled round and releases all holds', () => {
    const f=fixture(); f.run('b','SELECT',{kind:'half'});f.run('b','CONFIRM_STRIP',{stripVersion:1});f.run('b','READY',{ready:true});f.run('a','SCHEDULE',{at:20000},0);
    const change=advanceRoom(f.state,20000);expect(change.state.result?.reason).toBe('not_enough_ready_players');expect(change.walletEffects![0]!.type).toBe('release');expect(change.state.members.b!.ready).toBe(false);
  });
  it('refunds host-aborted paid rounds once and resets tickets for the next round', () => {
    const f=fixture();f.start();const change=applyRoomCommand(f.state,'a',cmd(f.state,'END'),100);expect(change.walletEffects?.every(e=>e.type==='refund')).toBe(true);expect(change.walletEffects).toHaveLength(3);f.state=change.state;expect(()=>f.run('a','END')).toThrow('ended');f.run('a','NEXT_ROUND');expect(f.state.members.a!.panels).toHaveLength(0);expect(f.state.members.a!.spectator).toBe(true);
  });
  it('does not refund voluntary live departure, but releases pre-start departure', () => {
    const f=fixture();f.start();expect(applyRoomCommand(f.state,'b',cmd(f.state,'LEAVE'),40).walletEffects).toHaveLength(0);
    const g=fixture();g.run('b','SELECT',{kind:'half'});g.run('b','CONFIRM_STRIP',{stripVersion:1});g.run('b','READY',{ready:true});expect(applyRoomCommand(g.state,'b',cmd(g.state,'LEAVE'),40).walletEffects![0]!.type).toBe('release');
  });
  it('never auto-marks; rejects stale marks, foreign round writes and spectator marks', () => {
    const f=fixture();f.start();expect(f.state.members.b!.marks).toEqual({});const cell=f.state.members.b!.panels[0]!.flat().findIndex(v=>v!==null);
    f.run('b','MARK',{panel:0,cell,marked:true,version:0});expect(()=>f.run('b','MARK',{panel:0,cell,marked:false,version:0})).toThrow('another device');expect(()=>applyRoomCommand(f.state,'b',{...cmd(f.state,'MARK'),roundId:'old'},20)).toThrow('round changed');
    f.state=joinRoom(f.state,player('d'),20).state;expect(f.state.members.d!.spectator).toBe(true);expect(()=>f.run('d','MARK',{panel:0,cell,marked:true,version:0})).toThrow('read only');
  });
  it('pauses calls, freezes evidence and rejects missing numbers rather than timing into approval', () => {
    const f=fixture();f.start();f.run('b','CLAIM',{panel:0},1000);const frozen=structuredClone(f.state.claim!);expect(f.state.nextCallAt).toBeNull();
    let change=advanceRoom(f.state,2200);expect(change.state.claim?.checked).toBe(6);expect(change.state.claim?.calls).toEqual(frozen.calls);
    change=advanceRoom(change.state,4000);expect(change.state.phase).toBe('live');expect(change.state.result).toBeNull();expect(change.state.verificationFailure!.missing.length).toBeGreaterThan(0);expect(change.state.members.b!.spectator).toBe(true);expect(change.state.nextCallAt).toBe(9000);
  });
  it('keeps a rejected claimant watching through later calls and reconnects', () => {
    const f=fixture();f.start();f.run('b','CLAIM',{panel:0},1000);f.state=advanceRoom(f.state,4000).state;
    const evidence = structuredClone(f.state.members.b!.disqualification);
    expect(evidence?.missing.length).toBeGreaterThan(0);
    expect(()=>f.run('b','CLAIM',{panel:1},4001)).toThrow('rejected');
    f.state=advanceRoom(f.state,f.state.nextCallAt!,f.rng).state;
    f.state=joinRoom(f.state,player('b'),10000).state;
    expect(f.state.members.b!.disqualification).toEqual(evidence);
    expect(()=>f.run('b','CLAIM',{panel:1},10000)).toThrow('rejected');
    expect(()=>f.run('b','WATCH',{watching:false},10000)).toThrow('rejected');
    const cell=f.state.members.b!.panels[0]!.flat().findIndex(n=>n!==null);
    expect(()=>f.run('b','MARK',{panel:0,cell,marked:true,version:0},10000)).toThrow('read only');
    f.run('c','CLAIM',{panel:0},10000); f.state=advanceRoom(f.state,13000).state;
    expect(f.state.members.b!.disqualification).toEqual(evidence);
    expect(f.state.members.b!.paid).toBe(true);
    f.run('a','END',{},13001);f.run('b','NEXT_ROUND',{},13002);
    expect(f.state.members.b!.disqualification).toBeUndefined();
  });
  it('upgrades old unpaid lobby readiness without silently charging or starting', () => {
    const f=fixture();f.state.config={readySeconds:120,reviewSeconds:120,callSeconds:30};f.state.nextConfig={...f.state.config};f.state.members.b!.ready=true;f.state.members.b!.deadline=10;
    const change=advanceRoom(f.state,2000);expect(change.state.phase).toBe('lobby');expect(change.state.config.callSeconds).toBe(10);expect(change.state.config.halfCoins).toBe(50);expect(change.state.members.b!.ready).toBe(false);expect(change.state.members.b!.deadline).toBe(0);expect(change.walletEffects).toHaveLength(0);
  });
  it('checks all fifteen ticket values against a server snapshot regardless of personal marks', () => {
    const f=fixture();f.start();f.state.calls=f.state.members.b!.panels[0]!.flat().filter((n):n is number=>n!==null);f.run('b','CLAIM',{panel:0},1000);
    expect(()=>f.run('c','CLAIM',{panel:0},1001)).toThrow('check is running');expect(()=>f.run('a','VOTE',{vote:'approve'},1001)).toThrow('no longer supported');
    expect(advanceRoom(f.state,3999).state.phase).toBe('claim');const change=advanceRoom(f.state,4000);expect(change.state.result).toMatchObject({winner:'b',reason:'full_house_verified',automatic:15});expect(change.walletEffects).toHaveLength(0);expect(advanceRoom(change.state,9000).events).toHaveLength(0);
  });
  it('allows co-host takeover and fences old host commands, then permits owner reclaim', () => {
    const f=fixture();f.run('a','COHOST',{memberId:'b'});const old=cmd(f.state,'SETTINGS',{config:DEFAULT_TABLE_CONFIG});f.state.members.a!.onlineUntil=100;f.state.members.b!.onlineUntil=100000;expect(nextDeadline(f.state,50)).toBe(100);f.state=advanceRoom(f.state,100).state;expect(f.state.hostId).toBe('b');expect(()=>applyRoomCommand(f.state,'a',old,101)).toThrow('authority');f.run('a','RECLAIM',{},102);expect(f.state.hostId).toBe('a');
  });
  it('transfers ownership permanently and disallows removed players rejoining', () => {
    const f=fixture();f.run('a','TRANSFER',{memberId:'b'});expect(()=>f.run('a','RECLAIM')).toThrow('table owner');f.run('b','KICK',{memberId:'c'});expect(()=>joinRoom(f.state,player('c'),50)).toThrow('removed');
  });
  it('allows only 3–10 second calls and applies live setting changes to the next round', () => {
    const f=fixture();for(const seconds of [2,11,3.5])expect(()=>f.run('a','SETTINGS',{config:{...DEFAULT_TABLE_CONFIG,callSeconds:seconds}})).toThrow();f.start();f.run('a','SETTINGS',{config:{...DEFAULT_TABLE_CONFIG,callSeconds:3,halfCoins:75}});expect(f.state.config.callSeconds).toBe(5);f.run('a','END');f.run('a','NEXT_ROUND');expect(f.state.config.callSeconds).toBe(3);expect(f.state.config.halfCoins).toBe(75);
  });
  it('draws all ninety numbers once and gives a final claim opportunity before ending', () => {
    const f=fixture();f.start();while(f.state.calls.length<90)f.state=advanceRoom(f.state,f.state.nextCallAt!,f.rng).state;expect(new Set(f.state.calls).size).toBe(90);expect(f.state.phase).toBe('live');f.state=advanceRoom(f.state,f.state.nextCallAt!,f.rng).state;expect(f.state.result?.reason).toBe('numbers_exhausted');
  });
});

describe('Captain controls and synchronized round start', () => {
  it('changes the live pace immediately without restarting elapsed call time or cutting the voice short', () => {
    const f=fixture(); f.start();
    const calledAt=f.state.lastCallAt!, number=f.state.calls.at(-1)!, now=calledAt+500;
    const changed=applyRoomCommand(f.state,'a',cmd(f.state,'PACE',{seconds:7}),now);
    f.state=changed.state;
    expect(f.state.config.callSeconds).toBe(7);expect(f.state.nextConfig.callSeconds).toBe(7);
    expect(f.state.nextCallAt).toBe(calledAt+numberCallDelayMs(number,7));
    expect(changed.walletEffects).toEqual([]);expect(changed.events[0]?.type).toBe('CALL_SPEED_CHANGED');
    expect(applyRoomCommand(f.state,'a',cmd(f.state,'PACE',{seconds:7}),now+1).events).toEqual([]);
    f.run('a','PACE',{seconds:3},now+100);
    expect(f.state.nextCallAt).toBe(calledAt+numberCallDelayMs(number,3));
    expect(Math.ceil(f.state.nextCallAt!-calledAt)).toBeGreaterThanOrEqual(voiceDurations[number as unknown as keyof typeof voiceDurations]+250);
    expect(advanceRoom(f.state,f.state.nextCallAt!-1,f.rng).state.calls).toHaveLength(1);
    expect(advanceRoom(f.state,f.state.nextCallAt!,f.rng).state.calls).toHaveLength(2);
  });
  it('changes a paused call’s remaining time without resuming it or counting time spent paused', () => {
    const f=fixture();f.start();const calledAt=f.state.lastCallAt!,number=f.state.calls.at(-1)!;
    f.run('a','PAUSE',{paused:true},calledAt+1000);
    f.run('a','PACE',{seconds:7},calledAt+90000);
    expect(f.state.pause?.remainingMs).toBe(numberCallDelayMs(number,7)-1000);expect(f.state.nextCallAt).toBeNull();
    f.run('a','PAUSE',{paused:false},calledAt+100000);
    expect(f.state.nextCallAt).toBe(calledAt+100000+numberCallDelayMs(number,7)-1000);
  });
  it('keeps the five-second opening countdown and the final claim window independent of pace', () => {
    const f=fixture();f.start(false);const startsAt=f.state.startsAt;
    f.run('a','PACE',{seconds:7},1000);expect(f.state.startsAt).toBe(startsAt);expect(f.state.nextCallAt).toBe(startsAt);
    f.run('a','PAUSE',{paused:true},2000);const remaining=f.state.pause!.remainingMs;
    f.run('a','PACE',{seconds:4},9000);expect(f.state.pause!.remainingMs).toBe(remaining);
    f.run('a','PAUSE',{paused:false},10000);f.state=advanceRoom(f.state,f.state.nextCallAt!,f.rng).state;
    while(f.state.calls.length<90)f.state=advanceRoom(f.state,f.state.nextCallAt!,f.rng).state;
    const finalDeadline=f.state.nextCallAt;f.run('a','PACE',{seconds:7},f.state.lastCallAt!+1000);
    expect(f.state.nextCallAt).toBe(finalDeadline);
  });
  it('uses an updated pace when verification resumes and preserves pending fee settings', () => {
    const f=fixture();f.start();f.state.nextConfig.halfCoins=75;f.run('b','CLAIM',{panel:0},10000);
    f.run('a','PACE',{seconds:7},11000);expect(f.state.nextCallAt).toBeNull();expect(f.state.phase).toBe('claim');
    f.state=advanceRoom(f.state,13000,f.rng).state;
    expect(f.state.nextCallAt).toBe(20000);expect(f.state.nextConfig.halfCoins).toBe(75);
  });
  it('accepts only the current Captain and validates pace bounds on the server', () => {
    const f=fixture();expect(()=>f.run('a','PACE',{seconds:4})).toThrow('live round');f.start();
    expect(()=>f.run('b','PACE',{seconds:4})).toThrow('authority');
    expect(()=>applyRoomCommand(f.state,'a',{...cmd(f.state,'PACE',{seconds:4}),authorityEpoch:0},10000)).toThrow('authority');
    for(const seconds of [2,11,4.1,'4',null,NaN])expect(()=>f.run('a','PACE',{seconds})).toThrow('3 to 10');
    f.run('a','END');expect(()=>f.run('a','PACE',{seconds:4})).toThrow('live round');
  });
  it('reserves the Captain’s confirmed tickets and starts without a separate Ready command', () => {
    const f=fixture(2);
    for(const id of ['a','b']) { f.run(id,'SELECT',{kind:'half'}); f.run(id,'CONFIRM_STRIP',{stripVersion:1}); }
    expect(f.state.members.a).toMatchObject({ready:true,selected:true,entryCoins:50});
    expect(f.state.members.b!.ready).toBe(false);
    f.run('b','READY',{ready:true});
    const started=applyRoomCommand(f.state,'a',cmd(f.state,'START'),1000,f.rng);
    expect(started.walletEffects?.map(e=>e.type)).toEqual(['consume','consume']);
    expect(started.state.roster).toEqual(['a','b']);
    expect(started.state.startsAt).toBe(6000);
    expect(started.state.calls).toEqual([]);
  });
  it('reserves a previously selected Captain entry atomically with Start', () => {
    const f=fixture(2);f.start();f.run('a','END');f.run('b','NEXT_ROUND');
    for(const id of ['a','b']) {f.run(id,'SELECT',{kind:'half'});f.run(id,'CONFIRM_STRIP',{stripVersion:f.state.members[id]!.stripVersion});}
    f.run('a','READY',{ready:false});f.run('b','READY',{ready:true});
    const started=applyRoomCommand(f.state,'a',cmd(f.state,'START'),1000,f.rng);
    expect(started.walletEffects?.map(e=>e.type)).toEqual(['reserve','consume','consume']);
    expect(started.state.members.a).toMatchObject({ready:true,paid:true,spectator:false});
  });
  it('does not call a number until five seconds after a manual or scheduled start', () => {
    const f=fixture();f.start(false);
    expect(f.state.startsAt).toBe(5010);expect(f.state.calls).toEqual([]);
    expect(nextDeadline(f.state,10)).toBe(5010);
    expect(advanceRoom(f.state,5009,f.rng).events).toEqual([]);
    expect(()=>f.run('b','CLAIM',{panel:0},5009)).toThrow('first number');
    f.state=advanceRoom(f.state,5010,f.rng).state;
    expect(f.state.calls).toHaveLength(1);expect(f.state.startsAt).toBeNull();
    f.run('a','END');f.run('b','NEXT_ROUND');
    for(const id of ['b','c']) { f.run(id,'SELECT',{kind:'half'});f.run(id,'CONFIRM_STRIP',{stripVersion:f.state.members[id]!.stripVersion});f.run(id,'READY',{ready:true}); }
    f.run('a','SCHEDULE',{at:20000},1000);
    f.state=advanceRoom(f.state,20000,f.rng).state;
    expect(f.state.startsAt).toBe(25000);expect(f.state.calls).toEqual([]);
    expect(advanceRoom(f.state,24999,f.rng).state.calls).toEqual([]);
    expect(advanceRoom(f.state,25000,f.rng).state.calls).toHaveLength(1);
  });
  it('pauses the opening countdown and resumes its remaining time exactly once', () => {
    const f=fixture();f.start(false);
    expect(()=>f.run('b','PAUSE',{paused:true},2010)).toThrow('Captain authority');
    f.run('a','PAUSE',{paused:true},2010);
    expect(f.state.pause?.remainingMs).toBe(3000);expect(nextDeadline(f.state,3000)).toBeNull();
    expect(advanceRoom(f.state,50000,f.rng).state.calls).toEqual([]);
    f.run('a','PAUSE',{paused:true},50000);expect(f.state.pause?.remainingMs).toBe(3000);
    f.run('a','PAUSE',{paused:false},50000);
    expect(f.state.startsAt).toBe(53000);expect(f.state.nextCallAt).toBe(53000);
    f.run('a','PAUSE',{paused:false},51000);expect(f.state.nextCallAt).toBe(53000);
    expect(advanceRoom(f.state,52999,f.rng).state.calls).toEqual([]);
    expect(advanceRoom(f.state,53000,f.rng).state.calls).toHaveLength(1);
  });
  it('keeps calls paused after a rejected claim and allows an acting Captain to resume', () => {
    const f=fixture();f.start();f.run('a','COHOST',{memberId:'c'});
    const at=f.state.nextCallAt!-1200;
    f.run('a','PAUSE',{paused:true},at);f.run('b','CLAIM',{panel:0},at+1);
    f.state=advanceRoom(f.state,at+3001,f.rng).state;
    expect(f.state.phase).toBe('live');expect(f.state.nextCallAt).toBeNull();expect(f.state.pause?.remainingMs).toBe(1200);
    f.state.members.a!.onlineUntil=at+3002;f.state.members.c!.onlineUntil=at+90000;
    f.state=advanceRoom(f.state,at+3002,f.rng).state;
    expect(f.state.hostId).toBe('c');expect(()=>f.run('a','PAUSE',{paused:false},at+3003)).toThrow('authority');
    f.run('c','PAUSE',{paused:false},at+3003);expect(f.state.nextCallAt).toBe(at+4203);
  });
  it('lets any member return to the lobby, handles simultaneous requests and preserves Captain authority', () => {
    const f=fixture();f.start();expect(()=>f.run('b','NEXT_ROUND')).toThrow('End');
    f.run('a','END');const simultaneous=cmd(f.state,'NEXT_ROUND');
    f.run('b','NEXT_ROUND');expect(f.state.phase).toBe('lobby');expect(f.state.round).toBe(2);
    const retry=applyRoomCommand(f.state,'c',simultaneous,1000);
    expect(retry.state.round).toBe(2);expect(retry.events).toEqual([]);
    expect(()=>f.run('b','START')).toThrow('authority');
  });
});
