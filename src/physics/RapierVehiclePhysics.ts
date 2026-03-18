import type RAPIER from '@dimforge/rapier3d';
import { VEHICLE_CONFIG } from '../config/vehicle.config';
import { RapierPhysicsWorld } from './RapierPhysicsWorld';

interface WheelInfo {
  connectionPointLocal: { x: number; y: number; z: number };
  suspensionLength: number;
  worldTransformPosition: { x: number; y: number; z: number };
  worldTransformQuaternion: { x: number; y: number; z: number; w: number };
  inContact: boolean;
  steeringAngle: number;
  rotation: number; // wheel spin rotation
}

/**
 * Raycast vehicle using Rapier3D raycasts for suspension, traction and steering.
 * 4 wheels: 0,1 = front (steered), 2,3 = rear (driven).
 */
export class RapierVehiclePhysics {
  public readonly chassisBody: RAPIER.RigidBody;
  private readonly physicsWorld: RapierPhysicsWorld;
  private readonly wheels: WheelInfo[] = [];

  // Cached Rapier module reference
  private readonly R: typeof RAPIER;

  constructor(physicsWorld: RapierPhysicsWorld) {
    this.physicsWorld = physicsWorld;
    this.R = physicsWorld.RAPIER;

    // ---- Chassis rigid body ----
    const spawnPos = VEHICLE_CONFIG.spawnPosition;
    const chassisDesc = this.R.RigidBodyDesc.dynamic()
      .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
      .setLinearDamping(VEHICLE_CONFIG.linearDamping)
      .setAngularDamping(VEHICLE_CONFIG.angularDamping)
      .setCcdEnabled(true);

    this.chassisBody = physicsWorld.createRigidBody(chassisDesc);

    // Chassis collider (box shape, offset upward for lower CoM)
    const hw = VEHICLE_CONFIG.chassisWidth / 2;
    const hh = VEHICLE_CONFIG.chassisHeight / 2;
    const hl = VEHICLE_CONFIG.chassisLength / 2;
    const colliderDesc = this.R.ColliderDesc.cuboid(hw, hh, hl)
      .setTranslation(0, 0.3, 0) // offset up -> lower center of mass
      .setMass(VEHICLE_CONFIG.chassisMass)
      .setFriction(0.3)
      .setRestitution(0.3);

    physicsWorld.createCollider(colliderDesc, this.chassisBody);

    // ---- Wheels ----
    for (const wp of VEHICLE_CONFIG.wheelPositions) {
      this.wheels.push({
        connectionPointLocal: { x: wp.x, y: wp.y, z: wp.z },
        suspensionLength: VEHICLE_CONFIG.suspensionRestLength,
        worldTransformPosition: { x: 0, y: 0, z: 0 },
        worldTransformQuaternion: { x: 0, y: 0, z: 0, w: 1 },
        inContact: false,
        steeringAngle: 0,
        rotation: 0,
      });
    }
  }

  // ---- Engine / steering / brake state ----
  private engineForce = 0;
  private brakeForce = 0;

  applyEngineForce(force: number): void {
    this.engineForce = force;
  }

  setSteering(value: number): void {
    // Set steering angles on front wheels
    this.wheels[0].steeringAngle = value;
    this.wheels[1].steeringAngle = value;
  }

  setBrake(force: number): void {
    this.brakeForce = force;
  }

  getSpeed(): number {
    const vel = this.chassisBody.linvel();
    return Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
  }

