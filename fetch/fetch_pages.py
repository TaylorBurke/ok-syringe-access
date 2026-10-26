"""Web pages the claim ledger quotes, saved so verify_claims.py can check every quote against the text (kept out of git)."""
from common import download

PAGES = {
    "mmwr_kanawha": ("mm7102a4.html", "https://www.cdc.gov/mmwr/volumes/71/wr/mm7102a4.htm"),
    "okhouse": ("news-20241011_2.html", "https://www.okhouse.gov/posts/news-20241011_2"),
    # Oklahoma Watch rate-limits; the Tulsa Flyer republication carries the same text.
    "okwatch": ("harm-reduction-law-expires.html", "https://tulsaflyer.org/2026/07/04/news/post/oklahoma-harm-reduction-law-expires/"),
}
for sid, (name, url) in PAGES.items():
    download(sid, name, url)
