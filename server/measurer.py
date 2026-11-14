"""
Measurer: turns ONE monthly time series into a trend verdict.

It knows nothing about where the data came from. Give it a table with
`date` and `value` columns and it returns a TrendResult.

Method (kept simple and explainable on purpose):
  1. Remove the seasonal cycle (subtract each calendar month's long-term mean).
  2. Average the anomalies into one value per year. Years with too few valid
     months are dropped, so gaps cannot fake a trend.
  3. Mann-Kendall test on the annual series (is there a monotonic trend?)
     plus Sen's slope (how big is it, per decade).

Why annual, not monthly? Monthly anomalies are strongly autocorrelated, which
makes p-values look far more significant than they really are. Annual values
are much closer to independent, so the p-value is more honest.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd
import pymannkendall as mk

WORSENING = "worsening"
IMPROVING = "improving"
NO_CLEAR_TREND = "no_clear_trend"
INSUFFICIENT = "insufficient_data"


@dataclass
class TrendResult:
    status: str                              # worsening / improving / no_clear_trend / insufficient_data
    direction: str = "none"                  # increasing / decreasing / none (none = not significant)
    trend_per_decade: float | None = None    # Sen's slope, in the series' unit per 10 years
    p_value: float | None = None
    kendall_tau: float | None = None
    mean_value: float | None = None
    n_years: int = 0                         # years that passed the completeness check
    start_year: int | None = None
    end_year: int | None = None
    completeness: float | None = None        # share of expected months that have data (0-1)
    note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


class Measurer:
    def __init__(
        self,
        alpha: float = 0.05,
        min_years: int = 15,
        min_months_per_year: int = 9,
        min_completeness: float = 0.7,
    ):
        self.alpha = alpha
        self.min_years = min_years
        self.min_months_per_year = min_months_per_year
        self.min_completeness = min_completeness

    # ------------------------------------------------------------------ public
    def measure(self, data: pd.DataFrame, worse_direction: str = "up") -> TrendResult:
        """
        data: DataFrame with `date` and `value` columns (monthly).
        worse_direction: "up" if an increase is bad (temperature),
                         "down" if a decrease is bad (rainfall, vegetation).
        """
        if worse_direction not in ("up", "down"):
            raise ValueError("worse_direction must be 'up' or 'down'")

        s = self._to_monthly_series(data)
        if s.empty:
            return TrendResult(status=INSUFFICIENT, note="no valid data points")

        first, last = s.index.min(), s.index.max()
        expected = last.ordinal - first.ordinal + 1
        completeness = round(len(s) / expected, 3)
        base = dict(
            mean_value=float(s.mean()),
            start_year=int(first.year),
            end_year=int(last.year),
            completeness=completeness,
        )

        if completeness < self.min_completeness:
            return TrendResult(
                status=INSUFFICIENT,
                note=f"only {completeness:.0%} of months have data (need {self.min_completeness:.0%})",
                **base,
            )

        annual = self._annual_anomalies(s)
        n_years = len(annual)
        if n_years < self.min_years:
            return TrendResult(
                status=INSUFFICIENT,
                n_years=n_years,
                note=f"only {n_years} usable years (need {self.min_years})",
                **base,
            )

        years = annual.index.to_numpy(dtype=float)
        y = annual.to_numpy(dtype=float)

        slope_per_year = self._sen_slope(years, y)
        mk_result = mk.original_test(y, alpha=self.alpha)
        p = float(mk_result.p)
        if np.isnan(p):  # e.g. perfectly flat series
            p = 1.0
        tau = float(mk_result.Tau)
        trend_per_decade = float(slope_per_year * 10)

        significant = p < self.alpha and slope_per_year != 0
        if significant:
            direction = "increasing" if slope_per_year > 0 else "decreasing"
            is_bad = (direction == "increasing") == (worse_direction == "up")
            status = WORSENING if is_bad else IMPROVING
        else:
            direction, status = "none", NO_CLEAR_TREND

        return TrendResult(
            status=status,
            direction=direction,
            trend_per_decade=trend_per_decade,
            p_value=p,
            kendall_tau=tau,
            n_years=n_years,
            **base,
        )

    # ----------------------------------------------------------------- helpers
    @staticmethod
    def _to_monthly_series(data: pd.DataFrame) -> pd.Series:
        dates = pd.to_datetime(data["date"]).dt.to_period("M")
        values = pd.to_numeric(data["value"], errors="coerce")
        s = pd.Series(values.to_numpy(), index=dates)
        return s.dropna().groupby(level=0).mean().sort_index()

    def _annual_anomalies(self, s: pd.Series) -> pd.Series:
        # subtract each calendar month's mean -> seasonal cycle removed
        climatology = s.groupby(s.index.month).transform("mean")
        anomaly = s - climatology
        frame = pd.DataFrame({"year": s.index.year, "anomaly": anomaly.to_numpy()})
        grouped = frame.groupby("year")["anomaly"]
        annual = grouped.mean()
        counts = grouped.count()
        return annual[counts >= self.min_months_per_year]

    @staticmethod
    def _sen_slope(x: np.ndarray, y: np.ndarray) -> float:
        # median of all pairwise slopes; uses real year gaps if a year was dropped
        i, j = np.triu_indices(len(x), k=1)
        return float(np.median((y[j] - y[i]) / (x[j] - x[i])))
