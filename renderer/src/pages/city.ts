import { api } from '../api/client';
import { lineChart } from '../components/charts';
import { SIGNIFICANT, STATUS_META, cityHash, esc, formatDate, formatPValue, formatPopulation, signed, statusBadge, unitLabel } from '../shared/format';
import type { Mount } from '../router';
import type { Trend } from '../api/client';

let lastCity: string | null = null;

function sentence(t: Trend): string {
  const unit = unitLabel(t.unit);
  const span = t.start_year != null && t.end_year != null ? `${t.start_year} to ${t.end_year}` : 'the available record';
  if (t.status === 'insufficient_data') return 'Not enough complete data to test a trend.';
  if (t.status === 'no_clear_trend') return `The data does not show a clear direction over ${span}.`;
  return `${STATUS_META[t.status].label}: ${signed(t.trend_per_decade)} ${unit} per decade over ${span}.`;
}

export async function cityPage(params: string[]): Promise<Mount> {
  const cities = await api.cities();
  if (!cities.length) throw new Error('The API returned no cities. Run the pipeline first with "py server/run.py".');
  const asked = params[0] ? decodeURIComponent(params[0]) : lastCity;
  const city = cities.find((c) => c.name.toLowerCase() === asked?.toLowerCase()) ?? cities[0];
  lastCity = city.name;
  const detail = await api.city(city.name);
  const trends = [...detail.results].sort((a, b) => a.label.localeCompare(b.label));
  const updated = trends.find((t) => t.generated_at)?.generated_at;
  const startYears = trends.map((t) => t.start_year).filter((year): year is number => year != null);
  const endYears = trends.map((t) => t.end_year).filter((year): year is number => year != null);
  const studyPeriod = startYears.length && endYears.length ? `${Math.min(...startYears)}–${Math.max(...endYears)}` : 'Unavailable';

  return (root) => {
    if (!params[0] || decodeURIComponent(params[0]) !== city.name) history.replaceState(null, '', cityHash(city.name));
    root.innerHTML = `
      <div class="page-content">
        <header class="page-header city-head">
          <div class="city-title-block">
            <h1>${esc(city.name)}</h1>
            ${city.country ? `<p class="city-place">${esc(city.country)}</p>` : ''}
          </div>
          <div class="field">
            <label for="city-select">City</label>
            <select class="select" id="city-select">${cities.map((c) => `<option${c.name === city.name ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
          </div>
        </header>
        <dl class="city-summary-grid" role="group" aria-label="City overview">
          <div class="city-summary-item population"><dt>Urban population</dt><dd>${city.population == null ? '—' : formatPopulation(city.population)}<small>UN estimate · ${city.population_year ?? 'year unavailable'}</small></dd></div>
          <div class="city-summary-item"><dt>Study period</dt><dd>${esc(studyPeriod)}<small>Years in the available record</small></dd></div>
          <div class="city-summary-item"><dt>Indicators</dt><dd>${trends.length}<small>Measured for this city</small></dd></div>
          <div class="city-summary-item"><dt>Last updated</dt><dd>${esc(formatDate(updated))}<small>Most recent data refresh</small></dd></div>
        </dl>
        <div class="chart-key" aria-hidden="true">
          <span><i class="key-line raw"></i>Monthly values</span>
          <span><i class="key-line avg"></i>12-month average</span>
          <span><i class="key-line dash"></i>Long-term trend</span>
        </div>
        <div class="indicator-grid">
          ${trends.map((t) => `
            <article class="card indicator-card">
              <header><h2>${esc(t.label)}</h2>${statusBadge(t.status)}</header>
              <p class="summary-line">${esc(sentence(t))}</p>
              <dl class="facts">
                <div><dt>Trend per decade</dt><dd>${t.status === 'insufficient_data' ? '—' : `${signed(t.trend_per_decade)} ${esc(unitLabel(t.unit))}`}</dd></div>
                <div><dt>p-value</dt><dd>${formatPValue(t.p_value)}</dd></div>
                <div><dt>Years used</dt><dd>${t.n_years ?? 0}</dd></div>
                <div><dt>Average</dt><dd>${t.mean_value == null ? '—' : `${t.mean_value.toFixed(1)} ${esc(unitLabel(t.unit))}`}</dd></div>
              </dl>
              <div class="chart" data-chart="${esc(t.indicator)}"><p class="muted">Preparing chart…</p></div>
              ${t.note ? `<p class="card-foot">${esc(t.note)}</p>` : ''}
              <p class="card-foot">Source: ${esc(t.source)}</p>
            </article>`).join('')}
        </div>
      </div>`;

    root.querySelector<HTMLSelectElement>('#city-select')?.addEventListener('change', (e) => {
      location.hash = cityHash((e.target as HTMLSelectElement).value);
    });

    let alive = true;
    trends.forEach(async (t) => {
      const host = root.querySelector<HTMLElement>(`[data-chart="${CSS.escape(t.indicator)}"]`);
      if (!host) return;
      try {
        const s = await api.series(city.name, t.indicator);
        if (!alive) return;
        const canTrend = t.status !== 'insufficient_data' && t.trend_per_decade != null && t.start_year != null && t.end_year != null;
        host.innerHTML = lineChart({
          label: t.label, unit: unitLabel(t.unit), points: s.points,
          trend: canTrend ? { startYear: t.start_year as number, endYear: t.end_year as number, perDecade: t.trend_per_decade as number, significant: SIGNIFICANT.includes(t.status), color: STATUS_META[t.status].color } : undefined,
        });
      } catch {
        if (alive) host.innerHTML = '<p class="muted">The time series could not be loaded.</p>';
      }
    });
    return () => { alive = false; };
  };
}
