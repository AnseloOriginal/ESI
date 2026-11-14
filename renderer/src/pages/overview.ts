import { api, type Trend } from '../api/client';
import { createGlobe, type GlobeMarker } from '../components/globe';
import { SIGNIFICANT, STATUS_META, cityHash, esc, formatDate, signed, statusBadge, unitLabel } from '../shared/format';
import { PRESSURE_LEGEND, pressureOf } from '../shared/pressure';
import type { Mount } from '../router';

export async function overviewPage(): Promise<Mount> {
  const [health, cities, summary, indicators, results] = await Promise.all([
    api.health(), api.cities(), api.summary(), api.indicators(), api.results(),
  ]);

  const byCity = new Map<string, Trend[]>();
  for (const r of results) {
    const list = byCity.get(r.city);
    if (list) list.push(r); else byCity.set(r.city, [r]);
  }
  const rows = cities
    .map((city) => { const trends = byCity.get(city.name) ?? []; return { city, trends, pressure: pressureOf(trends) }; })
    .sort((a, b) => (b.pressure.ratio ?? -1) - (a.pressure.ratio ?? -1) || a.city.name.localeCompare(b.city.name));

  const worseningTotal = results.filter((r) => r.status === 'worsening').length;
  const citiesWorsening = rows.filter((r) => r.pressure.worsening > 0).length;
  const warming = results
    .filter((r) => r.status === 'worsening' && r.worse_direction === 'up' && unitLabel(r.unit) === '°C' && r.trend_per_decade != null)
    .sort((a, b) => (b.trend_per_decade ?? 0) - (a.trend_per_decade ?? 0))[0];
  const starts = results.map((r) => r.start_year).filter((y): y is number => y != null);
  const ends = results.map((r) => r.end_year).filter((y): y is number => y != null);
  const period = starts.length ? `${Math.min(...starts)} to ${Math.max(...ends)}` : 'n/a';

  const markers: GlobeMarker[] = rows
    .filter((r) => r.city.lat != null && r.city.lon != null)
    .map((r) => ({
      id: r.city.name, name: r.city.name, lat: r.city.lat as number, lon: r.city.lon as number, color: r.pressure.color,
      detail: r.pressure.tested ? `${r.pressure.worsening} of ${r.pressure.tested} indicators worsening` : 'Not enough data',
    }));

  const stat = (value: string, label: string, note = '') =>
    `<div class="card stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div>${note ? `<div class="stat-note">${note}</div>` : ''}</div>`;

  const indicatorRows = summary.map((s) => {
    const order = ['worsening', 'improving', 'wetter', 'drier', 'no_clear_trend', 'insufficient_data'] as const;
    const total = order.reduce((n, k) => n + (s.status_counts[k] ?? 0), 0) || 1;
    const segs = order.filter((k) => s.status_counts[k]).map((k) => `<span style="width:${(s.status_counts[k] / total) * 100}%;background:${STATUS_META[k].color}" title="${STATUS_META[k].label}: ${s.status_counts[k]}"></span>`).join('');
    const counts = order.filter((k) => s.status_counts[k]).map((k) => `<span><i style="background:${STATUS_META[k].color}"></i>${s.status_counts[k]} ${STATUS_META[k].label.toLowerCase()}</span>`).join('');
    return `<div class="ind-row"><div class="ind-head"><strong>${esc(s.label)}</strong><span class="muted">${s.n_cities} cities</span></div><div class="statusbar">${segs}</div><div class="ind-counts">${counts}</div></div>`;
  }).join('');

  const defaultIndicator = indicators.find((i) => i.indicator === 'air_temp_2m')?.indicator ?? indicators[0]?.indicator ?? '';

  const rankingHtml = (key: string): string => {
    const info = indicators.find((i) => i.indicator === key);
    const rs = results
      .filter((r) => r.indicator === key && r.trend_per_decade != null && r.status !== 'insufficient_data')
      .sort((a, b) => (b.trend_per_decade ?? 0) - (a.trend_per_decade ?? 0));
    if (!rs.length) return '<p class="muted">No results for this indicator yet.</p>';
    const max = Math.max(...rs.map((r) => Math.abs(r.trend_per_decade ?? 0)), 1e-6);
    const body = rs.map((r) => {
      const v = r.trend_per_decade ?? 0;
      const wd = (Math.abs(v) / max) * 50;
      const left = v >= 0 ? 50 : 50 - wd;
      const sig = SIGNIFICANT.includes(r.status);
      return `<a class="rank-row${sig ? '' : ' faded'}" href="${cityHash(r.city)}" title="p = ${r.p_value == null ? 'n/a' : r.p_value.toFixed(3)}"><span class="rank-name">${esc(r.city)}</span><span class="rank-track"><span class="rank-bar" style="left:${left}%;width:${wd}%;background:${STATUS_META[r.status].color}"></span></span><span class="rank-value">${signed(v)}</span></a>`;
    }).join('');
    return `<p class="muted rank-note">Change per decade, in ${esc(unitLabel(info?.unit ?? ''))}. Faded bars are not statistically significant.</p><div class="rank-list">${body}</div>`;
  };

  const panelHtml = (name: string | null): string => {
    const row = rows.find((r) => r.city.name === name);
    if (!row) return '<p class="muted">Select a city on the globe or in the list to see its trends.</p>';
    const items = [...row.trends].sort((a, b) => a.label.localeCompare(b.label)).map((t) =>
      `<li><span>${esc(t.label)}</span>${statusBadge(t.status)}<span class="num">${t.status === 'insufficient_data' ? '—' : `${signed(t.trend_per_decade)} ${esc(unitLabel(t.unit))}/dec`}</span></li>`).join('');
    return `<h2>${esc(row.city.name)}${row.city.country ? ` <span class="muted">${esc(row.city.country)}</span>` : ''}</h2><ul class="mini-table">${items}</ul><a class="link-button" href="${cityHash(row.city.name)}">Open city view</a>`;
  };

  return (root) => {
    root.innerHTML = `
      <div class="page-content">
        <header class="page-header">
          <h1>Is the Earth getting harder to live on?</h1>
          <p class="lede">We test NASA satellite and reanalysis records for statistically significant change in ${rows.length} major cities. Results show habitability pressure and are not predictions.</p>
          <p class="meta">Precomputed trend monitor, not a live alert system. Data last updated ${esc(formatDate(health.generated_at))}. Study period ${esc(period)}.</p>
        </header>

        <section class="stat-grid" aria-label="Headline numbers">
          ${stat(String(rows.length), 'Cities monitored')}
          ${stat(String(summary.length), 'Indicators tracked')}
          ${stat(String(worseningTotal), 'Significant worsening trends', `across ${results.length} tests`)}
          ${stat(`${citiesWorsening} of ${rows.length}`, 'Cities with a worsening indicator')}
          ${stat(warming ? `${signed(warming.trend_per_decade)} °C` : '—', 'Fastest significant warming per decade', warming ? `${esc(warming.city)}, ${esc(warming.label.toLowerCase())}` : '')}
        </section>

        <section class="card globe-card" aria-label="Globe of monitored cities">
          <div class="globe-wrap">
            <div class="globe-stage" id="globe-stage"></div>
            <div class="globe-legend" aria-hidden="true">
              <strong>Share of indicators worsening</strong>
              ${PRESSURE_LEGEND.map((l) => `<span><i style="background:${l.color}"></i>${l.label}</span>`).join('')}
              <em>Drag to rotate. Select a marker for details.</em>
            </div>
          </div>
          <div class="globe-side">
            <div class="city-panel" id="city-panel" aria-live="polite">${panelHtml(null)}</div>
            <ul class="city-list" aria-label="Cities">
              ${rows.map((r) => `<li><button class="city-btn" type="button" data-city="${esc(r.city.name)}" aria-pressed="false"><span class="dot" style="background:${r.pressure.color}"></span>${esc(r.city.name)}<small>${r.pressure.tested ? `${r.pressure.worsening}/${r.pressure.tested} worsening` : 'no data'}</small></button></li>`).join('')}
            </ul>
          </div>
        </section>

        <div class="two-col">
          <section class="card" aria-label="Indicator results">
            <h2>What the tests found</h2>
            <p class="muted">How cities split by status for each indicator.</p>
            ${indicatorRows}
          </section>
          <section class="card" aria-label="City ranking">
            <div class="rank-head">
              <h2>Rate of change by city</h2>
              <select class="select" id="rank-select" aria-label="Indicator">
                ${indicators.map((i) => `<option value="${esc(i.indicator)}"${i.indicator === defaultIndicator ? ' selected' : ''}>${esc(i.label)}</option>`).join('')}
              </select>
            </div>
            <div id="rank-body">${rankingHtml(defaultIndicator)}</div>
          </section>
        </div>

        <p class="footnote">Marker colour counts significant worsening trends only. Rainfall is excluded because wetter or drier is not automatically worse. A city with no clear trend may still be changing: the records are short and noisy. See The initiative for methods and limits.</p>
      </div>`;

    const globe = createGlobe(root.querySelector<HTMLElement>('#globe-stage') as HTMLElement, markers, (id) => select(id));
    const panel = root.querySelector<HTMLElement>('#city-panel') as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.city-btn');

    function select(name: string | null) {
      globe.select(name);
      panel.innerHTML = panelHtml(name);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === name)));
    }

    buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.city ?? null)));
    root.querySelector<HTMLSelectElement>('#rank-select')?.addEventListener('change', (e) => {
      const body = root.querySelector<HTMLElement>('#rank-body');
      if (body) body.innerHTML = rankingHtml((e.target as HTMLSelectElement).value);
    });

    return () => globe.destroy();
  };
}
