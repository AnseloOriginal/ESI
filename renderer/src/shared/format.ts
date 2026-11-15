import type { Status } from '../api/client';
import { STATUS_COLORS } from './palette';

export const STATUS_META: Record<Status, { label: string; color: string; hint: string }> = {
  worsening: { label: 'Worsening', color: STATUS_COLORS.worsening, hint: 'The indicator has changed significantly in a direction associated with added environmental stress.' },
  improving: { label: 'Improving', color: STATUS_COLORS.improving, hint: 'The indicator has changed significantly in a direction associated with less environmental stress.' },
  wetter: { label: 'Wetter', color: STATUS_COLORS.wetter, hint: 'Rainfall has increased. More rain can bring both benefits and challenges.' },
  drier: { label: 'Drier', color: STATUS_COLORS.drier, hint: 'Rainfall has decreased. Less rain can bring both benefits and challenges.' },
  no_clear_trend: { label: 'No clear trend', color: STATUS_COLORS.no_clear_trend, hint: 'The data does not show a clear change beyond normal year-to-year variation.' },
  insufficient_data: { label: 'Insufficient data', color: STATUS_COLORS.insufficient_data, hint: 'The record is too short or incomplete to tell whether a trend is present.' },
};

export const SIGNIFICANT: Status[] = ['worsening', 'improving', 'wetter', 'drier'];

export function esc(value: unknown): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (c) => map[c]);
}

export const unitLabel = (unit: string): string => unit.replace('degC', '°C');

export function signed(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}

export const formatPValue = (p: number | null | undefined): string =>
  p == null ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3);

export function formatPopulation(population?: number | null): string {
  if (population == null || !Number.isFinite(population)) return 'Population estimate unavailable';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(population);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const cityHash = (name: string): string => `#/city/${encodeURIComponent(name)}`;

export const statusBadge = (status: Status): string =>
  `<span class="badge" style="--badge:${STATUS_META[status].color}" title="${esc(STATUS_META[status].hint)}">${STATUS_META[status].label}</span>`;
