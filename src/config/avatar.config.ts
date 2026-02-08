/**
 * Avatar/NPC configuration.
 */

export interface AvatarSpawnDef {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  scale?: number;
  rotationY?: number;
}

export const AVATAR_CONFIG = {
  /** Default scale for Avaturn models */
  defaultScale: 1.0,

  /** Walk speed in world units per second */
  walkSpeed: 2.5,

  /** NPC wander behaviour */
  npc: {
    walkDuration: 3,    // seconds of walking before pausing
    pauseDuration: 2,   // seconds of pausing before walking again
    turnSpeed: 2,       // radians per second for turning
    wanderRadius: 30,   // max distance from spawn before turning back
  },

  /** Spawn definitions */
  spawns: [
    {
      id: 'zacko',
      modelPath: '/models/avatars/zacko/model.glb',
      position: { x: 10, y: 0, z: 10 },  // y overridden to floorLevel at runtime
      scale: 1.0,
      rotationY: 0,
    },
  ] as AvatarSpawnDef[],

  /** Camera settings when viewing avatar (front-facing mode) */
  camera: {
    distance: 3,
    heightOffset: 1.5,
    lookAtHeight: 1.2,
  },
};
