import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager } from '../core/InputManager';
import { VEHICLE_CONFIG } from '../config/vehicle.config';
import { syncBodyToMesh, syncWheelToMesh } from '../utils/syncBodyToMesh';
import { lerp } from '../utils/math';
import { ICameraTarget } from '../types';

/**
 * Player-controlled car entity.
 * Owns the physics vehicle, taxi-shaped chassis group, and four wheel meshes.
 * Implements ICameraTarget so the camera can follow it.
 */
export class Car implements ICameraTarget {
  public readonly vehiclePhysics: VehiclePhysics;
  public readonly chassisMesh: THREE.Group;
  public readonly wheelMeshes: THREE.Mesh[] = [];

  // Smooth steering state
  private currentSteer = 0;

  // Pre-allocated vectors updated every frame from the chassis mesh.
  private readonly _position = new THREE.Vector3();
  private readonly _quaternion = new THREE.Quaternion();

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    // --- Physics ---
    this.vehiclePhysics = new VehiclePhysics(physicsWorld.getWorld());

    // --- Taxi body ---
    this.chassisMesh = this.buildTaxiBody();
    scene.add(this.chassisMesh);

    // --- Wheel visuals ---
    const { wheelRadius, wheelWidth, wheelSegments } = VEHICLE_CONFIG;
    const wheelGeo = new THREE.CylinderGeometry(
      wheelRadius,
      wheelRadius,
      wheelWidth,
      wheelSegments,
    );
    // Rotate geometry so the cylinder aligns with the axle (X axis)
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(wheelGeo, wheelMat);
      mesh.castShadow = true;
      scene.add(mesh);
      this.wheelMeshes.push(mesh);
    }
  }

  // --- Taxi body construction ---

  private buildTaxiBody(): THREE.Group {
    const group = new THREE.Group();

    // Materials
    const taxiYellow = new THREE.MeshLambertMaterial({ color: 0xf2c12e });
    const darkGlass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const chrome = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const headlightMat = new THREE.MeshLambertMaterial({
      color: 0xfffacd,
      emissive: 0x333322,
    });
    const taillightMat = new THREE.MeshLambertMaterial({
      color: 0xcc0000,
      emissive: 0x440000,
    });
    const signMat = new THREE.MeshLambertMaterial({
      color: 0xffffdd,
      emissive: 0x444422,
    });

    // --- Main body (extruded side profile) ---
    // Shape x = car's Z (forward), shape y = car's Y (up)
    const shape = new THREE.Shape();
    shape.moveTo(-2.0, -0.35);   // rear-bottom
    shape.lineTo(2.0, -0.35);    // front-bottom
    shape.lineTo(2.0, 0.0);      // front face
    shape.lineTo(1.6, 0.1);      // hood angle
    shape.lineTo(0.7, 0.1);      // hood end
    shape.lineTo(0.25, 0.45);    // windshield
    shape.lineTo(0.15, 0.47);    // roof front edge
    shape.lineTo(-0.7, 0.47);    // roof rear edge
    shape.lineTo(-1.2, 0.1);     // rear window
    shape.lineTo(-1.65, 0.08);   // trunk
    shape.lineTo(-2.0, -0.1);    // rear face
    shape.lineTo(-2.0, -0.35);   // close

    const bodyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.8,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });

    // Extrusion goes along local Z → rotate so Z becomes X (car width)
    bodyGeo.rotateY(-Math.PI / 2);
    // Center width: extrusion was 0..1.8 in Z, after rotation it's in -X
    bodyGeo.translate(0.9, 0, 0);

    const body = new THREE.Mesh(bodyGeo, taxiYellow);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // --- Taxi sign on roof ---
    const signGeo = new THREE.BoxGeometry(0.3, 0.12, 0.45);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 0.53, -0.15);
    group.add(sign);

    // --- Front windshield (angled glass) ---
    // Windshield goes from (z=0.7, y=0.1) to (z=0.25, y=0.45)
    const wsWidth = 1.5;
    const wsHeight = Math.sqrt(0.45 ** 2 + 0.35 ** 2); // diagonal length
    const wsAngle = Math.atan2(0.35, 0.45); // angle from vertical
    const wsGeo = new THREE.BoxGeometry(wsWidth, wsHeight, 0.05);
    const windshield = new THREE.Mesh(wsGeo, darkGlass);
    windshield.position.set(0, 0.275, 0.475);
    windshield.rotation.x = wsAngle;
    group.add(windshield);

    // --- Rear window (angled glass) ---
    // Rear window goes from (z=-0.7, y=0.47) to (z=-1.2, y=0.1)
    const rwHeight = Math.sqrt(0.37 ** 2 + 0.5 ** 2);
    const rwAngle = Math.atan2(0.5, 0.37); // angle from vertical
    const rwGeo = new THREE.BoxGeometry(1.4, rwHeight, 0.05);
    const rearWindow = new THREE.Mesh(rwGeo, darkGlass);
    rearWindow.position.set(0, 0.285, -0.95);
    rearWindow.rotation.x = -rwAngle;
    group.add(rearWindow);

    // --- Side windows (left and right) ---
    const sideWinGeo = new THREE.BoxGeometry(0.05, 0.28, 0.75);
    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(sideWinGeo, darkGlass);
      sideWin.position.set(side * 0.92, 0.32, -0.15);
      group.add(sideWin);
    }

    // --- Front bumper ---
    const bumperGeo = new THREE.BoxGeometry(1.8, 0.12, 0.12);
    const frontBumper = new THREE.Mesh(bumperGeo, chrome);
    frontBumper.position.set(0, -0.38, 2.05);
    group.add(frontBumper);

    // --- Rear bumper ---
    const rearBumper = new THREE.Mesh(bumperGeo, chrome);
    rearBumper.position.set(0, -0.38, -2.05);
    group.add(rearBumper);

    // --- Headlights ---
    const headlightGeo = new THREE.BoxGeometry(0.25, 0.12, 0.06);
    for (const side of [-1, 1]) {
      const headlight = new THREE.Mesh(headlightGeo, headlightMat);
      headlight.position.set(side * 0.7, -0.15, 2.01);
      group.add(headlight);
    }

    // --- Taillights ---
    const taillightGeo = new THREE.BoxGeometry(0.22, 0.1, 0.06);
    for (const side of [-1, 1]) {
      const taillight = new THREE.Mesh(taillightGeo, taillightMat);
      taillight.position.set(side * 0.7, -0.15, -2.01);
      group.add(taillight);
    }

    return group;
  }

  // --- Input handling (called during fixed update) ---

  handleInput(input: InputManager): void {
    const {
      maxSteerVal,
      maxForce,
      reverseForceRatio,
      brakeForce,
      steerSpeed,
      steerReturnSpeed,
    } = VEHICLE_CONFIG;

    // Steering target: positive = left, negative = right
    let targetSteer = 0;
    if (input.isLeft()) targetSteer = maxSteerVal;
    else if (input.isRight()) targetSteer = -maxSteerVal;

    // Smooth interpolation (called at fixed 60Hz)
    const rate = targetSteer === 0 ? steerReturnSpeed : steerSpeed;
    this.currentSteer = lerp(this.currentSteer, targetSteer, rate);

    // Engine: negative force = forward in cannon-es convention
    let force = 0;
    if (input.isForward()) force = -maxForce;
    else if (input.isBackward()) force = maxForce * reverseForceRatio;

    // Brake
    const brake = input.isBrake() ? brakeForce : 0;

    this.vehiclePhysics.applyEngineForce(force);
    this.vehiclePhysics.setSteering(this.currentSteer);
    this.vehiclePhysics.setBrake(brake);
  }

  // --- Visual sync (called during frame update) ---

  syncMeshes(_alpha: number): void {
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
    return this.vehiclePhysics.getSpeed();
  }
}
