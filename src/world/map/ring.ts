import type { Zone } from './types';

export const RING: Zone = {
  id: 'ring',
  name: 'West · Inverted Ring',
  entryRequires: ['doubleJump'],
  bounds: { min: [-410, -8, -110], max: [-70, 130, 110] },
  discoveryRadius: 170,
  warpPoint: [-360, 4, 54],
  platforms: [
    {
      id: 'ring-bridge',
      kind: 'platform',
      position: [-100, -1, 0],
      size: [60, 2, 26],
      accent: 'magenta',
    },
    {
      id: 'ring-ground',
      kind: 'platform',
      position: [-255, -1, 0],
      size: [250, 2, 220],
      accent: 'cyan',
    },
    {
      id: 'ring-float-1',
      kind: 'platform',
      position: [-190, 8, 34],
      size: [30, 2, 24],
      accent: 'cyan',
    },
    {
      id: 'ring-float-2',
      kind: 'platform',
      position: [-235, 16, -18],
      size: [28, 2, 22],
      accent: 'magenta',
    },
    {
      id: 'ring-float-3',
      kind: 'platform',
      position: [-290, 25, 28],
      size: [30, 2, 20],
      accent: 'cyan',
    },
    {
      id: 'ring-float-4',
      kind: 'platform',
      position: [-340, 36, -24],
      size: [32, 2, 22],
      accent: 'yellow',
    },
    {
      id: 'ring-sanctuary-deck',
      kind: 'platform',
      position: [-360, 1, 66],
      size: [54, 4, 48],
      accent: 'yellow',
    },
  ],
  landmark: {
    id: 'landmark-ring',
    name: 'The Inverted Ring',
    kind: 'ring',
    position: [-290, 66, 0],
    scale: [58, 58, 12],
    rotation: [0.35, 0.2, 0.92],
    topRequires: ['doubleJump', 'glide'],
  },
  shards: [
    {
      id: 'shard-ring-01',
      position: [-104, 1.5, 0],
      requires: ['doubleJump'],
    },
    {
      id: 'shard-ring-02',
      position: [-156, 1.5, -42],
      requires: ['doubleJump'],
    },
    {
      id: 'shard-ring-03',
      position: [-190, 10, 34],
      requires: ['doubleJump'],
    },
    {
      id: 'shard-ring-04',
      position: [-235, 18, -18],
      requires: ['doubleJump'],
    },
    {
      id: 'shard-ring-05',
      position: [-290, 27, 28],
      requires: ['doubleJump'],
    },
    {
      id: 'shard-ring-06',
      position: [-340, 38, -24],
      requires: ['doubleJump', 'glide'],
    },
    {
      id: 'shard-ring-07',
      position: [-382, 1.5, -72],
      requires: ['doubleJump'],
    },
    {
      id: 'shard-ring-08',
      position: [-365, 3.5, 70],
      requires: ['doubleJump'],
    },
  ],
  steles: [
    {
      id: 'stele-ring-01',
      position: [-172, 2.5, 68],
      requires: ['doubleJump'],
    },
    {
      id: 'stele-ring-02',
      position: [-328, 2.5, -72],
      requires: ['doubleJump'],
    },
  ],
  sanctuary: {
    id: 'sanctuary-glide',
    position: [-360, 4, 72],
    requires: ['doubleJump'],
    grants: 'glide',
  },
};
