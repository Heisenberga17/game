import { SceneManager } from '../rendering/SceneManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Car } from '../entities/Car';
import { CityMap } from '../entities/CityMap';
import { CameraController } from '../rendering/CameraController';
import { DebugManager } from '../debug/DebugManager';

/**
 * Top-level game orchestrator.
 * Creates all sub-systems, wires them together, and owns the game loop.
 */
export class Game {
  private sceneManager!: SceneManager;
  private physicsWorld!: PhysicsWorld;
  private inputManager!: InputManager;
  private car!: Car;
  private cameraController!: CameraController;
  private gameLoop!: GameLoop;
  private debugManager!: DebugManager;

  /** Initialize all systems. Call once before start(). */
  init(): void {
    // Rendering
    this.sceneManager = new SceneManager();

    // Physics
    this.physicsWorld = new PhysicsWorld();

    // Input
    this.inputManager = new InputManager();

    // World geometry (ground, buildings, walls) — registers itself in scene/physics
    new CityMap(this.sceneManager.scene, this.physicsWorld);

    // Player vehicle
    this.car = new Car(this.sceneManager.scene, this.physicsWorld);

    // Camera
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.car,
    );

    // Debug tools (stats, GUI, physics wireframes)
    this.debugManager = new DebugManager(
      this.sceneManager.scene,
      this.physicsWorld.getWorld(),
    );

    // Game loop with fixed-timestep physics and variable-rate rendering
    this.gameLoop = new GameLoop(
      this.fixedUpdate.bind(this),
      this.frameUpdate.bind(this),
    );
  }

  /** Start the game loop. */
  start(): void {
    this.gameLoop.start();
  }

  // ---- Loop callbacks ----

  /** Runs at a fixed rate (60 Hz). Handles input and steps physics. */
  private fixedUpdate(fixedDt: number): void {
    this.car.handleInput(this.inputManager);
    this.physicsWorld.step(fixedDt);
    this.car.clampVelocity();
  }

  /** Runs once per display frame. Syncs visuals, updates camera, renders. */
  private frameUpdate(dt: number, alpha: number): void {
    this.debugManager.beginFrame();

    this.car.syncMeshes(alpha);
    this.cameraController.update(dt);
    this.debugManager.update();
    this.sceneManager.render();

    this.debugManager.endFrame();
  }
}
