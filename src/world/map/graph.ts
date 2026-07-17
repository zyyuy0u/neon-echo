import { CHASM } from './chasm';
import { PLAZA } from './plaza';
import { RING } from './ring';
import { SKYLIFT } from './skylift';
import { SPIRE } from './spire';
import type {
  Ability,
  GraphEdge,
  GraphNode,
  Vector3Tuple,
  Zone,
} from './types';

export const WORLD_ZONES = [PLAZA, SKYLIFT, SPIRE, RING, CHASM] as const;

function boundsCenter(zone: Zone): Vector3Tuple {
  return [
    (zone.bounds.min[0] + zone.bounds.max[0]) / 2,
    (zone.bounds.min[1] + zone.bounds.max[1]) / 2,
    (zone.bounds.min[2] + zone.bounds.max[2]) / 2,
  ];
}

const zoneNodes: GraphNode[] = WORLD_ZONES.map((zone) => ({
  id: `zone-${zone.id}`,
  kind: 'zone',
  zoneId: zone.id,
  position: boundsCenter(zone),
}));

const contentNodes: GraphNode[] = WORLD_ZONES.flatMap((zone) => [
  ...zone.shards.map((shard) => ({
    id: shard.id,
    kind: 'shard' as const,
    zoneId: zone.id,
    position: shard.position,
  })),
  ...zone.steles.map((stele) => ({
    id: stele.id,
    kind: 'stele' as const,
    zoneId: zone.id,
    position: stele.position,
  })),
  ...(zone.sanctuary
    ? [
        {
          id: zone.sanctuary.id,
          kind: 'sanctuary' as const,
          zoneId: zone.id,
          position: zone.sanctuary.position,
        },
      ]
    : []),
  ...(zone.landmark
    ? [
        {
          id: zone.landmark.id,
          kind: zone.id === 'chasm' ? ('core' as const) : ('landmarkTop' as const),
          zoneId: zone.id,
          position: zone.landmark.position,
        },
      ]
    : []),
]);

const zoneEntryEdges: GraphEdge[] = WORLD_ZONES.filter(
  (zone) => zone.id !== 'plaza',
).map((zone) => ({
  from: 'zone-plaza',
  to: `zone-${zone.id}`,
  requires: zone.entryRequires,
}));

const contentEdges: GraphEdge[] = WORLD_ZONES.flatMap((zone) => [
  ...zone.shards.map((shard) => ({
    from: `zone-${zone.id}`,
    to: shard.id,
    requires: shard.requires,
  })),
  ...zone.steles.map((stele) => ({
    from: `zone-${zone.id}`,
    to: stele.id,
    requires: stele.requires,
  })),
  ...(zone.sanctuary
    ? [
        {
          from: `zone-${zone.id}`,
          to: zone.sanctuary.id,
          requires: zone.sanctuary.requires,
        },
      ]
    : []),
  ...(zone.landmark
    ? [
        {
          from: `zone-${zone.id}`,
          to: zone.landmark.id,
          requires: zone.landmark.topRequires,
        },
      ]
    : []),
]);

export const WORLD_GRAPH: {
  readonly startNodeId: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
} = {
  startNodeId: 'zone-plaza',
  nodes: [...zoneNodes, ...contentNodes],
  edges: [...zoneEntryEdges, ...contentEdges],
};

function hasRequirements(
  ownedAbilities: ReadonlySet<Ability>,
  requires: readonly Ability[],
): boolean {
  return requires.every((ability) => ownedAbilities.has(ability));
}

export function getReachableNodeIds(
  abilities: readonly Ability[],
): ReadonlySet<string> {
  const ownedAbilities = new Set(abilities);
  const reachable = new Set([WORLD_GRAPH.startNodeId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of WORLD_GRAPH.edges) {
      if (
        reachable.has(edge.from) &&
        !reachable.has(edge.to) &&
        hasRequirements(ownedAbilities, edge.requires)
      ) {
        reachable.add(edge.to);
        changed = true;
      }
    }
  }

  return reachable;
}
