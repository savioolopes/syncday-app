import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { colors, fonts } from '../../../core/theme';

export type TypographyVariant = 'display' | 'heading' | 'title' | 'body' | 'label' | 'caption' | 'mono' | 'monoBold';

const variants: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  title: { fontFamily: fonts.bold, fontSize: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16 },
  label: { fontFamily: fonts.medium, fontSize: 16 },
  caption: { fontFamily: fonts.regular, fontSize: 15 },
  mono: { fontFamily: fonts.mono, fontSize: 16 },
  monoBold: { fontFamily: fonts.monoBold, fontSize: 16 },
};

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

/** Único ponto de entrada para texto: garante fonte e cor do design system. */
export function Typography({ variant = 'body', color = colors.tinta, size, style, ...rest }: Props) {
  return <Text {...rest} style={[variants[variant], { color }, size ? { fontSize: size } : null, style]} />;
}
