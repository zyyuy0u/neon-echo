import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Material,
} from 'three';

import { PALETTE } from '../render/palette';
import {
  createCanvasTexture,
  generateFacadeWindowTexture,
  generateRoadTexture,
  generateSignTexture,
  generateWindowTexture,
} from './cityTextures';

interface BuildingLot {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly setback: boolean;
}

interface RoadSegment {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly length: number;
  readonly rotation: number;
}

interface SignPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

const FOOTPRINTS = [
  [12, 13, 28],
  [16, 11, 42],
  [10, 18, 34],
  [20, 14, 54],
  [14, 20, 46],
  [22, 17, 66],
] as const;

function makeBuildings(): readonly BuildingLot[] {
  const positions: Array<readonly [number, number]> = [];
  for (const x of [-52, -26, 26, 52]) {
    positions.push([x, -53], [x, 53]);
  }
  for (const z of [-28, 0, 28]) positions.push([-54, z], [54, z]);
  for (const z of [-166, -204, -244, -284, -326, -360]) {
    positions.push([-82, z], [82, z]);
  }
  for (const x of [150, 182, 216, 252, 324, 358, 386]) {
    positions.push([x, -82], [x, 82]);
  }
  for (const x of [-150, -182, -216, -252, -324, -358, -386]) {
    positions.push([x, -82], [x, 82]);
  }
  return positions.map(([x, z], index) => {
    const footprint = FOOTPRINTS[index % FOOTPRINTS.length]!;
    return {
      x,
      z,
      width: footprint[0],
      depth: footprint[1],
      height: footprint[2] + ((index * 7) % 17),
      setback: index % 3 !== 1,
    };
  });
}

export const CITY_BUILDINGS = makeBuildings();

export const CITY_ROADS: readonly RoadSegment[] = [
  { x: 0, z: 0, width: 18, length: 140, rotation: 0 },
  { x: 0, z: 0, width: 18, length: 140, rotation: Math.PI / 2 },
  { x: 0, z: -252, width: 18, length: 248, rotation: 0 },
  { x: 0, z: -185, width: 17, length: 174, rotation: Math.PI / 2 },
  { x: 0, z: -282, width: 17, length: 174, rotation: Math.PI / 2 },
  { x: 255, z: 0, width: 18, length: 248, rotation: Math.PI / 2 },
  { x: 190, z: 0, width: 17, length: 184, rotation: 0 },
  { x: 344, z: 0, width: 17, length: 184, rotation: 0 },
  { x: -255, z: 0, width: 18, length: 248, rotation: Math.PI / 2 },
  { x: -190, z: 0, width: 17, length: 184, rotation: 0 },
  { x: -344, z: 0, width: 17, length: 184, rotation: 0 },
  { x: 0, z: 138, width: 18, length: 136, rotation: 0 },
  { x: 0, z: -92, width: 16, length: 60, rotation: 0 },
] as const;

function makeSigns(): readonly SignPlacement[] {
  const placements: SignPlacement[] = CITY_BUILDINGS.slice(0, 40).map(
    (building, index) => {
      const onXFace = index % 2 === 1;
      return {
        x: building.x + (onXFace ? building.width / 2 + 0.12 : 0),
        y: Math.min(19, building.height * (0.34 + (index % 3) * 0.08)),
        z: building.z + (onXFace ? 0 : building.depth / 2 + 0.12),
        width: 5.5 + (index % 4),
        height: 2.4 + (index % 2),
        rotation: onXFace ? Math.PI / 2 : 0,
      };
    },
  );
  const overhead: readonly SignPlacement[] = [
    { x: 0, y: 7, z: -42, width: 12, height: 3.2, rotation: 0 },
    { x: 0, y: 8, z: 42, width: 13, height: 3.2, rotation: Math.PI },
    { x: 0, y: 8, z: -178, width: 12, height: 3.4, rotation: 0 },
    { x: 0, y: 8, z: -290, width: 14, height: 3.4, rotation: Math.PI },
    { x: 186, y: 8, z: 0, width: 12, height: 3.4, rotation: Math.PI / 2 },
    { x: 342, y: 8, z: 0, width: 13, height: 3.4, rotation: -Math.PI / 2 },
    { x: -186, y: 8, z: 0, width: 12, height: 3.4, rotation: Math.PI / 2 },
    { x: -342, y: 8, z: 0, width: 13, height: 3.4, rotation: -Math.PI / 2 },
  ];
  placements.push(...overhead);
  return placements;
}

