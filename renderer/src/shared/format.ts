import type { Status } from '../api/client';
import { STATUS_COLORS } from './palette';

export const STATUS_META: Record<Status, { label: string; color: string; hint: string }> = {
  worsening: { label: 'Worsening', color: STATUS_COLORS.worsening, hint: 'A statistically significant trend in the harmful direction.' },
  improving: { label: 'Improving', color: STATUS_COLORS.improving, hint: 'A statistically significant trend in the beneficial direction.' },
  wetter: { label: 'Wetter', color: STATUS_COLORS.wetter, hint: 'Significantly more rainfall. Shown neutrally: it can bring flood pressure or relief.' },
  drier: { label: 'Drier', color: STATUS_COLORS.drier, hint: 'Significantly less rainfall. Shown neutrally: it can bring drought pressure or relief.' },
  no_clear_trend: { label: 'No clear trend', color: STATUS_COLORS.no_clear_trend, hint: 'Change is not distinguishable from natural variability. This is not proof of stability.' },
  insufficient_data: { label: 'Insufficient data', color: STATUS_COLORS.insufficient_data, hint: 'Too short or too incomplete to test.' },
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
