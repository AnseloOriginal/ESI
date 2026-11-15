# Earth Sustainability Initiative (ESI)

**NASA Space Apps Challenge 2026 · Challenge: Earth System Trend Detective**

ESI asks one question: *will long-term environmental trends put growing pressure on how habitable the world's largest cities are?*

We take open NASA satellite and reanalysis data for 11 major cities, remove the seasonal cycle, test each trend statistically, and combine the results into a transparent **habitability pressure** index. This is a screening tool for comparing cities, **not a forecast** and not a real-time alert system. All data is precomputed; the app shows when it was last updated.

## What it does

- **Detects trends** in air temperature, day and night surface temperature, precipitation and vegetation (2002-2025) using the Mann-Kendall test and Sen's slope on annual anomalies.
- **Labels each result honestly:** worsening, improving, wetter, drier, no clear trend, or insufficient data. Rainfall is highly variable, so "no clear trend" is common and is reported as such.
- **Projects years-to-threshold** if the straight-line trend continued, with a 95% slope interval, against thresholds taken from cited research.
- **Scores each city** from 0 to 100 (low / moderate / high / very high pressure) with the method visible in the app and at `/api/methodology`.

Cities: Jakarta, Dhaka, Tokyo, New Delhi, Shanghai, Guangzhou, Cairo, Manila, Kolkata, Seoul (top 10 by the UN World Urbanization Prospects 2025, Degree of Urbanization definition) plus Lagos.

## Quick start (Windows)

Requires Python 3.13 and Node.js 20+.

**1. Server**

```powershell
cd D:\Dev\ESI
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
py server/api.py
```

The API runs at http://127.0.0.1:8000 (interactive docs at `/docs`). It serves the precomputed files in `server/output/`, so it works offline.

**2. Front end** (new terminal)

```powershell
cd D:\Dev\ESI\renderer
npm install
npm run dev
```

Open http://127.0.0.1:5173.

## Hosting a public demo (no server needed)

The data is precomputed, so the app can be hosted as plain static files. One command does everything (refreshes `CITATIONS.md`, exports the data to static JSON, builds the site):

```powershell
py build_site.py          # add --zip to also create esi-site.zip
```

Upload the contents of `renderer/dist` to any static host (Netlify Drop, GitHub Pages, Cloudflare Pages, Vercel). Re-run it whenever `server/output/` changes. Routing is hash-based, so no rewrite rules are needed.

### Demo fallback (no live server needed)

If anything fails on stage:

```powershell
cd D:\Dev\ESI\renderer
npm run build
npm run preview
```

Pair it with `py server/api.py`. Everything is local and the data is cached, so no network is needed.

## Re-running the analysis

The cached results are already in `server/output/`. To rebuild them from the raw downloads in `server/data/raw/`:

```powershell
py server/run.py                      # all cities
py server/run.py --cities Lagos Cairo # a subset
```

This writes `series.csv`, `results.csv/json`, `projections.csv/json`, `pressure.csv/json` and `errors.csv`. One bad file never stops the run; problems are listed in `errors.csv` and at `/api/errors`. `/api/health` also flags city names not in `cities.py` (catches typos).

Optional, to regenerate typed API bindings:

```powershell
py server/export_openapi.py
npx openapi-typescript ./server/openapi.json -o ./renderer/src/api/schema.d.ts
```

## Project layout

```
ESI/
├── requirements.txt
├── build_site.py            one-command static build for hosting
├── venv/
├── CITATIONS.md
├── server/
│   ├── api.py               FastAPI app (serves precomputed results)
│   ├── run.py               pipeline entry point
│   ├── pipeline.py          runs every feeder, collects results and errors
│   ├── measurer.py          deseasonalise, annual anomalies, Mann-Kendall, Sen slope
│   ├── habitability.py      years-to-threshold projections and pressure score
│   ├── thresholds.py        thresholds with citations
│   ├── sources.py           datasets, methods, software citations (app + CITATIONS.md)
│   ├── export_citations.py  writes CITATIONS.md
│   ├── export_static.py     dumps API responses to static JSON for hosting
│   ├── cities.py            city boxes, population, population source
│   ├── settings.py          paths anchored to the server folder
│   ├── feeders/             one class per indicator (Giovanni CSV readers)
│   ├── data/raw/            downloaded Giovanni CSVs
│   └── output/              precomputed results used by the API
└── renderer/                vanilla TypeScript + Vite front end
    └── src/{pages,components,shared,styles,api}
```

Pages: Overview (`#/overview`), City Pressure (`#/trending`), Explore Trends (`#/explore`), City view (`#/city/<name>`), The initiative (`#/initiative`).

## Data sources

Data are downloaded from NASA Giovanni as monthly, area-averaged time series over a bounding box per city (2002-2025 requested).

| Indicator | Dataset | Notes |
|---|---|---|
| Air temperature (2 m) | MERRA-2 `M2TMNXSLV` v5.12.4 | Reanalysis, °C |
| Precipitation | GPM IMERG Final Run, monthly, v07 | Converted from mm/hr to mm/day; record ends 2025-09 |
| Surface temperature, day and night | AIRS3STM v7.0 (AIRS-only) `SurfSkinTemp_A/_D` | One 1° cell per city, K converted to °C, from 2002-09 |
| Vegetation | NDVI (see `feeders/vegetation.py` for the exact product) | |

Full references, DOIs and the research behind each threshold are on the in-app **The initiative** page and in [CITATIONS.md](CITATIONS.md). Both are generated from one list in `server/sources.py` (plus `server/thresholds.py` for the threshold research), served at `/api/sources` and `/api/thresholds`. After editing either file, run `py server/export_citations.py` to refresh `CITATIONS.md`. Open-source software used: pandas, NumPy, SciPy, pymannkendall, FastAPI, Uvicorn, Pydantic, Vite, TypeScript, d3-geo, topojson-client, world-atlas.

## Method in brief

1. Remove the seasonal cycle with calendar-month anomalies.
2. Average to annual anomalies. Annual, not monthly, on purpose: monthly autocorrelation inflates significance.
3. Require at least 15 years, 9 or more months per year (10 recommended) and 70% completeness; otherwise the result is "insufficient data".
4. Mann-Kendall test at alpha = 0.05, plus Sen's slope. Trend per decade = slope × 10.
5. Project years to each threshold from the fitted line, with a 95% slope interval.
6. Pressure score = 50% trend evidence + 50% threshold proximity (weights rescale if a part is missing).

## Limitations

- Boxes snap to a 1° grid; coastal boxes include ocean.
- IMERG is less skilful along coasts and is affected by changes in the satellite constellation.
- MERRA-2 is a reanalysis, not a direct observation.
- AIRS surface temperature uses a single cell per city.
- 23-24 years is a short record; rainfall variability hides many real changes.
- The urban heat island is not separated from regional climate.
- Some results are surprising and untested. New Delhi's MERRA-2 air temperature shows slight cooling, while AIRS shows no significant daytime trend but significant night-time warming. We do not claim a cause; a NOAA CDO station check would settle it.
- Trends are not extrapolations of certainty. Correlation is not causation.

## Honest framing

ESI reports **habitability pressure**, a relative screening measure built from observed trends and published thresholds. It is not a prediction that any city will become uninhabitable.

## AI-tool disclosure

AI assistants were used during development for code assistance and drafting. This text lives in `server/sources.py` (`AI_DISCLOSURE`) and also appears on the app's initiative page. [Confirm against the official Space Apps 2026 rules and edit if they require different wording.]

## Team

[Team name and members]

## License

[Add license. Data remain subject to NASA and source-dataset terms.]
