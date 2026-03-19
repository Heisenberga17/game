import { INPUT_CONFIG } from '../config/input.config';

/**
 * PS5 DualSense standard gamepad button indices (standard mapping).
 */
const GP_BUTTON = {
  CROSS: 0,        // X button — brake
  CIRCLE: 1,
  SQUARE: 2,
  TRIANGLE: 3,     // camera toggle (avatar)
  L1: 4,
  R1: 5,
  L2: 6,           // also brake (analog)
  R2: 7,           // also throttle (analog)
  SHARE: 8,
  OPTIONS: 9,      // camera toggle (car)
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  PS: 16,
  TOUCHPAD: 17,
};

/** Axis indices */
const GP_AXIS = {
  LEFT_X: 0,   // left stick horizontal: -1 left, +1 right
  LEFT_Y: 1,   // left stick vertical: -1 up, +1 down
  RIGHT_X: 2,
  RIGHT_Y: 3,
};

const STICK_DEADZONE = 0.15;

/**
 * Input manager supporting keyboard + PS5 DualSense controller (Gamepad API).
 * Tracks pressed keys and gamepad state, exposes semantic queries.
 */
export class InputManager {
  private readonly keys = new Map<string, boolean>();
  private readonly justPressedKeys = new Set<string>();

  // Gamepad state
  private gamepadIndex: number | null = null;
  private prevButtons: boolean[] = [];
  private justPressedButtons = new Set<number>();

