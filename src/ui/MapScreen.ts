import { PALETTE } from '../render/palette';
import type { ObjectiveTrackingSnapshot } from '../systems/objectives/ObjectiveTracker';
import type { PuzzleId, PuzzleSnapshot } from '../systems/puzzles/PuzzleState';
import { WARP_ANCHORS } from '../systems/warp/anchors';
import { WORLD_ZONES } from '../world/map/graph';
import type { Platform, ZoneId } from '../world/map/types';
import {
  clampMapTransform,
  getWorldMapScale,
  type MapTransform,
  type MapViewport,
} from './mapProjection';
import { onLanguageChange, t } from './i18n';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PUZZLE_BY_SANCTUARY: Readonly<Record<string, PuzzleId>> = {
  'sanctuary-dash': 'pulseTrack',
  'sanctuary-double-jump': 'lightBridge',
  'sanctuary-glide': 'windWell',
};
const LANDMARK_ICONS: Readonly<Record<ZoneId, string>> = {
  plaza: '◇',
  skylift: '△',
  spire: '┃',
  ring: '◯',
  chasm: '◈',
};

export type MapTargetKind = 'landmark' | 'sanctuary' | 'warp' | 'shards';

export interface MapTarget {
  id: string;
  labelKey: string;
  kind: MapTargetKind;
  icon: string;
  zoneId: ZoneId;
  position: Readonly<{ x: number; y: number; z: number }>;
}

export interface MapScreenData {
  discoveredZoneIds: ReadonlySet<ZoneId>;
  collectedShardIds: ReadonlySet<string>;
  puzzles: Readonly<Record<PuzzleId, PuzzleSnapshot>>;
  playerPosition: Readonly<{ x: number; y: number; z: number }>;
  playerHeading: number;
  tracking: ObjectiveTrackingSnapshot;
}

export interface MapScreenCallbacks {
  onClose: () => void;
  onTrackingChange: (targetId: string | null) => void;
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, name);
}

function zoneCenter(zoneId: ZoneId): { x: number; y: number; z: number } {
  const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
  return {
    x: (zone.bounds.min[0] + zone.bounds.max[0]) / 2,
    y: (zone.bounds.min[1] + zone.bounds.max[1]) / 2,
    z: (zone.bounds.min[2] + zone.bounds.max[2]) / 2,
  };
}

export const MAP_TARGETS: readonly MapTarget[] = WORLD_ZONES.flatMap((zone) => {
  const targets: MapTarget[] = [];
  if (zone.landmark) {
    const [x, y, z] = zone.landmark.position;
    targets.push({
      id: zone.landmark.id,
      labelKey: `compass.landmark.${zone.id}`,
      kind: 'landmark',
      icon: LANDMARK_ICONS[zone.id],
      zoneId: zone.id,
      position: { x, y, z },
    });
  }
  if (zone.sanctuary) {
    const [x, y, z] = zone.sanctuary.position;
    targets.push({
      id: `compass-${zone.sanctuary.id}`,
      labelKey: `compass.sanctuary.${zone.id}`,
      kind: 'sanctuary',
      icon: '✦',
      zoneId: zone.id,
      position: { x, y, z },
    });
  }
  const anchor = WARP_ANCHORS.find((candidate) => candidate.zoneId === zone.id);
  if (anchor) {
    const [x, y, z] = anchor.warpPoint;
    targets.push({
      id: anchor.id,
      labelKey: anchor.nameKey,
      kind: 'warp',
      icon: '⊙',
      zoneId: zone.id,
      position: { x, y, z },
    });
  }
  targets.push({
    id: `shards-${zone.id}`,
    labelKey: `map.shards.${zone.id}`,
    kind: 'shards',
    icon: '◆',
    zoneId: zone.id,
    position: zoneCenter(zone.id),
  });
  return targets;
});

export function getMapTarget(targetId: string): MapTarget | undefined {
  return MAP_TARGETS.find((target) => target.id === targetId);
}

