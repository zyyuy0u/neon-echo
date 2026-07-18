import {
  formatCompassDistance,
  getBearing,
  projectCompassBearing,
} from '../systems/compass/projection';
import { onLanguageChange, t } from './i18n';

export type CompassTargetKind = 'landmark' | 'sanctuary' | 'core' | 'custom';

export interface CompassTarget {
  id: string;
  labelKey: string;
  kind: CompassTargetKind;
  icon: string;
  position: Readonly<{ x: number; y: number; z: number }>;
}

interface MarkerView {
  element: HTMLElement;
  target?: CompassTarget;
  bearing?: number;
}

const CARDINALS = [
  { label: 'N', bearing: 0 },
  { label: 'E', bearing: Math.PI / 2 },
  { label: 'S', bearing: Math.PI },
  { label: 'W', bearing: -Math.PI / 2 },
] as const;

export class CompassBar {
  public readonly element = document.createElement('section');
  private readonly track = document.createElement('div');
  private readonly markers = new Map<string, MarkerView>();
  private targets: readonly CompassTarget[] = [];
  private playerPosition = { x: 0, y: 0, z: 0 };
  private heading = 0;
  private trackedTargetId: string | undefined;
  private readonly unsubscribeLanguage: () => void;

  public constructor() {
    this.element.className = 'compass-bar';
    this.element.setAttribute('aria-label', t('compass.label'));
    this.track.className = 'compass-track';
    this.element.append(this.track);
    for (const cardinal of CARDINALS) {
      const element = document.createElement('span');
      element.className = 'compass-cardinal';
      element.textContent = cardinal.label;
      element.setAttribute('aria-hidden', 'true');
      this.track.append(element);
      this.markers.set(`cardinal-${cardinal.label}`, {
        element,
        bearing: cardinal.bearing,
      });
    }
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.element.setAttribute('aria-label', t('compass.label'));
      this.renderTargetLabels();
    });
  }

  public setTargets(targets: readonly CompassTarget[]): void {
    this.targets = targets;
    for (const [id, view] of this.markers) {
      if (view.target && !targets.some((target) => target.id === id)) {
        view.element.remove();
        this.markers.delete(id);
      }
    }
    for (const target of targets) {
      const existing = this.markers.get(target.id);
      if (existing) {
        existing.target = target;
        existing.element.dataset.kind = target.kind;
        const icon = existing.element.querySelector<HTMLElement>(
          '.compass-marker-icon',
        );
        if (icon) icon.textContent = target.icon;
        continue;
      }
      const element = document.createElement('span');
      element.className = 'compass-marker';
      element.dataset.compassId = target.id;
      element.dataset.kind = target.kind;
      const icon = document.createElement('span');
      icon.className = 'compass-marker-icon';
      icon.textContent = target.icon;
      const distance = document.createElement('small');
      distance.className = 'compass-distance';
      element.append(icon, distance);
      this.track.append(element);
      this.markers.set(target.id, { element, target });
    }
    this.renderTargetLabels();
    this.renderTrackedTarget();
    this.update(this.playerPosition, this.heading);
  }

  public setTrackedTarget(targetId: string | undefined): void {
    this.trackedTargetId = targetId;
    this.renderTrackedTarget();
  }

  public setReducedMotion(reducedMotion: boolean): void {
    this.element.classList.toggle('is-reduced', reducedMotion);
  }

  public update(
    position: Readonly<{ x: number; y: number; z: number }>,
    heading: number,
  ): void {
    this.playerPosition = { x: position.x, y: position.y, z: position.z };
    this.heading = heading;
    for (const view of this.markers.values()) {
      const bearing =
        view.bearing ??
        (view.target ? getBearing(position, view.target.position) : 0);
      const projection = projectCompassBearing(heading, bearing);
      view.element.hidden = !projection.visible;
      view.element.style.left = `${projection.positionPercent}%`;
      view.element.style.opacity = String(projection.opacity);
      if (!view.target) continue;
      const distance = Math.hypot(
        position.x - view.target.position.x,
        position.y - view.target.position.y,
        position.z - view.target.position.z,
      );
      const distanceElement =
        view.element.querySelector<HTMLElement>('.compass-distance');
      if (distanceElement)
        distanceElement.textContent = formatCompassDistance(distance);
    }
  }

  public dispose(): void {
    this.unsubscribeLanguage();
    this.element.remove();
  }

  private renderTargetLabels(): void {
    for (const target of this.targets) {
      const element = this.markers.get(target.id)?.element;
      if (!element) continue;
      element.title = t(target.labelKey);
      element.setAttribute('aria-label', t(target.labelKey));
    }
  }

  private renderTrackedTarget(): void {
    for (const view of this.markers.values()) {
      if (!view.target) continue;
      const tracked = view.target.id === this.trackedTargetId;
      view.element.classList.toggle('is-tracked', tracked);
      view.element.dataset.tracked = String(tracked);
      if (tracked) this.track.append(view.element);
    }
  }
}
