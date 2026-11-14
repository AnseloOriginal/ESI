export const STATUS_COLORS = {
  worsening: '#c1354c',
  improving: '#4f7956',
  wetter: '#4d799a',
  drier: '#4d799a',
  no_clear_trend: '#777f7b',
  insufficient_data: '#aab5b5',
} as const;

export const PRESSURE_COLORS = {
  none: '#56a07a',
  low: '#5c91ad',
  medium: '#df7a82',
  high: '#c1354c',
  insufficient: '#788d9a',
} as const;
