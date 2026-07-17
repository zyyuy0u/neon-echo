import RAPIER from '@dimforge/rapier3d-compat';
import { CapsuleGeometry, Group, Mesh, type Scene, Vector3 } from 'three';

import { tuning } from '../../core/tuning';
import { createNeonMaterial } from '../../render/materials';
import { PALETTE } from '../../render/palette';
import type { AbilityState } from '../abilities/AbilityState';
import {
  createLocomotionState,
  stepLocomotion,
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
  public readonly collider: RAPIER.Collider;
  private readonly body: RAPIER.RigidBody;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly visual = new Group();
  private locomotion: LocomotionState = createLocomotionState();
  private grounded = false;

  public constructor(
    private readonly world: RAPIER.World,
    scene: Scene,
    private readonly abilities?: AbilityState,
    spawn = { x: 0, y: 1.2, z: 0 },
  ) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        spawn.x,
        spawn.y,
        spawn.z,
      ),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(
        tuning.characterHalfHeight,
        tuning.characterRadius,
      ),
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

    const material = createNeonMaterial(PALETTE.neonMagenta, 3.2);
    const mesh = new Mesh(
      new CapsuleGeometry(
        tuning.characterRadius,
        tuning.characterHalfHeight * 2,
        6,
        12,
      ),
      material,
    );
    this.visual.add(mesh);
    scene.add(this.visual);
    this.syncVisual();
  }

  public update(deltaSeconds: number, input: CharacterInput): void {
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
  }

  public syncVisual(): void {
    const position = this.body.translation();
    this.visual.position.set(position.x, position.y, position.z);
  }

  public getPosition(target = new Vector3()): Vector3 {
    const position = this.body.translation();
    return target.set(position.x, position.y, position.z);
  }

  public isGrounded(): boolean {
    return this.grounded;
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
    scene.remove(this.visual);
    this.visual.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        for (const material of object.material) material.dispose();
      } else {
        object.material.dispose();
      }
    });
    this.world.removeCharacterController(this.controller);
  }
}
