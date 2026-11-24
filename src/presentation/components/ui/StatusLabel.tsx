import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../core/theme';
import { Typography } from './Typography';

type Tone = 'success' | 'pending' | 'cancelled' | 'missed';
const toneColor: Record<Tone, string> = {
  success: colors.menta,      // Só status confirmado (brand kit)
  pending: colors.cobalto,    // Agendado/pendente - cor principal do produto
  cancelled: colors.coral,    // Cancelado - destrutivo
  missed: colors.muted,       // Não compareceu - neutro
};

/** Bolinha + texto de status. Cores conforme brand kit v1.1. */
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
