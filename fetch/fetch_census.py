"""Census Bureau population estimates, counties and states, Vintage 2025 (denominators for rates)."""
from common import download

download("census_pep", "co-est2025-alldata.csv",
         "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/totals/co-est2025-alldata.csv")
