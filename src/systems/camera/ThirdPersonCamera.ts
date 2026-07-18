import { Ray, type World } from '@dimforge/rapier3d-compat';
import { PerspectiveCamera, Vector3 } from 'three';

import { tuning } from '../../core/tuning';
import type { CharacterController } from '../character/CharacterController';
import type { PointerDelta } from '../input/InputSystem';

const FOV_EASE_SECONDS = 0.2;
const OPENING_HOLD_SECONDS = 1.5;
const OPENING_CAMERA_SECONDS = 2;
const OPENING_PITCH = 0.95;

export interface CameraMotionState {
  horizontalVelocity: Readonly<{ x: number; z: number }>;
  sprinting: boolean;
}

export function getAutoBehindTargetYaw(
  horizontalVelocity: Readonly<{ x: number; z: number }>,
): number {
  return Math.atan2(-horizontalVelocity.x, -horizontalVelocity.z);
}

function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function smoothstep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

export class ThirdPersonCamera {
  public readonly camera = new PerspectiveCamera(
    tuning.cameraFieldOfView,
    1,
    tuning.cameraNearPlane,
    tuning.worldCameraFarPlane,
  );
  private yaw = 0;
  private pitch = tuning.cameraInitialPitch;
  private initialized = false;
  private readonly target = new Vector3();
  private readonly followedTarget = new Vector3();
  private readonly desired = new Vector3();
  private readonly rayDirection = new Vector3();
  private autoBehindEnabled = true;
  private movingWithoutPointerSeconds = 0;
  private fovBlend = 0;
  private landingDipAmplitude = 0;
  private landingDipElapsed = 0;
  private openingElapsed: number | undefined;

  public constructor(
    private readonly world: World,
    private readonly character: CharacterController,
  ) {}

  public applyPointerDelta(delta: PointerDelta): void {
    if (delta.x !== 0 || delta.y !== 0) {
      this.movingWithoutPointerSeconds = 0;
    }
    const horizontalSign = tuning.invertCameraX ? 1 : -1;
    const verticalSign = tuning.invertCameraY ? 1 : -1;
    this.yaw += delta.x * tuning.cameraSensitivity * horizontalSign;
    this.pitch = Math.min(
      tuning.cameraPitchMax,
      Math.max(
        tuning.cameraPitchMin,
        this.pitch + delta.y * tuning.cameraSensitivity * verticalSign,
      ),
    );
  }

  public setAutoBehindEnabled(enabled: boolean): void {
    this.autoBehindEnabled = enabled;
    if (!enabled) this.movingWithoutPointerSeconds = 0;
  }

  public startOpening(reducedMotion: boolean): void {
    if (reducedMotion) {
      this.openingElapsed = undefined;
      this.pitch = tuning.cameraInitialPitch;
      return;
    }
    this.openingElapsed = 0;
    this.pitch = OPENING_PITCH;
  }

  public triggerLanding(verticalSpeed: number): void {
    const strength = Math.min(
      1,
      Math.max(0, verticalSpeed) / tuning.landingHardSpeedThreshold,
    );
    this.landingDipAmplitude = tuning.landingCamDip * strength;
    this.landingDipElapsed = 0;
  }

  public getMovementDirection(axes: { x: number; y: number }): {
    x: number;
    z: number;
  } {
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    return {
      x: rightX * axes.x + forwardX * axes.y,
      z: rightZ * axes.x + forwardZ * axes.y,
    };
  }

