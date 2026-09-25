import { t as tr, useLanguage } from '../i18n';
import { ScreenSafeArea, ScreenSurface, useScreenNavigation } from '../navigation/ScreenContext';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../components/LinearGradient';
import { GameSlider, GameSwitch } from '../components/GameControls';
import { Icon } from '../components/CircleArtwork';
import { PreferenceArtwork } from '../components/PreferenceArtwork';
import { GameAvatar, GameBackground, GameButton, GameCard, GameLogo } from '../components/GameArtwork';
import { setGamePreferences, useGamePreferences } from '../gamePreferences';
import { gameFont } from '../gameTypography';
import { useCallerVoices, voicePack } from '../voicePacks';
import { useAppUpdates } from '../updates/UpdateRoot';
import { CallerVoicePicker } from './CallerVoicePicker';
import { PageHeader, Pressable, ScrollView, Text, View } from './components';
import { languageNames } from '../i18n';
import { LanguagePicker } from '../i18n/LanguagePicker';

const markColours = [
  { get name() { return tr("Red"); }, value: '#e62639', light: '#ff818b', dark: '#a50624' },
  { get name() { return tr("Purple"); }, value: '#9a35de', light: '#d14bff', dark: '#540384' },
  { get name() { return tr("Teal"); }, value: '#009da5', light: '#29e1da', dark: '#00616c' },
  { get name() { return tr("Blue"); }, value: '#167ce0', light: '#4eb7ff', dark: '#003f9a' },
];
const toggles = [
  { key: 'haptics', get title() { return tr("Tap vibration"); }, get subtitle() { return tr("Feel a gentle vibration on tap"); }, icon: 'mobile' },
  { key: 'stars', get title() { return tr("Star celebration"); }, get subtitle() { return tr("Show a star when you mark a number"); }, icon: 'star' },
  { key: 'reducedMotion', get title() { return tr("Reduce motion"); }, get subtitle() { return tr("Simpler animations (accessibility)"); }, icon: 'motion' },
  { key: 'largeNumbers', get title() { return tr("Large numbers"); }, get subtitle() { return tr("Bigger numbers on tickets"); }, icon: 'numbers' },
] as const;

