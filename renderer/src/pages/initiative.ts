import { api } from '../api/client';
import { STATUS_META, esc, formatDate, unitLabel } from '../shared/format';
import type { Mount } from '../router';

const limitations = [
  'Cities are area-averaged on 1-degree grid boxes, so values snap to the grid and coastal boxes include ocean.',
  'MERRA-2 is a reanalysis, not direct observation. AIRS surface temperature is a single grid cell per city.',
  'IMERG rainfall is less reliable near coasts and is affected by changes in the satellite constellation.',
  'Records are about 24 years long. Rainfall varies a lot year to year, so many cities show no clear trend.',
  'Urban heat island effects are not separated from regional warming.',
  'Some results are surprising, such as the cooling in New Delhi from MERRA-2 daytime air temperature. Independent AIRS data shows night-time warming there, so we do not read it as a net improvement. A station check is still pending.',
  'Correlation between indicators does not show cause.',
];

const software = [
  'FastAPI, Uvicorn, pandas, NumPy and pymannkendall (server and statistics)',
  'Vite and TypeScript (web app)',
  'd3-geo and topojson-client (globe projection)',
  'world-atlas, derived from Natural Earth (country outlines)',
];

export async function initiativePage(): Promise<Mount> {
  const [health, indicators] = await Promise.all([api.health(), api.indicators()]);

  return (root) => {
    root.innerHTML = `
      <div class="page-content stack">
        <header class="page-header">
          <h1>The initiative</h1>
          <p class="lede">The Earth Sustainability Initiative explores one question: could long-term environmental change make some places harder to live in? Built for the NASA Space Apps Challenge 2026, Earth System Trend Detective.</p>
        </header>

        <section class="card prose">
          <h2>How we test for change</h2>
          <ol class="steps">
            <li><span><strong>Collect.</strong> Monthly NASA records from Giovanni for each city, 2002 onward.</span></li>
            <li><span><strong>Remove the seasons.</strong> Each month is compared with its own long-term average, then averaged into one value per year. Yearly values avoid the false confidence that month-to-month correlation creates.</span></li>
            <li><span><strong>Test the trend.</strong> A Mann-Kendall test checks whether the yearly values rise or fall (significance level 0.05). The Sen slope gives the size of the change per decade. At least 15 years of data are required.</span></li>
            <li><span><strong>Label it.</strong> Each result gets one of the statuses below.</span></li>
          </ol>
          <dl class="glossary">
            ${(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => `<div><dt><span class="dot" style="background:${STATUS_META[k].color}"></span>${STATUS_META[k].label}</dt><dd>${esc(STATUS_META[k].hint)}</dd></div>`).join('')}
          </dl>
          <p class="muted">Results describe habitability pressure. They are not certain predictions. Data is precomputed and last updated ${esc(formatDate(health.generated_at))}.</p>
        </section>

        <section class="card">
          <h2>Data sources</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Indicator</th><th>Unit</th><th>Source</th><th>Cities</th></tr></thead>
              <tbody>${indicators.map((i) => `<tr><td>${esc(i.label)}</td><td>${esc(unitLabel(i.unit))}</td><td>${esc(i.source)}</td><td>${i.n_cities}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </section>

        <div class="two-col">
          <section class="card">
            <h2>Limitations</h2>
            <ul class="bullets">${limitations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          </section>
          <section class="card">
            <h2>Open-source software and data</h2>
            <ul class="bullets">${software.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          </section>
        </div>
      </div>`;
  };
}
