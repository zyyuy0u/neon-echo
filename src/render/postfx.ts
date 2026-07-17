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
  composer.addPass(new EffectPass(camera, bloom));

  return {
    render: () => {
      renderer.info.reset();
      bloom.intensity = tuning.bloomStrength;
      bloom.mipmapBlurPass.radius = tuning.bloomRadius;
      bloom.luminanceMaterial.threshold = tuning.bloomThreshold;
      composer.render();
    },
    resize: (width, height) => composer.setSize(width, height),
    dispose: () => {
      renderer.info.autoReset = previousInfoAutoReset;
      composer.dispose();
    },
  };
}