export function GamePreferencesSheet({ onClose, sound, onSound, onPreview }: { onClose: () => void; sound?: boolean; onSound?: (enabled: boolean) => void; onPreview?: () => void; onReplay?: () => void }) {
  const language = useLanguage();
  const navigation = useScreenNavigation();
  const p = useGamePreferences(), caller = useCallerVoices(), updates = useAppUpdates();
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  if (voicesOpen) return <CallerVoicePicker onClose={() => setVoicesOpen(false)} />;
  return <ScreenSurface onClose={onClose}>
    <ScreenSafeArea><GameBackground><SafeAreaView style={s.screen}>
      <PageHeader title={tr("Game settings")} onBack={onClose} right={<GameLogo width={78} />} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <GameCard style={s.card}><Pressable accessibilityRole="button" accessibilityLabel={tr('Language')} onPress={() => setLanguageOpen(true)} style={s.toggleRow}><Icon name="globe" size={26} color="#7427ad" /><Text style={[s.title, s.flex]}>{tr('Language')}</Text><Text style={s.voiceName}>{languageNames[language]}</Text><Icon name="chevron" size={18} color="#371447" /></Pressable></GameCard>
        <GameCard style={s.card}>
          <View style={s.row}><PreferenceArtwork name="palette" size={32} /><View style={s.flex}><Text style={s.heading}>{tr("Your mark colour")}</Text><Text style={s.caption}>{tr("Choose the colour for your marked numbers")}</Text></View></View>
          <View style={s.colours}>{markColours.map(c => {
            const selected = p.markColor === c.value;
            return <Pressable key={c.value} accessibilityRole="radio" accessibilityLabel={c.name} accessibilityState={{ checked: selected }} onPress={() => setGamePreferences({ markColor: c.value })} style={s.colourOption}>
              <View style={[s.colourRing, { borderColor: selected ? c.value : 'transparent' }]}><LinearGradient colors={[c.light, c.value, c.dark]} style={[s.colourFace, { borderColor: c.dark }]}><View style={s.shine} />{selected && <Icon name="check" size={29} />}</LinearGradient></View>
              <Text style={[s.colourLabel, { backgroundColor: selected ? c.value : '#efdaba', color: selected ? '#fff' : '#241030' }]}>{c.name}</Text>
            </Pressable>;
          })}</View>
          <View style={s.row}><Text style={[s.caption, s.flex]}>{tr("Preview on your ticket")}</Text><View accessibilityLabel={tr("Ticket preview, 23 marked {v0}", { v0: markColours.find(c => c.value === p.markColor)?.name ?? '' })} style={s.preview}>{[12, 23, 34].map(n => <View key={n} style={[s.cell, n !== 34 && s.cellLine]}><View style={[s.mark, { backgroundColor: n === 23 ? p.markColor : 'transparent' }]}><Text style={[s.number, { color: n === 23 ? '#fff' : '#291533' }]}>{n}</Text></View>{n === 23 && p.stars && <View style={s.previewStar}><PreferenceArtwork name="star" size={13} /></View>}</View>)}</View></View>
        </GameCard>
        <GameCard style={[s.card, { gap: 0, paddingVertical: 4 }]}>{toggles.map((item, i) => <View key={item.key} style={[s.toggleRow, i < 3 && s.divider]}>
          <PreferenceArtwork name={item.icon} size={32} /><View style={s.flex}><Text style={s.title}>{item.title}</Text><Text style={s.caption}>{item.subtitle}</Text></View>
          <GameSwitch label={item.title} value={p[item.key]} onChange={value => setGamePreferences({ [item.key]: value })} />
        </View>)}</GameCard>
        <GameCard style={[s.card, { gap: 0 }]}>
          <View style={[s.row, { minHeight: 31 }]}><PreferenceArtwork name="sound" size={29} /><Text style={[s.heading, s.flex]}>{tr("Sound & voice")}</Text>{onSound && <Pressable accessibilityRole="switch" accessibilityLabel={tr("Number announcements")} accessibilityState={{ checked: sound ?? true }} onPress={() => onSound(!(sound ?? true))} hitSlop={6} style={s.soundToggle}><Icon name={sound === false ? 'muted' : 'sound'} size={21} color="#7725b3" /></Pressable>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel={tr("Caller voice, {v0}. Change voice", { v0: voicePack(caller.selected).name })} onPress={() => navigation ? navigation.push('Voices') : setVoicesOpen(true)} style={[s.toggleRow, s.divider]}><GameAvatar index={0} size={32} /><Text style={[s.title, s.flex]}>{tr("Caller voice")}</Text><Text style={s.voiceName}>{voicePack(caller.selected).name}</Text><Icon name="chevron" size={18} color="#371447" /></Pressable>
          <View style={s.row}><PreferenceArtwork name="sound" size={26} /><Text style={s.title}>{tr("Voice volume")}</Text><GameSlider label={tr("Voice volume")} value={p.voiceVolume} onChange={voiceVolume => setGamePreferences({ voiceVolume })} /></View>
          {onPreview && <GameButton small glyph="sound" tone="cyan" onPress={onPreview} style={{ borderRadius: 23 }}>{tr("Test voice")}</GameButton>}
        </GameCard>
        {updates && <GameButton small glyph="refresh" tone="purple" label={tr("App Updates")} onPress={() => { onClose(); updates.show(); }}>{tr("App Updates")}</GameButton>}
      </ScrollView>
      <View style={s.footer}><GameButton onPress={onClose} style={{ borderRadius: 28, minHeight: 49 }}>{tr("Done")}</GameButton></View>
      {languageOpen && <LanguagePicker onClose={() => setLanguageOpen(false)} />}
    </SafeAreaView></GameBackground></ScreenSafeArea>
  </ScreenSurface>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, scroll: { flex: 1 }, content: { paddingHorizontal: 12, gap: 6, paddingBottom: 4 },
  card: { padding: 6, gap: 5, backgroundColor: '#fff0d2' }, flex: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heading: { color: '#2c123e', fontFamily: gameFont.bold, fontSize: 16, lineHeight: 20, includeFontPadding: false },
  title: { color: '#2c123e', fontFamily: gameFont.medium, fontSize: 13, lineHeight: 17, includeFontPadding: false },
  caption: { color: '#7a665d', fontFamily: gameFont.medium, fontSize: 10, lineHeight: 13, includeFontPadding: false },
  colours: { flexDirection: 'row', gap: 5 }, colourOption: { flex: 1, alignItems: 'center', gap: 1 },
  colourRing: { padding: 2, borderRadius: 29, borderWidth: 1.5 }, colourFace: { width: 43, height: 43, borderRadius: 24, borderWidth: 1.5, borderBottomWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 2 },
  shine: { position: 'absolute', top: 2, left: 5, right: 5, height: 15, borderRadius: 24, borderTopWidth: 2, borderColor: '#ffffffb0' },
  colourLabel: { minWidth: 56, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 12, textAlign: 'center', fontFamily: gameFont.medium, fontSize: 11, lineHeight: 14, includeFontPadding: false },
  preview: { flexDirection: 'row', borderWidth: 1, borderColor: '#b9844b', borderStyle: 'dashed', borderRadius: 4, backgroundColor: '#fff8e7' },
  cell: { width: 40, height: 30, alignItems: 'center', justifyContent: 'center' }, cellLine: { borderRightWidth: .7, borderColor: '#c1a17c' },
  mark: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, number: { fontFamily: gameFont.medium, fontSize: 17, includeFontPadding: false }, previewStar: { position: 'absolute', right: 0, top: 0 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, divider: { borderBottomWidth: .7, borderColor: '#d9bc96' },
  voiceName: { fontFamily: gameFont.medium, fontSize: 12, color: '#371447' }, soundToggle: { minWidth: 38, minHeight: 31, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
});
