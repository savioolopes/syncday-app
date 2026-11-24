import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../core/theme';

/**
 * Símbolo colorido (versão principal) - para fundos claros (branco, Névoa).
 * Base: viewBox 100x100 do brand kit (syncday-simbolo-colorida.svg)
 * - 3 quadrados cobalto (#2347F0) 44x44 rx=12: topo-esq (0,0), base-esq (0,56), base-dir (56,56)
 * - 1 círculo coral (#FF5C3A) r=22 centrado em (78,22) — ocupa posição topo-dir
 * Gap entre quadrados = 12 (44+12=56)
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  const s = size / 100;
  const q = 44 * s;       // square size
  const gap = 12 * s;     // gap between squares
  const r = 22 * s;       // circle radius
  const circleCx = 78 * s; // circle center x
  const circleCy = 22 * s; // circle center y

  return (
    <View style={[styles.logoMarkContainer, { width: 100 * s, height: 100 * s }]}>
      {/* Quadrado superior esquerdo - cobalto */}
      <View style={[styles.square, { width: q, height: q, borderRadius: 12 * s }]} />
      {/* Quadrado inferior esquerdo - cobalto */}
      <View style={[styles.square, { width: q, height: q, borderRadius: 12 * s, top: q + gap }]} />
      {/* Quadrado inferior direito - cobalto */}
      <View style={[styles.square, { width: q, height: q, borderRadius: 12 * s, left: q + gap, top: q + gap }]} />
      {/* Círculo coral no canto superior direito (posição do 4º quadrado) */}
      <View style={[styles.circle, { width: r * 2, height: r * 2, borderRadius: r, left: circleCx - r, top: circleCy - r }]} />
    </View>
  );
}

/**
 * Símbolo para fundos Cobalto ou Tinta (versão "negativa" horizontal).
 * Per brand kit: 3 quadrados brancos + 1 círculo coral (#FF5C3A).
 * Base: syncday-horizontal-negativa.svg / syncday-simbolo-negativa.svg
 */
export function LogoMarkNegative({ size = 36 }: { size?: number }) {
  const s = size / 100;
  const q = 44 * s;       // square size
  const gap = 12 * s;     // gap between squares
  const r = 22 * s;       // circle radius
  const circleCx = 78 * s; // circle center x
  const circleCy = 22 * s; // circle center y

  return (
    <View style={[styles.logoMarkContainer, { width: 100 * s, height: 100 * s }]}>
      {/* Quadrado superior esquerdo - branco */}
      <View style={[styles.squareNegative, { width: q, height: q, borderRadius: 12 * s }]} />
      {/* Quadrado inferior esquerdo - branco */}
      <View style={[styles.squareNegative, { width: q, height: q, borderRadius: 12 * s, top: q + gap }]} />
      {/* Quadrado inferior direito - branco */}
      <View style={[styles.squareNegative, { width: q, height: q, borderRadius: 12 * s, left: q + gap, top: q + gap }]} />
      {/* Círculo coral no canto superior direito (mantém acento da marca) */}
      <View style={[styles.circleNegative, { width: r * 2, height: r * 2, borderRadius: r, left: circleCx - r, top: circleCy - r }]} />
    </View>
  );
}

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
export function HorizontalLogo({
  symbolSize = 28,
  wordmarkSize = 24,
  color,
  variant = 'colorida' // 'colorida' | 'negativa'
}: { symbolSize?: number; wordmarkSize?: number; color?: string; variant?: 'colorida' | 'negativa' }) {
  return (
    <View style={styles.row}>
      {variant === 'negativa' ? (
        <LogoMarkNegative size={symbolSize} />
      ) : (
        <LogoMark size={symbolSize} />
      )}
      <Wordmark size={wordmarkSize} color={color} />
    </View>
  );
}

/** Logo apenas símbolo para favicon/app icon contexts. */
export function SymbolOnly({ size = 36 }: { size?: number }) {
  return <LogoMark size={size} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  word: { flexDirection: 'row', alignItems: 'flex-end' },
  text: { fontFamily: fonts.display, letterSpacing: -1 },
  logoMarkContainer: {
    // Transparent container - squares and circle drawn directly
  },
  square: {
    position: 'absolute',
    backgroundColor: colors.cobalto, // #2347F0
  },
  circle: {
    position: 'absolute',
    backgroundColor: colors.coral, // #FF5C3A
  },
  squareNegative: {
    position: 'absolute',
    backgroundColor: colors.white,
  },
  circleNegative: {
    position: 'absolute',
    backgroundColor: colors.coral, // #FF5C3A - mantém acento coral na versão negativa
  },
});