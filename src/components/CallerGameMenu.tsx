import { t as tr, useLanguage } from '../i18n';
import { Text } from '../i18n/Text';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Pressable } from './Pressable';
import { LinearGradient } from './LinearGradient';
import { GameButton } from './GameArtwork';
import { Icon } from './CircleArtwork';
import { gameFont } from '../gameTypography';
import { CurvedGameTitle, VelvetTexture } from './GameFinish';
import { GameStars } from './GameStars';

export function CallerGameMenu({ visible, count, onClose, onRestart, onHome }: { visible: boolean; count: number; onClose: () => void; onRestart: () => void; onHome: () => void }) {
  useLanguage();
  return <Modal visible={visible} transparent hardwareAccelerated statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}><Pressable accessibilityLabel={tr("Dismiss game menu")} onPress={onClose} style={StyleSheet.absoluteFill} /><LinearGradient colors={['#fff0a3', '#e2a53d', '#fff0a0', '#a86a20']} style={styles.rim}><LinearGradient colors={['#70289b', '#4c1372', '#2d073f']} style={styles.card} accessibilityViewIsModal><VelvetTexture /><GameStars />
      <View style={{ alignItems: 'flex-end' }}><Pressable accessibilityRole="button" accessibilityLabel={tr("Close game menu")} onPress={onClose} style={styles.close}><Icon name="close" size={25} color="#fff3db" /></Pressable></View>
      <View style={{ marginTop: -28 }}><CurvedGameTitle>{tr("Game paused")}</CurvedGameTitle></View><Text style={styles.subtitle}>{count} {' '}{tr("numbers called")}</Text>
      <GameButton medallion glyph="play" onPress={onClose}>{tr("Keep playing")}</GameButton><GameButton medallion glyph="refresh" tone="purple" onPress={onRestart}>{tr("Restart game")}</GameButton><GameButton medallion glyph="home" tone="cyan" onPress={onHome}>{tr("Back to home")}</GameButton>
      <Text style={styles.hint}>{tr("Restarting or going home clears this round.")}</Text>
    </LinearGradient></LinearGradient></View>
  </Modal>;
}
const styles = StyleSheet.create({
  rim: { width: '100%', maxWidth: 390, borderRadius: 33, padding: 4, paddingBottom: 6, borderWidth: 1, borderColor: '#fff2ba', elevation: 12 },
  backdrop: { flex: 1, backgroundColor: '#150322bb', alignItems: 'center', justifyContent: 'center', padding: 21 }, card: { width: '100%', borderRadius: 28, borderWidth: 1.5, borderColor: '#bb63d4', padding: 16, paddingTop: 7, gap: 12, elevation: 10 }, close: { width: 38, height: 38, borderRadius: 20, borderWidth: 1.5, borderColor: '#ffd878', backgroundColor: '#66259a', alignItems: 'center', justifyContent: 'center' }, title: { fontFamily: gameFont.bold, color: '#ffdd60', fontSize: 32, textAlign: 'center', marginTop: -16, textShadowColor: '#2d043e', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 }, subtitle: { fontFamily: gameFont.medium, color: '#fff0d0', fontSize: 16, textAlign: 'center', marginBottom: 4 }, hint: { fontFamily: gameFont.medium, color: '#ead3f8', textAlign: 'center', fontSize: 11, lineHeight: 16 },
});
