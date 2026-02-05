import * as CANNON from 'cannon-es';
import { VEHICLE_CONFIG } from '../config/vehicle.config';

/**
 * Raycast vehicle built on cannon-es.
 * Creates a chassis body with 4 wheels (2 front for steering, 2 rear for drive).
 */
export class VehiclePhysics {
  public readonly chassisBody: CANNON.Body;
  public readonly vehicle: CANNON.RaycastVehicle;

  constructor(world: CANNON.World) {
    // ---- Chassis ----
    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(
        VEHICLE_CONFIG.chassisWidth,
        VEHICLE_CONFIG.chassisHeight,
        VEHICLE_CONFIG.chassisLength,
      ),
    );

    const chassisMaterial = new CANNON.Material({
      friction: 0.3,
      restitution: 0.3,
    });

    this.chassisBody = new CANNON.Body({
      mass: VEHICLE_CONFIG.chassisMass,
      material: chassisMaterial,
    });
    this.chassisBody.addShape(chassisShape);
    this.chassisBody.position.set(
      VEHICLE_CONFIG.spawnPosition.x,
      VEHICLE_CONFIG.spawnPosition.y,
      VEHICLE_CONFIG.spawnPosition.z,
    );
    this.chassisBody.linearDamping = VEHICLE_CONFIG.linearDamping;

    // ---- Raycast vehicle ----
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });

    // ---- Wheels ----
    this.addWheels();

    // ---- Add to world ----
    this.vehicle.addToWorld(world);
  }

  /** Apply engine force to the rear wheels (indices 2 and 3). */
  applyEngineForce(force: number): void {
    this.vehicle.applyEngineForce(force, 2);
    this.vehicle.applyEngineForce(force, 3);
  }

  /** Set steering angle on the front wheels (indices 0 and 1). */
  setSteering(value: number): void {
    this.vehicle.setSteeringValue(value, 0);
    this.vehicle.setSteeringValue(value, 1);
  }

  /** Apply braking force to all 4 wheels. */
  setBrake(force: number): void {
    for (let i = 0; i < 4; i++) {
      this.vehicle.setBrake(force, i);
    }
  }

  /** Current speed of the chassis (scalar, m/s). */
  getSpeed(): number {
    return this.chassisBody.velocity.length();
  }

  /**
   * Returns the world-space position and quaternion of a wheel.
   * Call this after the physics step for accurate transforms.
   */
  getWheelTransform(index: number): { position: CANNON.Vec3; quaternion: CANNON.Quaternion } {
    this.vehicle.updateWheelTransform(index);
    const info = this.vehicle.wheelInfos[index];
    return {
      position: info.worldTransform.position,
      quaternion: info.worldTransform.quaternion,
    };
  }

  // ---- Internal ----

  // Pre-allocated direction and axle vectors shared across all wheels
  private static readonly WHEEL_DIRECTION = new CANNON.Vec3(0, -1, 0);
  private static readonly WHEEL_AXLE = new CANNON.Vec3(-1, 0, 0);

  private addWheels(): void {
    for (const wheelPos of VEHICLE_CONFIG.wheelPositions) {
      this.vehicle.addWheel({
        radius: VEHICLE_CONFIG.wheelRadius,
        directionLocal: VehiclePhysics.WHEEL_DIRECTION,
        axleLocal: VehiclePhysics.WHEEL_AXLE,
        suspensionStiffness: VEHICLE_CONFIG.suspensionStiffness,
        suspensionRestLength: VEHICLE_CONFIG.suspensionRestLength,
        maxSuspensionTravel: VEHICLE_CONFIG.maxSuspensionTravel,
        maxSuspensionForce: VEHICLE_CONFIG.maxSuspensionForce,
        dampingCompression: VEHICLE_CONFIG.dampingCompression,
        dampingRelaxation: VEHICLE_CONFIG.dampingRelaxation,
        frictionSlip: VEHICLE_CONFIG.frictionSlip,
        rollInfluence: VEHICLE_CONFIG.rollInfluence,
        customSlidingRotationalSpeed: VEHICLE_CONFIG.customSlidingRotationalSpeed,
        useCustomSlidingRotationalSpeed: VEHICLE_CONFIG.useCustomSlidingRotationalSpeed,
        chassisConnectionPointLocal: new CANNON.Vec3(wheelPos.x, wheelPos.y, wheelPos.z),
      });
    }
  }
}
