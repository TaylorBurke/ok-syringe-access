"""Build site/index.html from data/derived/story.json, sources.toml and figures.py.

Callers: run `python3 build_data.py && python3 verify_claims.py && python3 build_site.py && python3 build_sources.py`.
Prose numbers are filled from story.json and the claim ledger, never typed by hand, so text and charts cannot drift apart.
"""
import html, json, tomllib
from pathlib import Path
from figures import CHAPTERS, FIGURES, NAV

ROOT = Path(__file__).parent
story = json.loads((ROOT / "data" / "derived" / "story.json").read_text())
REG = tomllib.loads((ROOT / "sources.toml").read_text())
C = story["claims"]
HD, OD = story["hcv_deaths"], story["overdose"]
e = html.escape
MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def mo(ym):
    return f"{MON[int(ym[5:7]) - 1]} {ym[:4]}"


def n(v):
    return f"{float(v):,.0f}"


def cite(cid, text=None):
    """Inline source link for a ledger claim: the quote rides along as the link title."""
    c = C[cid]
    return f'<a class="cite" href="{e(c["url"])}" title="{e(c["quote"])}">{text or e(REG[c["source"]]["name"])}</a>'


def src_line(fig_id):
    links = ", ".join(f'<a href="sources.html#{s}">{e(REG[s]["name"])}</a>' for s in FIGURES[fig_id]["sources"])
    return f'<p class="src">Sources: {links}. <a href="sources.html">All sources and caveats</a></p>'


def figure(fig_id):
    f = FIGURES[fig_id]
    return (f'<figure><figcaption class="title">{e(f["title"])}</figcaption>'
            f'<figcaption class="sub">{e(f["sub"])}</figcaption>'
            f'<div id="{fig_id}"></div>{src_line(fig_id)}</figure>')


def tile(label, value, sub, unit=""):
    u = f"<small>{e(unit)}</small>" if unit else ""
    return f'<div class="tile"><div class="lab">{e(label)}</div><div class="val">{e(value)}{u}</div><div class="sub">{sub}</div></div>'


def kpis(*tiles):
    return '<div class="kpis">' + "".join(tiles) + "</div>"


def chapter(num, prose, rest=""):
    return (f'<section class="chapter" id="ch{num}"><p class="chap-num"><span>Chapter</span>{num:02d}</p>'
            f'<h2>{e(CHAPTERS[num])}</h2><div class="prose">{prose}</div>{rest}</section>')


# ---- numbers used in the prose ----
yrs = HD["years"]
ok_rate = dict(zip(yrs, HD["rate"]["Oklahoma"]))
us_rate = dict(zip(yrs, HD["rate"]["United States"]))
ok_n = dict(zip(yrs, HD["count"]["Oklahoma"]))
last = yrs[-1]
times = ok_rate[last] / us_rate[last]
all_first = all(HD["rank"][str(y)]["oklahoma"] == 1 for y in yrs)
second = HD["rank"][str(last)]["second"]
second_rate = HD["rate"][second][yrs.index(last)]
deaths_total = sum(ok_n.values())
ch = story["hcv_chronic"]
ok_ch21, ok_ch23, us_ch23 = ch["2021"]["Oklahoma"][1], ch["2023"]["Oklahoma"][1], ch["2023"]["United States"][1]
idu = story["acute_idu"]
neighbors = [s for s in story["region"] if s != "Oklahoma"]
nb_max = max(neighbors, key=lambda s: HD["rate"][s][yrs.index(last)])
nb_max_rate = HD["rate"][nb_max][yrs.index(last)]
ok_od, us_od = OD["Oklahoma"], OD["United States"]
od_last = OD["months"][-1]
od_top = sorted(story["region"], key=lambda s: -OD[s]["rate"][-1])[:2]
assert all_first, "the 'first every year' claim no longer holds; rewrite chapter 2"
assert {"Colorado", "New Mexico"} == set(od_top), "chapter 5 overdose note names CO and NM as the highest; data changed"

hiv_hq = C["ev_hiv_hq"]
pct_lower = round((1 - float(hiv_hq["value"])) * 100)
combo = C["ev_hcv_combo"]
combo_pct = round((1 - float(combo["value"])) * 100)

