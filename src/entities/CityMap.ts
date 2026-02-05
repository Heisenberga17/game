import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { WORLD_CONFIG } from '../config/world.config';
import { BuildingDef } from '../types';

/**
 * Procedural NYC-style city with:
 * - Dark asphalt ground
 * - Buildings with window textures on a Manhattan grid
 * - Setback towers on tall buildings (Art Deco style)
 * - Rooftop water towers
 * - Cornices on shorter buildings
 * - Yellow road center lines
 * - Invisible boundary walls
 */
export class CityMap {
  // Shared materials (created once, reused across all buildings)
  private readonly officeMat: THREE.MeshLambertMaterial;
  private readonly glassMat: THREE.MeshLambertMaterial;
  private readonly brownstoneMat: THREE.MeshLambertMaterial;
  private readonly corniceMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
  private readonly waterTowerMat = new THREE.MeshLambertMaterial({ color: 0x5a4030 });

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    const { mapSize, wallHeight } = WORLD_CONFIG;

    // Create window textures
    this.officeMat = new THREE.MeshLambertMaterial({
      map: this.createWindowTexture('#6a6a6a', '#ffe88a', '#2a3040'),
    });
    this.glassMat = new THREE.MeshLambertMaterial({
      map: this.createWindowTexture('#3a4555', '#88bbdd', '#253040'),
    });
    this.brownstoneMat = new THREE.MeshLambertMaterial({
      map: this.createWindowTexture('#8b6b4a', '#ffd599', '#4a3525'),
    });

