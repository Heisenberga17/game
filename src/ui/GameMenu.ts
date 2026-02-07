/**
 * Game menu UI for selecting car and city options.
 * Scans available 3D models and presents them as options.
 */

export interface GameOptions {
  vehicle: string;
  city: string;
}

// Vehicle model definitions from Kenney Car Kit
const VEHICLES = [
  { id: 'taxi', name: 'Taxi', file: 'taxi.glb' },
  { id: 'sedan', name: 'Sedan', file: 'sedan.glb' },
  { id: 'sedan-sports', name: 'Sports Sedan', file: 'sedan-sports.glb' },
  { id: 'hatchback-sports', name: 'Sports Hatchback', file: 'hatchback-sports.glb' },
  { id: 'suv', name: 'SUV', file: 'suv.glb' },
  { id: 'suv-luxury', name: 'Luxury SUV', file: 'suv-luxury.glb' },
  { id: 'van', name: 'Van', file: 'van.glb' },
  { id: 'truck', name: 'Truck', file: 'truck.glb' },
  { id: 'truck-flat', name: 'Flatbed Truck', file: 'truck-flat.glb' },
  { id: 'delivery', name: 'Delivery Van', file: 'delivery.glb' },
  { id: 'delivery-flat', name: 'Delivery Flatbed', file: 'delivery-flat.glb' },
  { id: 'police', name: 'Police Car', file: 'police.glb' },
  { id: 'ambulance', name: 'Ambulance', file: 'ambulance.glb' },
  { id: 'firetruck', name: 'Fire Truck', file: 'firetruck.glb' },
  { id: 'garbage-truck', name: 'Garbage Truck', file: 'garbage-truck.glb' },
  { id: 'race', name: 'Race Car', file: 'race.glb' },
  { id: 'race-future', name: 'Future Racer', file: 'race-future.glb' },
  { id: 'tractor', name: 'Tractor', file: 'tractor.glb' },
  { id: 'tractor-shovel', name: 'Loader', file: 'tractor-shovel.glb' },
  { id: 'tractor-police', name: 'Police Tractor', file: 'tractor-police.glb' },
  { id: 'kart-oobi', name: 'Kart (Blue)', file: 'kart-oobi.glb' },
  { id: 'kart-oodi', name: 'Kart (Red)', file: 'kart-oodi.glb' },
  { id: 'kart-ooli', name: 'Kart (Green)', file: 'kart-ooli.glb' },
  { id: 'kart-oopi', name: 'Kart (Yellow)', file: 'kart-oopi.glb' },
  { id: 'kart-oozi', name: 'Kart (Purple)', file: 'kart-oozi.glb' },
];

// City/environment options
const CITIES = [
  { id: 'downtown', name: 'Downtown', desc: 'Tall skyscrapers, commercial area' },
  { id: 'suburban', name: 'Suburban Town', desc: 'Houses and small buildings' },
  { id: 'industrial', name: 'Industrial Zone', desc: 'Warehouses and factories' },
  { id: 'open', name: 'Open Roads', desc: 'Just roads, no buildings' },
];

export class GameMenu {
  private overlay: HTMLDivElement;
  private onStart: ((options: GameOptions) => void) | null = null;

  private selectedVehicle: string = 'taxi';
  private selectedCity: string = 'downtown';

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

    // Generate city buttons
    const cityButtons = CITIES.map((c, i) => {
      const selected = i === 0 ? 'selected' : '';
      return `
        <button class="option-btn ${selected}" data-city="${c.id}">
          <div class="option-label">${c.name}</div>
          <div class="option-desc">${c.desc}</div>
        </button>
      `;
    }).join('');

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
          <h2>Select City</h2>
          <div class="option-grid" id="city-options">
            ${cityButtons}
          </div>
        </div>

        <button class="start-btn" id="start-game">
          START GAME
        </button>

        <div class="menu-footer">
          Use WASD or Arrow Keys to drive | Models by Kenney.nl (CC0)
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

    // City selection
    const cityBtns = this.overlay.querySelectorAll('[data-city]');
    cityBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        cityBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedCity = (btn as HTMLElement).dataset.city!;
      });
    });

    // Start button
    const startBtn = this.overlay.querySelector('#start-game');
    startBtn?.addEventListener('click', () => {
      this.hide();
      if (this.onStart) {
        this.onStart({
          vehicle: this.selectedVehicle,
          city: this.selectedCity,
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
