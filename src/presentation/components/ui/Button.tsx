import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../../core/theme';
import { Typography } from './Typography';

type Variant = 'primary' | 'outline' | 'accent' | 'link';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const textColor: Record<Variant, string> = {
  primary: colors.white,
  accent: colors.white,
  outline: colors.blue,
  link: colors.orange,
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: colors.blue },
        variant === 'accent' && { backgroundColor: colors.orange },
        variant === 'outline' && { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.blue },
        variant === 'link' && { height: 44 },
        inactive && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <Typography variant={variant === 'link' ? 'label' : 'title'} size={variant === 'link' ? 18 : 17} color={textColor[variant]}>
          {label}
        </Typography>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
