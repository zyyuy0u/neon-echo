import {
  ColliderDesc,
  RigidBodyDesc,
  type Collider,
  type World,
} from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Scene,
} from 'three';

import {
  createHighlightMaterial,
  createNeonMaterial,
} from '../render/materials';
import { PALETTE } from '../render/palette';
import { PuzzleState, type PuzzleId } from '../systems/puzzles/PuzzleState';

interface Position {
  x: number;
  y: number;
  z: number;
}

export interface GameplayWorldEvents {
  onPuzzleProgress?: (id: PuzzleId, completed: boolean) => void;
}

const PULSE_POSITIONS = [
  [-12, 2, -322],
  [10, 3, -334],
  [-10, 4, -346],
  [8, 3, -358],
] as const;

const SWITCH_POSITIONS = [
  [322, 1, -42],
  [342, 1, -42],
  [362, 1, -42],
] as const;

const ALTARS: Readonly<Record<PuzzleId, Position>> = {
  pulseTrack: { x: 0, y: 4, z: -374 },
  lightBridge: { x: 350, y: 4, z: -66 },
  windWell: { x: -360, y: 4, z: 72 },
};

export class GameplayWorld {
  private readonly root = new Group();
  private readonly pulseMeshes: Mesh[] = [];
  private readonly pulseColliders: Collider[] = [];
  private readonly bridge: Mesh;
  private readonly bridgeCollider: Collider;
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly occupiedPulseSegments = new Set<number>();
  private readonly occupiedSwitches = new Set<number>();
  private elapsedSeconds = 0;

  public constructor(
    scene: Scene,
    private readonly physicsWorld: World,
    private readonly puzzles: PuzzleState,
    private readonly events: GameplayWorldEvents = {},
  ) {
    this.root.name = 'gameplay-puzzle-world';
    scene.add(this.root);

    const pulseGeometry = new BoxGeometry(10, 0.8, 8);
    const pulseMaterial = createNeonMaterial(PALETTE.neonCyan, 3.5);
    this.disposables.push(pulseGeometry, pulseMaterial);
    PULSE_POSITIONS.forEach(([x, y, z], index) => {
      const mesh = new Mesh(pulseGeometry, pulseMaterial);
      mesh.name = `pulse-platform-${index}`;
      mesh.position.set(x, y, z);
      this.root.add(mesh);
      this.pulseMeshes.push(mesh);
      const body = physicsWorld.createRigidBody(
        RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z),
      );
      const collider = physicsWorld.createCollider(
        ColliderDesc.cuboid(5, 0.4, 4),
        body,
      );
      this.pulseColliders.push(collider);
    });

    const switchGeometry = new CylinderGeometry(3, 3, 0.5, 12);
    const switchMaterial = createNeonMaterial(PALETTE.neonMagenta, 3);
    this.disposables.push(switchGeometry, switchMaterial);
    SWITCH_POSITIONS.forEach(([x, y, z], index) => {
      const mesh = new Mesh(switchGeometry, switchMaterial);
      mesh.name = `light-bridge-switch-${index}`;
      mesh.position.set(x, y, z);
      this.root.add(mesh);
    });

    const bridgeGeometry = new BoxGeometry(34, 0.8, 8);
    const bridgeMaterial = createHighlightMaterial();
    this.disposables.push(bridgeGeometry, bridgeMaterial);
    this.bridge = new Mesh(bridgeGeometry, bridgeMaterial);
    this.bridge.name = 'light-bridge';
    this.bridge.position.set(350, 2, -54);
    this.bridge.visible = false;
    this.root.add(this.bridge);
    const bridgeBody = physicsWorld.createRigidBody(
      RigidBodyDesc.fixed().setTranslation(350, 2, -54),
    );
    this.bridgeCollider = physicsWorld.createCollider(
      ColliderDesc.cuboid(17, 0.4, 4),
      bridgeBody,
    );
    this.bridgeCollider.setEnabled(false);

