import { api, type Trend } from '../api/client';
import { createGlobe, type GlobeMarker } from '../components/globe';
import { cityHash, esc, formatDate, formatPopulation, signed, statusBadge, unitLabel } from '../shared/format';
import { PRESSURE_LEGEND, pressureOf } from '../shared/pressure';
import { icon } from '../shared/icon';
import type { Mount } from '../router';

export async function overviewPage(): Promise<Mount> {
  const [health, cities, results] = await Promise.all([api.health(), api.cities(), api.results()]);

  const byCity = new Map<string, Trend[]>();
  for (const trend of results) {
    const list = byCity.get(trend.city);
    if (list) list.push(trend); else byCity.set(trend.city, [trend]);
  }

  const rows = cities.map((city) => {
    const trends = byCity.get(city.name) ?? [];
    return { city, trends, pressure: pressureOf(trends) };
  });

  const starts = results.map((r) => r.start_year).filter((y): y is number => y != null);
  const ends = results.map((r) => r.end_year).filter((y): y is number => y != null);
  const period = starts.length ? `${Math.min(...starts)}–${Math.max(...ends)}` : 'not available';

  const markers: GlobeMarker[] = rows
    .filter(({ city }) => city.lat != null && city.lon != null)
    .map(({ city, pressure }) => ({
      id: city.name,
      name: city.name,
      lat: city.lat as number,
      lon: city.lon as number,
      color: pressure.color,
      detail: `${city.population != null ? `${formatPopulation(city.population)} residents · ${city.population_year ?? 'Year unavailable'} UN urban estimate` : 'Population estimate unavailable'}${pressure.tested ? ` · ${pressure.worsening}/${pressure.tested} indicators worsening` : ''}`,
    }));

  const panelContent = (name: string): string => {
    const row = rows.find(({ city }) => city.name === name);
    if (!row) return '';

    const trendRows = [...row.trends]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((trend) => `<li class="city-trend-row">
        <span class="city-trend-name">${esc(trend.label)}</span>
        ${statusBadge(trend.status)}
        <span class="city-trend-value">${trend.status === 'insufficient_data' ? '—' : `${signed(trend.trend_per_decade)} ${esc(unitLabel(trend.unit))}/dec`}</span>
      </li>`).join('');

    return `<div class="city-detail-heading">
        <div><h2>${esc(row.city.name)}</h2>${row.city.country ? `<p>${esc(row.city.country)}</p>` : ''}</div>
        <button class="city-detail-close" type="button" aria-label="Close city details">${icon('close')}</button>
      </div>
      <p class="city-detail-summary">${row.pressure.tested ? `${row.pressure.worsening} of ${row.pressure.tested} measured indicators show a worsening trend.` : 'There is not enough data to assess this city.'}</p>
      <ul class="city-trend-list">${trendRows}</ul>
      <a class="link-button" href="${cityHash(row.city.name)}">Open city view <span aria-hidden="true">→</span></a>`;
  };

  return (root) => {
    root.innerHTML = `
      <div class="page-content overview-content">
        <header class="page-header overview-heading">
          <div>
            <h1>Earth Sustainability Initiative</h1>
            <p class="lede">A city-by-city view of long-term environmental change.</p>
          </div>
          <p class="overview-period">${esc(period)} <span>·</span> updated ${esc(formatDate(health.generated_at))}</p>
        </header>

        <section class="globe-card card" aria-label="Global environmental trends">
          <div class="globe-wrap">
            <div class="globe-stage" id="globe-stage"></div>
            <div class="globe-legend" aria-label="Share of measured indicators with worsening trends">
              <strong>Worsening trends</strong>
              ${PRESSURE_LEGEND.map((item) => `<span><i style="background:${item.color}"></i>${item.label}</span>`).join('')}
              <em>Select a city marker to explore its data.</em>
            </div>
          </div>
          <aside class="city-detail" id="city-panel" aria-live="polite" aria-label="City details" hidden></aside>
        </section>

        <div class="overview-footnote"><p class="overview-note">Marker color shows the share of measured indicators with a significant worsening trend. Rainfall is shown neutrally; wetter or drier is not always better or worse.</p>
          <a href="#/trending" title="Compare cities using the habitability pressure screening index">Explore habitability pressure rankings →</a>
        </div>
      </div>`;

    const panel = root.querySelector<HTMLElement>('#city-panel') as HTMLElement;
    const globe = createGlobe(root.querySelector<HTMLElement>('#globe-stage') as HTMLElement, markers, showCity);

    function closePanel() {
      panel.hidden = true;
      panel.innerHTML = '';
      globe.select(null);
    }

    function showCity(name: string) {
      panel.innerHTML = panelContent(name);
      panel.hidden = false;
      globe.select(name);
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!panel.hidden && event.target instanceof Node && !panel.contains(event.target)) closePanel();
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !panel.hidden) closePanel();
    };
    const handlePanelClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.city-detail-close')) closePanel();
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleKeydown);
    panel.addEventListener('click', handlePanelClick);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleKeydown);
      panel.removeEventListener('click', handlePanelClick);
      globe.destroy();
    };
  };
}
