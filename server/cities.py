"""City registry for the map. Keys must match the names the feeders produce (file name -> Title Case).
lat/lon are approximate city centres; bbox is the Giovanni box used for the downloads (W, S, E, N)."""

CITIES: dict[str, dict] = {
    "Lagos":     {"country": "Nigeria",     "lat": 6.5244,   "lon": 3.3792,   "bbox": [2.9, 6.0, 3.9, 7.0]},
    "Jakarta":   {"country": "Indonesia",   "lat": -6.2088,  "lon": 106.8456, "bbox": [106.35, -6.7, 107.35, -5.7]},
    "Dhaka":     {"country": "Bangladesh",  "lat": 23.8103,  "lon": 90.4125,  "bbox": [89.9, 23.3, 90.9, 24.3]},
    "Tokyo":     {"country": "Japan",       "lat": 35.6762,  "lon": 139.6503, "bbox": [139.2, 35.2, 140.2, 36.2]},
    "New Delhi": {"country": "India",       "lat": 28.6139,  "lon": 77.2090,  "bbox": [76.7, 28.1, 77.7, 29.1]},
    "Shanghai":  {"country": "China",       "lat": 31.2304,  "lon": 121.4737, "bbox": [121.0, 30.7, 122.0, 31.7]},
    "Guangzhou": {"country": "China",       "lat": 23.1291,  "lon": 113.2644, "bbox": [112.8, 22.6, 113.8, 23.6]},
    "Cairo":     {"country": "Egypt",       "lat": 30.0444,  "lon": 31.2357,  "bbox": [30.7, 29.5, 31.7, 30.5]},
    "Manila":    {"country": "Philippines", "lat": 14.5995,  "lon": 120.9842, "bbox": [120.5, 14.1, 121.5, 15.1]},
    "Kolkata":   {"country": "India",       "lat": 22.5726,  "lon": 88.3639,  "bbox": [87.9, 22.1, 88.9, 23.1]},
    "Seoul":     {"country": "South Korea", "lat": 37.5665,  "lon": 126.9780, "bbox": [126.5, 37.1, 127.5, 38.1]},
}