    const updraftGeometry = new CylinderGeometry(8, 8, 36, 20, 1, true);
    const updraftMaterial = new MeshStandardMaterial({
      color: PALETTE.neonCyan,
      emissive: PALETTE.neonCyan,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.16,
      side: 2,
    });
    this.disposables.push(updraftGeometry, updraftMaterial);
    const updraft = new Mesh(updraftGeometry, updraftMaterial);
    updraft.name = 'wind-well-updraft';
    updraft.position.set(-360, 18, 48);
    this.root.add(updraft);
  }

  public update(deltaSeconds: number, player: Position): void {
    this.elapsedSeconds += deltaSeconds;
    const active = this.puzzles.pulseTrack.getActiveSegments(
      this.elapsedSeconds,
    );
    this.pulseMeshes.forEach((mesh, index) => {
      const enabled = active.includes(index);
      mesh.visible = enabled;
      mesh.position.y = PULSE_POSITIONS[index]?.[1] ?? 0;
      this.pulseColliders[index]?.setEnabled(enabled);
      const pulse = PULSE_POSITIONS[index];
      const occupied =
        pulse !== undefined &&
        this.isNear(player, { x: pulse[0], y: pulse[1], z: pulse[2] }, 7);
      if (occupied && !this.occupiedPulseSegments.has(index)) {
        const wasCompleted = this.puzzles.pulseTrack.completed;
        const progressed = this.puzzles.pulseTrack.visit(
          index,
          this.elapsedSeconds,
        );
        if (!wasCompleted && progressed) {
          this.events.onPuzzleProgress?.(
            'pulseTrack',
            !wasCompleted && this.puzzles.pulseTrack.completed,
          );
        }
      }
      if (occupied) this.occupiedPulseSegments.add(index);
      else this.occupiedPulseSegments.delete(index);
    });

    SWITCH_POSITIONS.forEach(([x, y, z], index) => {
      const occupied = this.isNear(player, { x, y, z }, 3.5);
      if (occupied && !this.occupiedSwitches.has(index)) {
        const wasCompleted = this.puzzles.lightBridge.completed;
        const progressed = this.puzzles.lightBridge.stepOn(index);
        if (!wasCompleted && progressed) {
          this.events.onPuzzleProgress?.(
            'lightBridge',
            !wasCompleted && this.puzzles.lightBridge.completed,
          );
        }
      }
      if (occupied) this.occupiedSwitches.add(index);
      else this.occupiedSwitches.delete(index);
    });
    const bridgeEnabled = this.puzzles.lightBridge.completed;
    this.bridge.visible = bridgeEnabled;
    this.bridgeCollider.setEnabled(bridgeEnabled);

    if (this.isInUpdraft(player) && player.y >= 28) {
      const wasCompleted = this.puzzles.windWell.completed;
      this.puzzles.windWell.reachHeight(player.y, 28);
      if (!wasCompleted && this.puzzles.windWell.completed) {
        this.events.onPuzzleProgress?.('windWell', true);
      }
    }
  }

  public isInUpdraft(player: Position): boolean {
    return (
      Math.hypot(player.x + 360, player.z - 48) <= 8 &&
      player.y >= 0 &&
      player.y <= 38
    );
  }

  public getNearbyAltar(
    player: Position,
    radius: number,
  ): PuzzleId | undefined {
    return (Object.keys(ALTARS) as PuzzleId[]).find((id) =>
      this.isNear(player, ALTARS[id], radius),
    );
  }

  public dispose(scene: Scene): void {
    scene.remove(this.root);
    for (const collider of this.pulseColliders) {
      this.physicsWorld.removeRigidBody(collider.parent()!);
    }
    this.physicsWorld.removeRigidBody(this.bridgeCollider.parent()!);
    for (const disposable of this.disposables) disposable.dispose();
  }

  private isNear(a: Position, b: Position, radius: number): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= radius;
  }
}
