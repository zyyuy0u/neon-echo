import { tuning, type Tuning } from '../core/tuning';

type NumericTuningKey = {
  [Key in keyof Tuning]: Tuning[Key] extends number ? Key : never;
}[keyof Tuning];

const editableFields: readonly {
  key: NumericTuningKey;
  label: string;
  step: number;
}[] = [
  { key: 'runSpeed', label: 'Run speed', step: 0.1 },
  { key: 'groundAccelerationTime', label: 'Acceleration', step: 0.01 },
  { key: 'groundDecelerationTime', label: 'Stopping', step: 0.01 },
  { key: 'airControl', label: 'Air control', step: 0.05 },
  { key: 'jumpHeight', label: 'Jump height', step: 0.1 },
  { key: 'coyoteTime', label: 'Coyote time', step: 0.01 },
  { key: 'jumpBufferTime', label: 'Jump buffer', step: 0.01 },
  { key: 'gravity', label: 'Gravity', step: 0.5 },
  { key: 'jumpReleaseGravityMultiplier', label: 'Jump cut', step: 0.1 },
  { key: 'cameraDistance', label: 'Camera distance', step: 0.1 },
  { key: 'cameraSensitivity', label: 'Mouse sensitivity', step: 0.0001 },
  { key: 'cameraPositionSmoothing', label: 'Camera smoothing', step: 0.5 },
];

export class DevTuningPanel {
  private readonly root = document.createElement('aside');
  private readonly fps = document.createElement('output');
  private frameCount = 0;
  private sampleStart = performance.now();

  public constructor() {
    this.root.id = 'tuning-panel';
    this.root.hidden = true;
    const heading = document.createElement('h2');
    heading.textContent = 'MOVEMENT LAB';
    this.fps.className = 'tuning-fps';
    this.fps.textContent = 'FPS --';
    this.root.append(heading, this.fps);

    for (const field of editableFields) {
      const label = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = field.label;
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
  }

  public toggle(): void {
    this.root.hidden = !this.root.hidden;
  }

  public recordFrame(now = performance.now()): void {
    this.frameCount += 1;
    const elapsed = now - this.sampleStart;
    if (elapsed < 500) return;
    this.fps.textContent = `FPS ${Math.round((this.frameCount * 1000) / elapsed)}`;
    this.frameCount = 0;
    this.sampleStart = now;
  }

  public dispose(): void {
    this.root.remove();
  }
}
