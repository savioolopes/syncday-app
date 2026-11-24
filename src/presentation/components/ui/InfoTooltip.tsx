import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../../core/theme';

interface Props {
  /** Text to show in the tooltip */
  text: string;
  /** Optional label for accessibility */
  accessibilityLabel?: string;
  /** Trigger element (defaults to info circle icon) */
  children?: React.ReactNode;
  /** Optional style for the trigger wrapper */
  style?: ViewStyle;
}

/**
 * Tooltip que aparece ao pressionar/hover no ícone de informação.
 * Em mobile: touch para abrir/fechar. Em web: hover para abrir, leave para fechar.
 */
export function InfoTooltip({ text, accessibilityLabel = 'Mais informações', children, style }: Props) {
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<View>(null);
  const triggerRef = useRef<View>(null);

  // Close on outside press
  useEffect(() => {
    // Could add outside press handler here if needed
    return () => {};
  }, [visible]);

  const toggle = () => setVisible((v) => !v);
  const close = () => setVisible(false);

  const trigger = children ?? (
    <Pressable
      ref={triggerRef}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={styles.trigger}
    >
      <Feather name="info" size={18} color={colors.whiteMuted} />
    </Pressable>
  );

  return (
    <View style={[styles.wrapper, style]}>
      {trigger}
      {visible && (
        <View ref={tooltipRef} style={styles.tooltip} pointerEvents="box-none">
          <View style={styles.arrow} />
          <View style={styles.content}>
            <Text style={styles.text}>{text}</Text>
          </View>
          {/* Overlay to catch outside presses on mobile */}
          {Platform.OS !== 'web' && (
            <Pressable
              style={styles.overlay}
              onPress={close}
              accessibilityLabel="Fechar"
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' } as ViewStyle,
  trigger: { padding: 4 } as ViewStyle,
  tooltip: {
    position: 'absolute',
    top: 28,
    right: 0,
    width: 260,
    maxWidth: '80%',
    zIndex: 200,
    backgroundColor: colors.tinta,
    borderRadius: radius.md,
    padding: spacing.gap,
    shadowColor: colors.tinta,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  } as ViewStyle,
  arrow: {
    position: 'absolute',
    top: -6,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.tinta,
  } as ViewStyle,
  content: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 } as ViewStyle,
  text: { color: colors.white, fontSize: 13, lineHeight: 18, flex: 1 } as TextStyle,
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
  } as ViewStyle,
});