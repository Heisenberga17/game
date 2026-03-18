/** Clamp `value` between `min` and `max`. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation from `a` to `b` by factor `t`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Frame-rate-independent exponential smoothing.
 * Returns `1 - factor^dt` — use as the lerp alpha each frame.
 */
export function smoothDamp(factor: number, dt: number): number {
  return 1 - Math.pow(factor, dt);
}
