"""Check that every quote in data/manual/*.csv appears in the raw source it cites. Exits 1 if any quote is missing."""
import csv, html, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"


def norm(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    for a, b in {"’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "·": ".", " ": " ", " ": " "}.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip().lower()


def text(source):
    if source == "pubmed":
        return (RAW / "pubmed" / "abstracts.txt").read_text()
    if source == "lappa":
        pdf = next((RAW / "lappa").glob("*.pdf"))
        return subprocess.run(["pdftotext", "-raw", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
    return "".join(p.read_text(errors="ignore") for p in (RAW / source).glob("*.htm*"))


cache, missing, checked = {}, [], 0
for name in ("claims.csv", "legal_status.csv"):
    with open(ROOT / "data" / "manual" / name) as f:
        for row in csv.DictReader(f):
            src = row["source"]
            hay = cache.setdefault(src, norm(text(src)))
            # "..." in a quote marks an elision; each fragment must appear on its own.
            for frag in (p.strip() for p in row["quote"].split("...")):
                checked += 1
                if norm(frag) not in hay:
                    missing.append((name, row.get("id") or row.get("state"), src, frag))

for m in missing:
    print("MISSING", *m, sep=" | ")
print(f"{checked - len(missing)} of {checked} quote fragments found in their sources")
sys.exit(1 if missing else 0)
