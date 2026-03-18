/**
 * Game menu UI for selecting vehicle and avatar.
 * City is now a single Sketchfab model.
 */

import { AvaturnManager, SavedAvatar } from '../utils/AvaturnManager';

export interface GameOptions {
  vehicle: string;
  /** null = default Zacko, string = saved avatar ID (IndexedDB blob URL) */
  avatarId: string | null;
}

// Vehicle model definitions (curated selection)
const VEHICLES = [
  { id: 'lightning-mcqueen', name: 'Lightning McQueen', file: 'rookie_lightning_mcqueen.glb' },
  { id: 'cal-weathers', name: 'Cal Weathers', file: 'cal_weathers.glb' },
  { id: 'guido', name: 'Guido', file: 'guido.glb' },
  { id: 'taxi', name: 'Taxi', file: 'taxi.glb' },
  { id: 'police', name: 'Police', file: 'police.glb' },
  { id: 'firetruck', name: 'Fire Truck', file: 'firetruck.glb' },
  { id: 'race', name: 'Race Car', file: 'race.glb' },
  { id: 'truck', name: 'Truck', file: 'truck.glb' },
];

export class GameMenu {
  private overlay: HTMLDivElement;
  private onStart: ((options: GameOptions) => void) | null = null;
  private avaturnManager = new AvaturnManager();
  private savedAvatars: SavedAvatar[] = [];

  private selectedVehicle: string = 'taxi';
  private selectedAvatarId: string | null = null; // null = default Zacko

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'game-menu';
    document.body.appendChild(this.overlay);
  }

  private async buildAndRender(): Promise<void> {
    this.savedAvatars = await this.avaturnManager.listSavedAvatars();
    this.overlay.innerHTML = this.buildHTML();
    this.bindEvents();
  }

  private buildHTML(): string {
    // Vehicle buttons
    const vehicleButtons = VEHICLES.map((v) => {
      const selected = v.id === this.selectedVehicle ? 'selected' : '';
      return `
        <button class="option-btn ${selected}" data-vehicle="${v.id}" data-file="${v.file}">
          <div class="option-label">${v.name}</div>
        </button>
      `;
    }).join('');

    // Avatar buttons
    const defaultSelected = this.selectedAvatarId === null ? 'selected' : '';
    let avatarButtons = `
      <button class="option-btn ${defaultSelected}" data-avatar="default">
        <div class="option-label">Zacko</div>
        <div class="option-desc">Default</div>
      </button>
    `;

    for (const av of this.savedAvatars) {
      const selected = this.selectedAvatarId === av.id ? 'selected' : '';
      avatarButtons += `
        <button class="option-btn ${selected}" data-avatar="${av.id}">
          <div class="option-label">${av.name}</div>
          <div class="option-desc">Custom</div>
        </button>
      `;
    }

    avatarButtons += `
      <button class="option-btn" id="create-avatar-btn">
        <div class="option-label">+ Create</div>
        <div class="option-desc">Avaturn</div>
      </button>
    `;

    return `
      <div class="menu-container">
        <h1 class="menu-title">CRAZY TAXI</h1>

        <div class="menu-section">
          <h2>Select Vehicle (${VEHICLES.length} available)</h2>
          <div class="option-grid scrollable" id="vehicle-options">
            ${vehicleButtons}
          </div>
        </div>

        <div class="menu-section">
          <h2>Select Avatar</h2>
          <div class="option-grid" id="avatar-options">
            ${avatarButtons}
          </div>
        </div>

        <button class="start-btn" id="start-game">
          START GAME
        </button>

        <div class="menu-footer">
          Use WASD or Arrow Keys to drive | Space to brake<br>
          Press 1 for avatar camera | Press 2 to return to car<br>
          Vehicle models by Kenney.nl (CC0) | City from Sketchfab
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Vehicle selection
    const vehicleBtns = this.overlay.querySelectorAll('[data-vehicle]');
    vehicleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        vehicleBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedVehicle = (btn as HTMLElement).dataset.vehicle!;
      });
    });

    // Avatar selection
    const avatarBtns = this.overlay.querySelectorAll('[data-avatar]');
    avatarBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        avatarBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        const id = (btn as HTMLElement).dataset.avatar!;
        this.selectedAvatarId = id === 'default' ? null : id;
      });
    });

    // Create avatar button
    const createBtn = this.overlay.querySelector('#create-avatar-btn');
    createBtn?.addEventListener('click', () => this.handleCreateAvatar());

    // Start button
    const startBtn = this.overlay.querySelector('#start-game');
    startBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onStart) {
        this.onStart({
          vehicle: this.selectedVehicle,
          avatarId: this.selectedAvatarId,
        });
      }
    });
  }

  private async handleCreateAvatar(): Promise<void> {
    const sessionUrl = prompt(
      'Enter your Avaturn session URL\n' +
      '(Get one from https://developers.avaturn.me — create a session via the API)',
    );
    if (!sessionUrl) return;

    const result = await this.avaturnManager.openEditor(sessionUrl);
    if (!result) return;

    const name = prompt('Name your avatar:', `Avatar ${this.savedAvatars.length + 1}`) || 'Custom Avatar';

    const saved: SavedAvatar = {
      id: result.avatarId || `avatar-${Date.now()}`,
      name,
      glbBlob: result.blob,
      createdAt: Date.now(),
    };

    await this.avaturnManager.saveAvatar(saved);
    this.selectedAvatarId = saved.id;

    // Re-render menu to show new avatar
    await this.buildAndRender();
  }

  /** Show the menu and return a promise that resolves with selected options. */
  async show(): Promise<GameOptions> {
    this.overlay.style.display = 'flex';
    await this.buildAndRender();
    return new Promise((resolve) => {
      this.onStart = resolve;
    });
  }

  /** Hide the menu overlay. */
  hide(): void {
    this.overlay.style.display = 'none';
  }

  /** Remove the menu from DOM. */
  dispose(): void {
    this.overlay.remove();
  }
}

/** Get the file path for a vehicle model */
export function getVehicleFile(vehicleId: string): string {
  const vehicle = VEHICLES.find(v => v.id === vehicleId);
  return vehicle?.file ?? 'taxi.glb';
}
