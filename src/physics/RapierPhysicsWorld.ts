import type RAPIER_TYPE from '@dimforge/rapier3d';
import { WORLD_CONFIG } from '../config/world.config';

/**
 * Rapier3D WASM physics world.
 * Use the async factory `RapierPhysicsWorld.create()` — WASM must load before use.
 */
export class RapierPhysicsWorld {
  public readonly world: RAPIER_TYPE.World;
  public readonly RAPIER: typeof RAPIER_TYPE;

  private constructor(rapier: typeof RAPIER_TYPE) {
    this.RAPIER = rapier;

    const gravity = new rapier.Vector3(
      WORLD_CONFIG.gravity.x,
      WORLD_CONFIG.gravity.y,
      WORLD_CONFIG.gravity.z,
    );
    this.world = new rapier.World(gravity);
    this.world.numSolverIterations = WORLD_CONFIG.solverIterations;
  }

  /** Async factory — loads Rapier WASM, then constructs the world. */
  static async create(): Promise<RapierPhysicsWorld> {
    const rapier = await import('@dimforge/rapier3d');
    return new RapierPhysicsWorld(rapier as typeof RAPIER_TYPE);
  }

  /** Advance physics by one frame (sub-stepped per config). */
  step(_fixedDt: number): void {
    const subSteps = WORLD_CONFIG.physicsSubSteps;
    for (let i = 0; i < subSteps; i++) {
      this.world.step();
    }
  }

  createRigidBody(desc: RAPIER_TYPE.RigidBodyDesc): RAPIER_TYPE.RigidBody {
    return this.world.createRigidBody(desc);
  }

  createCollider(desc: RAPIER_TYPE.ColliderDesc, body: RAPIER_TYPE.RigidBody): RAPIER_TYPE.Collider {
    return this.world.createCollider(desc, body);
  }

  removeRigidBody(body: RAPIER_TYPE.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  getWorld(): RAPIER_TYPE.World {
    return this.world;
  }

}