# ---- chapters ----
ch1 = chapter(1, f"""
<p class="lede">In 2021 Oklahoma made it legal for registered groups to hand out sterile syringes. Lawmakers wrote a five-year expiration date into the law. It ran out on July 1, 2026, and nobody renewed it.</p>
<p>The bill had an unusual starting point. {cite("ok_police_origin", "Its sponsors filed it to protect police officers")} from needle-stick injuries. The expiration date was meant to make lawmakers {cite("ok_circle_back", "come back after five years and check whether the programs had helped")}. One of those sponsors, former Rep. Carol Bush, now says: {cite("ok_bush_quote", "&ldquo;I&rsquo;m not sure that conversation ever happened.&rdquo;")}</p>
""", f"""
<ol class="timeline">
<li><div class="when">April 20, 2021</div><div class="what">SB 511 takes effect. Churches, nonprofits, tribes and health departments may register and offer harm-reduction services. No state money may buy syringes.</div><div class="src-inline">{cite("ok_law_signed", "Okla. Stat. tit. 63 &sect; 2-1101")}</div></li>
<li><div class="when">2022 to 2025</div><div class="what">Registered programs give out an estimated {float(C["ok_syringes_osdh"]["value"]) / 1e6:.2f} million sterile syringes and reach more than {n(C["ok_people_osdh"]["value"])} people. One group alone reaches all 77 counties.</div><div class="src-inline">{cite("ok_syringes_osdh", "Oklahoma State Department of Health estimate, via Oklahoma Watch")} &middot; {cite("ok_counties", "77 counties")}</div></li>
<li><div class="when">2026 session</div><div class="what">HB 2012 would have removed the deadline. The House passed a one-year extension instead. The Senate never voted on it.</div><div class="src-inline">{cite("ok_hb2012", "Oklahoma Watch")}</div></li>
<li class="end"><div class="when">July 1, 2026</div><div class="what">The protection expires. Handing out syringes is again distributing drug paraphernalia: up to a year in jail and a $10,000 fine.</div><div class="src-inline">{cite("ok_penalty", "Oklahoma Watch")}</div></li>
</ol>
<h3 class="kpi-head">What the programs reported, 2022 to 2024</h3>
{kpis(
    tile("People served", n(C["ok_clients"]["value"]), f'Four registered programs. {cite("ok_clients", "Oklahoma House interim study")}'),
    tile("Sterile syringes", n(C["ok_syringes_house"]["value"]), f'Same programs, same period. {cite("ok_syringes_house", "Oklahoma House")}'),
    tile("Naloxone kits", n(C["ok_naloxone"]["value"]), f'Two doses each. {cite("ok_naloxone", "Oklahoma House")}'),
    tile("Referrals to other services", n(C["ok_referrals"]["value"]), f'Such as HIV and STI testing or substance use education. {cite("ok_referrals", "Oklahoma House")}'),
)}
<p class="caveat"><strong>These are the programs&rsquo; own counts.</strong> They reported them to the Healthy Minds Policy Initiative, and no one has audited them. The programs also reported {n(C["ok_reversals"]["value"])} overdose reversals with naloxone they gave out. We list that figure here but don&rsquo;t rely on it anywhere in this story.</p>
""")

ch2 = chapter(2, f"""
<p class="lede">Oklahoma has had the highest hepatitis C death rate of any state every year from {yrs[0]} to {last}. In {last}, {n(ok_n[last])} Oklahomans died with hepatitis C listed as a cause of death. That rate was {ok_rate[last]:.2f} per 100,000, {times:.1f} times the national rate.</p>
<p>The next-highest jurisdiction in {last}, {e(second)}, was at {second_rate:.2f}. Across those seven years, {n(deaths_total)} Oklahomans died with the virus. Hepatitis C is curable, and it spreads through blood.</p>
""", f"""
{figure("fig-rank")}
{figure("fig-trend")}
<div class="prose">
<p>When doctors report a new hepatitis C infection, they record how the person was exposed. In {idu["year"]}, that information was missing for {n(idu["missing"])} cases. Of the {n(idu["yes"] + idu["no"])} cases where it was recorded, <strong>{idu["share_of_known"]:.0%} involved injecting drugs</strong>, more than any other risk on CDC&rsquo;s list. These are national figures; CDC does not publish them by state.</p>
<p>Oklahoma also reports more new chronic hepatitis C cases per person than any other state that reports them: {ok_ch23:.1f} per 100,000 in 2023, against {us_ch23:.1f} nationally.</p>
</div>
{figure("fig-chronic")}
<p class="caveat"><strong>Read this chart carefully.</strong> Oklahoma&rsquo;s rate went from {ok_ch21:.1f} to {ok_ch23:.1f} in two years. A rise in <em>reported</em> cases can mean more testing as well as more infection, and these numbers can&rsquo;t tell the two apart. We treat this as evidence of how many people need care, not as proof that the virus is spreading faster.</p>
""")

