import * as THREE from 'three';

/** Any entity the camera can follow (car, avatar, etc.). */
export interface ICameraTarget {
  getPosition(): THREE.Vector3;
  getQuaternion(): THREE.Quaternion;
  getSpeed(): number;
}
