import * as THREE from 'three';
import { CAMERA_CONFIG } from '../config/camera.config';
import { AVATAR_CONFIG } from '../config/avatar.config';
import { ICameraTarget } from '../types';
import { smoothDamp, lerp, clamp } from '../utils/math';
import { InputManager } from '../core/InputManager';

export enum CameraMode {
  CHASE = 'chase',
  FRONT_FACING = 'front_facing',
  THIRD_PERSON = 'third_person',  // behind avatar (for walking control)
}

/**
 * Camera controller supporting:
 * - CHASE mode: third-person chase camera behind a target (car)
 * - FRONT_FACING mode: camera in front of an avatar looking at it
 *
 * All vector math uses pre-allocated objects so update() is allocation-free.
 */
export class CameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private target: ICameraTarget;
  private mode = CameraMode.CHASE;

  // Orbit camera state (third-person)
  private orbitYaw = 0;
  private orbitPitch = 0.3;

  // Pre-allocated working vectors (never re-created)
  private readonly _idealPosition = new THREE.Vector3();
  private readonly _idealLookAt = new THREE.Vector3();
  private readonly _currentPosition = new THREE.Vector3();
  private readonly _currentLookAt = new THREE.Vector3();
  private readonly _offset = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, target: ICameraTarget) {
    this.camera = camera;
    this.target = target;

    // Snap to ideal position on first frame so there is no jarring lerp.
    this.snapToTarget();
  }

  /** Switch target and camera mode, snapping to avoid slow lerp. */
  setTarget(target: ICameraTarget, mode: CameraMode): void {
    this.target = target;
    this.mode = mode;
    this.snapToTarget();
  }

  getMode(): CameraMode {
    return this.mode;
  }

  /** Current orbit yaw angle (world Y rotation). Used for camera-relative avatar movement. */
  getOrbitYaw(): number {
    return this.orbitYaw;
  }

  /** Call once per render frame. dt in seconds. */
  update(dt: number, input?: InputManager): void {
    if (this.mode === CameraMode.THIRD_PERSON && input) {
      this.updateOrbitInput(input, dt);
    }

    switch (this.mode) {
      case CameraMode.CHASE:
        this.updateChase(dt);
        break;
      case CameraMode.FRONT_FACING:
        this.updateFrontFacing(dt);
        break;
      case CameraMode.THIRD_PERSON:
        this.updateThirdPerson(dt);
        break;
    }
  }

  /** Apply right-stick input to orbit yaw/pitch. */
  private updateOrbitInput(input: InputManager, dt: number): void {
    const cam = AVATAR_CONFIG.camera;
    const axes = input.getCameraAxes();
    this.orbitYaw -= axes.x * cam.orbitSensitivity * dt;
    this.orbitPitch += axes.y * cam.orbitSensitivity * dt;
    this.orbitPitch = clamp(this.orbitPitch, cam.minPitch, cam.maxPitch);
  }

  // ---- Chase mode (existing behaviour) ----

  private updateChase(dt: number): void {
    const pos = this.target.getPosition();
    const quat = this.target.getQuaternion();

    // Ideal camera position (behind and above the car)
    this._offset.set(0, CAMERA_CONFIG.heightOffset, -CAMERA_CONFIG.followDistance);
    this._offset.applyQuaternion(quat);
    this._idealPosition.copy(pos).add(this._offset);

    // Ideal look-at (slightly above the car)
    this._idealLookAt.set(pos.x, pos.y + CAMERA_CONFIG.lookAtHeight, pos.z);

    // Spring-damper smoothing (frame-rate independent)
    const factor = smoothDamp(CAMERA_CONFIG.smoothFactor, dt);
    this._currentPosition.lerp(this._idealPosition, factor);
    this._currentLookAt.lerp(this._idealLookAt, factor);

    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);

    // Speed-dependent FOV
    const speedRatio = clamp(this.target.getSpeed() / 30, 0, 1);
    const targetFov = CAMERA_CONFIG.baseFov + speedRatio * CAMERA_CONFIG.fovShift;
    const fovFactor = smoothDamp(CAMERA_CONFIG.fovSmoothFactor, dt);
    this.camera.fov = lerp(this.camera.fov, targetFov, fovFactor);
    this.camera.updateProjectionMatrix();
  }

  // ---- Front-facing mode (avatar view) ----

  private updateFrontFacing(dt: number): void {
    const pos = this.target.getPosition();
    const quat = this.target.getQuaternion();
    const cam = AVATAR_CONFIG.camera;

    // Position camera in front of the avatar
    this._offset.set(0, cam.heightOffset, cam.distance);
    this._offset.applyQuaternion(quat);
    this._idealPosition.copy(pos).add(this._offset);

    // Look at avatar's chest/head area
    this._idealLookAt.set(pos.x, pos.y + cam.lookAtHeight, pos.z);

    // Smooth transition
    const factor = smoothDamp(CAMERA_CONFIG.smoothFactor, dt);
    this._currentPosition.lerp(this._idealPosition, factor);
    this._currentLookAt.lerp(this._idealLookAt, factor);

    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);

    // Reset FOV to base
    const fovFactor = smoothDamp(CAMERA_CONFIG.fovSmoothFactor, dt);
    this.camera.fov = lerp(this.camera.fov, CAMERA_CONFIG.baseFov, fovFactor);
    this.camera.updateProjectionMatrix();
  }

  // ---- Third-person mode (orbit camera behind avatar) ----

  private updateThirdPerson(dt: number): void {
    const pos = this.target.getPosition();
    const cam = AVATAR_CONFIG.camera;

    // Spherical offset from orbit angles
    const cosP = Math.cos(this.orbitPitch);
    this._offset.set(
      -Math.sin(this.orbitYaw) * cosP * cam.distance,
      Math.sin(this.orbitPitch) * cam.distance + cam.heightOffset,
      -Math.cos(this.orbitYaw) * cosP * cam.distance,
    );
    this._idealPosition.copy(pos).add(this._offset);

    // Look at avatar's chest/head area
    this._idealLookAt.set(pos.x, pos.y + cam.lookAtHeight, pos.z);

    // Smooth transition
    const factor = smoothDamp(CAMERA_CONFIG.smoothFactor, dt);
    this._currentPosition.lerp(this._idealPosition, factor);
    this._currentLookAt.lerp(this._idealLookAt, factor);

    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);

    // Reset FOV to base
    const fovFactor = smoothDamp(CAMERA_CONFIG.fovSmoothFactor, dt);
    this.camera.fov = lerp(this.camera.fov, CAMERA_CONFIG.baseFov, fovFactor);
    this.camera.updateProjectionMatrix();
  }

  // ---- Helpers ----

  private snapToTarget(): void {
    const pos = this.target.getPosition();
    const quat = this.target.getQuaternion();
    const cam = AVATAR_CONFIG.camera;

    if (this.mode === CameraMode.THIRD_PERSON) {
      // Init orbit angles from avatar's current facing direction
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
      this.orbitYaw = Math.atan2(forward.x, forward.z);
      this.orbitPitch = cam.defaultPitch;

      const cosP = Math.cos(this.orbitPitch);
      this._offset.set(
        -Math.sin(this.orbitYaw) * cosP * cam.distance,
        Math.sin(this.orbitPitch) * cam.distance + cam.heightOffset,
        -Math.cos(this.orbitYaw) * cosP * cam.distance,
      );
    } else {
      switch (this.mode) {
        case CameraMode.CHASE:
          this._offset.set(0, CAMERA_CONFIG.heightOffset, -CAMERA_CONFIG.followDistance);
          break;
        case CameraMode.FRONT_FACING:
          this._offset.set(0, cam.heightOffset, cam.distance);
          break;
      }
      this._offset.applyQuaternion(quat);
    }

    this._currentPosition.copy(pos).add(this._offset);

    const lookAtHeight = this.mode === CameraMode.CHASE
      ? CAMERA_CONFIG.lookAtHeight
      : cam.lookAtHeight;
    this._currentLookAt.set(pos.x, pos.y + lookAtHeight, pos.z);

    this.camera.position.copy(this._currentPosition);
    this.camera.lookAt(this._currentLookAt);
  }
}
