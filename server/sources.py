"""
Single source of truth for everything ESI cites except the research behind thresholds (thresholds.py).

  * Served at /api/sources and rendered on the app's "The initiative" page.
  * Exported to CITATIONS.md by:  py server/export_citations.py
Edit here only; the app and CITATIONS.md follow.

`verified=False` means "reference details not yet checked against the publisher page".
export_citations.py prints a warning for each one so you can confirm them before submitting.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

ACKNOWLEDGEMENT = (
    "The analyses and visualizations in this project were produced with the Giovanni online data system, "
    "developed and maintained by the NASA Goddard Earth Sciences Data and Information Services Center (GES DISC), "
    "and with data from NASA AppEEARS (NASA EOSDIS LP DAAC)."
)

# Edit to match what the official 2026 rules require.
AI_DISCLOSURE = (
    "AI assistants were used during development for code assistance and drafting. "
    "The data, statistical methods and cited research are listed on this page."
)

CATEGORIES = {
    "data": "NASA data and tools",
    "method": "Statistical methods",
    "population": "Population data",
    "software": "Open-source software and map data",
}


@dataclass(frozen=True)
class Source:
    id: str
    category: str      # key of CATEGORIES
    reference: str     # full reference as it should be printed
    used_for: str      # one line: what ESI uses it for
    url: str = ""
    verified: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


SOURCES: list[Source] = [
    # ---- data and tools
    Source("giovanni", "data",
           "Acker, J. G., & Leptoukh, G. (2007). Online analysis enhances use of NASA Earth science data. Eos, Transactions AGU, 88(2), 14-17.",
           "Giovanni: monthly area-averaged time series for the temperature, precipitation and surface-temperature indicators.",
           "https://doi.org/10.1029/2007EO020003"),
    Source("merra2_data", "data",
           "Global Modeling and Assimilation Office (GMAO) (2015). MERRA-2 tavgM_2d_slv_Nx: 2d, Monthly mean, Time-averaged, Single-Level, Assimilation, Single-Level Diagnostics V5.12.4. NASA GES DISC.",
           "2 m air temperature (reanalysis).",
           "https://doi.org/10.5067/AP1B0BA5PD2K"),
    Source("merra2_paper", "data",
           "Gelaro, R., et al. (2017). The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2). Journal of Climate, 30(14), 5419-5454.",
           "Reference paper for MERRA-2.",
           "https://doi.org/10.1175/JCLI-D-16-0758.1"),
    Source("imerg", "data",
           "Huffman, G. J., Stocker, E. F., Bolvin, D. T., Nelkin, E. J., & Tan, J. (2023). GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07. NASA GES DISC.",
           "Monthly precipitation (Final Run).",
           "https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07"),
    Source("airs", "data",
           "AIRS project. AIRS3STM, Version 7.0. Aqua/AIRS L3 Monthly Standard Physical Retrieval (AIRS-only) 1 degree x 1 degree V7.0. Greenbelt, MD, USA. NASA GES DISC.",
           "Day and night surface skin temperature.",
           "https://doi.org/10.5067/UBENJB9D3T2H"),
    Source("mod13a3", "data",
           "Didan, K. (2021). MODIS/Terra Vegetation Indices Monthly L3 Global 1km SIN Grid V061. NASA EOSDIS Land Processes DAAC.",
           "Vegetation greenness (NDVI).",
           "https://doi.org/10.5067/MODIS/MOD13A3.061"),
    Source("appeears", "data",
           "AppEEARS Team. (2026). Application for Extracting and Exploring Analysis Ready Samples (AppEEARS). Ver. 3.137. NASA EOSDIS Land Processes Distributed Active Archive Center (LP DAAC), USGS/Earth Resources Observation and Science (EROS) Center, Sioux Falls, South Dakota, USA. Accessed November 14, 2026.",
           "Download tool for the MODIS NDVI data (request 'Nasa Space Apps', 2002-2025).",
           "https://appeears.earthdatacloud.nasa.gov"),
    # ---- statistical methods
    Source("mann", "method",
           "Mann, H. B. (1945). Nonparametric tests against trend. Econometrica, 13(3), 245-259.",
           "Mann-Kendall trend test.",
           "https://doi.org/10.2307/1907187"),
    Source("kendall", "method",
           "Kendall, M. G. (1975). Rank Correlation Methods (4th ed.). Charles Griffin.",
           "Mann-Kendall trend test (tau).", ""),
    Source("sen", "method",
           "Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. Journal of the American Statistical Association, 63(324), 1379-1389.",
           "Sen slope: size of the trend per decade.",
           "https://doi.org/10.1080/01621459.1968.10480934"),
    Source("pymannkendall", "method",
           "Hussain, M., & Mahmud, I. (2019). pyMannKendall: a Python package for non parametric Mann Kendall family of trend tests. Journal of Open Source Software, 4(39), 1556.",
           "Software used for the Mann-Kendall test.",
           "https://doi.org/10.21105/joss.01556"),
    # ---- population
    Source("wup2025", "population",
           "United Nations, Department of Economic and Social Affairs, Population Division (2025). World Urbanization Prospects: The 2025 Revision, Online Edition. (Degree of Urbanization data prepared by the European Commission's Joint Research Centre.)",
           "City selection (largest cities by the Degree of Urbanization definition) and urban-area population estimates.",
           "https://population.un.org/wup/"),
    # ---- software and map data
    Source("pandas", "software",
           "McKinney, W. (2010). Data structures for statistical computing in Python. Proceedings of the 9th Python in Science Conference, 56-61.",
           "Data handling.", "https://doi.org/10.25080/Majora-92bf1922-00a"),
    Source("numpy", "software",
           "Harris, C. R., et al. (2020). Array programming with NumPy. Nature, 585, 357-362.",
           "Numerical computing.", "https://doi.org/10.1038/s41586-020-2649-2"),
    Source("scipy", "software",
           "Virtanen, P., et al. (2020). SciPy 1.0: fundamental algorithms for scientific computing in Python. Nature Methods, 17, 261-272.",
           "Slope confidence intervals.", "https://doi.org/10.1038/s41592-019-2686-2"),
    Source("fastapi", "software",
           "FastAPI, Uvicorn and Pydantic (open source web framework, server and validation library).",
           "API that serves the precomputed results.", "https://fastapi.tiangolo.com"),
    Source("web", "software",
           "Vite, TypeScript, d3-geo and topojson-client (open source).",
           "Web app and globe projection.", "https://vite.dev"),
    Source("world_atlas", "software",
           "world-atlas (Mike Bostock), derived from Natural Earth (public domain).",
           "Country outlines on the globe.", "https://www.naturalearthdata.com"),
]
