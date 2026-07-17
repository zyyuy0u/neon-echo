export type Ability = 'dash' | 'doubleJump' | 'glide';

export type ZoneId = 'plaza' | 'skylift' | 'spire' | 'ring' | 'chasm';

export type Vector3Tuple = readonly [x: number, y: number, z: number];

export interface ZoneBounds {
  min: Vector3Tuple;
  max: Vector3Tuple;
}

export interface Platform {
  id: string;
  kind: 'platform' | 'ramp' | 'structure';
  position: Vector3Tuple;
  size: Vector3Tuple;
  rotation?: Vector3Tuple;
  accent?: 'cyan' | 'magenta' | 'yellow';
}

export interface Landmark {
  id: string;
  name: string;
  kind: 'skyLift' | 'spire' | 'ring' | 'chasmCore';
  position: Vector3Tuple;
  scale: Vector3Tuple;
  rotation?: Vector3Tuple;
  topRequires: readonly Ability[];
}

export interface ShardPlacement {
  id: string;
  position: Vector3Tuple;
  requires: readonly Ability[];
}

export interface StelePlacement {
  id: string;
  position: Vector3Tuple;
  requires: readonly Ability[];
}

export interface SanctuaryEntrance {
  id: string;
  position: Vector3Tuple;
  requires: readonly Ability[];
  grants: Ability;
}

export interface Zone {
  id: ZoneId;
  name: string;
  entryRequires: readonly Ability[];
  bounds: ZoneBounds;
  platforms: readonly Platform[];
  landmark?: Landmark;
  shards: readonly ShardPlacement[];
  steles: readonly StelePlacement[];
  sanctuary?: SanctuaryEntrance;
}

export type GraphNodeKind =
  | 'zone'
  | 'landmarkTop'
  | 'shard'
  | 'stele'
  | 'sanctuary'
  | 'core';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  zoneId: ZoneId;
  position?: Vector3Tuple;
}

export interface GraphEdge {
  from: string;
  to: string;
  requires: readonly Ability[];
}
