import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  EdgesGeometry,
  Euler,
  Group,
  LineSegments,
  Mesh,
  PlaneGeometry,
  Quaternion,
  type Material,
  type Scene,
} from 'three';

import {
  createEdgeMaterial,
  createGridMaterial,
  createHighlightMaterial,
  createNeonMaterial,
  createStructureMaterial,
  type NeonColor,
} from '../render/materials';
import { PALETTE } from '../render/palette';

interface GrayboxPiece {
  name: string;
  size: readonly [number, number, number];
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  accent: NeonColor | typeof PALETTE.warningYellow;
}

const stairs: GrayboxPiece[] = Array.from({ length: 6 }, (_, index) => ({
  name: `stair-${index + 1}`,
  size: [1.8, 0.2, 0.55],
  position: [10, 0.1 + index * 0.2, -4 - index * 0.55],
  accent: PALETTE.neonMagenta,
}));

export const GRAYBOX_PIECES: readonly GrayboxPiece[] = [
  {
    name: 'ground',
    size: [42, 1, 42],
    position: [0, -0.5, 0],
    accent: PALETTE.neonCyan,
  },
  {
    name: 'low-platform',
    size: [4, 0.6, 4],
    position: [-6, 0.3, -5],
    accent: PALETTE.neonCyan,
  },
  {
    name: 'medium-platform',
    size: [4, 1.3, 4],
    position: [-6, 0.65, 1],
    accent: PALETTE.neonMagenta,
  },
  {
    name: 'high-platform',
    size: [4, 2, 4],
    position: [-6, 1, 7],
    accent: PALETTE.warningYellow,
  },
  {
    name: 'ramp',
    size: [7, 0.45, 3],
    position: [5.5, 1.15, 5],
    rotation: [0, 0, -0.28],
    accent: PALETTE.neonCyan,
  },
  {
    name: 'narrow-bridge',
    size: [1.2, 0.35, 9],
    position: [0, 2.2, 10],
    accent: PALETTE.neonCyan,
  },
  {
    name: 'wall',
    size: [10, 4, 0.5],
    position: [6, 2, -10],
    accent: PALETTE.neonMagenta,
  },
  {
    name: 'wall-return',
    size: [0.5, 3, 5],
    position: [11, 1.5, -7.5],
    accent: PALETTE.neonCyan,
  },
  ...stairs,
];

export function createGraybox(scene: Scene, world: RAPIER.World): () => void {
  const group = new Group();
  group.name = 'graybox-trial-ground';
  const structureMaterial = createStructureMaterial();
  const accentMaterials = new Map<string, Material>([
    [PALETTE.neonCyan, createNeonMaterial(PALETTE.neonCyan)],
    [PALETTE.neonMagenta, createNeonMaterial(PALETTE.neonMagenta)],
    [PALETTE.warningYellow, createHighlightMaterial()],
  ]);
  const edgeMaterials = new Map([
    [PALETTE.neonCyan, createEdgeMaterial(PALETTE.neonCyan)],
    [PALETTE.neonMagenta, createEdgeMaterial(PALETTE.neonMagenta)],
    [PALETTE.warningYellow, createEdgeMaterial(PALETTE.warningYellow)],
  ]);
  const gridMaterial = createGridMaterial();

  for (const piece of GRAYBOX_PIECES) {
    const geometry = new BoxGeometry(...piece.size);
    const usesAccentSurface =
      piece.name === 'narrow-bridge' || piece.name.startsWith('stair-');
    const material = usesAccentSurface
      ? accentMaterials.get(piece.accent)!
      : structureMaterial;
    const mesh = new Mesh(geometry, material);
    mesh.name = piece.name;
    mesh.position.set(...piece.position);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    group.add(mesh);

    const outline = new LineSegments(
      new EdgesGeometry(geometry, 30),
      edgeMaterials.get(piece.accent),
    );
    outline.name = `${piece.name}-neon-outline`;
    outline.position.copy(mesh.position);
    outline.rotation.copy(mesh.rotation);
    group.add(outline);

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

  const grid = new Mesh(new PlaneGeometry(42, 42, 1, 1), gridMaterial);
  grid.name = 'neon-grid-ground';
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.012;
  group.add(grid);

  scene.add(group);
  return () => {
    scene.remove(group);
    group.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
      if (object instanceof LineSegments) object.geometry.dispose();
    });
    structureMaterial.dispose();
    gridMaterial.dispose();
    for (const material of accentMaterials.values()) material.dispose();
    for (const material of edgeMaterials.values()) material.dispose();
  };
}
