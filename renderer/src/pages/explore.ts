import { api, type CitySummary, type IndicatorInfo, type SeriesOut, type Trend } from '../api/client';
import { formatDate, formatPValue, esc, signed, unitLabel } from '../shared/format';
import { blurb } from '../shared/indicators';
import type { Mount } from '../router';

const CITY_COLORS = ['#386244', '#4d799a', '#bd7343', '#8a6598', '#b04b55', '#667a43', '#397d79', '#a67d25', '#52617e', '#a25d78', '#5c7d9a'];
interface TooltipPoint { city: string; t: number; v: number; x: number; y: number }
interface ComparisonChart { html: string; points: TooltipPoint[]; unit: string; digits: number }

function trendLabel(trend: Trend): string {
  if (trend.status === 'insufficient_data') return 'Insufficient data';
  if (trend.status === 'no_clear_trend' || trend.direction === 'none') return 'No clear trend';
  if (trend.status === 'wetter' || trend.status === 'drier') return trend.status === 'wetter' ? 'Wetter' : 'Drier';
  return trend.direction === 'increasing' ? 'Significant increase' : 'Significant decrease';
}

function compareChart(id: string, label: string, unit: string, records: { city: string; data: SeriesOut; color: string }[]): ComparisonChart {
  const W = 760, H = 300, m = { t: 20, r: 18, b: 32, l: 58 };
  const series = records.map((record) => {
    const points = record.data.points.filter((p) => p.value != null && Number.isFinite(p.value))
      .map((p) => ({ t: Date.parse(p.date), v: p.value as number })).filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
    const rolling = points.slice(11).map((p, i) => ({ t: p.t, v: points.slice(i, i + 12).reduce((s, q) => s + q.v, 0) / 12 }));
    return { city: record.city, color: record.color, points: rolling };
  }).filter((s) => s.points.length >= 2);
  if (!series.length) return { html: '<p class="muted">No comparable time series are available for this selection.</p>', points: [], unit, digits: 1 };
  const all = series.flatMap((s) => s.points);
  const tMin = Math.min(...all.map((p) => p.t)), tMax = Math.max(...all.map((p) => p.t));
  let vMin = Math.min(...all.map((p) => p.v)), vMax = Math.max(...all.map((p) => p.v));
  const pad = (vMax - vMin || 1) * .08; vMin -= pad; vMax += pad;
  const x = (t: number) => m.l + (t - tMin) / (tMax - tMin) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v - vMin) / (vMax - vMin) * (H - m.t - m.b);
  const range = vMax - vMin, digits = range < 2 ? 2 : range < 20 ? 1 : 0;
  const yGrid = Array.from({ length: 5 }, (_, i) => vMin + range * i / 4).map((v) =>
    `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${m.l - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v.toFixed(digits)}</text>`).join('');
  const firstYear = new Date(tMin).getUTCFullYear(), lastYear = new Date(tMax).getUTCFullYear();
  const step = Math.max(1, Math.ceil((lastYear - firstYear) / 6));
  let xGrid = '';
  for (let yr = firstYear; yr <= lastYear; yr += step) {
    const px = x(Date.UTC(yr, 0, 1));
    xGrid += `<text x="${px.toFixed(1)}" y="${H - 9}" text-anchor="middle">${yr}</text>`;
  }
  const lines = series.map((s) => {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round"/>`;
  }).join('');
  const tooltipPoints = series.flatMap((s) => s.points.map((p) => ({ city: s.city, t: p.t, v: p.v, x: x(p.t), y: y(p.v) })));
  return {
    html: `<svg viewBox="0 0 ${W} ${H}" data-compare-chart="${esc(id)}" tabindex="0" role="img" aria-label="${esc(label)} comparison across selected cities using 12-month averages. Hover a line to inspect its value.">${yGrid}${xGrid}<text x="5" y="12">${esc(unit)}</text>${lines}</svg>`,
    points: tooltipPoints, unit, digits,
  };
}

