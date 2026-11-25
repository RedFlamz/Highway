// Mobile menu
const btn = document.querySelector(".menu-btn"), nav = document.querySelector("nav");
if (btn) btn.addEventListener("click", () => {
  btn.setAttribute("aria-expanded", nav.classList.toggle("open"));
});

// Copy command
const cmd = document.querySelector(".cmd");
if (cmd) {
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText("/pw Highway");
    const s = cmd.querySelector("small"); s.textContent = "copied";
    setTimeout(() => s.textContent = "click to copy", 1500);
  };
  cmd.addEventListener("click", copy);
  cmd.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } });
}

// Locations: map + list
const route = document.getElementById("route");
if (route) {
  const filters = document.getElementById("filters");
  const map = document.getElementById("map");
  const X = 25000, Z = 15000;                       // map limits
  const W = 1000, H = 620, L = 56, R = 24, T = 24, B = 36;
  const px = x => L + (x + X) / (2 * X) * (W - L - R);
  const pz = z => T + (z + Z) / (2 * Z) * (H - T - B); // negative z = up
  const fmt = n => (n / 1000) + "k";
  const coords = l => `X: ${l.x}, Z: ${l.z}`;

  function drawMap(list) {
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of the Highway: X across, Z up and down">`;
    for (let x = -X; x <= X; x += 5000)
      s += `<line class="grid" x1="${px(x)}" y1="${pz(-Z)}" x2="${px(x)}" y2="${pz(Z)}"/><text class="axis" x="${px(x)}" y="${H - 12}" text-anchor="middle">${x === 0 ? "0" : fmt(x)}</text>`;
    for (let z = -Z; z <= Z; z += 5000)
      s += `<line class="grid" x1="${px(-X)}" y1="${pz(z)}" x2="${px(X)}" y2="${pz(z)}"/><text class="axis" x="${L - 8}" y="${pz(z) + 4}" text-anchor="end">${z === 0 ? "0" : fmt(z)}</text>`;
    s += `<text class="axis" x="${W - R}" y="${pz(0) - 8}" text-anchor="end">+X</text>`;
    s += `<text class="axis" x="${L + 4}" y="${pz(0) - 8}">-X</text>`;
    s += `<text class="axis" x="${px(0) + 8}" y="${T + 10}">-Z (up)</text>`;
    s += `<text class="axis" x="${px(0) + 8}" y="${H - B - 6}">+Z (down)</text>`;
    // main highway: z = 0 from -25k to 25k
    s += `<line class="hwy" x1="${px(-X)}" y1="${pz(0)}" x2="${px(X)}" y2="${pz(0)}"/>`;
    // branches connecting off-road stops to the main line
    list.forEach(l => {
      if (l.z !== 0) s += `<line class="branch" x1="${px(l.x)}" y1="${pz(0)}" x2="${px(l.x)}" y2="${pz(l.z)}"/><circle class="junction" cx="${px(l.x)}" cy="${pz(0)}" r="4"/>`;
    });
    // location dots + labels
    list.forEach((l, i) => {
      const above = l.z < 0 || (l.z === 0 && i % 2 === 0);
      s += `<g class="pt"><circle class="dot" cx="${px(l.x)}" cy="${pz(l.z)}" r="7"/>` +
           `<text class="lbl" x="${px(l.x)}" y="${pz(l.z) + (above ? -14 : 22)}" text-anchor="middle">${l.name}</text>` +
           `<title>${l.name} (${coords(l)})</title></g>`;
    });
    map.innerHTML = s + "</svg>";
  }

  const render = t => {
    const list = LOCATIONS.filter(l => t === "All" || l.type === t);
    drawMap(list);
    route.innerHTML = [...list].sort((a, b) => a.x - b.x).map(l =>
      `<li class="stop"><h3>${l.name}</h3><span class="tag">${l.type}</span><span class="coords">${coords(l)}</span><p>${l.desc}</p></li>`).join("");
    filters.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.textContent === t));
  };
  const types = ["All", ...new Set(LOCATIONS.map(l => l.type))];
  filters.innerHTML = types.map(t => `<button type="button">${t}</button>`).join("");
  filters.addEventListener("click", e => { if (e.target.tagName === "BUTTON") render(e.target.textContent); });
  render("All");
}

// Progress
const segs = document.getElementById("segments");
if (segs) {
  const avg = Math.round(PROGRESS.reduce((a, p) => a + p.percent, 0) / PROGRESS.length);
  document.getElementById("total-pct").textContent = avg + "%";
  segs.innerHTML = PROGRESS.map(p =>
    `<div class="seg"><div class="row"><strong>${p.name}</strong><span>${p.percent}% (${p.status})</span></div>` +
    `<div class="bar" role="progressbar" aria-valuenow="${p.percent}" aria-valuemin="0" aria-valuemax="100"><i data-w="${p.percent}"></i></div></div>`).join("");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll(".bar i[data-w]").forEach(i => i.style.width = i.dataset.w + "%");
    document.getElementById("total-bar").style.width = avg + "%";
  }));
}
