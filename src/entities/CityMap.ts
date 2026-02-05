import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { WORLD_CONFIG } from '../config/world.config';
import { BuildingDef } from '../types';

/**
 * Procedural NYC-style city grid with:
 * - Dark asphalt ground
 * - Buildings on a Manhattan-like block grid (InstancedMesh, 1 draw call)
 * - Yellow road center lines
 * - Invisible boundary walls
 */
export class CityMap {
  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    const { mapSize, wallHeight } = WORLD_CONFIG;

    this.addGround(scene);
    const buildings = this.generateBuildings();
    this.addBuildings(scene, physicsWorld, buildings);
    this.addRoadLines(scene);
    this.addBoundaryWalls(physicsWorld, mapSize, wallHeight);
  }

  // ---- Ground ----

  private addGround(scene: THREE.Scene): void {
    const { mapSize, groundColor } = WORLD_CONFIG;
    const groundGeo = new THREE.PlaneGeometry(mapSize, mapSize);
    const groundMat = new THREE.MeshLambertMaterial({ color: groundColor });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
  }

  // ---- Procedural NYC grid ----

  private generateBuildings(): BuildingDef[] {
    const { streetWidth, blockWidth, blockDepth, mapSize } = WORLD_CONFIG;
    const cellW = blockWidth + streetWidth;
    const cellD = blockDepth + streetWidth;
    const half = mapSize / 2;

    // First block center offset from origin (street crosses at 0)
    const firstX = streetWidth / 2 + blockWidth / 2;
    const firstZ = streetWidth / 2 + blockDepth / 2;

    // Collect all block center positions
    const centersX: number[] = [];
    for (let cx = firstX; cx + blockWidth / 2 < half; cx += cellW) {
      centersX.push(cx);
      centersX.push(-cx);
    }

    const centersZ: number[] = [];
    for (let cz = firstZ; cz + blockDepth / 2 < half; cz += cellD) {
      centersZ.push(cz);
      centersZ.push(-cz);
    }

    const buildings: BuildingDef[] = [];

    for (const cx of centersX) {
      for (const cz of centersZ) {
        const h = this.hash(cx, cz);

        // Height tiers: 50% low, 30% medium, 20% tall
        const tier = h % 10;
        let height: number;
        if (tier < 5) {
          height = 6 + ((h >>> 4) % 10);       // 6–15
        } else if (tier < 8) {
          height = 16 + ((h >>> 4) % 15);       // 16–30
        } else {
          height = 32 + ((h >>> 4) % 20);       // 32–51
        }

        // Some blocks get 2 buildings (split along X), rest get 1
        const split = ((h >>> 8) % 3) === 0;

        if (split) {
          const splitW = (blockWidth - 1.5) / 2;
          const h2 = this.hash(cx + 1, cz + 1);
          const height2Tier = h2 % 10;
          let height2: number;
          if (height2Tier < 5) {
            height2 = 6 + ((h2 >>> 4) % 10);
          } else if (height2Tier < 8) {
            height2 = 16 + ((h2 >>> 4) % 15);
          } else {
            height2 = 32 + ((h2 >>> 4) % 20);
          }

          buildings.push({
            x: cx - (splitW / 2 + 0.4),
            z: cz,
            width: splitW,
            height,
            depth: blockDepth - 1,
          });
          buildings.push({
            x: cx + (splitW / 2 + 0.4),
            z: cz,
            width: splitW,
            height: height2,
            depth: blockDepth - 1,
          });
        } else {
          buildings.push({
            x: cx,
            z: cz,
            width: blockWidth - 1,
            height,
            depth: blockDepth - 1,
          });
        }
      }
    }

    return buildings;
  }

  // ---- Buildings ----

  private addBuildings(
    scene: THREE.Scene,
    physicsWorld: PhysicsWorld,
    buildings: BuildingDef[],
  ): void {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const instancedMesh = new THREE.InstancedMesh(boxGeo, boxMat, buildings.length);

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const scale = new THREE.Vector3();

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];

      matrix.identity();
      matrix.makeTranslation(b.x, b.height / 2, b.z);
      scale.set(b.width, b.height, b.depth);
      matrix.scale(scale);
      instancedMesh.setMatrixAt(i, matrix);

      // NYC building color palette
      const h = this.hash(b.x, b.z);
      const variation = ((h >>> 12) % 100) / 1000; // 0–0.1
      const palette = (h >>> 16) % 5;

      switch (palette) {
        case 0: // Concrete
          color.setRGB(0.6 + variation, 0.6 + variation, 0.62 + variation);
          break;
        case 1: // Blue-gray glass
          color.setRGB(0.45 + variation, 0.52 + variation, 0.62 + variation);
          break;
        case 2: // Brownstone
          color.setRGB(0.55 + variation, 0.36 + variation, 0.26 + variation);
          break;
        case 3: // Beige / cream
          color.setRGB(0.72 + variation, 0.66 + variation, 0.52 + variation);
          break;
        case 4: // Dark steel
          color.setRGB(0.38 + variation, 0.40 + variation, 0.44 + variation);
          break;
      }

      instancedMesh.setColorAt(i, color);

      // Static physics body
      const halfExtents = new CANNON.Vec3(b.width / 2, b.height / 2, b.depth / 2);
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Box(halfExtents));
      body.position.set(b.x, b.height / 2, b.z);
      physicsWorld.addBody(body);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor!.needsUpdate = true;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    scene.add(instancedMesh);
  }

  // ---- Road center lines ----

  private addRoadLines(scene: THREE.Scene): void {
    const { streetWidth, blockWidth, blockDepth, mapSize, roadLineColor, roadLineWidth } =
      WORLD_CONFIG;
    const cellW = blockWidth + streetWidth;
    const cellD = blockDepth + streetWidth;
    const half = mapSize / 2;

    // Collect street center positions
    const streetCentersX: number[] = [0]; // central avenue
    const streetCentersZ: number[] = [0]; // central street
    for (let v = cellW; v < half; v += cellW) {
      streetCentersX.push(v);
      streetCentersX.push(-v);
    }
    for (let v = cellD; v < half; v += cellD) {
      streetCentersZ.push(v);
      streetCentersZ.push(-v);
    }

    const totalLines = streetCentersX.length + streetCentersZ.length;
    const lineGeo = new THREE.BoxGeometry(1, 0.02, 1);
    const lineMat = new THREE.MeshLambertMaterial({ color: roadLineColor });
    const linesMesh = new THREE.InstancedMesh(lineGeo, lineMat, totalLines);

    const matrix = new THREE.Matrix4();
    const s = new THREE.Vector3();
    let idx = 0;

    // N-S lines (along Z)
    for (const cx of streetCentersX) {
      matrix.identity();
      matrix.makeTranslation(cx, 0.01, 0);
      s.set(roadLineWidth, 1, mapSize);
      matrix.scale(s);
      linesMesh.setMatrixAt(idx++, matrix);
    }

    // E-W lines (along X)
    for (const cz of streetCentersZ) {
      matrix.identity();
      matrix.makeTranslation(0, 0.01, cz);
      s.set(mapSize, 1, roadLineWidth);
      matrix.scale(s);
      linesMesh.setMatrixAt(idx++, matrix);
    }

    linesMesh.instanceMatrix.needsUpdate = true;
    scene.add(linesMesh);
  }

  // ---- Boundary walls ----

  private addBoundaryWalls(
    physicsWorld: PhysicsWorld,
    mapSize: number,
    wallHeight: number,
  ): void {
    const { wallThickness } = WORLD_CONFIG;
    const half = mapSize / 2;
    const wh = wallHeight / 2;
    const wt = wallThickness / 2;

    this.addWall(physicsWorld, 0, wh, -half, half, wh, wt);  // North
    this.addWall(physicsWorld, 0, wh, half, half, wh, wt);   // South
    this.addWall(physicsWorld, half, wh, 0, wt, wh, half);   // East
    this.addWall(physicsWorld, -half, wh, 0, wt, wh, half);  // West
  }

  private addWall(
    physicsWorld: PhysicsWorld,
    px: number, py: number, pz: number,
    hx: number, hy: number, hz: number,
  ): void {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
    body.position.set(px, py, pz);
    physicsWorld.addBody(body);
  }

  // ---- Deterministic hash ----

  private hash(x: number, z: number): number {
    const ix = (x * 10) | 0;
    const iz = (z * 10) | 0;
    let h = (ix * 374761393 + iz * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
}
