import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ---- Pre-allocated temp objects (avoid per-frame allocations / GC pressure) ----
export const _tempVec3 = new THREE.Vector3();
export const _tempQuat = new THREE.Quaternion();
export const _tempMat4 = new THREE.Matrix4();
export const _tempCannonVec = new CANNON.Vec3();
export const _tempCannonQuat = new CANNON.Quaternion();

/** Clamp `value` between `min` and `max`. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation from `a` to `b` by factor `t`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Exponential smooth-damp helper.
 * Returns `1 - Math.pow(factor, dt)` — use as the interpolation alpha
 * so that smoothing is frame-rate independent.
 */
export function smoothDamp(factor: number, dt: number): number {
  return 1 - Math.pow(factor, dt);
}
