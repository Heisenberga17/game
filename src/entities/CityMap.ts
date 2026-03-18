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

      // Detect road surface via raycasting from above city center
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(0, 500, 0),
        new THREE.Vector3(0, -1, 0),
      );
      const intersects = raycaster.intersectObject(this.cityModel, true);
      if (intersects.length > 0) {
        this.floorLevel = intersects[0].point.y;
      }

      this.addTrimeshColliders();
      this.addGround();
    } catch (error) {
      console.error('Failed to load city model:', error);
    }
  }

  getFloorLevel(): number {
    return this.floorLevel;
  }

  private addTrimeshColliders(): void {
    const R = this.physicsWorld.RAPIER;
    this.cityModel!.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.geometry) return;

      child.updateWorldMatrix(true, false);
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);

      const positions = geo.getAttribute('position');
      if (!positions) { geo.dispose(); return; }

      const vertices = new Float32Array(positions.array);
      let indices: Uint32Array;
      if (geo.index) {
        indices = new Uint32Array(geo.index.array);
      } else {
        indices = new Uint32Array([...Array(vertices.length / 3).keys()]);
      }

      if (vertices.length === 0 || indices.length === 0) { geo.dispose(); return; }

      const bodyDesc = R.RigidBodyDesc.fixed();
      const body = this.physicsWorld.createRigidBody(bodyDesc);
      const colliderDesc = R.ColliderDesc.trimesh(vertices, indices)
        .setFriction(WORLD_CONFIG.groundFriction)
        .setRestitution(0.3);
      this.physicsWorld.createCollider(colliderDesc, body);

      geo.dispose();
    });
  }

  private addGround(): void {
    const R = this.physicsWorld.RAPIER;
    const groundDesc = R.RigidBodyDesc.fixed().setTranslation(0, this.floorLevel, 0);
    const groundBody = this.physicsWorld.createRigidBody(groundDesc);
    const colliderDesc = R.ColliderDesc.cuboid(500, 0.1, 500)
      .setTranslation(0, -0.1, 0)
      .setFriction(WORLD_CONFIG.groundFriction)
      .setRestitution(0.3);
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
