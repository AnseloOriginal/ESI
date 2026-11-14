"""Register every feeder here. The pipeline runs whatever is in ALL_FEEDERS."""
from .base import STANDARD_COLUMNS, Feeder
from .giovanni import GiovanniFeeder
from .precipitation import PrecipitationFeeder
from .surface_temp import SurfaceTempDayFeeder, SurfaceTempNightFeeder
from .temperature import TemperatureFeeder
from .vegetation import VegetationFeeder

ALL_FEEDERS = [
    TemperatureFeeder,
    PrecipitationFeeder,
    SurfaceTempDayFeeder,
    SurfaceTempNightFeeder,
    VegetationFeeder,
    # <- add new feeders here
]

__all__ = ["ALL_FEEDERS", "STANDARD_COLUMNS", "Feeder", "GiovanniFeeder", "PrecipitationFeeder", "SurfaceTempDayFeeder", "SurfaceTempNightFeeder", "TemperatureFeeder", "VegetationFeeder"]
