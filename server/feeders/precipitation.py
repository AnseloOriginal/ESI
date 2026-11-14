from .giovanni import GiovanniFeeder


class PrecipitationFeeder(GiovanniFeeder):
    indicator = "precipitation"
    label = "Precipitation"
    unit = "mm/day"
    source = "Giovanni: GPM IMERG Final Run monthly v07 (GPM_3IMERGM_07_precipitation)"
    worse_direction = "both"   # drier = drought pressure, wetter = flood pressure
    domain = "water"
    up_label = "wetter"
    down_label = "drier"
    file_key = "precip"

    def postprocess(self, df):
        df["value"] = df["value"] * 24   # Giovanni gives mm/hr (leave its unit dropdown at the default)
        return df
