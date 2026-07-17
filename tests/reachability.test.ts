import { describe, expect, it } from 'vitest';

import {
  getReachableNodeIds,
  WORLD_GRAPH,
  WORLD_ZONES,
} from '../src/world/map/graph';
import type { Ability } from '../src/world/map/types';

const allAbilities: readonly Ability[] = ['dash', 'doubleJump', 'glide'];

describe('world reachability graph', () => {
  it('opens the south first and preserves the three regional gates', () => {
    const baseReachable = getReachableNodeIds([]);
    expect(baseReachable.has('zone-skylift')).toBe(true);
    expect(baseReachable.has('zone-spire')).toBe(false);
    expect(baseReachable.has('zone-ring')).toBe(false);
    expect(baseReachable.has('zone-chasm')).toBe(false);

    expect(getReachableNodeIds(['dash']).has('zone-spire')).toBe(true);
    expect(getReachableNodeIds(['doubleJump']).has('zone-ring')).toBe(true);
    expect(getReachableNodeIds(['dash', 'doubleJump']).has('zone-chasm')).toBe(
      false,
    );
    expect(getReachableNodeIds(allAbilities).has('zone-chasm')).toBe(true);
  });

  it('requires every ability for the north core', () => {
    expect(
      getReachableNodeIds(['dash', 'doubleJump']).has('landmark-chasm'),
    ).toBe(false);
    expect(
      getReachableNodeIds(['dash', 'glide']).has('landmark-chasm'),
    ).toBe(false);
    expect(
      getReachableNodeIds(['doubleJump', 'glide']).has('landmark-chasm'),
    ).toBe(false);
    expect(
      getReachableNodeIds(['dash', 'doubleJump', 'glide']).has(
        'landmark-chasm',
      ),
    ).toBe(true);
  });

  it('makes all 40 shard nodes reachable with the complete move set', () => {
    const shardNodes = WORLD_GRAPH.nodes.filter(
      (node) => node.kind === 'shard',
    );
    const reachable = getReachableNodeIds(allAbilities);
    expect(shardNodes).toHaveLength(40);
    expect(shardNodes.every((node) => reachable.has(node.id))).toBe(true);
  });

  it('orders sanctuary prerequisites with the ability progression', () => {
    const sanctuaryRequirements = Object.fromEntries(
      WORLD_GRAPH.edges
        .filter((edge) => edge.to.startsWith('sanctuary-'))
        .map((edge) => [edge.to, edge.requires]),
    );
    expect(sanctuaryRequirements).toEqual({
      'sanctuary-dash': [],
      'sanctuary-double-jump': ['dash'],
      'sanctuary-glide': ['doubleJump'],
    });

    expect(getReachableNodeIds([]).has('sanctuary-dash')).toBe(true);
    expect(getReachableNodeIds(['dash']).has('sanctuary-double-jump')).toBe(
      true,
    );
    expect(getReachableNodeIds(['doubleJump']).has('sanctuary-glide')).toBe(
      true,
    );
  });

  it('contains the required world and placement totals', () => {
    expect(WORLD_ZONES).toHaveLength(5);
    expect(WORLD_ZONES.filter((zone) => zone.landmark)).toHaveLength(4);
    expect(
      WORLD_ZONES.reduce((total, zone) => total + zone.shards.length, 0),
    ).toBe(40);
    expect(
      WORLD_ZONES.reduce((total, zone) => total + zone.steles.length, 0),
    ).toBe(12);
    expect(WORLD_ZONES.filter((zone) => zone.sanctuary)).toHaveLength(3);
  });
});
