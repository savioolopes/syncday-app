import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../core/theme';

/** Barra fixa no rodapé. `solid` = fundo branco com divisória; senão, transparente. */
export function FooterBar({ children, solid }: { children: ReactNode; solid?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, solid && styles.solid, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screen, paddingTop: 12, gap: 14 },
  solid: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
});
