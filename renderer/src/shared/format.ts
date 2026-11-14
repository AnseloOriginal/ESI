import type { Status } from '../api/client';

export const STATUS_META: Record<Status, { label: string; color: string; hint: string }> = {
  worsening: { label: 'Worsening', color: '#b3261e', hint: 'A statistically significant trend in the harmful direction.' },
  improving: { label: 'Improving', color: '#28543b', hint: 'A statistically significant trend in the beneficial direction.' },
  wetter: { label: 'Wetter', color: '#4a6a8f', hint: 'Significantly more rainfall. Shown neutrally: it can bring flood pressure or relief.' },
  drier: { label: 'Drier', color: '#4a6a8f', hint: 'Significantly less rainfall. Shown neutrally: it can bring drought pressure or relief.' },
  no_clear_trend: { label: 'No clear trend', color: '#8a948d', hint: 'Change is not distinguishable from natural variability. This is not proof of stability.' },
  insufficient_data: { label: 'Insufficient data', color: '#b9bcb8', hint: 'Too short or too incomplete to test.' },
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

export function formatDate(iso?: string | null): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const cityHash = (name: string): string => `#/city/${encodeURIComponent(name)}`;

export const statusBadge = (status: Status): string =>
  `<span class="badge" style="--badge:${STATUS_META[status].color}" title="${esc(STATUS_META[status].hint)}">${STATUS_META[status].label}</span>`;
