// Edit this file to update the Locations and Progress pages.

/* const LOCATIONS = [
  { name: "Highway -X End",   type: "End", X: -24000 , Z:0 , desc: "The current end of the road." },
  { name: "SamaShop",  type: "Shop", X: -13610, Z: 2580 ,  desc: "GumiSamaVT's Shop." },
  { name: "Regalia Empire",  type: "City", X: -8430, Z: 0 ,  desc: "Empire." },
  { name: "Bucees/Brightnesss Highway",  type: "Junction", X: -3404, Z: 0,  desc: "Highway And Shops." },
  { name: "Community Center", type: "Hub",  X: 0, Z: 0,   desc: "Community Center." },
  { name: "/pw Highway Hub",  type: "Hub", X: 850, Z: 0,  desc: "Main Spawn." }
 
]; */

// x = east/west (-25000 to 25000), z = north/south (-15000 to 15000)
// Negative z is up on the map, positive z is down. z: 0 sits right on the highway.
const LOCATIONS = [
  
  { name: "SamaShop",  type: "Shop", x: -13605,  z: 2518, desc: "A shop by GumiSamaVT." },
  { name: "Regalian Empire",  type: "Town", x: -8430,   z: 0,  desc: "An empire ruled by Bloodhound412 with the support of Redflamz." },
  { name: "Bucees",  type: "Shop", x: -3404,  z: 0, desc: "A unfinished shop." },
  { name: "Shop/EXP",  type: "Shop", x: -3404,  z: -5600, desc: "/pw EXP and /pw Shop." },
  { name: "Community Center",  type: "Park", x: 0,  z: 0, desc: "A community park." },
  
  { name: "/pw Highway",  type: "Hub", x: 840,  z: 0, desc: "The /pw Highway spawn point." },
  { name: "Atlantis",  type: "Shop", x: 11180,  z: -9700, desc: "A large shop." }
];

// ---------------- Live map roads ----------------
// Roads are built automatically from claims. A claim counts as road when its owner is listed here,
// it's minWidth-maxWidth blocks wide and longer than minLength blocks.
// After changing `owners`, run tools/update-roads.ps1 to download their claims (js/claims.js).
const ROAD_SETTINGS = {
  owners: ["RedFlamz", "Brightnesss"],
  minWidth: 10,
  maxWidth: 14,
  minLength: 40,
  // A road that stops and carries on further ahead is joined into one road across the gap
  // when the two pieces are no more than connectOffset blocks apart sideways
  // and the gap is no longer than connectGap blocks.
  connectOffset: 5,
  connectGap: 2000,
};

// ---------------- Navigation (Locations page) ----------------
// playerFeed: URL of your player relay (see tools/player-proxy-worker.js for the 5-minute setup).
//   Without it, browsers aren't allowed to read player positions from the Lotus map.
// roadSpeed / offroadSpeed: blocks per second, used for the route choice and arrival time
//   (about 40 = boat on packed ice, 6 = sprinting).
// pathSpeed: blocks per second on the paths below (walking).
const NAV_SETTINGS = {
  playerFeed: "https://navigation.was-2011.workers.dev/",
  roadSpeed: 40,
  offroadSpeed: 6,
  pathSpeed: 7,
  pollSeconds: 2,
};

// ---------------- Paths ----------------
// These are NOT made from claims: you draw them by hand. They show on the live map.
// status: "path"         - a path you walk or fly along (used for directions)
//         "construction" - a road that's under construction: directions WALK along it, like a path
//                          ("Walk south along LH10 (under construction)")
//         "closed"       - a closed road: shown on the map, and directions AVOID it - they never go along it,
//                          even where a claimed road or a gap between roads is underneath
// points: the corners of the path in order, as [x, z]. Start or end a path on a road (or near a stop)
//         so directions can use it.
// Easiest way to make these: open locations.html?edit, click "Draw path", click along the path,
// then "Finish path" - the page shows the exact lines to paste here.
const PATHS = [
  { name: "LH10", status: "construction", points: [[3, 3397], [3, 13885]] },
    { name: "LH505", status: "construction", points: [[19650, -1350], [19650, -5949]] },
  { name: "LH5 Connector", status: "closed", points: [[11241, -341], [11087, -341]] },
  { name: "Old Cobble Rd", status: "path", points: [[1712, -4], [1712, -682]] }
];