function getPlatformPoints(platform: Platform): string {
  const halfX = platform.size[0] / 2;
  const halfZ = platform.size[2] / 2;
  const rotation = platform.rotation?.[1] ?? 0;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return [
    [-halfX, -halfZ],
    [halfX, -halfZ],
    [halfX, halfZ],
    [-halfX, halfZ],
  ]
    .map(([localX, localZ]) => {
      const x = platform.position[0] + localX! * cosine - localZ! * sine;
      const z = platform.position[2] + localX! * sine + localZ! * cosine;
      return `${x},${z}`;
    })
    .join(' ');
}

export class MapScreen {
  public readonly element = document.createElement('section');
  private readonly svg = svgElement('svg');
  private readonly world = svgElement('g');
  private readonly cancelTracking = document.createElement('button');
  private readonly closeButton = document.createElement('button');
  private data: MapScreenData | undefined;
  private transform: MapTransform = { zoom: 1, panX: 0, panY: 0 };
  private viewport: MapViewport = { width: 1280, height: 720 };
  private dragging = false;
  private dragMoved = false;
  private dragX = 0;
  private dragY = 0;
  private readonly unsubscribeLanguage: () => void;

  public constructor(private readonly callbacks: MapScreenCallbacks) {
    this.element.id = 'map-screen';
    this.element.hidden = true;
    this.element.tabIndex = -1;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.style.setProperty('--map-cyan', PALETTE.neonCyan);
    this.element.style.setProperty('--map-magenta', PALETTE.neonMagenta);
    this.element.style.setProperty('--map-yellow', PALETTE.warningYellow);
    this.element.style.setProperty('--map-structure', PALETTE.structureBlue);
    this.element.style.setProperty('--map-night', PALETTE.nightSky);
    this.svg.classList.add('map-canvas');
    this.svg.setAttribute('role', 'img');
    this.svg.append(this.world);
    this.cancelTracking.type = 'button';
    this.cancelTracking.className = 'map-cancel-tracking';
    this.cancelTracking.addEventListener('click', () => {
      this.callbacks.onTrackingChange(null);
    });
    this.closeButton.type = 'button';
    this.closeButton.className = 'map-close';
    this.closeButton.addEventListener('click', () => this.callbacks.onClose());
    this.element.addEventListener('keydown', this.onKeyDown);
    this.svg.addEventListener('wheel', this.onWheel, { passive: false });
    this.svg.addEventListener('pointerdown', this.onPointerDown);
    this.svg.addEventListener('pointermove', this.onPointerMove);
    this.svg.addEventListener('pointerup', this.onPointerUp);
    this.svg.addEventListener('pointercancel', this.onPointerUp);
    document.body.append(this.element);
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.renderChrome();
      if (this.data) this.renderWorld();
    });
    this.renderChrome();
  }

  public get isOpen(): boolean {
    return !this.element.hidden;
  }

  public open(data: MapScreenData): void {
    this.data = data;
    this.element.hidden = false;
    this.measure();
    this.renderChrome();
    this.renderWorld();
    this.element.focus();
  }

  public close(): void {
    this.element.hidden = true;
    this.dragging = false;
  }

  public update(data: MapScreenData): void {
    this.data = data;
    if (this.isOpen) this.renderWorld();
  }

  public setReducedMotion(reducedMotion: boolean): void {
    this.element.classList.toggle('is-reduced', reducedMotion);
  }

  public panBy(x: number, y: number): void {
    if (!this.isOpen || (x === 0 && y === 0)) return;
    this.transform = clampMapTransform(
      {
        ...this.transform,
        panX: this.transform.panX + x,
        panY: this.transform.panY + y,
      },
      this.viewport,
    );
    this.updateWorldTransform();
  }

  public dispose(): void {
    this.unsubscribeLanguage();
    this.element.removeEventListener('keydown', this.onKeyDown);
    this.svg.removeEventListener('wheel', this.onWheel);
    this.svg.removeEventListener('pointerdown', this.onPointerDown);
    this.svg.removeEventListener('pointermove', this.onPointerMove);
    this.svg.removeEventListener('pointerup', this.onPointerUp);
    this.svg.removeEventListener('pointercancel', this.onPointerUp);
    this.element.remove();
  }

  private renderChrome(): void {
    const header = document.createElement('header');
    header.className = 'map-header';
    const title = document.createElement('h1');
    title.textContent = t('map.title');
    const hint = document.createElement('p');
    hint.textContent = t('map.controls');
    this.cancelTracking.textContent = t('map.cancelTracking');
    this.cancelTracking.hidden = this.data?.tracking.customTargetId === null;
    this.closeButton.textContent = t('map.close');
    header.append(title, hint, this.cancelTracking, this.closeButton);
    this.element.replaceChildren(header, this.svg);
  }

  private renderWorld(): void {
    if (!this.data) return;
    this.world.replaceChildren();
    for (const zone of WORLD_ZONES) {
      const discovered =
        zone.id === 'plaza' || this.data.discoveredZoneIds.has(zone.id);
      const group = svgElement('g');
      group.classList.add('map-zone');
      group.classList.toggle('is-fogged', !discovered);
      group.dataset.zoneId = zone.id;
      group.dataset.fog = discovered ? 'discovered' : 'undiscovered';
      for (const platform of zone.platforms) {
        const outline = svgElement('polygon');
        outline.classList.add('map-platform');
        outline.dataset.kind = platform.kind;
        outline.dataset.accent = platform.accent ?? 'cyan';
        outline.setAttribute('points', getPlatformPoints(platform));
        group.append(outline);
      }
      this.world.append(group);
    }

    for (const target of MAP_TARGETS) {
      const discovered =
        target.zoneId === 'plaza' ||
        this.data.discoveredZoneIds.has(target.zoneId);
      if (target.kind !== 'landmark' && !discovered) continue;
      const selectable = discovered;
      const completed = this.isTargetCompleted(target);
      const detail =
        target.kind === 'shards' ? this.getShardProgress(target.zoneId) : '';
      this.world.append(
        this.createTargetIcon(target, selectable, completed, detail),
      );
    }

    const player = svgElement('g');
    player.classList.add('map-player');
    player.dataset.kind = 'player';
    const playerArrow = svgElement('polygon');
    playerArrow.setAttribute('points', '0,12 -7,-7 0,-3 7,-7');
    player.append(playerArrow);
    const degrees = (this.data.playerHeading * 180) / Math.PI;
    player.setAttribute(
      'transform',
      `translate(${this.data.playerPosition.x} ${this.data.playerPosition.z}) rotate(${-degrees})`,
    );
    player.setAttribute('aria-label', t('map.player'));
    this.world.append(player);
    this.cancelTracking.hidden = this.data.tracking.customTargetId === null;
    this.updateWorldTransform();
  }

  private createTargetIcon(
    target: MapTarget,
    selectable: boolean,
    completed: boolean,
    detail: string,
  ): SVGGElement {
    const icon = svgElement('g');
    icon.classList.add('map-icon');
    icon.classList.toggle(
      'is-tracked',
      target.id === this.data?.tracking.customTargetId,
    );
    icon.classList.toggle('is-complete', completed);
    icon.dataset.kind = target.kind;
    icon.dataset.mapId = target.id;
    icon.dataset.complete = String(completed);
    icon.setAttribute(
      'transform',
      `translate(${target.position.x} ${target.position.z})`,
    );
    const label = `${t(target.labelKey)}${detail ? ` ${detail}` : ''}`;
    icon.setAttribute('aria-label', label);
    if (selectable) {
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('role', 'button');
      icon.addEventListener('click', () => this.selectTarget(target.id));
      icon.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.selectTarget(target.id);
      });
    }
    const hit = svgElement('circle');
    hit.classList.add('map-icon-hit');
    hit.setAttribute('r', '14');
    const glyph = svgElement('text');
    glyph.classList.add('map-icon-glyph');
    glyph.textContent = completed ? '✓' : target.icon;
    const caption = svgElement('text');
    caption.classList.add('map-icon-caption');
    caption.setAttribute('y', '25');
    caption.textContent = detail || t(target.labelKey);
    icon.append(hit, glyph, caption);
    return icon;
  }

  private isTargetCompleted(target: MapTarget): boolean {
    if (!this.data) return false;
    if (target.kind === 'sanctuary') {
      const sanctuaryId = target.id.replace('compass-', '');
      const puzzleId = PUZZLE_BY_SANCTUARY[sanctuaryId];
      return puzzleId ? this.data.puzzles[puzzleId].altarActivated : false;
    }
    if (target.kind === 'warp') {
      const anchor = WARP_ANCHORS.find(
        (candidate) => candidate.id === target.id,
      );
      return anchor?.puzzleId
        ? this.data.puzzles[anchor.puzzleId].altarActivated
        : true;
    }
    return false;
  }

  private getShardProgress(zoneId: ZoneId): string {
    const zone = WORLD_ZONES.find((candidate) => candidate.id === zoneId)!;
    const collected = zone.shards.filter((shard) =>
      this.data?.collectedShardIds.has(shard.id),
    ).length;
    return `${collected}/${zone.shards.length}`;
  }

  private selectTarget(targetId: string): void {
    if (this.dragMoved) return;
    this.callbacks.onTrackingChange(targetId);
  }

  private measure(): void {
    const bounds = this.svg.getBoundingClientRect();
    this.viewport = {
      width: Math.max(1, bounds.width || window.innerWidth),
      height: Math.max(1, bounds.height || window.innerHeight),
    };
    this.svg.setAttribute(
      'viewBox',
      `0 0 ${this.viewport.width} ${this.viewport.height}`,
    );
    this.transform = clampMapTransform(this.transform, this.viewport);
  }

  private updateWorldTransform(): void {
    const scale = getWorldMapScale(this.viewport) * this.transform.zoom;
    this.world.setAttribute(
      'transform',
      `translate(${this.viewport.width / 2 + this.transform.panX} ${this.viewport.height / 2 + this.transform.panY}) scale(${scale})`,
    );
    this.element.dataset.zoom = this.transform.zoom.toFixed(2);
  }

  private setZoom(zoom: number): void {
    this.transform = clampMapTransform(
      { ...this.transform, zoom },
      this.viewport,
    );
    this.updateWorldTransform();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' || event.code === 'KeyM') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.callbacks.onClose();
      return;
    }
    const panStep = event.shiftKey ? 70 : 32;
    const direction = {
      ArrowLeft: [-panStep, 0],
      ArrowRight: [panStep, 0],
      ArrowUp: [0, -panStep],
      ArrowDown: [0, panStep],
    }[event.code];
    if (direction) {
      event.preventDefault();
      this.panBy(direction[0]!, direction[1]!);
      return;
    }
    if (event.code === 'Equal' || event.code === 'NumpadAdd') {
      event.preventDefault();
      this.setZoom(this.transform.zoom * 1.15);
    } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
      event.preventDefault();
      this.setZoom(this.transform.zoom / 1.15);
    } else if (event.code === 'Home') {
      event.preventDefault();
      this.transform = { zoom: 1, panX: 0, panY: 0 };
      this.updateWorldTransform();
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.setZoom(this.transform.zoom * Math.exp(-event.deltaY * 0.001));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if ((event.target as Element).closest('.map-icon')) return;
    this.dragging = true;
    this.dragMoved = false;
    this.dragX = event.clientX;
    this.dragY = event.clientY;
    this.svg.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    const x = event.clientX - this.dragX;
    const y = event.clientY - this.dragY;
    this.dragMoved ||= Math.hypot(x, y) > 2;
    this.dragX = event.clientX;
    this.dragY = event.clientY;
    this.panBy(x, y);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.svg.hasPointerCapture(event.pointerId)) {
      this.svg.releasePointerCapture(event.pointerId);
    }
  };
}
