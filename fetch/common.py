"""Shared helpers: download a file and record where it came from."""
import hashlib, json, urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
UA = "ok-syringe-access/0.1 (+https://github.com/TaylorBurke/ok-syringe-access)"


def download(source_id, name, url, data=None, headers=None):
    """Save url to data/raw/<source_id>/<name> and append to that source's manifest."""
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        body = r.read()
    out = RAW / source_id
    out.mkdir(parents=True, exist_ok=True)
    (out / name).write_bytes(body)
    entry = {
        "file": name, "url": url, "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    mf = out / "manifest.json"
    items = [e for e in (json.loads(mf.read_text()) if mf.exists() else []) if e["file"] != name]
    mf.write_text(json.dumps(items + [entry], indent=2))
    print(f"{source_id}/{name}: {len(body):,} bytes")
    return body
