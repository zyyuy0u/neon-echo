import type { Ability } from '../../world/map/types';

export interface AbilityUnlockEvent {
  ability: Ability;
}

export type AbilityUnlockListener = (event: AbilityUnlockEvent) => void;

export class AbilityState {
  private readonly unlocked = new Set<Ability>();
  private readonly listeners = new Set<AbilityUnlockListener>();

  public constructor(initial: readonly Ability[] = []) {
    for (const ability of initial) this.unlocked.add(ability);
  }

  public has(ability: Ability): boolean {
    return this.unlocked.has(ability);
  }

  public getAll(): readonly Ability[] {
    return [...this.unlocked];
  }

  public unlock(ability: Ability): boolean {
    if (this.unlocked.has(ability)) return false;
    this.unlocked.add(ability);
    const event = { ability } satisfies AbilityUnlockEvent;
    for (const listener of this.listeners) listener(event);
    return true;
  }

  public restore(abilities: readonly Ability[]): void {
    this.unlocked.clear();
    for (const ability of abilities) this.unlocked.add(ability);
  }

  public onUnlock(listener: AbilityUnlockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
