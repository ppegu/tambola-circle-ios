import { useEffect, useRef } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useStore } from 'zustand';
import { Pressable } from '../components/Pressable';
import { t, useLanguage } from '../i18n';
import { tableVoiceState } from './state';
import { toggleTableMic, toggleTableSpeaker } from './runtime';

/** Small artwork, full touch targets. No controls overlap the tickets. */
export function TableAudioControls() {
  useLanguage();
  const { micMuted, speakerMuted, busy, error } = useStore(tableVoiceState);
  const requested = useRef(false);
  useEffect(() => {
    if (!busy && requested.current && error) {
      requested.current = false;
      Alert.alert(t('Voice chat'), t('Could not connect voice. Check microphone permission and your connection, then tap the mic to retry.'));
    } else if (!busy && !micMuted) requested.current = false;
  }, [busy, error, micMuted]);
  return <View style={styles.row}>
    {(['mic', 'speaker'] as const).map(kind => {
      const muted = kind === 'mic' ? micMuted : speakerMuted;
      return <Pressable key={kind} accessibilityRole="button"
        accessibilityLabel={kind === 'mic' ? t(muted ? 'Unmute microphone' : 'Mute microphone') : t(muted ? 'Unmute all sound' : 'Mute all sound')}
        accessibilityHint={kind === 'mic' && error ? t('Voice unavailable. Tap the mic to retry.') : undefined}
        accessibilityState={{ busy: kind === 'mic' && busy }}
        onPress={kind === 'mic' ? () => { requested.current = micMuted && !busy; toggleTableMic(); } : toggleTableSpeaker} style={styles.touch}>
        <View style={[styles.icon, kind === 'mic' && busy && styles.busy]}>
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={muted ? '#ff9ca8' : '#ffdf87'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            {kind === 'mic' ? <><Rect x={9} y={3} width={6} height={11} rx={3}/><Path d="M6 10v2a6 6 0 0012 0v-2M12 18v3M9 21h6"/></> : <><Path d="M11 4L5 9H2v6h3l6 5z"/><Path d="M15 8a6 6 0 010 8M18 5a10 10 0 010 14"/></>}
            {muted && <Path d="M3 3l18 18" stroke="#ff9ca8" strokeWidth={2.4}/>}
          </Svg>
        </View>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#300b4f', borderWidth: 1, borderColor: '#ae804c', alignItems: 'center', justifyContent: 'center' },
  busy: { opacity: .55 },
});
