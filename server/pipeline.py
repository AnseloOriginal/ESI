"""
Pipeline: asks every feeder for its data, runs each series through the
Measurer, and returns everything in one place.

    result = Pipeline([TemperatureFeeder()]).run()
    result.series    # all cleaned data, long format (date,value,indicator,unit,city,source)
    result.results   # one row per city+indicator: trend, p-value, status, ...
    result.errors    # anything that failed (one bad file never stops the run)
    result.save("output")
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from feeders.base import STANDARD_COLUMNS, Feeder
from measurer import Measurer
from settings import OUTPUT_DIR

log = logging.getLogger("pipeline")


@dataclass
class PipelineResult:
    series: pd.DataFrame
    results: pd.DataFrame
    errors: pd.DataFrame

    def save(self, out_dir: str | Path = OUTPUT_DIR) -> Path:
        out = Path(out_dir)
        out.mkdir(parents=True, exist_ok=True)
        self.series.to_csv(out / "series.csv", index=False, date_format="%Y-%m-%d")
        self.results.to_csv(out / "results.csv", index=False)
        self.results.to_json(out / "results.json", orient="records", indent=2)
        errors_path = out / "errors.csv"
        if self.errors.empty:
            errors_path.unlink(missing_ok=True)   # don't leave stale errors from an earlier run
        else:
            self.errors.to_csv(errors_path, index=False)
        return out


class Pipeline:
    def __init__(self, feeders: list[Feeder], measurer: Measurer | None = None):
        self.feeders = feeders
        self.measurer = measurer or Measurer()

    def run(self, cities: list[str] | None = None) -> PipelineResult:
        """cities=None means: every city each feeder has data for."""
        series_parts: list[pd.DataFrame] = []
        rows: list[dict] = []
        errors: list[dict] = []
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")

        for feeder in self.feeders:
            name = type(feeder).__name__
            try:
                targets = cities if cities else feeder.available_cities()
            except Exception as exc:  # noqa: BLE001
                errors.append({"feeder": name, "city": "", "error": f"{type(exc).__name__}: {exc}"})
                continue
            if not targets:
                log.warning("%s: no cities found", name)

            for city in targets:
                try:
                    df = feeder.load(city)
                    trend = self.measurer.measure(df, feeder.worse_direction, (feeder.up_label, feeder.down_label))
                except Exception as exc:  # noqa: BLE001  one bad file must not stop the run
                    log.warning("%s / %s failed: %s", name, city, exc)
                    errors.append({"feeder": name, "city": city, "error": f"{type(exc).__name__}: {exc}"})
                    continue

                series_parts.append(df)
                valid = df.dropna(subset=["value"])
                rows.append(
                    {
                        "city": city,
                        "indicator": feeder.indicator,
                        "label": feeder.label or feeder.indicator,
                        "unit": feeder.unit,
                        "worse_direction": feeder.worse_direction,
                        "source": feeder.source,
                        **trend.to_dict(),
                        "data_start": valid["date"].min().date().isoformat() if not valid.empty else None,
                        "data_end": valid["date"].max().date().isoformat() if not valid.empty else None,
                        "generated_at": stamp,
                    }
                )

        series = pd.concat(series_parts, ignore_index=True) if series_parts else pd.DataFrame(columns=STANDARD_COLUMNS)
        return PipelineResult(
            series=series,
            results=pd.DataFrame(rows),
            errors=pd.DataFrame(errors, columns=["feeder", "city", "error"]),
        )
