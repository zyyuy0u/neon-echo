import {
  AdditiveBlending,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  TorusGeometry,
  Vector3,
  type Material,
  type Scene,
} from 'three';

import type { EndingChoice } from '../systems/ending/EndingState';
import { WORLD_ZONES } from '../world/map/graph';
import { PALETTE } from './palette';

const DUST_PER_ZONE = 24;
const BURST_CAPACITY = 48;
const HALO_CAPACITY = 6;
const UPDRAFT_STREAMS = 18;

export interface ParticleDensity {
  dust: number;
  pickupBurst: number;
  unlockHalo: number;
  updraftStreams: number;
}

export function getParticleDensity(reducedMotion: boolean): ParticleDensity {
  const scale = reducedMotion ? 0.5 : 1;
  return {
    dust: DUST_PER_ZONE * WORLD_ZONES.length * scale,
    pickupBurst: 24 * scale,
    unlockHalo: 6 * scale,
    updraftStreams: UPDRAFT_STREAMS * scale,
  };
}

interface BurstParticle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maximumLife: number;
}

interface HaloParticle {
  position: Vector3;
  life: number;
  maximumLife: number;
}

export interface ParticleSystem {
  update: (deltaSeconds: number) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  burstShard: (position: Readonly<{ x: number; y: number; z: number }>) => void;
  unlockHalo: (position: Readonly<{ x: number; y: number; z: number }>) => void;
  triggerEnding: (choice: EndingChoice) => void;
  dispose: () => void;
}

