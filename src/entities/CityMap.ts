import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { WORLD_CONFIG } from '../config/world.config';
import { loadModel, fixMaterials } from '../utils/ModelLoader';

/**
 * City map loaded from Sketchfab GLB model.
 * Provides ground plane, boundary walls, and visual city geometry.
 */
export class CityMap {
  private cityModel: THREE.Group | null = null;
  private floorLevel = 0;  // Will be set after city loads

  constructor(
    private readonly scene: THREE.Scene,
    private readonly physicsWorld: PhysicsWorld,
  ) {
    // Ground added after city loads to match floor level
    this.addBoundaryWalls();
  }

  /**
   * Load the city model asynchronously.
   * Call this after construction to load the visual city.
   */
  async loadCity(): Promise<void> {
    try {
      console.log('Loading city model...');
      const gltf = await loadModel('/models/city/low_poly_city_game-ready.glb');
      this.cityModel = gltf.scene;  // Use directly, don't clone

      // Count meshes for debug
      let meshCount = 0;
      this.cityModel.traverse((c) => { if (c instanceof THREE.Mesh) meshCount++; });
      console.log('City model loaded, meshes:', meshCount);

      // Fix materials for visibility (converts PBR to Lambert as fallback)
      fixMaterials(this.cityModel);
      console.log('Materials fixed');

      // Get model bounds before scaling
      const box = new THREE.Box3().setFromObject(this.cityModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      const originalCenter = new THREE.Vector3();
      box.getCenter(originalCenter);
      console.log('Original size:', size, 'center:', originalCenter);

      // Scale the city to fit our map size
      const targetSize = WORLD_CONFIG.mapSize * 0.8;
      const scale = targetSize / Math.max(size.x, size.z);
      this.cityModel.scale.setScalar(scale);
      console.log('Scale applied:', scale);

      // Recalculate bounds AFTER scaling
      box.setFromObject(this.cityModel);
      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log('Scaled bounds - min:', box.min, 'max:', box.max, 'center:', center);

      // Move model so its center is at world origin
      this.cityModel.position.sub(center);

      // Recalculate bounds after repositioning and put on ground (y=0)
      box.setFromObject(this.cityModel);
      console.log('After centering - min:', box.min, 'max:', box.max);
      this.cityModel.position.y -= box.min.y;
      console.log('City final position:', this.cityModel.position);

      this.scene.add(this.cityModel);

      // Recalculate final bounds
      box.setFromObject(this.cityModel);
      console.log('Final city bounds - min:', box.min, 'max:', box.max);

      // Find floor level by detecting large flat meshes (the drivable streets)
      this.cityModel.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          const meshBox = new THREE.Box3().setFromObject(c);
          const meshSize = new THREE.Vector3();
          meshBox.getSize(meshSize);
          // Large flat mesh = floor/street
          if (meshSize.y < 5 && (meshSize.x > 50 || meshSize.z > 50)) {
            this.floorLevel = Math.max(this.floorLevel, meshBox.max.y);
          }
        }
      });
      console.log('City floor level detected:', this.floorLevel);

      // Add physics ground at the street level
      this.addGround();

      console.log('City added to scene successfully');
    } catch (error) {
      console.error('Failed to load city model:', error);
      // Fallback: just use the ground plane (already added)
    }
  }

  private addGround(): void {
    // Physics ground at detected city floor level
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.y = this.floorLevel;
    this.physicsWorld.addBody(groundBody);
    console.log('Physics ground at Y:', this.floorLevel);
  }

  /** Get the floor level for spawning vehicles */
  getFloorLevel(): number {
    return this.floorLevel;
  }

  private addBoundaryWalls(): void {
    const { mapSize, wallHeight, wallThickness } = WORLD_CONFIG;
    const half = mapSize / 2;
    const wh = wallHeight / 2;
    const wt = wallThickness / 2;

    // North wall
    this.addWall(0, wh, -half, half, wh, wt);
    // South wall
    this.addWall(0, wh, half, half, wh, wt);
    // East wall
    this.addWall(half, wh, 0, wt, wh, half);
    // West wall
    this.addWall(-half, wh, 0, wt, wh, half);
  }

  private addWall(
    px: number, py: number, pz: number,
    hx: number, hy: number, hz: number,
  ): void {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
    body.position.set(px, py, pz);
    this.physicsWorld.addBody(body);
  }
}
