"""Single source of truth for folders. Everything lives under server/, whatever the working directory is."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent      # .../server
RAW_DIR = BASE_DIR / "data" / "raw"             # downloaded Giovanni CSVs
OUTPUT_DIR = BASE_DIR / "output"                # series.csv, results.csv, results.json, errors.csv
