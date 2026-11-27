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
    [["roads", 410], ["roadLabels", 420], ["dots", 430]].forEach(([n, z]) => liveMap.createPane(n).style.zIndex = z);
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
    return roads.sort((a, b) => (b.a2 - b.a1) - (a.a2 - a.a1)).map(r => ({
      dir: r.dir, owner: r.owner, width: r.width,
      from: r.dir === "EW" ? [r.a1, r.c] : [r.c, r.a1], to: r.dir === "EW" ? [r.a2, r.c] : [r.c, r.a2] }));
  }

  function nameRoads() {
    const roads = buildRoads();
    // 1. names set in data.js win
    (typeof ROAD_NAMES === "undefined" ? [] : ROAD_NAMES).forEach(o => {
      let best = null, bd = 150;
      roads.forEach(r => { const d = distToRoad(o.near, r); if (d < bd) { bd = d; best = r; } });
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
  const namedRoads = nameRoads();
  let roadLines = [], labelLayer = null;

  function drawRoads() {
    const ll = (x, z) => L_.latLng(-z / 8, x / 8);
    roadLines = [];
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
      }).addTo(liveMap);
      // click a road to see its name and a point on it (handy for ROAD_NAMES / IGNORE_CLAIMS in data.js)
      if (part === "fill" && !fallback) {
        const mid = [Math.round((r.from[0] + r.to[0]) / 2), Math.round((r.from[1] + r.to[1]) / 2)];
        const lengthText = r.pieces > 1
          ? `${r.total.toLocaleString()} blocks long in total (this stretch ${roadLen(r).toLocaleString()}), ${r.width} wide`
          : `${roadLen(r).toLocaleString()} blocks long, ${r.width} wide`;
        line.bindPopup(`<strong>${r.name}</strong><span class="coords">${lengthText}</span>` +
          `<p>From X ${r.from[0]}, Z ${r.from[1]} to X ${r.to[0]}, Z ${r.to[1]}.<br>Point on road: <code>[${mid[0]}, ${mid[1]}]</code></p>`,
          { className: "live-popup", maxWidth: 280 });
      }
      roadLines.push({ line, part, r });
    }));
    // end dots: road ends that don't meet another road or a stop
    if (!fallback) {
      const ends = [];
      roads.forEach(r => [r.from, r.to].forEach(p => {
        if (roads.some(o => o !== r && distToRoad(p, o) <= 20)) return;
        if (LOCATIONS.some(l => Math.hypot(l.x - p[0], l.z - p[1]) <= 40)) return;
        if (ends.some(e => Math.hypot(e[0] - p[0], e[1] - p[1]) <= 20)) return;
        ends.push(p);
        L_.circleMarker(ll(...p), { radius: 5, weight: 2.5, className: "road-end", pane: "dots" })
          .bindTooltip(`End of ${r.name}<br>X: ${p[0]}, Z: ${p[1]}`, { direction: "top", offset: [0, -6], className: "road-end-tip" })
          .addTo(liveMap);
      }));
    }
    labelLayer = L_.layerGroup().addTo(liveMap);
    liveMap.on("zoomend", styleRoads);
    liveMap.on("moveend", labelRoads);
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
  function labelRoads() {
    labelLayer.clearLayers();
    const zoom = liveMap.getZoom();
    if (zoom < -1.5 || !namedRoads.length) return;
    const ppb = 2 ** zoom / 8, view = liveMap.getBounds().pad(0.3), placed = [];
    namedRoads.forEach(r => {
      const len = roadLen(r) * ppb, textW = r.name.length * 7.2 + 24;
      if (len < textW + 30) return;                          // road too short on screen to fit its name
      const n = Math.max(1, Math.floor(len / 650));
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
        L_.marker(at, {
          pane: "roadLabels", interactive: false, keyboard: false,
          icon: L_.divIcon({ className: "road-label", iconSize: [0, 0],
            html: `<span class="${r.major ? "major" : ""}" style="transform:translate(-50%,-50%) rotate(${rot}deg)">${r.name}</span>` })
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
        .bindPopup(infoHTML(l), { className: "live-popup", maxWidth: 260 })
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
