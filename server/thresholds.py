"""
Published thresholds used by the habitability layer.

Rules for this file:
  * Only add a threshold you can cite. Fill every field, including the caveats.
  * `verified=True` on a Citation means the reference details were checked against sources.
  * `active=False` keeps a threshold on the methodology page without using it in any calculation.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Citation:
    authors: str
    year: int
    title: str
    venue: str
    url: str = ""
    verified: bool = True


@dataclass(frozen=True)
class Threshold:
    id: str
    indicator: str            # must equal a feeder's `indicator`
    label: str
    value: float
    unit: str
    comparison: str           # "above": danger when the annual value rises past it; "below": when it falls past it
    meaning: str
    caveats: tuple[str, ...]
    citation: Citation
    active: bool = True
    inactive_reason: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


XU_2020 = Citation(
    authors="Xu, C., Kohler, T. A., Lenton, T. M., Svenning, J.-C., & Scheffer, M.",
    year=2020,
    title="Future of the human climate niche",
    venue="Proceedings of the National Academy of Sciences, 117(21), 11350-11355",
    url="https://doi.org/10.1073/pnas.1910114117",
    verified=True,
)

SHERWOOD_HUBER_2010 = Citation(
    authors="Sherwood, S. C., & Huber, M.",
    year=2010,
    title="An adaptability limit to climate change due to heat stress",
    venue="Proceedings of the National Academy of Sciences (check volume/pages before citing)",
    url="",
    verified=False,
)

VECELLIO_2022 = Citation(
    authors="Vecellio, D. J., Wolf, S. T., Cottle, R. M., & Kenney, W. L.",
    year=2022,
    title="Evaluating the 35 C wet-bulb temperature adaptability threshold for young, healthy subjects (PSU HEAT Project)",
    venue="Journal of Applied Physiology (check volume/pages before citing)",
    url="",
    verified=False,
)

THRESHOLDS: list[Threshold] = [
    Threshold(
        id="human_niche_mat_29c",
        indicator="air_temp_2m",
        label="Human climate niche limit: mean annual temperature 29 C",
        value=29.0,
        unit="degC",
        comparison="above",
        meaning=(
            "Mean annual temperatures above 29 C are found today on only about 0.8% of Earth's land, "
            "mostly in the Sahara. The study projects that, without migration, about one third of the world's "
            "people could face such temperatures in a business-as-usual warming scenario. We use it as a marker "
            "of conditions humans have almost never lived in."
        ),
        caveats=(
            "A marker of conditions people rarely live in today, not a physiological survival limit; adaptation, "
            "cooling technology and migration change what is tolerable.",
            "Compared against MERRA-2 2 m air temperature (a reanalysis) averaged over a roughly 1-degree box, "
            "which can differ from the datasets in the paper and includes ocean for coastal cities.",
            "Annual means only: says nothing about heat extremes or humidity.",
            "The projection is a straight-line extension of the 2002-2025 trend, not a climate forecast.",
        ),
        citation=XU_2020,
    ),
    Threshold(
        id="wetbulb_35c",
        indicator="wet_bulb_temp_max",
        label="Theoretical wet-bulb limit: 35 C",
        value=35.0,
        unit="degC",
        comparison="above",
        meaning="A wet-bulb temperature of 35 C has long been proposed as the theoretical limit of human heat adaptability.",
        caveats=("Theoretical; later lab work found people reach heat-stress limits at lower wet-bulb values.",),
        citation=SHERWOOD_HUBER_2010,
        active=False,
        inactive_reason="Needs humidity plus daily or hourly temperature peaks. Monthly averages cannot show wet-bulb extremes.",
    ),
    Threshold(
        id="wetbulb_31c_humid",
        indicator="wet_bulb_temp_max",
        label="Measured wet-bulb limit, warm-humid conditions: about 31 C",
        value=31.0,
        unit="degC",
        comparison="above",
        meaning=(
            "Lab experiments on young, healthy adults at modest activity found heat stress becoming uncompensable "
            "at wet-bulb temperatures of about 30-31 C in warm-humid conditions (25-28 C in hot-dry conditions)."
        ),
        caveats=("Young, healthy adults only; limits are expected to be lower for older people, children and outdoor workers.",),
        citation=VECELLIO_2022,
        active=False,
        inactive_reason="Needs humidity plus daily or hourly temperature peaks. Monthly averages cannot show wet-bulb extremes.",
    ),
]
