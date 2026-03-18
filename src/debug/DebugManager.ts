import * as THREE from 'three';
import { Pane } from 'tweakpane';
import Stats from 'stats.js';
import { VEHICLE_CONFIG } from '../config/vehicle.config';
import { CAMERA_CONFIG } from '../config/camera.config';

/**
 * Developer-only overlay:
 * - stats.js FPS meter
 * - Tweakpane panel for vehicle and camera params
 * - Renderer performance monitors (draw calls, triangles)
 */
export class DebugManager {
  private readonly stats: Stats;
  private readonly pane: Pane;
  private readonly renderer: THREE.WebGLRenderer;

  // Renderer info binding object (Tweakpane needs a mutable POJO)
  private readonly rendererInfo = {
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
  };

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    // ---- Stats.js (FPS counter) ----
    this.stats = new Stats();
    this.stats.showPanel(0); // 0 = FPS
    document.body.appendChild(this.stats.dom);

    // ---- Tweakpane ----
    this.pane = new Pane({ title: 'Debug' });

    // Vehicle folder
    const vehicleFolder = this.pane.addFolder({ title: 'Vehicle' });
    vehicleFolder.addBinding(VEHICLE_CONFIG, 'maxForce', { min: 0, max: 3000 });
    vehicleFolder.addBinding(VEHICLE_CONFIG, 'maxSteerVal', { min: 0, max: 1 });
    vehicleFolder.addBinding(VEHICLE_CONFIG, 'suspensionStiffness', { min: 0, max: 100 });
    vehicleFolder.addBinding(VEHICLE_CONFIG, 'brakeForce', { min: 0, max: 200 });
    vehicleFolder.addBinding(VEHICLE_CONFIG, 'frictionSlip', { min: 0, max: 5 });

    // Camera folder
    const cameraFolder = this.pane.addFolder({ title: 'Camera' });
    cameraFolder.addBinding(CAMERA_CONFIG, 'followDistance', { min: 5, max: 30 });
    cameraFolder.addBinding(CAMERA_CONFIG, 'heightOffset', { min: 2, max: 15 });
    cameraFolder.addBinding(CAMERA_CONFIG, 'lookAtHeight', { min: 0, max: 5 });

    // Renderer performance monitors
    const rendererFolder = this.pane.addFolder({ title: 'Renderer' });
    rendererFolder.addBinding(this.rendererInfo, 'drawCalls', { readonly: true, label: 'Draw Calls' });
    rendererFolder.addBinding(this.rendererInfo, 'triangles', { readonly: true, label: 'Triangles' });
    rendererFolder.addBinding(this.rendererInfo, 'textures', { readonly: true, label: 'Textures' });
    rendererFolder.addBinding(this.rendererInfo, 'geometries', { readonly: true, label: 'Geometries' });
  }

  /** Call at the very start of each frame. */
  beginFrame(): void {
    this.stats.begin();
  }

  /** Call at the very end of each frame. */
  endFrame(): void {
    // Update renderer info for monitors
    this.rendererInfo.drawCalls = this.renderer.info.render.calls;
    this.rendererInfo.triangles = this.renderer.info.render.triangles;
    this.rendererInfo.textures = this.renderer.info.memory.textures;
    this.rendererInfo.geometries = this.renderer.info.memory.geometries;
    this.pane.refresh();

    this.stats.end();
  }

  /** Clean up DOM elements and GUI. */
  dispose(): void {
    this.pane.dispose();
    if (this.stats.dom.parentElement) {
      this.stats.dom.parentElement.removeChild(this.stats.dom);
    }
  }
}
