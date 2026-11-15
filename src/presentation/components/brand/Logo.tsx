import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../core/theme';

/**
 * Símbolo: grade 2x2, espaço entre módulos = 12% do símbolo.
 * O círculo coral fica SEMPRE no canto superior direito.
 */
export function LogoMark({ size = 36, main = colors.blue, accent = colors.orange }: { size?: number; main?: string; accent?: string }) {
  const gap = size * 0.12;
  const cell = (size - gap) / 2;
  const square = { width: cell, height: cell, borderRadius: cell * 0.3 };
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      <View style={[square, { backgroundColor: main }]} />
      <View style={[square, { backgroundColor: accent, borderRadius: cell / 2 }]} />
      <View style={[square, { backgroundColor: main }]} />
      <View style={[square, { backgroundColor: main }]} />
    </View>
  );
}

/**
 * "SyncDay" em Bricolage Grotesque Bold.
 * Quando tiver o SVG oficial do logotipo, troque somente este componente.
 */
export function Wordmark({ color = colors.ink, size = 28 }: { color?: string; size?: number }) {
  const text = [styles.text, { color, fontSize: size, lineHeight: size * 1.2 }];
  return (
    <View style={styles.word} accessible accessibilityLabel="SyncDay">
      <Text style={text}>Sync</Text>
      <Text style={[text, { color: colors.orange }]}>Day</Text>
    </View>
  );
}

/** Logo completo (símbolo + nome). */
export function Logo() {
  return (
    <View style={styles.row}>
      <LogoMark size={46} />
      <Wordmark size={44} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  word: { flexDirection: 'row', alignItems: 'flex-end' },
  text: { fontFamily: fonts.display, letterSpacing: -1 },
});
