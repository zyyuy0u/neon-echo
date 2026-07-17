export interface CollectiblePosition {
  id: string;
  position: readonly [x: number, y: number, z: number];
}

export interface ShardCollectedEvent {
  id: string;
  count: number;
}

export type ShardCollectedListener = (event: ShardCollectedEvent) => void;

export class CollectibleState {
  private readonly collected = new Set<string>();
  private readonly listeners = new Set<ShardCollectedListener>();

  public constructor(private readonly shards: readonly CollectiblePosition[]) {}

  public get count(): number {
    return this.collected.size;
  }

  public has(id: string): boolean {
    return this.collected.has(id);
  }

  public getAll(): readonly string[] {
    return [...this.collected];
  }

  public restore(ids: readonly string[]): void {
    this.collected.clear();
    for (const id of ids) {
      if (this.shards.some((shard) => shard.id === id)) this.collected.add(id);
    }
  }

  public collect(id: string): boolean {
    if (
      this.collected.has(id) ||
      !this.shards.some((shard) => shard.id === id)
    ) {
      return false;
    }
    this.collected.add(id);
    const event = { id, count: this.count } satisfies ShardCollectedEvent;
    for (const listener of this.listeners) listener(event);
    return true;
  }

  public collectNearest(
    position: Readonly<{ x: number; y: number; z: number }>,
    radius: number,
  ): string | undefined {
    let nearest: CollectiblePosition | undefined;
    let nearestDistanceSquared = radius * radius;
    for (const shard of this.shards) {
      if (this.collected.has(shard.id)) continue;
      const dx = shard.position[0] - position.x;
      const dy = shard.position[1] - position.y;
      const dz = shard.position[2] - position.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared <= nearestDistanceSquared) {
        nearest = shard;
        nearestDistanceSquared = distanceSquared;
      }
    }
    if (!nearest) return undefined;
    this.collect(nearest.id);
    return nearest.id;
  }

  public onCollect(listener: ShardCollectedListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
