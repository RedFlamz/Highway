// Cloudflare Worker: relays live player positions from the Lotus map (squaremap) to the Highway site.
//
// Why: https://lotus.blossomcraft.org/tiles/players.json has every online player's position, but the
// map server doesn't send the CORS header browsers need, so websites can't read it directly
// (it only seems to work in VS Code's built-in browser, which ignores CORS). This worker fetches
// it server-side and returns it with that header added.
//
// Routes:
//   GET /                -> the whole players.json list   { max, count, players: [...] }
//   GET /?name=RedFlamz  -> just that player (any case)    { max, count, players: [ {...} ] }  (empty list if not on the map)
//   GET /?world=minecraft_overworld  -> only players in that world (can be combined with name)
// Each player: { name, uuid, world, x, y, z, yaw, health, armor }
//
// Setup (free, ~5 minutes):
//   1. https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker.
//   2. Name it (e.g. "highway-players") -> Deploy -> "Edit code".
//   3. Replace all the code with this file -> Deploy.
//   4. Open the worker's URL in your browser to check you see JSON with a "players" list.
//   5. Put that URL in NAV_SETTINGS.playerFeed in js/data.js and push the site.

const SOURCE = "https://lotus.blossomcraft.org/tiles/players.json";

// Which websites may read this. "*" = any site. To lock it to yours, list them instead, e.g.
// const ALLOWED_ORIGINS = ["https://redflamz.github.io", "http://localhost:5500"];
const ALLOWED_ORIGINS = ["*"];

// How long Cloudflare may reuse a fetched copy (seconds). The map updates about every 2 s,
// so 1 s keeps it live while many viewers share one request to the map server.
const CACHE_SECONDS = 1;

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS.includes(origin) ? origin : "";
    const cors = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "Only GET is supported" }, 405, cors);

    const params = new URL(request.url).searchParams;
    const name = (params.get("name") || "").trim().toLowerCase();
    const world = (params.get("world") || "").trim();
    if (name && !/^[.\w]{1,20}$/.test(name)) return json({ error: "Invalid player name" }, 400, cors);

    // Get the live list from the map
    let data;
    try {
      const res = await fetch(SOURCE, {
        headers: { "User-Agent": "highway-players-worker" },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      });
      if (!res.ok) return json({ error: `Map server returned ${res.status}` }, 502, cors);
      data = await res.json();
    } catch (err) {
      return json({ error: "Couldn't reach the map server" }, 502, cors);
    }

    // Keep the useful fields, then filter
    let players = (Array.isArray(data.players) ? data.players : []).map(p => ({
      name: p.name, uuid: p.uuid, world: p.world,
      x: p.x, y: p.y, z: p.z, yaw: p.yaw,
      health: p.health, armor: p.armor,
    }));
    if (world) players = players.filter(p => p.world === world);
    if (name) players = players.filter(p => String(p.name).toLowerCase() === name);

    return json({ max: data.max ?? null, count: players.length, players }, 200, cors);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
