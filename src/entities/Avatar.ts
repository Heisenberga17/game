import * as THREE from 'three';
import { ICameraTarget } from '../types';
import { AVATAR_CONFIG } from '../config/avatar.config';
import { loadModel, loadFBX, enableShadows } from '../utils/ModelLoader';
import { InputManager } from '../core/InputManager';

export interface AvatarConfig {
  modelPath: string;
  blobUrl?: string;
  position: { x: number; y: number; z: number };
  scale?: number;
  rotationY?: number;
  walkAnimationPath?: string;
}

const enum NpcState { WALKING, PAUSING }

/**
 * Avaturn avatar entity with NPC auto-wander and player-controlled modes.
 * Supports Mixamo animation remapping for walk/idle blend.
 */
export class Avatar implements ICameraTarget {
  private mesh: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private boneNames = new Set<string>();

  private playerControlled = false;
  private readonly _position = new THREE.Vector3();
  private readonly _quaternion = new THREE.Quaternion();
  private speed = 0;

  private npcState = NpcState.PAUSING;
  private npcTimer = 0;
  private npcDirection = new THREE.Vector3(0, 0, 1);
  private readonly spawnOrigin = new THREE.Vector3();
  private readonly _moveDir = new THREE.Vector3();

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
      const loadPath = this.config.blobUrl ?? this.config.modelPath;
      const gltf = await loadModel(loadPath);

      this.mesh = gltf.scene as THREE.Group;
      enableShadows(this.mesh);

      const scale = this.config.scale ?? AVATAR_CONFIG.defaultScale;
      this.mesh.scale.setScalar(scale);
      this.mesh.position.copy(this._position);
      this.mesh.quaternion.copy(this._quaternion);
      this.scene.add(this.mesh);

      this.collectBoneNames();
      this.mixer = new THREE.AnimationMixer(this.mesh);

      if (gltf.animations.length > 0) {
        this.idleAction = this.mixer.clipAction(gltf.animations[0]);
        this.idleAction.play();
      }

      await this.loadWalkAnimation();
    } catch (error) {
      console.error('Failed to load avatar:', error);
    }
  }

  private collectBoneNames(): void {
    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Bone) this.boneNames.add(child.name);
    });
  }

  /** Remap Mixamo "mixamorig:Hips" track names to Avaturn "Hips" format. */
  private remapAnimationClip(clip: THREE.AnimationClip): THREE.AnimationClip {
    for (const track of clip.tracks) {
      const dotIdx = track.name.indexOf('.');
      if (dotIdx === -1) continue;

      const bonePart = track.name.substring(0, dotIdx);
      const propPart = track.name.substring(dotIdx);
      const stripped = bonePart.replace(/^mixamorig:?/, '');

      if (this.boneNames.has(stripped)) {
        track.name = stripped + propPart;
      }
    }
    return clip;
  }

  private async loadWalkAnimation(): Promise<void> {
    const walkPath = this.config.walkAnimationPath ?? '/models/avatars/animations/walking.fbx';
    try {
      const fbx = await loadFBX(walkPath);
      if (fbx.animations.length > 0 && this.mixer) {
        const clip = this.remapAnimationClip(fbx.animations[0]);
        this.walkAction = this.mixer.clipAction(clip);
        this.walkAction.enabled = true;
        this.walkAction.setEffectiveWeight(0);
        this.walkAction.play();
      }
    } catch {
      // Walk animation is optional; avatar still works with idle only
    }
  }

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
      this.npcState = NpcState.PAUSING;
      this.npcTimer = 0;
      this.crossfade(false);
      this.speed = 0;
    }
  }

  update(dt: number, inputManager?: InputManager): void {
    if (!this.mesh) return;

    if (this.playerControlled && inputManager) {
      this.updatePlayerControl(dt, inputManager);
    } else {
      this.updateNPC(dt);
    }

    this.mesh.position.copy(this._position);
    this.mesh.quaternion.copy(this._quaternion);
    this.mixer?.update(dt);
  }

  private updatePlayerControl(dt: number, input: InputManager): void {
    const walkSpeed = AVATAR_CONFIG.walkSpeed;
    let moving = false;
    this._moveDir.set(0, 0, 0);

    if (input.isForward())  { this._moveDir.z += 1; moving = true; }
    if (input.isBackward()) { this._moveDir.z -= 1; moving = true; }
    if (input.isLeft())     { this._moveDir.x += 1; moving = true; }
    if (input.isRight())    { this._moveDir.x -= 1; moving = true; }

    if (moving) {
      this._moveDir.normalize();
      const angle = Math.atan2(this._moveDir.x, this._moveDir.z);
      this._quaternion.setFromEuler(new THREE.Euler(0, angle, 0));

      this._position.x += this._moveDir.x * walkSpeed * dt;
      this._position.z += this._moveDir.z * walkSpeed * dt;
      this.speed = walkSpeed;

      if (this.walkAction && this.walkAction.getEffectiveWeight() < 0.5) {
        this.crossfade(true);
      }
    } else {
      this.speed = 0;
      if (this.walkAction && this.walkAction.getEffectiveWeight() > 0.5) {
        this.crossfade(false);
      }
    }
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
          this.pickWanderDirection();
          this.crossfade(true);
        }
        break;

      case NpcState.WALKING: {
        const walkSpeed = AVATAR_CONFIG.walkSpeed;
        this.speed = walkSpeed;
        this._position.x += this.npcDirection.x * walkSpeed * dt;
        this._position.z += this.npcDirection.z * walkSpeed * dt;

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
    const dx = this.spawnOrigin.x - this._position.x;
    const dz = this.spawnOrigin.z - this._position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > npcCfg.wanderRadius * 0.7) {
      this.npcDirection.set(dx / dist, 0, dz / dist);
    } else {
      const angle = Math.random() * Math.PI * 2;
      this.npcDirection.set(Math.sin(angle), 0, Math.cos(angle));
    }
  }

  // ---- ICameraTarget ----

  getPosition(): THREE.Vector3 { return this._position; }
  getQuaternion(): THREE.Quaternion { return this._quaternion; }
  getSpeed(): number { return this.speed; }

  dispose(): void {
    this.mixer?.stopAllAction();
    if (this.mesh) this.scene.remove(this.mesh);
  }
}
