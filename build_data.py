"""Clean raw downloads and hand-entered tables into data/derived/story.json, the single input to the site."""
import csv, json, re
from pathlib import Path
from xlsx import rows

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"
MANUAL = ROOT / "data" / "manual"
OUT = ROOT / "data" / "derived"

REGION = ["Oklahoma", "Texas", "Arkansas", "Kansas", "Missouri", "Colorado", "New Mexico"]
ABBR = {"Oklahoma": "OK", "Texas": "TX", "Arkansas": "AR", "Kansas": "KS", "Missouri": "MO", "Colorado": "CO", "New Mexico": "NM"}
MONTHS = {m: i for i, m in enumerate("January February March April May June July August September October November December".split(), 1)}
# 50 states + DC; CDC tables also carry territories and footnote rows we drop.
STATES = set("""Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia Hawaii Idaho Illinois Indiana Iowa
Kansas Kentucky Louisiana Maine Maryland Massachusetts Michigan Minnesota Mississippi Missouri Montana Nebraska Nevada Ohio Oklahoma Oregon
Pennsylvania Tennessee Texas Utah Vermont Virginia Washington Wisconsin Wyoming""".split()) | {
    "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Rhode Island", "South Carolina",
    "South Dakota", "West Virginia", "District of Columbia"}


def num(x):
    """CDC cells: '1,234', '0.5', '—'/'-' (no cases), 'N' (not reportable), 'U' (unavailable) -> float or None."""
    x = (x or "").replace(",", "").strip()
    try:
        return float(x)
    except ValueError:
        return None


def cdc_table(path):
    """Year-by-state CDC table (No., Rate pairs) -> {state: {year: (count, rate)}}, plus the U.S. total under 'United States'."""
    r = rows(path)
    # Each year heads two columns (No., Rate), so keep the first occurrence only.
    years = list(dict.fromkeys(int(re.match(r"\d{4}", c).group()) for c in r[1][2:] if re.match(r"\d{4}", c)))
    out = {}
    for row in r[3:]:
        if len(row) < 3:
            continue
        name = "United States" if row[1] == "Total" else row[1]
        if name not in STATES and name != "United States":
            continue
        vals = row[2:]
        out[name] = {y: (num(vals[2 * i]), num(vals[2 * i + 1])) for i, y in enumerate(years) if 2 * i + 1 < len(vals)}
    return out


def single_year(path):
    """Single-year CDC table (state, No., Rate) -> {state: (count, rate)}."""
    out = {}
    for row in rows(path)[2:]:
        if len(row) >= 4:
            name = "United States" if row[1] == "Total" else row[1]
            if name in STATES or name == "United States":
                out[name] = (num(row[2]), num(row[3]))
    return out


# --- Hepatitis C deaths, 2017-2023 (2021 report covers 2017-21, 2023 report covers 2019-23; the newer edition wins on overlap)
deaths = {}
for edition in ("2021", "2023"):
    for st, by_year in cdc_table(RAW / "cdc_hcv" / f"{edition}_table-3.7.xlsx").items():
        deaths.setdefault(st, {}).update(by_year)
death_years = sorted({y for v in deaths.values() for y in v})

# Overlap check: 2019-2021 appear in both editions; rates should agree closely.
old = cdc_table(RAW / "cdc_hcv" / "2021_table-3.7.xlsx")
drift = max(abs(old[s][y][1] - deaths[s][y][1]) for s in old for y in (2019, 2020, 2021)
            if old[s].get(y, (None, None))[1] is not None and deaths[s].get(y, (None, None))[1] is not None)
assert drift < 0.5, f"2021 vs 2023 editions disagree on overlapping death rates by {drift}"

rank = {}
for y in death_years:
    ranked = sorted((s for s in deaths if s in STATES and deaths[s].get(y, (None, None))[1] is not None),
                    key=lambda s: -deaths[s][y][1])
    rank[y] = {"oklahoma": ranked.index("Oklahoma") + 1, "of": len(ranked), "second": ranked[1] if ranked[0] == "Oklahoma" else ranked[0]}

