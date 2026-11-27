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
  
  { name: "SamaShop",  type: "Shop", x: -13610,  z: 2580, desc: "A shop by GumiSamaVT." },
  { name: "Regalia Empire",  type: "Town", x: -8430,   z: 0,  desc: "An empire founded by RedFlamz and Bloodhound412." },
  { name: "Bucees",  type: "Shop", x: -3404,  z: 0, desc: "A shop." },
  { name: "Shop/EXP",  type: "Shop", x: -3404,  z: -5600, desc: "/pw EXP and /pw Shop." },
  { name: "Community Center",  type: "Park", x: 0,  z: 0, desc: "A community park." },
  
  { name: "/pw Highway Hub",  type: "Hub", x: 840,  z: 0, desc: "The /pw Highway spawn point." },
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
  { near: [3, 2514],        name: "LH10",          major: true },
  // Brightnesss's roads
  { near: [-3402, -2658],   name: "LH20", major: true },  // main road to Shop/EXP
  { near: [-3402, -12598],  name: "LH20", major: true },
  { near: [-4639, -18498],  name: "LH20", major: true },
  { near: [-4378, -14303],  name: "LH120", major: false },
  { near: [-5874, -18940],  name: "LH20", major: true },
  // branches
  { near: [11081, -4581],   name: "LH105",       major: false },
  { near: [-13609, 1023],   name: "LH305",       major: false },
  { near: [19650, -2998],   name: "LH205",       major: false },  // north branch, no stop yet
  
];

// percent: 0-100   status: "Done", "In progress" or "Planned"
const PROGRESS = [
  { name: "+X (East)", percent: 100, status: "Done Jan 2025" },
  { name: "-X (West)",  percent: 100,  status: "Done Nov 2026" },
  { name: "+Z (South)",   percent: 10,  status: "In progress" },
  { name: "-Z (North)",    percent: 0,   status: "Canceled" }
];
