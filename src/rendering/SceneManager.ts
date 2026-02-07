import * as THREE from 'three';
import { WORLD_CONFIG } from '../config/world.config';

/**
 * Manages the Three.js scene, camera, renderer, and lighting.
 * Handles window resize events automatically.
 */
export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  // Store bound handler for cleanup
  private readonly handleResize: () => void;

  constructor() {
    // ---- Scene ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(WORLD_CONFIG.skyColor);
    this.scene.fog = new THREE.Fog(
      WORLD_CONFIG.skyColor,
      WORLD_CONFIG.fogNear,
      WORLD_CONFIG.fogFar,
    );

    // ---- Camera ----
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      800,
    );
    this.camera.position.set(0, 10, 20);

    // ---- Renderer ----
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // ---- Lighting ----
    this.setupLights();

    // ---- Resize handler ----
    this.handleResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this.handleResize);
  }

  /** Render the current scene from the camera's perspective. */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Clean up renderer, DOM element, and event listeners. */
  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ---- Internal ----

  private setupLights(): void {
    // Ambient hemisphere light (sky + ground)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    this.scene.add(hemiLight);

    // Main directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(80, 120, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(4096, 4096);
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 400;
    this.scene.add(dirLight);
  }
}
