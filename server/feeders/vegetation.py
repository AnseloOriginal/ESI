"""Vegetation greenness (NDVI) from NASA AppEEARS, MODIS Terra MOD13A3 v061, 1 km monthly."""
from __future__ import annotations

import pandas as pd

from .base import Feeder


class VegetationFeeder(Feeder):
    """
    Reads  <city>_ndvi.csv  (columns: date, ndvi, count) written by split_ndvi.py.
    `ndvi` is the mean NDVI over the city box for that month; `count` is the pixel count.
    A decrease in greenness is treated as the threat.
    """

    indicator = "ndvi"
    label = "Vegetation greenness (NDVI)"
    unit = "NDVI"
    source = "AppEEARS: MODIS Terra MOD13A3 v061, 1 km monthly NDVI (area mean per city box)"
    worse_direction = "down"
    file_key = "ndvi"

    def _path(self, city: str):
        return self.raw_dir / f"{city.strip().lower().replace(' ', '_')}_{self.file_key}.csv"

    def available_cities(self) -> list[str]:
        suffix = f"_{self.file_key}"
        return sorted(
            p.stem[: -len(suffix)].replace("_", " ").title()
            for p in self.raw_dir.glob(f"*{suffix}.csv")
        )

    def fetch(self, city: str) -> pd.DataFrame:
        path = self._path(city)
        if not path.exists():
            raise FileNotFoundError(f"{path} not found")
        df = pd.read_csv(path)
        if not {"date", "ndvi"} <= set(df.columns):
            raise ValueError(f"{path.name}: expected columns 'date' and 'ndvi', got {list(df.columns)}")
        out = df[["date", "ndvi"]].rename(columns={"ndvi": "value"})
        out["value"] = pd.to_numeric(out["value"], errors="coerce")
        out.loc[(out["value"] < -1) | (out["value"] > 1), "value"] = float("nan")  # valid NDVI range
        return out
