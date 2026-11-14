"""
Feeder contract.

A feeder knows how to get ONE indicator (temperature, rainfall, ...) for any
city and hand it over in the standard shape:

    date | value | indicator | unit | city | source

To add an indicator, subclass Feeder (or a ready-made subclass such as
GiovanniFeeder), set the class attributes, and register it in
feeders/__init__.py. Nothing else in the project changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

import pandas as pd

STANDARD_COLUMNS = ["date", "value", "indicator", "unit", "city", "source"]


class Feeder(ABC):
    # ---- set these in each subclass -------------------------------------
    indicator: str = ""            # machine name, e.g. "air_temp_2m"
    label: str = ""                # human name for the dashboard, e.g. "Air temperature"
    unit: str = ""                 # unit AFTER postprocess(), e.g. "degC"
    source: str = ""               # dataset/tool, used on the citations page
    worse_direction: str = "up"    # "up" = an increase is a threat, "down" = a decrease is

    def __init__(self, raw_dir: str | Path = "data/raw"):
        self.raw_dir = Path(raw_dir)
        for attr in ("indicator", "unit", "source"):
            if not getattr(self, attr):
                raise NotImplementedError(f"{type(self).__name__} must set `{attr}`")
        if self.worse_direction not in ("up", "down"):
            raise ValueError("worse_direction must be 'up' or 'down'")

    # ---- subclasses implement these -------------------------------------
    @abstractmethod
    def available_cities(self) -> list[str]:
        """Cities this feeder currently has data for."""

    @abstractmethod
    def fetch(self, city: str) -> pd.DataFrame:
        """Return a DataFrame with at least `date` and `value` columns (raw units)."""

    # ---- optional hook ---------------------------------------------------
    def postprocess(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convert units here, e.g. df['value'] *= 24 * 30 to go from mm/hr to mm/month."""
        return df

    # ---- shared logic: do not override ----------------------------------
    def load(self, city: str) -> pd.DataFrame:
        raw = self.fetch(city)
        missing = {"date", "value"} - set(raw.columns)
        if missing:
            raise ValueError(f"{type(self).__name__}.fetch() is missing columns: {sorted(missing)}")

        df = raw[["date", "value"]].copy()
        df["date"] = pd.to_datetime(df["date"]).dt.to_period("M").dt.to_timestamp()  # month start
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = self.postprocess(df)
        df = df.sort_values("date").drop_duplicates("date", keep="last").reset_index(drop=True)

        df["indicator"] = self.indicator
        df["unit"] = self.unit
        df["city"] = city
        df["source"] = self.source
        return df[STANDARD_COLUMNS]
