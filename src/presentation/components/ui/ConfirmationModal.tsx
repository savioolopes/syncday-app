import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { colors, radius, spacing } from '../../../core/theme';
import { Typography } from './Typography';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

/** Modal de confirmação customizado para funcionar no web e native. */
export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmationModalProps) {
  if (!visible) return null;

  const confirmColor = destructive ? colors.orange : colors.blue;

  return (
    <View style={styles.backdrop} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}>
      <Pressable
        style={styles.modal}
        onPress={() => {}}
        onStartShouldSetResponder={() => true}
      >
        <Typography variant="heading" style={styles.title}>{title}</Typography>
        <Typography variant="body" color={colors.muted} style={styles.message}>
          {message}
        </Typography>
        <View style={styles.actions}>
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityRole="button"
            hitSlop={12}
          >
            <Typography variant="label" color={colors.ink}>{cancelText}</Typography>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, destructive && styles.confirmButtonDestructive]}
            onPress={onConfirm}
            accessibilityRole="button"
            hitSlop={12}
          >
            <Typography variant="label" color={destructive ? colors.white : confirmColor}>
              {confirmText}
            </Typography>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ink + '80',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  title: { marginBottom: 8 },
  message: { marginBottom: 20, lineHeight: 22 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.glass,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButtonDestructive: {
    backgroundColor: colors.orange,
  },
});