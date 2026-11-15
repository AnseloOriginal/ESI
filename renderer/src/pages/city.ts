import { api, type Pressure, type Projection } from '../api/client';
import { blurb } from '../shared/indicators';
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
  const [detail, pressureRows, projectionRows, thresholds] = await Promise.all([
    api.city(city.name), api.pressure(), api.projections(), api.thresholds(),
  ]);
  const pressure = pressureRows.find((p: Pressure) => p.city === city.name);
  const projection = projectionRows.find((p: Projection) => p.city === city.name && p.status !== 'insufficient_data');
  const threshold = thresholds.find((t) => t.active && t.id === projection?.threshold_id)
    ?? thresholds.find((t) => t.active);
  const markerName = threshold ? `${threshold.value}°C marker` : 'active temperature marker';
  const estimate = projection?.status === 'approaching' && projection.years_central != null
    ? `about ${Math.round(projection.years_central)} years${projection.years_fast != null && projection.years_slow != null ? ` (${Math.round(projection.years_fast)}–${Math.round(projection.years_slow)} years fast–slow range)` : ''}`
    : projection?.status === 'distant' ? 'More than 100 years away' : 'No approaching trend identified';
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
        <section class="city-pressure-strip" aria-label="City habitability pressure comparison">
          <div class="city-pressure-heading"><div><p class="eyebrow">SCREENING INDEX</p><h2>Habitability pressure</h2></div>
            <strong class="city-pressure-score" title="Relative screening index from 0 to 100">${pressure?.score == null ? '—' : pressure.score.toFixed(1)}<small>/100</small></strong>
          </div>
          <p>Rank ${pressure?.rank ?? '—'} of ${pressureRows.length} cities by overall score. This compares cities relative to one another.</p>
          <details class="city-pressure-detail"><summary>See score parts and temperature estimate</summary>
            <div class="city-pressure-parts">
              <span title="Share of measured indicators with a significant worsening, wetter or drier trend.">Trend evidence <strong>${pressure?.trend_evidence == null ? '—' : pressure.trend_evidence.toFixed(0)}/100</strong></span>
              <span title="Score based on proximity to the active temperature marker.">Threshold proximity <strong>${pressure?.threshold_proximity == null ? '—' : pressure.threshold_proximity.toFixed(0)}/100</strong></span>
            </div>
            <p>${projection?.status === 'approaching' ? `If the 2002–2025 trend continues, the ${markerName} estimate is ${estimate}.` : `Temperature marker: ${estimate}.`}</p>
            <p class="city-pressure-note">The ${markerName} describes a rarely-lived-in condition, not a survival limit. Rainfall shifts are counted neutrally as wetter or drier.</p>
          </details>
          <a href="#/trending">Compare all cities →</a>
        </section>
        <div class="chart-key" aria-hidden="true">
          <span><i class="key-line raw"></i>Monthly values</span>
          <span><i class="key-line avg"></i>12-month average</span>
          <span><i class="key-line dash"></i>Long-term trend</span>
        </div>
        <div class="indicator-grid">
          ${trends.map((t) => `
            <article class="card indicator-card">
              <header><h2>${esc(t.label)}</h2>${statusBadge(t.status)}</header><p class="muted">${esc(blurb(t.indicator))}</p>
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
