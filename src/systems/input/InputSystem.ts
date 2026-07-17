import {
  DEFAULT_BINDINGS,
  type InputAction,
  type KeyBindings,
} from './bindings';

export interface PointerDelta {
  x: number;
  y: number;
}

export class InputSystem {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private pointerX = 0;
  private pointerY = 0;
  private bindings: KeyBindings;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    bindings: Readonly<KeyBindings> = DEFAULT_BINDINGS,
  ) {
    this.bindings = { ...bindings };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('click', this.onCanvasClick);
  }

  public isHeld(code: string): boolean {
    return this.held.has(code);
  }

  public wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  public wasReleased(code: string): boolean {
    return this.released.has(code);
  }

  public getMovementAxes(): { x: number; y: number } {
    const x =
      Number(this.isActionHeld('moveRight')) -
      Number(this.isActionHeld('moveLeft'));
    const y =
      Number(this.isActionHeld('moveForward')) -
      Number(this.isActionHeld('moveBackward'));
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  public isActionHeld(action: InputAction): boolean {
    return this.isHeld(this.bindings[action]);
  }

  public wasActionPressed(action: InputAction): boolean {
    return this.wasPressed(this.bindings[action]);
  }

  public wasActionReleased(action: InputAction): boolean {
    return this.wasReleased(this.bindings[action]);
  }

  public setBindings(bindings: Readonly<KeyBindings>): void {
    this.bindings = { ...bindings };
    this.onBlur();
  }

  public consumePointerDelta(): PointerDelta {
    const delta = { x: this.pointerX, y: this.pointerY };
    this.pointerX = 0;
    this.pointerY = 0;
    return delta;
  }

  public endFixedStep(): void {
    this.pressed.clear();
    this.released.clear();
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onCanvasClick);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'Backquote')
      event.preventDefault();
    if (!this.held.has(event.code)) this.pressed.add(event.code);
    this.held.add(event.code);
    if (event.code === 'Escape' && document.pointerLockElement) {
      void document.exitPointerLock();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.held.delete(event.code)) this.released.add(event.code);
  };

  private readonly onBlur = (): void => {
    for (const code of this.held) this.released.add(code);
    this.held.clear();
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    this.pointerX += event.movementX;
    this.pointerY += event.movementY;
  };

  private readonly onCanvasClick = (): void => {
    if (document.pointerLockElement !== this.canvas) {
      void this.canvas.requestPointerLock();
    }
  };
}
