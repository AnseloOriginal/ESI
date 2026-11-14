"""AIRS-only surface skin temperature (Giovanni, AIRS3STM v7.0), day and night kept as SEPARATE indicators."""
from .giovanni import GiovanniFeeder


class _SurfaceTempFeeder(GiovanniFeeder):
    unit = "degC"
    worse_direction = "up"

    def postprocess(self, df):
        # Giovanni's default unit for this product is Kelvin; convert unless it is already Celsius
        if df["value"].median() > 150:
            df["value"] = df["value"] - 273.15
        return df


class SurfaceTempDayFeeder(_SurfaceTempFeeder):
    indicator = "surface_temp_day"
    label = "Surface skin temperature (daytime)"
    source = "Giovanni: AIRS3STM v7.0 AIRS-only SurfSkinTemp_A (daytime/ascending)"
    file_key = "lst_day"


class SurfaceTempNightFeeder(_SurfaceTempFeeder):
    indicator = "surface_temp_night"
    label = "Surface skin temperature (nighttime)"
    source = "Giovanni: AIRS3STM v7.0 AIRS-only SurfSkinTemp_D (nighttime/descending)"
    file_key = "lst_night"
