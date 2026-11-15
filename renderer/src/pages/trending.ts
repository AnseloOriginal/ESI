import { api, type Pressure, type Projection, type Threshold } from '../api/client';
import { cityHash } from '../shared/format';
import { esc, formatDate } from '../shared/format';

const pct = (v?: number | null) => v == null ? '—' : `${Math.round(v)}`;
const plainMethod = (value: string) => value.replace(/climate forecasts?/gi, 'climate projections').replace(/forecasts?/gi, 'projections').replace(/not a projection/gi, 'a straight-line estimate');
const years = (p?: Projection) => {
  if (!p || p.status !== 'approaching' || p.years_central == null) return 'More than 100 years away';
  const central = Math.round(p.years_central);
  const fast = p.years_fast == null ? null : Math.round(p.years_fast);
  const slow = p.years_slow == null ? null : Math.round(p.years_slow);
  const range = fast != null && slow != null ? ` (${fast}–${slow} years fast–slow range)` : ' (range unavailable)';
  return `about ${central} years${range}`;
};

export async function trendingPage() {
  const [pressure, projections, method, thresholds, health] = await Promise.all([
    api.pressure(), api.projections(), api.methodology(), api.thresholds(), api.health(),
  ]);
  const activeThreshold = thresholds.find((t: Threshold) => t.active);
  const markerPhrase = activeThreshold ? `${activeThreshold.value}°C marker` : 'active temperature marker';
  const relevant = projections.filter((p: Projection) => !activeThreshold || p.threshold_id === activeThreshold.id);
  const ranked = [...pressure].sort((a: Pressure, b: Pressure) => a.rank - b.rank);
  const closest = relevant.filter((p: Projection) => p.status === 'approaching' && p.years_central != null)
    .sort((a: Projection, b: Projection) => (a.years_central ?? Infinity) - (b.years_central ?? Infinity))[0];
  const projectionFor = (city: string) => relevant.find((p: Projection) => p.city === city);
  const citation = activeThreshold?.citation;
  const dateText = formatDate(health.generated_at);

  return (root: HTMLElement) => {
    root.innerHTML = `<div class="page-content trending-content">
      <header class="page-header trending-header">
        <p class="trending-kicker">CITY COMPARISON · 2002–2025</p>
        <h1>Comparing environmental trends across cities</h1>
        <p class="lede">Explore long-term trends and compare each city with a research-based temperature marker.</p>
      </header>

      <section class="trending-spotlight" aria-label="City with the shortest temperature marker estimate">
        <div class="spotlight-mark" aria-hidden="true">↗</div>
        <div class="spotlight-copy"><span class="eyebrow">SHORTEST ESTIMATE TO THE MARKER</span>
          <h2>${closest ? esc(closest.city) : 'No city with an approaching trend'}</h2>
          <p>${closest ? `Among cities with a significant warming trend toward the ${esc(markerPhrase)}, ${esc(closest.city)} has the shortest estimate: <strong>${years(closest)}</strong>, if the 2002–2025 trend continues. This straight-line estimate is not a forecast. The marker is a research comparison point, not a boundary for where people can live.` : 'No city currently shows a significant warming trend moving toward the active temperature marker.'}</p>
        </div>
      </section>

      <section class="card ranking-card">
        <div class="section-heading"><div><p class="eyebrow">CITY COMPARISON</p><h2>Environmental trends and marker estimates</h2></div><span class="ranking-caption">Higher scores reflect more trend evidence or a closer marker estimate</span></div>
        <div class="rank-legend"><span>City</span><span><abbr title="Share of measured indicators with a statistically significant worsening, wetter or drier trend, averaged across heat, water, and land.">Trend evidence ⓘ</abbr></span><span><abbr title="Score based on proximity to the active ${esc(markerPhrase)}. A score of zero means the estimate is distant, uncertain, or unavailable.">Marker proximity ⓘ</abbr></span><span><abbr title="A combined score based on trend evidence and marker proximity, from 0 to 100.">Combined score ⓘ</abbr></span></div>
        <ol class="pressure-ranking">${ranked.map((r: Pressure) => {
          const projection = projectionFor(r.city);
          const proximity = !projection || projection.status === 'insufficient_data' ? 'Estimate unavailable'
            : projection.status === 'distant' ? 'Estimate exceeds 100 years'
              : projection.status === 'uncertain' || projection.status === 'not_approaching' ? 'No significant trend toward marker'
                : years(projection);
          return `<li class="pressure-row">
            <div class="rank-city"><span class="rank-number">${r.rank.toString().padStart(2, '0')}</span><a href="${cityHash(r.city)}">${esc(r.city)}</a>${closest?.city === r.city ? '<span class="closest-tag">Closest</span>' : ''}</div>
            <div class="part-cell"><span class="part-mobile">Trend evidence</span><strong>${pct(r.trend_evidence)}<small>/100</small></strong><span class="part-track"><i style="width:${Math.max(0, Math.min(100, r.trend_evidence ?? 0))}%"></i></span></div>
            <div class="part-cell proximity-cell"><span class="part-mobile">Marker proximity</span><strong>${pct(r.threshold_proximity)}<small>/100</small></strong><small>${esc(proximity)}</small></div>
            <div class="score-cell"><span class="part-mobile score-mobile">Combined score</span><strong>${r.score == null ? '—' : r.score.toFixed(1)}</strong><span class="score-track"><i style="width:${Math.max(0, Math.min(100, r.score ?? 0))}%"></i></span></div>
          </li>`;
        }).join('')}</ol>
        <p class="ranking-note">${closest ? `${esc(closest.city)} is highlighted as closest by the shortest central estimate among cities with a significant trend toward the ${esc(markerPhrase)}.` : 'No city currently has a significant trend approaching the active temperature marker.'} “More than 100 years away” is grouped at the 100-year display horizon.</p>
      </section>

      <details class="card method-drawer"><summary>How the ranking and ${esc(markerPhrase)} work</summary>
        <div class="method-drawer-content">
          <div><h3>Ranking method</h3><p>${esc(plainMethod(method.summary))}</p><p class="method-equation">${esc(method.score_formula)}</p>
            ${method.parts.map((part) => `<p><strong>${esc(part.name)}</strong> ${esc(part.description)}</p>`).join('')}
            <details><summary>More on trends and estimates</summary><p>${esc(plainMethod(method.trend_test))}</p><p>${esc(plainMethod(method.projection))}</p><ul>${method.caveats.map((c) => `<li>${esc(plainMethod(c))}</li>`).join('')}</ul></details>
          </div>
          <div><h3>${activeThreshold ? `${esc(activeThreshold.value)}°C mean annual temperature marker` : 'Temperature marker'}</h3>
            <p>${esc(activeThreshold?.meaning ?? 'Threshold details are unavailable.')}</p>
            ${activeThreshold?.caveats?.[0] ? `<p class="threshold-caveat">${esc(activeThreshold.caveats[0])}</p>` : ''}
            ${citation ? `<div class="citation"><strong>Reference</strong><p>${esc(citation.authors)} (${citation.year}). “${esc(citation.title)}.” <em>${esc(citation.venue)}</em>.</p>${citation.url ? `<a href="${esc(citation.url)}" target="_blank" rel="noreferrer">Read publication ↗</a>` : ''}</div>` : ''}
          </div>
        </div>
      </details>
      <footer class="trending-footer">Data last updated <strong>${esc(dateText)}</strong> <span>·</span> 0–100 component scores <span>·</span> rainfall shifts are shown neutrally as wetter or drier.</footer>
    </div>`;
  };
}
