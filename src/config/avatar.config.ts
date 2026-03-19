/**
 * Avatar/NPC configuration.
 */

export interface CharacterDef {
  id: string;
  name: string;
  modelPath: string;
  modelType: 'glb' | 'fbx';
  texturePath?: string;
  scale?: number;
}

export interface AvatarSpawnDef {
  id: string;
  modelPath: string;
  modelType: 'glb' | 'fbx';
  texturePath?: string;
  position: { x: number; y: number; z: number };
  scale?: number;
  rotationY?: number;
}

/** All available characters */
export const CHARACTER_DEFS: CharacterDef[] = [
  {
    id: 'bowlie',
    name: 'Bo.Wlie',
    modelPath: '/models/avatars/bowlie/walk.fbx',
    modelType: 'fbx',
    texturePath: '/models/avatars/bowlie/texture.png',
    scale: 0.0001,
  },
  {
    id: 'pyro',
    name: 'Pyro',
    modelPath: '/models/avatars/pyro/walk.fbx',
    modelType: 'fbx',
    texturePath: '/models/avatars/pyro/texture.png',
    scale: 0.0001,
  },
  {
    id: 'zacko-psx',
    name: 'Zacko',
    modelPath: '/models/avatars/zacko-psx/walk.fbx',
    modelType: 'fbx',
    texturePath: '/models/avatars/zacko-psx/texture.png',
    scale: 0.0001,
  },
];

/** Player spawn position */
const PLAYER_SPAWN = { x: 10, y: 0, z: 10 };


export const AVATAR_CONFIG = {
  /** Target avatar height in world units (car is ~4 units long) */
  targetHeight: 1.8,

  /** Default scale for avatar models */
  defaultScale: 1.0,

  /** Walk speed in world units per second */
  walkSpeed: 2.5,

  /** Smooth movement parameters */
  movement: {
    acceleration: 8.0,
    deceleration: 6.0,
    turnSpeed: 10.0,
    inputDeadzone: 0.1,
    jumpForce: 5.0,
    gravity: 15.0,
  },

  /** NPC wander behaviour */
  npc: {
    walkDuration: 3,
    pauseDuration: 2,
    turnSpeed: 2,
    wanderRadius: 30,
  },

  /** Camera settings when viewing avatar (front-facing mode) */
  camera: {
    distance: 3,
    heightOffset: 1.5,
    lookAtHeight: 1.2,
    orbitSensitivity: 3.0,
    minPitch: 0.1,
    maxPitch: 1.2,
    defaultPitch: 0.3,
  },

  /**
   * Build spawn definitions based on the selected character.
   * Returns [playerSpawn, ...npcSpawns].
   */
  buildSpawns(selectedCharacterId: string): AvatarSpawnDef[] {
    const selected = CHARACTER_DEFS.find(c => c.id === selectedCharacterId) ?? CHARACTER_DEFS[0];

    return [
      {
        id: selected.id,
        modelPath: selected.modelPath,
        modelType: selected.modelType,
        texturePath: selected.texturePath,
        position: { ...PLAYER_SPAWN },
        scale: selected.scale,
        rotationY: 0,
      },
    ];
  },
};
