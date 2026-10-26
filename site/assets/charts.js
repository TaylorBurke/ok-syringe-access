/* Chart kit for ok-syringe-access (adapted from tech-hiring-gap). Plain SVG + d3 scales/shapes (vendored d3 v7).
   Specs follow the dataviz skill: 2px lines, >=8px end dots with a 2px surface ring,
   hairline solid grid, thin columns with 4px data-end radius, hover crosshair/tooltip,
   keyboard focus, and a table view for every chart. Text never wears the series color. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const parse = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtMonth = (ym) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  const fmtNum = (v, dec = 0) => d3.format(dec ? `,.${dec}f` : ",.0f")(v);

  /* ---------- shared pieces ---------- */
  function mount(host, spec) {
    host.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "chart";
    host.appendChild(wrap);
    const keyed = spec.legend || spec.series;   // spec.legend: only the series worth a key (context lines go unlisted)
    if (keyed && keyed.length > 1 && !spec.noLegend) wrap.appendChild(legend(keyed));
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", spec.label);
    svg.setAttribute("tabindex", "0");
    wrap.appendChild(svg);
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.hidden = true;
    wrap.appendChild(tip);
    return { wrap, svg, tip };
  }

  function legend(series) {
    const ul = document.createElement("ul");
    ul.className = "legend";
    series.forEach((s) => {
      const li = document.createElement("li");
      const key = document.createElement("span");
      key.className = "key line";
      key.style.background = css(s.color);
      li.appendChild(key);
      li.appendChild(document.createTextNode(s.name));
      ul.appendChild(li);
    });
    return ul;
  }

  function tooltip(tip, wrap, x, y, title, rows) {
    tip.textContent = "";
    const h = document.createElement("div");
    h.className = "tip-title";
    h.textContent = title;
    tip.appendChild(h);
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "tip-row";
      if (r.color) {
        const k = document.createElement("span");
        k.className = "key line";
        k.style.background = css(r.color);
        row.appendChild(k);
      }
      const v = document.createElement("strong");
      v.textContent = r.value;
      row.appendChild(v);
      const n = document.createElement("span");
      n.className = "tip-name";
      n.textContent = r.name;
      row.appendChild(n);
      tip.appendChild(row);
    });
    tip.hidden = false;
    const w = wrap.clientWidth, tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(w - tw, x + 14)) + "px";
    tip.style.top = Math.max(0, y - 10) + "px";
  }

  function axisX(g, x, h, w, years) {
    const per = w / Math.max(1, years[1] - years[0]);       // pixels per year
    const step = Math.max(1, Math.ceil(44 / per));          // thin the labels so they never collide
    const ticks = d3.range(years[0], years[1] + 1).filter((y) => (y - years[0]) % step === 0).map((y) => new Date(y, 0, 1));
    ticks.forEach((t) => {
      const px = x(t);
      if (px < -1 || px > w + 1) return;
      g.append("text").attr("x", px).attr("y", h + 18).attr("class", "tick").attr("text-anchor", "middle").text(t.getFullYear());
    });
  }

  function gridY(g, y, ticks, w, fmt, zeroLine) {
    ticks.forEach((t) => {
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(t)).attr("y2", y(t)).attr("class", t === zeroLine ? "axis-line" : "grid");
      g.append("text").attr("x", -8).attr("y", y(t) + 4).attr("class", "tick").attr("text-anchor", "end").text(fmt(t));
    });
  }

  function events(g, x, h, w, evs, narrow) {
    let k = 0;
    evs.forEach((e) => {
      const px = x(parse(e.at));
      g.append("line").attr("x1", px).attr("x2", px).attr("y1", 0).attr("y2", h).attr("class", "event");
      if (!e.text) return;
      if (narrow) {  // phones: numbered markers, text goes in a key under the legend
        g.append("text").attr("x", px).attr("y", -5 - (k % 2) * 14).attr("class", "event-label").attr("text-anchor", "middle").text(++k);
        return;
      }
      const right = e.side !== "left";
      g.append("text").attr("x", px + (right ? 6 : -6)).attr("y", -5 - (e.row || 0) * 14).attr("class", "event-label")
        .attr("text-anchor", right ? "start" : "end").text(e.text);
    });
  }

  /* ---------- line chart (one or more series on ONE axis) ---------- */
  function line(host, spec) {
    const { wrap, svg, tip } = mount(host, spec);
    const W = Math.max(320, host.clientWidth), H = spec.height || 300;
    const narrow = W < 560;
    const labelled = (spec.events || []).filter((e) => e.text);
    const evRows = narrow ? Math.min(2, labelled.length) : labelled.reduce((a, e) => Math.max(a, (e.row || 0) + 1), 0);
    const endLab = spec.endLabels && !narrow;                // narrow screens: legend + tooltip carry identity
    if (narrow && labelled.length) {
      const ol = document.createElement("ol");
      ol.className = "event-key";
      labelled.forEach((e) => { const li = document.createElement("li"); li.textContent = e.text; ol.appendChild(li); });
      wrap.insertBefore(ol, svg);
    }
    const m = { t: 10 + evRows * 14, r: endLab ? 168 : 24, b: 28, l: 52 };
    const w = W - m.l - m.r, h = H - m.t - m.b;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    const g = d3.select(svg).append("g").attr("transform", `translate(${m.l},${m.t})`);
    const all = spec.series.flatMap((s) => s.data);
    const x = d3.scaleTime().domain(spec.xDomain.map(parse)).range([0, w]);
    const lo = spec.yMin !== undefined ? spec.yMin : Math.min(0, d3.min(all, (d) => d[1]));
    const hi = spec.yMax || d3.max(all, (d) => d[1]);
    const y = d3.scaleLinear().domain([lo, hi]).nice().range([h, 0]);
    gridY(g, y, y.ticks(spec.yTicks || 5), w, spec.yFormat || fmtNum, 0);
    axisX(g, x, h, w, [+spec.xDomain[0].slice(0, 4), +spec.xDomain[1].slice(0, 4)]);
    if (spec.ref) {
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(spec.ref.value)).attr("y2", y(spec.ref.value)).attr("class", "ref");
      g.append("text").attr("x", spec.ref.at ? x(parse(spec.ref.at)) : 4).attr("y", y(spec.ref.value) + (spec.ref.below ? 15 : -5)).attr("class", "event-label").text(spec.ref.label);
    }
    if (spec.events) events(g, x, h, w, spec.events, narrow);
    const ln = d3.line().x((d) => x(parse(d[0]))).y((d) => y(d[1])).curve(d3.curveLinear);
    spec.series.forEach((s) => {
      const solid = s.data.filter((d) => !s.prelim || d[0] < s.prelim);
      g.append("path").attr("d", ln(solid)).attr("fill", "none").attr("stroke", css(s.color)).attr("stroke-width", 2).attr("stroke-opacity", s.opacity || 1).attr("stroke-linejoin", "round").attr("stroke-linecap", "round");
      if (s.prelim && solid.length < s.data.length) {  // preliminary tail: same line, lighter + hollow end dot (no dashes: they read as projection)
        const tail = s.data.slice(solid.length - 1);
        g.append("path").attr("d", ln(tail)).attr("fill", "none").attr("stroke", css(s.color)).attr("stroke-width", 2).attr("stroke-opacity", 0.45);
      }
      const last = s.data[s.data.length - 1];
      const cx = x(parse(last[0])), cy = y(last[1]);
      if (s.noEnd) {   // context line: no dot, optional muted name so the reader can tell which gray line is which
        if (endLab && s.endText) g.append("text").attr("x", cx + 8).attr("y", cy + 4).attr("class", "end-context").text(s.endText);
        return;
      }
      g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 6.5).attr("fill", css("--surface"));
      g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 4.5)
        .attr("fill", s.prelim ? css("--surface") : css(s.color)).attr("stroke", css(s.color)).attr("stroke-width", s.prelim ? 2 : 0);
      if (endLab && !s.noEnd) {
        const lt = g.append("text").attr("x", cx + 12).attr("y", cy + 4 + (s.labelDy || 0)).attr("class", "end-label");
        lt.append("tspan").text(s.name);
        lt.append("tspan").attr("dx", 6).attr("class", "end-value").text((spec.valueFormat || fmtNum)(last[1]));
      }
    });
    interact(svg, g, wrap, tip, spec, x, y, m, w, h);
    table(host, spec);
  }

  function interact(svg, g, wrap, tip, spec, x, y, m, w, h) {
    const months = Array.from(new Set(spec.series.flatMap((s) => s.data.map((d) => d[0])))).sort();
    const cross = g.append("line").attr("y1", 0).attr("y2", h).attr("class", "cross").attr("opacity", 0);
    const dots = spec.series.map((s) => g.append("circle").attr("r", 4.5).attr("fill", css(s.color)).attr("stroke", css("--surface")).attr("stroke-width", 2).attr("opacity", 0));
    const show = (i, py) => {
      i = Math.max(0, Math.min(months.length - 1, i));
      const mo = months[i];
      const px = x(parse(mo));
      cross.attr("x1", px).attr("x2", px).attr("opacity", 1);
      const rows = [];
      spec.series.map((s, k) => [s, k]).sort((a, b) => !!a[0].noEnd - !!b[0].noEnd).forEach(([s, k]) => {
        const d = s.data.find((q) => q[0] === mo);
        if (d) {
          dots[k].attr("cx", px).attr("cy", y(d[1])).attr("opacity", 1);
          rows.push({ color: s.color, name: s.name + (s.prelim && mo >= s.prelim ? " (preliminary)" : ""), value: (spec.valueFormat || fmtNum)(d[1]) });
        } else dots[k].attr("opacity", 0);
      });
      tooltip(tip, wrap, px + m.l, py === undefined ? m.t + 20 : py, (spec.xFormat || fmtMonth)(mo), rows);
      svg.__i = i;
    };
    const hide = () => { cross.attr("opacity", 0); dots.forEach((d) => d.attr("opacity", 0)); tip.hidden = true; };
    const idxAt = (clientX) => {
      const r = svg.getBoundingClientRect();
      const t = x.invert((clientX - r.left) * (svg.viewBox.baseVal.width / r.width) - m.l);
      let best = 0, bd = Infinity;
      months.forEach((mo, i) => { const dd = Math.abs(parse(mo) - t); if (dd < bd) { bd = dd; best = i; } });
      return best;
    };
    svg.addEventListener("pointermove", (e) => { const r = wrap.getBoundingClientRect(); show(idxAt(e.clientX), e.clientY - r.top); });
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      show((svg.__i === undefined ? months.length - 1 : svg.__i) + (e.key === "ArrowRight" ? 1 : -1));
    });
    svg.addEventListener("focus", () => show(svg.__i === undefined ? months.length - 1 : svg.__i));
    svg.addEventListener("blur", hide);
  }

  /* ---------- simple table twin for charts that are not time series ---------- */
  function simpleTable(host, cols, rows) {
    const det = document.createElement("details");
    det.className = "table-view";
    const sum = document.createElement("summary");
    sum.textContent = "Table view";
    det.appendChild(sum);
    const sc = document.createElement("div");
    sc.className = "table-scroll";
    const t = document.createElement("table");
    const hr = t.createTHead().insertRow();
    cols.forEach((c) => { const th = document.createElement("th"); th.textContent = c; hr.appendChild(th); });
    const tb = t.createTBody();
    rows.forEach((r) => {
      const tr = tb.insertRow();
      r.forEach((v, i) => { const td = tr.insertCell(); td.textContent = v; if (i) td.className = "num"; });
    });
    sc.appendChild(t); det.appendChild(sc); host.appendChild(det);
  }

  // Rounded data-end, square at the baseline (horizontal bar growing right from x0).
  const hbarPath = (x0, x1, yy, bh) => {
    const r = Math.min(4, bh / 2, Math.max(0, x1 - x0));
    return `M${x0},${yy} L${x1 - r},${yy} Q${x1},${yy} ${x1},${yy + r} L${x1},${yy + bh - r} Q${x1},${yy + bh} ${x1 - r},${yy + bh} L${x0},${yy + bh} Z`;
  };

  // Text that sits inside a fill: white or near-black by the fill's luminance.
  const inkOn = (hex) => {
    const c = d3.color(hex).rgb();
    const L = [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2] > 0.3 ? "#0b0b0b" : "#ffffff";
  };

  /* ---------- ranked horizontal bars: one item emphasized, the rest context ---------- */
  function hbars(host, spec) {
    const { wrap, svg, tip } = mount(host, { label: spec.label });
    const items = spec.items.slice().sort((a, b) => b.v - a.v);
    const W = Math.max(320, host.clientWidth), narrow = W < 560;
    const row = narrow ? 13 : 15, bh = narrow ? 8 : 10;
    const m = { t: 22, r: 64, b: 24, l: narrow ? 104 : 140 };
    const w = W - m.l - m.r, h = items.length * row, H = h + m.t + m.b;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    const g = d3.select(svg).append("g").attr("transform", `translate(${m.l},${m.t})`);
    const x = d3.scaleLinear().domain([0, d3.max(items, (d) => d.v)]).nice().range([0, w]);
    x.ticks(5).forEach((t) => {
      g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", h).attr("class", t ? "grid" : "axis-line");
      g.append("text").attr("x", x(t)).attr("y", h + 16).attr("class", "tick").attr("text-anchor", "middle").text(t);
    });
    const yOf = (i) => i * row + (row - bh) / 2;
    const bars = g.selectAll("path.bar").data(items).join("path").attr("class", "bar")
      .attr("d", (d, i) => hbarPath(0, x(d.v), yOf(i), bh))
      .attr("fill", (d) => css(d.hi ? "--s1" : "--context")).attr("fill-opacity", (d) => (d.hi ? 1 : 0.55));
    items.forEach((d, i) => {
      g.append("text").attr("x", -8).attr("y", yOf(i) + bh - 1).attr("text-anchor", "end")
        .attr("class", d.hi ? "end-label" : d.near ? "bar-label near" : "bar-label").text(narrow && d.short ? d.short : d.name);
      if (d.hi || d.near) g.append("text").attr("x", x(d.v) + 6).attr("y", yOf(i) + bh - 1).attr("class", d.hi ? "end-label" : "end-value").text(spec.valueFormat(d.v));
    });
    (spec.refs || []).forEach((r) => {
      g.append("line").attr("x1", x(r.value)).attr("x2", x(r.value)).attr("y1", -6).attr("y2", h).attr("class", "ref-strong");
      g.append("text").attr("x", x(r.value) + 5).attr("y", -9).attr("class", "event-label").text(r.label);
    });
    const show = (d, e) => {
      bars.attr("fill-opacity", (q) => (q === d ? 1 : q.hi ? 0.8 : 0.35));
      const r0 = wrap.getBoundingClientRect(), i = items.indexOf(d);
      tooltip(tip, wrap, e ? e.clientX - r0.left : m.l + x(d.v), e ? e.clientY - r0.top : m.t + yOf(i), d.name,
        [{ color: d.hi ? "--s1" : "--context", value: spec.valueFormat(d.v), name: spec.unit }, ...(d.extra ? [{ value: d.extra, name: "" }] : [])]);
      svg.__i = i;
    };
    const hide = () => { bars.attr("fill-opacity", (d) => (d.hi ? 1 : 0.55)); tip.hidden = true; };
    g.selectAll("rect.hit").data(items).join("rect").attr("class", "hit").attr("x", -m.l).attr("y", (d, i) => i * row).attr("width", w + m.l).attr("height", row)
      .attr("fill", "transparent").on("pointermove pointerenter", function (e, d) { show(d, e); }).on("pointerleave", hide);
    svg.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      show(items[Math.max(0, Math.min(items.length - 1, (svg.__i ?? -1) + (e.key === "ArrowDown" ? 1 : -1)))]);
    });
    svg.addEventListener("focus", () => show(items[svg.__i ?? 0]));
    svg.addEventListener("blur", hide);
    simpleTable(host, ["Rank", spec.nameCol || "State", spec.unit], items.map((d, i) => [String(i + 1), d.name, spec.valueFormat(d.v)]));
  }

  /* ---------- dumbbell: before -> after per item ---------- */
  function dumbbell(host, spec) {
    const series = [{ name: spec.aName, color: "--s1-light" }, { name: spec.bName, color: "--s1" }];
    const { wrap, svg, tip } = mount(host, { label: spec.label, series });
    wrap.querySelectorAll(".legend .key").forEach((k) => { k.className = "key dot"; });
    const items = spec.items;
    const W = Math.max(320, host.clientWidth), narrow = W < 560;
    const row = 34, m = { t: 8, r: 56, b: 26, l: narrow ? 92 : 128 };
    const w = W - m.l - m.r, h = items.length * row, H = h + m.t + m.b;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    const g = d3.select(svg).append("g").attr("transform", `translate(${m.l},${m.t})`);
    const x = d3.scaleLinear().domain([0, d3.max(items, (d) => Math.max(d.a || 0, d.b || 0))]).nice().range([0, w]);
    x.ticks(narrow ? 4 : 6).forEach((t) => {
      g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", h).attr("class", t ? "grid" : "axis-line");
      g.append("text").attr("x", x(t)).attr("y", h + 18).attr("class", "tick").attr("text-anchor", "middle").text(t);
    });
    items.forEach((d, i) => {
      const cy = i * row + row / 2;
      g.append("text").attr("x", -10).attr("y", cy + 4).attr("text-anchor", "end").attr("class", d.hi ? "end-label" : "bar-label near").text(d.name);
      if (d.a == null || d.b == null) {
        g.append("text").attr("x", 0).attr("y", cy + 4).attr("class", "event-label").text(spec.missing || "Not reported");
        return;
      }
      g.append("line").attr("x1", x(d.a)).attr("x2", x(d.b)).attr("y1", cy).attr("y2", cy).attr("stroke", css(d.hi ? "--s1" : "--context")).attr("stroke-width", 2);
      [[d.a, "--s1-light"], [d.b, "--s1"]].forEach(([v, c]) => {
        g.append("circle").attr("cx", x(v)).attr("cy", cy).attr("r", 6.5).attr("fill", css("--surface"));
        g.append("circle").attr("cx", x(v)).attr("cy", cy).attr("r", 4.5).attr("fill", css(c));
      });
      if (d.hi || d.label) g.append("text").attr("x", x(Math.max(d.a, d.b)) + 10).attr("y", cy + 4).attr("class", d.hi ? "end-label" : "end-value").text(spec.valueFormat(d.b));
    });
    const hit = g.selectAll("rect.hit").data(items).join("rect").attr("class", "hit").attr("x", -m.l).attr("y", (d, i) => i * row).attr("width", w + m.l).attr("height", row).attr("fill", "transparent");
    hit.on("pointermove pointerenter", function (e, d) {
      const r0 = wrap.getBoundingClientRect();
      tooltip(tip, wrap, e.clientX - r0.left, e.clientY - r0.top, d.name, d.a == null ? [{ value: spec.missing || "Not reported", name: "" }] :
        [{ color: "--s1", value: spec.valueFormat(d.b), name: spec.bName }, { color: "--s1-light", value: spec.valueFormat(d.a), name: spec.aName }]);
    }).on("pointerleave", () => { tip.hidden = true; });
    svg.removeAttribute("tabindex");   // the table twin carries every value for keyboard users
    simpleTable(host, [spec.nameCol || "State", spec.aName, spec.bName], items.map((d) => [d.name, d.a == null ? "—" : spec.valueFormat(d.a), d.b == null ? "—" : spec.valueFormat(d.b)]));
  }

  /* ---------- forest plot: effect estimates with 95% intervals on a log scale, 1 = no difference ---------- */
  function forest(host, spec) {
    host.textContent = "";
    const W = Math.max(320, host.clientWidth), narrow = W < 640;
    const box = document.createElement("div");
    box.className = "forest" + (narrow ? " narrow" : "");
    host.appendChild(box);
    const sw = narrow ? W - 8 : Math.round(W * 0.48), m = { l: 10, r: 14 };
    const x = d3.scaleLog().domain(spec.domain).range([m.l, sw - m.r]);
    const axis = () => {
      const s = d3.select(document.createElementNS(NS, "svg")).attr("viewBox", `0 0 ${sw} 20`).attr("width", sw).attr("height", 20).attr("aria-hidden", "true");
      spec.ticks.forEach((t) => s.append("text").attr("x", x(t)).attr("y", 14).attr("class", "tick").attr("text-anchor", "middle").text(t));
      return s.node();
    };
    const head = document.createElement("div");
    head.className = "forest-row forest-head";
    const hl = document.createElement("div");
    hl.className = "forest-label";
    const hs = document.createElement("div");
    hs.className = "forest-scale";
    const dir = document.createElement("div");
    dir.className = "forest-dir";
    const one = (x(1) / sw * 100).toFixed(2) + "%";   // both labels meet at the no-effect line
    const l1 = document.createElement("span"); l1.textContent = "← " + spec.lowText; l1.style.right = `calc(100% - ${one} + 8px)`;
    const l2 = document.createElement("span"); l2.textContent = spec.highText + " →"; l2.style.left = `calc(${one} + 8px)`;
    dir.append(l1, l2);
    hs.appendChild(dir);
    head.append(hl, hs);
    box.appendChild(head);
    let group = null;
    spec.rows.forEach((r) => {
      if (r.group !== group) {
        group = r.group;
        const gh = document.createElement("div");
        gh.className = "forest-group";
        gh.textContent = group;
        box.appendChild(gh);
      }
      const crosses = r.lo < 1 && r.hi > 1;
      const row = document.createElement("div");
      row.className = "forest-row";
      const lab = document.createElement("div");
      lab.className = "forest-label";
      const t = document.createElement("span"); t.className = "fl-main"; t.textContent = r.label;
      const n = document.createElement("span"); n.className = "fl-note"; n.textContent = r.note;
      lab.append(t, n);
      const plot = document.createElement("div");
      plot.className = "forest-scale";
      const s = d3.select(document.createElementNS(NS, "svg")).attr("viewBox", `0 0 ${sw} 30`).attr("width", sw).attr("height", 30)
        .attr("role", "img").attr("aria-label", `${r.label}: ${r.rr} (95% interval ${r.lo} to ${r.hi})`);
      spec.ticks.forEach((tk) => s.append("line").attr("x1", x(tk)).attr("x2", x(tk)).attr("y1", 0).attr("y2", 30).attr("class", tk === 1 ? "ref-strong" : "grid"));
      const col = css(crosses ? "--context" : "--s1");
      s.append("line").attr("x1", x(r.lo)).attr("x2", x(r.hi)).attr("y1", 15).attr("y2", 15).attr("stroke", col).attr("stroke-width", 2).attr("stroke-linecap", "round");
      s.append("rect").attr("x", x(r.rr) - 7).attr("y", 8).attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", css("--surface"));
      s.append("rect").attr("x", x(r.rr) - 5).attr("y", 10).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", col);
      plot.appendChild(s.node());
      const val = document.createElement("div");
      val.className = "forest-val";
      const vv = document.createElement("strong"); vv.textContent = r.rr.toFixed(2);
      const ci = document.createElement("span"); ci.textContent = ` (${r.lo.toFixed(2)}–${r.hi.toFixed(2)})`;
      val.append(vv, ci);
      if (crosses) { const c = document.createElement("span"); c.className = "fl-flag"; c.textContent = "interval includes no effect"; val.appendChild(c); }
      row.append(lab, plot, val);
      box.appendChild(row);
    });
    const foot = document.createElement("div");
    foot.className = "forest-row forest-foot";
    const fl = document.createElement("div"); fl.className = "forest-label";
    const fs = document.createElement("div"); fs.className = "forest-scale"; fs.appendChild(axis());
    const cap = document.createElement("div"); cap.className = "forest-axis-cap"; cap.textContent = spec.axisLabel;
    fs.appendChild(cap);
    foot.append(fl, fs);
    box.appendChild(foot);
    simpleTable(host, ["Estimate", "Risk ratio", "95% interval", "Source"], spec.rows.map((r) => [r.group + ": " + r.label, r.rr.toFixed(2), `${r.lo.toFixed(2)} to ${r.hi.toFixed(2)}`, r.note]));
  }

  /* ---------- tile map: one tile per state in rough geographic position, ordinal fill ---------- */
  function tilemap(host, spec) {
    const { wrap, svg, tip } = mount(host, { label: spec.label });
    svg.removeAttribute("tabindex");
    const ul = document.createElement("ul");
    ul.className = "legend";
    spec.classes.forEach((c) => {
      const li = document.createElement("li");
      const k = document.createElement("span");
      k.className = "key swatch" + (c.ring ? " ring" : "");
      k.style.background = css(c.color);
      li.append(k, document.createTextNode(c.name));
      ul.appendChild(li);
    });
    wrap.insertBefore(ul, svg);
    const cols = d3.max(spec.tiles, (t) => t.col) + 1, rows = d3.max(spec.tiles, (t) => t.row) + 1;
    const W = Math.min(Math.max(300, host.clientWidth), 520), gap = 6;
    const s = Math.floor((W - gap * (cols - 1)) / cols), H = rows * s + (rows - 1) * gap;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.maxWidth = W + "px";
    const g = d3.select(svg);
    spec.tiles.forEach((t) => {
      const cls = spec.classes.find((c) => c.id === t.status);
      const fill = css(cls.color), x0 = t.col * (s + gap), y0 = t.row * (s + gap);
      const tg = g.append("g").attr("class", "tile-g").attr("tabindex", 0).attr("role", "img")
        .attr("aria-label", `${t.name}: ${cls.name}. ${t.tip.join(". ")}`);
      tg.append("rect").attr("x", x0).attr("y", y0).attr("width", s).attr("height", s).attr("rx", 10).attr("fill", fill);
      if (cls.ring) tg.append("rect").attr("x", x0 + 1.5).attr("y", y0 + 1.5).attr("width", s - 3).attr("height", s - 3).attr("rx", 9)
        .attr("fill", "none").attr("stroke", css("--ink")).attr("stroke-width", 3);
      const ink = inkOn(fill), big = Math.max(18, s * 0.2);
      tg.append("text").attr("x", x0 + 12).attr("y", y0 + 10 + big).attr("fill", ink).attr("class", "tile-abbr").style("font-size", big + "px").text(t.abbr);
      // Small tiles (phones) take the short wording and smaller type; both lines always show.
      const small = s < 150, fs = small ? 11 : 13, lh = fs + 4;
      const lines = small ? t.linesShort : t.lines;
      lines.forEach((ln, i) => tg.append("text").attr("x", x0 + (small ? 9 : 12)).attr("y", y0 + s - (small ? 10 : 14) - (lines.length - 1 - i) * lh).attr("fill", ink)
        .attr("class", i ? "tile-sub" : "tile-main").style("font-size", (i ? fs - 1 : fs) + "px").text(ln));
      const show = (e) => {
        const r0 = wrap.getBoundingClientRect();
        const px = e && e.clientX ? e.clientX - r0.left : x0 + s / 2, py = e && e.clientY ? e.clientY - r0.top : y0 + s / 2;
        tooltip(tip, wrap, px, py, t.name, t.tip.map((v) => ({ value: v, name: "" })));
      };
      tg.on("pointermove pointerenter", show).on("pointerleave", () => { tip.hidden = true; })
        .on("focus", function () { show(); }).on("blur", () => { tip.hidden = true; });
    });
    simpleTable(host, spec.tableCols, spec.tiles.map((t) => t.cells));
  }

  /* ---------- table view (the accessible twin) ---------- */
  function table(host, spec) {
    if (spec.noTable) return;
    const det = document.createElement("details");
    det.className = "table-view";
    const sum = document.createElement("summary");
    sum.textContent = "Table view";
    det.appendChild(sum);
    const months = Array.from(new Set(spec.series.flatMap((s) => s.data.map((d) => d[0])))).sort();
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    const t = document.createElement("table");
    const head = t.createTHead().insertRow();
    [spec.xName || "Month"].concat(spec.series.map((s) => s.name)).forEach((c) => { const th = document.createElement("th"); th.textContent = c; head.appendChild(th); });
    const body = t.createTBody();
    months.forEach((mo) => {
      const tr = body.insertRow();
      tr.insertCell().textContent = (spec.xFormat || fmtMonth)(mo);
      spec.series.forEach((s) => {
        const d = s.data.find((q) => q[0] === mo);
        const td = tr.insertCell();
        td.textContent = d ? (spec.valueFormat || fmtNum)(d[1]) : "";
        td.className = "num";
      });
    });
    wrap.appendChild(t);
    det.appendChild(wrap);
    host.appendChild(det);
  }

  window.Charts = { line, hbars, dumbbell, forest, tilemap, fmtNum, fmtMonth };
})();
