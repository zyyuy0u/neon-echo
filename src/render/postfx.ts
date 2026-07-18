import {
  ACESFilmicToneMapping,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';

import { tuning } from '../core/tuning';

export interface PostProcessing {
  render: () => void;
  resize: (width: number, height: number) => void;
  setBloom: (enabled: boolean, intensityMultiplier: number) => void;
  getState: () => { bloomEnabled: boolean; bloomIntensity: number };
  dispose: () => void;
}

export function createPostProcessing(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
): PostProcessing {
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const previousInfoAutoReset = renderer.info.autoReset;
  renderer.info.autoReset = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    intensity: tuning.bloomStrength,
    radius: tuning.bloomRadius,
    luminanceThreshold: tuning.bloomThreshold,
    luminanceSmoothing: 0.2,
    mipmapBlur: true,
  });
  const bloomPass = new EffectPass(camera, bloom);
  composer.addPass(bloomPass);
  let bloomIntensityMultiplier = 1;

  return {
    render: () => {
      renderer.info.reset();
      bloom.intensity = tuning.bloomStrength * bloomIntensityMultiplier;
      bloom.mipmapBlurPass.radius = tuning.bloomRadius;
      bloom.luminanceMaterial.threshold = tuning.bloomThreshold;
      composer.render();
    },
    resize: (width, height) => composer.setSize(width, height),
    setBloom: (enabled, intensityMultiplier) => {
      bloomPass.enabled = enabled;
      bloomIntensityMultiplier = Math.min(
        1.5,
        Math.max(0.5, intensityMultiplier),
      );
    },
    getState: () => ({
      bloomEnabled: bloomPass.enabled,
      bloomIntensity: tuning.bloomStrength * bloomIntensityMultiplier,
    }),
    dispose: () => {
      renderer.info.autoReset = previousInfoAutoReset;
      composer.dispose();
    },
  };
}
