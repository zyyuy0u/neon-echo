import {
  Euler,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  type WebGLRenderer,
} from 'three';

import { tuning } from '../../core/tuning';
import type { PointerDelta } from '../input/InputSystem';

export interface PhotoCameraBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PhotoCameraPosition {
  x: number;
  y: number;
  z: number;
}

export interface PhotoControls {
  movement: Readonly<{ x: number; y: number }>;
  look: Readonly<{ x: number; y: number }>;
  pointer: Readonly<PointerDelta>;
  rise: number;
}

const WORLD_PADDING = 50;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 200;
const MAX_PITCH = Math.PI / 2 - 0.02;

export function clampPhotoPosition(
  position: Readonly<PhotoCameraPosition>,
  worldBounds: Readonly<PhotoCameraBounds>,
): PhotoCameraPosition {
  return {
    x: Math.min(
      worldBounds.maxX + WORLD_PADDING,
      Math.max(worldBounds.minX - WORLD_PADDING, position.x),
    ),
    y: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, position.y)),
    z: Math.min(
      worldBounds.maxZ + WORLD_PADDING,
      Math.max(worldBounds.minZ - WORLD_PADDING, position.z),
    ),
  };
}

export function createPhotoFilename(date = new Date()): string {
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `neon-echo-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(
    date.getSeconds(),
  )}.png`;
}

interface CameraSnapshot {
  position: Vector3;
  quaternion: Quaternion;
  fieldOfView: number;
}

export class PhotoMode {
  private active = false;
  private snapshot: CameraSnapshot | undefined;
  private yaw = 0;
  private pitch = 0;
  private wheelDelta = 0;
  private wheelRiseDelta = 0;
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly movement = new Vector3();

  public constructor(
    private readonly camera: PerspectiveCamera,
    private readonly renderer: WebGLRenderer,
    private readonly canvas: HTMLCanvasElement,
    private readonly bounds: Readonly<PhotoCameraBounds>,
    private readonly onCapture: () => void,
  ) {
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  public get isActive(): boolean {
    return this.active;
  }

  public enter(): boolean {
    if (this.active) return false;
    this.snapshot = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fieldOfView: this.camera.fov,
    };
    const rotation = new Euler().setFromQuaternion(
      this.camera.quaternion,
      'YXZ',
    );
    this.pitch = rotation.x;
    this.yaw = rotation.y;
    this.wheelDelta = 0;
    this.wheelRiseDelta = 0;
    this.active = true;
    this.canvas.dataset.photoMode = 'active';
    return true;
  }

  public exit(): boolean {
    if (!this.active || !this.snapshot) return false;
    this.camera.position.copy(this.snapshot.position);
    this.camera.quaternion.copy(this.snapshot.quaternion);
    this.camera.fov = this.snapshot.fieldOfView;
    this.camera.updateProjectionMatrix();
    this.snapshot = undefined;
    this.wheelDelta = 0;
    this.wheelRiseDelta = 0;
    this.active = false;
    delete this.canvas.dataset.photoMode;
    return true;
  }

  public update(deltaSeconds: number, controls: Readonly<PhotoControls>): void {
    if (!this.active) return;
    const delta = Math.min(0.1, Math.max(0, deltaSeconds));
    this.yaw -=
      controls.pointer.x * tuning.cameraSensitivity +
      controls.look.x * tuning.photoCameraLookSpeed * delta;
    this.pitch = Math.min(
      MAX_PITCH,
      Math.max(
        -MAX_PITCH,
        this.pitch -
          controls.pointer.y * tuning.cameraSensitivity -
          controls.look.y * tuning.photoCameraLookSpeed * delta,
      ),
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    this.camera.getWorldDirection(this.forward);
    this.right.set(this.forward.z, 0, -this.forward.x).normalize();
    this.forward.y = 0;
    this.forward.normalize();
    this.movement
      .copy(this.right)
      .multiplyScalar(controls.movement.x)
      .addScaledVector(this.forward, controls.movement.y);
    if (this.movement.lengthSq() > 1) this.movement.normalize();
    this.camera.position.addScaledVector(
      this.movement,
      tuning.photoCameraMoveSpeed * delta,
    );
    this.camera.position.y +=
      controls.rise * tuning.photoCameraMoveSpeed * delta +
      this.wheelRiseDelta * tuning.photoCameraWheelSpeed;
    this.camera.position.addScaledVector(
      this.forward,
      this.wheelDelta * tuning.photoCameraWheelSpeed,
    );
    this.wheelDelta = 0;
    this.wheelRiseDelta = 0;

    const clamped = clampPhotoPosition(this.camera.position, this.bounds);
    this.camera.position.set(clamped.x, clamped.y, clamped.z);
  }

  public capture(): void {
    if (!this.active) return;
    this.renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = createPhotoFilename();
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.onCapture();
    }, 'image/png');
  }

  public dispose(): void {
    if (this.active) this.exit();
    window.removeEventListener('wheel', this.onWheel);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.active) return;
    event.preventDefault();
    if (event.shiftKey) this.wheelRiseDelta += Math.sign(-event.deltaY);
    else this.wheelDelta += Math.sign(-event.deltaY);
  };
}
