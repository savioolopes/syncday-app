import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../core/theme';

/** Cabeçalho cobalto com altura fixa. */
export function BlueHeader({ children, style, height = 110 }: { children: ReactNode; style?: StyleProp<ViewStyle>; height?: number }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.root, { paddingTop: insets.top + 12, height }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.cobalto, paddingHorizontal: spacing.screen, paddingBottom: 12, zIndex: 100 },
});
