import { Ray, type World } from '@dimforge/rapier3d-compat';
import { PerspectiveCamera, Vector3 } from 'three';

import { tuning } from '../../core/tuning';
import type { CharacterController } from '../character/CharacterController';
import type { PointerDelta } from '../input/InputSystem';

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
  private readonly desired = new Vector3();
  private readonly rayDirection = new Vector3();

  public constructor(
    private readonly world: World,
    private readonly character: CharacterController,
  ) {}

  public applyPointerDelta(delta: PointerDelta): void {
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

  public update(deltaSeconds: number): void {
    this.character.getPosition(this.target);
    this.target.y += tuning.cameraHeight;

    const horizontalDistance = Math.cos(this.pitch) * tuning.cameraDistance;
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * horizontalDistance,
      this.target.y + Math.sin(this.pitch) * tuning.cameraDistance,
      this.target.z + Math.cos(this.yaw) * horizontalDistance,
    );

    this.rayDirection.copy(this.desired).sub(this.target);
    const desiredDistance = this.rayDirection.length();
    if (desiredDistance > Number.EPSILON) {
      this.rayDirection.divideScalar(desiredDistance);
      const hit = this.world.castRay(
        new Ray(this.target, this.rayDirection),
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
          .add(this.target);
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
    this.camera.lookAt(this.target);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
