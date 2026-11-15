import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../core/theme';

/**
 * SVG official logomark (símbolo 2x2 com círculo coral no canto superior direito).
 * Cores: Cobalto #2347F0 + Coral #FF5C3A
 */
const LogoMarkSVG: ImageSourcePropType = {
  uri: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#2347F0"/>
  <g transform="translate(222,222) scale(5.8)">
    <rect width="44" height="44" rx="12" fill="#FFFFFF"/>
    <rect y="56" width="44" height="44" rx="12" fill="#FFFFFF"/>
    <rect x="56" y="56" width="44" height="44" rx="12" fill="#FFFFFF"/>
    <circle cx="78" cy="22" r="22" fill="#FF5C3A"/>
  </g>
</svg>
`),
};

/**
 * Wordmark "SyncDay" em Bricolage Grotesque Bold.
 * Quando tiver o SVG oficial do logotipo horizontal, troque somente este componente.
 */
export function Wordmark({ color = colors.tinta, size = 28 }: { color?: string; size?: number }) {
  const text = [styles.text, { color, fontSize: size, lineHeight: size * 1.2 }];
  return (
    <View style={styles.word} accessible accessibilityLabel="SyncDay">
      <Text style={text}>Sync</Text>
      <Text style={[text, { color: colors.coral }]}>Day</Text>
    </View>
  );
}

/** Símbolo standalone (apenas a marca 2x2). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return <Image source={LogoMarkSVG} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Logo completo (símbolo + nome horizontal). */
export function Logo() {
  return (
    <View style={styles.row}>
      <LogoMark size={46} />
      <Wordmark size={44} />
    </View>
  );
}

/** Logo horizontal para cabeçalhos (símbolo menor + wordmark). */
export function HorizontalLogo({ symbolSize = 28, wordmarkSize = 24 }: { symbolSize?: number; wordmarkSize?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={symbolSize} />
      <Wordmark size={wordmarkSize} />
    </View>
  );
}

/** Logo apenas símbolo para favicon/app icon contexts. */
export function SymbolOnly({ size = 36, color }: { size?: number; color?: string }) {
  const tint = color || colors.cobalto;
  return <Image source={LogoMarkSVG} style={{ width: size, height: size, tintColor: tint }} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  word: { flexDirection: 'row', alignItems: 'flex-end' },
  text: { fontFamily: fonts.display, letterSpacing: -1 },
});