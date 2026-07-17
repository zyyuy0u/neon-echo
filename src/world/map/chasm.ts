import type { Zone } from './types';

export const CHASM: Zone = {
  id: 'chasm',
  name: 'North · Lumen Chasm',
  entryRequires: ['dash', 'doubleJump', 'glide'],
  bounds: { min: [-110, -28, 70], max: [110, 110, 410] },
  platforms: [
    {
      id: 'chasm-bridge',
      kind: 'platform',
      position: [0, -1, 100],
      size: [28, 2, 60],
      accent: 'yellow',
    },
    {
      id: 'chasm-south-rim',
      kind: 'platform',
      position: [0, -1, 168],
      size: [220, 2, 76],
      accent: 'cyan',
    },
    {
      id: 'chasm-west-rim',
      kind: 'platform',
      position: [-84, -5, 270],
      size: [52, 10, 150],
      accent: 'magenta',
    },
    {
      id: 'chasm-east-rim',
      kind: 'platform',
      position: [84, -5, 270],
      size: [52, 10, 150],
      accent: 'cyan',
    },
    {
      id: 'chasm-floor',
      kind: 'platform',
      position: [0, -25, 292],
      size: [120, 4, 180],
      accent: 'magenta',
    },
    {
      id: 'chasm-descent-1',
      kind: 'platform',
      position: [-46, -4, 210],
      size: [30, 2, 20],
      accent: 'cyan',
    },
    {
      id: 'chasm-descent-2',
      kind: 'platform',
      position: [32, -10, 242],
      size: [30, 2, 20],
      accent: 'magenta',
    },
    {
      id: 'chasm-descent-3',
      kind: 'platform',
      position: [-22, -17, 278],
      size: [28, 2, 18],
      accent: 'yellow',
    },
    {
      id: 'chasm-core-dais',
      kind: 'platform',
      position: [0, -21, 350],
      size: [70, 4, 54],
      accent: 'yellow',
    },
  ],
  landmark: {
    id: 'landmark-chasm',
    name: 'Lumen Chasm Core',
    kind: 'chasmCore',
    position: [0, -21, 340],
    scale: [46, 92, 46],
    topRequires: ['dash', 'doubleJump', 'glide'],
  },
  shards: [
    {
      id: 'shard-chasm-01',
      position: [0, 1.5, 106],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-02',
      position: [-62, 1.5, 166],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-03',
      position: [74, 1.5, 184],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-04',
      position: [-46, -2, 210],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-05',
      position: [32, -8, 242],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-06',
      position: [-22, -15, 278],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-07',
      position: [42, -21, 318],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'shard-chasm-08',
      position: [0, -17, 350],
      requires: ['dash', 'doubleJump', 'glide'],
    },
  ],
  steles: [
    {
      id: 'stele-chasm-01',
      position: [-72, 2.5, 184],
      requires: ['dash', 'doubleJump', 'glide'],
    },
    {
      id: 'stele-chasm-02',
      position: [26, -20, 350],
      requires: ['dash', 'doubleJump', 'glide'],
    },
  ],
};
