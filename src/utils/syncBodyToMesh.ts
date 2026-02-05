import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Pre-allocated objects to avoid GC pressure every frame.
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/**
 * Copy a cannon-es rigid body's position and quaternion onto a Three.js mesh.
 */
export function syncBodyToMesh(body: CANNON.Body, mesh: THREE.Object3D): void {
  _pos.set(body.position.x, body.position.y, body.position.z);
  _quat.set(
    body.quaternion.x,
    body.quaternion.y,
    body.quaternion.z,
    body.quaternion.w,
  );
  mesh.position.copy(_pos);
  mesh.quaternion.copy(_quat);
}

/**
 * Copy a cannon-es wheel transform (from RaycastVehicle) onto a Three.js mesh.
 */
export function syncWheelToMesh(
  wheelTransform: { position: CANNON.Vec3; quaternion: CANNON.Quaternion },
  mesh: THREE.Object3D,
): void {
  _pos.set(
    wheelTransform.position.x,
    wheelTransform.position.y,
    wheelTransform.position.z,
  );
  _quat.set(
    wheelTransform.quaternion.x,
    wheelTransform.quaternion.y,
    wheelTransform.quaternion.z,
    wheelTransform.quaternion.w,
  );
  mesh.position.copy(_pos);
  mesh.quaternion.copy(_quat);
}