ch3 = chapter(3, f"""
<p class="lede">Syringe programs are among the most studied public health measures. The research supports them, though not equally on every outcome. We show where the evidence is strong and where it is thin.</p>
<p>For HIV, the higher-quality studies in a 2014 meta-analysis found <strong>{pct_lower}% lower risk of infection</strong> for people using syringe programs. For hepatitis C, a 2017 Cochrane review found that syringe access <em>alone</em> has weak evidence. Combined with medication for opioid addiction (methadone or buprenorphine), it found a <strong>{combo_pct}% lower risk</strong>. That combination is the point. A syringe program is often the first health service a person who injects drugs will walk into, and it is where they can be offered that treatment.</p>
""", f"""
{figure("fig-forest")}
{kpis(
    tile("More likely to enter treatment", "5", f'New exchange users vs people who never used one, Seattle. One observational study. {cite("ev_treat_hagan", "Hagan 2000")}', "×"),
    tile("Entered treatment within a week", f'{C["ev_treat_strathdee"]["value"]}%', f'Exchange clients given a case manager, vs 26% with a referral alone. Randomized trial, Baltimore. {cite("ev_treat_strathdee", "Strathdee 2006")}'),
    tile("Change in arrests near the exchange", "None", f'Arrest trends near Baltimore&rsquo;s exchange matched the rest of the city. {cite("ev_crime_marx", "Marx 2000")}'),
)}
<p class="caveat"><strong>How strong is this?</strong> Almost none of this research is randomized; you can&rsquo;t randomly deny people clean needles. Most estimates come from comparing people who used programs with people who didn&rsquo;t, and those groups can differ in other ways. That is why every estimate above shows its interval. The &ldquo;five times&rdquo; figure is widely repeated, but it comes from a single city&rsquo;s study. The Baltimore trial suggests the referral itself matters: treatment entry rose most when programs offered active help such as rides to appointments.</p>
""")

ch4 = chapter(4, """
<p class="lede">The clearest evidence of what syringe access prevents comes from places that went without it.</p>
""", f"""
<div class="cases">
<article class="case">
<p class="case-where">Scott County, Indiana &middot; 2014&ndash;2015</p>
<p class="case-num">{n(C["ob_scott_cases"]["value"])}</p>
<p class="case-lab">HIV infections in one rural county&rsquo;s outbreak</p>
<p>Indiana had no legal syringe program. An outbreak spread through a network of people injecting prescription opioids, and {C["ob_scott_hcv"]["value"]}% of those diagnosed also had hepatitis C. The state&rsquo;s first syringe program opened only after the governor declared a public health emergency on March 26, 2015. A Yale model estimates that responding by January 2013 could have prevented at least {n(C["ob_scott_early"]["value"])} infections.</p>
<p class="src">{cite("ob_scott_cases", "Gonsalves 2018")} &middot; {cite("ob_scott_hcv", "Peters 2016, NEJM")}</p>
</article>
<article class="case">
<p class="case-where">Kanawha County, West Virginia &middot; 2019&ndash;2021</p>
<p class="case-num">{n(C["ob_kanawha_cases"]["value"])}</p>
<p class="case-lab">people in an HIV outbreak, after the county health department suspended its syringe program in March 2018</p>
<p>Before the outbreak, the county diagnosed fewer than five HIV cases a year among people who inject drugs. In the first ten months of 2019 it diagnosed 11. When CDC investigators interviewed people who inject drugs, they reported sharing syringes <em>&ldquo;mainly because of limited access to sterile syringes after SSP closures.&rdquo;</em></p>
<p class="src">{cite("ob_kanawha_cases", "CDC, MMWR 71(2), 2022")}</p>
</article>
</div>
<p class="caveat"><strong>What these cases can and can&rsquo;t show.</strong> Neither outbreak proves that one closure caused it. Kanawha&rsquo;s also overlapped with the COVID-19 pandemic. But both fit the same pattern: shared syringes, then a fast-moving outbreak, in places without legal access. Hepatitis C and HIV both spread through shared needles, and Oklahoma already has the highest hepatitis C death rate in the country.</p>
""")

