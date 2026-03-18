import * as THREE from 'three';
import { RapierPhysicsWorld } from '../physics/RapierPhysicsWorld';
import { WORLD_CONFIG } from '../config/world.config';
import { loadModel, fixMaterials } from '../utils/ModelLoader';

/**
 * Loads and positions the Sketchfab city GLB model.
 * Creates physics colliders for ground and boundary walls.
 */
export class CityMap {
  private cityModel: THREE.Group | null = null;
  private floorLevel = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly physicsWorld: RapierPhysicsWorld,
  ) {
    this.addBoundaryWalls();
  }

  async loadCity(): Promise<void> {
    try {
      const gltf = await loadModel('/models/city/low_poly_city_game-ready.glb');
      this.cityModel = gltf.scene;

      fixMaterials(this.cityModel);

      // Scale city to fit map bounds
      const box = new THREE.Box3().setFromObject(this.cityModel);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetSize = WORLD_CONFIG.mapSize * 0.8;
      const scale = targetSize / Math.max(size.x, size.z);
      this.cityModel.scale.setScalar(scale);

      // Center at world origin
      box.setFromObject(this.cityModel);
      const center = new THREE.Vector3();
      box.getCenter(center);
      this.cityModel.position.sub(center);

      // Place on ground plane (y=0)
      box.setFromObject(this.cityModel);
      this.cityModel.position.y -= box.min.y;

      // Ensure bounding spheres exist for frustum culling
      this.cityModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.computeBoundingSphere();
        }
      });

      this.scene.add(this.cityModel);

      // Detect drivable floor level from large flat meshes
      this.cityModel.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          const meshBox = new THREE.Box3().setFromObject(c);
          const meshSize = new THREE.Vector3();
          meshBox.getSize(meshSize);
          if (meshSize.y < 5 && (meshSize.x > 50 || meshSize.z > 50)) {
            this.floorLevel = Math.max(this.floorLevel, meshBox.max.y);
          }
        }
      });

      this.addGround();
    } catch (error) {
      console.error('Failed to load city model:', error);
    }
  }

  getFloorLevel(): number {
    return this.floorLevel;
  }

  private addGround(): void {
    const R = this.physicsWorld.RAPIER;
    const groundDesc = R.RigidBodyDesc.fixed().setTranslation(0, this.floorLevel, 0);
    const groundBody = this.physicsWorld.createRigidBody(groundDesc);
    const colliderDesc = R.ColliderDesc.cuboid(500, 0.1, 500).setTranslation(0, -0.1, 0);
    this.physicsWorld.createCollider(colliderDesc, groundBody);
  }

  private addBoundaryWalls(): void {
    const { mapSize, wallHeight, wallThickness } = WORLD_CONFIG;
    const half = mapSize / 2;
    const wh = wallHeight / 2;
    const wt = wallThickness / 2;

    this.addWall(0, wh, -half, half, wh, wt);  // North
    this.addWall(0, wh, half, half, wh, wt);   // South
    this.addWall(half, wh, 0, wt, wh, half);   // East
    this.addWall(-half, wh, 0, wt, wh, half);  // West
  }

  private addWall(px: number, py: number, pz: number, hx: number, hy: number, hz: number): void {
    const R = this.physicsWorld.RAPIER;
    const bodyDesc = R.RigidBodyDesc.fixed().setTranslation(px, py, pz);
    const body = this.physicsWorld.createRigidBody(bodyDesc);
    this.physicsWorld.createCollider(R.ColliderDesc.cuboid(hx, hy, hz), body);
  }
}
