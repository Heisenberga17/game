import { INPUT_CONFIG } from '../config/input.config';

/**
 * Keyboard input manager.
 * Tracks pressed keys and exposes semantic queries (isForward, isBrake, etc.).
 * Prevents default on arrow keys and space to stop page scrolling.
 */
export class InputManager {
  private readonly keys = new Map<string, boolean>();

  /** Codes that should have their default browser behaviour suppressed. */
  private static readonly PREVENT_DEFAULT_CODES = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  ]);

  // Store bound handlers so we can remove them in dispose()
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleBlur: () => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (InputManager.PREVENT_DEFAULT_CODES.has(e.code)) {
        e.preventDefault();
      }
      this.keys.set(e.code, true);
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      if (InputManager.PREVENT_DEFAULT_CODES.has(e.code)) {
        e.preventDefault();
      }
      this.keys.set(e.code, false);
    };

    // Clear all keys when the window loses focus to avoid "stuck" keys
    this.handleBlur = () => {
      this.keys.clear();
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  // ---- Semantic input queries ----

  isForward(): boolean {
    return this.anyPressed(INPUT_CONFIG.forward);
  }

  isBackward(): boolean {
    return this.anyPressed(INPUT_CONFIG.backward);
  }

  isLeft(): boolean {
    return this.anyPressed(INPUT_CONFIG.left);
  }

  isRight(): boolean {
    return this.anyPressed(INPUT_CONFIG.right);
  }

  isBrake(): boolean {
    return this.anyPressed(INPUT_CONFIG.brake);
  }

  /** Remove all event listeners. */
  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  // ---- Internal helpers ----

  /** Returns true if any of the given key codes are currently pressed. */
  private anyPressed(codes: string[]): boolean {
    for (const code of codes) {
      if (this.keys.get(code)) return true;
    }
    return false;
  }
}
