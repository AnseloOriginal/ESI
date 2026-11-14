"""Write the API description to a file (no server needed):  py server/export_openapi.py [out.json]
Default output: server/openapi.json"""
import json
import sys
from pathlib import Path

from api import app
from settings import BASE_DIR

out = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE_DIR / "openapi.json"
out.write_text(json.dumps(app.openapi(), indent=2), encoding="utf-8")
print(f"Wrote {out.resolve()}")
