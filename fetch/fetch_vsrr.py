"""CDC NCHS provisional drug overdose deaths (VSRR) via the Socrata API: state 12-month-ending counts and county counts."""
from urllib.parse import quote
from common import download

# Oklahoma, every state that borders it, and the U.S. total.
STATES = ["OK", "TX", "AR", "KS", "MO", "CO", "NM", "US"]
inlist = ",".join(f"'{s}'" for s in STATES)

state_q = f"$where=state in({inlist})&$limit=200000"
download("cdc_vsrr", "state.csv", "https://data.cdc.gov/resource/xkb8-kh2a.csv?" + quote(state_q, safe="=&$"))

county_q = f"$where=st_abbrev in({inlist})&$limit=500000"
download("cdc_vsrr", "county.csv", "https://data.cdc.gov/resource/gb4e-yj24.csv?" + quote(county_q, safe="=&$"))
