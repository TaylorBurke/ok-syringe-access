/* Per-figure chart specs. Data arrives as window.STORY (data/derived/story.json). */
(function () {
  const S = window.STORY;
  const OK = "Oklahoma", US = "United States";
  const HD = S.hcv_deaths;
  const yr = (k) => k.slice(0, 4);
  const one = (v) => Charts.fmtNum(v, 1);
  const two = (v) => Charts.fmtNum(v, 2);
  const at = (state, year) => HD.rate[state][HD.years.indexOf(year)];
  const SHORT = { "District of Columbia": "D.C.", "New Hampshire": "N. Hampshire", "North Carolina": "N. Carolina", "South Carolina": "S. Carolina",
    "North Dakota": "N. Dakota", "South Dakota": "S. Dakota", "Massachusetts": "Mass.", "Pennsylvania": "Penn.", "Connecticut": "Conn." };
  const claim = (id) => S.claims[id];

  const figs = {
    /* Chapter 2 */
    "fig-rank": () => Charts.hbars(document.getElementById("fig-rank"), {
      label: "Ranked bar chart of 2023 hepatitis C death rates for all 50 states and D.C.; Oklahoma is first",
      items: Object.keys(HD.rate).filter((s) => s !== US && at(s, 2023) != null).map((s) => ({
        name: s, short: SHORT[s], v: at(s, 2023), hi: s === OK, near: S.region.includes(s) && s !== OK,
        extra: s === OK ? `${Math.round(at(OK, 2023) / at(US, 2023) * 10) / 10}× the U.S. rate` : "",
      })),
      refs: [{ value: at(US, 2023), label: `U.S. ${two(at(US, 2023))}` }],
      valueFormat: two, unit: "deaths per 100,000",
    }),

    "fig-trend": () => Charts.line(document.getElementById("fig-trend"), {
      label: "Line chart of hepatitis C death rates, Oklahoma versus the United States, 2017 to 2023",
      series: [OK, US].map((s) => ({ name: s === US ? "U.S." : s, color: s === OK ? "--s1" : "--context", data: HD.years.map((y, i) => [y + "-01", HD.rate[s][i]]) })),
      xDomain: [HD.years[0] + "-01", HD.years[HD.years.length - 1] + "-01"], endLabels: true, height: 280, yMin: 0,
      valueFormat: two, xFormat: yr, xName: "Year",
    }),

    "fig-chronic": () => Charts.dumbbell(document.getElementById("fig-chronic"), {
      label: "Dumbbell chart of newly reported chronic hepatitis C rates in 2021 and 2023 for Oklahoma, its neighbors and the U.S.",
      items: [OK, ...S.region.filter((s) => s !== OK).sort((a, b) => (S.hcv_chronic["2023"][b][1] || 0) - (S.hcv_chronic["2023"][a][1] || 0)), US].map((s) => ({
        name: s === US ? "U.S." : s, a: S.hcv_chronic["2021"][s][1], b: S.hcv_chronic["2023"][s][1], hi: s === OK, label: s === US,
      })),
      aName: "2021", bName: "2023", valueFormat: one, missing: "Texas does not report chronic cases",
    }),

    /* Chapter 3 */
    "fig-forest": () => {
      const row = (id, group, label, note) => { const c = claim(id); return { group, label, note, rr: +c.value, lo: +c.low, hi: +c.high }; };
      Charts.forest(document.getElementById("fig-forest"), {
        domain: [0.05, 2.5], ticks: [0.1, 0.25, 0.5, 1, 2], lowText: "lower risk", highText: "higher risk",
        axisLabel: "Risk ratio (log scale). 1 = no difference",
        rows: [
          row("ev_hiv_hq", "HIV", "Syringe programs, six higher-quality studies", "Aspinall 2014, meta-analysis"),
          row("ev_hiv_all", "HIV", "Syringe programs, all 12 studies", "Aspinall 2014, meta-analysis"),
          row("ev_hcv_combo", "Hepatitis C", "High syringe coverage plus medication treatment", "Cochrane 2017, 3 studies"),
          row("ev_hcv_ost", "Hepatitis C", "Medication treatment (methadone, buprenorphine)", "Cochrane 2017, 12 studies"),
          row("ev_hcv_nsp_eu", "Hepatitis C", "High syringe coverage, European studies", "Cochrane 2017"),
          row("ev_hcv_nsp_all", "Hepatitis C", "High syringe coverage alone, North America and Europe", "Cochrane 2017, 5 studies, very low quality"),
        ],
      });
    },

    /* Chapter 5 */
    "fig-map": () => {
      const POS = { CO: [0, 0], KS: [1, 0], MO: [2, 0], NM: [0, 1], OK: [1, 1], AR: [2, 1], TX: [1, 2] };
      const TINY = { legal: "Authorized", indirect: "Indirect", county_pilot: "Pilot only", none: "None", expired: "Expired" };
      const SHORTLAB = { legal: "Authorized", indirect: "Indirect only", county_pilot: "One-county pilot", none: "Not authorized", expired: "Expired July 1" };
      Charts.tilemap(document.getElementById("fig-map"), {
        label: "Tile map of Oklahoma and its six neighbors colored by whether state law authorizes syringe services programs",
        classes: [
          { id: "legal", name: "Authorized by statute", color: "--ord-3" },
          { id: "indirect", name: "Indirectly allowed", color: "--ord-2" },
          { id: "county_pilot", name: "One-county pilot", color: "--ord-1" },
          { id: "none", name: "Not authorized", color: "--none" },
          { id: "expired", name: "Expired July 1, 2026", color: "--none", ring: true },
        ],
        tiles: S.legal.map((l) => {
          const r = at(l.state, 2023);
          return {
            abbr: l.abbr, name: l.state, status: l.status, col: POS[l.abbr][0], row: POS[l.abbr][1],
            lines: [SHORTLAB[l.status], `HCV deaths ${two(r)}`],
            linesShort: [TINY[l.status], `HCV ${two(r)}`],
            tip: [l.label, `Hepatitis C deaths 2023: ${two(r)} per 100,000`, l.statute, l.since ? `Since ${l.since.slice(0, 4)}` : ""].filter(Boolean),
            cells: [l.state, l.label, l.since ? l.since.slice(0, 4) : "—", l.statute, two(r)],
          };
        }),
        tableCols: ["State", "Legal status", "Since", "Statute", "HCV deaths per 100k, 2023"],
      });
    },

    "fig-overdose": () => {
      const O = S.overdose, months = O.months;
      const ser = (s, color, extra) => Object.assign({ name: s === US ? "U.S." : s, color, data: months.map((m, i) => [m, O[s].rate[i]]) }, extra || {});
      // Oklahoma and the U.S. end within a few tenths of each other, so their labels are offset apart; the dots carry identity.
      const below = O[OK].rate[months.length - 1] < O[US].rate[months.length - 1];
      const main = [ser(OK, "--s1", { labelDy: below ? 9 : -6 }), ser(US, "--s2", { labelDy: below ? -6 : 9 })];
      const ctx = S.region.filter((s) => s !== OK).map((s) => ser(s, "--context", { noEnd: true, opacity: 0.45,
        endText: O[s].rate[months.length - 1] > O[US].rate[months.length - 1] + 6 ? s : "" }));
      Charts.line(document.getElementById("fig-overdose"), {
        label: "Line chart of overdose death rates per 100,000, Oklahoma, the U.S. and neighboring states, 2020 to 2026",
        series: [...ctx, ...main], legend: main, xDomain: [months[0], months[months.length - 1]], endLabels: true, height: 320, yMin: 0,
        valueFormat: one,
      });
    },
  };

  function renderAll() { Object.entries(figs).forEach(([id, f]) => { if (document.getElementById(id)) f(); }); }
  window.__rerender = renderAll;
  renderAll();
  let w = innerWidth;
  addEventListener("resize", () => { if (Math.abs(innerWidth - w) > 40) { w = innerWidth; renderAll(); } });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
})();
