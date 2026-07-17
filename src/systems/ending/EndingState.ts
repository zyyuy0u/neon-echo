import type { Ability } from '../../world/map/types';

export type EndingChoice = 'awaken' | 'rest';
export type EndingPhase = 'locked' | 'ready' | 'choosing' | 'resolved';

const REQUIRED_ABILITIES: readonly Ability[] = ['dash', 'doubleJump', 'glide'];

export class EndingState {
  private choice: EndingChoice | undefined;
  private choosing = false;

  public constructor(
    private shardCount = 0,
    private abilities: ReadonlySet<Ability> = new Set(),
  ) {}

  public updateRequirements(
    shardCount: number,
    abilities: ReadonlySet<Ability>,
  ): void {
    this.shardCount = shardCount;
    this.abilities = abilities;
  }

  public canInteract(): boolean {
    return (
      this.choice === undefined &&
      this.shardCount >= 30 &&
      REQUIRED_ABILITIES.every((ability) => this.abilities.has(ability))
    );
  }

  public interact(): boolean {
    if (!this.canInteract()) return false;
    this.choosing = true;
    return true;
  }

  public choose(choice: EndingChoice): boolean {
    if (!this.choosing || this.choice !== undefined) return false;
    this.choice = choice;
    this.choosing = false;
    return true;
  }

  public getChoice(): EndingChoice | undefined {
    return this.choice;
  }

  public restore(choice: EndingChoice | null): void {
    this.choice = choice ?? undefined;
    this.choosing = false;
  }

  public getPhase(): EndingPhase {
    if (this.choice) return 'resolved';
    if (this.choosing) return 'choosing';
    return this.canInteract() ? 'ready' : 'locked';
  }
}
