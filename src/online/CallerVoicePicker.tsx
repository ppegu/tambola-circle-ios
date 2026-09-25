import { t as tr, useLanguage, localizeKnownCopy } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from '../components/LinearGradient';
import { GameButton, GameCard, GameLogo } from '../components/GameArtwork';
import { CALLER_VOICES, useCallerVoices, voicePack, voicePacks } from '../voicePacks';
import { prepareCallerPreviews, previewCallerVoice, releaseCallerPreviews, stopCallerPreview } from '../voicePreview';
import { Notice, Pill, Pressable, ScrollView, Sheet, Text, View, ui } from './components';
import { gameFont } from '../gameTypography';

export function VoiceBadge({ size = 42 }: { size?: number }) {
  useLanguage();
  return <LinearGradient colors={['#a83ef1', '#64169b', '#35065c']} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: '#c991f0', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 3 }}>
    {[.25, .47, .65, .38].map((height, index) => <View key={index} style={{ width: size * .08, height: size * height, borderRadius: 3, backgroundColor: index % 2 ? '#69eced' : '#b47af3' }} />)}
  </LinearGradient>;
}
const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1) + ' MB';

export function CallerVoicePicker({ onClose }: { onClose: () => void }) {
  useLanguage();
  const state = useCallerVoices();
  const [managing, setManaging] = useState(false), [detail, setDetail] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null), [working, setWorking] = useState(false), [preparing, setPreparing] = useState(true);
  const previewGeneration = useRef(0);
  useEffect(() => {
    let mounted = true;
    void prepareCallerPreviews().catch(error => {
      if (mounted) voicePacks.reportError(error instanceof Error ? error.message : tr("Could not prepare voice previews."));
    }).finally(() => { if (mounted) setPreparing(false); });
    return () => { mounted = false; previewGeneration.current++; releaseCallerPreviews(); };
  }, []);
  const action = async (work: () => Promise<void>) => {
    if (working) return;
    setWorking(true);
    try { await work(); } catch (error) { voicePacks.reportError(error instanceof Error ? error.message : tr("Could not update caller voice. Please retry.")); }
    finally { setWorking(false); }
  };
  const preview = (id: string) => {
    const ticket = ++previewGeneration.current;
    stopCallerPreview();
    if (playing === id) { setPlaying(null); return; }
    setPlaying(id); voicePacks.clearMessage();
    void previewCallerVoice(id).catch(error => {
      if (ticket === previewGeneration.current) voicePacks.reportError(error.message);
    }).finally(() => { if (ticket === previewGeneration.current) setPlaying(null); });
  };
  const active = voicePack(state.selected), download = state.downloading;
  const busy = working || state.loading;
  const startDownload = (id: string) => { setDetail(true); void voicePacks.download(id); };
  const order = [...CALLER_VOICES].sort((a, b) => Number(voicePacks.ready(b.id)) - Number(voicePacks.ready(a.id)));
  return <Sheet full title={tr("Caller voices")} right={<GameLogo width={82} />} onClose={onClose}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      {!!state.error && <Notice tone="red">{state.error}</Notice>}
      {!!state.notice && <Notice tone="green">{state.notice}</Notice>}
      {state.loading && <Notice>{tr("Checking your saved voices…")}</Notice>}
      {preparing && <Notice>{tr("Preparing offline previews…")}</Notice>}
      {detail && download ? <>
        <GameCard style={styles.current}><View style={ui.row}><VoiceBadge size={35} /><View style={{ flex: 1 }}><Text style={ui.ticketTitle}>{tr("Current voice:")}{' '}{active.name}</Text><Text style={ui.muted}>{tr("Ready offline")}</Text></View><Pill tone="green">{tr("Active")}</Pill></View></GameCard>
        <GameCard style={{ gap: 16, alignItems: 'center', paddingVertical: 22 }}>
          <Text style={ui.heading}>{download.cancelling ? tr("Cancelling download…") : tr("Downloading {v0}", { v0: voicePack(download.id).name })}</Text>
          <Text style={ui.muted}>{localizeKnownCopy(voicePack(download.id).accent)}</Text><VoiceBadge size={86} />
          <View style={{ width: '100%', gap: 8 }}>
            <View style={ui.row}><View accessibilityRole="progressbar" accessibilityLabel={tr("Voice download progress")} accessibilityValue={{ min: 0, max: 100, now: Math.round(download.bytes / download.total * 100) }} style={styles.track}><LinearGradient colors={['#72e6ec', '#04b7ce', '#048eb6']} style={{ height: '100%', width: `${Math.round(download.bytes / download.total * 100)}%`, borderRadius: 8 }} /></View><Text style={ui.ticketTitle}>{Math.round(download.bytes / download.total * 100)}%</Text></View>
            <Text style={[ui.muted, { textAlign: 'center' }]}>{mb(download.bytes)} {' '}{tr("of")}{' '}{mb(download.total)}</Text>
          </View>
          <Text style={[ui.text, { textAlign: 'center' }]}>{active.name} {' '}{tr("stays active while this downloads.")}</Text>
          <GameButton small tone="paper" disabled={download.cancelling} style={{ alignSelf: 'stretch' }} onPress={() => { void action(() => voicePacks.cancel()); }}>{tr("Cancel download")}</GameButton>
        </GameCard>
        <GameCard><Text style={ui.ticketTitle}>{tr("Keep your favourites")}</Text><Text style={ui.muted}>{tr("Downloaded voices stay on this device for offline play.")}</Text></GameCard>
      </> : <>
        <Text style={styles.helper}>{tr("Preview any voice offline, then download its full pack to use it.")}</Text>
        {download && <GameButton small tone="cyan" onPress={() => setDetail(true)}>{tr("Downloading {v0} · {v1}%", { v0: voicePack(download.id).name, v1: Math.round(download.bytes / download.total * 100) })}</GameButton>}
        {order.map((pack, index) => {
          const ready = voicePacks.ready(pack.id), selected = state.selected === pack.id;
          const section = index === 0 || ready !== voicePacks.ready(order[index - 1]!.id);
          return <React.Fragment key={pack.id}>
            {section && <Text style={styles.section}>{ready ? tr("On this device") : tr("More voices")}</Text>}
            <GameCard style={[styles.voice, selected && { borderColor: '#43b574' }]}>
              <View style={ui.row}><VoiceBadge /><View style={{ flex: 1 }}><Text style={[ui.ticketTitle, { fontSize: 17 }]}>{pack.name}</Text><Text style={ui.muted}>{localizeKnownCopy(pack.accent)}</Text></View><View style={{ gap: 4, alignItems: 'flex-end' }}>{ready && <Pill tone={pack.bundled ? 'purple' : 'gold'}>{pack.bundled ? tr("Included") : tr("Downloaded")}</Pill>}{selected && <Pill tone="green">{tr("✓ Active")}</Pill>}</View></View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <GameButton small tone="cyan" glyph={playing === pack.id ? 'stop' : 'play'} label={`${playing === pack.id ? tr('Stop preview') : tr('Preview')} ${pack.name}`} disabled={preparing} onPress={() => preview(pack.id)} style={{ flex: 1 }}>{playing === pack.id ? tr("Stop") : tr("Preview")}</GameButton>
                {!selected && <GameButton small glyph={ready ? 'check' : 'download'} tone={ready ? 'gold' : 'purple'} label={ready ? tr("Use {v0} voice", { v0: pack.name }) : tr("Download {v0}, {v1}", { v0: pack.name, v1: mb(pack.totalBytes) })} disabled={busy || (!ready && !!download)} onPress={() => ready ? void action(() => voicePacks.select(pack.id)) : startDownload(pack.id)} style={{ flex: 1.4 }}>{ready ? tr("Use voice") : tr("Download · {v0}", { v0: mb(pack.totalBytes) })}</GameButton>}
              </View>
              {pack.bundled && <Text style={[ui.muted, { fontSize: 11 }]}>{tr("Included with app · Always available offline")}</Text>}
              {managing && ready && !pack.bundled && <><GameButton small tone="paper" label={tr("Remove {v0} download", { v0: pack.name })} disabled={selected || busy || !!download} onPress={() => { stopCallerPreview(); void action(() => voicePacks.remove(pack.id)); }}>{tr("Remove download")}</GameButton>{selected && <Text style={[ui.muted, { fontSize: 11 }]}>{tr("Select another voice before removing this one.")}</Text>}</>}
            </GameCard>
          </React.Fragment>;
        })}
        <Text style={styles.helper}>{tr("Download once. Use offline anytime.")}</Text>
        <Pressable accessibilityRole="button" onPress={() => setManaging(!managing)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[styles.helper, { textDecorationLine: 'underline' }]}>{managing ? tr("Finish managing downloads") : tr("Manage downloads")}</Text></Pressable>
      </>}
    </ScrollView>
    <GameButton onPress={detail && download ? () => setDetail(false) : onClose} style={{ marginBottom: 2 }}>{detail && download ? tr("Back to voices") : tr("Done")}</GameButton>
  </Sheet>;
}
const styles = StyleSheet.create({
  content: { gap: 10, paddingBottom: 10 }, helper: { color: '#f4e5ff', fontFamily: gameFont.medium, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  section: { color: '#fff4d5', fontSize: 15, fontFamily: gameFont.bold, marginTop: 2 }, voice: { gap: 9, padding: 12 },
  current: { padding: 12 }, track: { flex: 1, height: 13, backgroundColor: '#d3cdd6', borderRadius: 8, overflow: 'hidden', borderWidth: .6, borderColor: '#b8acbd' },
});
