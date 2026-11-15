// Tokens da prévia de marca Juntô v0.1 — única fonte de verdade visual.
export const colors = {
  blue: '#2347F0', // Cobalto: principal
  orange: '#FF5C3A', // Coral: ação (agendar, confirmações, destaques)
  ink: '#0E1130', // Tinta: texto e fundos escuros
  bg: '#F2F4FB', // Névoa: fundo e respiro
  green: '#16B981', // Menta: apenas "confirmado"
  white: '#FFFFFF',

  // auxiliares de interface (derivados, fora da paleta oficial)
  blueSoft: '#E8EDFD',
  orangeSoft: '#FFEAE5',
  muted: '#5B6B8C',
  border: '#DDE4F3',
  disabled: '#E9ECF2',
  disabledText: '#9AA5B8',
  glass: 'rgba(255,255,255,0.16)',
  whiteMuted: 'rgba(255,255,255,0.75)',
};

export const fonts = {
  display: 'BricolageGrotesque_700Bold', // títulos e marca
  regular: 'Inter_400Regular', // texto e interface
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'GeistMono_400Regular', // horários, datas e códigos
  monoBold: 'GeistMono_700Bold',
};

export const radius = { sm: 12, md: 16, lg: 20 };
export const spacing = { screen: 20, gap: 10 };
export const layout = { maxContentWidth: 560 };
