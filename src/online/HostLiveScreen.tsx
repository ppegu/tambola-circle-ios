import { t as tr, useLanguage } from '../i18n';
import { Text } from '../i18n/Text';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { memberProgress, type RoomSnapshot } from '../../shared/online';
import { CoinChip, GameLogo } from '../components/GameArtwork';
import { LinearGradient } from '../components/LinearGradient';
import { Pressable } from '../components/Pressable';
import { LiveCallControls } from './LiveCallControls';
import { TableAudioControls } from '../voiceChat/TableAudioControls';
import { gameFont } from '../gameTypography';
import { Avatar, Icon } from './components';

export function HostLiveScreen({ snapshot: s, balance, connected, onCoins, onReplay, onNumbers, sound, onSound, onPlayers, onMember, onControls, onTogglePause, pauseBusy, onSpeedChange, speedBusy }: { onSpeedChange: (seconds: number) => void; speedBusy: boolean; onTogglePause: () => void; pauseBusy: boolean; snapshot: RoomSnapshot; balance?: number; connected: boolean; sound?: boolean; onSound?: (enabled: boolean) => void; onNumbers: () => void; onCoins: () => void; onReplay: (number: number) => void; onPlayers: () => void; onMember: (id: string) => void; onControls: (page: 'menu' | 'cohost' | 'transfer' | 'end') => void }) {
  useLanguage();
  const called = new Set(s.calls), owner = s.ownerId === s.viewerId;
  const players = Object.values(s.members).filter(m => !m.removed && !m.left && s.roster.includes(m.id) && !m.spectator);
  return <View style={styles.screen}>
    <View style={styles.top}><GameLogo width={130} /><TableAudioControls /><CoinChip compact balance={balance} onPress={onCoins} /></View>
    <LinearGradient colors={['#5d2592', '#38136c', '#240c51']} style={styles.hero}>
      <View style={styles.titleRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.tableName}>{s.name}</Text><Text style={styles.round}>{connected ? tr("Round {v0}", { v0: s.round }) : tr("Reconnecting…")}</Text></View><View style={styles.hostBadge}><Icon name="crown" size={16} color="#412000" /><Text style={styles.hostText}>{owner ? tr("CAPTAIN") : tr("ACTING CAPTAIN")}</Text></View><View style={styles.watching}><Icon name="eye" size={15} color="#fff" /><Text style={styles.watchingText}>{tr("Watching")}</Text></View></View>
      <LiveCallControls callSeconds={s.config.callSeconds} onSpeedChange={onSpeedChange} speedBusy={speedBusy} startsAt={s.startsAt} pause={s.pause} serverNow={s.serverNow} onTogglePause={onTogglePause} pauseBusy={pauseBusy} connected={connected} calls={s.calls} players={players.length} onNumbers={onNumbers} onPlayers={onPlayers} onReplay={onReplay} />
    </LinearGradient>
    <LinearGradient accessibilityLabel={tr("{v0} numbers called, {v1} remaining", { v0: s.calls.length, v1: 90 - s.calls.length })} colors={['#ffe36d', '#ffba30']} style={styles.board}>
      {Array.from({ length: 9 }, (_, row) => <View key={row} style={styles.boardRow}>{Array.from({ length: 10 }, (_, column) => {
        const number = row * 10 + column + 1, marked = called.has(number);
        return <Pressable accessibilityRole={marked ? 'button' : 'text'} accessibilityLabel={`${number}, ${marked ? tr('called, replay') : tr('not called')}`} disabled={!marked} onPress={() => onReplay(number)} key={number} style={styles.cell}><View key={marked ? 'called' : 'waiting'} style={[styles.cellFace, marked && styles.called]}><Text maxFontSizeMultiplier={1.1} adjustsFontSizeToFit style={[styles.cellNumber, marked && { color: '#fff' }]}>{number}</Text></View></Pressable>;
      })}</View>)}
    </LinearGradient>
    <LinearGradient colors={['#562588', '#381369']} style={styles.players}><View style={styles.playersHeader}><Text style={styles.playersTitle}>{tr("Players (")}{players.length})</Text><Pressable accessibilityRole="button" accessibilityLabel={tr("All players")} onPress={onPlayers} style={styles.allPlayers}><Text style={styles.allPlayersText}>{tr("All players")}</Text><Icon name="chevron" size={17} color="#45eeff" /></Pressable></View><View style={styles.playerRow}>{players.slice(0, 3).map(member => {
      const progress = memberProgress(member, s.calls);
      return <Pressable key={member.id} accessibilityRole="button" accessibilityLabel={tr("View {v0}, best ticket {v1} of 15", { v0: member.name, v1: progress.best })} onPress={() => onMember(member.id)} style={styles.player}><Avatar name={member.name} avatarId={member.avatarId} photo={member.avatarPhoto} size={34} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.playerName}>{member.name}</Text><Text style={styles.playerScore}>{progress.best}<Text style={{ fontSize: 10 }}>/15</Text></Text><View style={styles.progressTrack}><View style={{ width: `${progress.best / 15 * 100}%`, height: 4, backgroundColor: '#1fdd6d', borderRadius: 3 }} /></View></View></Pressable>;
    })}</View></LinearGradient>
    <Pressable accessibilityRole="button" accessibilityLabel={tr("Table settings")} onPress={() => onControls('menu')} style={styles.controls}><View style={styles.controlsHeader}><Icon name="settings" size={23} color="#ffe17f" /><Text style={[styles.controlsTitle, { color: '#fff6e6', flex: 1, marginLeft: 9 }]}>{tr("Table settings")}</Text><Icon name="chevron" color="#ffe17f" size={22} /></View></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 6, paddingHorizontal: 8, paddingBottom: 6 }, top: { height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { borderWidth: 1.5, borderBottomWidth: 3, borderColor: '#b966eb', borderBottomColor: '#7133b0', borderRadius: 20, padding: 8, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, tableName: { color: '#fff5e7', fontFamily: gameFont.bold, fontSize: 17 }, round: { color: '#ffda43', fontSize: 14, fontFamily: gameFont.medium },
  hostBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 4, gap: 4, borderRadius: 16, borderWidth: 1, borderColor: '#fff19a', backgroundColor: '#ffd437' }, hostText: { color: '#3e2100', fontSize: 10, fontFamily: gameFont.bold }, watching: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 16, backgroundColor: '#009bb5', borderColor: '#74f3f5', borderWidth: 1 }, watchingText: { color: '#fff', fontSize: 10, fontFamily: gameFont.medium },
  board: { flex: 1, minHeight: 190, borderWidth: 1.5, borderBottomWidth: 4, borderColor: '#ffed9e', borderBottomColor: '#b97510', borderRadius: 18, padding: 6 }, boardRow: { flex: 1, flexDirection: 'row' }, cell: { flex: 1, borderWidth: .5, borderColor: '#d8b483', backgroundColor: '#fff0d2', borderRadius: 3, alignItems: 'center', justifyContent: 'center', minWidth: 0 }, cellFace: { width: '92%', aspectRatio: 1, maxHeight: '92%', borderRadius: 40, overflow: 'hidden', borderWidth: .6, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, called: { backgroundColor: '#f32442', borderColor: '#fff8cd' }, cellNumber: { color: '#271b14', fontFamily: gameFont.medium, fontSize: 14 },
  players: { borderWidth: 1.3, borderBottomWidth: 3, borderColor: '#a663d8', borderBottomColor: '#6932a2', borderRadius: 17, padding: 8, gap: 5 }, playersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, playersTitle: { color: '#fff5eb', fontFamily: gameFont.medium, fontSize: 17 }, allPlayers: { flexDirection: 'row', alignItems: 'center', minHeight: 30 }, allPlayersText: { color: '#52eaff', fontFamily: gameFont.medium, fontSize: 13 }, playerRow: { flexDirection: 'row', gap: 8 }, player: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 }, playerName: { color: '#fff5ee', fontFamily: gameFont.medium, fontSize: 11 }, playerScore: { color: '#ffdb41', fontFamily: gameFont.medium, fontSize: 16 }, progressTrack: { height: 4, backgroundColor: '#705384', borderRadius: 3 },
  controls: { borderRadius: 20, borderWidth: 1, borderColor: '#fff7e4', paddingHorizontal: 10, paddingTop: 4, paddingBottom: 7, gap: 4 }, handle: { alignSelf: 'center', width: 35, height: 4, borderRadius: 3, backgroundColor: '#d9b893' }, controlsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, controlsTitle: { fontSize: 19, fontFamily: gameFont.bold, color: '#24112f' }, more: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }, controlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 35, borderWidth: .7, borderColor: '#d8bc9c', borderRadius: 10, paddingHorizontal: 10 }, controlLabel: { flex: 1, minWidth: 0, color: '#291333', fontFamily: gameFont.medium, fontSize: 14 }, end: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 36, borderWidth: 1.4, borderColor: '#e31931', borderRadius: 13, backgroundColor: '#ffe8e3' }, endText: { color: '#ca122a', fontFamily: gameFont.bold, fontSize: 17 },
});
