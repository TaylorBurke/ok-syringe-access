"""Render site/sources.html from sources.toml, each source's fetch manifest, and figures.py (which charts use it)."""
import html, json, tomllib
from pathlib import Path
from figures import FIGURES

ROOT = Path(__file__).parent
reg = tomllib.loads((ROOT / "sources.toml").read_text())
e = html.escape


def fetched(sid):
    mf = ROOT / "data" / "raw" / sid / "manifest.json"
    if not mf.exists():
        return "not fetched (dates cited, see link)"
    return e(max(i["fetched_at"] for i in json.loads(mf.read_text()))[:10])


cards = []
for sid, s in reg.items():
    used = [f'<a href="index.html#{fid}">{e(f["title"])}</a>' for fid, f in FIGURES.items() if sid in f["sources"]]
    used_html = "<br>".join(used) if used else "Not used in a chart yet"
    cards.append(f"""<article id="{e(sid)}">
  <h2>{e(s['name'])}</h2>
  <p class="pub">{e(s['publisher'])}</p>
  <dl>
    <dt>Measures</dt><dd>{e(s['measures'])}</dd>
    <dt>Caveat</dt><dd>{e(s['caveat'])}</dd>
    <dt>License</dt><dd>{e(s['license'])}</dd>
    <dt>Retrieved</dt><dd>{fetched(sid)} · access: {e(s['access'])}</dd>
    <dt>Link</dt><dd><a href="{e(s['url'])}">{e(s['url'])}</a></dd>
    <dt>Used in</dt><dd class="used-in">{used_html}</dd>
  </dl>
</article>""")

page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sources</title><link rel="icon" href="data:,"><link rel="stylesheet" href="assets/style.css"></head>
<body><div class="wrap">
<header class="mast"><p class="eyebrow"><a href="index.html">Clean Needles, Oklahoma</a></p><h1>Sources</h1>
<p class="dek">Every number on the site comes from one of the sources below. Each chart footer links here, and each source lists the charts that use it and where it falls short.</p></header>
<main class="srcs">
{''.join(cards)}
</main>
<footer><a href="index.html">Back to the story</a></footer>
</div></body></html>"""
(ROOT / "site" / "sources.html").write_text(page)
print(f"wrote site/sources.html ({len(reg)} sources)")
