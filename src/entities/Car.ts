import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VehiclePhysics } from '../physics/VehiclePhysics';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager } from '../core/InputManager';
import { VEHICLE_CONFIG } from '../config/vehicle.config';
import { loadModel, enableShadows, fixMaterials, getDimensions } from '../utils/ModelLoader';
import { syncBodyToMesh, syncWheelToMesh } from '../utils/syncBodyToMesh';
import { lerp } from '../utils/math';
import { ICameraTarget } from '../types';
import { getVehicleFile } from '../ui/GameMenu';

/**
 * Player-controlled car entity.
 * Loads GLTF vehicle models from Kenney Car Kit.
 * Implements ICameraTarget so the camera can follow it.
 */
export class Car implements ICameraTarget {
  public vehiclePhysics!: VehiclePhysics;
  public chassisMesh: THREE.Group;
  public readonly wheelMeshes: THREE.Mesh[] = [];

  private readonly scene: THREE.Scene;
  private readonly physicsWorld: PhysicsWorld;

  // Smooth steering state
  private currentSteer = 0;

  // Pre-allocated vectors updated every frame from the chassis mesh.
  private readonly _position = new THREE.Vector3();
  private readonly _quaternion = new THREE.Quaternion();

  // Pre-allocated vector for anti-flip stabilizer
  private readonly _worldUp = new CANNON.Vec3();

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.chassisMesh = new THREE.Group();
    scene.add(this.chassisMesh);
  }

  /** Load the GLTF model for the selected vehicle */
  async loadModel(vehicleId: string): Promise<void> {
    const fileName = getVehicleFile(vehicleId);
    const modelPath = `/models/vehicles/${fileName}`;

    try {
      const gltf = await loadModel(modelPath);
      const model = gltf.scene.clone();

      // Enable shadows and fix materials for proper colors
      enableShadows(model);
      fixMaterials(model);

      // Scale the model to fit physics body dimensions
      const dims = getDimensions(model);
      const targetLength = 4.0; // Target car length
      const scale = targetLength / dims.z;
      model.scale.setScalar(scale);

      // Center the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y = -box.min.y * scale; // Put wheels on ground

      // Clear existing children and add new model
      while (this.chassisMesh.children.length > 0) {
        this.chassisMesh.remove(this.chassisMesh.children[0]);
      }
      this.chassisMesh.add(model);

      // Create physics after loading model
      this.vehiclePhysics = new VehiclePhysics(this.physicsWorld.getWorld());

      // Create wheel visuals
      this.createWheels();
    } catch (error) {
      console.warn(`Failed to load vehicle model ${modelPath}, using fallback`);
      this.createFallbackCar();
      this.vehiclePhysics = new VehiclePhysics(this.physicsWorld.getWorld());
      this.createWheels();
    }
  }

  private createWheels(): void {
    const { wheelRadius, wheelWidth, wheelSegments } = VEHICLE_CONFIG;
    const wheelGeo = new THREE.CylinderGeometry(
      wheelRadius,
      wheelRadius,
      wheelWidth,
      wheelSegments,
    );
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(wheelGeo, wheelMat);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.wheelMeshes.push(mesh);
    }
  }

  private createFallbackCar(): void {
    // Simple box fallback if model fails to load
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.8, 4.0);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf2c12e });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 0.4;
    this.chassisMesh.add(body);
  }

  // --- Input handling (called during fixed update) ---

  handleInput(input: InputManager): void {
    if (!this.vehiclePhysics) return;

    const {
      maxSteerVal,
      maxForce,
      reverseForceRatio,
      brakeForce,
      steerSpeed,
      steerReturnSpeed,
      steerSpeedFalloff,
      maxSpeedApprox,
    } = VEHICLE_CONFIG;

    // Speed-dependent steering: full lock at rest, reduced at top speed
    const speed = this.vehiclePhysics.getSpeed();
    const speedRatio = Math.min(speed / maxSpeedApprox, 1);
    const effectiveMaxSteer = maxSteerVal * (1 - speedRatio * steerSpeedFalloff);

    // Steering target: positive = left, negative = right
    let targetSteer = 0;
    if (input.isLeft()) targetSteer = effectiveMaxSteer;
    else if (input.isRight()) targetSteer = -effectiveMaxSteer;

    // Smooth interpolation (called at fixed 60Hz)
    const rate = targetSteer === 0 ? steerReturnSpeed : steerSpeed;
    this.currentSteer = lerp(this.currentSteer, targetSteer, rate);

    // Engine: negative force = forward in cannon-es convention
    let force = 0;
    if (input.isForward()) force = -maxForce;
    else if (input.isBackward()) force = maxForce * reverseForceRatio;

    // Speed limiter — taper engine force near top speed, zero at max
    if (force < 0 && speed > maxSpeedApprox * 0.7) {
      const fade = 1 - (speed - maxSpeedApprox * 0.7) / (maxSpeedApprox * 0.3);
      force *= Math.max(0, fade);
    }

    // Brake
    const brake = input.isBrake() ? brakeForce : 0;

    this.vehiclePhysics.applyEngineForce(force);
    this.vehiclePhysics.setSteering(this.currentSteer);
    this.vehiclePhysics.setBrake(brake);
  }

  // --- Stability systems (called after physics step) ---

  clampVelocity(): void {
    if (!this.vehiclePhysics) return;

    const body = this.vehiclePhysics.chassisBody;
    const maxVel = VEHICLE_CONFIG.maxSpeedApprox * 1.1;
    const maxAngVel = 3.5;

    // Hard cap linear velocity
    const vel = body.velocity;
    const speed = vel.length();
    if (speed > maxVel) {
      const s = maxVel / speed;
      vel.x *= s;
      vel.y *= s;
      vel.z *= s;
    }

    // Hard cap angular velocity
    const av = body.angularVelocity;
    const angSpeed = av.length();
    if (angSpeed > maxAngVel) {
      const s = maxAngVel / angSpeed;
      av.x *= s;
      av.y *= s;
      av.z *= s;
    }

    // Anti-flip stabilizer: get the car's local up in world space
    body.quaternion.vmult(CANNON.Vec3.UNIT_Y, this._worldUp);
    const upDot = this._worldUp.y; // 1 = upright, 0 = on side, -1 = flipped

    if (upDot < 0.85) {
      // Car is tilting — dampen roll/pitch angular velocity aggressively
      av.x *= 0.8;
      av.z *= 0.8;

      // Apply corrective torque to push the car back upright
      const correctionStrength = (1 - upDot) * 80;
      body.torque.x += -this._worldUp.z * correctionStrength;
      body.torque.z += this._worldUp.x * correctionStrength;
    }

    // If car is nearly flipped, force it upright
    if (upDot < 0.1) {
      av.x *= 0.3;
      av.z *= 0.3;
      // Slerp quaternion toward upright
      const q = body.quaternion;
      const yaw = Math.atan2(
        2 * (q.w * q.y + q.x * q.z),
        1 - 2 * (q.y * q.y + q.z * q.z),
      );
      // Build an upright quaternion preserving the yaw
      body.quaternion.setFromEuler(0, yaw, 0);
      // Kill most velocity so it doesn't immediately flip again
      vel.x *= 0.5;
      vel.z *= 0.5;
    }
  }

  // --- Visual sync (called during frame update) ---

  syncMeshes(_alpha: number): void {
    if (!this.vehiclePhysics) return;

    // Sync chassis body -> mesh group
    syncBodyToMesh(this.vehiclePhysics.chassisBody, this.chassisMesh);

    // Sync each wheel transform -> mesh
    for (let i = 0; i < 4; i++) {
      const transform = this.vehiclePhysics.getWheelTransform(i);
      syncWheelToMesh(transform, this.wheelMeshes[i]);
    }

    // Cache position and quaternion from the synced mesh
    this._position.copy(this.chassisMesh.position);
    this._quaternion.copy(this.chassisMesh.quaternion);
  }

  // --- ICameraTarget implementation ---

  getPosition(): THREE.Vector3 {
    return this._position;
  }

  getQuaternion(): THREE.Quaternion {
    return this._quaternion;
  }

  getSpeed(): number {
    return this.vehiclePhysics?.getSpeed() ?? 0;
  }
}
