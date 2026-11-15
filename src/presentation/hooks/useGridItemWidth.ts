import { useWindowDimensions } from 'react-native';
import { layout, spacing } from '../../core/theme';

/** Largura de cada item de uma grade de `columns` colunas, adaptando à tela (celular ou tablet). */
export function useGridItemWidth(columns: number, gap = spacing.gap) {
  const { width } = useWindowDimensions();
  const content = Math.min(width, layout.maxContentWidth) - spacing.screen * 2;
  return (content - gap * (columns - 1)) / columns;
}
