/**
 * Third-person camera configuration.
 * smoothFactor / fovSmoothFactor are used in: 1 - Math.pow(factor, dt)
 * NOT marked `as const` — lil-gui needs to mutate these at runtime.
 */
export const CAMERA_CONFIG = {
  followDistance: 5,
  heightOffset: 2.2,
  lookAtHeight: 0.8,
  smoothFactor: 0.0001,
  baseFov: 70,
  fovShift: 8,
  fovSmoothFactor: 0.0001,
  near: 0.1,
  far: 200,
};