export const CITY_SIGNS = makeSigns();
export const CITY_SKYLINE_COUNT = 48;
export const CITY_FLIGHT_PATHS = 4;
export const CITY_BENCH_COUNT = 24;
export const CITY_TRASH_BIN_COUNT = 24;
export const CITY_TRAFFIC_SIGNAL_POSITIONS = [
  [-14, -14],
  [14, -14],
  [-14, 14],
  [14, 14],
  [-14, -185],
  [14, -185],
  [-14, -282],
  [14, -282],
  [190, -14],
  [190, 14],
  [-190, -14],
  [-190, 14],
] as const;
// 單一真相：計數一律由實際建構消費的座標陣列導出（驗收者抓過寫死複本）。
export const CITY_TRAFFIC_SIGNAL_COUNT = CITY_TRAFFIC_SIGNAL_POSITIONS.length;
export const CITY_STREETLIGHT_COUNT = CITY_ROADS.length * 6;

export const CITY_DECORATION_STATS = {
  buildings: CITY_BUILDINGS.length,
  signs: CITY_SIGNS.length,
  streetlights: CITY_STREETLIGHT_COUNT,
  trafficSignals: CITY_TRAFFIC_SIGNAL_COUNT,
  benches: CITY_BENCH_COUNT,
  trashBins: CITY_TRASH_BIN_COUNT,
  skylineBuildings: CITY_SKYLINE_COUNT,
  flightPaths: CITY_FLIGHT_PATHS,
} as const;

function setMatrix(
  dummy: Object3D,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotationY = 0,
): void {
  dummy.position.set(...position);
  dummy.rotation.set(0, rotationY, 0);
  dummy.scale.set(...scale);
  dummy.updateMatrix();
}

function makeWindowMaterial(texture: CanvasTexture): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: '#31405e',
    map: texture,
    emissive: '#ffffff',
    emissiveMap: texture,
    emissiveIntensity: 1.85,
    metalness: 0.42,
    roughness: 0.58,
  });
}

export class CityVisuals {
  private readonly group = new Group();
  private readonly materials = new Set<Material>();
  private readonly textures = new Set<CanvasTexture>();
  private readonly trailPositions = new Float32Array(
    CITY_FLIGHT_PATHS * 11 * 2 * 3,
  );
  private trailMesh: LineSegments | undefined;
  private flyers: InstancedMesh | undefined;
  private flickerMaterial: MeshStandardMaterial | undefined;
  private billboardTexture: CanvasTexture | undefined;

  public constructor(root: Group) {
    this.group.name = 'city-visual-layer-no-colliders';
    root.add(this.group);
    this.buildRoads();
    this.buildBuildings();
    this.buildSigns();
    this.buildStreetlights();
    this.buildTrafficSignals();
    this.buildStreetFurniture();
    this.buildSkyline();
    this.buildLandmarkDetails();
    this.buildFlightTraffic();
  }

  public update(elapsedSeconds: number, reducedMotion: boolean): void {
    if (this.billboardTexture && !reducedMotion) {
      this.billboardTexture.offset.x = (elapsedSeconds * 0.11) % 1;
    }
    if (this.flickerMaterial) {
      this.flickerMaterial.emissiveIntensity = reducedMotion
        ? 2.8
        : 2.2 + Math.max(0, Math.sin(elapsedSeconds * 7.4)) * 2.1;
    }
    this.updateFlightTraffic(elapsedSeconds, reducedMotion);
  }

  public dispose(): void {
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
  }

  private trackMaterial<T extends Material>(material: T): T {
    this.materials.add(material);
    return material;
  }

  private trackTexture(texture: CanvasTexture): CanvasTexture {
    this.textures.add(texture);
    return texture;
  }

