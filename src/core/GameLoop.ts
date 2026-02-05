/**
 * Fixed-timestep game loop with interpolation.
 * Runs physics at a fixed 60 Hz rate and renders every frame with
 * an alpha value for smooth visual interpolation.
 */
export class GameLoop {
  /** Fixed physics timestep (60 Hz). */
  public fixedDt = 1 / 60;

  /** Maximum physics sub-steps per frame to prevent spiral of death. */
  public maxSubSteps = 5;

  /** Time remaining from the previous frame that hasn't been simulated yet. */
  public accumulator = 0;

  /** Timestamp of the previous frame in seconds. */
  public lastTime = 0;

  /** Whether the loop is currently running. */
  public running = false;

  private rafId = 0;
  private readonly onFixedUpdate: (fixedDt: number) => void;
  private readonly onFrameUpdate: (dt: number, alpha: number) => void;

  constructor(
    onFixedUpdate: (fixedDt: number) => void,
    onFrameUpdate: (dt: number, alpha: number) => void,
  ) {
    this.onFixedUpdate = onFixedUpdate;
    this.onFrameUpdate = onFrameUpdate;

    // Bind once so we can pass a stable reference to rAF
    this.loop = this.loop.bind(this);
  }

  /** Begin the requestAnimationFrame loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  /** Cancel the animation frame and stop looping. */
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Core loop — called once per display frame. */
  private loop(currentTime: number): void {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    // Convert milliseconds to seconds
    const currentTimeSec = currentTime / 1000;

    // First frame: seed lastTime so dt is zero
    if (this.lastTime === 0) {
      this.lastTime = currentTimeSec;
      return;
    }

    // Clamp dt to 0.25 s to avoid spiral of death after tab switch
    let dt = currentTimeSec - this.lastTime;
    if (dt > 0.25) dt = 0.25;
    this.lastTime = currentTimeSec;

    this.accumulator += dt;

    // Run fixed-rate physics updates
    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxSubSteps) {
      this.onFixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    // Interpolation factor for rendering between physics states
    const alpha = this.accumulator / this.fixedDt;

    this.onFrameUpdate(dt, alpha);
  }
}
