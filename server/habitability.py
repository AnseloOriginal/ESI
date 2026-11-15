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
            "For each city we test the indicators for a statistically significant trend, estimate how the "
            "temperature trend compares with a research-based marker, and combine these results into a score. "
            "The score helps compare cities; it is not a forecast or a measure of how livable a city is."
        ),
        "horizon_years": HORIZON_YEARS,
        "confidence_level": CONFIDENCE,
        "trend_test": (
            "We adjust monthly values for the usual seasonal cycle, then compare annual values. A statistical test "
            "checks whether they show a consistent upward or downward pattern, and the Sen slope estimates the size "
            "of the change. At least 15 years are needed; trends are marked significant when p < 0.05."
        ),
        "projection": (
            "We extend the measured temperature trend from the last recorded year toward the 29 C marker. The central "
            "estimate uses the middle of the trend's 95% uncertainty range; the faster and slower estimates use its "
            "steepest and gentlest values. If the range does not show an approach, a range is not reported. These are "
            f"straight-line estimates that assume the 2002-2025 trend continues; they are not forecasts. Estimates "
            f"beyond {HORIZON_YEARS} years are shown as more than {HORIZON_YEARS} years away."
        ),
        "score_formula": "The combined score gives equal weight to trend evidence and temperature marker proximity. If one part is unavailable, the other is used.",
        "parts": [
            {
                "name": "A. Trend evidence (0-100)",
                "description": (
                    "Indicators are grouped into heat, water and land. Each group score reflects the share of "
                    "indicators with a significant change: warming or declining greenness, and wetter or drier rainfall. "
                    "Rainfall changes in either direction count because unusually wet and dry conditions can both bring "
                    "challenges. The three group scores are averaged on a 0–100 scale."
                ),
                "weight": WEIGHT_TREND,
            },
            {
                "name": "B. Temperature marker proximity (0-100)",
                "description": (
                    f"Cities already above the marker receive 100. Otherwise, a significant warming trend scores "
                    f"higher when it is estimated to reach the 29 C annual temperature marker sooner, up to "
                    f"{HORIZON_YEARS} years away. Distant or non-approaching trends receive zero."
                ),
                "weight": WEIGHT_THRESHOLD,
            },
        ],
        "bands": [{"label": b, "min_score": lo, "max_score": hi} for b, lo, hi in BANDS],
        "interpretation": (
            "Higher scores mean more indicators show significant change and/or the city's temperature is closer to "
            "the research marker. This is a relative comparison across cities, not a measure of livability."
        ),
        "caveats": [
            "The index uses a small set of indicators. We chose the score weights; they have not been calibrated against observed outcomes.",
            "Each significant trend counts equally, whatever its size. With only a few indicators, the trend score can reach its maximum; the temperature marker score helps distinguish cities.",
            "Estimates extend 23–24 years of data in a straight line. They are not climate forecasts.",
            "Grid cells are coarse, coastal cells may include ocean, and records are relatively short, so results are approximate.",
            "Humid-heat markers are listed for context but are not used because these data do not include humidity or daily and hourly temperature peaks.",
            "Indicators without a published threshold (rainfall) contribute only through part A.",
        ],
    }
