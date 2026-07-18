import {
  ColliderDesc,
  RigidBodyDesc,
  type Collider,
  type KinematicCharacterController,
  type RigidBody,
  type World,
} from '@dimforge/rapier3d-compat';
import { type Scene, Vector3 } from 'three';

import { tuning } from '../../core/tuning';
import type { AbilityState } from '../abilities/AbilityState';
import {
  CharacterAvatar,
  type CharacterAnimationState,
  type CharacterAvatarInfo,
} from './CharacterAvatar';
import {
  createLocomotionState,
  stepLocomotion,
  type LocomotionResult,
  type LocomotionState,
} from './locomotion';

export interface CharacterInput {
  move: { x: number; z: number };
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
  dashPressed?: boolean;
  inUpdraft?: boolean;
}

export class CharacterController {
  public readonly collider: Collider;
  private readonly body: RigidBody;
  private readonly controller: KinematicCharacterController;
  private readonly avatar = new CharacterAvatar();
  private locomotion: LocomotionState = createLocomotionState();
  private grounded = false;

  public constructor(
    private readonly world: World,
    scene: Scene,
    private readonly abilities?: AbilityState,
    spawn = { x: 0, y: 1.2, z: 0 },
  ) {
    this.body = world.createRigidBody(
      RigidBodyDesc.kinematicPositionBased().setTranslation(
        spawn.x,
        spawn.y,
        spawn.z,
      ),
    );
    this.collider = world.createCollider(
      ColliderDesc.capsule(tuning.characterHalfHeight, tuning.characterRadius),
      this.body,
    );

    this.controller = world.createCharacterController(
      tuning.characterControllerOffset,
    );
    this.controller.setSlideEnabled(true);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.enableSnapToGround(tuning.groundSnapDistance);
    this.controller.enableAutostep(
      tuning.maximumStepHeight,
      tuning.minimumStepWidth,
      false,
    );
    this.controller.setMaxSlopeClimbAngle(tuning.maximumSlopeAngle);
    this.controller.setMinSlopeSlideAngle(tuning.minimumSlideAngle);

    scene.add(this.avatar.object);
    this.syncVisual();
  }

  public update(deltaSeconds: number, input: CharacterInput): LocomotionResult {
    const result = stepLocomotion(
      this.locomotion,
      {
        ...input,
        grounded: this.grounded,
        abilities: new Set(this.abilities?.getAll() ?? []),
      },
      deltaSeconds,
    );
    this.locomotion = result.state;

    const desired = {
      x: this.locomotion.velocity.x * deltaSeconds,
      y: this.locomotion.velocity.y * deltaSeconds,
      z: this.locomotion.velocity.z * deltaSeconds,
    };
    this.controller.computeColliderMovement(this.collider, desired);
    const movement = this.controller.computedMovement();
    const position = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: position.x + movement.x,
      y: position.y + movement.y,
      z: position.z + movement.z,
    });

    this.grounded = this.controller.computedGrounded();
    if (Math.abs(movement.y - desired.y) > tuning.characterControllerOffset) {
      this.locomotion.velocity.y = 0;
    }
    this.avatar.update(
      deltaSeconds,
      this.getAnimationState(result),
      this.locomotion.velocity,
    );
    return result;
  }

  public syncVisual(): void {
    const position = this.body.translation();
    this.avatar.object.position.set(position.x, position.y, position.z);
  }

  public getPosition(target = new Vector3()): Vector3 {
    const position = this.body.translation();
    return target.set(position.x, position.y, position.z);
  }

  public isGrounded(): boolean {
    return this.grounded;
  }

  public triggerInteraction(): void {
    this.avatar.triggerInteraction();
  }

  public getCharacterInfo(): CharacterAvatarInfo {
    return this.avatar.getInfo();
  }

  public teleport(x: number, y: number, z: number): void {
    const position = { x, y, z };
    this.body.setTranslation(position, true);
    this.body.setNextKinematicTranslation(position);
    this.locomotion = createLocomotionState();
    this.grounded = false;
    this.syncVisual();
  }

  public dispose(scene: Scene): void {
    scene.remove(this.avatar.object);
    this.avatar.dispose();
    this.world.removeCharacterController(this.controller);
  }

  private getAnimationState(result: LocomotionResult): CharacterAnimationState {
    if (result.dashStarted || result.state.dashRemaining > 0) return 'dash';
    if (result.gliding) return 'glide';
    if (!this.grounded) {
      return result.state.velocity.y > 0 ? 'jumpRise' : 'fall';
    }
    return Math.hypot(result.state.velocity.x, result.state.velocity.z) > 0.05
      ? 'run'
      : 'idle';
  }
}
