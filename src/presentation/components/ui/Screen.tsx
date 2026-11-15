import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../../core/theme';

/** Container de tela: fundo + barra de status. Use em toda rota. */
export function Screen({ children, statusBar = 'light', background = colors.bg }: { children: ReactNode; statusBar?: 'light' | 'dark'; background?: string }) {
  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style={statusBar} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
