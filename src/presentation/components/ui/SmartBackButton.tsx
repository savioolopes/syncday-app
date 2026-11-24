import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../core/theme';
import { Typography } from './Typography';

interface Props {
  /** Optional label to show next to the arrow */
  label?: string;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Custom fallback route if no navigation history exists */
  fallbackHref?: string;
  /** Custom onPress handler (overrides smart behavior) */
  onPress?: () => void;
}

/**
 * Smart BackButton that:
 * 1. Uses router.canGoBack() to check for navigation history
 * 2. If history exists, calls router.back()
 * 3. If no history (e.g., after page refresh), navigates to fallbackHref or infers from current route
 * 4. Provides consistent behavior across the app
 */
export function SmartBackButton({
  label,
  compact = false,
  fallbackHref,
  onPress,
}: Props) {
  const router = useRouter();
  const segments = useSegments();

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }

    // If there's navigation history, go back
    if (router.canGoBack()) {
      router.back();
      return;
    }

    // No history - use fallback or infer from current route
    const target = fallbackHref ?? inferFallbackRoute(segments);
    router.replace(target as any);
  }, [router, fallbackHref, segments, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label ? `Voltar para ${label}` : 'Voltar'}
      hitSlop={10}
      style={[styles.row, compact && styles.compact]}
    >
      <View style={compact ? styles.compactIconWrapper : undefined}>
        <Feather name="arrow-left" size={22} color={colors.white} />
      </View>
      {label && !compact && <Typography variant="label" size={17} color={colors.white}>{label}</Typography>}
    </Pressable>
  );
}

/**
 * Infers a sensible fallback route based on current route segments.
 * Used when there's no navigation history (e.g., after page refresh).
 */
function inferFallbackRoute(segments: string[]): string {
  // Client routes
  if (segments.includes('novo-agendamento')) return '/agendamentos';
  if (segments.includes('agendamentos')) return '/';
  if (segments.includes('perfil-cliente')) return '/agendamentos';

  // Merchant routes
  if (segments.includes('gestao-lojista')) return '/agenda-lojista';
  if (segments.includes('agenda-lojista')) return '/';
  if (segments.includes('perfil-lojista')) return '/agenda-lojista';

  // Auth / selection
  if (segments.includes('selecionar-perfil')) return '/';

  // Default to home
  return '/';
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compact: { gap: 0 },
  compactIconWrapper: { width: 36, alignItems: 'center', justifyContent: 'center' },
});

export default SmartBackButton;