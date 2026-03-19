import * as THREE from 'three';
import { ICameraTarget } from '../types';
import { AVATAR_CONFIG } from '../config/avatar.config';
import { loadModel, loadFBX, enableShadows, fixFBXMaterials } from '../utils/ModelLoader';
import { InputManager } from '../core/InputManager';

export interface AvatarConfig {
  modelPath: string;
  modelType?: 'glb' | 'fbx';
  texturePath?: string;
  position: { x: number; y: number; z: number };
  scale?: number;
  rotationY?: number;
}

/** NPC state for random wandering */
const enum NpcState {
  WALKING,
  PAUSING,
}

/**
 * Reusable Avaturn avatar entity.
 * Supports NPC auto-wander mode and player-controlled mode.
 * Implements ICameraTarget so the camera can track it.
 */
export class Avatar implements ICameraTarget {
  private mesh: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private playerControlled = false;
  private readonly _position = new THREE.Vector3();
  private readonly _quaternion = new THREE.Quaternion();
  private speed = 0;

  // NPC wander state
  private npcState = NpcState.PAUSING;
  private npcTimer = 0;
  private npcDirection = new THREE.Vector3(0, 0, 1);
  private readonly spawnOrigin = new THREE.Vector3();

  // Smooth movement state
  private currentSpeed = 0;

  // Jump state
  private _velocityY = 0;
  private _grounded = true;