hcv_deaths = {
    "years": death_years,
    "rate": {s: [deaths[s].get(y, (None, None))[1] for y in death_years] for s in deaths},
    "count": {s: [deaths[s].get(y, (None, None))[0] for y in death_years] for s in deaths},
    "rank": rank,
}

# --- Newly reported chronic hepatitis C (testing-dependent, shown with that caveat)
chronic = {ed: single_year(RAW / "cdc_hcv" / f"{ed}_table-3.5.xlsx") for ed in ("2021", "2023")}

# --- Share of acute cases with injection drug use, among cases with risk information (national)
idu = next(r for r in rows(RAW / "cdc_hcv" / "2023_table-3.3.xlsx") if len(r) > 1 and r[1] == "Injection drug use")
idu_yes, idu_no, idu_missing = (num(v) for v in idu[2:5])
acute_idu = {"year": 2023, "yes": idu_yes, "no": idu_no, "missing": idu_missing, "share_of_known": idu_yes / (idu_yes + idu_no)}

# --- Overdose deaths: 12-month-ending counts and rates, 2019 onward
pop = {}
with open(RAW / "census_pep" / "co-est2025-alldata.csv", encoding="latin-1") as f:
    for r in csv.DictReader(f):
        if r["SUMLEV"] == "040":
            pop[r["STNAME"]] = {y: int(r[f"POPESTIMATE{y}"]) for y in range(2020, 2026)}
pop["United States"] = {y: sum(p[y] for s, p in pop.items() if s in STATES) for y in range(2020, 2026)}

od = {}
with open(RAW / "cdc_vsrr" / "state.csv") as f:
    for r in csv.DictReader(f):
        if r["indicator"] != "Number of Drug Overdose Deaths" or int(r["year"]) < 2020:
            continue
        name = "United States" if r["state"] == "US" else r["state_name"]
        y, m = int(r["year"]), MONTHS[r["month"]]
        p = pop[name][min(max(y, 2020), 2025)]
        # CDC's predicted value adjusts the newest, still-incomplete months for reporting delays; reported counts would overstate the decline.
        n = float(r["predicted_value"] or r["data_value"])
        od.setdefault(name, {})[f"{y}-{m:02d}"] = {"n": n, "rate": round(n / p * 1e5, 2)}
months = sorted(set.intersection(*(set(v) for v in od.values())))
overdose = {"months": months}
for s, series in od.items():
    peak = max(months, key=lambda k: series[k]["n"])
    overdose[s] = {
        "rate": [series[k]["rate"] for k in months], "n": [series[k]["n"] for k in months],
        "peak_month": peak, "peak_n": series[peak]["n"], "latest_n": series[months[-1]]["n"],
        "change_from_peak": round(series[months[-1]]["n"] / series[peak]["n"] - 1, 4),
    }

# --- Hand-entered tables
with open(MANUAL / "legal_status.csv") as f:
    legal = list(csv.DictReader(f))
with open(MANUAL / "claims.csv") as f:
    claims = {r["id"]: r for r in csv.DictReader(f)}

story = {
    "region": REGION, "abbr": ABBR,
    "hcv_deaths": hcv_deaths, "hcv_chronic": chronic, "acute_idu": acute_idu,
    "overdose": overdose, "legal": legal, "claims": claims,
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "story.json").write_text(json.dumps(story, indent=1))

r23 = rank[2023]
print(f"HCV deaths: Oklahoma ranked {r23['oklahoma']} of {r23['of']} in 2023; ranks by year {[rank[y]['oklahoma'] for y in death_years]}")
print(f"Overdose months {months[0]}..{months[-1]}; OK change from peak {overdose['Oklahoma']['change_from_peak']:+.0%}, "
      f"US {overdose['United States']['change_from_peak']:+.0%}")
print(f"Acute HCV with injection drug use, among cases with risk data: {acute_idu['share_of_known']:.0%}")
