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
  { name: "Highway -X End", type: "End",  x: -25000, z: -352,     desc: "-X End." },
  { name: "Samashop",  type: "Shop", x: -13610,  z: 2580, desc: "A Shop By GumisamaVT." },
  { name: "Regalia Empire",  type: "Town", x: -8430,   z: 0,  desc: "An Empire Founded By RedFlamz And Bloodhound412." },
  { name: "Bucees",  type: "Shop", x: -3404,  z: 0, desc: "Shop." },
  { name: "Shop/EXP",  type: "Shop", x: -3404,  z: -5600, desc: "/pw EXP and /pw Shop." },
  { name: "Community Center",  type: "Park", x: 0,  z: 0, desc: "Community Park." },
  { name: "End Of +Z Highway",  type: "End", x: 0,  z: 1740, desc: "+Z End." },
  { name: "/pw Highway Hub",  type: "Hub", x: 840,  z: 0, desc: "/pw Highway Spawn." },
  { name: "Atlantis",  type: "Shop", x: 11180,  z: -9700, desc: "Large Shop." },
  { name: "Highway +X End",   type: "End",  x: 25000,  z: 0,     desc: "+X End." }
];

// percent: 0-100   status: "Done", "In progress" or "Planned"
const PROGRESS = [
  { name: "+X (East)", percent: 100, status: "Done Jan 2025" },
  { name: "-X (West)",  percent: 100,  status: "Done Nov 2026" },
  { name: "+Z (South)",   percent: 10,  status: "In progress" },
  { name: "-Z (North)",    percent: 0,   status: "CANCELED" }
];
