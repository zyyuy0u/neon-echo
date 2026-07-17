import { tuning, type Tuning } from '../core/tuning';
import type { WebGLRenderer } from 'three';
import { onLanguageChange, t } from './i18n';

type NumericTuningKey = {
  [Key in keyof Tuning]: Tuning[Key] extends number ? Key : never;
}[keyof Tuning];

const editableFields: readonly {
  key: NumericTuningKey;
  labelKey: string;
  step: number;
}[] = [
  { key: 'runSpeed', labelKey: 'dev.runSpeed', step: 0.1 },
  { key: 'groundAccelerationTime', labelKey: 'dev.acceleration', step: 0.01 },
  { key: 'groundDecelerationTime', labelKey: 'dev.stopping', step: 0.01 },
  { key: 'airControl', labelKey: 'dev.airControl', step: 0.05 },
  { key: 'jumpHeight', labelKey: 'dev.jumpHeight', step: 0.1 },
  { key: 'coyoteTime', labelKey: 'dev.coyoteTime', step: 0.01 },
  { key: 'jumpBufferTime', labelKey: 'dev.jumpBuffer', step: 0.01 },
  { key: 'gravity', labelKey: 'dev.gravity', step: 0.5 },
  { key: 'jumpReleaseGravityMultiplier', labelKey: 'dev.jumpCut', step: 0.1 },
  { key: 'cameraDistance', labelKey: 'dev.cameraDistance', step: 0.1 },
  { key: 'cameraSensitivity', labelKey: 'dev.mouseSensitivity', step: 0.0001 },
  { key: 'cameraPositionSmoothing', labelKey: 'dev.cameraSmoothing', step: 0.5 },
  { key: 'bloomStrength', labelKey: 'dev.bloomStrength', step: 0.05 },
  { key: 'bloomRadius', labelKey: 'dev.bloomRadius', step: 0.05 },
  { key: 'bloomThreshold', labelKey: 'dev.bloomThreshold', step: 0.05 },
];

export class DevTuningPanel {
  private readonly root = document.createElement('aside');
  private readonly fps = document.createElement('output');
  private readonly rendererStats = document.createElement('output');
  private readonly heading = document.createElement('h2');
  private readonly captions = new Map<string, HTMLElement>();
  private readonly unsubscribeLanguage: () => void;
  private frameCount = 0;
  private sampleStart = performance.now();

  public constructor(private readonly renderer: WebGLRenderer) {
    this.root.id = 'tuning-panel';
    this.root.hidden = true;
    this.heading.textContent = t('dev.title');
    this.fps.className = 'tuning-fps';
    this.fps.textContent = t('dev.fps', { value: '--' });
    this.rendererStats.className = 'tuning-renderer-stats';
    this.rendererStats.textContent = t('dev.renderStats', {
      draw: '--',
      triangles: '--',
    });
    this.root.append(this.heading, this.fps, this.rendererStats);

    for (const field of editableFields) {
      const label = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = t(field.labelKey);
      this.captions.set(field.labelKey, caption);
      const input = document.createElement('input');
      input.type = 'number';
      input.step = String(field.step);
      input.value = String(tuning[field.key]);
      input.addEventListener('input', () => {
        const value = input.valueAsNumber;
        if (Number.isFinite(value)) tuning[field.key] = value;
      });
      label.append(caption, input);
      this.root.append(label);
    }

    document.body.append(this.root);
    this.unsubscribeLanguage = onLanguageChange(() => this.renderLabels());
  }

  public toggle(): void {
    this.root.hidden = !this.root.hidden;
  }

  public recordFrame(now = performance.now()): void {
    this.frameCount += 1;
    const elapsed = now - this.sampleStart;
    if (elapsed < 500) return;
    this.fps.textContent = t('dev.fps', {
      value: Math.round((this.frameCount * 1000) / elapsed),
    });
    const { calls, triangles } = this.renderer.info.render;
    this.rendererStats.textContent = t('dev.renderStats', {
      draw: calls,
      triangles: triangles.toLocaleString(),
    });
    this.frameCount = 0;
    this.sampleStart = now;
  }

  public dispose(): void {
    this.unsubscribeLanguage();
    this.root.remove();
  }

  private renderLabels(): void {
    this.heading.textContent = t('dev.title');
    for (const [key, caption] of this.captions) caption.textContent = t(key);
  }
}
