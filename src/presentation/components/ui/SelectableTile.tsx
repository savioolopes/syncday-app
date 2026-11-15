import React, { ReactNode, memo } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../../core/theme';

interface Props {
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  width?: number;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Text color to use for children (normal, selected, disabled). */
  textColor?: string;
  children: ReactNode;
}

/** Base de seleção usada por datas e horários. */
const SelectableTile = memo(function SelectableTile({
  selected,
  disabled,
  onPress,
  width,
  height = 56,
  accessibilityLabel,
  style,
  textColor,
  children,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, { width, height }, selected && styles.selected, disabled && styles.disabled, style]}
    >
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.blue, borderColor: colors.blue },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
});

export { SelectableTile };