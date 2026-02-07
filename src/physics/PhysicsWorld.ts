import * as CANNON from 'cannon-es';
import { WORLD_CONFIG } from '../config/world.config';

/**
 * Wraps the cannon-es physics world.
 * Creates a world with configurable gravity, broadphase, and a static
 * ground plane.
 */
export class PhysicsWorld {
  public readonly world: CANNON.World;

  constructor() {
    // ---- World setup ----
    this.world = new CANNON.World();
    this.world.gravity.set(
      WORLD_CONFIG.gravity.x,
      WORLD_CONFIG.gravity.y,
      WORLD_CONFIG.gravity.z,
    );
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = WORLD_CONFIG.solverIterations;
    this.world.allowSleep = false;

    // ---- Ground plane ----
    this.createGround();
  }

  /** Advance the physics simulation by one fixed timestep (with sub-stepping). */
  step(fixedDt: number): void {
    const subSteps = WORLD_CONFIG.physicsSubSteps;
    const subDt = fixedDt / subSteps;
    for (let i = 0; i < subSteps; i++) {
      this.world.step(subDt);
    }
  }

  /** Add a rigid body to the world. */
  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  /** Remove a rigid body from the world. */
  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }

  /** Returns the underlying CANNON.World (useful for debugger integration). */
  getWorld(): CANNON.World {
    return this.world;
  }

  // ---- Internal ----

  private createGround(): void {
    const groundMaterial = new CANNON.Material({
      friction: WORLD_CONFIG.groundFriction,
      restitution: 0.3,
    });

    const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    groundBody.addShape(new CANNON.Plane());

    // Rotate so the plane faces upward (default Plane normal is +Z)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    this.world.addBody(groundBody);
  }
}
