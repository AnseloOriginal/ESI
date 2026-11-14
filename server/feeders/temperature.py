from .giovanni import GiovanniFeeder


class TemperatureFeeder(GiovanniFeeder):
    indicator = "air_temp_2m"
    label = "Air temperature (2 m)"
    unit = "degC"
    source = "Giovanni: MERRA-2 M2TMNXSLV v5.12.4 (T2M)"
    worse_direction = "up"
    file_key = "temp"
