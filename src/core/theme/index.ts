// Tokens da marca SyncDay v1.1 — única fonte de verdade visual.
// Fonte: SyncDay-brand-kit-v1.1/04-cores/syncday-tokens.json

export const colors = {
  // Paleta oficial
  cobalto: '#2347F0', // Principal: símbolo, áreas institucionais, telas do produto
  coral: '#FF5C3A',   // Ação: botões agendar/confirmar, ponto marcado
  tinta: '#0E1130',   // Texto e fundos escuros
  nevoa: '#F2F4FB',   // Fundos e cartões
  menta: '#16B981',   // Só status confirmado

  // Aliases legados (compatibilidade)
  blue: '#2347F0',
  orange: '#FF5C3A',
  ink: '#0E1130',
  bg: '#F2F4FB',
  green: '#16B981',
  white: '#FFFFFF',

  // Derivados de interface (fora da paleta oficial)
  blueSoft: '#E8EDFD',      // cobalto 10%
  coralSoft: '#FFEAE5',     // coral 10%
  muted: '#5B6B8C',         // texto secundário
  border: '#DDE4F3',        // bordas
  disabled: '#E9ECF2',      // fundo desabilitado
  disabledText: '#9AA5B8',  // texto desabilitado
  glass: 'rgba(255,255,255,0.16)', // overlay em fundo escuro
  whiteMuted: 'rgba(255,255,255,0.75)', // texto branco semi-transparente

  // Semânticos
  primary: '#2347F0',
  primaryText: '#FFFFFF',
  action: '#FF5C3A',
  actionText: '#0E1130',
  success: '#16B981',
  background: '#F2F4FB',
  surface: '#FFFFFF',
  text: '#0E1130',
  textSecondary: '#5B6B8C',
};

export const fonts = {
  // Bricolage Grotesque Bold — títulos e marca
  display: 'BricolageGrotesque_700Bold',
  // Inter — texto e interface
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  // Geist Mono — horários, datas e códigos
  mono: 'GeistMono_400Regular',
  monoBold: 'GeistMono_700Bold',
};

export const radius = {
  // Módulo: 12% do símbolo (brand kit)
  module: 12,
  // Cartão: 16px (brand kit)
  card: 16,
  // Botão: 999px = fully rounded (brand kit)
  button: 999,
  // Aliases legados
  sm: 12,
  md: 16,
  lg: 20,
};

export const spacing = {
  screen: 20,
  gap: 10,
};

export const layout = {
  maxContentWidth: 560,
};