"""
One command to build the hostable site:   py build_site.py        (add --zip to also make esi-site.zip)

Steps: refresh CITATIONS.md -> export API data to static JSON -> build the front end in static mode.
Result: renderer/dist  (upload that folder to Netlify Drop, GitHub Pages, Cloudflare Pages, Vercel ...)
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SERVER, RENDERER = ROOT / "server", ROOT / "renderer"


def run(cmd, cwd: Path, label: str) -> None:
    print(f"\n==> {label}", flush=True)
    if subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str)).returncode:
        sys.exit(f"\nFAILED: {label}")


def main() -> None:
    try:
        import httpx  # noqa: F401  (needed by the static exporter)
    except ImportError:
        sys.exit("Missing packages. Run:  pip install -r requirements.txt")

    if not (SERVER / "output" / "results.csv").exists():
        run([sys.executable, "run.py"], SERVER, "Run the analysis pipeline (no cached results found)")
    run([sys.executable, "export_citations.py"], SERVER, "Refresh CITATIONS.md")
    run([sys.executable, "export_static.py"], SERVER, "Export data to static JSON")
    if not (RENDERER / "node_modules").exists():
        run("npm install", RENDERER, "Install front-end packages")
    run("npx vite build --mode static", RENDERER, "Build the site")

    dist = RENDERER / "dist"
    if not (dist / "index.html").exists():
        sys.exit("Build finished but renderer/dist/index.html is missing.")
    if "--zip" in sys.argv:
        archive = shutil.make_archive(str(ROOT / "esi-site"), "zip", dist)
        print(f"\nZip: {archive}")
    print(f"\nDONE. Upload this folder to your static host:\n  {dist}")


if __name__ == "__main__":
    main()
