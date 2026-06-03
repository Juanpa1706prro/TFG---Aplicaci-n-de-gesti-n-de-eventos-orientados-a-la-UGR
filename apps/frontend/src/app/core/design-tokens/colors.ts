/**
 * Tokens de color (TypeScript) — espejo de styles/design-tokens/colors.css
 * Para lógica en TS (mapas, gráficos, temas dinámicos).
 */
export const UGR_COLORS = {
  primary: '#9b002e',
  primaryContainer: '#c8013e',
  onPrimary: '#ffffff',
  primaryFixedDim: '#7a0024',

  secondary: '#004a77',
  secondaryContainer: '#4a96fd',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#002e5f',

  surface: '#fcf8f9',
  surfaceContainerLow: '#f6f3f4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#ebe7e8',
  surfaceBright: '#ffffff',

  onSurface: '#1c1b1c',
  onSurfaceVariant: '#5c3f41',

  outline: '#906f70',
  outlineVariant: '#e4bdbf',

  surfaceTint: '#be003a',
} as const;

export type UgrColorToken = keyof typeof UGR_COLORS;
