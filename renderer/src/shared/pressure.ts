import type { Trend } from '../api/client';

export interface Pressure { worsening: number; tested: number; ratio: number | null; color: string }

export const PRESSURE_LEGEND = [
  { color: '#6fae82', label: 'No indicator worsening' },
  { color: '#e0b02c', label: 'Up to a third worsening' },
  { color: '#e0782c', label: 'Up to two thirds worsening' },
  { color: '#d4351c', label: 'More than two thirds worsening' },
  { color: '#8a948d', label: 'Not enough data' },
];

/** Share of tested indicators (excluding neutral rainfall) with a significant worsening trend. */
export function pressureOf(trends: Trend[]): Pressure {
  const tested = trends.filter((t) => t.worse_direction !== 'both' && t.status !== 'insufficient_data');
  const worsening = tested.filter((t) => t.status === 'worsening').length;
  if (!tested.length) return { worsening, tested: 0, ratio: null, color: PRESSURE_LEGEND[4].color };
  const ratio = worsening / tested.length;
  const color = ratio === 0 ? PRESSURE_LEGEND[0].color : ratio <= 1 / 3 ? PRESSURE_LEGEND[1].color : ratio <= 2 / 3 ? PRESSURE_LEGEND[2].color : PRESSURE_LEGEND[3].color;
  return { worsening, tested: tested.length, ratio, color };
}
