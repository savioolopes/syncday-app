import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../core/theme';
import { Typography } from './Typography';

type Tone = 'success' | 'accent';
const toneColor: Record<Tone, string> = { success: colors.menta, accent: colors.coral };

/** Bolinha + texto de status. `success` = Menta (só para "confirmado"). */
export const StatusLabel = memo(function StatusLabel({ label, tone }: { label: string; tone: Tone }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
      <Typography variant="label" color={toneColor[tone]}>
        {label}
      </Typography>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
