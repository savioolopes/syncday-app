import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../../core/theme';
import { Slot } from '../../../domain/entities/service';
import { SelectableTile } from '../../components/ui/SelectableTile';
import { Typography } from '../../components/ui/Typography';
import { useGridItemWidth } from '../../hooks/useGridItemWidth';

interface Props {
  slots: Slot[];
  selected: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlotGrid({ slots, selected, onSelect }: Props) {
  const width = useGridItemWidth(3);
  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const active = slot.time === selected;
        const textColor = !slot.available ? colors.muted : active ? colors.white : colors.tinta;
        return (
          <SelectableTile
            key={slot.time}
            width={width}
            selected={active}
            disabled={!slot.available}
            onPress={() => onSelect(slot.time)}
            accessibilityLabel={`${slot.time}${slot.available ? '' : ', indisponível'}`}
            textColor={textColor}
          >
            <>
              <Typography variant="mono" size={18} color={textColor} style={!slot.available && { textDecorationLine: 'line-through' }}>
                {slot.time}
              </Typography>
              {active && <Feather name="check" size={18} color={colors.white} />}
            </>
          </SelectableTile>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.gap, marginTop: 14 } });
