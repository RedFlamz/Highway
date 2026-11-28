// Header shadow once the page is scrolled
const header = document.querySelector("header.site");
const onScroll = () => header && header.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

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
    const s = cmd.querySelector("small"); s.textContent = "copied!"; cmd.classList.add("copied");
    setTimeout(() => { s.textContent = "click to copy"; cmd.classList.remove("copied"); }, 1500);
  };
  cmd.addEventListener("click", copy);
  cmd.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copy(); } });
}

// Locations: map + list
const route = document.getElementById("route");
if (route) {
  const filters = document.getElementById("filters");
  const map = document.getElementById("map");
  const X = 25000, Z = 15000;                       // overview map limits
  const LIVE_Z = 25000;                             // live map goes 25k up and down (world border)
  const IMG_Z = 25000;                              // images/map.jpg covers z -25k..25k (tools/update-map.ps1)
  const W = 1000, H = 620, L = 56, R = 24, T = 24, B = 36;
  const px = x => L + (x + X) / (2 * X) * (W - L - R);
  const pz = z => T + (z + Z) / (2 * Z) * (H - T - B); // negative z = up
  const fmt = n => (n / 1000) + "k";
  const coords = l => `X: ${l.x}, Z: ${l.z}`;
  const infoHTML = l => `<div class="stop-head"><strong>${l.name}</strong><span class="tag">${l.type}</span></div>` +
    `<span class="coords">${coords(l)}</span><p>${l.desc}</p>`;

  function drawMap(list) {
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of the Highway: X across, Z up and down">`;
    // terrain from the Lotus squaremap (images/map.jpg, rebuilt by tools/update-map.ps1)
    // the image is taller than this map, so it's clipped to the plot area
    s += `<clipPath id="plot-clip"><rect x="${px(-X)}" y="${pz(-Z)}" width="${px(X) - px(-X)}" height="${pz(Z) - pz(-Z)}"/></clipPath>` +
         `<image class="basemap" href="images/map.jpg" clip-path="url(#plot-clip)" x="${px(-X)}" y="${pz(-IMG_Z)}" width="${px(X) - px(-X)}" height="${pz(IMG_Z) - pz(-IMG_Z)}" preserveAspectRatio="none"/>` +
         `<rect class="basemap-tint" x="${px(-X)}" y="${pz(-Z)}" width="${px(X) - px(-X)}" height="${pz(Z) - pz(-Z)}"/>`;
    for (let x = -X; x <= X; x += 5000)
      s += `<line class="grid" x1="${px(x)}" y1="${pz(-Z)}" x2="${px(x)}" y2="${pz(Z)}"/><text class="axis" x="${px(x)}" y="${H - 12}" text-anchor="middle">${x === 0 ? "0" : fmt(x)}</text>`;
    for (let z = -Z; z <= Z; z += 5000)
      s += `<line class="grid" x1="${px(-X)}" y1="${pz(z)}" x2="${px(X)}" y2="${pz(z)}"/><text class="axis" x="${L - 8}" y="${pz(z) + 4}" text-anchor="end">${z === 0 ? "0" : fmt(z)}</text>`;
    s += `<text class="axis on-map" x="${W - R - 6}" y="${pz(0) - 10}" text-anchor="end">+X</text>`;
    s += `<text class="axis on-map" x="${L + 6}" y="${pz(0) - 10}">-X</text>`;
    s += `<text class="axis on-map" x="${px(0) + 8}" y="${T + 14}">-Z (up)</text>`;
    s += `<text class="axis on-map" x="${px(0) + 8}" y="${H - B - 8}">+Z (down)</text>`;
    // main highway (z = 0) plus vertical stretches to off-road stops, all in the same style.
    // Each is drawn twice: a light casing underneath so the road stands out on the terrain.
    const roads = [[px(-X), pz(0), px(X), pz(0)]];
    list.forEach(l => { if (l.z !== 0) roads.push([px(l.x), pz(0), px(l.x), pz(l.z)]); });
    ["hwy-case", "hwy"].forEach(c => roads.forEach(([x1, y1, x2, y2]) =>
      s += `<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`));
    // leader lines from labels to dots (filled in by placeLabels)
    s += `<g class="leaders"></g>`;
    // location dots + labels
    list.forEach((l, i) => {
      s += `<g class="pt" data-i="${i}" tabindex="0" role="button" aria-label="${l.name}: show details">` +
           `<circle class="hitarea" cx="${px(l.x)}" cy="${pz(l.z)}" r="14"/>` +
           `<circle class="dot" cx="${px(l.x)}" cy="${pz(l.z)}" r="7"/>` +
           `<text class="lbl" data-x="${px(l.x)}" data-y="${pz(l.z)}" data-z="${l.z}">${l.name}</text></g>`;
    });
    shown = list; openIdx = -1;
    map.innerHTML = s + `</svg><div class="map-tip" role="dialog" hidden></div>`;
    placeLabels();
  }

  // Info bubble for a clicked dot
  let shown = [], openIdx = -1;
  function showTip(i) {
    const tip = map.querySelector(".map-tip"), l = shown[i];
    if (!tip || !l) return;
    openIdx = i;
    tip.innerHTML = `<button type="button" class="tip-close" aria-label="Close">&times;</button>` + infoHTML(l);
    tip.hidden = false;
    const scale = map.querySelector("svg").getBoundingClientRect().width / W;
    const dx = px(l.x) * scale, dy = pz(l.z) * scale;
    const mw = map.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    const below = dy - th - 18 < 0;                       // flip under the dot near the top
    tip.classList.toggle("below", below);
    const left = Math.max(6, Math.min(mw - tw - 6, dx - tw / 2));
    tip.style.left = left + "px";
    tip.style.top = (below ? dy + 18 : dy - th - 18) + "px";
    tip.style.setProperty("--arrow", (dx - left) + "px");
    map.querySelectorAll(".pt").forEach(p => p.classList.toggle("active", +p.dataset.i === i));
  }
  function hideTip() {
    const tip = map.querySelector(".map-tip");
    if (tip) tip.hidden = true;
    openIdx = -1;
    map.querySelectorAll(".pt.active").forEach(p => p.classList.remove("active"));
  }
  map.addEventListener("click", e => {
    const pt = e.target.closest(".pt");
    if (pt) { +pt.dataset.i === openIdx ? hideTip() : showTip(+pt.dataset.i); return; }
    if (e.target.closest(".tip-close") || !e.target.closest(".map-tip")) hideTip();
  });
  map.addEventListener("keydown", e => {
    const pt = e.target.closest(".pt");
    if (pt && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showTip(+pt.dataset.i); }
    if (e.key === "Escape") hideTip();
  });
  document.addEventListener("click", e => { if (!map.contains(e.target) && !e.target.closest(".stop")) hideTip(); });
  window.addEventListener("resize", () => { if (openIdx >= 0) showTip(openIdx); });

  // Place labels so they don't overlap each other, the dots, or the map edges.
  function placeLabels() {
    const placed = [], leaders = map.querySelector(".leaders");
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const labels = [...map.querySelectorAll(".lbl")]
      .sort((a, b) => a.dataset.x - b.dataset.x);
    // dots are obstacles too
    labels.forEach(t => placed.push({ x: +t.dataset.x - 8, y: +t.dataset.y - 8, w: 16, h: 16 }));
    labels.forEach(t => {
      const cx = +t.dataset.x, cy = +t.dataset.y, z = +t.dataset.z;
      t.setAttribute("x", 0); t.setAttribute("y", 0);
      const bb = t.getBBox(), w = bb.width + 6, h = bb.height;
      // label text sits away from the highway: up for -Z stops, down for +Z
      const dirs = z < 0 ? [-1, 1] : z > 0 ? [1, -1] : [-1, 1];
      const tries = [];
      for (let step = 0; step < 6; step++)
        dirs.forEach(d => tries.push({ dx: 0, dy: d * (14 + step * 17) }));
      if (z !== 0) [1, -1].forEach(d => tries.push({ dx: d * (w / 2 + 14), dy: 0 }));
      let best = null;
      for (const o of tries) {
        let x = cx + o.dx - w / 2;
        x = Math.max(L - 4, Math.min(W - R - w + 4, x));        // keep inside the map
        const ty = cy + o.dy + (o.dy > 0 ? h * 0.7 : o.dy === 0 ? h * 0.35 : 0);
        const box = { x, y: ty - h * 0.8, w, h };
        if (box.y < 2 || box.y + h > H - B + 4) continue;
        if (!placed.some(p => hit(p, box))) { best = { box, ty }; break; }
        if (!best) best = { box, ty, fallback: true };
      }
      placed.push(best.box);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("x", best.box.x + w / 2);
      t.setAttribute("y", best.ty);
      // faint dashed leader from the label's nearest edge to the dot
      const b = best.box;
      const ex = Math.max(b.x, Math.min(b.x + b.w, cx)), ey = Math.max(b.y, Math.min(b.y + b.h, cy));
      const len = Math.hypot(ex - cx, ey - cy);
      if (len > 9) {
        const r = 9 / len;                                   // start just outside the dot
        leaders.insertAdjacentHTML("beforeend",
          `<line class="leader" x1="${cx + (ex - cx) * r}" y1="${cy + (ey - cy) * r}" x2="${ex}" y2="${ey}"/>`);
      }
    });
  }
  let current = "All";
  if (document.fonts) document.fonts.ready.then(() => { if (view === "overview") drawMap(currentList()); });

  // ---- Live map: zoomable view streaming tiles from the Lotus squaremap ----
  // squaremap uses Leaflet's CRS.Simple with 1 map unit = 8 blocks (max zoom 3 = 1 block per pixel),
  // and serves 512px tiles at tiles/<world>/<zoom>/<x>_<z>.png for zooms 0-3.
  const SQUAREMAP = "https://lotus.blossomcraft.org";
  const live = document.getElementById("live");
  const hint = document.getElementById("map-hint");
  const viewSwitch = document.querySelector(".view-switch");
  let leaflet = null, liveMap = null, liveLayer = null, view = "overview";

  function loadLeaflet() {
    if (leaflet) return leaflet;
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    leaflet = new Promise((ok, fail) => {
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = ok; js.onerror = fail;
      document.head.appendChild(js);
    });
    return leaflet;
  }

  function initLive() {
    const ll = (x, z) => L_.latLng(-z / 8, x / 8);
    liveMap = L_.map(live, {
      crs: L_.CRS.Simple, minZoom: -4, maxZoom: 5, zoomSnap: 0.5, zoomDelta: 0.5,
      maxBounds: L_.latLngBounds(ll(-X - 4000, -LIVE_Z - 4000), ll(X + 4000, LIVE_Z + 4000)), maxBoundsViscosity: 0.8,
      attributionControl: false
    });
    // zoomed out: the stitched overview image (light); zoomed in: real tiles from the server
    // The stitched overview image sits UNDER the live tiles (its own pane below the tile pane), so it only
    // shows when zoomed far out or while tiles are still loading. Live tiles are fetched per zoom level,
    // like squaremap: zoom 0 = 8 blocks/pixel ... zoom 3 = 1 block/pixel, then upscaled to zoom 5.
    liveMap.createPane("basemap").style.zIndex = 150;      // Leaflet's tile pane is 200
    L_.imageOverlay("images/map.jpg", L_.latLngBounds(ll(-X, -IMG_Z), ll(X, IMG_Z)), { pane: "basemap" }).addTo(liveMap);
    L_.tileLayer(`${SQUAREMAP}/tiles/minecraft_overworld/{z}/{x}_{y}.png`, {
      tileSize: 512, minZoom: -1, minNativeZoom: 0, maxNativeZoom: 3, maxZoom: 5, noWrap: true, keepBuffer: 3,
      errorTileUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
    }).addTo(liveMap);
    // stacking: terrain < roads < street names < stop dots < stop names / popups
    [["roads", 410], ["route", 415], ["roadLabels", 420], ["dots", 430], ["player", 640]]
      .forEach(([n, z]) => liveMap.createPane(n).style.zIndex = z);
    liveMap.getPane("route").style.pointerEvents = "none";
    liveMap.on("dragstart", () => { if (nav.active) setFollow(false); });
    liveMap.on("click", e => { if (edit.step) editClick(e); });
    liveMap.getPane("roadLabels").style.pointerEvents = "none";
    liveLayer = L_.layerGroup().addTo(liveMap);
    liveMap.fitBounds(L_.latLngBounds(ll(-X, -Z / 2), ll(X, Z / 2)));
    // block coordinates under the cursor
    const pos = L_.control({ position: "bottomleft" });
    pos.onAdd = () => { const d = L_.DomUtil.create("div", "live-pos"); d.textContent = "X: –, Z: –"; return d; };
    pos.addTo(liveMap);
    liveMap.on("mousemove", e => pos.getContainer().textContent =
      `X: ${Math.round(e.latlng.lng * 8)}, Z: ${Math.round(-e.latlng.lat * 8)}`);
    // names only once zoomed in enough that they don't pile up
    const labelToggle = () => live.classList.toggle("labels-off", liveMap.getZoom() < -1);
    liveMap.on("zoomend", labelToggle); labelToggle();
    drawRoads();
  }

  // ---- Roads for the live map, generated from claims (js/roads.js) and named here ----
  const MAJOR = ["/pw Highway", "+Z Highway", "-Z Highway"];
  const roadLen = r => Math.abs(r.to[0] - r.from[0]) + Math.abs(r.to[1] - r.from[1]);
  const distToRoad = ([x, z], r) => {                       // roads are axis-aligned segments
    const cx = Math.max(Math.min(r.from[0], r.to[0]), Math.min(Math.max(r.from[0], r.to[0]), x));
    const cz = Math.max(Math.min(r.from[1], r.to[1]), Math.min(Math.max(r.from[1], r.to[1]), z));
    return Math.hypot(x - cx, z - cz);
  };
  const touches = (a, b) => [a.from, a.to].some(p => distToRoad(p, b) <= 20) || [b.from, b.to].some(p => distToRoad(p, a) <= 20);

  const previewExtensions = [];                              // end points being tried out with ?edit (not saved)
  const previewSideRoads = [];                               // side roads being drawn with ?edit (not saved)

  // Turn claims (js/claims.js) into roads using ROAD_SETTINGS and IGNORE_CLAIMS from data.js
  function buildRoads() {
    const S = Object.assign({ owners: [], minWidth: 10, maxWidth: 14, minLength: 40, joinGap: 40, joinOffset: 8, snap: 15,
                              connectOffset: 5, connectGap: 2000 },
      typeof ROAD_SETTINGS === "undefined" ? {} : ROAD_SETTINGS);
    const ignore = typeof IGNORE_CLAIMS === "undefined" ? [] : IGNORE_CLAIMS;
    const claims = typeof CLAIMS === "undefined" ? [] : CLAIMS;
    const segs = [];
    claims.forEach(c => {
      if (S.owners.length && !S.owners.includes(c.owner)) return;
      if (ignore.some(([x, z]) => x >= c.x1 && x <= c.x2 && z >= c.z1 && z <= c.z2)) return;
      const w = c.x2 - c.x1, h = c.z2 - c.z1, narrow = Math.min(w, h), long = Math.max(w, h);
      if (narrow < S.minWidth || narrow > S.maxWidth || long <= S.minLength) return;
      segs.push(w >= h
        ? { dir: "EW", c: (c.z1 + c.z2) / 2, a1: c.x1, a2: c.x2, owner: c.owner, width: narrow, len: long }
        : { dir: "NS", c: (c.x1 + c.x2) / 2, a1: c.z1, a2: c.z2, owner: c.owner, width: narrow, len: long });
    });
    // Group pieces with union-find, using `shouldJoin(a, b)` to decide; returns merged pieces
    const group = (pieces, shouldJoin) => {
      const parent = pieces.map((_, i) => i);
      const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
      pieces.forEach((a, i) => pieces.forEach((b, j) => {
        if (j > i && a.dir === b.dir && shouldJoin(a, b)) parent[find(i)] = find(j);
      }));
      const groups = {};
      pieces.forEach((p, i) => (groups[find(i)] = groups[find(i)] || []).push(p));
      return Object.values(groups).map(parts => {
        const total = parts.reduce((t, p) => t + p.len, 0), byOwner = {};
        parts.forEach(p => byOwner[p.owner] = (byOwner[p.owner] || 0) + p.len);
        return { dir: parts[0].dir,
          c: Math.round(parts.reduce((t, p) => t + p.c * p.len, 0) / total),
          a1: Math.min(...parts.map(p => p.a1)), a2: Math.max(...parts.map(p => p.a2)),
          owner: Object.keys(byOwner).sort((a, b) => byOwner[b] - byOwner[a])[0],
          width: Math.round(parts.reduce((t, p) => t + p.width * p.len, 0) / total),
          len: total };
      });
    };
    // snap road ends onto the road they meet
    const snap = roads => roads.forEach(r => roads.forEach(o => {
      if (o.dir === r.dir || r.c < o.a1 - S.snap || r.c > o.a2 + S.snap) return;
      if (Math.abs(r.a1 - o.c) <= S.snap) r.a1 = o.c;
      if (Math.abs(r.a2 - o.c) <= S.snap) r.a2 = o.c;
    }));
    const gapOf = (a, b) => Math.max(a.a1, b.a1) - Math.min(a.a2, b.a2);   // <= 0 when they overlap
    const seg = r => r.dir === "EW" ? { from: [r.a1, r.c], to: [r.a2, r.c] } : { from: [r.c, r.a1], to: [r.c, r.a2] };

    // 1. claims that touch end to end become one road
    let pieces = group(segs, (a, b) => Math.abs(a.c - b.c) <= S.joinOffset && gapOf(a, b) <= S.joinGap);
    snap(pieces);

    // 2. a road that stops and carries on further ahead (within connectOffset sideways) is joined
    //    across the gap - unless other roads already link the two ends around the gap (a detour).
    const isDetour = (a, b) => {
      const [first, second] = a.a2 <= b.a1 ? [a, b] : [b, a];
      const g1 = first.a2, g2 = second.a1, c = (a.c + b.c) / 2;
      const side = Math.max(300, (g2 - g1) * 1.5);            // how far to the side a detour may swing
      const inArea = p => [p.from, p.to].every(([x, z]) => {
        const along = a.dir === "EW" ? x : z, across = a.dir === "EW" ? z : x;
        return along >= g1 - 30 && along <= g2 + 30 && Math.abs(across - c) <= side;
      });
      const A = seg(first), B = seg(second);
      const local = pieces.filter(p => p !== a && p !== b).map(seg).filter(inArea);
      // walk from the first piece through nearby roads and see if we reach the second
      const seen = new Set(), queue = local.filter(p => touches(p, A));
      while (queue.length) {
        const p = queue.shift();
        if (seen.has(p)) continue;
        seen.add(p);
        if (touches(p, B)) return true;
        local.forEach(q => { if (!seen.has(q) && touches(p, q)) queue.push(q); });
      }
      return false;
    };
    const roads = group(pieces, (a, b) => {
      const gap = gapOf(a, b);
      if (Math.abs(a.c - b.c) > S.connectOffset || gap <= 0 || gap > S.connectGap) return false;
      // only bridge straight to the next piece along the line, never jump over one
      const lo = Math.min(a.a2, b.a2), hi = Math.max(a.a1, b.a1);
      if (pieces.some(p => p !== a && p !== b && p.dir === a.dir && Math.abs(p.c - a.c) <= S.connectOffset && p.a2 > lo && p.a1 < hi)) return false;
      return !isDetour(a, b);
    });
    snap(roads);

    // 3. hand-set end points (ROAD_EXTENSIONS in data.js, plus any being previewed with ?edit):
    //    the road end nearest `near` is moved along the road to line up with `to`
    const exts = [...(typeof ROAD_EXTENSIONS === "undefined" ? [] : ROAD_EXTENSIONS), ...previewExtensions];
    exts.forEach(e => {
      let best = null, bd = 300;
      roads.forEach(r => ["a1", "a2"].forEach(k => {
        const p = r.dir === "EW" ? [r[k], r.c] : [r.c, r[k]];
        const d = Math.hypot(p[0] - e.near[0], p[1] - e.near[1]);
        if (d < bd) { bd = d; best = { r, k }; }
      }));
      if (!best) return;
      best.r[best.k] = Math.round(best.r.dir === "EW" ? e.to[0] : e.to[1]);
      if (best.r.a1 > best.r.a2) [best.r.a1, best.r.a2] = [best.r.a2, best.r.a1];
    });
    if (exts.length) snap(roads);

    // 4. side roads drawn by hand (SIDE_ROADS in data.js, plus any being drawn with ?edit):
    //    each straight piece becomes a real road with the name it was given
    const sides = sideRoadPieces();
    if (sides.length) { roads.push(...sides); snap(roads); }

    return roads.sort((a, b) => (b.a2 - b.a1) - (a.a2 - a.a1)).map(r => {
      const out = { dir: r.dir, owner: r.owner, width: r.width,
        from: r.dir === "EW" ? [r.a1, r.c] : [r.c, r.a1], to: r.dir === "EW" ? [r.a2, r.c] : [r.c, r.a2] };
      if (r.side) Object.assign(out, { side: true, name: r.name, major: r.major });
      return out;
    });
  }

  // Side roads (SIDE_ROADS in data.js + previews) as road pieces. Corners are joined straight
  // north-south / east-west; a slanted piece becomes an L (east-west first, then north-south).
  function sideRoadPieces() {
    const out = [];
    [...(typeof SIDE_ROADS === "undefined" ? [] : SIDE_ROADS), ...previewSideRoads].forEach(s => {
      if (!s || !Array.isArray(s.points) || s.points.length < 2) return;
      const name = String(s.name || "Side Road"), major = !!s.major, width = Math.round(+s.width || 10);
      const add = (a, b) => {
        if (a[0] === b[0] && a[1] === b[1]) return;
        const ew = a[1] === b[1];
        const [lo, hi] = ew ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
        out.push({ dir: ew ? "EW" : "NS", c: ew ? a[1] : a[0], a1: lo, a2: hi, owner: "", width, len: hi - lo, side: true, name, major });
      };
      const pts = s.points.map(q => [+q[0], +q[1]]);
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        if (a[0] !== b[0] && a[1] !== b[1]) { const corner = [b[0], a[1]]; add(a, corner); add(corner, b); }
        else add(a, b);
      }
    });
    return out;
  }

  function nameRoads() {
    const roads = buildRoads();
    // 1. names set in data.js win (side roads already have theirs, from SIDE_ROADS)
    (typeof ROAD_NAMES === "undefined" ? [] : ROAD_NAMES).forEach(o => {
      let best = null, bd = 150;
      roads.forEach(r => { if (r.side) return; const d = distToRoad(o.near, r); if (d < bd) { bd = d; best = r; } });
      if (best) { best.name = o.name; if (o.major !== undefined) best.major = o.major; }
    });
    // 2. automatic names for the main lines (long roads first, short pieces only if still unnamed after step 3)
    const autoName = shortToo => roads.forEach(r => {
      if (r.name || (!shortToo && roadLen(r) <= 2000)) return;
      const c = r.dir === "EW" ? r.from[1] : r.from[0];
      if (r.dir === "EW" && Math.abs(c) < 60) r.name = "/pw Highway";
      else if (r.dir === "NS" && Math.abs(c) < 60) r.name = r.to[1] > 0 ? "+Z Highway" : "-Z Highway";
      else if (r.owner === "Brightnesss") r.name = "Brightnesss Highway";
    });
    // 3. short jogs and detours take the name of the road they're part of
    const inherit = () => {
      for (let changed = true; changed;) {
        changed = false;
        roads.forEach(r => {
          if (r.name || roadLen(r) > 2000) return;
          const parent = roads.find(o => o.name && touches(r, o));
          if (parent) { r.name = parent.name; if (parent.major !== undefined) r.major = parent.major; changed = true; }
        });
      }
    };
    autoName(false); inherit(); autoName(true); inherit();
    // 4. branches to a stop are named after it, e.g. "Atlantis Road"
    roads.forEach(r => {
      if (r.name) return;
      let best = null, bd = 1500;
      LOCATIONS.forEach(l => {
        if (l.type === "End" || l.z === 0) return;
        const d = Math.min(Math.hypot(l.x - r.from[0], l.z - r.from[1]), Math.hypot(l.x - r.to[0], l.z - r.to[1]));
        if (d < bd) { bd = d; best = l; }
      });
      r.name = best ? `${best.name} Road` : `${r.owner} Road`;
    });
    roads.forEach(r => { if (r.major === undefined) r.major = MAJOR.includes(r.name); });
    // Total length of each road: all connected pieces with the same name, so turns,
    // jogs and bend-arounds count toward one number instead of each piece starting over.
    // (Piece ends are snapped to the centre line of the road they meet, so corners aren't double counted.)
    const seen = new Set();
    roads.forEach(start => {
      if (seen.has(start)) return;
      const group = [], queue = [start];
      while (queue.length) {
        const r = queue.shift();
        if (seen.has(r)) continue;
        seen.add(r); group.push(r);
        roads.forEach(o => { if (!seen.has(o) && o.name === r.name && touches(r, o)) queue.push(o); });
      }
      const total = Math.round(group.reduce((t, r) => t + roadLen(r), 0));
      group.forEach(r => { r.total = total; r.pieces = group.length; });
    });
    return roads;
  }
  let namedRoads = nameRoads();
  let roadLines = [], labelLayer = null, roadsLayer = null;

  // ---- Paths: drawn by hand (PATHS in data.js, plus any being drawn with ?edit) ----
  // status "path" = walk/fly along it, "construction" = road under construction, "closed" = closed road.
  // `type` below holds the status. `note` is added after the name on the map and in directions.
  const PATH_KIND = {
    path:         { label: "path", note: "", routable: true,  color: "#7a4a1e", dash: "1 8",  weight: 4 },
    construction: { label: "road under construction", note: "under construction", routable: true,
                    color: "#f29900", dash: "10 7", weight: 5 },
    closed:       { label: "closed road", note: "closed", routable: false, color: "#d93025", dash: "6 6", weight: 4 },
  };
  const previewPaths = [];                                   // paths being drawn with ?edit (not saved)
  const escHTML = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pathLen = p => p.points.reduce((t, q, i) => i ? t + Math.hypot(q[0] - p.points[i - 1][0], q[1] - p.points[i - 1][1]) : 0, 0);
  // the name with its status, e.g. "LH10 (under construction)" - unless the name already says so
  const pathTitle = p => { const n = PATH_KIND[p.type].note; return n && !p.name.toLowerCase().includes(n) ? `${p.name} (${n})` : p.name; };
  function readPaths() {
    return [...(typeof PATHS === "undefined" ? [] : PATHS), ...previewPaths]
      .filter(p => p && Array.isArray(p.points) && p.points.length >= 2)
      .map(p => {
        const type = PATH_KIND[p.status] ? p.status : "path";    // older entries with type "walk"/"elytra" are plain paths
        return { ...p, type, path: true, name: p.name || (type === "path" ? "Path" : "Road"),
                 points: p.points.map(q => [+q[0], +q[1]]) };
      });
  }
  let namedPaths = readPaths();

  // Rebuild roads from scratch (used when previewing a new end point with ?edit)
  function redrawRoads() {
    namedRoads = nameRoads();
    namedPaths = readPaths();
    if (!liveMap) return;
    drawRoads();
  }

  function drawRoads() {
    const ll = (x, z) => L_.latLng(-z / 8, x / 8);
    roadLines = [];
    if (roadsLayer) roadsLayer.clearLayers(); else roadsLayer = L_.layerGroup().addTo(liveMap);
    const firstDraw = !labelLayer;
    const fallback = !namedRoads.length;                    // no claims.js / no roads: draw the stops' branches instead
    const roads = fallback
      ? [{ from: [-X, 0], to: [X, 0], width: 10, major: true },
         ...LOCATIONS.filter(l => l.z !== 0).map(l => ({ from: [l.x, 0], to: [l.x, l.z], width: 10, major: true }))]
      : namedRoads;
    // minor roads first so the highway sits on top where they meet
    const ordered = [...roads].sort((a, b) => a.major - b.major);
    ["case", "fill"].forEach(part => ordered.forEach(r => {
      const line = L_.polyline([ll(...r.from), ll(...r.to)], {
        className: `road-${part} ${r.major ? "major" : "minor"}`, interactive: part === "fill" && !fallback, pane: "roads"
      }).addTo(roadsLayer);
      // click a road to see its name and a point on it (handy for ROAD_NAMES / IGNORE_CLAIMS in data.js)
      if (part === "fill" && !fallback) {
        const mid = [Math.round((r.from[0] + r.to[0]) / 2), Math.round((r.from[1] + r.to[1]) / 2)];
        const lengthText = r.pieces > 1
          ? `${r.total.toLocaleString()} blocks long in total (this stretch ${roadLen(r).toLocaleString()}), ${r.width} wide`
          : `${roadLen(r).toLocaleString()} blocks long, ${r.width} wide`;
        line.bindPopup(`<strong>${escHTML(r.name)}</strong><span class="coords">${r.side ? "Side road, " : ""}${lengthText}</span>` +
          `<p>From X ${r.from[0]}, Z ${r.from[1]} to X ${r.to[0]}, Z ${r.to[1]}.<br>` +
          (r.side ? `Drawn by hand: change it in <code>SIDE_ROADS</code> in data.js.</p>` : `Point on road: <code>[${mid[0]}, ${mid[1]}]</code></p>`),
          { className: "live-popup", maxWidth: 280 });
      }
      roadLines.push({ line, part, r });
    }));
    // paths (orange dots), roads under construction (amber dashes), closed roads (red dashes),
    // on a thin white edge so they show on any terrain
    namedPaths.forEach(p => {
      const k = PATH_KIND[p.type], pts = p.points.map(q => ll(...q));
      L_.polyline(pts, { pane: "roads", color: "#fff", weight: k.weight + 3, opacity: 0.85, lineCap: "round", lineJoin: "round", interactive: false })
        .addTo(roadsLayer);
      L_.polyline(pts, { pane: "roads", color: k.color, weight: k.weight, dashArray: k.dash, lineCap: "round", lineJoin: "round", className: "path-line" })
        .bindPopup(`<strong>${escHTML(pathTitle(p))}</strong><span class="coords">${k.label[0].toUpperCase() + k.label.slice(1)}, ` +
          `${Math.round(pathLen(p)).toLocaleString()} blocks long</span>` +
          (k.routable ? "" : `<p>Directions won't use it.</p>`) +
          `<p>From X ${p.points[0][0]}, Z ${p.points[0][1]} to X ${p.points.at(-1)[0]}, Z ${p.points.at(-1)[1]}.</p>`,
          { className: "live-popup", maxWidth: 280 })
        .addTo(roadsLayer);
    });
    // end dots: road ends that don't meet another road or a stop
    if (!fallback) {
      const ends = [];
      roads.forEach(r => [r.from, r.to].forEach(p => {
        if (roads.some(o => o !== r && distToRoad(p, o) <= 20)) return;
        if (LOCATIONS.some(l => Math.hypot(l.x - p[0], l.z - p[1]) <= 40)) return;
        if (ends.some(e => Math.hypot(e[0] - p[0], e[1] - p[1]) <= 20)) return;
        ends.push(p);
        L_.circleMarker(ll(...p), { radius: 5, weight: 2.5, className: "road-end", pane: "dots" })
          .bindTooltip(`End of ${escHTML(r.name)}<br>X: ${p[0]}, Z: ${p[1]}`, { direction: "top", offset: [0, -6], className: "road-end-tip" })
          .addTo(roadsLayer);
      }));
    }
    if (firstDraw) {
      labelLayer = L_.layerGroup().addTo(liveMap);
      liveMap.on("zoomend", styleRoads);
      liveMap.on("moveend", labelRoads);
    }
    styleRoads(); labelRoads();
  }

  // Road width follows the real claim width (10-13 blocks) but never gets thinner than a few pixels
  function styleRoads() {
    const ppb = 2 ** liveMap.getZoom() / 8;                 // screen pixels per block
    roadLines.forEach(({ line, part, r }) => {
      const fill = Math.max(r.major ? 5 : 3.5, r.width * ppb);
      line.setStyle({ weight: part === "case" ? fill + (r.major ? 3 : 2.5) : fill });
    });
  }

  // Google-Maps-style street names: written along the road, repeated on long stretches, only in view
  // Highway shield: green top saying "Lotus Highway", brown bottom with the road's number.
  // Used for any road whose name has a number in it (LH5 -> 5); other roads get a text label.
  const shieldNumber = name => (name.match(/\d+/) || [null])[0];
  // Shape based on the public-domain Interstate shield "I-blank.svg" from Wikimedia Commons
  // (https://commons.wikimedia.org/wiki/File:I-blank.svg): red top recoloured green, blue bottom brown,
  // "INTERSTATE" replaced with "LOTUS HIGHWAY".
  const SHIELD_OUTLINE = "M80.75,0C115.43,10.58 152.24,16.28 190.38,16.28C228.52,16.28 265.32,10.58 300,0C334.68,10.58 371.48,16.28 409.62,16.28C447.76,16.28 484.57,10.58 519.25,0C569.81,63.91 600,144.68 600,232.5C600,413.92 471.17,565.25 300,600C128.83,565.25 0,413.92 0,232.5C0,144.68 30.19,63.91 80.75,0z";
  const SHIELD_BOTTOM = "M15,232.5C15,200.52 19.17,169.52 26.99,140L573.01,140C580.83,169.52 585,200.52 585,232.5C585,405.61 462.83,550.17 300,584.68C137.17,550.17 15,405.61 15,232.5z";
  const SHIELD_TOP = "M31.32,125C43.58,85.78 62.36,49.44 86.4,17.26C119.5,26.39 154.37,31.27 190.38,31.27C228.44,31.27 265.22,25.82 300,15.65C334.78,25.82 371.56,31.27 409.62,31.27C445.63,31.27 480.5,26.39 513.6,17.26C537.64,49.44 556.42,85.78 568.68,125L31.32,125z";
  function shieldSVG(num, name) {
    const size = num.length >= 3 ? 210 : 260;               // squeeze 3-digit numbers
    return `<svg class="shield" viewBox="-2 -2 604 604" width="25" height="25" role="img" aria-label="${name}">` +
      `<path d="${SHIELD_OUTLINE}" fill="#fff" stroke="#000" stroke-width="2"/>` +
      `<path d="${SHIELD_BOTTOM}" fill="#6b4423" transform="matrix(1.0071,0,0,1.0103,-2.128,-3.669)"/>` +
      `<path d="${SHIELD_TOP}" fill="#1e6b3a" transform="matrix(1.0125,0,0,1.0271,-3.764,-3.102)"/>` +
      `<text x="300" y="104" text-anchor="middle" font-size="66" font-weight="700" fill="#fff" textLength="400" lengthAdjust="spacingAndGlyphs">LOTUS HIGHWAY</text>` +
      `<text x="300" y="${num.length >= 3 ? 420 : 435}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#fff">${num}</text>` +
      `</svg>`;
  }

  function labelRoads() {
    labelLayer.clearLayers();
    const zoom = liveMap.getZoom();
    if (zoom < -1.5) return;
    const ppb = 2 ** zoom / 8, view = liveMap.getBounds().pad(0.3), placed = [];
    // path names: once, along the longest straight bit, kept upright
    namedPaths.forEach(p => {
      let bi = 1, bl = 0;
      p.points.forEach((q, i) => { if (!i) return; const l = Math.hypot(q[0] - p.points[i - 1][0], q[1] - p.points[i - 1][1]); if (l > bl) { bl = l; bi = i; } });
      const title = pathTitle(p);
      if (bl * ppb < title.length * 6.5 + 30) return;       // too short on screen
      const a = p.points[bi - 1], b = p.points[bi];
      const at = L_.latLng(-(a[1] + b[1]) / 16, (a[0] + b[0]) / 16);
      if (!view.contains(at)) return;
      let rot = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      if (rot > 90) rot -= 180; else if (rot < -90) rot += 180;
      placed.push(liveMap.latLngToLayerPoint(at));
      L_.marker(at, { pane: "roadLabels", interactive: false, keyboard: false,
        icon: L_.divIcon({ className: "road-label path-label", iconSize: [0, 0],
          html: `<span class="${p.type}" style="transform:translate(-50%,-50%) rotate(${rot.toFixed(1)}deg) translateY(-9px)">${escHTML(title)}</span>` }) }).addTo(labelLayer);
    });
    namedRoads.forEach(r => {
      const num = shieldNumber(r.name);
      const len = roadLen(r) * ppb, textW = num ? 28 : r.name.length * 7.2 + 24;
      if (len < textW + 30) return;                          // road too short on screen to fit its name
      const n = Math.max(1, Math.floor(len / (num ? 800 : 650)));
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        const x = r.from[0] + (r.to[0] - r.from[0]) * f, z = r.from[1] + (r.to[1] - r.from[1]) * f;
        const at = L_.latLng(-z / 8, x / 8);
        if (!view.contains(at)) continue;
        // skip if it would land on top of a stop or another road name
        const p = liveMap.latLngToLayerPoint(at);
        if (placed.some(q => q.distanceTo(p) < textW * 0.6)) continue;
        if (LOCATIONS.some(l => liveMap.latLngToLayerPoint(L_.latLng(-l.z / 8, l.x / 8)).distanceTo(p) < textW / 2 + 10)) continue;
        placed.push(p);
        const rot = r.dir === "NS" ? 90 : 0;
        const html = num
          ? `<span class="shield-wrap">${shieldSVG(num, escHTML(r.name))}</span>`       // shields stay upright
          : `<span class="${r.major ? "major" : ""}" style="transform:translate(-50%,-50%) rotate(${rot}deg)">${escHTML(r.name)}</span>`;
        L_.marker(at, {
          pane: "roadLabels", interactive: false, keyboard: false,
          icon: L_.divIcon({ className: "road-label", iconSize: [0, 0], html })
        }).addTo(labelLayer);
      }
    });
  }

  function drawLive(list) {
    if (!liveMap) return;
    const ll = (x, z) => L_.latLng(-z / 8, x / 8);
    liveLayer.clearLayers();
    liveMarkers.clear();
    list.forEach(l => {
      const m = L_.circleMarker(ll(l.x, l.z), { radius: 7, className: "live-dot-marker", weight: 3, pane: "dots" })
        .bindTooltip(l.name, { permanent: true, direction: l.z > 0 ? "bottom" : "top", offset: [0, l.z > 0 ? 8 : -8], className: "live-lbl" })
        .bindPopup(infoHTML(l) + `<button type="button" class="nav-here" data-loc="${LOCATIONS.indexOf(l)}">Directions here</button>`,
          { className: "live-popup", maxWidth: 260 })
        .addTo(liveLayer);
      liveMarkers.set(l, m);
    });
  }
  const liveMarkers = new Map();

  // Clicking a stop in the list jumps the map to it and opens its info
  function goToStop(l) {
    document.querySelector(".mapbox").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    if (view === "live" && liveMap) {
      const m = liveMarkers.get(l);
      if (!m) return;
      const zoom = Math.max(liveMap.getZoom(), 2);           // close enough to see the build (2 blocks per pixel)
      liveMap.flyTo(m.getLatLng(), zoom, { duration: 1.2 });
      liveMap.once("moveend", () => m.openPopup());
    } else {
      const i = shown.indexOf(l);
      if (i >= 0) showTip(i);
    }
  }
  route.addEventListener("click", e => {
    const li = e.target.closest(".stop");
    if (li) goToStop(LOCATIONS[+li.dataset.loc]);
  });
  route.addEventListener("keydown", e => {
    const li = e.target.closest(".stop");
    if (li && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goToStop(LOCATIONS[+li.dataset.loc]); }
  });

  let L_ = null;
  async function setView(v) {
    view = v;
    viewSwitch.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v));
    hideTip();
    if (v === "live") {
      hint.textContent = "Loading live map…";
      try { await loadLeaflet(); } catch {
        hint.textContent = "Couldn't load the live map. Check your connection."; setView("overview"); return;
      }
      L_ = window.L;
      map.hidden = true; live.hidden = false;
      if (!liveMap) initLive(); else liveMap.invalidateSize();
      drawLive(currentList());
      hint.textContent = "Scroll or pinch to zoom, drag to move. Click a dot for details.";
    } else {
      live.hidden = true; map.hidden = false;
      drawMap(currentList());
      hint.textContent = "Click a dot for details.";
    }
  }
  viewSwitch.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b && b.dataset.view !== view) setView(b.dataset.view);
  });
  const currentList = () => LOCATIONS.filter(l => current === "All" || l.type === current);

  // ================= Road editor (?edit): set where a road ends =================
  const editPanel = document.getElementById("edit-panel");
  const edit = { step: 0, from: null, lines: [], marker: null, pts: [], pathLines: [], sideLines: [], draft: null };
  const drawingSide = () => $id("edit-path-type").value === "road";   // the Status list's "Side road"
  const editMsg = text => { document.getElementById("edit-msg").innerHTML = text; };
  const $id = id => document.getElementById(id);
  if (editPanel && /[?&#]edit\b/.test(location.search + location.hash)) {
    editPanel.hidden = false;
    $id("edit-start").addEventListener("click", () => {
      if (!liveMap) { editMsg("The live map is still loading, try again in a moment."); return; }
      if (edit.step === "path") cancelPath();
      edit.step = 1;
      live.classList.add("picking");
      editMsg("<b>Step 1:</b> click the end of the road you want to change (a white end dot, or where the road stops).");
    });
    $id("edit-path").addEventListener("click", () => {
      if (!liveMap) { editMsg("The live map is still loading, try again in a moment."); return; }
      if (edit.marker) { edit.marker.remove(); edit.marker = null; }
      edit.step = "path"; edit.pts = [];
      live.classList.add("picking");
      liveMap.doubleClickZoom.disable();
      $id("edit-path-form").hidden = false;
      $id("edit-path").disabled = true;
      drawDraft();
      editMsg("<b>Drawing a path:</b> click along the path, one click at each corner. Paths go dead straight " +
        "(north-south or east-west) from corner to corner; hold Shift while clicking for any angle. Clicks near a road or a stop snap onto it, " +
        "so start and end the path on a road (or at a stop) so directions can use it. Then click <b>Finish path</b>. " +
        "Pick <b>Side road</b> under Status for a real road: it's drawn and used for directions just like the claimed roads.");
    });
    $id("edit-path-type").addEventListener("change", () => {
      // side roads are always straight, so a slanted piece drawn with Shift is squared off
      if (drawingSide()) edit.pts = edit.pts.reduce((out, p) => {
        const q = out[out.length - 1];
        if (q && q[0] !== p[0] && q[1] !== p[1]) out.push([p[0], q[1]]);
        out.push(p); return out;
      }, []);
      drawDraft(); if (edit.step === "path") pathProgress();
    });
    $id("edit-path-undo").addEventListener("click", () => { edit.pts.pop(); drawDraft(); pathProgress(); });
    $id("edit-path-cancel").addEventListener("click", () => { cancelPath(); editMsg("Path cancelled."); });
    $id("edit-path-done").addEventListener("click", finishPath);
    document.addEventListener("keydown", e => {
      if (edit.step !== "path") return;
      if (e.key === "Escape") { cancelPath(); editMsg("Path cancelled."); }
      else if (e.key === "Enter" && e.target.tagName !== "BUTTON") { e.preventDefault(); finishPath(); }
    });
    $id("edit-clear").addEventListener("click", () => {
      previewExtensions.length = 0; edit.lines = [];
      previewPaths.length = 0; edit.pathLines = [];
      previewSideRoads.length = 0; edit.sideLines = [];
      $id("edit-out").hidden = true; $id("edit-out-paths").hidden = true; $id("edit-out-side").hidden = true;
      $id("edit-clear").hidden = true;
      redrawRoads();
      editMsg("Previews cleared.");
    });
    const copier = (btn, pre) => $id(btn).addEventListener("click", e => {
      const text = $id(pre).textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => {
        e.target.textContent = "Copied!"; setTimeout(() => e.target.textContent = "Copy", 1500);
      });
    });
    copier("edit-copy", "edit-snippet"); copier("edit-path-copy", "edit-path-snippet"); copier("edit-side-copy", "edit-side-snippet");
    // Lotus Maps mod: save lotusmaps.json next to index.html and upload it with the site
    $id("edit-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(lotusMapsData(), null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "lotusmaps.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      editMsg("Saved <b>lotusmaps.json</b>. Put it in the Highway folder (next to index.html) and upload it with the site: " +
        "the Lotus Maps mod downloads it from there. Previews you haven't added to data.js are included too.");
    });
  }

  // Everything the Lotus Maps Minecraft mod needs: the finished roads (already built from claims and named),
  // paths, stops and navigation settings. The mod reads this instead of redoing the road building.
  function lotusMapsData() {
    return {
      format: 1,
      generated: new Date().toISOString(),
      settings: { roadSpeed: NAV.roadSpeed, offroadSpeed: NAV.offroadSpeed, pathSpeed: NAV.pathSpeed, offroadDetour: NAV.offroadDetour,
                  arriveDistance: NAV.arriveDistance, snapMax: NAV.snapMax, gapLink: NAV.gapLink, jog: NAV.jog },
      locations: LOCATIONS.map(l => ({ name: l.name, type: l.type, x: l.x, z: l.z, desc: l.desc || "" })),
      roads: namedRoads.map(r => ({ name: r.name, major: !!r.major, dir: r.dir, width: r.width, from: r.from, to: r.to })),
      paths: namedPaths.map(p => ({ name: p.name, status: p.type, points: p.points })),
    };
  }
  window.lotusMapsData = lotusMapsData;

  // ---- drawing a path ----
  function drawDraft() {
    if (!liveMap) return;
    if (edit.draft) edit.draft.clearLayers(); else edit.draft = L_.layerGroup().addTo(liveMap);
    if (!edit.pts.length) return;
    // a side road looks like a minor road (white with a grey edge), paths like their kind
    const side = drawingSide();
    const k = side ? { color: "#fff", edge: "#7d7d7d", weight: 6, dash: null } : { ...PATH_KIND[$id("edit-path-type").value], edge: "#fff" };
    const pts = edit.pts.map(p => L_.latLng(-p[1] / 8, p[0] / 8));
    L_.polyline(pts, { pane: "route", color: k.edge, weight: k.weight + 3, lineJoin: side ? "miter" : "round", interactive: false }).addTo(edit.draft);
    L_.polyline(pts, { pane: "route", color: k.color, weight: k.weight, dashArray: k.dash, lineCap: "round", interactive: false }).addTo(edit.draft);
    if (side) k.color = "#7d7d7d";                          // corner dots in the edge colour so they show on white
    pts.forEach((p, i) => L_.circleMarker(p, { pane: "dots", radius: i ? 4 : 6, weight: 2, color: k.color, fillColor: "#fff", fillOpacity: 1, interactive: false }).addTo(edit.draft));
  }
  function pathProgress() {
    const n = edit.pts.length, what = drawingSide() ? "a side road" : "a path";
    const len = Math.round(pathLen({ points: edit.pts }));
    editMsg(n ? `<b>Drawing ${what}:</b> ${n} point${n === 1 ? "" : "s"}${n > 1 ? `, ${len.toLocaleString()} blocks` : ""}. ` +
      `Keep clicking corners, then <b>Finish path</b> (or press Enter). <b>Undo point</b> removes the last one, Esc cancels.` +
      (drawingSide() ? " Side roads always run straight north-south or east-west." : "")
      : `<b>Drawing ${what}:</b> click where it starts${drawingSide() ? " (on another road, so they join)" : ""}.`);
  }
  function endDrawing() {
    edit.step = 0; edit.pts = [];
    live.classList.remove("picking");
    if (liveMap) liveMap.doubleClickZoom.enable();
    if (edit.draft) edit.draft.clearLayers();
    $id("edit-path-form").hidden = true;
    $id("edit-path").disabled = false;
  }
  function cancelPath() { endDrawing(); }
  function finishPath() {
    if (edit.pts.length < 2) { editMsg("<b>Drawing a path:</b> a path needs at least two points. Click on the map to add them."); return; }
    const type = $id("edit-path-type").value;
    const points = edit.pts.map(p => p.slice());
    if (type === "road") { finishSideRoad($id("edit-path-name").value.trim() || "Side Road", points); return; }
    const name = $id("edit-path-name").value.trim() || (type === "path" ? "Path" : "Road");
    previewPaths.push({ name, status: type, points });
    edit.pathLines.push(`  { name: ${JSON.stringify(name)}, status: "${type}", points: [${points.map(p => `[${p[0]}, ${p[1]}]`).join(", ")}] },`);
    endDrawing();
    redrawRoads();
    $id("edit-path-snippet").textContent = edit.pathLines.join("\n");
    $id("edit-out-paths").hidden = false;
    $id("edit-clear").hidden = false;
    $id("edit-path-name").value = "";
    editMsg(`Previewing <b>${escHTML(name)}</b> (${PATH_KIND[type].label}, ${Math.round(pathLen({ points })).toLocaleString()} blocks). ` +
      `It's only on your screen until you add it to data.js.` +
      (PATH_KIND[type].routable ? " Directions can already use it, so you can test it now." : " Directions won't route through it."));
  }
  // a finished side road: preview it as a real road and give the SIDE_ROADS line for data.js
  function finishSideRoad(name, points) {
    previewSideRoads.push({ name, major: false, points });
    edit.sideLines.push(`  { name: ${JSON.stringify(name)}, major: false, points: [${points.map(p => `[${p[0]}, ${p[1]}]`).join(", ")}] },`);
    endDrawing();
    redrawRoads();
    $id("edit-side-snippet").textContent = edit.sideLines.join("\n");
    $id("edit-out-side").hidden = false;
    $id("edit-clear").hidden = false;
    $id("edit-path-name").value = "";
    editMsg(`Previewing side road <b>${escHTML(name)}</b> (${Math.round(pathLen({ points })).toLocaleString()} blocks). ` +
      `It's only on your screen until you add it to data.js. Directions can already use it, so you can test it now. ` +
      `Change <code>major: false</code> to <code>true</code> to make it a yellow highway.`);
  }
  // Where a click lands: snapped onto a nearby stop, path corner or road (within 14 px on screen).
  // Paths are perfectly straight: each piece runs exactly north-south or east-west from the last point
  // (hold Shift while clicking for any angle).
  function snapClick(e) {
    const ll = p => L_.latLng(-p[1] / 8, p[0] / 8);
    const px = p => liveMap.latLngToContainerPoint(ll(p)).distanceTo(e.containerPoint);
    let raw = [e.latlng.lng * 8, -e.latlng.lat * 8];
    const prev = edit.pts[edit.pts.length - 1];
    // hold Shift for any angle (paths only: side roads are always straight)
    const straight = prev && (drawingSide() || !(e.originalEvent && e.originalEvent.shiftKey));
    let lockX = false;                                       // true = this piece runs north-south (keeps prev's X)
    if (straight) {
      lockX = Math.abs(raw[1] - prev[1]) > Math.abs(raw[0] - prev[0]);
      raw = lockX ? [prev[0], raw[1]] : [raw[0], prev[1]];
    }
    let best = null, bd = 14;
    const consider = p => { const d = px(p); if (d < bd) { bd = d; best = p; } };
    // exact points (stops, path corners) only when they're on the straight line
    const onLine = p => !straight || (lockX ? Math.abs(p[0] - prev[0]) < 1 : Math.abs(p[1] - prev[1]) < 1);
    LOCATIONS.forEach(l => onLine([l.x, l.z]) && consider([l.x, l.z]));
    namedPaths.forEach(p => p.points.forEach(q => onLine(q) && consider(q)));
    if (!best) namedRoads.forEach(r => {
      if (!straight) return consider(projectOnRoad(raw, r));
      // straight piece: stop where it meets a road crossing its line
      const roadNS = r.dir === "NS";
      if (roadNS === lockX) return;                          // parallel road: no meeting point
      const hit = lockX ? [prev[0], r.from[1]] : [r.from[0], prev[1]];
      if (distToRoad(hit, r) < 1) consider(hit);
    });
    if (!best && edit.pts.length > 2 && onLine(edit.pts[0])) consider(edit.pts[0]);   // close a loop
    return (best || raw).map(Math.round);
  }

  function editClick(e) {
    liveMap.closePopup();
    if (edit.step === "path") { edit.pts.push(snapClick(e)); drawDraft(); pathProgress(); return; }
    const x = Math.round(e.latlng.lng * 8), z = Math.round(-e.latlng.lat * 8);
    const ll = p => L_.latLng(-p[1] / 8, p[0] / 8);
    if (edit.step === 1) {
      // nearest road end on screen
      let best = null, bd = 40;
      namedRoads.forEach(r => [r.from, r.to].forEach(p => {
        const d = liveMap.latLngToContainerPoint(ll(p)).distanceTo(e.containerPoint);
        if (d < bd) { bd = d; best = { r, p }; }
      }));
      if (!best) { editMsg("<b>Step 1:</b> that's not near a road end. Click closer to where the road stops (zoom in if it helps)."); return; }
      edit.from = best; edit.step = 2;
      if (edit.marker) edit.marker.remove();
      edit.marker = L_.circleMarker(ll(best.p), { radius: 9, weight: 3, color: "#1a73e8", fillColor: "#fff", fillOpacity: 1, pane: "dots" }).addTo(liveMap);
      editMsg(`<b>Step 2:</b> click where <b>${best.r.name}</b> should end. It stays straight (${best.r.dir === "EW" ? "east-west, so only the X counts" : "north-south, so only the Z counts"}).`);
      return;
    }
    // step 2: the new end
    const { r, p } = edit.from;
    const to = r.dir === "EW" ? [x, p[1]] : [p[0], z];
    previewExtensions.push({ near: p.slice(), to });
    edit.lines.push(`  { near: [${p[0]}, ${p[1]}], to: [${to[0]}, ${to[1]}] },   // ${r.name}`);
    redrawRoads();
    edit.step = 0; live.classList.remove("picking");
    if (edit.marker) { edit.marker.remove(); edit.marker = null; }
    document.getElementById("edit-snippet").textContent = edit.lines.join("\n");
    document.getElementById("edit-out").hidden = false;
    document.getElementById("edit-clear").hidden = false;
    editMsg(`Previewing <b>${r.name}</b> ending at X ${to[0]}, Z ${to[1]}. This is only on your screen until you add it to data.js. Click <b>Set road end</b> to change another.`);
  }

  // ================= Navigation: follow a player and give turn-by-turn directions =================
  const NAV = Object.assign({ playerFeed: "", roadSpeed: 40, offroadSpeed: 6, pathSpeed: 7, offroadDetour: 1, pollSeconds: 2, arriveDistance: 16, snapMax: 4000, gapLink: 250, jog: 250 },
    typeof NAV_SETTINGS === "undefined" ? {} : NAV_SETTINGS);
  const navForm = document.getElementById("nav-form"), navName = document.getElementById("nav-name");
  const navDest = document.getElementById("nav-dest"), navCoords = document.getElementById("nav-coords");
  const navX = document.getElementById("nav-x"), navZ = document.getElementById("nav-z");
  const navGo = document.getElementById("nav-go"), navStatus = document.getElementById("nav-status");
  const navBanner = document.getElementById("nav-banner"), navSteps = document.getElementById("nav-steps");
  const nav = { active: false, timer: null, follow: true, dest: null, player: null, layer: null, marker: null, recenter: null, lastBanner: "", markerYaw: null, bannerTimer: null };

  const fmtBlocks = n => `${Math.round(n).toLocaleString()} block${Math.round(n) === 1 ? "" : "s"}`;
  const fmtTime = s => s < 60 ? "under a minute" : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min`;
  const compass = (dx, dz) => ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]
    [((Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) % 8) + 8) % 8];
  const projectOnRoad = ([x, z], r) => [
    Math.max(Math.min(r.from[0], r.to[0]), Math.min(Math.max(r.from[0], r.to[0]), x)),
    Math.max(Math.min(r.from[1], r.to[1]), Math.min(Math.max(r.from[1], r.to[1]), z))];

  // Destination list: every stop, plus custom coordinates
  if (navForm) {
    navDest.innerHTML = [...LOCATIONS].sort((a, b) => a.name.localeCompare(b.name))
      .map(l => `<option value="${LOCATIONS.indexOf(l)}">${l.name}</option>`).join("") +
      `<option value="coords">Coordinates…</option>`;
    navDest.addEventListener("change", () => { navCoords.hidden = navDest.value !== "coords"; });
    try { navName.value = localStorage.getItem("highway-nav-name") || ""; } catch {}
  }

  // Fastest route over the roads (Dijkstra). Off-road travel is allowed but slower, so the route
  // naturally goes: walk to the nearest useful road -> follow roads -> walk to the destination.
  function findRoute(start, dest) {
    const nodes = [], stations = namedRoads.map(() => []);
    const node = (x, z) => {
      let n = nodes.find(n => Math.hypot(n.x - x, n.z - z) <= 12);
      if (!n) { n = { x, z, edges: [] }; nodes.push(n); }
      return n;
    };
    const along = (r, p) => r.dir === "EW" ? p[0] : p[1];
    const stationAt = (i, n) => { const p = projectOnRoad([n.x, n.z], namedRoads[i]); stations[i].push({ a: along(namedRoads[i], p), n }); };
    // offroadDetour: count cross-country (no road or path) as this many times longer (1 = straight line)
    const link = (a, b, len, speed, road) => {
      const cost = len / speed * (road ? 1 : NAV.offroadDetour);
      a.edges.push({ to: b, len, cost, road });
      b.edges.push({ to: a, len, cost, road });
    };
    // junctions: road ends, ends touching another road, and crossings
    namedRoads.forEach((r, i) => [r.from, r.to].forEach(e => {
      const n = node(...e); stationAt(i, n);
      namedRoads.forEach((o, j) => { if (j !== i && distToRoad(e, o) <= 20) stationAt(j, n); });
    }));
    namedRoads.forEach((a, i) => namedRoads.forEach((b, j) => {
      if (a.dir !== "EW" || b.dir !== "NS") return;
      const x = b.from[0], z = a.from[1];
      if (x > Math.min(a.from[0], a.to[0]) && x < Math.max(a.from[0], a.to[0]) &&
          z > Math.min(b.from[1], b.to[1]) && z < Math.max(b.from[1], b.to[1])) {
        const n = node(x, z); stationAt(i, n); stationAt(j, n);
      }
    }));
    // paths (and roads under construction): each straight bit is a segment; corners and ends near a road join it
    const pathSegs = [];
    namedPaths.forEach(p => {
      if (!PATH_KIND[p.type].routable) return;                // closed roads are never used
      const speed = NAV.pathSpeed;
      p.points.forEach((q, k) => {
        if (k) pathSegs.push({ p, speed, a: p.points[k - 1], b: q, list: [{ t: 0, n: node(...p.points[k - 1]) }, { t: 1, n: node(...q) }] });
      });
      p.points.forEach(q => {
        const n = node(...q);
        namedRoads.forEach((r, j) => {
          const d = distToRoad(q, r);
          if (d > NAV.gapLink) return;
          const m = node(...projectOnRoad(q, r)); stationAt(j, m);
          if (m !== n) link(n, m, d, NAV.offroadSpeed, null);
        });
      });
    });
    const projSeg = ([x, z], a, b) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
      return { t, p: [a[0] + dx * t, a[1] + dz * t] };
    };
    // start and destination, joined off-road to nearby roads and paths, and to each other
    const S = { x: start[0], z: start[1], edges: [], tag: "start" }, D = { x: dest[0], z: dest[1], edges: [], tag: "dest" };
    nodes.push(S, D);
    [S, D].forEach(p => {
      const snaps = namedRoads.map((r, i) => ({ i, p: projectOnRoad([p.x, p.z], r) }))
        .map(s => ({ ...s, d: Math.hypot(s.p[0] - p.x, s.p[1] - p.z) }))
        .sort((a, b) => a.d - b.d).filter((s, k) => k < 3 || s.d <= NAV.snapMax);
      snaps.forEach(s => { const n = node(...s.p); stationAt(s.i, n); if (n !== p) link(p, n, s.d, NAV.offroadSpeed, null); });
      pathSegs.map(s => ({ s, ...projSeg([p.x, p.z], s.a, s.b) }))
        .map(o => ({ ...o, d: Math.hypot(o.p[0] - p.x, o.p[1] - p.z) }))
        .sort((a, b) => a.d - b.d).filter((o, k) => k < 3 && o.d <= NAV.snapMax)
        .forEach(o => { const n = node(...o.p); o.s.list.push({ t: o.t, n }); if (n !== p) link(p, n, o.d, NAV.offroadSpeed, null); });
    });
    link(S, D, Math.hypot(S.x - D.x, S.z - D.z), NAV.offroadSpeed, null);
    // road ends that stop just short of another road (unclaimed bit) connect with a short walk
    namedRoads.forEach((r, i) => [r.from, r.to].forEach(e => {
      const en = node(...e);
      namedRoads.forEach((o, j) => {
        if (j === i) return;
        const d = distToRoad(e, o);
        if (d > 20 && d <= NAV.gapLink) { const n = node(...projectOnRoad(e, o)); stationAt(j, n); link(en, n, d, NAV.offroadSpeed, null); }
      });
    }));
    // road edges between neighbouring stations
    stations.forEach((list, i) => {
      list.sort((a, b) => a.a - b.a);
      for (let k = 1; k < list.length; k++) {
        const a = list[k - 1], b = list[k];
        // junctions at the same spot along the road (e.g. a side road ending just beside it) still connect
        const len = Math.max(b.a - a.a, Math.hypot(a.n.x - b.n.x, a.n.z - b.n.z));
        if (a.n !== b.n && len > 0) link(a.n, b.n, len, NAV.roadSpeed, namedRoads[i]);
      }
    });
    pathSegs.forEach(s => {
      s.list.sort((x, y) => x.t - y.t);
      const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      for (let k = 1; k < s.list.length; k++) {
        const a = s.list[k - 1], b = s.list[k], len = (b.t - a.t) * L;
        if (a.n !== b.n && len > 0) link(a.n, b.n, len, s.speed, s.p);
      }
    });
    // Dijkstra
    const best = new Map([[S, 0]]), prev = new Map(), done = new Set();
    for (;;) {
      let u = null, bu = Infinity;
      best.forEach((c, n) => { if (!done.has(n) && c < bu) { bu = c; u = n; } });
      if (!u || u === D) break;
      done.add(u);
      u.edges.forEach(e => {
        const c = bu + e.cost;
        if (c < (best.has(e.to) ? best.get(e.to) : Infinity)) { best.set(e.to, c); prev.set(e.to, { from: u, e }); }
      });
    }
    if (!prev.has(D)) return null;
    const legs = [];
    for (let n = D; n !== S; n = prev.get(n).from) legs.unshift({ from: prev.get(n).from, to: n, ...prev.get(n).e });
    return { legs: legs.filter(l => l.len > 0.5), time: best.get(D) };
  }

  // Turn the route into steps like "Turn left onto LH105"
  // Names of other roads that meet the route at this junction (not counting walking links)
  function crossRoads(node, onName) {
    const names = new Set();
    node.edges.forEach(e => { if (e.road && !e.road.path && e.road.name !== onName) names.add(e.road.name); });
    return [...names];
  }

  function routeSteps(route, destName) {
    const steps = [];
    route.legs.forEach(l => {
      const v = [(l.to.x - l.from.x) / l.len, (l.to.z - l.from.z) / l.len];
      const last = steps[steps.length - 1];
      // a path is one step however much it bends
      const onPath = !!(l.road && l.road.path);
      const sameWay = last && last.road === l.road && (l.road === null || onPath || v[0] * last.v[0] + v[1] * last.v[1] > 0.98);
      // going straight through a junction with a differently named road gets its own step,
      // so the directions say "Continue straight past LH105"
      const passing = l.road && !onPath ? crossRoads(l.from, l.road.name) : [];
      if (sameWay && !passing.length) { last.len += l.len; last.to = l.to; last.time += l.cost; last.vEnd = v; }
      else steps.push({ road: l.road, v, vEnd: v, len: l.len, time: l.cost, from: l.from, to: l.to, passing });
    });
    // tiny off-road hops (already standing on the road) aren't worth an instruction
    const kept = steps.filter(s => s.road || s.len >= 12 || steps.length === 1);
    // short jogs and bend-arounds on the same road are folded in: "Continue on LH5", not five turns
    const keep = [];
    kept.forEach(s => {
      const last = keep[keep.length - 1];
      if (last && s.road && last.road && !s.road.path && !last.road.path && s.road.name === last.road.name && !(s.passing && s.passing.length) &&
          (s.len < NAV.jog || last.jogged || last.len < NAV.jog) &&
          !(s.len >= NAV.jog && last.len >= NAV.jog && s.v[0] * last.mainV[0] + s.v[1] * last.mainV[1] < 0.9)) {
        last.len += s.len; last.time += s.time; last.to = s.to; last.jogged = s.len < NAV.jog; last.vEnd = s.vEnd;
        if (s.len > last.mainLen) { last.mainV = s.v; last.mainLen = s.len; }
        return;
      }
      keep.push({ ...s, mainV: s.v, mainLen: s.len });
    });
    keep.forEach(s => { if (s.road && !s.road.path) s.v = s.vEnd = s.mainV; });   // paths keep their first/last direction
    keep.forEach((s, k) => {
      const prevStep = keep[k - 1], dir = compass(s.to.x - s.from.x, s.to.z - s.from.z);
      if (s.road && s.road.path) {
        const first = compass(...s.v);
        s.icon = s.road.type === "construction" ? "cone" : "walk";
        const sameName = prevStep && prevStep.road && prevStep.road.name === s.road.name;   // e.g. LH10 carrying on as construction
        s.text = s.road.type === "construction"
          ? (sameName ? `Continue on ${pathTitle(s.road)}` : `Head ${first} on ${pathTitle(s.road)}`)
          : `Walk ${first} along ${s.road.name}`;
        return;
      }
      if (!s.road) {
        s.icon = k === keep.length - 1 ? "flag" : "head";
        s.text = k === keep.length - 1
          ? (prevStep ? `Leave ${prevStep.road.name} and head ${dir} to ${destName}` : `Head ${dir} to ${destName}`)
          : `Head ${dir} to ${keep[k + 1].road.name}`;
        return;
      }
      if (!prevStep) { s.icon = "head"; s.text = `Head ${dir} on ${s.road.name}`; return; }
      if (!prevStep.road) { s.icon = "join"; s.text = `Join ${s.road.name} heading ${dir}`; return; }
      const pv = prevStep.vEnd || prevStep.v;               // the way you were going at the end of the last step
      const cross = pv[0] * s.v[1] - pv[1] * s.v[0], dot = pv[0] * s.v[0] + pv[1] * s.v[1];
      const turn = dot > 0.9 ? "straight" : dot < -0.9 ? "uturn" : cross > 0 ? "right" : "left";
      s.icon = turn;
      const verb = { straight: "Continue", uturn: "Make a U-turn", right: "Turn right", left: "Turn left" }[turn];
      const sameRoad = s.road.name === prevStep.road.name;
      s.text = sameRoad && turn === "straight" && s.passing && s.passing.length
        ? `Continue straight past ${s.passing.join(" and ")}`
        : sameRoad
          ? `${verb} to stay on ${s.road.name}${turn === "straight" ? "" : ` (heading ${dir})`}`
          : `${verb} onto ${s.road.name}`;
    });
    return keep;
  }

  const ICONS = {
    head: "M12 3l6 8h-4v10h-4V11H6z", straight: "M12 3l6 8h-4v10h-4V11H6z", join: "M12 3l6 8h-4v10h-4V11H6z",
    left: "M9 4L3 9l6 5v-3h6a2 2 0 012 2v8h4v-8a6 6 0 00-6-6H9z",
    right: "M15 4l6 5-6 5v-3H9a2 2 0 00-2 2v8H3v-8a6 6 0 016-6h6z",
    uturn: "M8 21V9a5 5 0 0110 0v4h3l-5 6-5-6h3V9a1 1 0 00-2 0v12z",
    flag: "M5 21V4h11l-1.5 3.5L16 11H7v10z",
    // a walking figure, and a traffic cone (road under construction)
    walk: "M13.5 5.5a2 2 0 100-4 2 2 0 000 4zM9.8 8.9L7 10.3V14h2v-2.4l1.2-.6L9 17l-3.6 3.6L6.8 22l4.2-4.2.6-2.6L14 17.5V22h2v-5.4l-2.3-2.3.6-3.1A6.5 6.5 0 0019 13.5v-2a4.6 4.6 0 01-4-2.3l-1-1.6A2 2 0 0011.6 7c-.6 0-1.2.3-1.8 1.9z",
    cone: "M10.4 3h3.2l1 4H9.4zM9 9h6l.9 4H8.1zM7.6 15h8.8l1 4H21v2H3v-2h3.6z",
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.head}" fill="currentColor"/></svg>`;

  function setFollow(on) {
    nav.follow = on;
    if (nav.recenter) nav.recenter.getContainer().hidden = on || !nav.active;
    if (on && nav.player) liveMap.panTo(L_.latLng(-nav.player.z / 8, nav.player.x / 8));
  }

  function navMessage(text, kind = "") {
    navStatus.textContent = text;
    navStatus.className = `nav-status ${kind}`;
  }

  async function fetchPlayer(name) {
    const url = NAV.playerFeed
      ? `${NAV.playerFeed}${NAV.playerFeed.includes("?") ? "&" : "?"}name=${encodeURIComponent(name)}`
      : `${SQUAREMAP}/tiles/players.json`;            // only works if the map server ever allows other sites
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.players || []).find(p => String(p.name).toLowerCase() === name.toLowerCase()) || null;
  }

  // ---- Voice directions (browser text-to-speech), announced like Google Maps ----
  const voiceBox = document.getElementById("nav-voice");
  const canSpeak = "speechSynthesis" in window;
  const voice = { on: false, key: null, done: new Set(), arrived: false };
  // blocks before a maneuver: an early heads-up, then the "do it now" callout. The last one is big
  // enough that a 2 s update (~80 blocks by boat) can't skip it, and short enough to still be on time.
  const SAY_AT = [1000, 150];
  const lower = t => /^(LH\d|\/pw)/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
  // Numbers read out in words so voices don't rush them
  const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function words(n) {
    if (n < 0) return "minus " + words(-n);
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
    if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + words(n % 100) : "");
    if (n < 1e4 && n % 100 === 0 && n % 1000) return words(n / 100) + " hundred";   // 1200 → "twelve hundred"
    // the comma adds a short pause; without it Piper slurs "fourteen thousand five hundred" into noise
    if (n < 1e6) return words(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? ", " + words(n % 1000) : "");
    return String(n);
  }
  // Highway numbers like real US highways: 5 "five", 20 "twenty", 305 "three oh five", 120 "one twenty", 1405 "fourteen oh five"
  function highwayNumber(s) {
    const n = +s;
    if (s.length <= 2 || n % 100 === 0) return words(n);
    const head = words(Math.floor(n / 100)), tail = n % 100;
    return head + " " + (tail < 10 ? "oh " + ONES[tail] : words(tail));
  }
  const sayable = t => t.replace(/\bLH(\d+)/g, (_, n) => "Lotus Highway " + highwayNumber(n)).replace(/\/pw\b/g, "slash P W")
    .replace(/(\d),(\d)/g, "$1$2").replace(/-?\b\d+\b/g, m => words(+m));
  const roundSay = d => d >= 500 ? Math.round(d / 100) * 100 : Math.max(10, Math.round(d / 50) * 50);
  // Pick the nicest English voice the device has. Best first: Edge's "Natural" (neural) voices,
  // then other neural/online voices, Google's Chrome voices, Apple's Siri-quality voices, then the rest.
  const voicePick = document.getElementById("nav-voice-pick");
  const VOICE_RANK = [/natural/i, /neural|premium|enhanced/i, /online/i, /google us english/i, /google uk english female/i,
    /google/i, /siri|samantha|ava|allison|serena|karen|daniel|moira|tessa/i, /aria|jenny|zira|guy/i];
  let chosenVoice = null;
  function englishVoices() { return canSpeak ? speechSynthesis.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang)) : []; }
  function rankVoice(v) {
    const r = VOICE_RANK.findIndex(re => re.test(v.name));
    const sameLang = v.lang.replace("_", "-").toLowerCase() === (navigator.language || "en-US").toLowerCase();
    return (r < 0 ? VOICE_RANK.length : r) * 4 + (sameLang ? 0 : 2) + (v.localService ? 1 : 0);
  }

  // Piper: a free AI voice that runs inside the browser (sounds like Edge's natural voices in any browser).
  // Nothing is downloaded until someone picks it in the dropdown. The model (~63 MB) is then kept in the
  // browser's storage, so it only downloads once.
  const PIPER_LIB = "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm";
  // Amy says numbers ("fourteen thousand") the most clearly of the Piper voices
  const PIPER_VOICES = { "en_US-amy-medium": "Piper Amy" };
  // How slowly each Piper voice talks: 1 = the model's normal pace, above 1 = slower (1.1 = 10% slower),
  // below 1 = faster (0.9 = 10% faster). The voice itself is made faster/slower, which stays clear.
  const PIPER_PACES = { "en_US-amy-medium": 0.92 };
  // Piper reads its settings from the voice's .json file (saved in the browser's storage); set the pace there
  async function tunePiper(id) {
    try {
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle("piper", { create: true });
      const name = `${id}.onnx.json`;
      let cfg = null;
      try { cfg = JSON.parse(await (await (await dir.getFileHandle(name)).getFile()).text()); } catch {}
      if (!cfg) cfg = await (await fetch(`${piper.lib.HF_BASE}/${piper.lib.PATH_MAP[id]}.json`)).json();
      const inf = cfg.inference;
      if (inf.basePace === undefined) inf.basePace = inf.length_scale;
      const pace = inf.basePace * (PIPER_PACES[id] || 1);
      if (inf.length_scale === pace) return;
      inf.length_scale = pace;
      const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await w.write(JSON.stringify(cfg)); await w.close();
    } catch (e) { console.warn("Couldn't set the Piper pace:", e); }
  }
  const canPiper =!!(window.WebAssembly && navigator.storage && navigator.storage.getDirectory && window.Audio);
  const voiceLoad = document.getElementById("nav-voice-load");
  const piper = { id: null, lib: null, ready: new Set(), loading: {}, audio: null, queue: Promise.resolve(), gen: 0 };
  try { JSON.parse(localStorage.getItem("highway-piper-ready") || "[]").forEach(id => piper.ready.add(id)); } catch {}
  // free the space used by Piper voices that were taken out of the list
  const oldPiper = [...piper.ready].filter(id => !PIPER_VOICES[id]);
  if (oldPiper.length && canPiper) {
    oldPiper.forEach(id => piper.ready.delete(id));
    try { localStorage.setItem("highway-piper-ready", JSON.stringify([...piper.ready])); } catch {}
    navigator.storage.getDirectory().then(root => root.getDirectoryHandle("piper")).then(dir =>
      Promise.all(oldPiper.flatMap(id => [`${id}.onnx`, `${id}.onnx.json`].map(n => dir.removeEntry(n).catch(() => {}))))).catch(() => {});
  }
  const savedVoice = () => { try { return localStorage.getItem("highway-nav-voice-name"); } catch { return null; } };
  const saveVoice = name => { try { localStorage.setItem("highway-nav-voice-name", name); } catch {} };
  const showPick = () => { if (voicePick) voicePick.hidden = !voice.on || !voicePick.options.length; };

  function pickVoice() {
    const voices = englishVoices().sort((a, b) => rankVoice(a) - rankVoice(b) || a.name.localeCompare(b.name));
    const saved = savedVoice();
    chosenVoice = voices.find(v => v.name === saved) || voices[0] || null;
    const savedPiper = saved && saved.startsWith("piper:") && saved.slice(6);
    // a saved Piper voice is only used again if it finished downloading before
    if (!piper.id && canPiper && PIPER_VOICES[savedPiper] && piper.ready.has(savedPiper)) piper.id = savedPiper;
    if (!voicePick) return;
    const esc = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    voicePick.innerHTML = voices.map(v => `<option value="${esc(v.name)}">` +
      `${esc(v.name.replace(/^Microsoft |^Google /, "").replace(/ - English.*| Online \(Natural\)/, ""))}${/natural/i.test(v.name) ? " (natural)" : ""}</option>`).join("") +
      (canPiper ? Object.entries(PIPER_VOICES).map(([id, label]) =>
        `<option value="piper:${id}">${label} (${piper.ready.has(id) ? "downloaded" : "needs a ~80 MB download"})</option>`).join("") : "");
    voicePick.value = piper.id ? "piper:" + piper.id : chosenVoice ? chosenVoice.name : "";
    showPick();
  }
  pickVoice();
  if (canSpeak) speechSynthesis.addEventListener("voiceschanged", pickVoice);

  function piperStatus(text, busy = true) {
    if (!voiceLoad) return;
    voiceLoad.hidden = !text; voiceLoad.textContent = text || ""; voiceLoad.classList.toggle("idle", !busy);
  }
  // Load the Piper engine and voice (downloads once, with progress), then warm it up
  function loadPiper(id) {
    if (piper.lib && piper.ready.has(id) && piper.warm === id) return Promise.resolve();
    if (piper.loading[id]) return piper.loading[id];
    const fresh = !piper.ready.has(id);
    return piper.loading[id] = (async () => {
      piperStatus(fresh ? "Loading voice model…" : "Starting voice…");
      piper.lib = piper.lib || await import(PIPER_LIB);
      await tunePiper(id);
      // the first phrase downloads the model (if needed) plus the speech engine's files
      await piper.lib.predict({ text: "Ready.", voiceId: id }, e => {
        if (!fresh) return;
        const mb = Math.round(e.loaded / 1e6);
        piperStatus(e.total ? `Loading voice model… ${Math.round(e.loaded / e.total * 100)}%` : `Loading voice model… ${mb} MB`);
      });
      piper.ready.add(id); piper.warm = id;
      try { localStorage.setItem("highway-piper-ready", JSON.stringify([...piper.ready])); } catch {}
      if (fresh) { pickVoice(); if (voicePick) voicePick.value = "piper:" + id; }
      piperStatus("");
    })().finally(() => { delete piper.loading[id]; });
  }
  function playClip(blob) {
    return new Promise(done => {
      const a = new Audio(URL.createObjectURL(blob));
      piper.audio = a;
      a.onended = a.onerror = () => { URL.revokeObjectURL(a.src); if (piper.audio === a) piper.audio = null; done(); };
      a.play().catch(a.onended);
    });
  }
  function speakPiper(text) {
    const gen = piper.gen, id = piper.id;
    // start making the audio right away, but play clips one after another
    const clip = loadPiper(id).then(() => piper.lib.predict({ text, voiceId: id }));
    piper.queue = piper.queue.then(() => clip).then(blob => gen === piper.gen && playClip(blob)).catch(err => {
      console.warn("Piper voice failed:", err);
      if (gen !== piper.gen || piper.id !== id) return;
      piper.id = null;
      if (voicePick && chosenVoice) voicePick.value = chosenVoice.name;
      piperStatus(chosenVoice ? "Couldn't load the Piper voice, so the browser voice is used instead." : "Couldn't load the Piper voice.", false);
      setTimeout(() => piperStatus(""), 6000);
      speakBrowser(text);
    });
  }
  function speakBrowser(text) {
    if (!canSpeak) return;
    // queue rather than interrupt, so back-to-back callouts are both heard (stopping clears the queue)
    const u = new SpeechSynthesisUtterance(sayable(text));
    if (chosenVoice) { u.voice = chosenVoice; u.lang = chosenVoice.lang; }
    u.rate = 1; u.pitch = 1;
    speechSynthesis.speak(u);
  }
  function speak(text) {
    if (!voice.on) return;
    if (piper.id) speakPiper(sayable(text)); else speakBrowser(text);
  }
  function stopSpeech() {
    if (canSpeak) speechSynthesis.cancel();
    piper.gen++; piper.queue = Promise.resolve();
    if (piper.audio) { piper.audio.pause(); piper.audio = null; }
  }
  if (voiceBox) {
    if (!canSpeak && !canPiper) { voiceBox.disabled = true; voiceBox.closest("label").title = "Your browser can't read text out loud"; }
    try { voiceBox.checked = !voiceBox.disabled && localStorage.getItem("highway-nav-voice") === "1"; } catch {}
    voice.on = voiceBox.checked;
    showPick();
    if (voice.on && piper.id) loadPiper(piper.id).catch(() => piperStatus(""));   // already downloaded: just get it ready
    voiceBox.addEventListener("change", () => {
      voice.on = voiceBox.checked;
      try { localStorage.setItem("highway-nav-voice", voice.on ? "1" : "0"); } catch {}
      showPick();
      if (voice.on) speak("Voice directions on");           // also unlocks speech on phones (needs a tap)
      else stopSpeech();
    });
    if (voicePick) voicePick.addEventListener("change", () => {
      stopSpeech();
      const v = voicePick.value;
      if (v.startsWith("piper:")) piper.id = v.slice(6);    // downloads now (first time only), showing progress
      else { piper.id = null; chosenVoice = englishVoices().find(x => x.name === v) || chosenVoice; }
      saveVoice(v);
      speak("In 300 blocks, turn left onto LH105.");        // sample so you can hear it
    });
  }

  // Called on every position update with the fresh route
  // going straight through an intersection: only one callout, as you reach it
  const PASS_AT = 100;
  const isPass = s => !!(s && s.icon === "straight" && s.passing && s.passing.length);
  // The next real maneuver, skipping intersections you just go straight through.
  // dist = blocks from here to it (passes don't split the distance).
  function nextTurn(steps) {
    let k = 1, dist = steps[0].len;
    while (k < steps.length && isPass(steps[k])) dist += steps[k++].len;
    return { step: steps[k] || null, dist };
  }
  const stepKey = s => `${s.text}@${Math.round(s.from.x / 25)},${Math.round(s.from.z / 25)}`;
  function announce(steps, dest, first) {
    if (!voice.on) return;
    const now = steps[0], next = steps[1];
    const { step: turn, dist: d } = nextTurn(steps);         // distance to the next real turn
    const what = turn ? lower(turn.text) : `arrive at ${dest.name}`;
    const key = turn ? stepKey(turn) : `arrive@${dest.name}`;
    const onRoad = `Continue on ${now.road ? now.road.name : "this path"}`;
    // going straight through an intersection: one short callout as you reach it
    const passKey = isPass(next) ? stepKey(next) : null;
    if (first) {
      voice.key = key; voice.done = new Set(SAY_AT.filter(t => d < t)); voice.arrived = false;
      voice.passKey = passKey && now.len < PASS_AT ? passKey : null;
      const start = isPass(now) ? onRoad : now.text;
      speak(`Starting route to ${dest.name}. ${start}` + (turn ? `, then in ${roundSay(d)} blocks, ${what}.` : ` for ${roundSay(d)} blocks.`));
      return;
    }
    if (passKey && passKey !== voice.passKey && now.len <= PASS_AT) {
      voice.passKey = passKey;
      speak(`${next.text}.`);
    }
    if (key !== voice.key) {                                 // finished a turn (or rerouted)
      voice.key = key; voice.done = new Set(SAY_AT.filter(t => d < t * 0.9));
      if (d >= 400) speak(`${now.text.startsWith("Continue") && !isPass(now) ? now.text : onRoad} for ${roundSay(d)} blocks.`);
      else if (d < SAY_AT[SAY_AT.length - 1]) speak(turn ? `${turn.text}.` : `Your destination, ${dest.name}, is ahead.`);
      return;
    }
    const t = SAY_AT.find(t => d <= t && !voice.done.has(t));
    if (t === undefined) return;
    SAY_AT.filter(x => x >= t).forEach(x => voice.done.add(x));
    if (t === SAY_AT[SAY_AT.length - 1]) speak(turn ? `${turn.text}.` : `Your destination, ${dest.name}, is ahead.`);
    else speak(turn ? `In ${roundSay(d)} blocks, ${what}.` : `In ${roundSay(d)} blocks, you'll arrive at ${dest.name}.`);
  }

  async function navTick(first) {
    // keep updating in the background while voice is on (you'll be looking at the game, not the page)
    if (!nav.active || (document.hidden && !first && !voice.on)) return;
    const name = navName.value.trim();
    let p;
    try { p = await fetchPlayer(name); }
    catch (e) {
      navMessage(NAV.playerFeed
        ? "Can't reach the player feed right now. Trying again…"
        : "Live player positions aren't set up for this site yet (the map server blocks other websites). " +
          "The site owner needs to add the player relay: see tools/player-proxy-worker.js.", "error");
      if (!NAV.playerFeed) stopNav(true);
      return;
    }
    if (!nav.active) return;
    if (!p) { navMessage(`Can't see ${name} on the map. Make sure you're online and not hidden from the map.`, "warn"); return; }
    if (p.world !== "minecraft_overworld") {
      navMessage(`${p.name} is in the ${p.world.includes("nether") ? "Nether" : p.world.includes("end") ? "End" : p.world}. Head back to the overworld to navigate.`, "warn");
      return;
    }
    nav.player = p;
    trackFix(p);
    navRender([p.x, p.z], first);                            // directions always from the real position
  }

  // ---- Player position: real positions only, no prediction ----
  // The arrow slides from the previous real position to the new one over GLIDE_MS so it doesn't
  // jump; speed (from the last two real positions) is only shown in the status line.
  const MAX_SPEED = 80;        // blocks/s - about a boat on blue ice; faster readings are treated as teleports
  const GLIDE_MS = 500;        // how long the slide to a new real position takes
  const track = { fix: null, v: [0, 0], offset: [0, 0], offsetAt: 0, yaw: 0, raf: 0, timer: null };

  function estimate(t = performance.now()) {
    const f = track.fix;
    if (!f) return null;
    // No guessing: always the last real position. When a new one arrives the arrow slides
    // from where it was to the new spot over GLIDE_MS (animation between two real points).
    const base = f.pos;
    const k = Math.max(0, 1 - (t - track.offsetAt) / GLIDE_MS);
    return [base[0] + track.offset[0] * k, base[1] + track.offset[1] * k];
  }

  function trackFix(p) {
    const t = performance.now(), pos = [p.x, p.z], f = track.fix;
    track.yaw = p.yaw;
    if (!f) { track.fix = { pos, t }; track.v = [0, 0]; return; }
    const shown = estimate(t);                               // where the arrow is right now
    const dx = pos[0] - f.pos[0], dz = pos[1] - f.pos[1];
    if (dx === 0 && dz === 0) {
      track.v = [0, 0];                                      // same spot as last time: stopped
    } else {
      const dt = (t - f.t) / 1000;
      let v = [dx / dt, dz / dt];
      const speed = Math.hypot(...v);
      if (dt > 8 || speed > MAX_SPEED * 1.5) v = [0, 0];     // long gap or teleport: don't guess
      else if (speed > MAX_SPEED) v = v.map(c => c * MAX_SPEED / speed);
      // smooth out jitter, but take the first reading as-is so it doesn't lag when you set off
      track.v = track.v[0] || track.v[1] ? [track.v[0] * 0.3 + v[0] * 0.7, track.v[1] * 0.3 + v[1] * 0.7] : v;
      if (Math.hypot(...track.v) < 0.5) track.v = [0, 0];
    }
    track.offset = [shown[0] - pos[0], shown[1] - pos[1]];
    if (Math.hypot(...track.offset) > 200) track.offset = [0, 0];  // teleport: just jump
    track.offsetAt = t;
    track.fix = { pos, t };
  }

  // move the arrow every frame
  function animateTrack() {
    if (!nav.active) { track.raf = 0; return; }
    const e = estimate();
    if (e && nav.marker) nav.marker.setLatLng(L_.latLng(-e[1] / 8, e[0] / 8));
    track.raf = requestAnimationFrame(animateTrack);
  }

  // Draw the route, banner, steps and voice from a position (real or estimated)
  function navRender(here, first) {
    if (!nav.active || !here) return;
    const dest = nav.dest;
    const ll = (x, z) => L_.latLng(-z / 8, x / 8);

    // player arrow (yaw 0 = facing south / down the map)
    const yaw = Math.round(track.yaw);
    const arrow = `<svg viewBox="0 0 40 40" width="34" height="34" style="transform:rotate(${yaw + 180}deg)">` +
      `<circle cx="20" cy="20" r="17" fill="#4285f4" fill-opacity=".18"/>` +
      `<path d="M20 6l9 24-9-5-9 5z" fill="#4285f4" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    if (!nav.marker) {
      nav.marker = L_.marker(ll(...here), { pane: "player", interactive: false, keyboard: false,
        icon: L_.divIcon({ className: "player-marker", iconSize: [34, 34], iconAnchor: [17, 17], html: arrow }) }).addTo(liveMap);
      nav.markerYaw = yaw;
    } else {
      const shown = estimate() || here;                      // mid-slide position, so it doesn't snap
      nav.marker.setLatLng(ll(...shown));
      if (nav.markerYaw !== yaw) { nav.marker.getElement().innerHTML = arrow; nav.markerYaw = yaw; }
    }

    const toGo = Math.hypot(dest.x - here[0], dest.z - here[1]);
    // Arrived (within arriveDistance, 16 blocks): say so, then end navigation automatically
    if (toGo <= NAV.arriveDistance) {
      if (nav.follow) liveMap.panTo(ll(...here));
      speak(`You have arrived at ${dest.name}.`);
      stopNav({ keepMessage: true, keepSpeech: true, keepBanner: true });
      showBanner(`<div class="nb-icon">${icon("flag")}</div><div><div class="nb-main">You've arrived</div><div class="nb-sub">${dest.name}</div></div>`);
      navMessage(`Arrived at ${dest.name}. Navigation ended.`, "ok");
      nav.bannerTimer = setTimeout(() => { if (!nav.active) navBanner.hidden = true; }, 8000);
      return;
    }

    const route = findRoute(here, [dest.x, dest.z]);
    if (!route) { navMessage("Couldn't find a route.", "error"); return; }
    const steps = routeSteps(route, dest.name);
    const total = steps.reduce((t, s) => t + s.len, 0), time = steps.reduce((t, s) => t + s.time, 0);

    // route line, Google-blue with a white edge
    nav.layer.clearLayers();
    const pts = [ll(...here), ...route.legs.map(l => ll(l.to.x, l.to.z))];
    L_.polyline(pts, { pane: "route", color: "#fff", weight: 11, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(nav.layer);
    L_.polyline(pts, { pane: "route", color: "#4285f4", weight: 7, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(nav.layer);
    if (dest.custom) L_.circleMarker(ll(dest.x, dest.z), { pane: "dots", radius: 8, weight: 3, color: "#fff", fillColor: "#d93025", fillOpacity: 1 }).addTo(nav.layer);

    // banner: what to do next
    // banner: the next real turn; intersections you go straight through don't split the distance
    const now = steps[0], { step: turn, dist: toTurn } = nextTurn(steps);
    const nowText = isPass(now) ? `Continue on ${now.road.name}` : now.text;
    showBanner(turn
      ? `<div class="nb-icon">${icon(turn.icon)}</div><div><div class="nb-dist">In ${fmtBlocks(toTurn)}</div><div class="nb-main">${turn.text}</div>` +
        `<div class="nb-sub">${nowText}</div></div>`
      : `<div class="nb-icon">${icon(now.icon)}</div><div><div class="nb-main">${nowText}</div><div class="nb-sub">${fmtBlocks(toTurn)}</div></div>`);
    navSteps.hidden = false;
    // each step's distance runs to the next real turn; pass-through intersections are listed without one
    navSteps.innerHTML = steps.map((s, k) => {
      const pass = k > 0 && isPass(s);
      const len = pass ? "" : fmtBlocks(nextTurn(steps.slice(k)).dist);
      return `<li class="${k === 0 ? "current" : ""}${pass ? " pass" : ""}"><span class="ns-icon">${icon(s.icon)}</span>` +
        `<span class="ns-text">${k === 0 ? nowText : s.text}</span><span class="ns-len">${len}</span></li>`;
    }).join("") +
      `<li class="arrive"><span class="ns-icon">${icon("flag")}</span><span class="ns-text">Arrive at ${dest.name}</span></li>`;
    const moving = Math.hypot(...track.v);
    // boat on the Highway is the default, so only mention when part of the trip is off the boat
    const how = [steps.some(s => s.road && s.road.type === "path") && "a path",
      steps.some(s => s.road && s.road.type === "construction") && "a road under construction"].filter(Boolean);
    navMessage(`${fmtBlocks(total)} to ${dest.name} · about ${fmtTime(time)}${how.length ? ` (includes ${how.join(" and ")})` : ""}` +
      (moving ? ` · moving ${Math.round(moving)} blocks/s` : "") + `. Position updates every ${NAV.pollSeconds}s.`, "ok");
    voice.arrived = false;
    announce(steps, dest, first || voice.key === null);

    if (first) liveMap.setView(ll(...here), Math.max(liveMap.getZoom(), 1));
    else if (nav.follow) liveMap.panTo(ll(...here), { animate: true, duration: 0.25, easeLinearity: 1 });
  }

  function showBanner(html) {
    navBanner.hidden = false;
    if (html !== nav.lastBanner) { navBanner.innerHTML = html; nav.lastBanner = html; }
  }

  function startNav() {
    const name = navName.value.trim();
    if (!/^[.\w]{1,20}$/.test(name)) { navMessage("Enter your Minecraft name (letters, numbers and _ only).", "error"); navName.focus(); return; }
    let dest;
    if (navDest.value === "coords") {
      if (navX.value === "" || navZ.value === "") { navMessage("Enter the X and Z you want to go to.", "error"); navX.focus(); return; }
      dest = { x: +navX.value, z: +navZ.value, name: `X ${navX.value}, Z ${navZ.value}`, custom: true };
    } else {
      const l = LOCATIONS[+navDest.value];
      dest = { x: l.x, z: l.z, name: l.name };
    }
    if (view !== "live" || !liveMap) { navMessage("The live map is still loading, try again in a moment.", "warn"); return; }
    try { localStorage.setItem("highway-nav-name", name); } catch {}
    stopNav(true);
    nav.active = true; nav.dest = dest; nav.lastBanner = "";
    nav.layer = nav.layer || L_.layerGroup().addTo(liveMap);
    if (!nav.recenter) {
      nav.recenter = L_.control({ position: "bottomright" });
      nav.recenter.onAdd = () => {
        const b = L_.DomUtil.create("button", "recenter-btn");
        b.type = "button"; b.textContent = "Re-center"; b.hidden = true;
        L_.DomEvent.disableClickPropagation(b);
        b.addEventListener("click", () => setFollow(true));
        return b;
      };
      nav.recenter.addTo(liveMap);
    }
    setFollow(true);
    navGo.textContent = "Stop";
    navForm.classList.add("navigating");
    navMessage(`Looking for ${name}…`);
    document.querySelector(".mapbox").scrollIntoView({ behavior: "smooth", block: "center" });
    navTick(true);
    nav.timer = setInterval(navTick, NAV.pollSeconds * 1000);
    // animates the arrow sliding between real positions (no prediction)
    track.raf = requestAnimationFrame(animateTrack);
  }

  // stopNav(true) or stopNav({ keepMessage, keepSpeech, keepBanner })
  function stopNav(opts) {
    const o = typeof opts === "object" && opts ? opts : { keepMessage: !!opts };
    const keepMessage = o.keepMessage;
    nav.active = false;
    clearInterval(nav.timer);
    clearInterval(track.timer); cancelAnimationFrame(track.raf);
    Object.assign(track, { fix: null, v: [0, 0], offset: [0, 0], raf: 0, timer: null });
    nav.markerYaw = null;
    clearTimeout(nav.bannerTimer);
    if (nav.layer) nav.layer.clearLayers();
    if (nav.marker) { nav.marker.remove(); nav.marker = null; }
    nav.player = null;
    voice.key = null; voice.arrived = false;
    if (!o.keepSpeech) stopSpeech();
    if (!o.keepBanner) navBanner.hidden = true;
    navSteps.hidden = true;
    if (nav.recenter) nav.recenter.getContainer().hidden = true;
    navGo.textContent = "Start";
    navForm.classList.remove("navigating");
    if (!keepMessage) navMessage("");
  }

  if (navForm) {
    navForm.addEventListener("submit", e => { e.preventDefault(); if (nav.active) stopNav(); else startNav(); });
    // "Directions here" button in a stop's popup on the live map
    live.addEventListener("click", e => {
      const b = e.target.closest(".nav-here");
      if (!b) return;
      navDest.value = b.dataset.loc; navCoords.hidden = true;
      if (liveMap) liveMap.closePopup();
      if (navName.value.trim()) startNav();
      else { navForm.scrollIntoView({ behavior: "smooth", block: "center" }); navName.focus(); navMessage("Enter your Minecraft name, then press Start.", "warn"); }
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && nav.active) navTick(); });
  }

  let firstRender = true;
  const render = t => {
    current = t;
    route.classList.toggle("refresh", !firstRender); firstRender = false;
    const list = LOCATIONS.filter(l => t === "All" || l.type === t);
    if (view === "live") drawLive(list); else if (!map.hidden) drawMap(list);
    route.innerHTML = [...list].sort((a, b) => a.x - b.x).map(l =>
      `<li class="stop clickable" data-loc="${LOCATIONS.indexOf(l)}" tabindex="0" role="button" aria-label="${l.name}: show on map">` +
      `<div class="stop-head"><h3>${l.name}</h3><span class="tag">${l.type}</span><span class="show-on-map" aria-hidden="true">Show on map →</span></div>` +
      `<span class="coords">${coords(l)}</span><p>${l.desc}</p></li>`).join("");
    filters.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.textContent === t));
  };
  const types = ["All", ...new Set(LOCATIONS.map(l => l.type))];
  filters.innerHTML = types.map(t => `<button type="button">${t}</button>`).join("");
  filters.addEventListener("click", e => { if (e.target.tagName === "BUTTON") render(e.target.textContent); });
  render("All");
  // Live map is the default view. If it can't load (no connection to the map library),
  // setView falls back to the overview map automatically.
  setView("live");
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

// Scroll reveal: content fades up as it comes into view
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const targets = document.querySelectorAll(
    "main section > h2, main section > p, .fact, .stop, .seg, .total, .rules li, .mapbox, .filters, .form-frame");
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add("in");
    io.unobserve(el);
    // drop the reveal classes afterwards so hover effects aren't delayed
    el.addEventListener("transitionend", () => { el.classList.remove("reveal", "in"); el.style.removeProperty("--d"); }, { once: true });
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  targets.forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.matches && [...targets].includes(c));
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6) * 0.07 + "s");
    el.classList.add("reveal");
    io.observe(el);
  });
}
