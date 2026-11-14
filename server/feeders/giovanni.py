"""Ready-made feeder for Giovanni 'Time Series, Area-Averaged' CSV downloads."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .base import Feeder


class GiovanniFeeder(Feeder):
    """
    Reads files named  <city>_<file_key>.csv  from raw_dir, e.g. lagos_temp.csv.
    Spaces in city names become underscores: new_york_temp.csv -> "New York".
    Pick a file_key that no other key ends with, so globbing stays unambiguous.
    """

    file_key: str = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.file_key:
            raise NotImplementedError(f"{type(self).__name__} must set `file_key`")

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

        lines = path.read_text(encoding="utf-8").splitlines()
        # Giovanni writes ~7 metadata lines, a blank line, then a "time,<variable>" header.
        header_idx = next((i for i, l in enumerate(lines) if l.lower().startswith("time")), None)
        if header_idx is None:
            raise ValueError(f"{path.name}: no 'time,...' header row found")

        fill = None
        for line in lines[:header_idx]:
            if line.startswith("Fill Value"):
                fill = float(line.split(",")[-1])

        df = pd.read_csv(path, skiprows=header_idx)
        df.columns = ["date", "value"] + list(df.columns[2:])
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        if fill is not None:
            # Fill value can be huge positive (1e15) or negative (-9999.9), so match it exactly
            df.loc[np.isclose(df["value"], fill), "value"] = float("nan")
        return df[["date", "value"]]
