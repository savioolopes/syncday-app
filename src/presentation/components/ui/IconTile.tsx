import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../../core/theme';

/** Quadrado arredondado que centraliza um ícone ou símbolo. */
export function IconTile({ children, size = 44, background = colors.blueSoft }: { children: ReactNode; size?: number; background?: string }) {
  return <View style={[styles.tile, { width: size, height: size, backgroundColor: background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
