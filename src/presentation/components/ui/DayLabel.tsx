import { memo } from 'react';
import { View } from 'react-native';
import { weekdayShort } from '../../../core/utils/dates';
import { Typography } from './Typography';

/** "SEG / 12": dia da semana (mono) + número (mono bold). Usado na semana e no seletor de datas. */
function DayLabelComponent({ date, color, numberSize = 22 }: { date: Date; color: string; numberSize?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Typography variant="mono" size={12} color={color}>
        {weekdayShort(date)}
      </Typography>
      <Typography variant="monoBold" size={numberSize} color={color} style={{ marginTop: 2 }}>
        {date.getDate()}
      </Typography>
    </View>
  );
}

export const DayLabel = memo(DayLabelComponent);
