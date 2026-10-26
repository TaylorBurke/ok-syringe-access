/* Page chrome: scroll progress, theme toggle, section reveal. No data logic here. */
(function () {
  const root = document.documentElement;
  const KEY = "osa-theme";

  /* theme toggle: remembered per viewer; falls back to the system setting */
  try { const t = localStorage.getItem(KEY); if (t) root.dataset.theme = t; } catch (e) {}
  const btn = document.getElementById("theme");
  if (btn) btn.addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem(KEY, root.dataset.theme); } catch (e) {}
    if (window.__rerender) window.__rerender();
  });

  /* reading progress on the nav, and the current chapter */
  const bar = document.getElementById("nav-bar");
  const links = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href")));
  function onScroll() {
    const h = document.documentElement;
    if (bar) bar.style.transform = `scaleX(${Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - innerHeight))})`;
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.35) cur = i; });
    links.forEach((a, i) => a.classList.toggle("on", i === cur));
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* gentle fade-up as sections enter; content stays visible without JS or with reduced motion */
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("figure, .kpis, .prose > p, .timeline, .asks, .pull, .chapter > h2").forEach((el) => { el.classList.add("rv"); io.observe(el); });
  }
})();
