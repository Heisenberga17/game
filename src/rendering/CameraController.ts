import * as THREE from 'three';
import { CAMERA_CONFIG } from '../config/camera.config';
import { ICameraTarget } from '../types';
import { smoothDamp, lerp, clamp } from '../utils/math';

/**
 * Third-person chase camera with spring-damper smoothing
 * and speed-dependent FOV shift.
 *
 * All vector math uses pre-allocated objects so update() is allocation-free.
 */
export class CameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly target: ICameraTarget;

  // Pre-allocated working vectors (never re-created)
  private readonly _idealPosition = new THREE.Vector3();
  private readonly _idealLookAt = new THREE.Vector3();
  private readonly _currentPosition = new THREE.Vector3();
  private readonly _currentLookAt = new THREE.Vector3();
  private readonly _offset = new THREE.Vector3();
  private readonly _lookAtOffset = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, target: ICameraTarget) {
    this.camera = camera;
    this.target = target;

    // Snap to ideal position on first frame so there is no jarring lerp.
    const pos = target.getPosition();
    const quat = target.getQuaternion();

    this._offset.set(0, CAMERA_CONFIG.heightOffset, -CAMERA_CONFIG.followDistance);
    this._offset.applyQuaternion(quat);

    this._currentPosition.copy(pos).add(this._offset);
    this._currentLookAt.copy(pos).add(
      this._lookAtOffset.set(0, CAMERA_CONFIG.lookAtHeight, 0),
    );

    camera.position.copy(this._currentPosition);
    camera.lookAt(this._currentLookAt);
  }

  /** Call once per render frame. dt in seconds. */
  update(dt: number): void {
    const pos = this.target.getPosition();
    const quat = this.target.getQuaternion();

    // --- Ideal camera position (behind and above the car) ---
    this._offset.set(0, CAMERA_CONFIG.heightOffset, -CAMERA_CONFIG.followDistance);
    this._offset.applyQuaternion(quat);
    this._idealPosition.copy(pos).add(this._offset);

    // --- Ideal look-at (slightly above the car) ---
    this._idealLookAt.set(
      pos.x,
      pos.y + CAMERA_CONFIG.lookAtHeight,
      pos.z,
    );

    // --- Spring-damper smoothing (frame-rate independent) ---
    const factor = smoothDamp(CAMERA_CONFIG.smoothFactor, dt);
    this._currentPosition.lerp(this._idealPosition, factor);
    this._currentLookAt.lerp(this._idealLookAt, factor);

    // --- Apply to camera ---
    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);

    // --- Speed-dependent FOV ---
    const speedRatio = clamp(this.target.getSpeed() / 30, 0, 1);
    const targetFov = CAMERA_CONFIG.baseFov + speedRatio * CAMERA_CONFIG.fovShift;
    const fovFactor = smoothDamp(CAMERA_CONFIG.fovSmoothFactor, dt);
    this.camera.fov = lerp(this.camera.fov, targetFov, fovFactor);
    this.camera.updateProjectionMatrix();
  }
}