  /** Codes that should have their default browser behaviour suppressed. */
  private static readonly PREVENT_DEFAULT_CODES = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'Digit1', 'Digit2',
  ]);

  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleBlur: () => void;
  private readonly handleGamepadConnected: (e: GamepadEvent) => void;
  private readonly handleGamepadDisconnected: (e: GamepadEvent) => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (InputManager.PREVENT_DEFAULT_CODES.has(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.get(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.set(e.code, true);
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      if (InputManager.PREVENT_DEFAULT_CODES.has(e.code)) {
        e.preventDefault();
      }
      this.keys.set(e.code, false);
    };

    this.handleBlur = () => {
      this.keys.clear();
    };

    this.handleGamepadConnected = (e: GamepadEvent) => {
      console.log(`Gamepad connected: ${e.gamepad.id} [index ${e.gamepad.index}]`);
      this.gamepadIndex = e.gamepad.index;
    };

    this.handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log(`Gamepad disconnected: ${e.gamepad.id}`);
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        this.prevButtons = [];
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  // ---- Gamepad helpers ----

  private getGamepad(): Gamepad | null {
    if (this.gamepadIndex === null) return null;
    const gamepads = navigator.getGamepads();
    return gamepads[this.gamepadIndex] ?? null;
  }

  /** Poll gamepad and detect just-pressed buttons. Call once per frame. */
  pollGamepad(): void {
    const gp = this.getGamepad();
    if (!gp) return;

    this.justPressedButtons.clear();
    for (let i = 0; i < gp.buttons.length; i++) {
      const pressed = gp.buttons[i].pressed;
      if (pressed && !this.prevButtons[i]) {
        this.justPressedButtons.add(i);
      }
      this.prevButtons[i] = pressed;
    }
  }

  private isButtonPressed(index: number): boolean {
    const gp = this.getGamepad();
    if (!gp) return false;
    return gp.buttons[index]?.pressed ?? false;
  }

  private isButtonJustPressed(index: number): boolean {
    return this.justPressedButtons.has(index);
  }

  private getAxis(index: number): number {
    const gp = this.getGamepad();
    if (!gp) return 0;
    const val = gp.axes[index] ?? 0;
    return Math.abs(val) < STICK_DEADZONE ? 0 : val;
  }

  /** R2 trigger value 0..1 for analog throttle */
  getThrottleAnalog(): number {
    const gp = this.getGamepad();
    if (!gp) return 0;
    return gp.buttons[GP_BUTTON.R2]?.value ?? 0;
  }

  /** L2 trigger value 0..1 for analog brake */
  getBrakeAnalog(): number {
    const gp = this.getGamepad();
    if (!gp) return 0;
    return gp.buttons[GP_BUTTON.L2]?.value ?? 0;
  }

  // ---- Semantic input queries (keyboard + gamepad) ----

  isForward(): boolean {
    return this.anyPressed(INPUT_CONFIG.forward)
      || this.getAxis(GP_AXIS.LEFT_Y) < -STICK_DEADZONE
      || this.isButtonPressed(GP_BUTTON.DPAD_UP)
      || this.getThrottleAnalog() > 0.1;
  }

  isBackward(): boolean {
    return this.anyPressed(INPUT_CONFIG.backward)
      || this.getAxis(GP_AXIS.LEFT_Y) > STICK_DEADZONE
      || this.isButtonPressed(GP_BUTTON.DPAD_DOWN);
  }

  isLeft(): boolean {
    return this.anyPressed(INPUT_CONFIG.left)
      || this.getAxis(GP_AXIS.LEFT_X) < -STICK_DEADZONE
      || this.isButtonPressed(GP_BUTTON.DPAD_LEFT);
  }

  isRight(): boolean {
    return this.anyPressed(INPUT_CONFIG.right)
      || this.getAxis(GP_AXIS.LEFT_X) > STICK_DEADZONE
      || this.isButtonPressed(GP_BUTTON.DPAD_RIGHT);
  }

  isBrake(): boolean {
    return this.anyPressed(INPUT_CONFIG.brake)
      || this.isButtonPressed(GP_BUTTON.CROSS)
      || this.getBrakeAnalog() > 0.1;
  }

  /** Analog steering value from left stick: -1 (left) to +1 (right). 0 if keyboard or no input. */
  getSteerAxis(): number {
    return this.getAxis(GP_AXIS.LEFT_X);
  }

  /** Returns true only on the first frame a key in `codes` transitions to pressed. */
  isJustPressed(codes: string[]): boolean {
    for (const code of codes) {
      if (this.justPressedKeys.has(code)) return true;
    }
    return false;
  }

  /** Right stick axes for camera orbit. Returns { x, y } with deadzone applied. Keyboard returns { 0, 0 }. */
  getCameraAxes(): { x: number; y: number } {
    const x = this.getAxis(GP_AXIS.RIGHT_X);
    const y = this.getAxis(GP_AXIS.RIGHT_Y);
    return { x, y };
  }

  /** True on the first frame jump is pressed (Space or Cross button). */
  isJump(): boolean {
    return this.isJustPressed(['Space']) || this.isButtonJustPressed(GP_BUTTON.CROSS);
  }

  isToggleAvatarCamera(): boolean {
    return this.isJustPressed(INPUT_CONFIG.cameraModeAvatar)
      || this.isButtonJustPressed(GP_BUTTON.TRIANGLE);
  }

  isToggleCarCamera(): boolean {
    return this.isJustPressed(INPUT_CONFIG.cameraModeCar)
      || this.isButtonJustPressed(GP_BUTTON.OPTIONS);
  }

  /** Clear one-shot triggers. Call at end of each frame. */
  clearJustPressed(): void {
    this.justPressedKeys.clear();
    this.justPressedButtons.clear();
  }

  /** Remove all event listeners. */
  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  /**
   * Analog movement axes for avatar control.
   * Gamepad: raw stick values with deadzone. Keyboard/D-pad: full ±1.0.
   * Returns { x: -1..+1 (left/right), y: -1..+1 (backward/forward) }.
   */
  getMovementAxes(): { x: number; y: number } {
    // Gamepad analog stick takes priority
    const stickX = this.getAxis(GP_AXIS.LEFT_X);
    const stickY = -this.getAxis(GP_AXIS.LEFT_Y); // invert: stick down is +1, we want forward = +1
    if (stickX !== 0 || stickY !== 0) {
      return { x: stickX, y: stickY };
    }

    // D-pad
    let dx = 0, dy = 0;
    if (this.isButtonPressed(GP_BUTTON.DPAD_LEFT)) dx -= 1;
    if (this.isButtonPressed(GP_BUTTON.DPAD_RIGHT)) dx += 1;
    if (this.isButtonPressed(GP_BUTTON.DPAD_UP)) dy += 1;
    if (this.isButtonPressed(GP_BUTTON.DPAD_DOWN)) dy -= 1;
    if (dx !== 0 || dy !== 0) return { x: dx, y: dy };

    // Keyboard
    if (this.anyPressed(INPUT_CONFIG.left)) dx -= 1;
    if (this.anyPressed(INPUT_CONFIG.right)) dx += 1;
    if (this.anyPressed(INPUT_CONFIG.forward)) dy += 1;
    if (this.anyPressed(INPUT_CONFIG.backward)) dy -= 1;
    return { x: dx, y: dy };
  }

  // ---- Internal helpers ----

  private anyPressed(codes: string[]): boolean {
    for (const code of codes) {
      if (this.keys.get(code)) return true;
    }
    return false;
  }
}
