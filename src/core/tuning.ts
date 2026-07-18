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
  updraftRiseSpeed: number;
  shardPickupRadius: number;
  interactionRadius: number;
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
  followLagHorizontal: number;
  followLagVertical: number;
  autoBehindDelay: number;
  autoBehindRate: number;
  sprintFovBoost: number;
  landingCamDip: number;
  cameraFovKickCoefficient: number;
  cameraShakeStrength: number;
  particleDensityMultiplier: number;
  landingHardSpeedThreshold: number;
  landingSquashDuration: number;
  footstepBaseVolume: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
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
  worldCameraFarPlane: number;
  worldFogNear: number;
  worldFogFar: number;
}

// Mutable by design: the development tuning panel edits these values live.
export const tuning: Tuning = {
  runSpeed: 32.0, // user 指定：原 8.0 的四倍
  groundAccelerationTime: 0.15,
  groundDecelerationTime: 0.1,
  airControl: 0.65,
  jumpHeight: 33, // user 指定：原 2.2 的十五倍
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
  updraftRiseSpeed: 7,
  shardPickupRadius: 2.25,
  interactionRadius: 4.5,
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
  followLagHorizontal: 11,
  followLagVertical: 6,
  autoBehindDelay: 2,
  autoBehindRate: 1.8,
  sprintFovBoost: 6,
  landingCamDip: 0.35,
  cameraFovKickCoefficient: 1,
  cameraShakeStrength: 1,
  particleDensityMultiplier: 1,
  landingHardSpeedThreshold: 10,
  landingSquashDuration: 0.12,
  footstepBaseVolume: 0.085,
  bloomStrength: 1.65,
  bloomRadius: 0.78,
  bloomThreshold: 0.55,
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
  worldCameraFarPlane: 950,
  worldFogNear: 90,
  worldFogFar: 360,
};

export const DEFAULT_CAMERA_SENSITIVITY = tuning.cameraSensitivity;
const FULL_SPRINT_FOV_BOOST = tuning.sprintFovBoost;
const FULL_LANDING_CAM_DIP = tuning.landingCamDip;

export function applyReducedMotion(enabled: boolean): void {
  tuning.sprintFovBoost = enabled ? 0 : FULL_SPRINT_FOV_BOOST;
  tuning.landingCamDip = enabled ? 0 : FULL_LANDING_CAM_DIP;
  tuning.cameraFovKickCoefficient = enabled ? 0 : 1;
  tuning.cameraShakeStrength = enabled ? 0 : 1;
  tuning.particleDensityMultiplier = enabled ? 0.5 : 1;
}
