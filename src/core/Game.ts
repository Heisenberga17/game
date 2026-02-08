import { SceneManager } from '../rendering/SceneManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Car } from '../entities/Car';
import { CityMap } from '../entities/CityMap';
import { Avatar } from '../entities/Avatar';
import { CameraController, CameraMode } from '../rendering/CameraController';
import { DebugManager } from '../debug/DebugManager';
import { GameOptions } from '../ui/GameMenu';
import { AVATAR_CONFIG } from '../config/avatar.config';

/**
 * Top-level game orchestrator.
 * Creates all sub-systems, wires them together, and owns the game loop.
 */
export class Game {
  private sceneManager!: SceneManager;
  private physicsWorld!: PhysicsWorld;
  private inputManager!: InputManager;
  private car!: Car;
  private cityMap!: CityMap;
  private avatars: Avatar[] = [];
  private controllingAvatar = false;
  private cameraController!: CameraController;
  private gameLoop!: GameLoop;
  private debugManager!: DebugManager;

  /** Initialize all systems. Call once before start(). */
  async init(options?: GameOptions): Promise<void> {
    // Rendering
    this.sceneManager = new SceneManager();

    // Physics
    this.physicsWorld = new PhysicsWorld();

    // Input
    this.inputManager = new InputManager();

    // World geometry (ground, buildings, walls)
    this.cityMap = new CityMap(this.sceneManager.scene, this.physicsWorld);

    // Player vehicle - now async to load GLTF
    this.car = new Car(this.sceneManager.scene, this.physicsWorld);

    // Load city and vehicle in parallel
    await Promise.all([
      this.cityMap.loadCity(),
      this.car.loadModel(options?.vehicle ?? 'taxi'),
    ]);

    // Create avatars at city floor level
    const floorLevel = this.cityMap.getFloorLevel();
    for (const spawnDef of AVATAR_CONFIG.spawns) {
      const avatar = new Avatar(this.sceneManager.scene, {
        modelPath: spawnDef.modelPath,
        position: { x: spawnDef.position.x, y: floorLevel, z: spawnDef.position.z },
        scale: spawnDef.scale,
        rotationY: spawnDef.rotationY,
      });
      this.avatars.push(avatar);
    }

    // Load all avatars in parallel
    await Promise.all(this.avatars.map(a => a.load()));

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
    // Only handle car input when not controlling avatar
    if (!this.controllingAvatar) {
      this.car.handleInput(this.inputManager);
    }
    this.physicsWorld.step(fixedDt);
    this.car.clampVelocity();
  }

  /** Runs once per display frame. Syncs visuals, updates camera, renders. */
  private frameUpdate(dt: number, alpha: number): void {
    this.debugManager.beginFrame();

    // Camera mode switching
    // "1" cycles: car → behind avatar → front of avatar
    // "2" returns to car
    if (this.inputManager.isToggleAvatarCamera() && this.avatars.length > 0) {
      const currentMode = this.cameraController.getMode();
      if (!this.controllingAvatar) {
        // Switch to avatar (behind view)
        this.controllingAvatar = true;
        this.avatars[0].setPlayerControlled(true);
        this.cameraController.setTarget(this.avatars[0], CameraMode.THIRD_PERSON);
      } else if (currentMode === CameraMode.THIRD_PERSON) {
        // Toggle to front view
        this.cameraController.setTarget(this.avatars[0], CameraMode.FRONT_FACING);
      } else {
        // Toggle back to behind view
        this.cameraController.setTarget(this.avatars[0], CameraMode.THIRD_PERSON);
      }
    }
    if (this.inputManager.isToggleCarCamera()) {
      this.controllingAvatar = false;
      if (this.avatars.length > 0) {
        this.avatars[0].setPlayerControlled(false);
      }
      this.cameraController.setTarget(this.car, CameraMode.CHASE);
    }

    // Update car visuals
    this.car.syncMeshes(alpha);

    // Update avatars (pass input to the controlled one)
    for (const avatar of this.avatars) {
      avatar.update(dt, this.controllingAvatar ? this.inputManager : undefined);
    }

    this.cameraController.update(dt);
    this.debugManager.update();
    this.sceneManager.render();

    this.debugManager.endFrame();

    // Clear one-shot key triggers
    this.inputManager.clearJustPressed();
  }
}