function seededUnit(seed: number): number {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

export function createParticleSystem(
  scene: Scene,
  reducedMotion = false,
): ParticleSystem {
  const root = new Group();
  root.name = 'procedural-particles';
  const materials = new Set<Material>();
  const dummy = new Object3D();

  const dustGeometry = new OctahedronGeometry(0.09, 0);
  const dustMaterial = new MeshBasicMaterial({
    color: PALETTE.neonCyan,
    transparent: true,
    opacity: 0.28,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(dustMaterial);
  const dustSeeds = WORLD_ZONES.flatMap((zone, zoneIndex) =>
    Array.from({ length: DUST_PER_ZONE }, (_, index) => {
      const seed = zoneIndex * 101 + index + 1;
      return {
        x:
          zone.bounds.min[0] +
          seededUnit(seed) * (zone.bounds.max[0] - zone.bounds.min[0]),
        y: 2 + seededUnit(seed + 17) * Math.min(34, zone.bounds.max[1] + 5),
        z:
          zone.bounds.min[2] +
          seededUnit(seed + 31) * (zone.bounds.max[2] - zone.bounds.min[2]),
        phase: seededUnit(seed + 47) * Math.PI * 2,
      };
    }),
  );
  const dust = new InstancedMesh(dustGeometry, dustMaterial, dustSeeds.length);
  dust.name = 'zone-instanced-dust';
  dust.instanceMatrix.setUsage(DynamicDrawUsage);
  dust.frustumCulled = false;
  root.add(dust);

  const burstGeometry = new OctahedronGeometry(0.16, 0);
  const burstMaterial = new MeshBasicMaterial({
    color: PALETTE.warningYellow,
    transparent: true,
    opacity: 0.86,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(burstMaterial);
  const bursts = new InstancedMesh(
    burstGeometry,
    burstMaterial,
    BURST_CAPACITY,
  );
  bursts.name = 'shard-pickup-bursts';
  bursts.instanceMatrix.setUsage(DynamicDrawUsage);
  bursts.frustumCulled = false;
  root.add(bursts);
  const burstParticles: BurstParticle[] = [];

  const haloGeometry = new TorusGeometry(1, 0.055, 5, 24);
  const haloMaterial = new MeshBasicMaterial({
    color: PALETTE.neonMagenta,
    transparent: true,
    opacity: 0.78,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(haloMaterial);
  const halos = new InstancedMesh(haloGeometry, haloMaterial, HALO_CAPACITY);
  halos.name = 'ability-unlock-halos';
  halos.instanceMatrix.setUsage(DynamicDrawUsage);
  halos.frustumCulled = false;
  root.add(halos);
  const haloParticles: HaloParticle[] = [];

  const streamGeometry = new CylinderGeometry(0.045, 0.045, 3.5, 5);
  const streamMaterial = new MeshBasicMaterial({
    color: PALETTE.neonCyan,
    transparent: true,
    opacity: 0.42,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(streamMaterial);
  const streams = new InstancedMesh(
    streamGeometry,
    streamMaterial,
    UPDRAFT_STREAMS,
  );
  streams.name = 'wind-well-instanced-streams';
  streams.instanceMatrix.setUsage(DynamicDrawUsage);
  streams.frustumCulled = false;
  root.add(streams);

  const lightPositions = WORLD_ZONES.flatMap((zone) =>
    zone.platforms.slice(0, 8).map((platform) => ({
      x: platform.position[0],
      y: platform.position[1] + platform.size[1] / 2 + 0.5,
      z: platform.position[2],
    })),
  );
  const endingLightGeometry = new OctahedronGeometry(0.42, 0);
  const endingLightMaterial = new MeshBasicMaterial({
    color: PALETTE.neonCyan,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  materials.add(endingLightMaterial);
  const endingLights = new InstancedMesh(
    endingLightGeometry,
    endingLightMaterial,
    lightPositions.length,
  );
  endingLights.name = 'ending-city-light-wave';
  endingLights.instanceMatrix.setUsage(DynamicDrawUsage);
  endingLights.frustumCulled = false;
  root.add(endingLights);

  scene.add(root);
  let elapsedSeconds = 0;
  let density = getParticleDensity(reducedMotion);
  let endingChoice: EndingChoice | undefined;
  let endingElapsed = 0;

  const updateDust = (): void => {
    dust.count = density.dust;
    for (let index = 0; index < density.dust; index += 1) {
      const seed = dustSeeds[index];
      if (!seed) continue;
      dummy.position.set(
        seed.x + Math.sin(elapsedSeconds * 0.09 + seed.phase) * 1.2,
        seed.y + Math.sin(elapsedSeconds * 0.22 + seed.phase) * 0.8,
        seed.z + Math.cos(elapsedSeconds * 0.08 + seed.phase) * 1.2,
      );
      dummy.rotation.set(0, elapsedSeconds * 0.1 + seed.phase, 0);
      dummy.scale.setScalar(0.7 + seededUnit(index + 4) * 0.8);
      dummy.updateMatrix();
      dust.setMatrixAt(index, dummy.matrix);
    }
    dust.instanceMatrix.needsUpdate = true;
  };

  const updateStreams = (): void => {
    streams.count = density.updraftStreams;
    for (let index = 0; index < density.updraftStreams; index += 1) {
      const angle = (index / UPDRAFT_STREAMS) * Math.PI * 2;
      const radius = 2.2 + (index % 4) * 1.25;
      const y = ((elapsedSeconds * (4 + (index % 3)) + index * 3.7) % 38) + 1;
      dummy.position.set(
        -360 + Math.cos(angle + elapsedSeconds * 0.16) * radius,
        y,
        48 + Math.sin(angle + elapsedSeconds * 0.16) * radius,
      );
      dummy.rotation.set(0, 0, 0.04 * Math.sin(angle));
      dummy.scale.set(1, 0.7 + (index % 3) * 0.2, 1);
      dummy.updateMatrix();
      streams.setMatrixAt(index, dummy.matrix);
    }
    streams.instanceMatrix.needsUpdate = true;
  };

  const updateBursts = (deltaSeconds: number): void => {
    for (let index = burstParticles.length - 1; index >= 0; index -= 1) {
      const particle = burstParticles[index];
      if (!particle) continue;
      particle.life -= deltaSeconds;
      if (particle.life <= 0) {
        burstParticles.splice(index, 1);
        continue;
      }
      particle.velocity.y -= 3.2 * deltaSeconds;
      particle.position.addScaledVector(particle.velocity, deltaSeconds);
    }
    bursts.count = burstParticles.length;
    burstParticles.forEach((particle, index) => {
      dummy.position.copy(particle.position);
      dummy.rotation.set(elapsedSeconds * 2, elapsedSeconds * 2.7, 0);
      dummy.scale.setScalar(
        Math.max(0.01, particle.life / particle.maximumLife),
      );
      dummy.updateMatrix();
      bursts.setMatrixAt(index, dummy.matrix);
    });
    bursts.instanceMatrix.needsUpdate = true;
  };

  const updateHalos = (deltaSeconds: number): void => {
    for (let index = haloParticles.length - 1; index >= 0; index -= 1) {
      const halo = haloParticles[index];
      if (!halo) continue;
      halo.life -= deltaSeconds;
      if (halo.life <= 0) haloParticles.splice(index, 1);
    }
    halos.count = haloParticles.length;
    haloParticles.forEach((halo, index) => {
      const progress = 1 - halo.life / halo.maximumLife;
      dummy.position.copy(halo.position);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.scale.setScalar(0.4 + progress * 5.5);
      dummy.updateMatrix();
      halos.setMatrixAt(index, dummy.matrix);
    });
    halos.instanceMatrix.needsUpdate = true;
  };

  const updateEndingLights = (deltaSeconds: number): void => {
    if (endingChoice) endingElapsed += deltaSeconds;
    lightPositions.forEach((position, index) => {
      const distance = Math.hypot(position.x, position.z - 350);
      const delay = distance / 110;
      let scale = 0.18;
      if (endingChoice === 'awaken') {
        const wave = Math.max(0, Math.min(1, (endingElapsed - delay) / 0.9));
        scale = 0.18 + wave * 2.2;
      } else if (endingChoice === 'rest') {
        const fade = Math.max(
          0,
          Math.min(1, (endingElapsed - delay * 0.35) / 3),
        );
        scale = 0.18 * (1 - fade);
      }
      dummy.position.set(position.x, position.y, position.z);
      dummy.rotation.set(0, elapsedSeconds * 0.6 + index, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      endingLights.setMatrixAt(index, dummy.matrix);
    });
    endingLights.instanceMatrix.needsUpdate = true;
  };

  updateDust();
  updateStreams();
  bursts.count = 0;
  halos.count = 0;
  updateEndingLights(0);

  return {
    update: (deltaSeconds) => {
      elapsedSeconds += deltaSeconds;
      updateDust();
      updateStreams();
      updateBursts(deltaSeconds);
      updateHalos(deltaSeconds);
      updateEndingLights(deltaSeconds);
    },
    setReducedMotion: (nextReducedMotion) => {
      density = getParticleDensity(nextReducedMotion);
      if (burstParticles.length > density.pickupBurst) {
        burstParticles.length = density.pickupBurst;
      }
      if (haloParticles.length > density.unlockHalo) {
        haloParticles.length = density.unlockHalo;
      }
    },
    burstShard: (position) => {
      burstParticles.length = 0;
      for (let index = 0; index < density.pickupBurst; index += 1) {
        const angle = (index / density.pickupBurst) * Math.PI * 2;
        const speed = 3.5 + (index % 5) * 0.55;
        burstParticles.push({
          position: new Vector3(position.x, position.y, position.z),
          velocity: new Vector3(
            Math.cos(angle) * speed,
            2.2 + (index % 4) * 0.6,
            Math.sin(angle) * speed,
          ),
          life: 0.75,
          maximumLife: 0.75,
        });
      }
    },
    unlockHalo: (position) => {
      for (let index = 0; index < density.unlockHalo; index += 1) {
        haloParticles.push({
          position: new Vector3(
            position.x,
            position.y + index * 0.3,
            position.z,
          ),
          life: 1.25 + index * 0.08,
          maximumLife: 1.25 + index * 0.08,
        });
      }
      if (haloParticles.length > density.unlockHalo) {
        haloParticles.splice(0, haloParticles.length - density.unlockHalo);
      }
    },
    triggerEnding: (choice) => {
      endingChoice = choice;
      endingElapsed = 0;
      endingLightMaterial.color.set(
        choice === 'awaken' ? PALETTE.warningYellow : PALETTE.neonMagenta,
      );
    },
    dispose: () => {
      scene.remove(root);
      dustGeometry.dispose();
      burstGeometry.dispose();
      haloGeometry.dispose();
      streamGeometry.dispose();
      endingLightGeometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
