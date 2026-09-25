import { t as tr, useLanguage } from '../i18n';
import { TextInput } from '../i18n/Text';
import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { DEFAULT_TABLE_CONFIG, validConfig } from '../../shared/online';
import * as Crypto from '../native/crypto';
import { TableAvatar } from '../components/TableAvatar';
import { AvatarPicker } from './AvatarPicker';
import { CoinChip, GameLogo, GameButton } from '../components/GameArtwork';
import { LinearGradient } from '../components/LinearGradient';
import { gameFont } from '../gameTypography';
import { Icon, IconButton, Pressable, ScrollView, Text, View, ui } from './components';
import { CaptainSeatSwitch, SetupCard, SetupChoice, TimingFields, setupStyles } from './TableSetupFields';
import type { OnlineModel } from './useOnline';

export function CreateTableScreen({ model, onBack, onCoins }: { model: OnlineModel; onBack: () => void; onCoins: () => void }) {
  useLanguage();
  const [tableAvatarPhoto, setTableAvatarPhoto] = useState<string | undefined>();
  const [tableAvatarId, setTableAvatarId] = useState(0), [avatarsOpen, setAvatarsOpen] = useState(false);
  const [name, setName] = useState(''), [config, setConfig] = useState({ ...DEFAULT_TABLE_CONFIG });
  const [scheduled, setScheduled] = useState(false), [minutes, setMinutes] = useState(5), [playing, setPlaying] = useState(false);
  const [createId] = useState(Crypto.randomUUID), { width } = useWindowDimensions();
  const disabled = model.busy || name.trim().length < 2 || !validConfig(config);
  return <KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><IconButton name="back" label={tr("Back")} onPress={onBack} light /><View style={styles.logo}><GameLogo width={Math.min(114, width - 230)} /></View><CoinChip compact balance={model.wallet?.balance} onPress={onCoins} /></View>
    <ScrollView contentContainerStyle={styles.body} keyboardDismissMode="on-drag">
      <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 9 }}><Pressable accessibilityRole="button" accessibilityLabel={tr("Choose table avatar")} onPress={() => setAvatarsOpen(true)} style={{ width: 116, height: 116 }}><TableAvatar id={tableAvatarId} photo={tableAvatarPhoto} size={116} /><View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#ffdd62', borderRadius: 18, borderWidth: 1.5, borderColor: '#fff4b0', padding: 7 }}><Icon name="edit" color="#431653" size={22} /></View></Pressable></View>
      <SetupCard icon="edit"><Text style={setupStyles.label}>{tr("Table name")}</Text><TextInput accessibilityLabel={tr("Table name")} placeholder={tr("Name your table")} placeholderTextColor="#8b7294" value={name} onChangeText={setName} maxLength={50} style={styles.name} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></SetupCard>
      <TimingFields config={config} onChange={setConfig} />
      <SetupCard icon="play"><Text style={setupStyles.label}>{tr("Start the game")}</Text><View style={setupStyles.options}><SetupChoice label={tr("Captain starts")} icon="play" selected={!scheduled} onPress={() => setScheduled(false)} /><SetupChoice label={tr("Schedule")} icon="calendar" selected={scheduled} onPress={() => setScheduled(true)} /></View>
        {scheduled ? <><View style={styles.scheduleRow}>{[2, 5, 10, 30].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={tr("Start in {v0} minutes", { v0: value })} accessibilityState={{ selected: minutes === value }} onPress={() => setMinutes(value)} style={[styles.minute, minutes === value && styles.minuteSelected]}><Text style={[styles.minuteText, minutes === value && { color: '#fff2ff' }]}>{value} {' '}{tr("min")}</Text></Pressable>)}</View><Text style={setupStyles.hint}>{tr("Starts automatically")}{' '}{minutes} {' '}{tr("minutes after creation.")}</Text></> : <Text style={setupStyles.hint}>{tr("Only you start. No ticket-selection timer.")}</Text>}
      </SetupCard>
      <SetupCard icon="crown"><View style={{ borderRadius: 17, backgroundColor: '#401362' }}><CaptainSeatSwitch playing={playing} onChange={setPlaying} /></View></SetupCard>
      <GameButton glyph="groups" busy={model.busy} disabled={disabled} style={{ minHeight: 60, borderRadius: 32, marginTop: 5 }} onPress={() => { Keyboard.dismiss(); void model.create(name.trim(), config, createId, { tableAvatarId, tableAvatarPhoto, hostPlaying: playing, ...(scheduled ? { startInSeconds: minutes * 60 } : {}) }); }}>{tr("Create private table")}</GameButton>
    </ScrollView>
    {avatarsOpen && <AvatarPicker table selected={tableAvatarId} selectedPhoto={tableAvatarPhoto} onSelect={(id, photo) => { setTableAvatarId(id); setTableAvatarPhoto(photo); setAvatarsOpen(false); }} onClose={() => setAvatarsOpen(false)} />}
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, gap: 8, minHeight: 57 }, logo: { flex: 1, alignItems: 'center' },
  body: { paddingHorizontal: 10, paddingBottom: 12, gap: 5, width: '100%', maxWidth: 480, alignSelf: 'center' }, heading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 5 },
  title: { fontFamily: gameFont.bold, fontSize: 29, lineHeight: 34, color: '#fff6ef', textShadowColor: '#2b0348', textShadowRadius: 2, textShadowOffset: { width: 0, height: 2 } }, subtitle: { fontFamily: gameFont.medium, fontSize: 11, color: '#dcc4f1' },
  private: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 24, borderWidth: 1.3, borderTopWidth: 2, borderColor: '#be77e9', backgroundColor: '#411362', paddingHorizontal: 10, paddingVertical: 7 }, privateText: { fontFamily: gameFont.medium, fontSize: 15, color: '#fff3ff' },
  name: { height: 38, borderWidth: 1, borderColor: '#c9a28f', borderRadius: 15, paddingHorizontal: 11, paddingVertical: 0, fontFamily: gameFont.medium, fontSize: 17, color: '#301045', backgroundColor: '#fffcf5' },
  cohost: { minHeight: 42, flexDirection: 'row', gap: 9, alignItems: 'center', borderRadius: 17, borderWidth: 1, borderColor: '#d9b89e', backgroundColor: '#fffbf2', paddingHorizontal: 9 }, cohostText: { flex: 1, fontFamily: gameFont.medium, fontSize: 14, color: '#83688a' },
  scheduleRow: { flexDirection: 'row', gap: 5 }, minute: { flex: 1, minHeight: 38, borderRadius: 11, backgroundColor: '#ecddf1', borderWidth: 1, borderColor: '#c7a8d6', alignItems: 'center', justifyContent: 'center' }, minuteSelected: { backgroundColor: '#7631ac', borderColor: '#a766d4' }, minuteText: { fontFamily: gameFont.medium, fontSize: 12, color: '#492262' },
  submit: { minHeight: 64, marginTop: 4, borderRadius: 34, padding: 3, paddingBottom: 6, borderWidth: 1, borderColor: '#f4bc43', backgroundColor: '#bd7315', elevation: 4 }, submitFace: { minHeight: 53, borderRadius: 30, borderWidth: 1, borderTopWidth: 2, borderColor: '#fff6c7', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 12 }, submitText: { fontFamily: gameFont.bold, fontSize: 22, color: '#382029', flexShrink: 1 },
});
