/**
 * Game menu UI for selecting vehicle and character.
 * City is now a single Sketchfab model.
 */

import { CHARACTER_DEFS } from '../config/avatar.config';

export interface GameOptions {
  vehicle: string;
  character: string;
}

// Vehicle model definitions from Kenney Car Kit (curated selection)
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

  private selectedVehicle: string = VEHICLES[0].id;
  private selectedCharacter: string = CHARACTER_DEFS[0].id;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'game-menu';
    this.overlay.innerHTML = this.buildHTML();
    document.body.appendChild(this.overlay);
    this.bindEvents();
  }

  private buildHTML(): string {
    // Generate vehicle buttons
    const vehicleButtons = VEHICLES.map((v, i) => {
      const selected = i === 0 ? 'selected' : '';
      return `
        <button class="option-btn ${selected}" data-vehicle="${v.id}" data-file="${v.file}">
          <div class="option-label">${v.name}</div>
        </button>
      `;
    }).join('');

    // Generate character buttons
    const characterButtons = CHARACTER_DEFS.map((c, i) => {
      const selected = i === 0 ? 'selected' : '';
      return `
        <button class="option-btn ${selected}" data-character="${c.id}">
          <div class="option-label">${c.name}</div>
        </button>
      `;
    }).join('');

    return `
      <div class="menu-container">
        <h1 class="menu-title">CASA 24 - DRIVER</h1>

        <div class="menu-section">
          <h2>Select Character</h2>
          <div class="option-grid" id="character-options">
            ${characterButtons}
          </div>
        </div>

        <div class="menu-section">
          <h2>Select Vehicle (${VEHICLES.length} available)</h2>
          <div class="option-grid scrollable" id="vehicle-options">
            ${vehicleButtons}
          </div>
        </div>

        <button class="start-btn" id="start-game">
          START GAME
        </button>

        <div class="menu-footer">
          WASD / Arrow Keys / PS5 Controller to drive | Space / X to brake<br>
          Press 1 for avatar camera | Press 2 for car camera
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    // Character selection
    const charBtns = this.overlay.querySelectorAll('[data-character]');
    charBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        charBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedCharacter = (btn as HTMLElement).dataset.character!;
      });
    });

    // Vehicle selection
    const vehicleBtns = this.overlay.querySelectorAll('[data-vehicle]');
    vehicleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        vehicleBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedVehicle = (btn as HTMLElement).dataset.vehicle!;
      });
    });

    // Start button
    const startBtn = this.overlay.querySelector('#start-game');
    startBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onStart) {
        this.onStart({
          vehicle: this.selectedVehicle,
          character: this.selectedCharacter,
        });
      }
    });
  }

  /** Show the menu and return a promise that resolves with selected options. */
  show(): Promise<GameOptions> {
    this.overlay.style.display = 'flex';
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
