import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../core/theme';
import { formatBRL } from '../../../core/utils/format';
import { Service } from '../../../domain/entities/service';
import { Card } from '../../components/ui/Card';
import { IconTile } from '../../components/ui/IconTile';
import { Typography } from '../../components/ui/Typography';

export function ServiceSummaryCard({ service, icon = 'scissors' }: { service: Service; icon?: React.ComponentProps<typeof Feather>['name'] }) {
  return (
    <Card style={styles.row}>
      <IconTile size={56}>
        <Feather name={icon} size={26} color={colors.cobalto} />
      </IconTile>
      <View style={{ flex: 1 }}>
        <Typography variant="heading">{service.enrichedName ?? service.name}</Typography>
        <Typography variant="body" size={17} color={colors.muted} style={{ marginTop: 2 }}>
          {service.enrichedPlace ?? service.place}
        </Typography>
        {service.durationMin !== undefined || service.price !== undefined ? (
          <Typography variant="body" color={colors.muted} style={{ marginTop: 4 }}>
            {service.durationMin !== undefined ? `${service.durationMin} min` : ''}
            {service.durationMin !== undefined && service.price !== undefined ? '  ·  ' : ''}
            {service.price !== undefined ? formatBRL(service.price) : ''}
          </Typography>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 } });
