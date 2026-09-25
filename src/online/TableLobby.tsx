import { TableAudioControls } from '../voiceChat/TableAudioControls';
import { useScreenNavigation } from '../navigation/ScreenContext';
import { PaperFiligree } from '../components/GameFinish';
import { CaptainSeatSwitch, SetupChoice } from './TableSetupFields';
import { TableAvatar } from '../components/TableAvatar';
import { t as tr, useLanguage } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, StyleSheet } from 'react-native';
import { ticketCost, type Member } from '../../shared/online';
import * as Clipboard from '../native/clipboard';
import { CoinChip, GameLogo, GameButton } from '../components/GameArtwork';
import { LinearGradient } from '../components/LinearGradient';
import { gameFont } from '../gameTypography';
import { Avatar, Countdown, GameIcon, Icon, IconButton, Pressable, Text, View, ui } from './components';
import { shareTableInvite } from './shareTableInvite';
import type { OnlineModel } from './useOnline';

type Props = { model: OnlineModel; onCoins: () => void; onMember: (id: string) => void; onTickets: () => void; onReady: () => void; onControls: (page: 'menu' | 'invite' | 'settings' | 'schedule') => void };

function LobbyPlayer({ member: m, host, cohost, you, online, onPress, height }: { member: Member; host: boolean; cohost: boolean; you: boolean; online: boolean; onPress: () => void; height: number }) {
  useLanguage();
  const ready = m.ready && m.selected && !m.spectator;
  return <Pressable accessibilityRole="button" accessibilityLabel={tr("View {v0}", { v0: m.name })} onPress={onPress} style={{ height, paddingBottom: 6 }}>
    <LinearGradient colors={['#fff8e9', '#f5e2be', '#edd3a7']} style={styles.player}>
      <Avatar name={m.name} avatarId={m.avatarId} photo={m.avatarPhoto} online={online} size={60} />
      <View style={styles.playerInfo}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.playerName}>{m.name}{you ? tr(" · You") : ''}</Text>{(host || cohost) && <Icon name="crown" color="#cc8609" size={18} />}</View>
        <Text numberOfLines={1} style={styles.playerDetail}>{host ? tr("Captain · ") : cohost ? tr("Co-captain · ") : ''}{m.spectator ? tr("Watching") : m.selected ? tr("{v0} ticket", { v0: m.kind === 'full' ? tr('Full') : tr('Half') }) : tr("Choosing tickets")}</Text>
      </View>
      <LinearGradient colors={ready ? ['#42cb76', '#078640'] : m.spectator ? ['#ede5ff', '#b7a2df'] : ['#ffeaa9', '#ebbc61']} style={styles.status}>
        <Icon name={ready ? 'check' : m.spectator ? 'eye' : 'ticket'} size={17} color={ready ? '#fff' : '#522b6b'} /><Text style={[styles.statusText, ready && { color: '#fff' }]}>{ready ? tr("Ready") : m.spectator ? tr("Watching") : tr("Choosing")}</Text>
      </LinearGradient><Icon name="chevron" size={17} color="#907a98" />
    </LinearGradient>
  </Pressable>;
}

