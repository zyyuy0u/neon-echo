import { tuning, type Tuning } from '../../core/tuning';

export interface LocomotionState {
  velocity: { x: number; y: number; z: number };
  coyoteRemaining: number;
  jumpBufferRemaining: number;
}

export interface LocomotionInput {
  move: { x: number; z: number };
  grounded: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
}

export interface LocomotionResult {
  state: LocomotionState;
  jumped: boolean;
}

export function createLocomotionState(): LocomotionState {
  return {
    velocity: { x: 0, y: 0, z: 0 },
    coyoteRemaining: 0,
    jumpBufferRemaining: 0,
  };
}

export function getJumpVelocity(settings: Tuning = tuning): number {
  return Math.sqrt(2 * settings.gravity * settings.jumpHeight);
}

export function stepLocomotion(
  previous: LocomotionState,
  input: LocomotionInput,
  deltaSeconds: number,
  settings: Tuning = tuning,
): LocomotionResult {
  if (deltaSeconds <= 0)
    throw new RangeError('Locomotion delta must be positive.');

  const moveLength = Math.hypot(input.move.x, input.move.z);
  const moveScale = moveLength > 1 ? 1 / moveLength : 1;
  const targetX = input.move.x * moveScale * settings.runSpeed;
  const targetZ = input.move.z * moveScale * settings.runSpeed;
  const hasMoveInput = moveLength > Number.EPSILON;
  const responseTime = hasMoveInput
    ? settings.groundAccelerationTime
    : settings.groundDecelerationTime;
  const control = input.grounded ? 1 : settings.airControl;
  const horizontalDelta =
    (settings.runSpeed / Math.max(responseTime, Number.EPSILON)) *
    control *
    deltaSeconds;
  const velocityDeltaX = targetX - previous.velocity.x;
  const velocityDeltaZ = targetZ - previous.velocity.z;
  const velocityDeltaLength = Math.hypot(velocityDeltaX, velocityDeltaZ);
  const velocityBlend =
    velocityDeltaLength <= horizontalDelta
      ? 1
      : horizontalDelta / velocityDeltaLength;

  let coyoteRemaining = input.grounded
    ? settings.coyoteTime
    : Math.max(0, previous.coyoteRemaining - deltaSeconds);
  let jumpBufferRemaining = input.jumpPressed
    ? settings.jumpBufferTime
    : Math.max(0, previous.jumpBufferRemaining - deltaSeconds);
  let verticalVelocity = previous.velocity.y;
  let jumped = false;

  if (jumpBufferRemaining > 0 && coyoteRemaining > 0) {
    verticalVelocity = getJumpVelocity(settings);
    jumpBufferRemaining = 0;
    coyoteRemaining = 0;
    jumped = true;
  } else if (input.grounded && verticalVelocity < 0) {
    verticalVelocity = 0;
  } else if (!input.grounded) {
    const gravityMultiplier =
      verticalVelocity > 0 && (input.jumpReleased || !input.jumpHeld)
        ? settings.jumpReleaseGravityMultiplier
        : 1;
    verticalVelocity -= settings.gravity * gravityMultiplier * deltaSeconds;
  }

  return {
    state: {
      velocity: {
        x: previous.velocity.x + velocityDeltaX * velocityBlend,
        y: verticalVelocity,
        z: previous.velocity.z + velocityDeltaZ * velocityBlend,
      },
      coyoteRemaining,
      jumpBufferRemaining,
    },
    jumped,
  };
}
