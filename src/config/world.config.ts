/**
 * World / environment configuration.
 * NOT marked `as const` — lil-gui needs to mutate these at runtime.
 */
export const WORLD_CONFIG = {
  mapSize: 140,

  // --- Physics ---
  gravity: { x: 0, y: -9.82, z: 0 },
  solverIterations: 10,

  // --- Ground ---
  groundColor: 0x333333,       // dark asphalt
  groundFriction: 0.5,

  // --- Sky / Fog ---
  skyColor: 0x8faabc,          // hazy NYC sky
  fogNear: 80,
  fogFar: 200,

  // --- Perimeter walls ---
  wallThickness: 2,
  wallHeight: 50,

  // --- NYC grid layout ---
  streetWidth: 7,
  blockWidth: 10,              // X extent of one city block
  blockDepth: 14,              // Z extent of one city block

  // --- Road markings ---
  roadLineColor: 0xe8d44d,     // NYC yellow
  roadLineWidth: 0.15,
};
