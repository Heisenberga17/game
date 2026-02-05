import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import CannonDebugger from 'cannon-es-debugger';
import { VEHICLE_CONFIG } from '../config/vehicle.config';
import { CAMERA_CONFIG } from '../config/camera.config';

/**
 * Developer-only overlay:
 * - stats.js FPS meter
 * - lil-gui tweaking panel for vehicle and camera params
 * - cannon-es-debugger wireframe visualization
 */
export class DebugManager {
  private readonly stats: Stats;
  private readonly gui: GUI;
  private readonly cannonDebugger: { update: () => void };

  constructor(scene: THREE.Scene, world: CANNON.World) {
    // ---- Stats.js (FPS counter) ----
    this.stats = new Stats();
    this.stats.showPanel(0); // 0 = FPS
    document.body.appendChild(this.stats.dom);

    // ---- lil-gui ----
    this.gui = new GUI();

    // Vehicle folder
    const vehicleFolder = this.gui.addFolder('Vehicle');
    vehicleFolder.add(VEHICLE_CONFIG, 'maxForce', 0, 3000);
    vehicleFolder.add(VEHICLE_CONFIG, 'maxSteerVal', 0, 1);
    vehicleFolder.add(VEHICLE_CONFIG, 'suspensionStiffness', 0, 100);
    vehicleFolder.add(VEHICLE_CONFIG, 'brakeForce', 0, 200);
    vehicleFolder.add(VEHICLE_CONFIG, 'frictionSlip', 0, 5);

    // Camera folder
    const cameraFolder = this.gui.addFolder('Camera');
    cameraFolder.add(CAMERA_CONFIG, 'followDistance', 5, 30);
    cameraFolder.add(CAMERA_CONFIG, 'heightOffset', 2, 15);
    cameraFolder.add(CAMERA_CONFIG, 'lookAtHeight', 0, 5);

    // ---- cannon-es-debugger wireframe overlay ----
    this.cannonDebugger = CannonDebugger(scene, world, { color: 0x00ff00 }) as {
      update: () => void;
    };
  }

  /** Call at the very start of each frame. */
  beginFrame(): void {
    this.stats.begin();
  }

  /** Call at the very end of each frame. */
  endFrame(): void {
    this.stats.end();
  }

  /** Update the cannon-es debug wireframes to match current body positions. */
  update(): void {
    if (this.cannonDebugger && typeof this.cannonDebugger.update === 'function') {
      this.cannonDebugger.update();
    }
  }

  /** Clean up DOM elements and GUI. */
  dispose(): void {
    this.gui.destroy();
    if (this.stats.dom.parentElement) {
      this.stats.dom.parentElement.removeChild(this.stats.dom);
    }
  }
}