    this.addGround(scene);
    const buildings = this.generateBuildings();
    this.addBuildings(scene, physicsWorld, buildings);
    this.addRoadLines(scene);
    this.addBoundaryWalls(physicsWorld, mapSize, wallHeight);
  }

  // ---- Window texture generation ----

  private createWindowTexture(
    facade: string,
    windowLit: string,
    windowDark: string,
  ): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Facade background
    ctx.fillStyle = facade;
    ctx.fillRect(0, 0, size, size);

    // Subtle horizontal line between "floors"
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, size, 1);
    ctx.fillRect(0, 32, size, 1);

    // Window grid: 4 columns × 4 rows
    const winW = 8, winH = 10;
    const gapX = 8, gapY = 6;
    const marginX = 4, marginY = 3;
    let seed = facade.charCodeAt(1) * 31 + 7;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const lit = (seed % 100) > 35;
        ctx.fillStyle = lit ? windowLit : windowDark;
        const x = marginX + col * (winW + gapX);
        const y = marginY + row * (winH + gapY);
        ctx.fillRect(x, y, winW, winH);

        // Window frame (thin border)
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, winW, winH);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
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

    const firstX = streetWidth / 2 + blockWidth / 2;
    const firstZ = streetWidth / 2 + blockDepth / 2;

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

        const tier = h % 10;
        let height: number;
        if (tier < 5) {
          height = 6 + ((h >>> 4) % 10);
        } else if (tier < 8) {
          height = 16 + ((h >>> 4) % 15);
        } else {
          height = 32 + ((h >>> 4) % 20);
        }

        const split = ((h >>> 8) % 3) === 0;

        if (split) {
          const splitW = (blockWidth - 1.5) / 2;
          const h2 = this.hash(cx + 1, cz + 1);
          const tier2 = h2 % 10;
          let height2: number;
          if (tier2 < 5) height2 = 6 + ((h2 >>> 4) % 10);
          else if (tier2 < 8) height2 = 16 + ((h2 >>> 4) % 15);
          else height2 = 32 + ((h2 >>> 4) % 20);

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

  // ---- Buildings with window textures ----

  private addBuildings(
    scene: THREE.Scene,
    physicsWorld: PhysicsWorld,
    buildings: BuildingDef[],
  ): void {
    for (const b of buildings) {
      const h = this.hash(b.x, b.z);
      const isSetback = b.height > 25 && (h % 3) === 0;

      // Pick material by height
      let mat: THREE.MeshLambertMaterial;
      if (b.height < 16) mat = this.brownstoneMat;
      else if (b.height < 32) mat = this.officeMat;
      else mat = this.glassMat;

      if (isSetback) {
        // --- Art Deco setback: wide base + narrower tower ---
        const baseH = b.height * 0.6;
        const towerH = b.height * 0.4;
        const towerW = b.width * 0.65;
        const towerD = b.depth * 0.65;

        // Base
        const baseGeo = new THREE.BoxGeometry(b.width, baseH, b.depth);
        this.scaleBoxUVs(baseGeo, b.width, baseH, b.depth, h);
        const baseMesh = new THREE.Mesh(baseGeo, mat);
        baseMesh.position.set(b.x, baseH / 2, b.z);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        scene.add(baseMesh);

        // Tower
        const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
        this.scaleBoxUVs(towerGeo, towerW, towerH, towerD, h + 99);
        const towerMesh = new THREE.Mesh(towerGeo, mat);
        towerMesh.position.set(b.x, baseH + towerH / 2, b.z);
        towerMesh.castShadow = true;
        towerMesh.receiveShadow = true;
        scene.add(towerMesh);

        // Setback ledge
        const ledgeGeo = new THREE.BoxGeometry(b.width + 0.3, 0.15, b.depth + 0.3);
        const ledge = new THREE.Mesh(ledgeGeo, this.corniceMat);
        ledge.position.set(b.x, baseH + 0.07, b.z);
        scene.add(ledge);
      } else {
        // --- Standard building ---
        const geo = new THREE.BoxGeometry(b.width, b.height, b.depth);
        this.scaleBoxUVs(geo, b.width, b.height, b.depth, h);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(b.x, b.height / 2, b.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }

      // --- Cornice on shorter buildings ---
      if (b.height < 25) {
        const corniceGeo = new THREE.BoxGeometry(b.width + 0.3, 0.2, b.depth + 0.3);
        const cornice = new THREE.Mesh(corniceGeo, this.corniceMat);
        cornice.position.set(b.x, b.height + 0.1, b.z);
        scene.add(cornice);
      }

      // --- Water tower on some tall buildings ---
      if (b.height > 20 && (h % 5) === 0) {
        const tankGeo = new THREE.CylinderGeometry(0.45, 0.5, 1.4, 8);
        const tank = new THREE.Mesh(tankGeo, this.waterTowerMat);
        const offsetX = ((h >>> 6) % 3 - 1) * (b.width * 0.2);
        const offsetZ = ((h >>> 9) % 3 - 1) * (b.depth * 0.2);
        tank.position.set(b.x + offsetX, b.height + 1.5, b.z + offsetZ);
        tank.castShadow = true;
        scene.add(tank);

        // Cone roof
        const roofGeo = new THREE.ConeGeometry(0.55, 0.4, 8);
        const roof = new THREE.Mesh(roofGeo, this.waterTowerMat);
        roof.position.set(b.x + offsetX, b.height + 2.4, b.z + offsetZ);
        scene.add(roof);

        // Support legs (4 thin boxes)
        const legGeo = new THREE.BoxGeometry(0.06, 0.8, 0.06);
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const leg = new THREE.Mesh(legGeo, this.waterTowerMat);
            leg.position.set(
              b.x + offsetX + lx * 0.25,
              b.height + 0.4,
              b.z + offsetZ + lz * 0.25,
            );
            scene.add(leg);
          }
        }
      }

      // --- Physics body (full footprint, unchanged) ---
      const halfExtents = new CANNON.Vec3(b.width / 2, b.height / 2, b.depth / 2);
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Box(halfExtents));
      body.position.set(b.x, b.height / 2, b.z);
      physicsWorld.addBody(body);
    }
  }

  // ---- UV scaling for window tiling ----

  private scaleBoxUVs(
    geo: THREE.BoxGeometry,
    w: number,
    h: number,
    d: number,
    seed: number,
  ): void {
    const tileSize = 3; // game units per texture tile
    const uv = geo.getAttribute('uv') as THREE.Float32BufferAttribute;
    const normal = geo.getAttribute('normal') as THREE.Float32BufferAttribute;

    // Random UV offset so each building has different window pattern
    const offsetU = (seed % 100) / 100;
    const offsetV = ((seed >>> 4) % 100) / 100;

    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(normal.getX(i));
      const ny = Math.abs(normal.getY(i));

      let su: number, sv: number;
      if (ny > 0.5) {
        // Top/bottom: tile by width × depth
        su = w / tileSize;
        sv = d / tileSize;
      } else if (nx > 0.5) {
        // Left/right: tile by depth × height
        su = d / tileSize;
        sv = h / tileSize;
      } else {
        // Front/back: tile by width × height
        su = w / tileSize;
        sv = h / tileSize;
      }

      uv.setXY(i, uv.getX(i) * su + offsetU, uv.getY(i) * sv + offsetV);
    }
  }

  // ---- Road center lines ----

  private addRoadLines(scene: THREE.Scene): void {
    const { streetWidth, blockWidth, blockDepth, mapSize, roadLineColor, roadLineWidth } =
      WORLD_CONFIG;
    const cellW = blockWidth + streetWidth;
    const cellD = blockDepth + streetWidth;
    const half = mapSize / 2;

    const streetCentersX: number[] = [0];
    const streetCentersZ: number[] = [0];
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

    for (const cx of streetCentersX) {
      matrix.identity();
      matrix.makeTranslation(cx, 0.01, 0);
      s.set(roadLineWidth, 1, mapSize);
      matrix.scale(s);
      linesMesh.setMatrixAt(idx++, matrix);
    }

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

    this.addWall(physicsWorld, 0, wh, -half, half, wh, wt);
    this.addWall(physicsWorld, 0, wh, half, half, wh, wt);
    this.addWall(physicsWorld, half, wh, 0, wt, wh, half);
    this.addWall(physicsWorld, -half, wh, 0, wt, wh, half);
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
