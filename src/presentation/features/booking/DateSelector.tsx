import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../../core/theme';
import { toISO } from '../../../core/utils/dates';
// eslint-disable-next-line import/namespace
import { DayLabel } from '../../components/ui/DayLabel';
import { SelectableTile } from '../../components/ui/SelectableTile';
import { Typography } from '../../components/ui/Typography';
import { useGridItemWidth } from '../../hooks/useGridItemWidth';

interface Props {
  monthLabel: string;
  days: Date[];
  selectedISO: string;
  isClosed: (d: Date) => boolean;
  canGoBack: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (iso: string) => void;
}

export function DateSelector({ monthLabel, days, selectedISO, isClosed, canGoBack, onPrev, onNext, onSelect }: Props) {
  const width = useGridItemWidth(days.length);
  return (
    <View>
      <View style={styles.monthRow}>
        <Typography variant="label" size={17} color={colors.muted}>
          {monthLabel}
        </Typography>
        <View style={styles.arrows}>
          <Pressable disabled={!canGoBack} onPress={onPrev} hitSlop={12} accessibilityLabel="Dias anteriores">
            <Feather name="chevron-left" size={26} color={canGoBack ? colors.cobalto : colors.muted} />
          </Pressable>
          <Pressable onPress={onNext} hitSlop={12} accessibilityLabel="Próximos dias">
            <Feather name="chevron-right" size={26} color={colors.cobalto} />
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {days.map((d) => {
          const iso = toISO(d);
          const active = iso === selectedISO;
          const disabled = isClosed(d);
          const textColor = disabled ? colors.muted : active ? colors.white : colors.tinta;
          return (
            <SelectableTile
              key={iso}
              width={width}
              height={68}
              selected={active}
              disabled={disabled}
              onPress={() => onSelect(iso)}
              style={{ flexDirection: 'column', gap: 0 }}
              textColor={textColor}
            >
              <DayLabel date={d} color={textColor} numberSize={24} />
            </SelectableTile>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 14 },
  arrows: { flexDirection: 'row', gap: 22 },
  row: { flexDirection: 'row', gap: spacing.gap },
});
