import RAPIER from '@dimforge/rapier3d-compat';
import { AmbientLight, Color, Fog, Scene, WebGLRenderer } from 'three';

import { GameLoop } from './core/GameLoop';
import { tuning } from './core/tuning';
import { PALETTE } from './render/palette';
import { createPostProcessing } from './render/postfx';
import { createSynthwaveSky } from './render/sky';
import { ThirdPersonCamera } from './systems/camera/ThirdPersonCamera';
import { CharacterController } from './systems/character/CharacterController';
import { InputSystem } from './systems/input/InputSystem';
import { DevTuningPanel } from './ui/DevTuningPanel';
import { WorldBuilder } from './world/WorldBuilder';
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
  scene.fog = new Fog(
    PALETTE.nightSky,
    tuning.worldFogNear,
    tuning.worldFogFar,
  );
  scene.add(new AmbientLight(PALETTE.neonCyan, 2.1));
  const sky = createSynthwaveSky(scene);

  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const physicsWorld = new RAPIER.World({ x: 0, y: -tuning.gravity, z: 0 });
  const worldBuilder = new WorldBuilder(scene, physicsWorld);
  const character = new CharacterController(physicsWorld, scene);
  const input = new InputSystem(canvas);
  const thirdPersonCamera = new ThirdPersonCamera(physicsWorld, character);
  const camera = thirdPersonCamera.camera;
  thirdPersonCamera.update(1 / 60);

  const postfx = createPostProcessing(renderer, scene, camera);

  const devPanel = import.meta.env.DEV
    ? new DevTuningPanel(renderer)
    : undefined;

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    postfx.resize(width, height);
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
      worldBuilder.update(fixedDeltaSeconds);
      sky.update(fixedDeltaSeconds, camera.position);
    },
    render: () => {
      postfx.render();
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
        getRenderStats: () => ({
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        }),
        getWorldStats: () => worldBuilder.getStats(),
        teleport: (x: number, y: number, z: number) => {
          character.teleport(x, y, z);
          thirdPersonCamera.update(1 / 60);
        },
        getSceneInfo: () => ({
          backgroundHex:
            scene.background instanceof Color
              ? `#${scene.background.getHexString()}`
              : null,
          fogEnabled: scene.fog !== null,
          skyEnabled: scene.getObjectByName('synthwave-sky') !== undefined,
        }),
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
    worldBuilder.dispose();
    sky.dispose();
    window.removeEventListener('resize', resize);
    if (import.meta.env.DEV) Reflect.deleteProperty(window, '__NEON_DEBUG__');
    postfx.dispose();
    renderer.dispose();
    physicsWorld.free();
  };
}

void startGame().then((dispose) => {
  if (import.meta.hot) import.meta.hot.dispose(dispose);
});
