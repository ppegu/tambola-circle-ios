import React from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { t as tr, useLanguage } from '../i18n';
import { Text } from '../i18n/Text';
import { gameFont } from '../gameTypography';
import { Pressable } from './Pressable';
import { LinearGradient } from './LinearGradient';
import { Icon } from './CircleArtwork';

const SPEEDS = [4, 5, 7] as const;

/** Shared direct-tap control for offline and Captain-led online calling. */
export function CallerSpeed({ value, onChange, disabled, busy, compact = false, style }: {
  value: number; onChange: (seconds: 4 | 5 | 7) => void; disabled?: boolean; busy?: boolean; compact?: boolean; style?: StyleProp<ViewStyle>;
}) {
  useLanguage();
  const custom = !SPEEDS.some(speed => speed === value);
  return <LinearGradient accessibilityLabel={tr('Caller speed')} colors={['#5b1c90', '#32084e']} style={[styles.rail, compact && styles.compactRail, style]}>
    {busy ? <ActivityIndicator size="small" color="#ffdf70" style={{ width: 18 }} /> : custom && compact ? <Text style={styles.custom}>{value}s</Text> : <Icon name="clock" size={compact ? 15 : 18} color="#ffdf70" />}
    {custom && !compact && <Text style={styles.custom}>{value}s</Text>}
    {SPEEDS.map(speed => <Pressable key={speed} accessibilityRole="radio" accessibilityLabel={tr('{v0} seconds', { v0: speed })} accessibilityState={{ selected: value === speed, disabled: !!disabled, busy: !!busy }} disabled={disabled} hitSlop={{ top: compact ? 8 : 4, bottom: compact ? 8 : 4 }} onPress={() => { if (value !== speed) onChange(speed); }} style={[styles.hit, compact && styles.compactHit]}>
      {value === speed && <LinearGradient pointerEvents="none" colors={['#fff7a0', '#ffd239', '#e79c0f']} style={[StyleSheet.absoluteFill, styles.selected]} />}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.text, compact && styles.compactText, value === speed && { color: '#421634' }]}>{speed}{compact ? 's' : ''}</Text>
    </Pressable>)}
  </LinearGradient>;
}
const styles = StyleSheet.create({
  rail: { flex: 1.13, height: 44, padding: 3, paddingLeft: 6, gap: 3, borderRadius: 23, borderWidth: 1, borderColor: '#a95bdd', flexDirection: 'row', alignItems: 'center' },
  hit: { flex: 1, height: 36, minWidth: 31, justifyContent: 'center', alignItems: 'center' },
  selected: { borderRadius: 18, borderWidth: 1, borderBottomWidth: 2, borderColor: '#fff4ac', borderBottomColor: '#ae7013' },
  text: { fontFamily: gameFont.bold, color: '#f6e9ff', fontSize: 19 }, custom: { fontFamily: gameFont.medium, color: '#ffdf70', fontSize: 12 },
  compactRail: { flex: 0, width: 156, height: 36, padding: 3, gap: 2 },
  compactHit: { height: 28, minWidth: 38 },
  compactText: { fontSize: 15 },
});
