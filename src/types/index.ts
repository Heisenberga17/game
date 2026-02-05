import * as THREE from 'three';

/** Interface for any object that the camera can follow. */
export interface ICameraTarget {
  getPosition(): THREE.Vector3;
  getQuaternion(): THREE.Quaternion;
  getSpeed(): number;
}

/** Definition for a rectangular building placed in the world. */
export interface BuildingDef {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}
