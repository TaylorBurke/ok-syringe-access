"""CDC Viral Hepatitis Surveillance Report tables (xlsx). The 2021 report covers 2017-2021, the 2023 report covers 2019-2023."""
from common import download

TABLES = {
    "3.1": "acute hepatitis C cases and rates by state",
    "3.3": "reported risk behaviors among acute hepatitis C cases",
    "3.5": "newly reported chronic hepatitis C by state",
    "3.7": "hepatitis C deaths by state",
}
for year in (2021, 2023):
    for t in TABLES:
        download("cdc_hcv", f"{year}_table-{t}.xlsx", f"https://www.cdc.gov/hepatitis-surveillance-{year}/data/xlsx/table-{t}.xlsx")
