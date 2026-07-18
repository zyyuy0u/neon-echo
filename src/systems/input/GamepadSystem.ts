import { tuning } from '../../core/tuning';

export type InputDevice = 'keyboard' | 'gamepad';
export type GamepadAction = 'jump' | 'dash' | 'interact';
export type GamepadMenuAction = 'up' | 'down' | 'confirm' | 'back';

export interface GamepadButtonLike {
  readonly pressed: boolean;
  readonly value: number;
}

export interface GamepadLike {
  readonly axes: readonly number[];
  readonly buttons: readonly GamepadButtonLike[];
  readonly connected: boolean;
  readonly id: string;
  readonly index: number;
  readonly mapping: string;
}

export type GamepadPoller = () => readonly (GamepadLike | null)[];

export interface ButtonEdges {
  pressed: ReadonlySet<number>;
  released: ReadonlySet<number>;
}

export interface GamepadSystemCallbacks {
  onConnected?: (name: string) => void;
  onDisconnected?: (name: string) => void;
  onInput?: (device: InputDevice) => void;
}

const BUTTON_ACTIONS: Readonly<Partial<Record<number, GamepadAction>>> = {
  0: 'jump',
  1: 'interact',
  2: 'dash',
};

function browserGamepadPoller(): readonly (GamepadLike | null)[] {
  return navigator.getGamepads?.() ?? [];
}

export function applyAxisDeadzone(value: number, deadzone = 0.15): number {
  const magnitude = Math.abs(value);
  if (!Number.isFinite(magnitude) || magnitude <= deadzone) return 0;
  const safeDeadzone = Math.min(0.99, Math.max(0, deadzone));
  return (
    Math.sign(value) *
    Math.min(1, (magnitude - safeDeadzone) / (1 - safeDeadzone))
  );
}

export function mapStickToVector(
  x: number,
  y: number,
  deadzone = 0.15,
): { x: number; y: number } {
  const magnitude = Math.min(1, Math.hypot(x, y));
  if (!Number.isFinite(magnitude) || magnitude <= deadzone)
    return { x: 0, y: 0 };
  const scaledMagnitude = applyAxisDeadzone(magnitude, deadzone);
  return {
    x: (x / magnitude) * scaledMagnitude,
    y: (y / magnitude) * scaledMagnitude,
  };
}

export function detectButtonEdges(
  previous: readonly boolean[],
  current: readonly boolean[],
): ButtonEdges {
  const pressed = new Set<number>();
  const released = new Set<number>();
  const length = Math.max(previous.length, current.length);
  for (let index = 0; index < length; index += 1) {
    const wasHeld = previous[index] ?? false;
    const isHeld = current[index] ?? false;
    if (isHeld && !wasHeld) pressed.add(index);
    if (!isHeld && wasHeld) released.add(index);
  }
  return { pressed, released };
}

export class GamepadSystem {
  private previousButtons: boolean[] = [];
  private heldActions = new Set<GamepadAction>();
  private readonly pressedActions = new Set<GamepadAction>();
  private readonly releasedActions = new Set<GamepadAction>();
  private readonly pressedButtons = new Set<number>();
  private movement = { x: 0, y: 0 };
  private look = { x: 0, y: 0 };
  private connectedName: string | undefined;
  private stickUpHeld = false;
  private stickDownHeld = false;
  private stickUpPressed = false;
  private stickDownPressed = false;

  public constructor(
    private readonly poller: GamepadPoller = browserGamepadPoller,
    private readonly callbacks: GamepadSystemCallbacks = {},
  ) {}

  public update(): void {
    const gamepad = this.poller().find(
      (candidate) => candidate?.connected && candidate.mapping === 'standard',
    );
    const nextName = gamepad?.id;
    if (nextName !== this.connectedName) {
      if (this.connectedName)
        this.callbacks.onDisconnected?.(this.connectedName);
      if (nextName) this.callbacks.onConnected?.(nextName);
      this.connectedName = nextName;
    }

    const axes = gamepad?.axes ?? [];
    const left = mapStickToVector(
      axes[0] ?? 0,
      axes[1] ?? 0,
      tuning.gamepadDeadzone,
    );
    this.movement = { x: left.x, y: -left.y };
    this.look = mapStickToVector(
      axes[2] ?? 0,
      axes[3] ?? 0,
      tuning.gamepadDeadzone,
    );

    const currentButtons =
      gamepad?.buttons.map((button) => button.pressed) ?? [];
    const edges = detectButtonEdges(this.previousButtons, currentButtons);
    this.previousButtons = currentButtons;
    this.heldActions = new Set<GamepadAction>();
    currentButtons.forEach((held, index) => {
      const action = BUTTON_ACTIONS[index];
      if (held && action) this.heldActions.add(action);
    });
    for (const index of edges.pressed) {
      this.pressedButtons.add(index);
      const action = BUTTON_ACTIONS[index];
      if (action) this.pressedActions.add(action);
    }
    for (const index of edges.released) {
      const action = BUTTON_ACTIONS[index];
      if (action) this.releasedActions.add(action);
    }

    const nextStickUp = left.y < -0.5;
    const nextStickDown = left.y > 0.5;
    this.stickUpPressed ||= nextStickUp && !this.stickUpHeld;
    this.stickDownPressed ||= nextStickDown && !this.stickDownHeld;
    this.stickUpHeld = nextStickUp;
    this.stickDownHeld = nextStickDown;

    if (
      gamepad &&
      (left.x !== 0 ||
        left.y !== 0 ||
        this.look.x !== 0 ||
        this.look.y !== 0 ||
        currentButtons.some(Boolean))
    ) {
      this.callbacks.onInput?.('gamepad');
    }
  }

  public getMovementAxes(): { x: number; y: number } {
    return { ...this.movement };
  }

  public getLookAxes(): { x: number; y: number } {
    return { ...this.look };
  }

  public isActionHeld(action: GamepadAction): boolean {
    return this.heldActions.has(action);
  }

  public wasActionPressed(action: GamepadAction): boolean {
    return this.pressedActions.has(action);
  }

  public wasActionReleased(action: GamepadAction): boolean {
    return this.releasedActions.has(action);
  }

  public hasAnyPressed(): boolean {
    return this.pressedButtons.size > 0;
  }

  public consumeStartPressed(): boolean {
    return this.pressedButtons.delete(9);
  }

  /** Standard mapping Back/Select/View button. */
  public consumeSelectPressed(): boolean {
    return this.pressedButtons.delete(8);
  }

  public consumeMenuActions(): GamepadMenuAction[] {
    const actions: GamepadMenuAction[] = [];
    if (this.pressedButtons.delete(12) || this.stickUpPressed)
      actions.push('up');
    if (this.pressedButtons.delete(13) || this.stickDownPressed)
      actions.push('down');
    if (this.pressedButtons.delete(0)) {
      this.pressedActions.delete('jump');
      actions.push('confirm');
    }
    if (this.pressedButtons.delete(1)) {
      this.pressedActions.delete('interact');
      actions.push('back');
    }
    this.stickUpPressed = false;
    this.stickDownPressed = false;
    return actions;
  }

  public endFixedStep(): void {
    this.pressedActions.clear();
    this.releasedActions.clear();
    this.pressedButtons.clear();
  }
}
