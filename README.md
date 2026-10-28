# ok-syringe-access

**Clean Needles, Oklahoma.** A data story arguing that Oklahoma should restore legal protection for syringe services programs, which expired on July 1, 2026 when SB 511's five-year sunset passed and HB 2012 died without a Senate vote.

## Rules
- **Advocacy, evidence-honest.** The story argues a position, but every claim is worded at the strength its evidence supports, and the weak results stay visible (the forest plot shows estimates whose intervals include no effect).
- Every number carries a source id from `sources.toml`; charts cite ids; `build_sources.py` renders the public sources page.
- Every quoted figure lives in `data/manual/claims.csv` (the claim ledger) with its verbatim quote and URL. `verify_claims.py` checks each quote against the saved source text and fails the build if one is missing.
- Prose numbers are computed in `build_site.py` from `story.json` and the ledger, never typed by hand. `build_site.py` asserts the headline claims ("first every year", "Colorado and New Mexico have the highest overdose rates") so a data refresh that breaks them stops the build.

## What the data says
- Oklahoma had the **highest hepatitis C death rate of any state every year 2017-2023** (8.94 per 100,000 in 2023 vs 2.52 nationally). CDC surveillance Table 3.7.
- It also reports the most newly reported chronic hepatitis C per person of any reporting state (145.5 vs 36.2 in 2023), but that tripled from 2021 and may reflect more testing; the page says so.
- **Overdose deaths are deliberately not used as an argument.** Oklahoma is down about 40% from its May 2023 peak, the same as the U.S.; New Mexico and Colorado, where syringe programs are legal, have the region's highest rates (the fentanyl supply reached the west later). The page shows this as context.
- Research: HIV risk 58% lower in the higher-quality studies (Aspinall 2014); for hepatitis C, syringe access alone has weak evidence, while high coverage plus medication treatment shows 74% lower risk (Cochrane 2017). Treatment entry ("5x") is one observational Seattle study, shown as such.

## Sources
| id | what it supplies |
|---|---|
| `cdc_hcv` | Viral Hepatitis Surveillance Report tables (2021 and 2023 editions): deaths, chronic and acute cases, risk exposures |
| `cdc_vsrr` | CDC provisional overdose deaths, 12-month ending, by state (predicted values, which adjust for reporting lag) |
| `census_pep` | Census Vintage 2025 state population (overdose rate denominators) |
| `lappa` | LAPPA 50-state summary of syringe services program laws, June 2026 |
| `okwatch`, `okhouse` | Oklahoma program figures and the law's history (cite-only) |
| `pubmed` | Study abstracts for every research estimate |
| `mmwr_kanawha` | CDC field report on the Kanawha County, WV outbreak |

Considered and not used: acute hepatitis C for cross-state comparison (too under-reported); NASEN/KFF program counts (self-reported, New Mexico's statewide program shows as 5 sites); a county overdose map (Tulsa County's latest months are suppressed for data quality).

## Pipeline
```
fetch/fetch_vsrr.py      CDC Socrata API     -> data/raw/cdc_vsrr/
fetch/fetch_hcv.py       CDC xlsx tables     -> data/raw/cdc_hcv/
fetch/fetch_census.py    Census PEP CSV      -> data/raw/census_pep/
fetch/fetch_lappa.py     LAPPA PDF           -> data/raw/lappa/
fetch/fetch_pubmed.py    NCBI E-utilities    -> data/raw/pubmed/
fetch/fetch_pages.py     quoted web pages    -> data/raw/{okwatch,okhouse,mmwr_kanawha}/
build_data.py            raw + data/manual/*.csv -> data/derived/story.json
verify_claims.py         every ledger quote found in its source, or exit 1
build_site.py            story.json + figures.py -> site/index.html
build_sources.py         sources.toml + manifests -> site/sources.html
```
Rebuild: `python3 build_data.py && python3 verify_claims.py && python3 build_site.py && python3 build_sources.py`, then `cd site && python3 -m http.server`.

Raw downloads are git-ignored; each source folder has a `manifest.json` (url, sha256, fetch time). Python stdlib only (`xlsx.py` reads the CDC workbooks; `verify_claims.py` needs `pdftotext`). `www.cdc.gov` rejects requests without a contact URL in the User-Agent, so `fetch/common.py` sends one.

Charts are hand-written SVG with D3 v7 vendored, built from the tech-hiring-gap kit: ranked bars, line, dumbbell, forest plot and a state map. The map uses vendored state outlines from us-atlas v3.0.1 (`states-albers-10m.json`, derived from Census cartographic boundaries, ISC license) decoded with topojson-client v3.1.0. Oklahoma is the one accent color in every chart; the rest is gray context. Palettes pass the dataviz skill's validator in light and dark (categorical and the ordinal legal-status ramp). Every chart has a table view and keyboard focus.

## Hosting
`.github/workflows/pages.yml` publishes `site/` to GitHub Pages on every push to `main`.

## License
- **Code** (the Python pipeline and `site/assets/*.js`): MIT, see `LICENSE`.
- **Text, charts and the data we derived** (`data/derived/`, the numbers in `data/manual/`, the published site): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Reuse them freely, including in news stories and advocacy, with credit to this project and a link.
- **Quotes stay with their owners.** The `quote` column in `data/manual/claims.csv` quotes LAPPA, Oklahoma Watch, the Oklahoma House and journal abstracts for verification; those words are not covered by the licenses above. CDC and Census data are public domain. Each source's terms are listed in `sources.toml`.
- **Vendored libraries** in `site/assets/vendor/` keep their own licenses: D3 and topojson-client (ISC), us-atlas state outlines (ISC).
