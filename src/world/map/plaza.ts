import type { Zone } from './types';

export const PLAZA: Zone = {
  id: 'plaza',
  name: 'Stasis Plaza',
  entryRequires: [],
  bounds: { min: [-70, -4, -70], max: [70, 28, 70] },
  discoveryRadius: 70,
  warpPoint: [0, 1.2, 0],
  platforms: [
    {
      id: 'plaza-ground',
      kind: 'platform',
      position: [0, -1, 0],
      size: [140, 2, 140],
      accent: 'cyan',
    },
    {
      id: 'plaza-core-dais',
      kind: 'platform',
      position: [0, 0.4, 20],
      size: [22, 0.8, 22],
      accent: 'magenta',
    },
    {
      id: 'plaza-south-guide-1',
      kind: 'platform',
      position: [0, 0.12, -28],
      size: [8, 0.24, 18],
      accent: 'cyan',
    },
    {
      id: 'plaza-south-guide-2',
      kind: 'platform',
      position: [0, 0.18, -52],
      size: [8, 0.36, 20],
      accent: 'cyan',
    },
    {
      id: 'plaza-east-step',
      kind: 'platform',
      position: [60, 0.45, 0],
      size: [18, 0.9, 18],
      accent: 'magenta',
    },
    {
      id: 'plaza-west-step',
      kind: 'platform',
      position: [-60, 0.8, 0],
      size: [18, 1.6, 18],
      accent: 'yellow',
    },
    {
      id: 'plaza-north-gate',
      kind: 'structure',
      position: [0, 5, 62],
      size: [32, 10, 3],
      accent: 'magenta',
    },
  ],
  shards: [
    { id: 'shard-plaza-01', position: [4, 1.5, -18], requires: [] },
    { id: 'shard-plaza-02', position: [-16, 1.5, -42], requires: [] },
    { id: 'shard-plaza-03', position: [21, 1.5, 8], requires: [] },
    { id: 'shard-plaza-04', position: [-30, 1.5, 24], requires: [] },
    { id: 'shard-plaza-05', position: [50, 2.1, -4], requires: [] },
    { id: 'shard-plaza-06', position: [-50, 2.5, -4], requires: [] },
  ],
  steles: [
    { id: 'stele-plaza-01', position: [14, 2.5, -30], requires: [] },
    { id: 'stele-plaza-02', position: [-20, 2.5, 38], requires: [] },
  ],
};
