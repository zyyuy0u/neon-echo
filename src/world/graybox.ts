import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  type Scene,
} from 'three';

import { PALETTE } from '../render/palette';

interface GrayboxPiece {
  name: string;
  size: readonly [number, number, number];
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  color: string;
}

const stairs: GrayboxPiece[] = Array.from({ length: 6 }, (_, index) => ({
  name: `stair-${index + 1}`,
  size: [1.8, 0.2, 0.55],
  position: [10, 0.1 + index * 0.2, -4 - index * 0.55],
  color: PALETTE.warningYellow,
}));

export const GRAYBOX_PIECES: readonly GrayboxPiece[] = [
  {
    name: 'ground',
    size: [42, 1, 42],
    position: [0, -0.5, 0],
    color: PALETTE.structureBlue,
  },
  {
    name: 'low-platform',
    size: [4, 0.6, 4],
    position: [-6, 0.3, -5],
    color: PALETTE.neonCyan,
  },
  {
    name: 'medium-platform',
    size: [4, 1.3, 4],
    position: [-6, 0.65, 1],
    color: PALETTE.neonMagenta,
  },
  {
    name: 'high-platform',
    size: [4, 2, 4],
    position: [-6, 1, 7],
    color: PALETTE.warningYellow,
  },
  {
    name: 'ramp',
    size: [7, 0.45, 3],
    position: [5.5, 1.15, 5],
    rotation: [0, 0, -0.28],
    color: PALETTE.neonCyan,
  },
  {
    name: 'narrow-bridge',
    size: [1.2, 0.35, 9],
    position: [0, 2.2, 10],
    color: PALETTE.neonMagenta,
  },
  {
    name: 'wall',
    size: [10, 4, 0.5],
    position: [6, 2, -10],
    color: PALETTE.neonMagenta,
  },
  {
    name: 'wall-return',
    size: [0.5, 3, 5],
    position: [11, 1.5, -7.5],
    color: PALETTE.neonCyan,
  },
  ...stairs,
];

export function createGraybox(scene: Scene, world: RAPIER.World): () => void {
  const group = new Group();
  group.name = 'graybox-trial-ground';
  const materials = new Map<string, MeshStandardMaterial>();

  for (const piece of GRAYBOX_PIECES) {
    let material = materials.get(piece.color);
    if (!material) {
      material = new MeshStandardMaterial({
        color: piece.color,
        emissive: piece.color,
        emissiveIntensity: 1.4,
        roughness: 0.7,
        wireframe: true,
      });
      materials.set(piece.color, material);
    }

    const geometry = new BoxGeometry(...piece.size);
    const mesh = new Mesh(geometry, material);
    mesh.name = piece.name;
    mesh.position.set(...piece.position);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    group.add(mesh);

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(...piece.position),
    );
    const rotation = new Quaternion().setFromEuler(
      new Euler(...(piece.rotation ?? [0, 0, 0])),
    );
    body.setRotation(rotation, false);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        piece.size[0] / 2,
        piece.size[1] / 2,
        piece.size[2] / 2,
      ),
      body,
    );
  }

  scene.add(group);
  return () => {
    scene.remove(group);
    group.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    for (const material of materials.values()) material.dispose();
  };
}
