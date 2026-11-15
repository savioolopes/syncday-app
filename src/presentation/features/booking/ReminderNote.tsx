import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../core/theme';
import { IconTile } from '../../components/ui/IconTile';
import { Typography } from '../../components/ui/Typography';

export function ReminderNote({ text = 'A gente te lembra 1h antes.' }: { text?: string }) {
  return (
    <View style={styles.row}>
      <IconTile background={colors.orangeSoft}>
        <Feather name="bell" size={20} color={colors.orange} />
      </IconTile>
      <Typography variant="body" color={colors.muted}>
        {text}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 30 } });
