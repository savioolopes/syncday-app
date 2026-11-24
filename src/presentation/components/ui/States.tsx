import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../../core/theme';
import { Typography } from './Typography';

export const LoadingState = () => <ActivityIndicator color={colors.cobalto} style={{ marginTop: 40 }} />;

/** Skeleton loading para listas - shimmer placeholder */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonTime} />
          <View style={styles.skeletonDetails}>
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton para o WeekStrip (dias da semana) */
export function SkeletonWeekStrip({ count = 7 }: { count?: number }) {
  return (
    <View style={styles.skeletonWeekStrip}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonDayChip} />
      ))}
    </View>
  );
}

/** Loading full-screen centralizado */
export function FullScreenLoader() {
  return (
    <View style={styles.fullScreenLoader}>
      <ActivityIndicator color={colors.cobalto} size="large" />
      <Typography variant="body" color={colors.muted} style={styles.loaderText}>
        Carregando...
      </Typography>
    </View>
  );
}

export const EmptyState = ({ message }: { message: string }) => (
  <Typography variant="label" color={colors.muted} style={{ textAlign: 'center', marginTop: 32 }}>
    {message}
  </Typography>
);

const styles = StyleSheet.create({
  skeletonList: { gap: 12 },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonTime: { width: 56, height: 20, borderRadius: radius.sm, backgroundColor: colors.border },
  skeletonDetails: { flex: 1, gap: 4 },
  skeletonLine: { height: 18, borderRadius: radius.sm, backgroundColor: colors.border, width: '70%' },
  skeletonLineShort: { height: 14, borderRadius: radius.sm, backgroundColor: colors.border, width: '45%' },
  skeletonWeekStrip: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  skeletonDayChip: { width: 58, height: 48, borderRadius: radius.sm, backgroundColor: colors.border },
  fullScreenLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loaderText: { marginTop: 8 },
});
