import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../../../core/theme';
import { HorizontalLogo } from '../../components/brand/Logo';
import { InfoTooltip } from './InfoTooltip';

interface Props {
  /** Title displayed below the wordmark */
  title: string;
  /** Optional info tooltip text (shows an "i" icon next to title) */
  infoTooltip?: string;
  /** Left element (e.g., BackButton) */
  left?: ReactNode;
  /** Right element (e.g., user avatar menu) */
  right?: ReactNode;
  /** Additional style */
  style?: StyleProp<ViewStyle>;
  /** Extra content below title/subtitle (for special cases) */
  children?: ReactNode;
}

/**
 * Cabeçalho padrão das telas: altura fixa 110, Wordmark centralizado,
 * ação à esquerda e avatar/menu à direita. Título e subtítulo opcionais
 * abaixo do Wordmark. Conteúdo extra (saudações, calendários) deve ir
 * no corpo da tela (ScrollView), não aqui.
 */
export function ScreenHeader({ title, infoTooltip, left, right, style, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, height: 110 }, style]}>
      <View style={styles.topRow}>
        <View style={styles.leftWrapper}>{left ?? <View style={styles.spacer} />}</View>
        <View style={styles.centerWrapper}>
          <HorizontalLogo symbolSize={28} wordmarkSize={24} color={colors.white} variant="negativa" />
        </View>
        <View style={styles.rightWrapper}>{right ?? <View style={styles.spacer} />}</View>
      </View>
      <TypographyTitle title={title} infoTooltip={infoTooltip} />
      {children}
    </View>
  );
}

function TypographyTitle({ title, infoTooltip }: { title: string; infoTooltip?: string }) {
  return (
    <View style={styles.titleWrapper}>
      <View style={styles.titleRow}>
        {infoTooltip && (
          <InfoTooltip text={infoTooltip} accessibilityLabel={`Informações sobre ${title}`} style={styles.infoIcon} />
        )}
        <Typography variant="heading" color={colors.white} style={styles.title}>{title}</Typography>
      </View>
    </View>
  );
}

import { Typography } from './Typography';

const styles = StyleSheet.create({
  root: { backgroundColor: colors.cobalto, paddingHorizontal: spacing.screen, paddingBottom: 12, zIndex: 100 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftWrapper: { position: 'absolute', left: 0, height: '100%', justifyContent: 'center', minWidth: 36, zIndex: 10 },
  centerWrapper: { flex: 1, alignItems: 'center' },
  rightWrapper: { position: 'absolute', right: 0, height: '100%', justifyContent: 'center', minWidth: 36, alignItems: 'flex-end', zIndex: 10 },
  spacer: { width: 36 },
  titleWrapper: { marginTop: 10, alignItems: 'center', gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon: { marginRight: 4 },
  title: { marginTop: 8 },
  subtitle: { marginTop: 4 },
});