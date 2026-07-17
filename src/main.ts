import RAPIER from '@dimforge/rapier3d-compat';
import { AmbientLight, Color, Fog, Scene, WebGLRenderer } from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';

import { GameLoop } from './core/GameLoop';
import { tuning } from './core/tuning';
import { PALETTE } from './render/palette';
import { ThirdPersonCamera } from './systems/camera/ThirdPersonCamera';
import { CharacterController } from './systems/character/CharacterController';
import { InputSystem } from './systems/input/InputSystem';
import { DevTuningPanel } from './ui/DevTuningPanel';
import { createGraybox } from './world/graybox';
import './style.css';

async function initializeRapier(): Promise<void> {
  // rapier3d-compat 0.19.3（最新版）內部 wasm-bindgen 膠水以舊式參數呼叫 init，
  // 呼叫端無法避免此警告（rapier_wasm3d.js:6169），故僅在 init 期間過濾該一條訊息。
  const warn = console.warn;
  console.warn = (...values: unknown[]): void => {
    const message = values[0];
    if (
      typeof message === 'string' &&
      message.includes('deprecated parameters for the initialization function')
    ) {
      return;
    }
    warn(...values);
  };
  try {
    // rapier3d-compat 0.19.3 still forwards its embedded WASM using the old
    // wasm-bindgen signature. Keep the compatibility init scoped and quiet.
    await RAPIER.init();
  } finally {
    console.warn = warn;
  }
}

async function startGame(): Promise<() => void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const loading = document.querySelector<HTMLElement>('#loading');
  if (!canvas || !loading) {
    throw new Error('Required game elements are missing.');
  }

  await initializeRapier();

  const scene = new Scene();
  scene.background = new Color(PALETTE.nightSky);
  scene.fog = new Fog(PALETTE.nightSky, 22, 70);
  scene.add(new AmbientLight(PALETTE.neonCyan, 2.1));

  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const physicsWorld = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  const disposeGraybox = createGraybox(scene, physicsWorld);
  const character = new CharacterController(physicsWorld, scene);
  const input = new InputSystem(canvas);
  const thirdPersonCamera = new ThirdPersonCamera(physicsWorld, character);
  const camera = thirdPersonCamera.camera;
  thirdPersonCamera.update(1 / 60);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({
    intensity: 1.65,
    luminanceThreshold: 0.12,
    luminanceSmoothing: 0.35,
    mipmapBlur: true,
  });
  composer.addPass(new EffectPass(camera, bloom));

  const devPanel = import.meta.env.DEV ? new DevTuningPanel() : undefined;

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    thirdPersonCamera.resize(width, height);
  };
  window.addEventListener('resize', resize);
  resize();

  const loop = new GameLoop({
    update: (fixedDeltaSeconds) => {
      thirdPersonCamera.applyPointerDelta(input.consumePointerDelta());
      const move = thirdPersonCamera.getMovementDirection(
        input.getMovementAxes(),
      );
      character.update(fixedDeltaSeconds, {
        move,
        jumpPressed: input.wasPressed('Space'),
        jumpHeld: input.isHeld('Space'),
        jumpReleased: input.wasReleased('Space'),
      });
      if (input.wasPressed('Backquote')) devPanel?.toggle();
      input.endFixedStep();

      physicsWorld.timestep = fixedDeltaSeconds;
      physicsWorld.step();
      character.syncVisual();
      thirdPersonCamera.update(fixedDeltaSeconds);
    },
    render: () => {
      composer.render();
      devPanel?.recordFrame();
    },
  });

  if (import.meta.env.DEV) {
    Object.assign(window, {
      __NEON_DEBUG__: {
        getPlayerPosition: () => {
          const position = character.getPosition();
          return { x: position.x, y: position.y, z: position.z };
        },
        isGrounded: () => character.isGrounded(),
      },
    });
  }

  loading.hidden = true;
  canvas.dataset.status = 'ready';
  loop.start();

  return () => {
    loop.stop();
    input.dispose();
    devPanel?.dispose();
    character.dispose(scene);
    disposeGraybox();
    window.removeEventListener('resize', resize);
    if (import.meta.env.DEV) Reflect.deleteProperty(window, '__NEON_DEBUG__');
    composer.dispose();
    renderer.dispose();
    physicsWorld.free();
  };
}

void startGame().then((dispose) => {
  if (import.meta.hot) import.meta.hot.dispose(dispose);
});
