"""Figure registry: which sources feed which chart. Drives figure footers and the 'used in' lists on the sources page."""

FIGURES = {
    "fig-rank": {"chapter": 2, "title": "Oklahoma has the highest hepatitis C death rate in the country",
        "sub": "Deaths with hepatitis C listed as a cause, per 100,000 residents, age-adjusted, 2023. All 50 states and D.C.", "sources": ["cdc_hcv"]},
    "fig-trend": {"chapter": 2, "title": "First in the nation every year since at least 2017",
        "sub": "Hepatitis C death rate per 100,000, age-adjusted, Oklahoma and the United States", "sources": ["cdc_hcv"]},
    "fig-chronic": {"chapter": 2, "title": "Oklahoma now reports more new chronic hepatitis C cases per person than any other reporting state",
        "sub": "Newly reported chronic hepatitis C cases per 100,000 residents, 2021 and 2023, Oklahoma and its neighbors", "sources": ["cdc_hcv"]},
    "fig-forest": {"chapter": 3, "title": "What the research finds, with its uncertainty shown",
        "sub": "Risk of infection with each measure compared with without it. Squares are estimates, lines are 95% intervals. Left of 1 means lower risk", "sources": ["pubmed"]},
    "fig-map": {"chapter": 5, "title": "Since July 1, Oklahoma has joined the states with no legal syringe access",
        "sub": "Whether state law authorizes syringe services programs, Oklahoma and the six states that border it, with each state's 2023 hepatitis C death rate", "sources": ["lappa", "cdc_hcv"]},
    "fig-overdose": {"chapter": 5, "title": "Overdose deaths are falling everywhere, including here",
        "sub": "Drug overdose deaths in the previous 12 months per 100,000 residents, by month. Oklahoma, the U.S., and neighboring states in gray", "sources": ["cdc_vsrr", "census_pep"]},
}

CHAPTERS = {1: "The lapse", 2: "The burden", 3: "The evidence", 4: "When access ends", 5: "The neighbors", 6: "The ask"}
NAV = {1: "Lapse", 2: "Burden", 3: "Evidence", 4: "Outbreaks", 5: "Neighbors", 6: "Ask"}