  private buildRoads(): void {
    const roadTexture = this.trackTexture(
      createCanvasTexture(generateRoadTexture(101)),
    );
    const roadMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#111522',
        map: roadTexture,
        emissive: '#263348',
        emissiveMap: roadTexture,
        emissiveIntensity: 0.56,
        metalness: 0.18,
        roughness: 0.9,
      }),
    );
    const roadGeometry = new PlaneGeometry(1, 1);
    roadGeometry.rotateX(-Math.PI / 2);
    const roads = new InstancedMesh(
      roadGeometry,
      roadMaterial,
      CITY_ROADS.length,
    );
    roads.name = 'city-asphalt-roads-with-markings';
    const dummy = new Object3D();
    CITY_ROADS.forEach((road, index) => {
      setMatrix(
        dummy,
        [road.x, 0.045, road.z],
        [road.width, 1, road.length],
        road.rotation,
      );
      roads.setMatrixAt(index, dummy.matrix);
    });
    roads.computeBoundingSphere();
    this.group.add(roads);

    const sidewalkMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#252b40',
        emissive: PALETTE.structureBlue,
        emissiveIntensity: 0.48,
        roughness: 0.82,
        metalness: 0.15,
      }),
    );
    const curbMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#52637b',
        emissive: PALETTE.neonCyan,
        emissiveIntensity: 0.32,
        roughness: 0.72,
      }),
    );
    const sidewalkGeometry = new BoxGeometry(1, 1, 1);
    const sidewalks = new InstancedMesh(
      sidewalkGeometry,
      sidewalkMaterial,
      CITY_ROADS.length * 2,
    );
    sidewalks.name = 'city-sidewalks-015-height-difference';
    const curbs = new InstancedMesh(
      sidewalkGeometry,
      curbMaterial,
      CITY_ROADS.length * 2,
    );
    curbs.name = 'city-raised-curbs';
    CITY_ROADS.forEach((road, roadIndex) => {
      const normalX = Math.cos(road.rotation);
      const normalZ = -Math.sin(road.rotation);
      for (const [sideIndex, side] of [-1, 1].entries()) {
        const offset = road.width / 2 + 2.5;
        const x = road.x + normalX * offset * side;
        const z = road.z + normalZ * offset * side;
        const instanceIndex = roadIndex * 2 + sideIndex;
        setMatrix(dummy, [x, 0.1, z], [5, 0.15, road.length], road.rotation);
        sidewalks.setMatrixAt(instanceIndex, dummy.matrix);
        const curbOffset = road.width / 2 + 0.35;
        setMatrix(
          dummy,
          [
            road.x + normalX * curbOffset * side,
            0.125,
            road.z + normalZ * curbOffset * side,
          ],
          [0.7, 0.25, road.length],
          road.rotation,
        );
        curbs.setMatrixAt(instanceIndex, dummy.matrix);
      }
    });
    sidewalks.computeBoundingSphere();
    curbs.computeBoundingSphere();
    this.group.add(sidewalks, curbs);
  }

  private buildBuildings(): void {
    const windowTexture = this.trackTexture(
      createCanvasTexture(generateFacadeWindowTexture(1986)),
    );
    const buildingMaterial = this.trackMaterial(
      makeWindowMaterial(windowTexture),
    );
    const buildingPartCount =
      CITY_BUILDINGS.length +
      CITY_BUILDINGS.filter((building) => building.setback).length +
      3;
    const buildings = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      buildingMaterial,
      buildingPartCount,
    );
    buildings.name = 'windowed-city-buildings-six-footprints';
    const dummy = new Object3D();
    let partIndex = 0;
    for (const building of CITY_BUILDINGS) {
      const lowerHeight = building.setback
        ? building.height * 0.68
        : building.height;
      setMatrix(
        dummy,
        [building.x, lowerHeight / 2, building.z],
        [building.width, lowerHeight, building.depth],
      );
      buildings.setMatrixAt(partIndex, dummy.matrix);
      partIndex += 1;
      if (building.setback) {
        const upperHeight = building.height - lowerHeight;
        setMatrix(
          dummy,
          [building.x, lowerHeight + upperHeight / 2, building.z],
          [building.width * 0.66, upperHeight, building.depth * 0.7],
        );
        buildings.setMatrixAt(partIndex, dummy.matrix);
        partIndex += 1;
      }
    }
    for (const [position, size] of [
      [
        [-20, 9, -310],
        [16, 18, 32],
      ],
      [
        [20, 9, -310],
        [16, 18, 32],
      ],
      [
        [0, 5, -285],
        [34, 10, 14],
      ],
    ] as const) {
      setMatrix(dummy, position, size);
      buildings.setMatrixAt(partIndex, dummy.matrix);
      partIndex += 1;
    }
    buildings.computeBoundingSphere();
    this.group.add(buildings);

    const roofMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#303954',
        emissive: PALETTE.structureBlue,
        emissiveIntensity: 0.65,
        metalness: 0.52,
        roughness: 0.42,
      }),
    );
    const neonRoofMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonMagenta,
        emissive: PALETTE.neonMagenta,
        emissiveIntensity: 3.4,
        roughness: 0.28,
      }),
    );
    const antennaLots = CITY_BUILDINGS.filter((_, index) => index % 3 === 0);
    const tankLots = CITY_BUILDINGS.filter((_, index) => index % 3 === 1);
    const antennas = new InstancedMesh(
      new CylinderGeometry(1, 1, 1, 6),
      neonRoofMaterial,
      antennaLots.length,
    );
    antennas.name = 'city-rooftop-antennas';
    antennaLots.forEach((building, index) => {
      setMatrix(
        dummy,
        [building.x, building.height + 4.5, building.z],
        [0.18, 9, 0.18],
      );
      antennas.setMatrixAt(index, dummy.matrix);
    });
    const waterTowers = new InstancedMesh(
      new CylinderGeometry(1, 1.15, 1, 10),
      roofMaterial,
      tankLots.length,
    );
    waterTowers.name = 'city-rooftop-water-towers';
    tankLots.forEach((building, index) => {
      setMatrix(
        dummy,
        [building.x, building.height + 2.1, building.z],
        [2.1, 4.2, 2.1],
      );
      waterTowers.setMatrixAt(index, dummy.matrix);
    });
    const roofBoxes = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      roofMaterial,
      CITY_BUILDINGS.length,
    );
    roofBoxes.name = 'city-rooftop-ac-units';
    const roofStrips = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      neonRoofMaterial,
      CITY_BUILDINGS.length,
    );
    roofStrips.name = 'city-neon-rooftop-strips';
    CITY_BUILDINGS.forEach((building, index) => {
      setMatrix(
        dummy,
        [
          building.x + building.width * 0.18,
          building.height + 0.75,
          building.z,
        ],
        [3.2, 1.5, 2.4],
      );
      roofBoxes.setMatrixAt(index, dummy.matrix);
      setMatrix(
        dummy,
        [
          building.x,
          building.height + 0.25,
          building.z + building.depth * 0.34,
        ],
        [building.width * 0.72, 0.35, 0.35],
      );
      roofStrips.setMatrixAt(index, dummy.matrix);
    });
    antennas.computeBoundingSphere();
    waterTowers.computeBoundingSphere();
    roofBoxes.computeBoundingSphere();
    roofStrips.computeBoundingSphere();
    this.group.add(antennas, waterTowers, roofBoxes, roofStrips);

    this.flickerMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#ff9b54',
        emissive: '#ff7a3d',
        emissiveIntensity: 2.8,
        roughness: 0.3,
      }),
    );
    const flickerWindows = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      this.flickerMaterial,
      10,
    );
    flickerWindows.name = 'city-occasional-flickering-windows';
    CITY_BUILDINGS.slice(0, 10).forEach((building, index) => {
      setMatrix(
        dummy,
        [
          building.x,
          building.height * 0.48,
          building.z + building.depth / 2 + 0.16,
        ],
        [1.5, 1.2, 0.14],
      );
      flickerWindows.setMatrixAt(index, dummy.matrix);
    });
    flickerWindows.computeBoundingSphere();
    this.group.add(flickerWindows);
  }

  private buildSigns(): void {
    const geometry = new PlaneGeometry(1, 1);
    const dummy = new Object3D();
    for (let variant = 0; variant < 8; variant += 1) {
      const texture = this.trackTexture(
        createCanvasTexture(generateSignTexture(variant)),
      );
      const material = this.trackMaterial(
        new MeshStandardMaterial({
          color: '#ffffff',
          map: texture,
          emissive: '#ffffff',
          emissiveMap: texture,
          emissiveIntensity: 3.2,
          transparent: true,
          side: DoubleSide,
          roughness: 0.3,
          metalness: 0.08,
        }),
      );
      const placements = CITY_SIGNS.filter((_, index) => index % 8 === variant);
      const signs = new InstancedMesh(geometry, material, placements.length);
      signs.name = `city-neon-sign-variant-${variant + 1}`;
      placements.forEach((placement, index) => {
        setMatrix(
          dummy,
          [placement.x, placement.y, placement.z],
          [placement.width, placement.height, 1],
          placement.rotation,
        );
        signs.setMatrixAt(index, dummy.matrix);
      });
      signs.computeBoundingSphere();
      this.group.add(signs);
    }

    this.billboardTexture = this.trackTexture(
      createCanvasTexture(generateSignTexture(77), true),
    );
    const billboardMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#ffffff',
        map: this.billboardTexture,
        emissive: '#ffffff',
        emissiveMap: this.billboardTexture,
        emissiveIntensity: 3.8,
        side: DoubleSide,
        roughness: 0.25,
      }),
    );
    const billboards = new InstancedMesh(
      new PlaneGeometry(1, 1),
      billboardMaterial,
      2,
    );
    billboards.name = 'city-large-uv-scrolling-billboards';
    setMatrix(dummy, [0, 15, 60.4], [28, 10, 1], Math.PI);
    billboards.setMatrixAt(0, dummy.matrix);
    setMatrix(dummy, [300, 22, -78], [30, 11, 1], 0);
    billboards.setMatrixAt(1, dummy.matrix);
    billboards.computeBoundingSphere();
    this.group.add(billboards);
  }

  private buildStreetlights(): void {
    const poleMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#26314b',
        emissive: PALETTE.structureBlue,
        emissiveIntensity: 0.5,
        metalness: 0.75,
        roughness: 0.36,
      }),
    );
    const lightMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonCyan,
        emissive: PALETTE.neonCyan,
        emissiveIntensity: 4.6,
        roughness: 0.2,
      }),
    );
    const poles = new InstancedMesh(
      new CylinderGeometry(1, 1, 1, 7),
      poleMaterial,
      CITY_STREETLIGHT_COUNT,
    );
    poles.name = 'city-streetlight-poles';
    const heads = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      lightMaterial,
      CITY_STREETLIGHT_COUNT,
    );
    heads.name = 'city-glowing-streetlight-heads';
    const dummy = new Object3D();
    let index = 0;
    for (const road of CITY_ROADS) {
      const sideX = Math.cos(road.rotation);
      const sideZ = -Math.sin(road.rotation);
      const alongX = Math.sin(road.rotation);
      const alongZ = Math.cos(road.rotation);
      for (const side of [-1, 1]) {
        for (const fraction of [-0.34, 0, 0.34]) {
          const x =
            road.x +
            sideX * (road.width / 2 + 3.7) * side +
            alongX * road.length * fraction;
          const z =
            road.z +
            sideZ * (road.width / 2 + 3.7) * side +
            alongZ * road.length * fraction;
          setMatrix(dummy, [x, 3.5, z], [0.18, 7, 0.18]);
          poles.setMatrixAt(index, dummy.matrix);
          setMatrix(dummy, [x, 7.1, z], [1.5, 0.45, 0.8], road.rotation);
          heads.setMatrixAt(index, dummy.matrix);
          index += 1;
        }
      }
    }
    poles.computeBoundingSphere();
    heads.computeBoundingSphere();
    this.group.add(poles, heads);
  }

  private buildTrafficSignals(): void {
    const positions = CITY_TRAFFIC_SIGNAL_POSITIONS;
    const poleMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#202b42',
        metalness: 0.72,
        roughness: 0.42,
      }),
    );
    const housingMaterial = this.trackMaterial(
      new MeshStandardMaterial({ color: '#0b1020', roughness: 0.68 }),
    );
    const poles = new InstancedMesh(
      new CylinderGeometry(1, 1, 1, 7),
      poleMaterial,
      positions.length,
    );
    const housings = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      housingMaterial,
      positions.length,
    );
    poles.name = 'city-traffic-signal-poles';
    housings.name = 'city-traffic-signal-housings';
    const lampMaterials = ['#ff315d', '#ffd319', '#00f59b'].map((color) =>
      this.trackMaterial(
        new MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 3.6,
        }),
      ),
    );
    const lamps = lampMaterials.map((material, lampIndex) => {
      const mesh = new InstancedMesh(
        new OctahedronGeometry(1, 0),
        material,
        positions.length,
      );
      mesh.name = `city-traffic-signal-lamp-${lampIndex}`;
      return mesh;
    });
    const dummy = new Object3D();
    positions.forEach(([x, z], index) => {
      setMatrix(dummy, [x, 2.8, z], [0.16, 5.6, 0.16]);
      poles.setMatrixAt(index, dummy.matrix);
      setMatrix(dummy, [x, 5.4, z], [1, 2.6, 0.8]);
      housings.setMatrixAt(index, dummy.matrix);
      lamps.forEach((lamp, lampIndex) => {
        setMatrix(
          dummy,
          [x, 6.15 - lampIndex * 0.75, z + 0.46],
          [0.24, 0.24, 0.24],
        );
        lamp.setMatrixAt(index, dummy.matrix);
      });
    });
    poles.computeBoundingSphere();
    housings.computeBoundingSphere();
    for (const lamp of lamps) lamp.computeBoundingSphere();
    this.group.add(poles, housings, ...lamps);
  }

  private buildStreetFurniture(): void {
    const furnitureMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#38445e',
        emissive: PALETTE.structureBlue,
        emissiveIntensity: 0.58,
        metalness: 0.45,
        roughness: 0.56,
      }),
    );
    const accentMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonMagenta,
        emissive: PALETTE.neonMagenta,
        emissiveIntensity: 2.8,
      }),
    );
    const benchPositions = Array.from(
      { length: CITY_BENCH_COUNT },
      (_, index) => ({
        x: -46 + (index % 6) * 18.4,
        z:
          index < 12
            ? index % 2 === 0
              ? -36
              : 36
            : -154 - Math.floor((index - 12) / 2) * 18,
        rotation: index < 12 ? 0 : Math.PI / 2,
      }),
    );
    const seats = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      furnitureMaterial,
      benchPositions.length,
    );
    const backs = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      accentMaterial,
      benchPositions.length,
    );
    seats.name = 'city-benches-seats';
    backs.name = 'city-benches-neon-backs';
    const bins = new InstancedMesh(
      new CylinderGeometry(1, 1, 1, 10),
      furnitureMaterial,
      CITY_TRASH_BIN_COUNT,
    );
    bins.name = 'city-trash-bins';
    const dummy = new Object3D();
    benchPositions.forEach((position, index) => {
      setMatrix(
        dummy,
        [position.x, 0.8, position.z],
        [4.2, 0.35, 1.3],
        position.rotation,
      );
      seats.setMatrixAt(index, dummy.matrix);
      const backX = position.x + Math.sin(position.rotation) * 0.55;
      const backZ = position.z - Math.cos(position.rotation) * 0.55;
      setMatrix(
        dummy,
        [backX, 1.45, backZ],
        [4.2, 1.2, 0.25],
        position.rotation,
      );
      backs.setMatrixAt(index, dummy.matrix);
      setMatrix(dummy, [position.x + 5.2, 1, position.z], [0.75, 2, 0.75]);
      bins.setMatrixAt(index, dummy.matrix);
    });
    seats.computeBoundingSphere();
    backs.computeBoundingSphere();
    bins.computeBoundingSphere();
    this.group.add(seats, backs, bins);
  }

  private buildSkyline(): void {
    const nearTexture = this.trackTexture(
      createCanvasTexture(generateWindowTexture(4001)),
    );
    const farTexture = this.trackTexture(
      createCanvasTexture(generateWindowTexture(9007)),
    );
    const materials = [nearTexture, farTexture].map((texture, index) =>
      this.trackMaterial(
        new MeshStandardMaterial({
          color: index === 0 ? '#202c49' : '#11182d',
          map: texture,
          emissive: index === 0 ? '#bdefff' : '#6c7da8',
          emissiveMap: texture,
          emissiveIntensity: index === 0 ? 1.3 : 0.82,
          roughness: 0.78,
          metalness: 0.24,
          fog: false,
        }),
      ),
    );
    const dummy = new Object3D();
    for (let layer = 0; layer < 2; layer += 1) {
      const count = CITY_SKYLINE_COUNT / 2;
      const skyline = new InstancedMesh(
        new BoxGeometry(1, 1, 1),
        materials[layer]!,
        count,
      );
      skyline.name = `city-skyline-depth-${layer + 1}`;
      const radius = layer === 0 ? 440 : 515;
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + layer * 0.08;
        const width = 13 + ((index * 7 + layer * 3) % 16);
        const depth = 12 + ((index * 11) % 15);
        const height = 38 + ((index * 19 + layer * 23) % 72);
        setMatrix(
          dummy,
          [Math.cos(angle) * radius, height / 2 - 1, Math.sin(angle) * radius],
          [width, height, depth],
          -angle,
        );
        skyline.setMatrixAt(index, dummy.matrix);
      }
      skyline.computeBoundingSphere();
      this.group.add(skyline);
    }
  }

  private buildLandmarkDetails(): void {
    const windowMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.neonCyan,
        emissive: PALETTE.neonCyan,
        emissiveIntensity: 3.1,
        roughness: 0.3,
      }),
    );
    const windowCount = 24 + 40 + 24;
    const windows = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      windowMaterial,
      windowCount,
    );
    windows.name = 'city-landmark-window-structure-details';
    const dummy = new Object3D();
    let index = 0;
    for (const towerX of [-18.4, 18.4]) {
      for (let level = 0; level < 12; level += 1) {
        setMatrix(dummy, [towerX, 9 + level * 8, -304.9], [3.2, 2.2, 0.28]);
        windows.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    for (let level = 0; level < 10; level += 1) {
      const radius = 15 - level * 0.8;
      for (let face = 0; face < 4; face += 1) {
        const angle = (face / 4) * Math.PI * 2;
        setMatrix(
          dummy,
          [
            300 + Math.sin(angle) * radius,
            13 + level * 15.5,
            Math.cos(angle) * radius,
          ],
          [4.2, 2.4, 0.25],
          angle,
        );
        windows.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    for (const wallX of [-58.2, 58.2]) {
      for (let light = 0; light < 12; light += 1) {
        setMatrix(
          dummy,
          [wallX, -2 - (light % 3) * 5, 205 + light * 13],
          [0.3, 2.4, 5.6],
          Math.PI / 2,
        );
        windows.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    windows.computeBoundingSphere();
    this.group.add(windows);

    const structureMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: '#344360',
        emissive: PALETTE.neonMagenta,
        emissiveIntensity: 0.72,
        metalness: 0.62,
        roughness: 0.38,
      }),
    );
    const rails = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      structureMaterial,
      8,
    );
    rails.name = 'skylift-station-rails-and-canopy';
    for (let railIndex = 0; railIndex < 8; railIndex += 1) {
      const x = railIndex % 2 === 0 ? -7 : 7;
      const y = 13 + Math.floor(railIndex / 2) * 18;
      setMatrix(dummy, [x, y, -310], [0.65, 0.65, 42]);
      rails.setMatrixAt(railIndex, dummy.matrix);
    }
    rails.computeBoundingSphere();

    const trusses = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      structureMaterial,
      20,
    );
    trusses.name = 'inverted-ring-structural-trusses';
    const ringEuler = new Euler(0.35, 0.2, 0.92);
    const ringQuaternion = new Quaternion().setFromEuler(ringEuler);
    for (let brace = 0; brace < 20; brace += 1) {
      const angle = (brace / 20) * Math.PI * 2;
      const local = new Vector3(
        Math.cos(angle) * 25,
        Math.sin(angle) * 25,
        0,
      ).applyQuaternion(ringQuaternion);
      dummy.position.set(-290 + local.x, 66 + local.y, local.z);
      dummy.scale.set(1.1, 12, 1.1);
      dummy.quaternion
        .copy(ringQuaternion)
        .multiply(new Quaternion().setFromEuler(new Euler(0, 0, -angle)));
      dummy.updateMatrix();
      trusses.setMatrixAt(brace, dummy.matrix);
    }
    trusses.computeBoundingSphere();
    this.group.add(rails, trusses);
  }

  private buildFlightTraffic(): void {
    const flyerMaterial = this.trackMaterial(
      new MeshStandardMaterial({
        color: PALETTE.warningYellow,
        emissive: PALETTE.warningYellow,
        emissiveIntensity: 4.8,
        roughness: 0.18,
      }),
    );
    this.flyers = new InstancedMesh(
      new OctahedronGeometry(1, 0),
      flyerMaterial,
      CITY_FLIGHT_PATHS,
    );
    this.flyers.name = 'city-flying-traffic-lights';
    this.flyers.instanceMatrix.setUsage(DynamicDrawUsage);
    this.flyers.frustumCulled = false;
    this.group.add(this.flyers);
    const trailGeometry = new BufferGeometry();
    const trailAttribute = new BufferAttribute(this.trailPositions, 3);
    trailAttribute.setUsage(DynamicDrawUsage);
    trailGeometry.setAttribute('position', trailAttribute);
    const trailMaterial = this.trackMaterial(
      new LineBasicMaterial({
        color: new Color(PALETTE.neonCyan).multiplyScalar(2.2),
        transparent: true,
        opacity: 0.68,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.trailMesh = new LineSegments(trailGeometry, trailMaterial);
    this.trailMesh.name = 'city-four-merged-flight-trails';
    this.trailMesh.frustumCulled = false;
    this.group.add(this.trailMesh);
    this.updateFlightTraffic(0, false);
  }

  private updateFlightTraffic(
    elapsedSeconds: number,
    reducedMotion: boolean,
  ): void {
    const flyers = this.flyers;
    const trailMesh = this.trailMesh;
    if (!flyers || !trailMesh) return;
    trailMesh.visible = !reducedMotion;
    const dummy = new Object3D();
    for (let path = 0; path < CITY_FLIGHT_PATHS; path += 1) {
      const time = reducedMotion
        ? path * 1.4
        : elapsedSeconds * (0.18 + path * 0.025) + path * 1.7;
      const centerX = path % 2 === 0 ? 0 : path === 1 ? 270 : -270;
      const centerZ = path % 2 === 0 ? (path === 0 ? -210 : 65) : 0;
      const radiusX = 75 + path * 18;
      const radiusZ = 42 + path * 12;
      const height = 42 + path * 13;
      const current = new Vector3(
        centerX + Math.cos(time) * radiusX,
        height + Math.sin(time * 1.7) * 6,
        centerZ + Math.sin(time) * radiusZ,
      );
      setMatrix(
        dummy,
        [current.x, current.y, current.z],
        [1.2, 0.55, 2.4],
        -time,
      );
      flyers.setMatrixAt(path, dummy.matrix);
      for (let segment = 0; segment < 11; segment += 1) {
        for (let endpoint = 0; endpoint < 2; endpoint += 1) {
          const sample = segment + endpoint;
          const sampleTime = time - sample * 0.045;
          const offset = (path * 11 * 2 + segment * 2 + endpoint) * 3;
          this.trailPositions[offset] =
            centerX + Math.cos(sampleTime) * radiusX;
          this.trailPositions[offset + 1] =
            height + Math.sin(sampleTime * 1.7) * 6;
          this.trailPositions[offset + 2] =
            centerZ + Math.sin(sampleTime) * radiusZ;
        }
      }
    }
    const positionAttribute = trailMesh.geometry.getAttribute('position');
    if (positionAttribute) positionAttribute.needsUpdate = true;
    flyers.instanceMatrix.needsUpdate = true;
  }
}
