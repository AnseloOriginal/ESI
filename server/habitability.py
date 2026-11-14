"""
Habitability layer: turns trends into (1) years-to-threshold projections and (2) a per-city pressure score.

Everything here is deliberately simple and explainable. Nothing is a forecast: projections extend the
2002-2025 straight-line trend, and the score is a relative screening index for comparing cities.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd
from scipy.stats import theilslopes

from measurer import INSUFFICIENT, TrendResult
from thresholds import Threshold

HORIZON_YEARS = 100          # a threshold further away than this counts as "distant"
CONFIDENCE = 0.95            # confidence level of the slope interval (fast / slow cases)
ADVERSE_STATUSES = {"worsening", "wetter", "drier"}
WEIGHT_TREND = 0.5           # weight of part A (trend evidence) in the pressure score
WEIGHT_THRESHOLD = 0.5       # weight of part B (threshold proximity); weights are rescaled if a part is missing
BANDS = [("low", 0, 25), ("moderate", 25, 50), ("high", 50, 75), ("very_high", 75, 100)]


# ------------------------------------------------------------------ projection
@dataclass
class Projection:
    status: str                      # exceeded / approaching / distant / uncertain / not_approaching / insufficient_data
    threshold_id: str = ""
    threshold_value: float | None = None
    threshold_unit: str = ""
    comparison: str = ""
    end_year: int | None = None
    current_level: float | None = None        # value of the fitted trend line in the last data year
    recent_mean: float | None = None          # plain mean of the last 5 annual values
    distance: float | None = None             # how far the fitted level is from the threshold (<= 0: already past)
    slope_per_decade: float | None = None
    slope_low_per_decade: float | None = None   # 95% interval on the slope
    slope_high_per_decade: float | None = None
    significant: bool = False
    years_central: float | None = None        # at the median slope
    years_fast: float | None = None           # at the fastest slope in the interval
    years_slow: float | None = None           # at the slowest slope in the interval (None = may never arrive)
    year_central: float | None = None         # calendar year of the central estimate
    horizon_years: int = HORIZON_YEARS
    note: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


def _years(distance: float, rate: float) -> float | None:
    if distance <= 0:
        return 0.0
    return distance / rate if rate > 0 else None


def project(
    annual: pd.Series,
    threshold: Threshold,
    trend: TrendResult,
    horizon: int = HORIZON_YEARS,
    confidence: float = CONFIDENCE,
) -> Projection:
    """annual: seasonally adjusted annual values (index = year) from Measurer.annual_values()."""
    base = dict(
        threshold_id=threshold.id,
        threshold_value=threshold.value,
        threshold_unit=threshold.unit,
        comparison=threshold.comparison,
        horizon_years=horizon,
    )
    if trend.status == INSUFFICIENT or len(annual) < 3:
        return Projection(status=INSUFFICIENT, note=trend.note or "not enough usable years", **base)

    x = annual.index.to_numpy(dtype=float)
    y = annual.to_numpy(dtype=float)
    slope, intercept, lo, hi = theilslopes(y, x, alpha=confidence)
    end_year = int(x.max())
    level = float(intercept + slope * end_year)

    toward = 1.0 if threshold.comparison == "above" else -1.0
    distance = toward * (threshold.value - level)          # > 0 means still short of the threshold
    rate_c = toward * slope
    slow, fast = sorted([toward * lo, toward * hi])

    years_c, years_f, years_s = _years(distance, rate_c), _years(distance, fast), _years(distance, slow)
    significant = trend.direction != "none"

    if distance <= 0:
        status, note = "exceeded", "The fitted trend line is already past the threshold."
    elif rate_c <= 0:
        status, note = "not_approaching", "The trend is flat or moving away from the threshold."
    elif not significant:
        status, note = "uncertain", "The trend is not statistically significant, so the years shown are not a reliable estimate."
    elif years_c <= horizon:
        status, note = "approaching", "If the 2002-2025 trend simply continues. Not a forecast."
    else:
        status, note = "distant", f"Further than {horizon} years away at the current trend."

    return Projection(
        status=status,
        end_year=end_year,
        current_level=level,
        recent_mean=float(y[-5:].mean()),
        distance=float(distance),
        slope_per_decade=float(slope * 10),
        slope_low_per_decade=float(lo * 10),
        slope_high_per_decade=float(hi * 10),
        significant=significant,
        years_central=years_c,
        years_fast=years_f,
        years_slow=years_s,
        year_central=(end_year + years_c) if years_c is not None else None,
        note=note,
        **base,
    )


# ------------------------------------------------------------------ pressure score
def _band(score: float) -> str:
    for label, _, hi in BANDS:
        if score < hi:
            return label
    return BANDS[-1][0]


def _threshold_points(row: pd.Series, horizon: int) -> float | None:
    status = row["status"]
    if status == INSUFFICIENT:
        return None
    if status == "exceeded":
        return 100.0
    if status == "approaching" and pd.notna(row["years_central"]):
        return max(0.0, 100.0 * (1.0 - float(row["years_central"]) / horizon))
    return 0.0


def score_cities(results: pd.DataFrame, projections: pd.DataFrame, horizon: int = HORIZON_YEARS) -> pd.DataFrame:
    """One row per city. See methodology() for the plain-language description."""
    columns = ["city", "rank", "score", "band", "basis", "trend_evidence", "threshold_proximity",
               "n_evaluated", "n_adverse", "domain_signals"]
    if results.empty:
        return pd.DataFrame(columns=columns)

    rows = []
    for city, grp in results.groupby("city"):
        evaluated = grp[grp["status"] != INSUFFICIENT]

        # Part A: share of indicators with a significant adverse/shift trend, averaged over hazard domains
        domains: dict[str, dict] = {}
        for dom, g in evaluated.groupby(evaluated["domain"].fillna("other").replace("", "other")):
            adverse = int(g["status"].isin(ADVERSE_STATUSES).sum())
            domains[dom] = {"signal": adverse / len(g), "adverse": adverse, "evaluated": int(len(g))}
        part_a = 100.0 * float(np.mean([d["signal"] for d in domains.values()])) if domains else None

        # Part B: closeness to published thresholds
        part_b = None
        if not projections.empty:
            pts = [p for p in (_threshold_points(r, horizon) for _, r in projections[projections["city"] == city].iterrows())
                   if p is not None]
            part_b = float(np.mean(pts)) if pts else None

        weighted = [(v, w) for v, w in ((part_a, WEIGHT_TREND), (part_b, WEIGHT_THRESHOLD)) if v is not None]
        if weighted:
            score = round(sum(v * w for v, w in weighted) / sum(w for _, w in weighted), 1)
            band = _band(score)
        else:
            score, band = None, "insufficient_data"
        basis = ("trend_evidence+threshold_proximity" if part_a is not None and part_b is not None
                 else "trend_evidence_only" if part_a is not None else "none")
        rows.append({
            "city": city, "score": score, "band": band, "basis": basis,
            "trend_evidence": None if part_a is None else round(part_a, 1),
            "threshold_proximity": None if part_b is None else round(part_b, 1),
            "n_evaluated": int(len(evaluated)),
            "n_adverse": int(evaluated["status"].isin(ADVERSE_STATUSES).sum()),
            "domain_signals": json.dumps(domains),
        })

    df = pd.DataFrame(rows).sort_values("score", ascending=False, na_position="last").reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)
    return df[columns]


# ------------------------------------------------------------------ method description (served by the API)
def methodology() -> dict:
    return {
        "summary": (
            "For each city we test every indicator for a statistically significant trend, project the "
            "temperature trend forward to a published limit, and combine both into a relative pressure score. "
            "The score is a screening tool for comparing cities, not a forecast or a measure of how livable a city is."
        ),
        "horizon_years": HORIZON_YEARS,
        "confidence_level": CONFIDENCE,
        "trend_test": (
            "Monthly values are converted to seasonally adjusted annual values (each calendar month's long-term mean "
            "removed; years with fewer than 9 valid months dropped). A Mann-Kendall test checks for a monotonic trend "
            "and Sen's slope measures it. At least 15 usable years are required. A trend counts as significant at p < 0.05."
        ),
        "projection": (
            "Sen's slope and its 95% interval are applied to the fitted level in the last data year. Years to threshold "
            "= distance to the threshold / slope. The central estimate uses the median slope; the fast case uses the "
            "steepest slope in the interval; the slow case uses the gentlest (none if the interval allows no approach). "
            f"Thresholds further than {HORIZON_YEARS} years away are called distant. Projections assume the "
            "2002-2025 straight-line trend simply continues."
        ),
        "score_formula": f"score = {WEIGHT_TREND} x A (trend evidence) + {WEIGHT_THRESHOLD} x B (threshold proximity); weights are rescaled if a part is unavailable.",
        "parts": [
            {
                "name": "A. Trend evidence (0-100)",
                "description": (
                    "Indicators are grouped into hazard domains (heat, water, land). For each domain, the share of its "
                    "evaluated indicators showing a significant worsening, wetter or drier trend; the domain shares are "
                    "averaged and scaled to 100. Rainfall shifts in either direction count, since drought and flooding are both hazards."
                ),
                "weight": WEIGHT_TREND,
            },
            {
                "name": "B. Threshold proximity (0-100)",
                "description": (
                    f"For each published threshold: 100 if already exceeded; 100 x (1 - years to threshold / {HORIZON_YEARS}) "
                    "if a significant trend is approaching it; 0 otherwise (distant, flat, moving away, or not significant). "
                    "Averaged over thresholds. Currently one active threshold: mean annual temperature 29 C."
                ),
                "weight": WEIGHT_THRESHOLD,
            },
        ],
        "bands": [{"label": b, "min_score": lo, "max_score": hi} for b, lo, hi in BANDS],
        "interpretation": (
            "Higher means more of the evidence points toward pressure on the human climate niche. Cities that are "
            "already hot score higher on part B because they are closer to the limit, even if they warm slowly."
        ),
        "caveats": [
            "A relative index built from a few indicators; weights are a stated choice, not fitted to outcomes.",
            "Part A counts a significant adverse trend the same whatever its size, so with few indicators it can saturate; part B is what separates cities that are close to a limit.",
            "Projections are straight-line extensions of 23-24 years of data, not climate forecasts.",
            "Coarse grids, ocean in coastal boxes, reanalysis temperature and short records limit precision.",
            "Wet-bulb (humid heat) limits are listed but not used: they need humidity and daily or hourly extremes.",
            "Indicators without a published threshold (rainfall) contribute only through part A.",
        ],
    }
