import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../core/theme';
import { Typography } from './Typography';

/** Aviso rápido no topo da tela (tom de voz da marca: "Prontinho, tá marcado."). */
export function Toast({ message }: { message: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.root, { top: insets.top + 8 }]} accessibilityLiveRegion="polite">
      <View style={styles.dot} />
      <Typography variant="label" size={15} color={colors.white} style={{ flex: 1 }}>
        {message}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.tinta,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral },
});
