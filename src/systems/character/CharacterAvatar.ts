import {
  AnimationAction,
  AnimationMixer,
  CapsuleGeometry,
  Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Mesh,
  type Material,
  type Object3D,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { tuning } from '../../core/tuning';
import {
  createSkinnedNeonMaterial,
  createSkinnedStructureMaterial,
} from '../../render/materials';
import { PALETTE } from '../../render/palette';

const CLIP_PREFIX = 'CharacterArmature|';
const CROSSFADE_SECONDS = 0.15;
const MODEL_SCALE = 1.5;
const MODEL_FLOOR_OFFSET = -(
  tuning.characterHalfHeight + tuning.characterRadius
);
const TURN_RESPONSE = 12;

export type CharacterAnimationState =
  'idle' | 'run' | 'dash' | 'interact' | 'jumpRise' | 'fall' | 'glide';

export interface CharacterPose {
  clip: string;
  tiltDegrees: number;
  frozen: boolean;
  playOnce: boolean;
}

export interface CharacterAvatarInfo {
  avatarLoaded: boolean;
  animationCount: number;
  currentClip: string | null;
}

const POSES: Readonly<Record<CharacterAnimationState, CharacterPose>> = {
  idle: {
    clip: `${CLIP_PREFIX}Idle_Neutral`,
    tiltDegrees: 0,
    frozen: false,
    playOnce: false,
  },
  run: {
    clip: `${CLIP_PREFIX}Run`,
    tiltDegrees: 0,
    frozen: false,
    playOnce: false,
  },
  dash: {
    clip: `${CLIP_PREFIX}Roll`,
    tiltDegrees: 0,
    frozen: false,
    playOnce: false,
  },
  interact: {
    clip: `${CLIP_PREFIX}Interact`,
    tiltDegrees: 0,
    frozen: false,
    playOnce: true,
  },
  jumpRise: {
    clip: `${CLIP_PREFIX}Idle_Neutral`,
    tiltDegrees: -8,
    frozen: true,
    playOnce: false,
  },
  fall: {
    clip: `${CLIP_PREFIX}Idle_Neutral`,
    tiltDegrees: 12,
    frozen: true,
    playOnce: false,
  },
  glide: {
    clip: `${CLIP_PREFIX}Idle_Neutral`,
    tiltDegrees: 25,
    frozen: true,
    playOnce: false,
  },
};

export function getCharacterPose(
  state: CharacterAnimationState,
): CharacterPose {
  return POSES[state];
}

function disposeObject(object: Object3D): void {
  const materials = new Set<Material>();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) {
      for (const material of child.material) materials.add(material);
    } else {
      materials.add(child.material);
    }
  });
  for (const material of materials) material.dispose();
}

export class CharacterAvatar {
  public readonly object = new Group();
  private readonly facing = new Group();
  private readonly tilt = new Group();
  private readonly fallback: Mesh;
  private model: Object3D | undefined;
  private mixer: AnimationMixer | undefined;
  private readonly actions = new Map<string, AnimationAction>();
  private currentAction: AnimationAction | undefined;
  private currentClip: string | null = null;
  private animationCount = 0;
  private loaded = false;
  private disposed = false;
  private interactionRequested = false;
  private interactionRemaining = 0;
  private locomotionState: CharacterAnimationState = 'idle';
  private horizontalSpeed = 0;
  private reducedMotion = false;
  private landingElapsed: number | undefined;

  public constructor() {
    this.object.name = 'character-avatar';
    this.facing.name = 'character-facing';
    this.tilt.name = 'character-tilt';
    this.object.add(this.facing);
    this.facing.add(this.tilt);

    this.fallback = new Mesh(
      new CapsuleGeometry(
        tuning.characterRadius,
        tuning.characterHalfHeight * 2,
        6,
        12,
      ),
      createSkinnedNeonMaterial(PALETTE.neonMagenta, 3.2),
    );
    this.fallback.name = 'character-loading-fallback';
    this.tilt.add(this.fallback);

    void this.loadModel();
  }

