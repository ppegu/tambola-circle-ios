import { TableAvatar } from '../components/TableAvatar';
import { t as tr, useLanguage } from '../i18n';
import { useScreenNavigation } from '../navigation/ScreenContext';
import React, { useEffect, useRef, useState } from 'react';


import { cellKey, memberProgress, ticketCost, type Member } from '../../shared/online';

import { Action, Avatar, Countdown, GameIcon, Icon, IconButton, Notice, PageHeader, Pill, Pressable, ScrollView, Segments, Sheet, Text, TicketPanel, View, ui } from './components';

import { GameBackground, GameButton, GameCard, GameLogo, CoinChip } from '../components/GameArtwork';

import { LinearGradient } from '../components/LinearGradient';

import { TableAudioControls } from '../voiceChat/TableAudioControls';
import { LiveCallControls } from './LiveCallControls';
import { ReviewScreen } from './ReviewScreen';

import { TableManagement, type ControlPage } from './TableManagement';
import { HostLiveScreen } from './HostLiveScreen';
import { AutoVerificationScreen } from './AutoVerificationScreen';
import { RoundResultScreen } from './RoundResultScreen';
import { LowCoinsDialog } from './LowCoinsDialog';
import { TableLobby } from './TableLobby';
import { PlayerLobby } from './PlayerLobby';
import { TicketChooser } from './TicketChooser';
import { NumbersDrawer } from './NumbersDrawer';
import { PlayersDrawer } from './PlayersDrawer';
import { LiveTicket } from './LiveTicket';
import { shareTableInvite } from './shareTableInvite';
import { HostMemberActions } from './HostMemberActions';
import { gameFont } from '../gameTypography';

import { GamePreferencesSheet } from './Extras';
import { WalletSheet } from './WalletScreen';

import type { OnlineModel } from './useOnline';

