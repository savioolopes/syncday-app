import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../core/theme';
import { formatBRL } from '../../../core/utils/format';
import { Typography } from '../../components/ui/Typography';

export function BookingSummary({ value, price }: { value: string; price?: number }) {
  return (
    <View style={styles.row}>
      <View>
        <Typography variant="caption" color={colors.muted}>
          Seu novo horário
        </Typography>
        <Typography variant="title" style={{ marginTop: 2 }}>
          {value}
        </Typography>
      </View>
      {price !== undefined && (
        <Typography variant="heading" size={26}>
          {formatBRL(price)}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' } });
