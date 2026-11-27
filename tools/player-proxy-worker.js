// Player position relay for the Locations page navigation.
//
// Why: the Lotus map (squaremap) publishes live player positions at
// https://lotus.blossomcraft.org/tiles/players.json, but its server doesn't allow other websites to
// read that file from a browser (no CORS header). This tiny Cloudflare Worker fetches it and passes
// back just the requested player, with the header that lets the Highway site read it.
//
// Setup (free, about 5 minutes):
//   1. Sign in at https://dash.cloudflare.com  ->  Workers & Pages  ->  Create  ->  Create Worker.
//   2. Name it e.g. "highway-players", click Deploy, then "Edit code".
//   3. Replace all the code with this file's contents and click Deploy.
//   4. Copy the worker's URL (like https://highway-players.<you>.workers.dev) into
//      NAV_SETTINGS.playerFeed in js/data.js.
//
// Usage: GET <worker url>?name=<player>  ->  { "players": [ { name, uuid, world, x, z, yaw } ] }
// Only the named player is returned (case-insensitive); an empty list means they aren't on the map.

const SOURCE = "https://lotus.blossomcraft.org/tiles/players.json";

// Sites allowed to use this relay. "*" allows any site; to lock it down, list yours instead, e.g.
// const ALLOWED_ORIGINS = ["https://redflamz.github.io"];
const ALLOWED_ORIGINS = ["*"];

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const allow = ALLOWED_ORIGINS.includes("*") ? "*" : (ALLOWED_ORIGINS.includes(origin) ? origin : "");
    const cors = {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });

    const name = (new URL(request.url).searchParams.get("name") || "").trim().toLowerCase();
    if (!/^[.\w]{1,20}$/.test(name)) {
      return json({ error: "Add ?name=<minecraft name>" }, 400, cors);
    }

    let data;
    try {
      // cache for 1 second at Cloudflare so many viewers don't hammer the map server
      const res = await fetch(SOURCE, { cf: { cacheTtl: 1, cacheEverything: true } });
      if (!res.ok) return json({ error: `Map server returned ${res.status}` }, 502, cors);
      data = await res.json();
    } catch (e) {
      return json({ error: "Couldn't reach the map server" }, 502, cors);
    }

    const players = (data.players || [])
      .filter(p => String(p.name).toLowerCase() === name)
      .map(({ name, uuid, world, x, z, yaw }) => ({ name, uuid, world, x, z, yaw }));
    return json({ players }, 200, cors);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
