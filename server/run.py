"""Run everything:  python run.py   (optionally: --cities Lagos Cairo)"""
import argparse
import logging

import pandas as pd

from feeders import ALL_FEEDERS
from pipeline import Pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect, measure and save environmental trends.")
    parser.add_argument("--raw", default="data/raw", help="folder with downloaded CSVs")
    parser.add_argument("--out", default="output", help="folder for results")
    parser.add_argument("--cities", nargs="*", help="limit to these cities (default: all found)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = Pipeline([cls(raw_dir=args.raw) for cls in ALL_FEEDERS]).run(args.cities)
    out = result.save(args.out)

    pd.set_option("display.width", 200, "display.max_columns", 20)
    cols = ["city", "indicator", "trend_per_decade", "unit", "p_value", "n_years", "status"]
    print(result.results[cols].round(4).to_string(index=False) if not result.results.empty else "No results.")
    if not result.errors.empty:
        print("\nErrors:\n", result.errors.to_string(index=False))
    print(f"\nSaved to {out.resolve()}")


if __name__ == "__main__":
    main()