export async function explorePage(): Promise<Mount> {
  const [cities, indicators, results] = await Promise.all([api.cities(), api.indicators(), api.results()]);
  const latest = results.find((r) => r.generated_at)?.generated_at;

  return (root) => {
    root.innerHTML = `<div class="page-content explore-content">
      <header class="page-header"><p class="trending-kicker">VARIABLES · PLACES · TRENDS</p><h1>Explore Trends</h1>
        <p class="lede">Choose indicators and cities to compare how their measured patterns change over time.</p>
        <p class="meta">Each indicator is charted on its own scale. Similar timing or direction can suggest a connection to investigate; it does not establish cause.</p>
      </header>
      <form class="card explore-controls" id="explore-form">
        <details class="explore-dock" id="explore-dock" open><summary>Choose indicators and cities <span id="explore-selection-summary">No selection yet</span></summary>
          <div class="explore-picker-body">
            <fieldset><legend>1. Choose one or more indicators</legend><div class="explore-options indicator-options">${indicators.map((i: IndicatorInfo) => `<label class="explore-option"><input type="checkbox" name="indicator" value="${esc(i.indicator)}"><span><strong>${esc(i.label)}</strong><small>${esc(unitLabel(i.unit))} · ${i.n_cities} cities available</small><small>${esc(blurb(i.indicator))}</small></span></label>`).join('')}</div></fieldset>
            <fieldset><legend>2. Choose one or more cities</legend><div class="explore-city-tools"><button type="button" class="text-button" data-city-action="all">Select all</button><button type="button" class="text-button" data-city-action="clear">Clear</button></div><div class="explore-options city-options">${cities.map((c: CitySummary) => `<label class="explore-option"><input type="checkbox" name="city" value="${esc(c.name)}"><span><strong>${esc(c.name)}</strong>${c.country ? `<small>${esc(c.country)}</small>` : ''}</span></label>`).join('')}</div></fieldset>
          </div>
        </details>
        <div class="explore-actions"><button class="link-button" type="submit">Compare selection</button><p class="explore-hint" id="explore-hint" aria-live="polite">Select at least one indicator and one city to compare.</p></div>
      </form>
      <div class="explore-results" id="explore-results"><section class="card explore-empty"><span aria-hidden="true">↗</span><p>Your comparisons will appear here.</p></section></div>
      <footer class="trending-footer">Data last updated <strong>${esc(formatDate(latest))}</strong></footer>
    </div>`;

    const form = root.querySelector<HTMLFormElement>('#explore-form')!;
    const resultsHost = root.querySelector<HTMLElement>('#explore-results')!;
    const hint = root.querySelector<HTMLElement>('#explore-hint')!;
    const dock = root.querySelector<HTMLDetailsElement>('#explore-dock')!;
    const selectionSummary = root.querySelector<HTMLElement>('#explore-selection-summary')!;
    let request = 0;
    const updateSelectionSummary = () => {
      const nIndicators = form.querySelectorAll('input[name="indicator"]:checked').length;
      const nCities = form.querySelectorAll('input[name="city"]:checked').length;
      selectionSummary.textContent = `${nIndicators} indicator${nIndicators === 1 ? '' : 's'} · ${nCities} ${nCities === 1 ? 'city' : 'cities'}`;
    };
    form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box) => box.addEventListener('change', updateSelectionSummary));
    form.querySelectorAll<HTMLButtonElement>('[data-city-action]').forEach((button) => button.addEventListener('click', () => {
      const setAll = button.dataset.cityAction === 'all';
      form.querySelectorAll<HTMLInputElement>('input[name="city"]').forEach((box) => { box.checked = setAll; });
      updateSelectionSummary();
    }));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const selectedIndicators = [...form.querySelectorAll<HTMLInputElement>('input[name="indicator"]:checked')].map((x) => x.value);
      const selectedCities = [...form.querySelectorAll<HTMLInputElement>('input[name="city"]:checked')].map((x) => x.value);
      if (!selectedIndicators.length || !selectedCities.length) {
        hint.textContent = 'Choose at least one indicator and one city.';
        return;
      }
      const current = ++request;
      dock.open = false;
      hint.textContent = `Loading ${selectedIndicators.length * selectedCities.length} city-indicator series…`;
      resultsHost.innerHTML = '<section class="card"><p class="loading"><span class="spinner"></span>Loading comparisons</p></section>';
      const data = await Promise.all(selectedIndicators.flatMap((indicator) => selectedCities.map(async (city) => {
        try { return { indicator, city, series: await api.series(city, indicator), error: '' }; }
        catch (e) { return { indicator, city, series: null, error: e instanceof Error ? e.message : 'Series unavailable' }; }
      })));
      if (current !== request) return;
      const colorFor = (city: string) => CITY_COLORS[Math.max(0, cities.findIndex((c) => c.name === city)) % CITY_COLORS.length];
      const chartRegistry = new Map<string, ComparisonChart>();
      const cards = selectedIndicators.map((indicator, chartIndex) => {
        const info = indicators.find((x: IndicatorInfo) => x.indicator === indicator)!;
        const group = data.filter((x) => x.indicator === indicator);
        const chartSeries = group.filter((x) => x.series).map((x) => ({ city: x.city, data: x.series as SeriesOut, color: colorFor(x.city) }));
        const chartId = `compare-${chartIndex}`;
        const chart = compareChart(chartId, info.label, unitLabel(info.unit), chartSeries);
        chartRegistry.set(chartId, chart);
        const rows = group.map(({ city, error }) => {
          const trend = results.find((r: Trend) => r.city === city && r.indicator === indicator);
          if (!trend) return `<tr><th scope="row">${esc(city)}</th><td colspan="4">${esc(error || 'No trend result for this city.')}</td></tr>`;
          return `<tr><th scope="row"><span class="explore-city-key" style="--city-color:${colorFor(city)}"></span>${esc(city)}</th><td><span class="explore-trend-badge">${esc(trendLabel(trend))}</span></td><td>${trend.status === 'insufficient_data' ? '—' : `${signed(trend.trend_per_decade)} ${esc(unitLabel(trend.unit))}/decade`}</td><td>${formatPValue(trend.p_value)}</td><td>${trend.start_year ?? '—'}–${trend.end_year ?? '—'}</td></tr>`;
        }).join('');
        const legend = chartSeries.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.city)}</span>`).join('');
        return `<article class="card explore-indicator-card"><header><div><p class="eyebrow">INDICATOR</p><h2>${esc(info.label)}</h2></div><span class="badge" style="--badge:var(--color-slate)">${esc(unitLabel(info.unit))}</span></header>
          <div class="explore-chart"><div class="explore-chart-tooltip" role="tooltip" hidden></div>${chart.html}</div><div class="explore-legend">${legend}</div>
          <p class="card-foot">Each line shows the 12-month average. The table reports the long-term trend per decade and its significance test.</p>
          <div class="table-wrap"><table class="explore-table"><thead><tr><th>City</th><th>Trend result</th><th>Change per decade</th><th title="Mann–Kendall test; p below 0.05 is treated as statistically significant.">p-value ⓘ</th><th>Years</th></tr></thead><tbody>${rows}</tbody></table></div>
        </article>`;
      }).join('');
      resultsHost.innerHTML = cards;
      resultsHost.querySelectorAll<SVGSVGElement>('svg[data-compare-chart]').forEach((svg) => {
        const chart = chartRegistry.get(svg.dataset.compareChart ?? '');
        const host = svg.closest<HTMLElement>('.explore-chart');
        const tooltip = host?.querySelector<HTMLElement>('.explore-chart-tooltip');
        if (!chart || !host || !tooltip) return;
        svg.addEventListener('pointermove', (event) => {
          const rect = svg.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const px = (event.clientX - rect.left) / rect.width * 760;
          const py = (event.clientY - rect.top) / rect.height * 300;
          let closest: TooltipPoint | undefined, distance = Infinity;
          for (const point of chart.points) {
            const next = (point.x - px) ** 2 + (point.y - py) ** 2;
            if (next < distance) { distance = next; closest = point; }
          }
          if (!closest || distance > 32 ** 2) { tooltip.hidden = true; return; }
          const date = new Date(closest.t).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
          tooltip.innerHTML = `<strong>${esc(closest.city)}</strong><span>${esc(date)} · 12-month average</span><b>${closest.v.toFixed(chart.digits)} ${esc(chart.unit)}</b>`;
          const hostRect = host.getBoundingClientRect();
          tooltip.style.left = `${Math.max(8, Math.min(event.clientX - hostRect.left + 12, hostRect.width - 190))}px`;
          tooltip.style.top = `${Math.max(4, event.clientY - hostRect.top - 58)}px`;
          tooltip.hidden = false;
        });
        svg.addEventListener('pointerleave', () => { tooltip.hidden = true; });
      });
      hint.textContent = `Showing ${selectedIndicators.length} indicator${selectedIndicators.length === 1 ? '' : 's'} across ${selectedCities.length} cities.`;
    });
  };
}
