import RAPIER from '@dimforge/rapier3d-compat';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Euler,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
  type Material,
  type Scene,
} from 'three';

import {
  createGridMaterial,
  createHighlightMaterial,
  createNeonMaterial,
  createStructureMaterial,
} from '../render/materials';
import { PALETTE } from '../render/palette';
import { WORLD_ZONES } from './map/graph';
import type { Landmark, Platform, Vector3Tuple } from './map/types';

export interface WorldStats {
  zones: number;
  landmarks: number;
  shards: number;
  steles: number;
  sanctuaries: number;
}

function setTransform(
  object: Object3D,
  position: Vector3Tuple,
  scale: Vector3Tuple = [1, 1, 1],
  rotation: Vector3Tuple = [0, 0, 0],
): void {
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.updateMatrix();
}

export class WorldBuilder {
  private readonly root = new Group();
  private readonly bodies: RAPIER.RigidBody[] = [];
  private readonly materials = new Set<Material>();
  private readonly shardPositions = WORLD_ZONES.flatMap((zone) =>
    zone.shards.map((shard) => shard.position),
  );
  private shardMesh: InstancedMesh | undefined;
  private elapsedSeconds = 0;

  public constructor(
    private readonly scene: Scene,
    private readonly physicsWorld: RAPIER.World,
  ) {
    this.root.name = 'neon-echo-world';
    scene.add(this.root);
    this.buildPlatforms();
    this.buildLandmarks();
    this.buildPlacements();
    this.buildTutorialGuide();
  }

  public getStats(): WorldStats {
    return {
      zones: WORLD_ZONES.length,
      landmarks: WORLD_ZONES.filter((zone) => zone.landmark).length,
      shards: this.shardPositions.length,
      steles: WORLD_ZONES.reduce((total, zone) => total + zone.steles.length, 0),
      sanctuaries: WORLD_ZONES.filter((zone) => zone.sanctuary).length,
    };
  }

