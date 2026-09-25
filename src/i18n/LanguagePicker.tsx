import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { GameButton, GameCard } from '../components/GameArtwork';
import { Pressable } from '../components/Pressable';
import { Icon } from '../components/CircleArtwork';
import { Text } from './Text';
import { languageNames, languages, languageStore, selectLanguage, useLanguage, useTranslation, type Language } from './index';
import { translate } from './core';

export function LanguagePicker({ onClose }: { onClose?: () => void }) {
  const t = useTranslation(), current = useLanguage();
  const [choice, setChoice] = useState<Language>(current), [saving, setSaving] = useState(false), [error, setError] = useState(false);
  const save = async () => {
    if (saving) return;
    setSaving(true); setError(false);
    try { await selectLanguage(choice); onClose?.(); } catch { setError(true); }
    finally { setSaving(false); }
  };
  return <Modal transparent visible animationType="fade" hardwareAccelerated onRequestClose={() => { if (!saving) onClose?.(); }} statusBarTranslucent navigationBarTranslucent>
    <SafeAreaView style={s.scrim}><View accessibilityViewIsModal style={s.dialog}><GameCard style={{ padding: 16, gap: 12 }}>
      <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{translate(choice, 'Choose your language')}</Text>{onClose && <Pressable disabled={saving} accessibilityRole="button" accessibilityLabel={t('Close')} onPress={onClose} style={s.close}><Icon name="close" color="#35104f" size={24} /></Pressable>}</View>
      <ScrollView contentContainerStyle={{ gap: 8 }}>
        {languages.map(language => <Pressable key={language} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: choice === language }} accessibilityLabel={languageNames[language]} onPress={() => setChoice(language)} style={[s.option, choice === language && s.selected]}>
          <Text style={[s.optionText, choice === language && { color: '#fff6d9' }]}>{languageNames[language]}</Text><View style={{ width: 24 }}>{choice === language && <Icon name="check" size={22} />}</View>
        </Pressable>)}
      </ScrollView>
      {error && <Text accessibilityLiveRegion="polite" style={{ color: '#a30f30' }}>{translate(choice, 'Could not save language. Please try again.')}</Text>}
      <GameButton busy={saving} onPress={() => { void save(); }}>{translate(choice, 'Continue')}</GameButton>
    </GameCard></View></SafeAreaView>
  </Modal>;
}
export function FirstLanguagePicker({ allowed }: { allowed: boolean }) {
  const hydrated = useStore(languageStore, s => s.hydrated), selected = useStore(languageStore, s => s.selected);
  return hydrated && !selected && allowed ? <LanguagePicker /> : null;
}
const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#170526bc', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 430, maxHeight: '90%', alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { flex: 1, color: '#35104f', fontSize: 22, fontWeight: '800' },
  close: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1.5, borderColor: '#c4a16a', backgroundColor: '#fff9e9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selected: { backgroundColor: '#7032a6', borderColor: '#b37cde' }, optionText: { color: '#35104f', fontSize: 19, fontWeight: '600' },
});
