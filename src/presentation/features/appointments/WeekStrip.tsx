import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../../core/theme';
import { toISO } from '../../../core/utils/dates';
// eslint-disable-next-line import/namespace
import { DayLabel } from '../../components/ui/DayLabel';

interface Props {
  days: Date[];
  selectedISO: string;
  onSelect: (iso: string) => void;
}

export function WeekStrip({ days, selectedISO, onSelect }: Props) {
  if (days.length === 0) return null;
  return (
    <View style={styles.strip}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
        style={styles.scrollView}
      >
        {days.map((d) => {
          const iso = toISO(d);
          const active = iso === selectedISO;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(iso)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <DayLabel date={d} color={active ? colors.cobalto : colors.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { marginTop: 8, backgroundColor: colors.nevoa, borderRadius: radius.md, padding: 4, minHeight: 52 },
  scrollView: { },
  days: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  chip: { width: 58, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: radius.sm },
  chipActive: { backgroundColor: colors.white },
});
