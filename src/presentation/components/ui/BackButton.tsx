import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../core/theme';
import { Typography } from './Typography';

export function BackButton({ label, onPress, compact }: { label?: string; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ? `Voltar para ${label}` : 'Voltar'} hitSlop={10} style={[styles.row, compact && styles.compact]}>
      <View style={compact ? styles.compactIconWrapper : undefined}>
        <Feather name="arrow-left" size={22} color={colors.white} />
      </View>
      {label && !compact && <Typography variant="label" size={17} color={colors.white}>{label}</Typography>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compact: { gap: 0 },
  compactIconWrapper: { width: 36, alignItems: 'center', justifyContent: 'center' },
});
