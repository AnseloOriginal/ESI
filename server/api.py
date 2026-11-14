"""
ESI API: serves the pipeline's results to the web front end.

Run (from anywhere):   py server/api.py
Interactive docs:      http://127.0.0.1:8000/docs
Types for TS client:   http://127.0.0.1:8000/openapi.json

The API does no analysis itself. It loads output/results.csv and output/series.csv
(building them with the Pipeline on first start, or when you POST /api/refresh)
and serves them as JSON.
"""
from __future__ import annotations

import json
import logging
import os
import threading
from contextlib import asynccontextmanager
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cities import CITIES
from feeders import ALL_FEEDERS
from pipeline import Pipeline
from settings import BASE_DIR, OUTPUT_DIR

log = logging.getLogger("api")

Status = Literal["worsening", "improving", "no_clear_trend", "insufficient_data"]
STATUSES = ["worsening", "improving", "no_clear_trend", "insufficient_data"]


# ----------------------------------------------------------------------------- models
class Trend(BaseModel):
    city: str
    indicator: str
    label: str
    unit: str
    worse_direction: Literal["up", "down"]
    source: str
    status: Status
    direction: Literal["increasing", "decreasing", "none"]
    trend_per_decade: float | None = None
    p_value: float | None = None
    kendall_tau: float | None = None
    mean_value: float | None = None
    n_years: int = 0
    start_year: int | None = None
    end_year: int | None = None
    completeness: float | None = None
    note: str | None = None
    data_start: str | None = None
    data_end: str | None = None
    generated_at: str | None = None


class CitySummary(BaseModel):
    name: str
    country: str | None = None
    lat: float | None = None
    lon: float | None = None
    bbox: list[float] | None = None          # [west, south, east, north] used for the data download
    n_indicators: int
    status_counts: dict[str, int]


class CityDetail(BaseModel):
    city: CitySummary
    results: list[Trend]


class IndicatorInfo(BaseModel):
    indicator: str
    label: str
    unit: str
    worse_direction: Literal["up", "down"]
    source: str
    n_cities: int


class IndicatorSummary(BaseModel):
    indicator: str
    label: str
    n_cities: int
    status_counts: dict[str, int]


class Point(BaseModel):
    date: str
    value: float | None = None


class SeriesOut(BaseModel):
    city: str
    indicator: str
    label: str
    unit: str
    source: str
    points: list[Point]


class PipelineError(BaseModel):
    feeder: str
    city: str | None = None
    error: str


class Health(BaseModel):
    status: str
    n_results: int
    n_cities: int
    n_errors: int
    generated_at: str | None = None
    unknown_cities: list[str]                # in the data but missing from cities.py (usually a file-name typo)


# ----------------------------------------------------------------------------- data store
def _norm(text: str) -> str:
    return text.strip().lower().replace("-", " ").replace("_", " ")


