/**
 * Vehicle physics and visual configuration.
 * NOT marked `as const` — lil-gui needs to mutate these at runtime.
 */
export const VEHICLE_CONFIG = {
  // --- Chassis ---
  chassisWidth: 1,            // half-extent X (total width = 2)
  chassisHeight: 0.5,         // half-extent Y (total height = 1)
  chassisLength: 2,           // half-extent Z (total length = 4)
  chassisMass: 120,
  spawnPosition: { x: 0, y: 85, z: 0 },

  // --- Wheels ---
  // Indices 0,1 = front (steered), indices 2,3 = rear (driven)
  wheelRadius: 0.4,
  wheelWidth: 0.3,
  wheelSegments: 16,
  wheelPositions: [
    { x: -0.85, y: 0, z:  1.4 },  // 0: front-left  (steer)
    { x:  0.85, y: 0, z:  1.4 },  // 1: front-right (steer)
    { x: -0.85, y: 0, z: -1.4 },  // 2: rear-left   (drive)
    { x:  0.85, y: 0, z: -1.4 },  // 3: rear-right  (drive)
  ],

  // --- Suspension ---
  suspensionStiffness: 25,
  suspensionRestLength: 0.3,
  maxSuspensionTravel: 0.3,
  maxSuspensionForce: 100000,
  dampingCompression: 3.8,
  dampingRelaxation: 2.0,

  // --- Traction ---
  frictionSlip: 1.4,
  rollInfluence: 0.01,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: true,

  // --- Drive / Steer / Brake ---
  maxForce: 1400,
  reverseForceRatio: 0.5,
  maxSteerVal: 0.8,
  steerSpeed: 0.5,            // lerp factor per fixed step toward target steer
  steerReturnSpeed: 0.2,      // lerp factor per fixed step back to center (slower = looser)
  brakeForce: 80,
  steerSpeedFalloff: 0.1,     // how much max steer reduces at top speed (0–1)

  // --- Misc ---
  linearDamping: 0.1,
  angularDamping: 0.3,
  maxSpeedApprox: 35,

  // --- Wheel ray directions ---
  directionLocal: { x: 0, y: -1, z: 0 },
  axleLocal: { x: -1, y: 0, z: 0 },
};
