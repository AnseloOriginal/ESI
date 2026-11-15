# Citations and acknowledgements

The analyses and visualizations in this project were produced with the Giovanni online data system, developed and maintained by the NASA Goddard Earth Sciences Data and Information Services Center (GES DISC), and with data from NASA AppEEARS (NASA EOSDIS LP DAAC).


## NASA data and tools

- Acker, J. G., & Leptoukh, G. (2007). Online analysis enhances use of NASA Earth science data. Eos, Transactions AGU, 88(2), 14-17. <https://doi.org/10.1029/2007EO020003>
  *Used for:* Giovanni: monthly area-averaged time series for the temperature, precipitation and surface-temperature indicators.
- Global Modeling and Assimilation Office (GMAO) (2015). MERRA-2 tavgM_2d_slv_Nx: 2d, Monthly mean, Time-averaged, Single-Level, Assimilation, Single-Level Diagnostics V5.12.4. NASA GES DISC. <https://doi.org/10.5067/AP1B0BA5PD2K>
  *Used for:* 2 m air temperature (reanalysis).
- Gelaro, R., et al. (2017). The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2). Journal of Climate, 30(14), 5419-5454. <https://doi.org/10.1175/JCLI-D-16-0758.1>
  *Used for:* Reference paper for MERRA-2.
- Huffman, G. J., Stocker, E. F., Bolvin, D. T., Nelkin, E. J., & Tan, J. (2023). GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07. NASA GES DISC. <https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07>
  *Used for:* Monthly precipitation (Final Run).
- AIRS project. AIRS3STM, Version 7.0. Aqua/AIRS L3 Monthly Standard Physical Retrieval (AIRS-only) 1 degree x 1 degree V7.0. Greenbelt, MD, USA. NASA GES DISC. <https://doi.org/10.5067/UBENJB9D3T2H>
  *Used for:* Day and night surface skin temperature.
- Didan, K. (2021). MODIS/Terra Vegetation Indices Monthly L3 Global 1km SIN Grid V061. NASA EOSDIS Land Processes DAAC. <https://doi.org/10.5067/MODIS/MOD13A3.061>
  *Used for:* Vegetation greenness (NDVI).
- AppEEARS Team. (2026). Application for Extracting and Exploring Analysis Ready Samples (AppEEARS). Ver. 3.137. NASA EOSDIS Land Processes Distributed Active Archive Center (LP DAAC), USGS/Earth Resources Observation and Science (EROS) Center, Sioux Falls, South Dakota, USA. Accessed November 14, 2026. <https://appeears.earthdatacloud.nasa.gov>
  *Used for:* Download tool for the MODIS NDVI data (request 'Nasa Space Apps', 2002-2025).

## Statistical methods

- Mann, H. B. (1945). Nonparametric tests against trend. Econometrica, 13(3), 245-259. <https://doi.org/10.2307/1907187>
  *Used for:* Mann-Kendall trend test.
- Kendall, M. G. (1975). Rank Correlation Methods (4th ed.). Charles Griffin.
  *Used for:* Mann-Kendall trend test (tau).
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. Journal of the American Statistical Association, 63(324), 1379-1389. <https://doi.org/10.1080/01621459.1968.10480934>
  *Used for:* Sen slope: size of the trend per decade.
- Hussain, M., & Mahmud, I. (2019). pyMannKendall: a Python package for non parametric Mann Kendall family of trend tests. Journal of Open Source Software, 4(39), 1556. <https://doi.org/10.21105/joss.01556>
  *Used for:* Software used for the Mann-Kendall test.

## Population data

- United Nations, Department of Economic and Social Affairs, Population Division (2025). World Urbanization Prospects: The 2025 Revision, Online Edition. (Degree of Urbanization data prepared by the European Commission's Joint Research Centre.) <https://population.un.org/wup/>
  *Used for:* City selection (largest cities by the Degree of Urbanization definition) and urban-area population estimates.

## Open-source software and map data

- McKinney, W. (2010). Data structures for statistical computing in Python. Proceedings of the 9th Python in Science Conference, 56-61. <https://doi.org/10.25080/Majora-92bf1922-00a>
  *Used for:* Data handling.
- Harris, C. R., et al. (2020). Array programming with NumPy. Nature, 585, 357-362. <https://doi.org/10.1038/s41586-020-2649-2>
  *Used for:* Numerical computing.
- Virtanen, P., et al. (2020). SciPy 1.0: fundamental algorithms for scientific computing in Python. Nature Methods, 17, 261-272. <https://doi.org/10.1038/s41592-019-2686-2>
  *Used for:* Slope confidence intervals.
- FastAPI, Uvicorn and Pydantic (open source web framework, server and validation library). <https://fastapi.tiangolo.com>
  *Used for:* API that serves the precomputed results.
- Vite, TypeScript, d3-geo and topojson-client (open source). <https://vite.dev>
  *Used for:* Web app and globe projection.
- world-atlas (Mike Bostock), derived from Natural Earth (public domain). <https://www.naturalearthdata.com>
  *Used for:* Country outlines on the globe.

## Research behind the habitability thresholds

- Xu, C., Kohler, T. A., Lenton, T. M., Svenning, J.-C., & Scheffer, M. (2020). Future of the human climate niche. Proceedings of the National Academy of Sciences, 117(21), 11350-11355. <https://doi.org/10.1073/pnas.1910114117>
  *Used for:* Human climate niche limit: mean annual temperature 29 C. Used for the years-to-threshold projection.
- Sherwood, S. C., & Huber, M. (2010). An adaptability limit to climate change due to heat stress. Proceedings of the National Academy of Sciences, 107(21), 9552-9555. <https://doi.org/10.1073/pnas.0913352107>
  *Used for:* Theoretical wet-bulb limit: 35 C. Not used in calculations.
- Vecellio, D. J., Wolf, S. T., Cottle, R. M., & Kenney, W. L. (2022). Evaluating the 35 C wet-bulb temperature adaptability threshold for young, healthy subjects (PSU HEAT Project). Journal of Applied Physiology, 132(2), 340-345. <https://doi.org/10.1152/japplphysiol.00738.2021>
  *Used for:* Measured wet-bulb limit, warm-humid conditions: about 31 C. Not used in calculations.

## AI-tool disclosure

AI assistants were used during development for code assistance and drafting. The data, statistical methods and cited research are listed on this page.
