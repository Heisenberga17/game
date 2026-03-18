import * as THREE from 'three';

// Pre-allocated to avoid GC pressure every frame.
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/** Sync a Rapier rigid body's transform onto a Three.js object. */
export function syncRigidBodyToMesh(
  body: { translation(): { x: number; y: number; z: number }; rotation(): { x: number; y: number; z: number; w: number } },
  mesh: THREE.Object3D,
): void {
  const p = body.translation();
  const q = body.rotation();
  _pos.set(p.x, p.y, p.z);
  _quat.set(q.x, q.y, q.z, q.w);
  mesh.position.copy(_pos);
  mesh.quaternion.copy(_quat);
}

/** Sync a wheel's world-space position + quaternion onto a Three.js mesh. */
export function syncWheelToMesh(
  wheelTransform: {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
  },
  mesh: THREE.Object3D,
): void {
  _pos.set(wheelTransform.position.x, wheelTransform.position.y, wheelTransform.position.z);
  _quat.set(wheelTransform.quaternion.x, wheelTransform.quaternion.y, wheelTransform.quaternion.z, wheelTransform.quaternion.w);
  mesh.position.copy(_pos);
  mesh.quaternion.copy(_quat);
}
