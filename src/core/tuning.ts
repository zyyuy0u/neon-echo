export interface Tuning {
  runSpeed: number;
  groundAccelerationTime: number;
  groundDecelerationTime: number;
  airControl: number;
  jumpHeight: number;
  coyoteTime: number;
  jumpBufferTime: number;
  gravity: number;
  jumpReleaseGravityMultiplier: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  doubleJumpHeight: number;
  glideFallSpeed: number;
  glideForwardSpeed: number;
  cameraDistance: number;
  cameraSensitivity: number;
  cameraFieldOfView: number;
  cameraNearPlane: number;
  cameraFarPlane: number;
  cameraInitialPitch: number;
  cameraPitchMin: number;
  cameraPitchMax: number;
  cameraHeight: number;
  cameraCollisionPadding: number;
  cameraPositionSmoothing: number;
  invertCameraX: boolean;
  invertCameraY: boolean;
  characterRadius: number;
  characterHalfHeight: number;
  characterControllerOffset: number;
  groundSnapDistance: number;
  maximumStepHeight: number;
  minimumStepWidth: number;
  maximumSlopeAngle: number;
  minimumSlideAngle: number;
}

// Mutable by design: the development tuning panel edits these values live.
export const tuning: Tuning = {
  runSpeed: 8.0,
  groundAccelerationTime: 0.15,
  groundDecelerationTime: 0.1,
  airControl: 0.65,
  jumpHeight: 2.2,
  coyoteTime: 0.12,
  jumpBufferTime: 0.1,
  gravity: 24,
  jumpReleaseGravityMultiplier: 3,
  dashSpeed: 20,
  dashDuration: 0.18,
  dashCooldown: 0.8,
  doubleJumpHeight: 1.8,
  glideFallSpeed: 2.5,
  glideForwardSpeed: 10,
  cameraDistance: 5.5,
  cameraSensitivity: 0.0025,
  cameraFieldOfView: 55,
  cameraNearPlane: 0.1,
  cameraFarPlane: 120,
  cameraInitialPitch: 0.35,
  cameraPitchMin: -0.35,
  cameraPitchMax: 1.05,
  cameraHeight: 0.85,
  cameraCollisionPadding: 0.18,
  cameraPositionSmoothing: 14,
  invertCameraX: false,
  invertCameraY: false,
  characterRadius: 0.42,
  characterHalfHeight: 0.7,
  characterControllerOffset: 0.03,
  groundSnapDistance: 0.24,
  maximumStepHeight: 0.38,
  minimumStepWidth: 0.25,
  maximumSlopeAngle: Math.PI * 0.28,
  minimumSlideAngle: Math.PI * 0.32,
};
