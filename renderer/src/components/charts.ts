import { esc } from '../shared/format';

export interface ChartInput {
  label: string;
  unit: string;
  points: { date: string; value?: number | null }[];
  trend?: { startYear: number; endYear: number; perDecade: number; significant: boolean; color: string };
}

const YEAR_MS = 365.25 * 86400000;

export function lineChart(input: ChartInput): string {
  const W = 640, H = 250, m = { t: 18, r: 14, b: 28, l: 48 };
  const pts = input.points
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ t: Date.parse(p.date), v: p.value as number }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) return '<p class="muted">Not enough series data to draw a chart.</p>';

  const roll = pts.map((_, i) => (i < 11 ? null : pts.slice(i - 11, i + 1).reduce((s, p) => s + p.v, 0) / 12));

  let line: { t1: number; v1: number; t2: number; v2: number } | null = null;
  if (input.trend) {
    const t1 = Date.UTC(input.trend.startYear, 0, 1), t2 = Date.UTC(input.trend.endYear + 1, 0, 1);
    const inRange = pts.filter((p) => p.t >= t1 && p.t < t2);
    if (inRange.length >= 12) {
      const meanV = inRange.reduce((s, p) => s + p.v, 0) / inRange.length;
      const meanT = inRange.reduce((s, p) => s + p.t, 0) / inRange.length;
      const slope = input.trend.perDecade / 10 / YEAR_MS;
      line = { t1, v1: meanV + slope * (t1 - meanT), t2, v2: meanV + slope * (t2 - meanT) };
    }
  }

  const tMin = pts[0].t, tMax = pts[pts.length - 1].t;
  const vals = pts.map((p) => p.v).concat(line ? [line.v1, line.v2] : []);
  let vMin = Math.min(...vals), vMax = Math.max(...vals);
  const pad = (vMax - vMin || 1) * 0.08;
  vMin -= pad; vMax += pad;
  const x = (t: number) => m.l + ((t - tMin) / (tMax - tMin)) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - ((v - vMin) / (vMax - vMin)) * (H - m.t - m.b);

  const range = vMax - vMin;
  const dec = range < 2 ? 2 : range < 20 ? 1 : 0;
  const yTicks = Array.from({ length: 5 }, (_, k) => vMin + (range * k) / 4)
    .map((v) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${m.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v.toFixed(dec)}</text>`)
    .join('');

  const d0 = new Date(tMin), y1 = new Date(tMax).getUTCFullYear();
  const firstYear = d0.getUTCFullYear() + (tMin > Date.UTC(d0.getUTCFullYear(), 0, 1) ? 1 : 0);
  const step = Math.max(1, Math.ceil((y1 - firstYear) / 7));
  let xTicks = '';
  for (let yr = Math.ceil(firstYear / step) * step; yr <= y1; yr += step) {
    const px = x(Date.UTC(yr, 0, 1));
    xTicks += `<text x="${px.toFixed(1)}" y="${H - 8}" text-anchor="middle">${yr}</text>`;
  }

  const rawPath = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  let rollPath = '', started = false;
  roll.forEach((v, i) => { if (v == null) return; rollPath += `${started ? 'L' : 'M'}${x(pts[i].t).toFixed(1)},${y(v).toFixed(1)}`; started = true; });

  const trendLine = line && input.trend
    ? `<line x1="${x(line.t1).toFixed(1)}" y1="${y(line.v1).toFixed(1)}" x2="${x(line.t2).toFixed(1)}" y2="${y(line.v2).toFixed(1)}" stroke="${input.trend.color}" stroke-width="2" stroke-dasharray="6 5" opacity="${input.trend.significant ? 0.95 : 0.5}"/>`
    : '';

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(input.label)}: monthly values with a 12-month average">
    ${yTicks}${xTicks}
    <text x="4" y="10">${esc(input.unit)}</text>
    <path d="${rawPath}" fill="none" stroke="#59645c" stroke-opacity=".35" stroke-width="1"/>
    <path d="${rollPath}" fill="none" stroke="#28543b" stroke-width="2.2" stroke-linejoin="round"/>
    ${trendLine}
  </svg>`;
}
