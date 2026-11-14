import type { Trend } from '../api/client';

export interface Pressure { worsening: number; tested: number; ratio: number | null; color: string }

export const PRESSURE_LEGEND = [
  { color: '#789171', label: 'No indicator worsening' },
  { color: '#bb9a52', label: 'Up to a third worsening' },
  { color: '#b9794c', label: 'Up to two thirds worsening' },
  { color: '#a6533b', label: 'More than two thirds worsening' },
  { color: '#817f73', label: 'Not enough data' },
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