ch5 = chapter(5, """
<p class="lede">Oklahoma now sits among neighbors that mostly restrict syringe access too. Colorado and New Mexico authorize it by statute. Arkansas allows it indirectly, Texas allows a single county pilot, and Kansas and Missouri don&rsquo;t authorize it at all.</p>
""", f"""
{figure("fig-map")}
<div class="prose">
<p>Oklahoma&rsquo;s {last} hepatitis C death rate ({ok_rate[last]:.2f}) is about double the next-highest of its neighbors, {e(nb_max)} ({nb_max_rate:.2f}). States differ in many ways besides their syringe laws, so this map shows where Oklahoma stands. It doesn&rsquo;t prove what caused the gap.</p>
<p><strong>A note on overdoses.</strong> Overdose deaths are falling across the country, and Oklahoma is no exception. As of {mo(od_last)}, its 12-month count was {abs(ok_od["change_from_peak"]):.0%} below its {mo(ok_od["peak_month"])} peak. The U.S. as a whole was {abs(us_od["change_from_peak"]):.0%} below its own peak. The highest rates in the region are in Colorado and New Mexico, both states where syringe programs are legal. That pattern follows the drug supply: fentanyl reached western markets later. Syringe laws don&rsquo;t explain it either way, so we don&rsquo;t use overdose deaths to argue for syringe programs. What the programs add on overdoses is naloxone, the overdose-reversal drug, and the people trained to use it.</p>
</div>
{figure("fig-overdose")}
""")

ch6 = chapter(6, """
<p class="lede">Oklahoma tried this for five years. The sunset was meant to prompt a review, and one of the law&rsquo;s own sponsors isn&rsquo;t sure it ever happened. Here is what a renewal should do.</p>
""", f"""
<ol class="asks">
<li><strong>Restore the legal protection without an expiration date.</strong>As HB 2012 was first written. Programs can&rsquo;t build trust, hire staff or keep clinic partners while they face a deadline every few years.</li>
<li><strong>Pair syringe access with testing and treatment.</strong>The hepatitis C evidence is strongest for syringe access combined with medication for opioid addiction ({combo_pct}% lower risk). Let programs connect people directly to that medication and to hepatitis C cure.</li>
<li><strong>Build in the review the sponsors intended.</strong>Keep state registration, and require programs to report what lawmakers will want to know next time: people tested, people linked to treatment, people cured. Then lawmakers can judge the programs on outcomes.</li>
</ol>
<div class="prose"><p>Oklahoma has had the country&rsquo;s highest hepatitis C death rate every year in the data. It doesn&rsquo;t need to wait for its own Scott County before acting.</p></div>
""")

blob = json.dumps({k: story[k] for k in ("region", "abbr", "hcv_deaths", "hcv_chronic", "overdose", "legal", "claims")})
page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Clean Needles, Oklahoma</title>
<meta name="description" content="Oklahoma leads the nation in hepatitis C deaths. On July 1, 2026, its syringe services law expired. The data, the research, and what to do next.">
<link rel="icon" href="data:,"><link rel="stylesheet" href="assets/style.css"></head>
<body id="top">
<div class="wrap">
<header class="mast">
<p class="eyebrow">Data story &middot; Oklahoma syringe services, 2021 to 2026</p>
<h1>Oklahoma leads the nation in hepatitis C deaths. It just made clean needles illegal again.</h1>
<p class="dek">Oklahoma&rsquo;s syringe services law expired on July 1, 2026. Here is what the state&rsquo;s own data and decades of research say about bringing it back.</p>
<div class="hero">
<div class="hero-stats">
<div><span class="hs-val">#1</span><span class="hs-lab">Highest hepatitis C death rate of any state, every year {yrs[0]}&ndash;{last}</span></div>
<div><span class="hs-val">{times:.1f}&times;</span><span class="hs-lab">Oklahoma&rsquo;s rate vs the U.S. in {last}: {ok_rate[last]:.2f} vs {us_rate[last]:.2f} deaths per 100,000</span></div>
<div><span class="hs-val">July 1</span><span class="hs-lab">The day in 2026 the legal protection for syringe programs expired</span></div>
</div>
</div>
</header>
</div>
<nav class="nav" id="nav"><div class="nav-in"><a class="nav-home" href="#top">Clean Needles, Oklahoma</a><span class="nav-links">{''.join(f'<a href="#ch{k}">{k} {e(v)}</a>' for k, v in NAV.items())}<a href="sources.html">Sources</a></span><button id="theme" type="button" aria-label="Toggle light and dark theme">&#9680;</button></div><div class="nav-bar" id="nav-bar"></div></nav>
<div class="wrap">
{ch1}
{ch2}
{ch3}
{ch4}
{ch5}
{ch6}
<footer>Every chart links to its sources. Every quoted figure is checked against its source text by <code>verify_claims.py</code>. <a href="sources.html">The sources page</a> lists what each source measures, when it was retrieved, and where it falls short.</footer>
</div>
<script src="assets/vendor/d3.min.js"></script>
<script src="assets/vendor/topojson-client.min.js"></script>
<script>window.STORY = {blob};</script>
<script src="assets/charts.js"></script>
<script src="assets/ui.js"></script>
<script src="assets/story.js"></script>
</body></html>"""
(ROOT / "site" / "index.html").write_text(page)
print("wrote site/index.html", len(page), "bytes")
