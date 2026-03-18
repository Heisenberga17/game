import { SceneManager } from '../rendering/SceneManager';
import { RapierPhysicsWorld } from '../physics/RapierPhysicsWorld';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Car } from '../entities/Car';
import { CityMap } from '../entities/CityMap';
import { Avatar } from '../entities/Avatar';
import { CameraController, CameraMode } from '../rendering/CameraController';
import { DebugManager } from '../debug/DebugManager';
import { GameOptions } from '../ui/GameMenu';
import { AVATAR_CONFIG } from '../config/avatar.config';
import { AvaturnManager } from '../utils/AvaturnManager';

/**
 * Top-level game orchestrator.
 * Creates all sub-systems, wires them together, and owns the game loop.
 */
export class Game {
  private sceneManager!: SceneManager;
  private physicsWorld!: RapierPhysicsWorld;
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

    // Physics (async — initializes Rapier WASM)
    this.physicsWorld = await RapierPhysicsWorld.create();

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

    // Player avatar: use custom Avaturn avatar if selected, else default Zacko
    let playerBlobUrl: string | undefined;
    if (options?.avatarId) {
      const avaturnMgr = new AvaturnManager();
      const url = await avaturnMgr.getAvatarBlobURL(options.avatarId);
      if (url) playerBlobUrl = url;
    }

    // First spawn is the player avatar (index 0)
    const playerSpawn = AVATAR_CONFIG.spawns[0];
    const playerAvatar = new Avatar(this.sceneManager.scene, {
      modelPath: playerSpawn.modelPath,
      blobUrl: playerBlobUrl,
      position: { x: playerSpawn.position.x, y: floorLevel, z: playerSpawn.position.z },
      scale: playerSpawn.scale,
      rotationY: playerSpawn.rotationY,
    });
    this.avatars.push(playerAvatar);

    // Remaining spawns are NPC wanderers (always default models)
    for (let i = 1; i < AVATAR_CONFIG.spawns.length; i++) {
      const spawnDef = AVATAR_CONFIG.spawns[i];
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

    // Debug tools (stats, GUI, renderer monitors)
    this.debugManager = new DebugManager(this.sceneManager.renderer);

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

    // Update vehicle raycast forces before stepping
    this.car.updateVehicle(fixedDt);

    this.physicsWorld.step(fixedDt);
    this.car.clampVelocity();
  }

  /** Runs once per display frame. Syncs visuals, updates camera, renders. */
  private frameUpdate(dt: number, alpha: number): void {
    this.debugManager.beginFrame();

    // Camera mode switching
    // "1" cycles: car -> behind avatar -> front of avatar
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
    this.sceneManager.render();

    this.debugManager.endFrame();

    // Clear one-shot key triggers
    this.inputManager.clearJustPressed();
  }
}
