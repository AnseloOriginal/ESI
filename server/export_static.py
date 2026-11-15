"""
Dump every API response the front end uses to static JSON, so the app can be hosted with no server.

    py server/export_static.py          (writes renderer/public/api/...)

File naming matches renderer/src/api/client.ts in static mode:
    /api/cities               -> api/cities.json
    /api/cities/New Delhi     -> api/cities/new-delhi.json
    /api/series?city&indicator-> api/series/new-delhi__air_temp_2m.json
"""
import json
import shutil
from urllib.parse import quote

from fastapi.testclient import TestClient

from api import app
from settings import BASE_DIR

OUT = BASE_DIR.parent / "renderer" / "public" / "api"
slug = lambda s: s.strip().lower().replace(" ", "-")  # noqa: E731


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    n = 0

    def save(rel: str, data) -> None:
        nonlocal n
        path = OUT / f"{rel}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")
        n += 1

    with TestClient(app) as c:
        def get(url: str):
            r = c.get(url)
            r.raise_for_status()
            return r.json()

        for name in ["health", "cities", "indicators", "summary", "results", "pressure", "projections",
                     "methodology", "thresholds", "sources"]:
            save(name, get(f"/api/{name}"))
        for city in get("/api/cities"):
            save(f"cities/{slug(city['name'])}", get(f"/api/cities/{quote(city['name'])}"))
        for pair in {(r["city"], r["indicator"]) for r in get("/api/results")}:
            save(f"series/{slug(pair[0])}__{pair[1]}", get(f"/api/series?city={quote(pair[0])}&indicator={pair[1]}"))
    print(f"Wrote {n} files to {OUT}")


if __name__ == "__main__":
    main()