  // Temp vectors (allocation-free updates)
  private readonly _moveDir = new THREE.Vector3();
  private readonly _targetQuat = new THREE.Quaternion();
  private readonly _tempEuler = new THREE.Euler();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly config: AvatarConfig,
  ) {
    this._position.set(config.position.x, config.position.y, config.position.z);
    this.spawnOrigin.copy(this._position);
    this._quaternion.setFromEuler(new THREE.Euler(0, config.rotationY ?? 0, 0));
  }

  async load(): Promise<void> {
    try {
      console.log('Loading avatar model:', this.config.modelPath);

      let animations: THREE.AnimationClip[] = [];

      if (this.config.modelType === 'fbx') {
        // FBX path — walk.fbx contains skeleton + mesh + walk animation
        const fbxGroup = await loadFBX(this.config.modelPath);

        // Apply PNG texture if provided, otherwise fall back to fixFBXMaterials
        if (this.config.texturePath) {
          const texLoader = new THREE.TextureLoader();
          try {
            const texture = await texLoader.loadAsync(this.config.texturePath);
            texture.colorSpace = THREE.SRGBColorSpace;
            fbxGroup.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                  map: texture,
                  roughness: 0.8,
                  metalness: 0.1,
                });
              }
            });
          } catch (e) {
            console.warn('Texture load failed, using vertex colors:', this.config.texturePath, e);
            fixFBXMaterials(fbxGroup);
          }
        } else {
          fixFBXMaterials(fbxGroup);
        }

        this.mesh = fbxGroup;
        animations = fbxGroup.animations;
      } else {
        // GLB path (default)
        const gltf = await loadModel(this.config.modelPath);
        this.mesh = gltf.scene as THREE.Group;
        animations = gltf.animations;
      }

      enableShadows(this.mesh);

      // Auto-scale avatar to target height (person-sized relative to 4-unit car)
      const box = new THREE.Box3().setFromObject(this.mesh);
      const nativeHeight = box.max.y - box.min.y;
      const targetHeight = AVATAR_CONFIG.targetHeight;
      const autoScale = nativeHeight > 0 ? targetHeight / nativeHeight : 1;
      this.mesh.scale.setScalar(autoScale);

      // Position and rotation
      this.mesh.position.copy(this._position);
      this.mesh.quaternion.copy(this._quaternion);

      this.scene.add(this.mesh);

      // Animation mixer
      this.mixer = new THREE.AnimationMixer(this.mesh);

      // Use the embedded animation as the walk clip
      if (animations.length > 0 && this.mixer) {
        const clip = animations[0];
        // Filter out root-motion position track to prevent sliding/floating
        clip.tracks = clip.tracks.filter(t => t.name !== 'mixamorigHips.position');

        // Walk action — starts playing but blended to 0 weight (idle)
        this.walkAction = this.mixer.clipAction(clip);
        this.walkAction.enabled = true;
        this.walkAction.setEffectiveWeight(0);
        this.walkAction.play();

        // Idle action reuses the same clip but at timeScale 0 (frozen first frame)
        this.idleAction = this.mixer.clipAction(
          new THREE.AnimationClip(clip.name + '_idle', clip.duration, clip.tracks),
        );
        this.idleAction.enabled = true;
        this.idleAction.setEffectiveWeight(1);
        this.idleAction.setEffectiveTimeScale(0);
        this.idleAction.play();

        console.log('Walk animation ready (embedded):', clip.name, 'tracks:', clip.tracks.length);
      }

      console.log('Avatar loaded successfully');
    } catch (error) {
      console.error('Failed to load avatar:', error);
    }
  }

  /** Switch between walk and idle animations */
  private crossfade(toWalk: boolean): void {
    if (!this.idleAction || !this.walkAction) return;

    const fadeTime = 0.3;
    if (toWalk) {
      this.walkAction.setEffectiveWeight(1);
      this.idleAction.crossFadeTo(this.walkAction, fadeTime, false);
    } else {
      this.idleAction.setEffectiveWeight(1);
      this.walkAction.crossFadeTo(this.idleAction, fadeTime, false);
    }
  }

  setPlayerControlled(controlled: boolean): void {
    this.playerControlled = controlled;
    if (!controlled) {
      // Return to NPC mode, start pausing
      this.npcState = NpcState.PAUSING;
      this.npcTimer = 0;
      this.crossfade(false);
      this.speed = 0;
    }
  }

  update(dt: number, inputManager?: InputManager, cameraYaw?: number): void {
    if (!this.mesh) return;

    if (this.playerControlled && inputManager) {
      this.updatePlayerControl(dt, inputManager, cameraYaw ?? 0);
    } else {
      this.updateNPC(dt);
    }

    // Sync mesh transform
    this.mesh.position.copy(this._position);
    this.mesh.quaternion.copy(this._quaternion);

    // Advance animations
    if (this.mixer) {
      this.mixer.update(dt);
    }
  }

  private updatePlayerControl(dt: number, input: InputManager, cameraYaw: number): void {
    const walkSpeed = AVATAR_CONFIG.walkSpeed;
    const { acceleration, deceleration, turnSpeed, inputDeadzone, jumpForce, gravity } = AVATAR_CONFIG.movement;

    // Read analog input
    const axes = input.getMovementAxes();
    const inputMag = Math.min(1, Math.sqrt(axes.x * axes.x + axes.y * axes.y));

    if (inputMag > inputDeadzone) {
      // Rotate input axes by camera yaw to get world-space direction
      const cosY = Math.cos(cameraYaw);
      const sinY = Math.sin(cameraYaw);
      const worldX = -axes.x * cosY + axes.y * sinY;
      const worldZ = axes.x * sinY + axes.y * cosY;

      // Smooth speed toward target
      const targetSpeed = walkSpeed * inputMag;
      const accFactor = 1 - Math.pow(2, -acceleration * dt);
      this.currentSpeed += (targetSpeed - this.currentSpeed) * accFactor;

      // Compute target rotation from camera-relative input angle
      const angle = Math.atan2(worldX, worldZ);
      this._targetQuat.setFromEuler(this._tempEuler.set(0, angle, 0));

      // Smooth rotation via slerp
      const turnFactor = 1 - Math.pow(2, -turnSpeed * dt);
      this._quaternion.slerp(this._targetQuat, turnFactor);

      // Move along facing direction (extract forward from smoothed quaternion)
      this._moveDir.set(0, 0, 1).applyQuaternion(this._quaternion);
      this._position.x += this._moveDir.x * this.currentSpeed * dt;
      this._position.z += this._moveDir.z * this.currentSpeed * dt;
    } else {
      // Decelerate to zero
      const decFactor = 1 - Math.pow(2, -deceleration * dt);
      this.currentSpeed *= (1 - decFactor);
      if (this.currentSpeed < 0.01) this.currentSpeed = 0;

      // Keep sliding in facing direction while decelerating
      if (this.currentSpeed > 0) {
        this._moveDir.set(0, 0, 1).applyQuaternion(this._quaternion);
        this._position.x += this._moveDir.x * this.currentSpeed * dt;
        this._position.z += this._moveDir.z * this.currentSpeed * dt;
      }
    }

    // Jump
    if (input.isJump() && this._grounded) {
      this._velocityY = jumpForce;
      this._grounded = false;
    }

    if (!this._grounded) {
      this._velocityY -= gravity * dt;
      this._position.y += this._velocityY * dt;
      if (this._position.y <= this.spawnOrigin.y) {
        this._position.y = this.spawnOrigin.y;
        this._velocityY = 0;
        this._grounded = true;
      }
    }

    this.speed = this.currentSpeed;
    this.updateAnimationBlend();
  }

  /** Blend walk/idle animations proportionally to current speed. */
  private updateAnimationBlend(): void {
    if (!this.idleAction || !this.walkAction) return;

    const speedRatio = Math.min(1, this.currentSpeed / AVATAR_CONFIG.walkSpeed);
    this.walkAction.setEffectiveWeight(speedRatio);
    this.idleAction.setEffectiveWeight(1 - speedRatio);
    this.walkAction.setEffectiveTimeScale(Math.max(0.3, speedRatio));
  }

  private updateNPC(dt: number): void {
    const npcCfg = AVATAR_CONFIG.npc;
    this.npcTimer += dt;

    switch (this.npcState) {
      case NpcState.PAUSING:
        this.speed = 0;
        if (this.npcTimer >= npcCfg.pauseDuration) {
          this.npcTimer = 0;
          this.npcState = NpcState.WALKING;
          // Pick a random direction, biased toward spawn origin if far away
          this.pickWanderDirection();
          this.crossfade(true);
        }
        break;

      case NpcState.WALKING: {
        const walkSpeed = AVATAR_CONFIG.walkSpeed;
        this.speed = walkSpeed;

        // Move in current direction
        this._position.x += this.npcDirection.x * walkSpeed * dt;
        this._position.z += this.npcDirection.z * walkSpeed * dt;

        // Face movement direction
        const angle = Math.atan2(this.npcDirection.x, this.npcDirection.z);
        this._quaternion.setFromEuler(new THREE.Euler(0, angle, 0));

        if (this.npcTimer >= npcCfg.walkDuration) {
          this.npcTimer = 0;
          this.npcState = NpcState.PAUSING;
          this.crossfade(false);
        }
        break;
      }
    }
  }

  private pickWanderDirection(): void {
    const npcCfg = AVATAR_CONFIG.npc;

    // If far from spawn, bias direction toward it
    const dx = this.spawnOrigin.x - this._position.x;
    const dz = this.spawnOrigin.z - this._position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > npcCfg.wanderRadius * 0.7) {
      // Head back toward spawn
      this.npcDirection.set(dx / dist, 0, dz / dist);
    } else {
      // Random direction
      const angle = Math.random() * Math.PI * 2;
      this.npcDirection.set(Math.sin(angle), 0, Math.cos(angle));
    }
  }

  // ---- ICameraTarget ----

  getPosition(): THREE.Vector3 {
    return this._position;
  }

  getQuaternion(): THREE.Quaternion {
    return this._quaternion;
  }

  getSpeed(): number {
    return this.speed;
  }

  dispose(): void {
    if (this.mixer) this.mixer.stopAllAction();
    if (this.mesh) this.scene.remove(this.mesh);
  }
}