  public getCompassHeading(): number {
    return Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw));
  }

  public update(
    deltaSeconds: number,
    motion: CameraMotionState = {
      horizontalVelocity: { x: 0, z: 0 },
      sprinting: false,
    },
  ): void {
    this.updateOpening(deltaSeconds);
    this.updateAutoBehind(deltaSeconds, motion.horizontalVelocity);
    this.updateFov(deltaSeconds, motion.sprinting);

    this.character.getPosition(this.target);
    this.target.y += tuning.cameraHeight;
    if (!this.initialized) {
      this.followedTarget.copy(this.target);
    } else {
      const horizontalBlend =
        1 - Math.exp(-tuning.followLagHorizontal * deltaSeconds);
      const verticalBlend =
        1 - Math.exp(-tuning.followLagVertical * deltaSeconds);
      this.followedTarget.x +=
        (this.target.x - this.followedTarget.x) * horizontalBlend;
      this.followedTarget.z +=
        (this.target.z - this.followedTarget.z) * horizontalBlend;
      this.followedTarget.y +=
        (this.target.y - this.followedTarget.y) * verticalBlend;
    }

    const horizontalDistance = Math.cos(this.pitch) * tuning.cameraDistance;
    this.desired.set(
      this.followedTarget.x + Math.sin(this.yaw) * horizontalDistance,
      this.followedTarget.y + Math.sin(this.pitch) * tuning.cameraDistance,
      this.followedTarget.z + Math.cos(this.yaw) * horizontalDistance,
    );

    if (this.landingDipAmplitude > 0) {
      this.landingDipElapsed += deltaSeconds;
      const progress = Math.min(1, this.landingDipElapsed / 0.24);
      this.desired.y -= Math.sin(progress * Math.PI) * this.landingDipAmplitude;
      if (progress === 1) this.landingDipAmplitude = 0;
    }

    this.rayDirection.copy(this.desired).sub(this.followedTarget);
    const desiredDistance = this.rayDirection.length();
    if (desiredDistance > Number.EPSILON) {
      this.rayDirection.divideScalar(desiredDistance);
      const hit = this.world.castRay(
        new Ray(this.followedTarget, this.rayDirection),
        desiredDistance,
        true,
        undefined,
        undefined,
        this.character.collider,
      );
      if (hit) {
        const collisionDistance = Math.max(
          0,
          hit.timeOfImpact - tuning.cameraCollisionPadding,
        );
        this.desired
          .copy(this.rayDirection)
          .multiplyScalar(collisionDistance)
          .add(this.followedTarget);
      }
    }

    if (!this.initialized) {
      this.camera.position.copy(this.desired);
      this.initialized = true;
    } else {
      const blend =
        1 - Math.exp(-tuning.cameraPositionSmoothing * deltaSeconds);
      this.camera.position.lerp(this.desired, blend);
    }
    this.camera.lookAt(this.followedTarget);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private updateAutoBehind(
    deltaSeconds: number,
    velocity: Readonly<{ x: number; z: number }>,
  ): void {
    const moving = Math.hypot(velocity.x, velocity.z) > 0.05;
    if (
      !this.autoBehindEnabled ||
      !moving ||
      this.openingElapsed !== undefined
    ) {
      this.movingWithoutPointerSeconds = 0;
      return;
    }
    this.movingWithoutPointerSeconds += deltaSeconds;
    if (this.movingWithoutPointerSeconds < tuning.autoBehindDelay) return;
    const targetYaw = getAutoBehindTargetYaw(velocity);
    const delta = shortestAngleDelta(this.yaw, targetYaw);
    const maximumStep = tuning.autoBehindRate * deltaSeconds;
    this.yaw += Math.min(maximumStep, Math.max(-maximumStep, delta));
  }

  private updateFov(deltaSeconds: number, sprinting: boolean): void {
    const target = sprinting ? 1 : 0;
    const step = deltaSeconds / FOV_EASE_SECONDS;
    this.fovBlend =
      target > this.fovBlend
        ? Math.min(target, this.fovBlend + step)
        : Math.max(target, this.fovBlend - step);
    const fieldOfView =
      tuning.cameraFieldOfView +
      tuning.sprintFovBoost * smoothstep(this.fovBlend);
    if (this.camera.fov !== fieldOfView) {
      this.camera.fov = fieldOfView;
      this.camera.updateProjectionMatrix();
    }
  }

  private updateOpening(deltaSeconds: number): void {
    if (this.openingElapsed === undefined) return;
    this.openingElapsed += deltaSeconds;
    const cameraProgress =
      (this.openingElapsed - OPENING_HOLD_SECONDS) / OPENING_CAMERA_SECONDS;
    this.pitch =
      OPENING_PITCH +
      (tuning.cameraInitialPitch - OPENING_PITCH) * smoothstep(cameraProgress);
    if (cameraProgress >= 1) {
      this.pitch = tuning.cameraInitialPitch;
      this.openingElapsed = undefined;
    }
  }
}
