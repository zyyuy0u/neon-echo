import { tuning, type Tuning } from '../../core/tuning';
import type { Ability } from '../../world/map/types';

export interface LocomotionState {
  velocity: { x: number; y: number; z: number };
  coyoteRemaining: number;
  jumpBufferRemaining: number;
  dashRemaining: number;
  dashCooldownRemaining: number;
  dashDirection: { x: number; z: number };
  airDashAvailable: boolean;
  doubleJumpAvailable: boolean;
}

export interface LocomotionInput {
  move: { x: number; z: number };
  grounded: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
  dashPressed?: boolean;
  abilities?: ReadonlySet<Ability>;
  inUpdraft?: boolean;
}

export interface LocomotionResult {
  state: LocomotionState;
  jumped: boolean;
  doubleJumped: boolean;
  dashStarted: boolean;
  gliding: boolean;
}

export function createLocomotionState(): LocomotionState {
  return {
    velocity: { x: 0, y: 0, z: 0 },
    coyoteRemaining: 0,
    jumpBufferRemaining: 0,
    dashRemaining: 0,
    dashCooldownRemaining: 0,
    dashDirection: { x: 0, z: -1 },
    airDashAvailable: true,
    doubleJumpAvailable: true,
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
  let targetX = input.move.x * moveScale * settings.runSpeed;
  let targetZ = input.move.z * moveScale * settings.runSpeed;
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
  let doubleJumped = false;
  let dashStarted = false;
  let gliding = false;
  let dashRemaining = previous.dashRemaining;
  let dashCooldownRemaining = Math.max(
    0,
    previous.dashCooldownRemaining - deltaSeconds,
  );
  let dashDirection = previous.dashDirection;
  let airDashAvailable = input.grounded ? true : previous.airDashAvailable;
  let doubleJumpAvailable = input.grounded
    ? true
    : previous.doubleJumpAvailable;
  const abilities = input.abilities ?? new Set<Ability>();

  if (jumpBufferRemaining > 0 && coyoteRemaining > 0) {
    verticalVelocity = getJumpVelocity(settings);
    jumpBufferRemaining = 0;
    coyoteRemaining = 0;
    jumped = true;
    airDashAvailable = true;
  } else if (
    input.jumpPressed &&
    !input.grounded &&
    abilities.has('doubleJump') &&
    doubleJumpAvailable
  ) {
    verticalVelocity = Math.sqrt(
      2 * settings.gravity * settings.doubleJumpHeight,
    );
    jumpBufferRemaining = 0;
    doubleJumpAvailable = false;
    airDashAvailable = true;
    doubleJumped = true;
  } else if (input.grounded && verticalVelocity < 0) {
    verticalVelocity = 0;
  } else if (!input.grounded) {
    const gravityMultiplier =
      verticalVelocity > 0 && (input.jumpReleased || !input.jumpHeld)
        ? settings.jumpReleaseGravityMultiplier
        : 1;
    verticalVelocity -= settings.gravity * gravityMultiplier * deltaSeconds;
  }

  // Updrafts are environmental movement, so the wind-well can introduce the
  // glide mechanic before the permanent glide ability is awarded.
  if (!input.grounded && input.inUpdraft) {
    verticalVelocity = settings.updraftRiseSpeed;
  }

  const canAirDash = input.grounded || airDashAvailable;
  if (
    input.dashPressed &&
    abilities.has('dash') &&
    dashCooldownRemaining <= 0 &&
    canAirDash
  ) {
    const previousSpeed = Math.hypot(previous.velocity.x, previous.velocity.z);
    dashDirection =
      moveLength > Number.EPSILON
        ? { x: input.move.x * moveScale, z: input.move.z * moveScale }
        : previousSpeed > Number.EPSILON
          ? {
              x: previous.velocity.x / previousSpeed,
              z: previous.velocity.z / previousSpeed,
            }
          : { x: 0, z: -1 };
    dashRemaining = settings.dashDuration;
    dashCooldownRemaining = settings.dashCooldown;
    if (!input.grounded) airDashAvailable = false;
    dashStarted = true;
  }

  const dashActive = dashStarted || dashRemaining > 0;
  if (dashActive) {
    targetX = dashDirection.x * settings.dashSpeed;
    targetZ = dashDirection.z * settings.dashSpeed;
    dashRemaining = Math.max(0, dashRemaining - deltaSeconds);
  } else if (!input.grounded && input.jumpHeld && abilities.has('glide')) {
    gliding = true;
    verticalVelocity = input.inUpdraft
      ? settings.updraftRiseSpeed
      : Math.max(verticalVelocity, -settings.glideFallSpeed);
    const previousSpeed = Math.hypot(previous.velocity.x, previous.velocity.z);
    const glideDirection =
      moveLength > Number.EPSILON
        ? { x: input.move.x * moveScale, z: input.move.z * moveScale }
        : previousSpeed > Number.EPSILON
          ? {
              x: previous.velocity.x / previousSpeed,
              z: previous.velocity.z / previousSpeed,
            }
          : { x: 0, z: -1 };
    targetX = glideDirection.x * settings.glideForwardSpeed;
    targetZ = glideDirection.z * settings.glideForwardSpeed;
  }

  const horizontalVelocity =
    dashActive || gliding
      ? { x: targetX, z: targetZ }
      : {
          x: previous.velocity.x + velocityDeltaX * velocityBlend,
          z: previous.velocity.z + velocityDeltaZ * velocityBlend,
        };

  return {
    state: {
      velocity: {
        x: horizontalVelocity.x,
        y: verticalVelocity,
        z: horizontalVelocity.z,
      },
      coyoteRemaining,
      jumpBufferRemaining,
      dashRemaining,
      dashCooldownRemaining,
      dashDirection,
      airDashAvailable,
      doubleJumpAvailable,
    },
    jumped,
    doubleJumped,
    dashStarted,
    gliding,
  };
}