export function TableScreen({ model, onCall, onStop, onGameplay, sound, onSound }: { sound?: boolean; onSound?: (enabled: boolean) => void; model: OnlineModel; onCall: (n: number) => void; onStop: () => void; onGameplay: (active: boolean) => void }) {
  useLanguage();

  const navigation = useScreenNavigation();
  const s = model.snapshot!, me = s.members[s.viewerId]!, host = s.hostId === s.viewerId, lobby = s.phase === 'lobby', live = s.phase === 'live';

  const [picker, setPickerLocal] = useState(false), [management, setManagementLocal] = useState<ControlPage | null>(null);

  const [drawer, setDrawerLocal] = useState<'numbers' | 'players' | null>(null), [viewMember, setViewMemberLocal] = useState<string | null>(null);
  const setDrawer = (value: 'numbers' | 'players' | null) => value && navigation ? navigation.present(value === 'numbers' ? 'Numbers' : 'Players') : setDrawerLocal(value);

  const [coins, setCoinsLocal] = useState(false), [lowCoins, setLowCoins] = useState(false), [preferences, setPreferencesLocal] = useState(false), [claimPanel, setClaimPanel] = useState<number | null>(null);

  const [dismissedFailure, setDismissedFailure] = useState(0);
  const setPicker = (open: boolean) => open && navigation ? navigation.push('Tickets') : setPickerLocal(open);
  const setManagement = (page: ControlPage | null) => page === 'invite' ? void shareTableInvite(s) : page && navigation ? navigation.push('TableSettings', { page }) : setManagementLocal(page);
  const setViewMember = (memberId: string | null) => memberId && navigation ? navigation.push('MemberTickets', { memberId }) : setViewMemberLocal(memberId);
  const setCoins = (open: boolean) => open && navigation ? navigation.push('Wallet') : setCoinsLocal(open);
  const setPreferences = (open: boolean) => open && navigation ? navigation.push('Preferences') : setPreferencesLocal(open);


  const callbacks = useRef({ onCall, onStop }); callbacks.current = { onCall, onStop };

  const announced = useRef('');

  useEffect(() => { onGameplay(live || s.phase === 'claim'); return () => onGameplay(false); }, [live, s.phase, onGameplay]);

  useEffect(() => { if (!navigation && (!live || !model.connected)) callbacks.current.onStop(); }, [live, model.connected]);

  useEffect(() => { if (!lobby) setPicker(false); if (!live) setClaimPanel(null); }, [lobby, live]);

  useEffect(() => {

    if (navigation) return; // The single app audio service handles calls across native screens.
    const key = `${s.roundId}:${s.calls.length}`;

    if (live && model.connected && s.calls.length && announced.current !== key) { announced.current = key; if (s.lastCallAt && s.serverNow - s.lastCallAt < 2800) callbacks.current.onCall(s.calls.at(-1)!); }

  }, [s.roundId, s.calls.length, live, model.connected, s.lastCallAt, s.serverNow]);

  const members = Object.values(s.members).filter(m => !m.removed && !m.left), ready = members.filter(m => m.ready && m.selected && !m.spectator), cost = ticketCost(s.config, me.kind);

  const viewing = s.members[viewMember ?? ''];

  const ranked = [...members].sort((a, b) => {

    const activeA = s.roster.includes(a.id) && !a.spectator, activeB = s.roster.includes(b.id) && !b.spectator;

    if (activeA !== activeB) return activeA ? -1 : 1;

    const x = memberProgress(a, s.calls), y = memberProgress(b, s.calls); return y.completed - x.completed || y.best - x.best || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id);

  });

  function readyUp() { if (!me.ready && (model.wallet?.balance ?? 0) < cost) { setLowCoins(true); return; } void model.command('READY', { ready: !me.ready }); }

  function playerRow(m: Member, rank?: number) {

    const progress = memberProgress(m, s.calls), active = s.roster.includes(m.id) && !m.spectator;

    if (lobby) return <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={tr("View {v0}", { v0: m.name })} onPress={() => setViewMember(m.id)} style={{ paddingVertical: 8, borderBottomWidth: .7, borderColor: '#d5b98e' }}><View style={ui.row}><Avatar name={m.name} avatarId={m.avatarId} photo={m.avatarPhoto} online={m.onlineUntil > s.serverNow} size={48} /><View style={{ flex: 1, gap: 4 }}><Text style={{ ...ui.ticketTitle, fontSize: 16 }}>{m.name}{m.id === s.viewerId ? tr(" · You") : ''}</Text><View style={{ alignSelf: 'flex-start' }}><Pill tone={m.ready ? 'green' : m.spectator ? 'purple' : 'gold'}>{m.id === s.hostId ? tr("CAPTAIN · ") : m.id === s.coHostId ? tr("CO-CAPTAIN · ") : ''}{m.ready ? tr("Ready · {v0}", { v0: m.kind === 'half' ? 'Half' : 'Full' }) : m.spectator ? tr("Watching") : tr("Choosing tickets")}</Pill></View></View><View style={{ width: 34, height: 34, borderRadius: 18, backgroundColor: '#ead8b9', alignItems: 'center', justifyContent: 'center' }}>{m.ready ? <GameIcon index={6} size={32} /> : <Icon name={m.spectator ? 'eye' : 'menu'} size={20} color="#755d7b" />}</View>{m.ready && <Icon name="chevron" size={17} color="#54216a" />}</View></Pressable>;

    return <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={tr("View {v0}{v1}", { v0: m.name, v1: active ? `, ${progress.best} marked of 15 on best ticket` : '' })} onPress={() => { setDrawer(null); setViewMember(m.id); }} style={lobby ? { paddingVertical: 7, borderBottomWidth: 1, borderColor: '#ddc69c' } : [ui.card, { padding: 10 }]}><View style={ui.row}>{rank !== undefined && active && <Text style={{ color: '#813eb6', fontWeight: '900', fontSize: 22, minWidth: 23 }}>{rank + 1}</Text>}<Avatar name={m.name} avatarId={m.avatarId} photo={m.avatarPhoto} online={m.onlineUntil > s.serverNow} size={40} /><View style={{ flex: 1, gap: 4 }}><Text style={ui.ticketTitle}>{m.name}{m.id === s.viewerId ? tr(" (you)") : ''}</Text><Text style={ui.muted}>{m.id === s.hostId ? tr("Captain") : m.id === s.coHostId ? tr("Co-captain") : tr("Player")} · {lobby ? m.ready ? tr("Ready · tap to view tickets") : m.spectator ? tr("Watching") : tr("Choosing tickets") : active ? tr("{v0} full · Best {v1}/15 · {v2} left", { v0: progress.completed, v1: progress.best, v2: progress.left }) : tr("Watching")}</Text>{active && !lobby && <View style={{ height: 7, backgroundColor: '#d9c8e4', borderRadius: 4 }}><View style={{ height: 7, width: `${progress.best / 15 * 100}%`, backgroundColor: '#ad43c6', borderRadius: 4 }} /></View>}</View><Text style={{ fontSize: 22, color: '#8d47b4' }}>›</Text></View></Pressable>;

  }

  return <View style={ui.page}>

    {s.phase === 'finished' ? <RoundResultScreen snapshot={s} busy={model.busy} onReplay={onCall} onNext={() => { void model.command('NEXT_ROUND'); }} onNumbers={() => setDrawer('numbers')} onHistory={() => setManagement('history')} onTickets={() => setViewMember(s.viewerId)} onCoins={() => setCoins(true)} /> : s.phase === 'claim' && s.claim ? <AutoVerificationScreen snapshot={s} connected={model.connected} busy={model.busy} onRetry={model.reconnect} onEnd={() => setManagement('end')} onNext={() => { void model.command('NEXT_ROUND'); }} onReplay={onCall} /> : live && host && me.spectator && !me.disqualification ? <HostLiveScreen onSpeedChange={seconds => { void model.command('PACE', { seconds }); }} speedBusy={!!model.pending['table:PACE']} onTogglePause={() => { void model.command('PAUSE', { paused: !s.pause }); }} pauseBusy={model.busy} snapshot={s} balance={model.wallet?.balance} connected={model.connected} onCoins={() => setCoins(true)} onReplay={onCall} onNumbers={() => setDrawer('numbers')} sound={sound} onSound={onSound} onPlayers={() => setDrawer('players')} onMember={setViewMember} onControls={setManagement} /> : lobby ? host ? <TableLobby model={model} onCoins={() => setCoins(true)} onMember={setViewMember} onTickets={() => setPicker(true)} onReady={readyUp} onControls={setManagement} /> : <PlayerLobby model={model} onCoins={() => setCoins(true)} onMember={setViewMember} onTickets={() => setPicker(true)} onReady={readyUp} onControls={() => setManagement('menu')} /> : <>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingTop: 5, paddingBottom: 3 }}><Pressable accessibilityRole="button" accessibilityLabel={tr("Table settings")} onPress={() => setManagement('menu')} style={{ flex: 1 }}><LinearGradient colors={['#582181', '#2f094f']} style={{ minHeight: 67, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 27, borderWidth: 1.5, borderColor: '#bd75e7' }}><TableAvatar id={s.tableAvatarId} photo={s.tableAvatarPhoto} size={57} /><View style={{ flex: 1, alignItems: 'center', paddingRight: 4 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={{ color: '#fff7e7', fontSize: 23, fontFamily: gameFont.bold }}>{s.name}</Text><Text style={{ color: model.connected ? '#ffdd64' : '#ff9aa3', fontSize: 17, fontFamily: gameFont.medium }}>{model.connected ? tr("Round {v0}{v1}", { v0: s.round, v1: me.spectator ? ' \u00b7 Watching' : '' }) : tr("Reconnecting…")}</Text></View></LinearGradient></Pressable><TableAudioControls /></View>

      {s.phase === 'claim' || s.phase === 'host' || s.phase === 'proof' ? <View style={{ flex: 1 }}><ReviewScreen onReplay={onCall} snapshot={s} host={host} busy={model.busy} onNext={() => { void model.command('NEXT_ROUND'); }} onControls={() => setManagement('menu')} /></View> : <>

      {!!me.disqualification && <View accessibilityRole="alert" style={{ marginHorizontal: 7, padding: 9, borderRadius: 12, borderWidth: 1, borderColor: '#ffa6a3', backgroundColor: '#832738' }}><Text style={{ color: '#fff3d5', fontFamily: gameFont.bold, fontSize: 15 }}>{tr('Full house rejected · Watching only')}</Text><Text style={{ color: '#ffe7da', fontSize: 12 }}>{tr('Some numbers were not called. You can play again next round.')}</Text></View>}
      <LiveCallControls callSeconds={s.config.callSeconds} onSpeedChange={host ? seconds => { void model.command('PACE', { seconds }); } : undefined} speedBusy={!!model.pending['table:PACE']} startsAt={s.startsAt} pause={s.pause} serverNow={s.serverNow} connected={model.connected} pauseBusy={model.busy} onTogglePause={host ? () => { void model.command('PAUSE', { paused: !s.pause }); } : undefined} calls={s.calls} players={members.length} onNumbers={() => { setDrawer('numbers'); }} onPlayers={() => setDrawer('players')} onReplay={onCall} />
      {s.calls.length === 90 && s.nextCallAt && <View style={{ ...ui.row, backgroundColor: '#ffe5a1', paddingHorizontal: 12, paddingVertical: 3, marginHorizontal: 7, marginBottom: 4, borderRadius: 9 }}><Text style={{ ...ui.ticketTitle, fontSize: 12 }}>{tr("Last chance for full house")}</Text><Countdown compact label={tr("Claim window")} deadline={s.nextCallAt} serverNow={s.serverNow} /></View>}

      {s.verificationFailure && !me.disqualification && dismissedFailure !== s.verificationFailure.at && <Pressable accessibilityLabel={tr("Dismiss invalid full house notification")} onPress={() => setDismissedFailure(s.verificationFailure!.at)} style={{ padding: 7, backgroundColor: '#ffe1b8', marginHorizontal: 7, borderRadius: 12 }}><Text style={{ color: '#722641', fontSize: 12 }}>{tr('{name}’s full house was rejected. Missing: {numbers}. Watching this round. ×', { name: s.members[s.verificationFailure.by]?.name, numbers: s.verificationFailure.missing.join(', ') })}</Text></Pressable>}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 12 }}>

        {me.disqualification ? <View style={{ gap: 8, paddingTop: 6 }}><TicketPanel compact panel={me.disqualification.panel} index={me.disqualification.panelIndex} count={me.panels.length} marks={me.disqualification.marks} highlights={me.disqualification.panel.flat().flatMap((n, cell) => n !== null && me.disqualification!.missing.includes(n) ? [cell] : [])} title={tr('Your declared ticket')} /><Text style={{ color: '#fff1d4', fontSize: 13, paddingHorizontal: 10 }}>{tr('Not called when you declared: {numbers}', { numbers: me.disqualification.missing.join(', ') })}</Text></View> : !me.spectator && s.roster.includes(me.id) ? <>{me.panels.map((panel, i) => <LiveTicket key={`${s.roundId}:${i}`} panel={panel} index={i} count={me.panels.length} marks={me.marks} pending={model.pendingMarks} onMark={model.connected ? model.mark : undefined} onWin={s.startsAt ? undefined : () => { if (model.connected) setClaimPanel(i); else model.setError('Reconnect before claiming full house.'); }} />)}</> : <View style={{ padding: 7, gap: 12 }}><GameCard><GameIcon index={1} size={90} /><Text style={ui.heading}>{tr("You’re in the front row")}</Text><Text style={ui.text}>{tr("Watch your circle play. Open Players to see their tickets and live marks.")}</Text><Action onPress={() => setDrawer('players')}>{tr("Watch players’ tickets")}</Action>{host && <Action secondary onPress={() => setManagement('menu')}>{tr("Table settings")}</Action>}</GameCard>{ranked.filter(m => s.roster.includes(m.id)).map((m, i) => playerRow(m, i))}</View>}

      </ScrollView></>}

    </>}

    {picker && <TicketChooser model={model} onClose={() => setPicker(false)} onCoins={() => setCoins(true)} />}

    {drawer === 'numbers' ? <NumbersDrawer calls={s.calls} onReplay={onCall} onClose={() => setDrawer(null)} /> : drawer === 'players' && <PlayersDrawer snapshot={s} onClose={() => setDrawer(null)} onMember={id => { setDrawer(null); setViewMember(id); }} />}

    {viewing && <Sheet full title={viewing.name} onClose={() => setViewMember(null)}><GameCard style={{ padding: 10 }}><View style={ui.row}><Avatar name={viewing.name} avatarId={viewing.avatarId} photo={viewing.avatarPhoto} size={48} /><View style={{ flex: 1 }}><Text style={ui.ticketTitle}>{viewing.name}</Text><Text selectable style={ui.text}>{viewing.mobile}</Text><Text style={ui.muted}>{lobby ? viewing.ready ? tr("Ready · Selected tickets") : tr("Tickets appear when ready") : tr("Live ticket marks")}</Text></View></View></GameCard><ScrollView contentContainerStyle={{ paddingVertical: 5 }}><HostMemberActions model={model} snapshot={s} member={viewing} />{viewing.panels.length ? viewing.panels.map((panel, i) => <TicketPanel compact key={i} panel={panel} index={i} count={viewing.panels.length} marks={viewing.marks} />) : <Notice>{tr("No selected tickets to show yet.")}</Notice>}</ScrollView></Sheet>}

    {claimPanel !== null && <Sheet title={tr("Full house?")} onClose={() => setClaimPanel(null)}><GameCard><Text style={ui.text}>{tr("Check Ticket")}{' '}{claimPanel + 1} {' '}{tr("now? All 15 numbers must have been called. A rejected claim makes you watch-only for this round.")}</Text><Action busy={!!model.pending['table:CLAIM']} disabled={model.busy} onPress={() => { const panel = claimPanel; void model.command('CLAIM', { panel }).then(ok => { if (ok) setClaimPanel(null); }); }}>{tr("Full house! Check my ticket")}</Action><Action secondary small onPress={() => setClaimPanel(null)}>{tr("Keep marking")}</Action></GameCard></Sheet>}

    {lowCoins && <LowCoinsDialog balance={model.wallet?.balance} cost={cost} kind={me.kind} busy={model.busy} onClose={() => setLowCoins(false)} onCoins={() => { setLowCoins(false); setCoins(true); }} onWatch={() => { void model.command('WATCH').then(ok => { if (ok) setLowCoins(false); }); }} />}

    {coins && <WalletSheet model={model} onClose={() => setCoins(false)} />}

    {preferences && <GamePreferencesSheet sound={sound} onSound={onSound} onClose={() => setPreferences(false)} onPreview={() => onCall(23)} onReplay={s.calls.length ? () => onCall(s.calls.at(-1)!) : undefined} />}

    {management && <TableManagement model={model} snapshot={s} initialPage={management} onClose={() => setManagement(null)} onPlay={() => { setManagement(null); setPicker(true); }} onPreferences={() => { setManagement(null); setPreferences(true); }} />}

  </View>;

}
