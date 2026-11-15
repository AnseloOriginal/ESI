"""Write CITATIONS.md (project root) from sources.py and thresholds.py:  py server/export_citations.py"""
from sources import ACKNOWLEDGEMENT, AI_DISCLOSURE, CATEGORIES, SOURCES
from settings import BASE_DIR
from thresholds import THRESHOLDS


def line(ref: str, used: str, url: str) -> str:
    link = f" <{url}>" if url else ""
    return f"- {ref}{link}\n  *Used for:* {used}"


def main() -> None:
    out = ["# Citations and acknowledgements\n", ACKNOWLEDGEMENT + "\n"]
    unverified: list[str] = []
    for key, title in CATEGORIES.items():
        out.append(f"\n## {title}\n")
        for s in (s for s in SOURCES if s.category == key):
            out.append(line(s.reference, s.used_for, s.url))
            if not s.verified:
                unverified.append(s.id)
    out.append("\n## Research behind the habitability thresholds\n")
    seen: set[str] = set()
    for t in THRESHOLDS:
        c = t.citation
        if c.title in seen:
            continue
        seen.add(c.title)
        ref = f"{c.authors} ({c.year}). {c.title}. {c.venue}."
        note = "Not used in calculations." if not t.active else "Used for the years-to-threshold projection."
        out.append(line(ref, f"{t.label}. {note}", c.url))
        if not c.verified:
            unverified.append(c.title[:40])
    out.append(f"\n## AI-tool disclosure\n\n{AI_DISCLOSURE}\n")
    path = BASE_DIR.parent / "CITATIONS.md"
    path.write_text("\n".join(out), encoding="utf-8")
    print(f"Wrote {path}")
    if unverified:
        print("Confirm these before submitting (details not yet checked):", ", ".join(unverified))


if __name__ == "__main__":
    main()