// ---------------- Side roads ----------------
// Real roads you draw by hand, for roads that aren't claimed (or are claimed by someone not in
// ROAD_SETTINGS.owners). They work exactly like the claimed roads: drawn as roads, used for directions
// at roadSpeed, "Turn left onto ..." at junctions, and a shield if the name has a number (e.g. "LH15").
// Both the website and the Lotus Maps mod use them.
// name:   the road's name (ROAD_NAMES doesn't change side roads, set the name here)
// major:  true = yellow highway, false = white road (default false)
// width:  how wide it's drawn, in blocks (optional, default 10)
// points: the corners in order, as [x, z]. Each piece runs straight north-south or east-west
//         (a slanted piece is turned into an L: east-west first, then north-south).
//         Start or end it on another road so they join.
// Easiest way to make these: open locations.html?edit, click "Draw path", set Status to "Side road",
// click along the road, then "Finish path" - the page shows the exact lines to paste here.
const SIDE_ROADS = [
  // { name: "Maple St", major: false, points: [[2500, 3], [2500, -800], [3200, -800]] },
];

// Hand-set road end points, for roads whose claims stop short (or run too far).
// near: the current end of the road (any point within ~300 blocks of it)
// to:   where it should end. The road stays straight, so only the X (east-west road) or
//       Z (north-south road) of `to` is used.
// Easiest way to make these: open locations.html?edit, click "Set road end", click the road's end,
// then click where it should end - the page shows the exact line to paste here.
const ROAD_EXTENSIONS = [
   { near: [-1, 84], to: [-1, 8] },   // LH10
  { near: [-13609, 2044], to: [-13609, 2606] },   // LH305
  { near: [11081, -9166], to: [11081, -9386] },   // LH105
];

// Claims that should NOT be road. Put any [x, z] point inside the claim.
// Tip: hover the live map to read coordinates at the bottom left, or click a road to see a point on it.
const IGNORE_CLAIMS = [
  [680, -105]
];

// Road names. Each name goes on the road nearest to `near` (any [x, z] point on the road).
// major: true = yellow highway, false = white road.
// Roads not listed here are named automatically ("<Stop> Road", "<Owner> Road", ...).
// Short jogs that join a named road take its name, so they don't need their own entry.
const ROAD_NAMES = [
  // main east-west line (its pieces between the gaps)
  { near: [-11849, 2],      name: "LH5",         major: true },
  { near: [3065, 2],        name: "LH5",         major: true },
  { near: [6859, 3],        name: "LH5",         major: true },
  { near: [9493, 3],        name: "LH5",         major: true },
  { near: [18345, 4],       name: "LH5",         major: true },
  { near: [-24308, -354],   name: "LH5",         major: true },   // last stretch to the -X end
  // south from spawn
  { near: [-1, 220],        name: "LH10",          major: true },
  { near: [3, 3100],        name: "LH10",          major: true },
  // Brightnesss's roads
  { near: [-3402, -2658],   name: "LH20", major: true },  // main road to Shop/EXP
  { near: [-3402, -12598],  name: "LH20", major: true },
  { near: [-4639, -18498],  name: "LH20", major: true },
  { near: [-4378, -14303],  name: "LH120", major: false },
  { near: [-5874, -18940],  name: "LH20", major: true },
  // branches
  { near: [11081, -4581],   name: "LH105",       major: false },
  { near: [-13609, 1023],   name: "LH305",       major: false },
  { near: [19650, -1000],   name: "LH505",       major: false },  // north branch, no stop yet
  
  
];

// percent: 0-100   status: "Done", "In progress" or "Planned"
const PROGRESS = [
  { name: "+X (East)", percent: 100, status: "Done Jan 2025" },
  { name: "-X (West)",  percent: 100,  status: "Done Nov 2026" },
  { name: "+Z (South)",   percent: 10,  status: "In progress" },
  { name: "-Z (North)",    percent: 0,   status: "Canceled" }
];
