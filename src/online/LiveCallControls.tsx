import { t as tr, useLanguage } from '../i18n';
import { Text } from '../i18n/Text';
import React, { useEffect, useId, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
import { Pressable } from '../components/Pressable';
import { LinearGradient } from '../components/LinearGradient';
import { Icon } from '../components/CircleArtwork';
import { GameFinish } from '../components/GameFinish';
import { CallProgress } from '../components/CallerVolume';
import { gameFont } from '../gameTypography';
import type { RoomState } from '../../shared/online';
import { CallerSpeed } from '../components/CallerSpeed';

function CallBall({ number, size, red = false }: { number?: number; size: number; red?: boolean }) {
  useLanguage();
  const id = useId().replace(/:/g, '');
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill} pointerEvents="none"><Defs><RadialGradient id={id} cx="32%" cy="24%" r="77%"><Stop offset={0} stopColor={red ? '#ffb6bb' : '#fffbd0'} /><Stop offset={0.48} stopColor={red ? '#ff3150' : '#ffdb49'} /><Stop offset={1} stopColor={red ? '#a7062e' : '#db7b05'} /></RadialGradient></Defs><Circle cx={50} cy={50} r={47} fill={`url(#${id})`} stroke={red ? '#ff7386' : '#fff59a'} strokeWidth={2} /><Circle cx={50} cy={50} r={34} fill={red ? '#fff3e7' : '#ffe08a'} stroke={red ? '#de123c' : '#c88b22'} strokeWidth={1.2} /><Path d="M17 38Q27 5 59 12" fill="none" stroke="#fffbd5" strokeWidth={3} strokeLinecap="round" opacity={.8} /></Svg><Text numberOfLines={1} maxFontSizeMultiplier={1} style={{ color: '#442315', fontSize: size * .46, fontFamily: gameFont.bold, includeFontPadding: false, fontVariant: ['tabular-nums'] }}>{number ?? '–'}</Text></View>;
}

function SideControl({ title, name, label, onPress, previous, cyan }: { title: string; name: string; label: string; onPress: () => void; previous?: number | null; cyan?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 70, height: 85, borderRadius: 22, borderWidth: 1, borderBottomWidth: 3, borderColor: cyan ? '#94fbff' : '#d8a1ff', borderBottomColor: cyan ? '#064e74' : '#3f086d', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 2, transform: [{ scale: pressed ? .97 : 1 }] })}><GameFinish tone={cyan ? 'cyan' : 'purple'} radius={21} /><Icon name={name} size={23} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.7} maxFontSizeMultiplier={1.1} style={{ color: '#fff9df', fontSize: 12, fontFamily: gameFont.medium }}>{title}</Text>{previous !== undefined ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="history" size={12} /><Text accessibilityLabel={tr('Previous number {number}', { number: previous ?? tr('none') })} style={{ color: '#fff8d9', fontFamily: gameFont.bold, fontSize: 19 }}>{previous ?? '\u2013'}</Text></View> : <Icon name="down" size={15} />}</Pressable>;
}

const CallGlow = React.memo(function CallGlow() {
  const id = 'glow' + useId().replace(/:/g, '');
  return <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 180 100" style={StyleSheet.absoluteFill}><Defs><RadialGradient id={id}><Stop offset="0" stopColor="#ffdb58" stopOpacity={.8} /><Stop offset={.5} stopColor="#d461f7" stopOpacity={.4} /><Stop offset="1" stopColor="#8a33c3" stopOpacity={0} /></RadialGradient></Defs><Circle cx={90} cy={50} r={70} fill={`url(#${id})`} />{[[23,22,1],[150,19,.7],[159,72,1],[26,77,.65]].map(([x,y,z],i)=><Path key={i} d="M0 -8L2 -2 8 0 2 2 0 8 -2 2 -8 0 -2 -2Z" transform={`translate(${x} ${y}) scale(${z})`} fill="#ffe777" stroke="#fff4ac" strokeWidth={.7} />)}</Svg>;
});

type Props = Pick<RoomState, 'startsAt' | 'pause'> & {
  calls: number[]; players: number; serverNow: number; onNumbers: () => void; onPlayers: () => void;
  onReplay: (n: number) => void; onTogglePause?: () => void; pauseBusy?: boolean; connected?: boolean;
  callSeconds: number; onSpeedChange?: (seconds: number) => void; speedBusy?: boolean;
};

export function LiveCallControls({ calls, players, startsAt, pause, serverNow, onNumbers, onPlayers, onReplay, onTogglePause, pauseBusy, connected = true, callSeconds, onSpeedChange, speedBusy }: Props) {
  useLanguage();
  const current = calls.at(-1), previous = calls.at(-2);
  // Tick only this small control. The server remains the authority for the first draw.
  const clock = useRef({ serverNow, receivedAt: Date.now() });
  if (clock.current.serverNow !== serverNow) clock.current = { serverNow, receivedAt: Date.now() };
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!startsAt || pause) return;
    const timer = setInterval(() => setTick(value => value + 1), 100);
    return () => clearInterval(timer);
  }, [startsAt, !!pause]);
  const now = clock.current.serverNow + Date.now() - clock.current.receivedAt;
  const seconds = startsAt ? Math.max(0, Math.ceil((pause ? pause.remainingMs : startsAt - now) / 1000)) : 0;
  const status = !connected ? tr('Reconnecting…') : pause ? tr('Calls paused') : startsAt ? seconds ? tr('Starts in {seconds}', { seconds }) : tr('Starting…') : onTogglePause ? tr('Tap to pause') : tr('Calls every {seconds}s', { seconds: callSeconds });
  const canPress = connected && !pauseBusy && (!!onTogglePause || !!current);
  const label = onTogglePause ? pause ? tr('Resume number calls') : tr('Pause number calls') : tr('Current number {v0}, replay', { v0: current ?? tr('No current number') });
  return <View style={{ paddingHorizontal: 7, paddingBottom: 5, gap: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
      <SideControl title={tr('Numbers')} name="board" previous={previous ?? null} label={tr('Numbers board and history')} onPress={onNumbers} cyan />
      <View style={{ flex: 1, height: 119, alignItems: 'center', justifyContent: 'center' }}><CallGlow /><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !canPress, busy: !!pauseBusy }} disabled={!canPress} onPress={() => { if (onTogglePause) onTogglePause(); else if (current) onReplay(current); }}><CallBall size={91} number={startsAt ? seconds || undefined : current} red={!startsAt} />{!!onTogglePause && <View pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: 1, backgroundColor: '#542179', borderColor: '#ffe598', borderWidth: 1, borderRadius: 15, padding: 5 }}><Icon name={pause ? 'play' : 'pause'} size={16} color="#ffe598" /></View>}</Pressable><Text accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1} style={{ height: 20, color: '#fff0a6', fontSize: 12, fontFamily: gameFont.medium }}>{status}</Text></View>
      <SideControl title={tr('Players \u00b7 {v0}', { v0: players })} name="groups" label={tr('Live players')} onPress={onPlayers} />
    </View>
    {onSpeedChange ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CallProgress compact count={calls.length} /><CallerSpeed compact value={callSeconds} onChange={onSpeedChange} disabled={!connected || !!pauseBusy} busy={speedBusy} /></View> : <CallProgress count={calls.length} />}
  </View>;
}
