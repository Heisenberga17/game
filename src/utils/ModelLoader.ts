import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * Centralized GLTF/GLB model loader with Draco decompression and caching.
 */

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({ type: 'js' });

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const cache = new Map<string, GLTF>();

/** Load a GLTF/GLB model. Results are cached by path. */
export async function loadModel(path: string): Promise<GLTF> {
  const cached = cache.get(path);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => { cache.set(path, gltf); resolve(gltf); },
      undefined,
      (error) => { console.error(`Failed to load model: ${path}`, error); reject(error); },
    );
  });
}

/** Load an FBX file (e.g. Mixamo animation). Lazily imports FBXLoader. */
export async function loadFBX(path: string): Promise<THREE.Group> {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const fbxLoader = new FBXLoader();
  return new Promise((resolve, reject) => {
    fbxLoader.load(path, resolve, undefined, reject);
  });
}

/** Enable shadow casting/receiving on all meshes in a scene graph. */
export function enableShadows(object: THREE.Object3D, cast = true, receive = true): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Downgrade PBR materials to Lambert for performance.
 * Handles material arrays, vertex colors, and invisible-black fallback.
 */
export function fixMaterials(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];

    const newMaterials = materials.map((mat) => {
      if (!mat) return mat;

      const isPBR =
        (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial ||
        (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial;
      if (!isPBR) return mat;

      const oldMat = mat as THREE.MeshStandardMaterial;
      const hasVertexColors = child.geometry?.attributes?.color !== undefined;

      let color = oldMat.color;
      if (!color || (color.r === 0 && color.g === 0 && color.b === 0 && !oldMat.map)) {
        color = new THREE.Color(0x888888);
      }

      return new THREE.MeshLambertMaterial({
        color,
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

    child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
  });
}

/** Get world-space dimensions of an object via its bounding box. */
export function getDimensions(object: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}