  /**
   * Update wheel raycasts and apply forces.
   * Call this each physics sub-step BEFORE world.step().
   */
  updateVehicle(dt: number): void {
    const pos = this.chassisBody.translation();
    const rot = this.chassisBody.rotation();

    for (let i = 0; i < this.wheels.length; i++) {
      const wheel = this.wheels[i];

      // Transform wheel connection point to world space
      const localPt = wheel.connectionPointLocal;
      const worldPt = this.rotateByQuat(localPt, rot);
      worldPt.x += pos.x;
      worldPt.y += pos.y;
      worldPt.z += pos.z;

      // Cast ray downward from the connection point
      const rayDir = this.rotateByQuat({ x: 0, y: -1, z: 0 }, rot);
      const maxDist = VEHICLE_CONFIG.suspensionRestLength + VEHICLE_CONFIG.maxSuspensionTravel + VEHICLE_CONFIG.wheelRadius;

      const ray = new this.R.Ray(
        new this.R.Vector3(worldPt.x, worldPt.y, worldPt.z),
        new this.R.Vector3(rayDir.x, rayDir.y, rayDir.z),
      );

      const hit = this.physicsWorld.world.castRay(ray, maxDist, true);

      if (hit) {
        const hitDist = hit.timeOfImpact;
        const compression = VEHICLE_CONFIG.suspensionRestLength + VEHICLE_CONFIG.wheelRadius - hitDist;
        wheel.inContact = compression > 0;

        if (wheel.inContact) {
          // Suspension force (spring + damping)
          const suspensionForce = compression * VEHICLE_CONFIG.suspensionStiffness;
          const dampingForce = this.getWheelVerticalVelocity(i, rot) *
            (compression > wheel.suspensionLength
              ? VEHICLE_CONFIG.dampingCompression
              : VEHICLE_CONFIG.dampingRelaxation);

          const totalSuspForce = Math.min(
            Math.max(suspensionForce - dampingForce, 0),
            VEHICLE_CONFIG.maxSuspensionForce,
          );

          // Apply suspension force in chassis up direction
          const upDir = this.rotateByQuat({ x: 0, y: 1, z: 0 }, rot);
          this.chassisBody.applyImpulseAtPoint(
            new this.R.Vector3(
              upDir.x * totalSuspForce * dt,
              upDir.y * totalSuspForce * dt,
              upDir.z * totalSuspForce * dt,
            ),
            new this.R.Vector3(worldPt.x, worldPt.y, worldPt.z),
            true,
          );

          // Engine force (rear wheels only: indices 2,3)
          if (i >= 2 && this.engineForce !== 0) {
            const fwd = this.getWheelForward(i, rot);
            // Negative engine force = forward (matches input convention)
            const force = -this.engineForce;
            this.chassisBody.applyImpulseAtPoint(
              new this.R.Vector3(
                fwd.x * force * dt,
                fwd.y * force * dt,
                fwd.z * force * dt,
              ),
              new this.R.Vector3(worldPt.x, worldPt.y, worldPt.z),
              true,
            );
          }

          // Lateral friction (side force to prevent sliding)
          const rightDir = this.getWheelRight(i, rot);
          const vel = this.chassisBody.velocityAtPoint(
            new this.R.Vector3(worldPt.x, worldPt.y, worldPt.z),
          );
          const lateralVel = vel.x * rightDir.x + vel.y * rightDir.y + vel.z * rightDir.z;
          const frictionForce = -lateralVel * VEHICLE_CONFIG.frictionSlip * totalSuspForce * 0.01;

          this.chassisBody.applyImpulseAtPoint(
            new this.R.Vector3(
              rightDir.x * frictionForce * dt,
              rightDir.y * frictionForce * dt,
              rightDir.z * frictionForce * dt,
            ),
            new this.R.Vector3(worldPt.x, worldPt.y, worldPt.z),
            true,
          );

          // Brake force
          if (this.brakeForce > 0) {
            const fwd2 = this.getWheelForward(i, rot);
            const fwdVel = vel.x * fwd2.x + vel.y * fwd2.y + vel.z * fwd2.z;
            const brakeFrc = -Math.sign(fwdVel) * Math.min(this.brakeForce, Math.abs(fwdVel) * VEHICLE_CONFIG.chassisMass);

            this.chassisBody.applyImpulseAtPoint(
              new this.R.Vector3(
                fwd2.x * brakeFrc * dt,
                fwd2.y * brakeFrc * dt,
                fwd2.z * brakeFrc * dt,
              ),
              new this.R.Vector3(worldPt.x, worldPt.y, worldPt.z),
              true,
            );
          }

          // Update wheel suspension length
          wheel.suspensionLength = compression;

          // Wheel position: at the raycast hit point + wheel radius up
          const wheelY = worldPt.y - hitDist + VEHICLE_CONFIG.wheelRadius;
          wheel.worldTransformPosition = { x: worldPt.x, y: wheelY, z: worldPt.z };

          // Wheel spin rotation
          const fwdVel2 = this.getForwardVelocityAtWheel(i, rot);
          wheel.rotation += (fwdVel2 / VEHICLE_CONFIG.wheelRadius) * dt;
        } else {
          this.setWheelAtMaxExtension(wheel, worldPt, rayDir);
        }
      } else {
        wheel.inContact = false;
        this.setWheelAtMaxExtension(wheel, worldPt, rayDir);
      }

      // Build wheel quaternion from chassis rotation + steering + spin
      this.updateWheelQuaternion(i, rot);
    }
  }

