import {
  getAutomaticObjective,
  type ObjectiveDefinition,
  type ObjectiveProgress,
} from './objectives';

export interface ObjectiveTrackingSnapshot {
  customTargetId: string | null;
}

export interface TrackedObjective {
  id: string;
  labelKey: string;
  targetId: string;
  mode: 'automatic' | 'custom';
}

export interface CustomObjectiveTarget {
  id: string;
  labelKey: string;
}

export function createDefaultObjectiveTracking(): ObjectiveTrackingSnapshot {
  return { customTargetId: null };
}

export function resolveTrackedObjective(
  progress: ObjectiveProgress,
  snapshot: ObjectiveTrackingSnapshot,
  findCustomTarget: (id: string) => CustomObjectiveTarget | undefined,
): TrackedObjective {
  if (snapshot.customTargetId) {
    const custom = findCustomTarget(snapshot.customTargetId);
    if (custom) {
      return {
        id: `custom:${custom.id}`,
        labelKey: custom.labelKey,
        targetId: custom.id,
        mode: 'custom',
      };
    }
  }
  const automatic: ObjectiveDefinition = getAutomaticObjective(progress);
  return { ...automatic, mode: 'automatic' };
}

export class ObjectiveTracker {
  private customTargetId: string | null = null;

  public constructor(snapshot = createDefaultObjectiveTracking()) {
    this.restore(snapshot);
  }

  public setCustomTarget(targetId: string | null): void {
    this.customTargetId = targetId;
  }

  public getSnapshot(): ObjectiveTrackingSnapshot {
    return { customTargetId: this.customTargetId };
  }

  public restore(snapshot: ObjectiveTrackingSnapshot): void {
    this.customTargetId = snapshot.customTargetId;
  }
}