def _records(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> list of dicts with NaN turned into null."""
    return json.loads(df.to_json(orient="records"))


class Store:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.series = pd.DataFrame()
        self.results = pd.DataFrame()
        self.errors = pd.DataFrame(columns=["feeder", "city", "error"])

    def load(self, rebuild: bool = False) -> None:
        with self._lock:
            have_files = (OUTPUT_DIR / "results.csv").exists() and (OUTPUT_DIR / "series.csv").exists()
            if rebuild or not have_files:
                log.info("Running pipeline ...")
                res = Pipeline([cls() for cls in ALL_FEEDERS]).run()
                res.save(OUTPUT_DIR)
                series, results, errors = res.series, res.results, res.errors
            else:
                log.info("Loading saved results from %s", OUTPUT_DIR)
                series = pd.read_csv(OUTPUT_DIR / "series.csv")
                results = pd.read_csv(OUTPUT_DIR / "results.csv")
                err_path = OUTPUT_DIR / "errors.csv"
                errors = pd.read_csv(err_path) if err_path.exists() else pd.DataFrame(columns=["feeder", "city", "error"])

            if not series.empty:
                series = series.copy()
                series["date"] = pd.to_datetime(series["date"]).dt.strftime("%Y-%m-%d")
            self.series, self.results, self.errors = series, results, errors

    # -- helpers used by the endpoints
    def city_rows(self, city: str) -> pd.DataFrame:
        if self.results.empty:
            return self.results
        return self.results[self.results["city"].map(_norm) == _norm(city)]

    def summary_for(self, name: str, rows: pd.DataFrame) -> CitySummary:
        info = CITIES.get(name, {})
        counts = {s: int((rows["status"] == s).sum()) for s in STATUSES}
        return CitySummary(
            name=name,
            country=info.get("country"),
            lat=info.get("lat"),
            lon=info.get("lon"),
            bbox=info.get("bbox"),
            n_indicators=int(len(rows)),
            status_counts=counts,
        )


store = Store()


def _health() -> Health:
    res = store.results
    return Health(
        status="ok" if not res.empty else "no_data",
        n_results=int(len(res)),
        n_cities=int(res["city"].nunique()) if not res.empty else 0,
        n_errors=int(len(store.errors)),
        generated_at=str(res["generated_at"].iloc[0]) if not res.empty and "generated_at" in res else None,
        unknown_cities=sorted(set(res["city"]) - set(CITIES)) if not res.empty else [],
    )


# ----------------------------------------------------------------------------- app
@asynccontextmanager
async def lifespan(_: FastAPI):
    store.load()
    yield


app = FastAPI(
    title="Earth Sustainability Initiative API",
    version="0.1.0",
    description="Trend results and time series for the ESI dashboard.",
    lifespan=lifespan,
)

_origins = os.getenv(
    "ESI_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
).split(",")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in _origins], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health", response_model=Health)
def health():
    return _health()


@app.get("/api/cities", response_model=list[CitySummary])
def list_cities():
    """Every city that has at least one result, with map coordinates and a status tally."""
    if store.results.empty:
        return []
    return [store.summary_for(name, rows) for name, rows in store.results.groupby("city", sort=True)]


@app.get("/api/cities/{city}", response_model=CityDetail)
def city_detail(city: str):
    rows = store.city_rows(city)
    if rows.empty:
        raise HTTPException(404, f"No data for city '{city}'")
    name = rows["city"].iloc[0]
    return CityDetail(city=store.summary_for(name, rows), results=_records(rows))


@app.get("/api/indicators", response_model=list[IndicatorInfo])
def list_indicators():
    if store.results.empty:
        return []
    out = []
    for ind, rows in store.results.groupby("indicator", sort=True):
        first = rows.iloc[0]
        out.append(
            IndicatorInfo(
                indicator=ind,
                label=first["label"],
                unit=first["unit"],
                worse_direction=first["worse_direction"],
                source=first["source"],
                n_cities=int(rows["city"].nunique()),
            )
        )
    return out


@app.get("/api/summary", response_model=list[IndicatorSummary])
def summary():
    """Status counts per indicator, e.g. for headline numbers on the dashboard."""
    if store.results.empty:
        return []
    return [
        IndicatorSummary(
            indicator=ind,
            label=rows["label"].iloc[0],
            n_cities=int(rows["city"].nunique()),
            status_counts={s: int((rows["status"] == s).sum()) for s in STATUSES},
        )
        for ind, rows in store.results.groupby("indicator", sort=True)
    ]


@app.get("/api/results", response_model=list[Trend])
def list_results(
    city: str | None = Query(None, description="City name (case-insensitive)"),
    indicator: str | None = Query(None, description="e.g. air_temp_2m"),
    status: Status | None = None,
):
    df = store.results
    if df.empty:
        return []
    if city:
        df = df[df["city"].map(_norm) == _norm(city)]
    if indicator:
        df = df[df["indicator"] == indicator]
    if status:
        df = df[df["status"] == status]
    return _records(df)


@app.get("/api/series", response_model=SeriesOut)
def get_series(city: str, indicator: str):
    """Monthly time series for one city + indicator (for charts)."""
    s = store.series
    if s.empty:
        raise HTTPException(404, "No data loaded")
    rows = s[(s["city"].map(_norm) == _norm(city)) & (s["indicator"] == indicator)]
    if rows.empty:
        raise HTTPException(404, f"No series for city '{city}' and indicator '{indicator}'")
    first = rows.iloc[0]
    return SeriesOut(
        city=first["city"],
        indicator=indicator,
        label=_label_for(indicator),
        unit=first["unit"],
        source=first["source"],
        points=_records(rows[["date", "value"]]),
    )


def _label_for(indicator: str) -> str:
    match = store.results[store.results["indicator"] == indicator]
    return str(match["label"].iloc[0]) if not match.empty else indicator


@app.get("/api/errors", response_model=list[PipelineError])
def list_errors():
    """Anything the last pipeline run could not load (missing or malformed files)."""
    return _records(store.errors)


@app.post("/api/refresh", response_model=Health)
def refresh():
    """Re-read the raw CSVs, re-run the measurer and reload. Use after adding downloads."""
    store.load(rebuild=True)
    return _health()


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    uvicorn.run(
        "api:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=str(BASE_DIR),
        reload_dirs=[str(BASE_DIR)],
    )
