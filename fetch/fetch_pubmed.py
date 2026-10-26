"""PubMed abstracts for the studies the evidence chapter cites (NCBI E-utilities). Kept so every quoted figure can be checked."""
from common import download

PMIDS = {
    "24374889": "Aspinall 2014, needle/syringe programmes and HIV, meta-analysis",
    "28922449": "Platt 2017, Cochrane review, NSP and OST for hepatitis C",
    "11027894": "Hagan 2000, Seattle syringe exchange and drug treatment entry",
    "16364566": "Strathdee 2006, Baltimore needle exchange referral to treatment",
    "11111271": "Marx 2000, Baltimore needle exchange and crime",
    "28399843": "Fernandes 2017, review of syringe exchange effectiveness",
    "27468059": "Peters 2016, Scott County Indiana HIV outbreak (NEJM)",
    "27763996": "Van Handel 2016, county vulnerability assessment",
    "35025854": "Atkins 2022 MMWR, Kanawha County WV HIV outbreak",
    "30220531": "Gonsalves 2018, Scott County outbreak dynamics model",
}
ids = ",".join(PMIDS)
base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=" + ids
download("pubmed", "abstracts.txt", base + "&rettype=abstract&retmode=text")
download("pubmed", "records.xml", base + "&retmode=xml")
