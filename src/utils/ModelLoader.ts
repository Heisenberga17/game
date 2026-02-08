import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * Utility for loading GLTF/GLB models.
 * Provides async loading with caching and error handling.
 */

const loader = new GLTFLoader();
const cache = new Map<string, GLTF>();

/**
 * Load a GLTF/GLB model from the given path.
 * Results are cached for subsequent loads.
 */
export async function loadModel(path: string): Promise<GLTF> {
  // Check cache first
  const cached = cache.get(path);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        cache.set(path, gltf);
        resolve(gltf);
      },
      undefined,
      (error) => {
        console.error(`Failed to load model: ${path}`, error);
        reject(error);
      },
    );
  });
}

/**
 * Extract a named mesh or group from a loaded GLTF scene.
 */
export function findMeshByName(
  gltf: GLTF,
  name: string,
): THREE.Object3D | undefined {
  let result: THREE.Object3D | undefined;
  gltf.scene.traverse((child) => {
    if (child.name === name) {
      result = child;
    }
  });
  return result;
}

/**
 * Extract all meshes matching a name pattern (e.g., "wheel" matches "wheel_FL", "wheel_FR").
 */
export function findMeshesByPattern(
  gltf: GLTF,
  pattern: string,
): THREE.Object3D[] {
  const results: THREE.Object3D[] = [];
  const lowerPattern = pattern.toLowerCase();
  gltf.scene.traverse((child) => {
    if (child.name.toLowerCase().includes(lowerPattern)) {
      results.push(child);
    }
  });
  return results;
}

/**
 * Clone a GLTF scene for reuse (e.g., multiple vehicles).
 */
export function cloneGltfScene(gltf: GLTF): THREE.Group {
  return gltf.scene.clone();
}

/**
 * Enable shadows on all meshes in a scene.
 */
export function enableShadows(
  object: THREE.Object3D,
  cast = true,
  receive = true,
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Fix materials for visibility without environment maps.
 * Converts PBR materials to Lambert. Handles arrays and edge cases.
 */
export function fixMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    // Handle both single material and material arrays
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    const newMaterials = materials.map((mat) => {
      if (!mat) return mat;

      // Check for PBR materials (Standard or Physical)
      const isPBR =
        (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial ||
        (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial;

      if (!isPBR) return mat; // Keep non-PBR materials as-is

      const oldMat = mat as THREE.MeshStandardMaterial;

      // Check for vertex colors
      const hasVertexColors = child.geometry?.attributes?.color !== undefined;

      // Get color, default to gray if black/missing (prevents invisible geometry)
      let color = oldMat.color;
      if (!color || (color.r === 0 && color.g === 0 && color.b === 0 && !oldMat.map)) {
        color = new THREE.Color(0x888888);
      }

      return new THREE.MeshLambertMaterial({
        color: color,
        map: oldMat.map,
        emissive: oldMat.emissive,
        emissiveMap: oldMat.emissiveMap,
        emissiveIntensity: oldMat.emissiveIntensity,
        vertexColors: hasVertexColors,
        transparent: oldMat.transparent,
        opacity: oldMat.opacity,
        side: oldMat.side,
        alphaMap: oldMat.alphaMap,
      });
    });

    // Restore original format (array or single)
    child.material = Array.isArray(child.material)
      ? newMaterials
      : newMaterials[0];
  });
}

/**
 * Clone a GLTF scene that contains skinned meshes.
 * Uses SkeletonUtils.clone to properly handle skeleton bindings.
 */
export function cloneSkinnedScene(scene: THREE.Object3D): THREE.Object3D {
  return SkeletonUtils.clone(scene);
}

/**
 * Load an FBX file (e.g. Mixamo animation).
 */
export async function loadFBX(path: string): Promise<THREE.Group> {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const fbxLoader = new FBXLoader();
  return new Promise((resolve, reject) => {
    fbxLoader.load(path, resolve, undefined, reject);
  });
}

/**
 * Get bounding box of an object (useful for physics body sizing).
 */
export function getBoundingBox(object: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(object);
}

/**
 * Get dimensions from bounding box.
 */
export function getDimensions(object: THREE.Object3D): THREE.Vector3 {
  const box = getBoundingBox(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}