  getWheelTransform(index: number): {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
  } {
    const w = this.wheels[index];
    return {
      position: w.worldTransformPosition,
      quaternion: w.worldTransformQuaternion,
    };
  }

  // ---- Helpers ----

  private setWheelAtMaxExtension(
    wheel: WheelInfo,
    worldPt: { x: number; y: number; z: number },
    rayDir: { x: number; y: number; z: number },
  ): void {
    const ext = VEHICLE_CONFIG.suspensionRestLength + VEHICLE_CONFIG.maxSuspensionTravel;
    wheel.worldTransformPosition = {
      x: worldPt.x + rayDir.x * ext,
      y: worldPt.y + rayDir.y * ext,
      z: worldPt.z + rayDir.z * ext,
    };
  }

  private rotateByQuat(
    v: { x: number; y: number; z: number },
    q: { x: number; y: number; z: number; w: number },
  ): { x: number; y: number; z: number } {
    const ix = q.w * v.x + q.y * v.z - q.z * v.y;
    const iy = q.w * v.y + q.z * v.x - q.x * v.z;
    const iz = q.w * v.z + q.x * v.y - q.y * v.x;
    const iw = -q.x * v.x - q.y * v.y - q.z * v.z;

    return {
      x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
      y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
      z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
    };
  }

  private getWheelForward(
    wheelIndex: number,
    chassisRot: { x: number; y: number; z: number; w: number },
  ): { x: number; y: number; z: number } {
    const steer = this.wheels[wheelIndex].steeringAngle;
    const localFwd = {
      x: Math.sin(steer),
      y: 0,
      z: Math.cos(steer),
    };
    return this.rotateByQuat(localFwd, chassisRot);
  }

  private getWheelRight(
    wheelIndex: number,
    chassisRot: { x: number; y: number; z: number; w: number },
  ): { x: number; y: number; z: number } {
    const steer = this.wheels[wheelIndex].steeringAngle;
    const localRight = {
      x: Math.cos(steer),
      y: 0,
      z: -Math.sin(steer),
    };
    return this.rotateByQuat(localRight, chassisRot);
  }

  private getWheelVerticalVelocity(
    wheelIndex: number,
    chassisRot: { x: number; y: number; z: number; w: number },
  ): number {
    const wp = this.wheels[wheelIndex].worldTransformPosition;
    const vel = this.chassisBody.velocityAtPoint(
      new this.R.Vector3(wp.x, wp.y, wp.z),
    );
    const upDir = this.rotateByQuat({ x: 0, y: 1, z: 0 }, chassisRot);
    return vel.x * upDir.x + vel.y * upDir.y + vel.z * upDir.z;
  }

  private getForwardVelocityAtWheel(
    wheelIndex: number,
    chassisRot: { x: number; y: number; z: number; w: number },
  ): number {
    const wp = this.wheels[wheelIndex].worldTransformPosition;
    const vel = this.chassisBody.velocityAtPoint(
      new this.R.Vector3(wp.x, wp.y, wp.z),
    );
    const fwd = this.getWheelForward(wheelIndex, chassisRot);
    return vel.x * fwd.x + vel.y * fwd.y + vel.z * fwd.z;
  }

  private updateWheelQuaternion(
    wheelIndex: number,
    chassisRot: { x: number; y: number; z: number; w: number },
  ): void {
    const wheel = this.wheels[wheelIndex];
    const steer = wheel.steeringAngle;
    const spin = wheel.rotation;

    // Steer quaternion (around Y)
    const halfSteer = steer * 0.5;
    const steerQ = {
      x: 0,
      y: Math.sin(halfSteer),
      z: 0,
      w: Math.cos(halfSteer),
    };

    // Spin quaternion (around X — the axle)
    const halfSpin = spin * 0.5;
    const spinQ = {
      x: Math.sin(halfSpin),
      y: 0,
      z: 0,
      w: Math.cos(halfSpin),
    };

    // Combine: chassis * steer * spin
    const q1 = this.multiplyQuat(chassisRot, steerQ);
    const q2 = this.multiplyQuat(q1, spinQ);
    wheel.worldTransformQuaternion = q2;
  }

  private multiplyQuat(
    a: { x: number; y: number; z: number; w: number },
    b: { x: number; y: number; z: number; w: number },
  ): { x: number; y: number; z: number; w: number } {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  }
}
