import type { Ability } from '../../world/map/types';

export const TUTORIAL_IDS = ['jumpGap', 'dashMove', 'firstStele'] as const;

export type TutorialId = (typeof TUTORIAL_IDS)[number];
export type TutorialFlags = Record<TutorialId, boolean>;

interface ProximityTrigger {
  kind: 'proximity';
  position: readonly [number, number, number];
  radius: number;
}

interface AbilityMovementTrigger {
  kind: 'abilityMovement';
  ability: Ability;
}

export interface TutorialDefinition {
  id: TutorialId;
  messageKey: string;
  action: 'jump' | 'dash' | 'interact';
  flag: TutorialId;
  trigger: ProximityTrigger | AbilityMovementTrigger;
}

export interface TutorialContext {
  position: Readonly<{ x: number; y: number; z: number }>;
  moving: boolean;
  abilities: ReadonlySet<Ability>;
}

export const TUTORIAL_DEFINITIONS: readonly TutorialDefinition[] = [
  {
    id: 'jumpGap',
    messageKey: 'tutorial.jump',
    action: 'jump',
    flag: 'jumpGap',
    trigger: {
      kind: 'proximity',
      position: [0, 1.2, -66],
      radius: 3,
    },
  },
  {
    id: 'dashMove',
    messageKey: 'tutorial.dash',
    action: 'dash',
    flag: 'dashMove',
    trigger: { kind: 'abilityMovement', ability: 'dash' },
  },
  {
    id: 'firstStele',
    messageKey: 'tutorial.interact',
    action: 'interact',
    flag: 'firstStele',
    trigger: {
      kind: 'proximity',
      position: [14, 2.5, -30],
      radius: 4.5,
    },
  },
];

export function createDefaultTutorialFlags(): TutorialFlags {
  return { jumpGap: false, dashMove: false, firstStele: false };
}

export function getTriggeredTutorial(
  flags: Readonly<TutorialFlags>,
  context: TutorialContext,
): TutorialDefinition | undefined {
  return TUTORIAL_DEFINITIONS.find((definition) => {
    if (flags[definition.flag]) return false;
    const trigger = definition.trigger;
    if (trigger.kind === 'abilityMovement') {
      return context.moving && context.abilities.has(trigger.ability);
    }
    return (
      Math.hypot(
        context.position.x - trigger.position[0],
        context.position.y - trigger.position[1],
        context.position.z - trigger.position[2],
      ) <= trigger.radius
    );
  });
}

export class TutorialSystem {
  private flags = createDefaultTutorialFlags();

  public restore(flags: Readonly<TutorialFlags>): void {
    this.flags = { ...flags };
  }

  public getFlags(): TutorialFlags {
    return { ...this.flags };
  }

  public trigger(context: TutorialContext): TutorialDefinition | undefined {
    const definition = getTriggeredTutorial(this.flags, context);
    if (definition) this.flags[definition.flag] = true;
    return definition;
  }
}
