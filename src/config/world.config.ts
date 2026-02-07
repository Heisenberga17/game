/**
 * World / environment configuration.
 * NOT marked `as const` — lil-gui needs to mutate these at runtime.
 */
export const WORLD_CONFIG = {
  mapSize: 600,                  // Large open city for driving

  // --- Physics ---
  gravity: { x: 0, y: -9.82, z: 0 },
  solverIterations: 20,
  physicsSubSteps: 4,

  // --- Ground ---
  groundColor: 0x333333,       // dark asphalt
  groundFriction: 0.5,

  // --- Sky / Fog ---
  skyColor: 0x8faabc,          // hazy NYC sky
  fogNear: 150,
  fogFar: 500,

  // --- Perimeter walls ---
  wallThickness: 2,
  wallHeight: 50,

  // --- NYC grid layout ---
  streetWidth: 16,             // Wide streets for easy driving
  blockWidth: 24,              // Larger blocks with more space
  blockDepth: 28,              // Larger blocks with more space

  // --- Road markings ---
  roadLineColor: 0xe8d44d,     // NYC yellow
  roadLineWidth: 0.25,
};
