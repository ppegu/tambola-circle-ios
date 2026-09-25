import { t as tr, useLanguage } from '../i18n';
import { TextInput } from '../i18n/Text';
import { useScreenNavigation } from '../navigation/ScreenContext';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl} from 'react-native';
import { request } from '../api';
import { validConfig, type RoomSnapshot, type RoomState } from '../../shared/online';
import { Action, Countdown, Notice, Pill, ScrollView, Sheet, Text, View, ui } from './components';
import { AvatarPicker } from './AvatarPicker';
import { GameCard } from '../components/GameArtwork';
import { TimingFields } from './TableSetupFields';
import type { OnlineModel } from './useOnline';
import { EndRoundDialog } from './EndRoundDialog';
import { HostControls } from './HostControls';
import { RoundArchive } from './RoundArchive';
import { shareTableInvite } from './shareTableInvite';
import { ScreenSkeleton } from '../navigation/skeletons';

export type ControlPage = 'end' | 'menu' | 'invite' | 'settings' | 'members' | 'cohost' | 'transfer' | 'history' | 'schedule';
export function TableManagement({ model, snapshot: s, onClose, onPlay, onPreferences, initialPage = 'menu' }: { model: OnlineModel; snapshot: RoomSnapshot; onClose: () => void; onPlay?: () => void; onPreferences?: () => void; initialPage?: ControlPage }) {
  useLanguage();
  const navigation = useScreenNavigation();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [page, setLocalPage] = useState(initialPage), [config, setConfig] = useState({ ...s.nextConfig });
  const setPage = (next: ControlPage) => navigation ? navigation.push('TableSettings', { page: next }) : setLocalPage(next);
  const [ending, setEnding] = useState(initialPage === 'end');
  const [history, setHistory] = useState<{ state: RoomState; rounds: number[] } | null>(null), [historyRound, setHistoryRound] = useState<number | undefined>();
  const [dateText, setDateText] = useState(''), [historyLoading, setHistoryLoading] = useState(false), [historyError, setHistoryError] = useState('');
  const historyRequest = useRef(0), host = s.hostId === s.viewerId, dirty = JSON.stringify(config) !== JSON.stringify(s.nextConfig);
  const chosenTime = (() => {
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(dateText);
    if (!match) return null;
    const [, y, m, d, h, min] = match, date = new Date(+y!, +m! - 1, +d!, +h!, +min!);
    if (date.getFullYear() !== +y! || date.getMonth() !== +m! - 1 || date.getDate() !== +d! || date.getHours() !== +h! || date.getMinutes() !== +min!) return null;
    const at = date.getTime();
    return at >= s.serverNow + 10000 && at <= s.serverNow + 7 * 86400000 ? at : null;
  })();
  async function loadHistory(round = historyRound) {
    const seq = ++historyRequest.current; setHistoryLoading(true); setHistoryError('');
    try {
      const data = await request<NonNullable<typeof history>>(`/v2/tables/${s.id}/history?after=0${round ? '&round=' + round : ''}`, { token: model.identity!.key });
      if (seq === historyRequest.current) setHistory(data);
    } catch { if (seq === historyRequest.current) setHistoryError(tr("Couldn’t load round history. Pull down to try again.")); }
    finally { if (seq === historyRequest.current) setHistoryLoading(false); }
  }
  useEffect(() => { if (page === 'history') void loadHistory(); return () => { historyRequest.current++; }; }, [page, historyRound]);
  async function schedule(at: number | null) { if (await model.command('SCHEDULE', { at })) onClose(); }
  function leave() { Alert.alert(tr("Leave this table?"), s.phase === 'lobby' ? tr("Any reserved entry coins will be returned.") : tr("Leaving a live round does not refund its entry. You can rejoin from Play online."), [{ text: tr("Cancel"), style: 'cancel' }, { text: tr("Leave"), style: 'destructive', onPress: () => { void model.command('LEAVE').then(ok => { if (ok && !navigation) onClose(); }); } }]); }
  function play() {
    if (s.phase === 'lobby' && !s.members[s.viewerId]!.panels.length) { onPlay?.(); return; }
    void model.command('WATCH', { watching: false });
  }
  if (ending && s.phase !== 'finished') return <EndRoundDialog snapshot={s} busy={!!model.pending['table:END']} onClose={() => setEnding(false)} onEnd={async () => !!(await model.command('END'))} />;
  if (page !== 'history' && page !== 'schedule') return <Sheet title={tr("Table settings")} full onClose={onClose}><HostControls snapshot={s} onAvatar={() => setAvatarOpen(true)} busy={model.busy || !model.connected} onPage={setPage} onShare={() => { void shareTableInvite(s); }} onEnd={() => setEnding(true)} onLeave={leave} onExit={() => { model.exitTableView(); if (!navigation) onClose(); }} onPlay={play} onWatch={() => { void model.command('WATCH', { watching: true }); }} onPreferences={onPreferences} onReclaim={() => { void model.command('RECLAIM'); }} rules={host ? <View style={{ gap: 7 }}><TimingFields config={config} onChange={setConfig} />{dirty && <><Notice>{s.phase === 'lobby' ? tr("Players will get ready again after rules change.") : tr("Changes apply to the next round.")}</Notice><Action small busy={!!model.pending['table:SETTINGS']} disabled={model.busy || !validConfig(config)} onPress={() => { void model.command('SETTINGS', { config }); }}>{tr("Save rules")}</Action></>}</View> : <GameCard><Text style={ui.ticketTitle}>{tr("Round rules")}</Text><Text style={ui.text}>{tr("Calls every")}{' '}{s.config.callSeconds}{tr("s · Half")}{' '}{s.config.halfCoins} {' '}{tr("coins · Full")}{' '}{s.config.fullCoins} {' '}{tr("coins")}</Text></GameCard>} />{avatarOpen && host && <AvatarPicker table selected={s.tableAvatarId ?? 0} selectedPhoto={s.tableAvatarPhoto} busy={!!model.pending['table:TABLE_AVATAR']} onClose={() => setAvatarOpen(false)} onSelect={async (id, photo) => { if (id === (s.tableAvatarId ?? 0) && photo === s.tableAvatarPhoto) { setAvatarOpen(false); return; } if (await model.command('TABLE_AVATAR', { tableAvatarId: id, tableAvatarPhoto: photo ?? null })) setAvatarOpen(false); }} />}</Sheet>;
  return <Sheet title={page === 'history' ? tr("Round history") : tr("Game countdown")} full onClose={onClose}><ScrollView refreshControl={page === 'history' ? <RefreshControl refreshing={historyLoading && !!history} onRefresh={() => { if (!historyLoading) void loadHistory(); }} colors={['#923ecb']} tintColor="#ffe57e" /> : undefined} contentContainerStyle={{ gap: 13, paddingBottom: 22 }}>
    {page === 'schedule' && <GameCard><Text style={ui.heading}>{tr("Start together")}</Text><Text style={ui.text}>{tr("A scheduled game starts automatically with at least two ready players.")}</Text>{s.scheduledAt ? <Countdown deadline={s.scheduledAt} serverNow={s.serverNow} label={tr("Game starts in")} hero /> : <Pill tone="gold">{tr("Manual start")}</Pill>}<View style={ui.row}>{[2, 5, 10].map(min => <Action key={min} small disabled={model.busy} onPress={() => { void schedule(s.serverNow + min * 60000); }}>{tr("In")}{' '}{min} {' '}{tr("min")}</Action>)}</View><Text style={ui.ticketTitle}>{tr("Or choose a local date and time")}</Text><TextInput accessibilityLabel={tr("Game start local date and time")} style={ui.input} placeholder={tr("YYYY-MM-DD HH:mm")} placeholderTextColor="#968193" value={dateText} onChangeText={setDateText} /><Action secondary disabled={model.busy || chosenTime === null} onPress={() => { if (chosenTime !== null) void schedule(chosenTime); }}>{tr("Set game time")}</Action>{s.scheduledAt && <Action small purple disabled={model.busy} onPress={() => { void schedule(null); }}>{tr("Use manual start")}</Action>}</GameCard>}
    {page === 'history' && <>{historyLoading && !history && <ScreenSkeleton kind="PastGame" />}{!!historyError && <Notice tone="red">{historyError}</Notice>}<GameCard><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{[...new Set([s.round, ...(history?.rounds ?? [])])].map(round => <Action small key={round} purple={round !== (historyRound ?? s.round)} onPress={() => { setHistoryRound(round); setHistory(null); }}>{tr("Round")}{' '}{round}</Action>)}</View></GameCard>{history && <RoundArchive key={history.state.roundId} round={history.state.round} phase={history.state.phase} calls={history.state.calls} reason={history.state.result?.reason} winner={history.state.result?.winner ? history.state.members[history.state.result.winner]?.name ?? tr('Winner') : null} at={history.state.result?.at} tickets={Object.values(history.state.members).filter(m => m.panels.length)} />}</>}
  </ScrollView></Sheet>;
}
