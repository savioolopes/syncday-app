import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../../../core/theme';

interface Props {
  children: ReactNode;
  /** Cor da barra lateral de destaque (opcional). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, accent, style }: Props) {
  return (
    <View style={[styles.card, accent ? { paddingLeft: 24 } : null, style]}>
      {accent ? <View style={[styles.bar, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
});