  public update(deltaSeconds: number): void {
    const shardMesh = this.shardMesh;
    if (!shardMesh) return;
    this.elapsedSeconds += deltaSeconds;
    const dummy = new Object3D();
    this.shardPositions.forEach((position, index) => {
      const bob = Math.sin(this.elapsedSeconds * 1.35 + index * 0.73) * 0.28;
      dummy.position.set(position[0], position[1] + bob, position[2]);
      dummy.rotation.set(
        this.elapsedSeconds * 0.35,
        this.elapsedSeconds * 0.7 + index * 0.31,
        0.18,
      );
      dummy.scale.setScalar(0.72);
      dummy.updateMatrix();
      shardMesh.setMatrixAt(index, dummy.matrix);
    });
    shardMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.scene.remove(this.root);
    for (const body of this.bodies) this.physicsWorld.removeRigidBody(body);
    const geometries = new Set<BufferGeometry>();
    this.root.traverse((object) => {
      if (object instanceof Mesh || object instanceof Line) {
        geometries.add(object.geometry);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }

  private buildPlatforms(): void {
    const platforms = WORLD_ZONES.flatMap((zone) => zone.platforms);
    const geometry = new BoxGeometry(1, 1, 1);
    const structureSurfaceMaterial = this.trackMaterial(
      createStructureMaterial(),
    );
    const mesh = new InstancedMesh(
      geometry,
      structureSurfaceMaterial,
      platforms.length,
    );
    mesh.name = 'world-platforms';
    const dummy = new Object3D();

    platforms.forEach((platform, index) => {
      setTransform(
        dummy,
        platform.position,
        platform.size,
        platform.rotation ?? [0, 0, 0],
      );
      mesh.setMatrixAt(index, dummy.matrix);
      this.createPlatformCollider(platform);
    });
    mesh.computeBoundingSphere();
    this.root.add(mesh);

    // Walkable tops stay dark through the structural body above. This M2 grid
    // overlay contributes cyan lines only; it never turns a platform into a
    // large emissive surface.
    const gridSurfaceMaterial = this.trackMaterial(createGridMaterial());
    const gridGeometry = new PlaneGeometry(1, 1);
    gridGeometry.rotateX(-Math.PI / 2);
    // NeonGridMaterial derives its pattern from each mesh's model matrix, so
    // keep these as shared-geometry Meshes instead of shader-blind instances.
    const gridSurfaces = new Group();
    gridSurfaces.name = 'world-platform-grid-surfaces';
    platforms.forEach((platform) => {
      const rotation = platform.rotation ?? [0, 0, 0];
      const topOffset = new Vector3(0, platform.size[1] / 2 + 0.035, 0);
      topOffset.applyEuler(new Euler(...rotation));
      const topPosition: Vector3Tuple = [
        platform.position[0] + topOffset.x,
        platform.position[1] + topOffset.y,
        platform.position[2] + topOffset.z,
      ];
      const gridSurface = new Mesh(gridGeometry, gridSurfaceMaterial);
      gridSurface.name = `${platform.id}-grid-surface`;
      setTransform(
        gridSurface,
        topPosition,
        [platform.size[0] * 0.96, 1, platform.size[2] * 0.96],
        rotation,
      );
      gridSurfaces.add(gridSurface);
    });
    this.root.add(gridSurfaces);
  }

  private createPlatformCollider(platform: Platform): void {
    const body = this.physicsWorld.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(...platform.position),
    );
    if (platform.rotation) {
      const rotation = new Quaternion().setFromEuler(
        new Euler(...platform.rotation),
      );
      body.setRotation(rotation, false);
    }
    this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(
        platform.size[0] / 2,
        platform.size[1] / 2,
        platform.size[2] / 2,
      ),
      body,
    );
    this.bodies.push(body);
  }

  private buildLandmarks(): void {
    // Landmark silhouettes are structural and fogged. Only the narrow stripe,
    // cable, outline, and beacon meshes use the unfogged emissive materials.
    const landmarkBodyMaterial = this.trackMaterial(createStructureMaterial());
    const magentaDetailMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonMagenta,
        emissive: PALETTE.neonMagenta,
        emissiveIntensity: 3,
        metalness: 0.15,
        roughness: 0.28,
        fog: false,
      }),
    );
    const cyanDetailMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonCyan,
        emissive: PALETTE.neonCyan,
        emissiveIntensity: 2.8,
        metalness: 0.15,
        roughness: 0.28,
        fog: false,
      }),
    );

    for (const zone of WORLD_ZONES) {
      if (!zone.landmark) continue;
      const group = this.createLandmark(
        zone.landmark,
        landmarkBodyMaterial,
        magentaDetailMaterial,
        cyanDetailMaterial,
      );
      group.name = zone.landmark.id;
      this.root.add(group);
      this.createLandmarkCollider(zone.landmark);
    }
  }

  private createLandmark(
    landmark: Landmark,
    body: MeshStandardMaterial,
    magentaDetail: MeshStandardMaterial,
    cyanDetail: MeshStandardMaterial,
  ): Group {
    const group = new Group();
    group.position.set(...landmark.position);
    if (landmark.rotation) group.rotation.set(...landmark.rotation);
    const [width, height, depth] = landmark.scale;

    if (landmark.kind === 'skyLift') {
      const towerGeometry = new BoxGeometry(width * 0.18, height, depth * 0.18);
      const left = new Mesh(towerGeometry, body);
      const right = new Mesh(towerGeometry, body);
      left.position.set(-width * 0.34, height / 2, 0);
      right.position.set(width * 0.34, height / 2, 0);
      const cabin = new Mesh(
        new BoxGeometry(width * 0.48, height * 0.14, depth * 0.52),
        body,
      );
      cabin.position.set(0, height * 0.37, 0);
      const cableGeometry = new CylinderGeometry(0.45, 0.45, height * 0.5, 6);
      const cableLeft = new Mesh(cableGeometry, magentaDetail);
      const cableRight = new Mesh(cableGeometry, cyanDetail);
      cableLeft.position.set(-width * 0.12, height * 0.79, 0);
      cableLeft.rotation.z = -0.08;
      cableRight.position.set(width * 0.12, height * 0.86, 0);
      cableRight.rotation.z = 0.18;
      group.add(left, right, cabin, cableLeft, cableRight);
      for (let level = 1; level <= 5; level += 1) {
        const stripeGeometry = new BoxGeometry(
          width * 0.2,
          0.55,
          depth * 0.195,
        );
        const leftStripe = new Mesh(stripeGeometry, magentaDetail);
        const rightStripe = new Mesh(stripeGeometry, cyanDetail);
        leftStripe.position.set(-width * 0.34, height * (level / 6), 0);
        rightStripe.position.set(width * 0.34, height * (level / 6), 0);
        group.add(leftStripe, rightStripe);
      }
    } else if (landmark.kind === 'spire') {
      const shaft = new Mesh(
        new CylinderGeometry(width * 0.12, width * 0.42, height, 10),
        body,
      );
      shaft.position.y = height / 2;
      group.add(shaft);
      for (let level = 1; level <= 6; level += 1) {
        const heightFraction = level / 7;
        const shaftRadius =
          width * 0.42 * (1 - heightFraction) +
          width * 0.12 * heightFraction;
        const ring = new Mesh(
          new TorusGeometry(shaftRadius + 0.45, 0.45, 6, 28),
          cyanDetail,
        );
        ring.position.y = height * heightFraction;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }
      const beaconMast = new Mesh(
        new CylinderGeometry(0.55, 0.8, height * 0.07, 8),
        magentaDetail,
      );
      beaconMast.position.y = height * 1.035;
      const beacon = new Mesh(
        new OctahedronGeometry(width * 0.075, 0),
        magentaDetail,
      );
      beacon.position.y = height * 1.085;
      group.add(beaconMast, beacon);
    } else if (landmark.kind === 'ring') {
      const outerRing = new Mesh(
        new TorusGeometry(width * 0.5, depth * 0.28, 10, 48),
        body,
      );
      const innerRing = new Mesh(
        new TorusGeometry(width * 0.35, depth * 0.12, 8, 40),
        body,
      );
      const magentaOutline = new Mesh(
        new TorusGeometry(width * 0.505, 0.38, 5, 48),
        magentaDetail,
      );
      const cyanOutline = new Mesh(
        new TorusGeometry(width * 0.35, 0.28, 5, 40),
        cyanDetail,
      );
      const beacon = new Mesh(
        new OctahedronGeometry(width * 0.045, 0),
        magentaDetail,
      );
      beacon.position.y = width * 0.56;
      group.add(
        outerRing,
        innerRing,
        magentaOutline,
        cyanOutline,
        beacon,
      );
    } else {
      const core = new Mesh(
        new CylinderGeometry(width * 0.08, width * 0.46, height, 9),
        body,
      );
      core.position.y = height / 2;
      const halo = new Mesh(
        new TorusGeometry(width * 0.56, 0.5, 6, 36),
        magentaDetail,
      );
      halo.position.y = height * 0.7;
      halo.rotation.x = Math.PI / 2;
      group.add(core, halo);
      for (let level = 1; level <= 3; level += 1) {
        const heightFraction = level / 4;
        const coreRadius =
          width * 0.46 * (1 - heightFraction) +
          width * 0.08 * heightFraction;
        const stripe = new Mesh(
          new TorusGeometry(coreRadius + 0.4, 0.38, 5, 24),
          cyanDetail,
        );
        stripe.position.y = height * heightFraction;
        stripe.rotation.x = Math.PI / 2;
        group.add(stripe);
      }
      const beacon = new Mesh(
        new OctahedronGeometry(width * 0.06, 0),
        magentaDetail,
      );
      beacon.position.y = height * 1.04;
      group.add(beacon);
    }
    return group;
  }

  private createLandmarkCollider(landmark: Landmark): void {
    const [width, height, depth] = landmark.scale;
    const body = this.physicsWorld.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        landmark.position[0],
        landmark.position[1] + height / 2,
        landmark.position[2],
      ),
    );
    this.physicsWorld.createCollider(
      RAPIER.ColliderDesc.cuboid(width * 0.2, height / 2, depth * 0.2),
      body,
    );
    this.bodies.push(body);
  }

  private buildPlacements(): void {
    this.buildShards();
    this.buildSteles();
    this.buildSanctuaryFrames();
  }

  private buildShards(): void {
    const geometry = new OctahedronGeometry(1, 0);
    const material = this.trackMaterial(createNeonMaterial(PALETTE.neonCyan, 4.2));
    const mesh = new InstancedMesh(geometry, material, this.shardPositions.length);
    mesh.name = 'echo-shards';
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    this.shardMesh = mesh;
    this.root.add(mesh);
    this.update(0);
  }

  private buildSteles(): void {
    const steles = WORLD_ZONES.flatMap((zone) => zone.steles);
    const material = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonMagenta,
        emissive: PALETTE.neonMagenta,
        emissiveIntensity: 3.6,
        transparent: true,
        opacity: 0.78,
        metalness: 0.1,
        roughness: 0.25,
      }),
    );
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, steles.length);
    mesh.name = 'memory-steles';
    const dummy = new Object3D();
    steles.forEach((stele, index) => {
      setTransform(dummy, stele.position, [1.2, 5, 1.2]);
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    this.root.add(mesh);
  }

  private buildSanctuaryFrames(): void {
    const entrances = WORLD_ZONES.flatMap((zone) =>
      zone.sanctuary ? [zone.sanctuary] : [],
    );
    const material = this.trackMaterial(createHighlightMaterial());
    const mesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      material,
      entrances.length * 3,
    );
    mesh.name = 'sanctuary-entrance-frames';
    const dummy = new Object3D();
    entrances.forEach((entrance, index) => {
      const [x, y, z] = entrance.position;
      setTransform(dummy, [x - 4, y, z], [1.1, 8, 1.1]);
      mesh.setMatrixAt(index * 3, dummy.matrix);
      setTransform(dummy, [x + 4, y, z], [1.1, 8, 1.1]);
      mesh.setMatrixAt(index * 3 + 1, dummy.matrix);
      setTransform(dummy, [x, y + 4, z], [9, 1.1, 1.1]);
      mesh.setMatrixAt(index * 3 + 2, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    this.root.add(mesh);
  }

  private buildTutorialGuide(): void {
    const material = this.trackMaterial(
      new LineBasicMaterial({
        color: PALETTE.neonCyan,
        toneMapped: false,
      }),
    );
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(0, 0.08, 28),
      new Vector3(0, 0.08, -360),
    ]);
    const guide = new Line(geometry, material);
    guide.name = 'south-tutorial-neon-guide';
    this.root.add(guide);
  }

  private trackMaterial<T extends Material>(material: T): T {
    this.materials.add(material);
    return material;
  }
}
