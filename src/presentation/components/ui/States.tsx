import React from 'react';
import { ActivityIndicator } from 'react-native';
import { colors } from '../../../core/theme';
import { Typography } from './Typography';

export const LoadingState = () => <ActivityIndicator color={colors.cobalto} style={{ marginTop: 40 }} />;

export const EmptyState = ({ message }: { message: string }) => (
  <Typography variant="label" color={colors.muted} style={{ textAlign: 'center', marginTop: 32 }}>
    {message}
  </Typography>
);