  public update(
    deltaSeconds: number,
    state: CharacterAnimationState,
    horizontalVelocity: Readonly<{ x: number; z: number }>,
  ): void {
    this.locomotionState = state;
    this.horizontalSpeed = Math.hypot(
      horizontalVelocity.x,
      horizontalVelocity.z,
    );

    if (this.horizontalSpeed > 0.05) {
      const targetYaw = Math.atan2(horizontalVelocity.x, horizontalVelocity.z);
      const yawDelta =
        MathUtils.euclideanModulo(
          targetYaw - this.facing.rotation.y + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      const blend = 1 - Math.exp(-TURN_RESPONSE * deltaSeconds);
      this.facing.rotation.y += yawDelta * blend;
    }

    const activeState = this.interactionRequested ? 'interact' : state;
    this.applyPose(activeState);
    this.mixer?.update(deltaSeconds);
    this.updateLandingScale(deltaSeconds);

    if (this.interactionRequested && this.interactionRemaining > 0) {
      this.interactionRemaining -= deltaSeconds;
      if (this.interactionRemaining <= 0) this.interactionRequested = false;
    }
  }

  public triggerInteraction(): void {
    this.interactionRequested = true;
    const action = this.actions.get(getCharacterPose('interact').clip);
    this.interactionRemaining = action?.getClip().duration ?? 0;
    if (action) {
      action.reset();
      if (this.currentAction === action) action.play();
    }
  }

  public setReducedMotion(reducedMotion: boolean): void {
    this.reducedMotion = reducedMotion;
    if (reducedMotion) {
      this.landingElapsed = undefined;
      this.facing.scale.setScalar(1);
    }
  }

  public triggerLanding(): void {
    if (!this.reducedMotion) this.landingElapsed = 0;
  }

  public getRunCyclePhase(): number | undefined {
    if (this.locomotionState !== 'run') return undefined;
    const runAction = this.actions.get(getCharacterPose('run').clip);
    const duration = runAction?.getClip().duration ?? 0;
    if (!runAction || duration <= Number.EPSILON) return undefined;
    return MathUtils.euclideanModulo(runAction.time / duration, 1);
  }

  public getInfo(): CharacterAvatarInfo {
    return {
      avatarLoaded: this.loaded,
      animationCount: this.animationCount,
      currentClip: this.currentClip,
    };
  }

  public dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.model) disposeObject(this.model);
    disposeObject(this.fallback);
    this.object.removeFromParent();
  }

  private async loadModel(): Promise<void> {
    try {
      const { GLTFLoader } =
        await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(
        `${import.meta.env.BASE_URL}assets/character.glb`,
      );
      if (this.disposed) {
        disposeObject(gltf.scene);
        return;
      }
      this.installModel(gltf);
    } catch (error) {
      console.warn(
        'Character avatar could not be loaded; retaining fallback.',
        error,
      );
    }
  }

  private installModel(gltf: GLTF): void {
    this.model = gltf.scene;
    this.model.name = 'character-model';
    this.model.scale.setScalar(MODEL_SCALE);
    this.model.position.y = MODEL_FLOOR_OFFSET;

    const originalMaterials = new Set<Material>();
    const body = createSkinnedStructureMaterial();
    const cyan = createSkinnedNeonMaterial(PALETTE.neonCyan, 3.1);
    const magenta = createSkinnedNeonMaterial(PALETTE.neonMagenta, 2.8);
    this.model.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.frustumCulled = false;
      const source = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of source) originalMaterials.add(material);
      const replacements = source.map((material) => {
        if (material.name === 'Accent' || material.name === 'Blade') {
          return magenta;
        }
        if (material.name === 'Blade_Edge') return cyan;
        return body;
      });
      child.material = Array.isArray(child.material)
        ? replacements
        : (replacements[0] ?? body);
    });
    for (const material of originalMaterials) material.dispose();

    this.mixer = new AnimationMixer(this.model);
    this.animationCount = gltf.animations.length;
    for (const clip of gltf.animations) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }

    this.tilt.remove(this.fallback);
    this.fallback.geometry.dispose();
    if (Array.isArray(this.fallback.material)) {
      for (const material of this.fallback.material) material.dispose();
    } else {
      this.fallback.material.dispose();
    }
    this.tilt.add(this.model);
    this.loaded = true;
    if (this.interactionRequested) {
      this.interactionRemaining =
        this.actions.get(getCharacterPose('interact').clip)?.getClip()
          .duration ?? 0;
    }
    this.applyPose(
      this.interactionRequested ? 'interact' : this.locomotionState,
    );
  }

  private applyPose(state: CharacterAnimationState): void {
    const pose = getCharacterPose(state);
    this.tilt.rotation.x = MathUtils.degToRad(pose.tiltDegrees);
    const nextAction = this.actions.get(pose.clip);
    if (!nextAction) return;

    if (this.currentAction !== nextAction) {
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.setLoop(
        pose.playOnce ? LoopOnce : LoopRepeat,
        pose.playOnce ? 1 : Infinity,
      );
      nextAction.clampWhenFinished = pose.playOnce;
      nextAction.play();
      if (this.currentAction) {
        nextAction.crossFadeFrom(this.currentAction, CROSSFADE_SECONDS, true);
      }
      this.currentAction = nextAction;
      this.currentClip = pose.clip;
    }

    nextAction.paused = pose.frozen;
    if (pose.frozen) nextAction.time = 0;
    nextAction.setEffectiveTimeScale(
      state === 'run'
        ? MathUtils.clamp(this.horizontalSpeed / tuning.runSpeed, 0.8, 1.25)
        : 1,
    );
  }

  private updateLandingScale(deltaSeconds: number): void {
    if (this.landingElapsed === undefined) return;
    this.landingElapsed += deltaSeconds;
    const progress = Math.min(
      1,
      this.landingElapsed / tuning.landingSquashDuration,
    );
    const deformation =
      progress < 0.5
        ? Math.sin((progress / 0.5) * Math.PI)
        : -0.42 * Math.sin(((progress - 0.5) / 0.5) * Math.PI);
    this.facing.scale.set(
      1 + deformation * 0.1,
      1 - deformation * 0.22,
      1 + deformation * 0.1,
    );
    if (progress === 1) {
      this.landingElapsed = undefined;
      this.facing.scale.setScalar(1);
    }
  }
}