/** Host and player share one lobby layout; only their footer actions differ. */
export function TableLobby({ model, onCoins, onMember, onTickets, onReady, onControls }: Props) {
  useLanguage();
  const navigation = useScreenNavigation();
  const s = model.snapshot!, me = s.members[s.viewerId]!, host = s.hostId === me.id;
  const members = Object.values(s.members).filter(m => !m.left && !m.removed).sort((a, b) => Number(b.id === s.hostId) - Number(a.id === s.hostId) || a.joinedAt - b.joinedAt);
  const ready = members.filter(m => m.ready && m.selected && !m.spectator), eligible = members.filter(m => m.selected && !m.spectator && (m.ready || m.id === s.hostId)), watching = members.filter(m => m.spectator).length;
  const [copied, setCopied] = useState(false), [listHeight, setListHeight] = useState(320), [footerHeight, setFooterHeight] = useState(132);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null), disabled = model.busy || !model.connected;
  const rowHeight = Math.max(78, Math.min(104, listHeight / Math.min(4, Math.max(1, members.length))));
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  async function copy() { try { await Clipboard.setStringAsync(s.code); setCopied(true); AccessibilityInfo.announceForAccessibility(tr("Table code copied")); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 2200); } catch { model.setError(tr("Could not copy the code. Please try again.")); } }
  const switchSeat = (watch: boolean) => { if (watch === me.spectator) return; void model.command('WATCH', { watching: watch }); };
  return <View style={ui.page}>
    <View style={styles.header}><IconButton name="back" label={tr("Back to Play online")} light goldRim onPress={model.exitTableView} /><View style={{ flex: 1, alignItems: 'center' }}><GameLogo width={116} /></View><CoinChip compact balance={model.wallet?.balance} onPress={onCoins} /></View>
    <View style={[styles.body, { paddingBottom: footerHeight + 7 }]}>
      <LinearGradient colors={['#5b2088', '#320b54', '#230639']} style={styles.tableBanner}><TableAvatar id={s.tableAvatarId} photo={s.tableAvatarPhoto} size={39} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.tableName}>{s.name}</Text><Text style={styles.round}>{tr("Round")}{' '}{s.round} {' '}{tr("· Lobby")}</Text></View><TableAudioControls /><IconButton name="settings" label={tr("Table settings")} light goldRim onPress={() => onControls('menu')} /></LinearGradient>
      <View style={styles.codeRow}><Text style={styles.codeLabel}>{tr("Code")}</Text><Pressable accessibilityRole="button" accessibilityLabel={copied ? tr("Table code copied") : tr("Copy table code")} onPress={() => { void copy(); }} style={styles.codePill}><LinearGradient pointerEvents="none" colors={['#702397', '#431061', '#2e0746']} style={StyleSheet.absoluteFill} /><Text maxFontSizeMultiplier={1.1} style={styles.code}>{s.code.slice(0, 3)} {s.code.slice(3)}</Text><Icon name={copied ? 'check' : 'copy'} size={21} color="#ffe28a" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={tr("Invite friends")} onPress={() => { void shareTableInvite(s); }}><LinearGradient colors={['#24e4eb', '#06aaba', '#047c92']} style={styles.share}><Icon name="share" size={23} /></LinearGradient></Pressable>{host && navigation && <IconButton name="user-plus" label={tr("Invite a player")} light onPress={() => navigation.push('InvitePlayers')} />}</View>
      {!!s.scheduledAt && <Countdown deadline={s.scheduledAt} serverNow={s.serverNow} label={tr("Game starts in")} />}
      <LinearGradient colors={['#fff7df', '#f6e7cb', '#dfbd81']} style={styles.roster}><View pointerEvents="none" style={styles.rosterRim} /><PaperFiligree />
        <FlatList style={{ flex: 1 }} onLayout={event => setListHeight(event.nativeEvent.layout.height)} data={members} keyExtractor={member => member.id} initialNumToRender={5} maxToRenderPerBatch={4} windowSize={5} showsVerticalScrollIndicator={false} renderItem={({ item }) => <LobbyPlayer member={item} host={item.id === s.hostId} cohost={item.id === s.coHostId} you={item.id === me.id} online={item.onlineUntil > s.serverNow} height={rowHeight} onPress={() => onMember(item.id)} />} />
        <View style={styles.summary}><Icon name="groups" size={20} color="#532371" /><Text style={styles.summaryText}>{members.length} {' '}{tr("players ·")}{' '}{ready.length} {' '}{tr("ready ·")}{' '}{watching} {' '}{tr("watching")}</Text></View>
      </LinearGradient>
    </View>
    <LinearGradient onLayout={event => setFooterHeight(event.nativeEvent.layout.height)} colors={['#4c186e', '#2b0749', '#220438']} style={styles.footer}>
      <View style={styles.widgets}>
        {!me.spectator && <View style={styles.ticketWidget}><Pressable accessibilityRole="button" accessibilityLabel={me.panels.length ? tr("My tickets") : tr("Choose tickets")} onPress={onTickets} style={styles.ticketHit}><GameIcon index={6} size={25} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.85} maxFontSizeMultiplier={1.15} style={styles.widgetTitle}>{tr("Tickets")}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.85} maxFontSizeMultiplier={1.15} style={styles.widgetSubtitle}>{me.kind === 'full' ? tr("Full") : tr("Half")} · {ticketCost(s.config, me.kind)}</Text></View></Pressable>
        </View>}
        <View style={styles.seatWidget}>{host ? <CaptainSeatSwitch playing={!me.spectator} disabled={disabled} onChange={playing => switchSeat(!playing)} /> : [false, true].map(watch => <SetupChoice compact key={String(watch)} label={watch ? tr("Watch") : tr("Play")} icon={watch ? 'eye' : 'play'} selected={me.spectator === watch} disabled={disabled} onPress={() => switchSeat(watch)} />)}</View>
      </View>
      {host ? <GameButton glyph="play" disabled={eligible.length < 2 || (!me.spectator && !me.selected) || disabled} busy={!!model.pending['table:START']} onPress={() => { void model.command('START'); }} style={styles.start}>{tr("Start round")}</GameButton>
        : !me.spectator ? <GameButton glyph="check" disabled={!me.selected || disabled} busy={!!model.pending['table:READY']} onPress={onReady} style={styles.start}>{me.ready ? tr("Ready · Waiting for captain") : tr("Ready to play")}</GameButton>
        : <Text style={styles.waiting}>{s.scheduledAt ? tr("Starts at the scheduled time") : tr("Waiting for the captain")}</Text>}
    </LinearGradient>
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 5 }, body: { flex: 1, minHeight: 0, paddingHorizontal: 10, gap: 6 },
  tableBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 65, paddingLeft: 13, paddingRight: 6, paddingVertical: 5, borderRadius: 24, borderWidth: 1.5, borderColor: '#f6d174', borderBottomWidth: 3, borderBottomColor: '#916220' }, tableName: { textAlign: 'center', fontFamily: gameFont.bold, fontSize: 23, color: '#ffe999', includeFontPadding: false }, round: { textAlign: 'center', fontFamily: gameFont.medium, fontSize: 13, color: '#d9c0ed', marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48 }, codeLabel: { fontFamily: gameFont.medium, fontSize: 15, color: '#ede0fa' }, codePill: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, borderRadius: 23, borderWidth: 1, borderColor: '#c879ef', backgroundColor: '#3f0d64', overflow: 'hidden' }, code: { fontFamily: gameFont.bold, fontSize: 24, color: '#ffdf74', includeFontPadding: false, letterSpacing: 1 }, share: { width: 44, height: 42, borderRadius: 13, borderWidth: 1, borderColor: '#5aeaf0', borderBottomWidth: 3, borderBottomColor: '#03687b', alignItems: 'center', justifyContent: 'center' },
  roster: { flex: 1, minHeight: 0, borderRadius: 24, borderWidth: 2, borderBottomWidth: 4, borderColor: '#edc678', borderBottomColor: '#b78b41', padding: 9, paddingTop: 18, paddingBottom: 7 }, rosterRim: { position: 'absolute', top: 3, bottom: 3, left: 3, right: 3, borderWidth: 1, borderRadius: 20, borderColor: '#fff4d5' }, summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 34 }, summaryText: { fontFamily: gameFont.medium, fontSize: 12, color: '#47205e' },
  player: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 7, borderRadius: 20, borderWidth: 1, borderColor: '#fff6dd', borderBottomColor: '#d7b581', borderBottomWidth: 2 }, playerInfo: { flex: 1, minWidth: 0, gap: 4 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 }, playerName: { fontFamily: gameFont.bold, fontSize: 16, color: '#341047', flexShrink: 1 }, playerDetail: { fontFamily: gameFont.medium, fontSize: 11, color: '#775a81' }, status: { flexDirection: 'row', gap: 3, alignItems: 'center', paddingHorizontal: 7, paddingVertical: 7, borderRadius: 17, borderWidth: .7, borderColor: '#ffffff77' }, statusText: { fontFamily: gameFont.medium, fontSize: 12, color: '#4e2e6c' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 7, gap: 9, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderTopWidth: 1, borderColor: '#7b409f' }, widgets: { flexDirection: 'row', gap: 6 }, ticketWidget: { flex: .9, flexDirection: 'row', minWidth: 0, borderRadius: 19, borderWidth: 1.2, borderColor: '#dfb960', borderBottomWidth: 3, borderBottomColor: '#67401b', backgroundColor: '#4c1974' }, ticketHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, minWidth: 0, paddingHorizontal: 5 }, widgetTitle: { fontFamily: gameFont.bold, fontSize: 12, color: '#fff2ae' }, widgetSubtitle: { fontFamily: gameFont.medium, fontSize: 10, color: '#e5cdf4' },
  seatWidget: { flex: 1.1, minWidth: 0, flexDirection: 'row', gap: 3, padding: 2, borderRadius: 20, borderWidth: 1.2, borderColor: '#dfb960', backgroundColor: '#391052' }, start: { minHeight: 48, borderRadius: 24 }, waiting: { color: '#efdefb', fontFamily: gameFont.medium, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
});
