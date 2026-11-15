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
  return (
    <View style={styles.strip}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
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
              <DayLabel date={d} color={active ? colors.cobalto : colors.whiteMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { marginTop: 14, backgroundColor: colors.glass, borderRadius: radius.md, padding: 4 },
  days: { flexDirection: 'row', gap: 4 },
  chip: { width: 58, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.sm },
  chipActive: { backgroundColor: colors.white },
});
