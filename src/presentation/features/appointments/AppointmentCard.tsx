import React, { memo } from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { colors, radius } from '../../../core/theme';
import { Appointment } from '../../../domain/entities/appointment';
import { Card } from '../../components/ui/Card';
import { StatusLabel } from '../../components/ui/StatusLabel';
import { Typography } from '../../components/ui/Typography';

import { isSafeImageUrl } from '../../../core/utils/imageValidation';

export const AppointmentCard = memo(function AppointmentCard({
  item,
  accent,
  onCancel,
  onOpenCancelConfirm
}: { item: Appointment; accent: string; onCancel?: (id: string) => void; onOpenCancelConfirm?: (id: string) => void }) {
  const confirmed = item.status === 'confirmed';
  const statusLabel = {
    confirmed: 'Realizado',
    reminder: 'Agendado',
    cancelled: 'Cancelado',
    missed: 'Não compareceu',
  }[item.status];
  const canCancel = onCancel && (item.status === 'reminder' || item.status === 'confirmed');

  const safeLojistaLogo = item.lojistaLogo && isSafeImageUrl(item.lojistaLogo) ? item.lojistaLogo : undefined;

  return (
    <Card accent={accent} style={styles.row}>
      <Typography variant="monoBold" style={styles.time}>
        {item.time}
      </Typography>
      <View style={styles.logoContainer}>
        {safeLojistaLogo ? (
          <Image
            source={{ uri: safeLojistaLogo }}
            style={styles.establishmentLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.logoPlaceholder} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Typography variant="title">{item.title}</Typography>
        <Typography variant="body" color={colors.muted} style={{ marginTop: 2 }}>
          {item.place}
        </Typography>
        <StatusLabel tone={confirmed ? 'success' : 'accent'} label={statusLabel} />
      </View>
      {canCancel && (
        <Pressable
          style={styles.cancelButton}
          onPress={() => onOpenCancelConfirm?.(item.id)}
          hitSlop={{ left: 10, right: 10, top: 10, bottom: 10 }}
        >
          <Typography variant="label" color={colors.coral}>Cancelar</Typography>
        </Pressable>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingRight: 16 },
  time: { width: 56, paddingTop: 2 },
  logoContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  establishmentLogo: { width: 40, height: 40, borderRadius: radius.sm },
  logoPlaceholder: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.glass },
  cancelButton: { paddingVertical: 6, paddingHorizontal: 12, marginLeft: 8, borderRadius: 8, backgroundColor: colors.coral + '15', userSelect: 'none' },
});
