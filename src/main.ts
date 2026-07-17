import RAPIER from '@dimforge/rapier3d-compat';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  Fog,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';

import { GameLoop } from './core/GameLoop';
import { PALETTE } from './render/palette';
import './style.css';

async function startGame(): Promise<() => void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const loading = document.querySelector<HTMLElement>('#loading');
  if (!canvas || !loading)
    throw new Error('Required game elements are missing.');

  await RAPIER.init();

  const scene = new Scene();
  scene.background = new Color(PALETTE.nightSky);
  scene.fog = new Fog(PALETTE.nightSky, 18, 52);

  const camera = new PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(8, 7, 11);
  camera.lookAt(0, 1.25, 0);

  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({
    intensity: 1.8,
    luminanceThreshold: 0.15,
    luminanceSmoothing: 0.3,
    mipmapBlur: true,
  });
  composer.addPass(new EffectPass(camera, bloom));

  scene.add(new AmbientLight(PALETTE.neonCyan, 1.8));

  const ground = new Mesh(
    new PlaneGeometry(40, 40),
    new MeshStandardMaterial({ color: PALETTE.structureBlue, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new GridHelper(
    40,
    40,
    new Color(PALETTE.neonMagenta),
    new Color(PALETTE.neonCyan),
  );
  grid.position.y = 0.015;
  scene.add(grid);

  const cubeMaterial = new MeshStandardMaterial({
    color: PALETTE.neonMagenta,
    emissive: PALETTE.neonMagenta,
    emissiveIntensity: 5,
    roughness: 0.2,
  });
  const cube = new Mesh(new BoxGeometry(2, 2, 2), cubeMaterial);
  cube.position.set(1.5, 2, 0);
  scene.add(cube);

  const ball = new Mesh(
    new SphereGeometry(0.5, 32, 20),
    new MeshStandardMaterial({
      color: PALETTE.warningYellow,
      emissive: PALETTE.sunsetOrange,
      emissiveIntensity: 1.2,
    }),
  );
  scene.add(ball);

  const physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const groundBody = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0),
  );
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.25, 20),
    groundBody,
  );

  const ballBody = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(-2, 6, 0),
  );
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.ball(0.5).setRestitution(0.55),
    ballBody,
  );

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const loop = new GameLoop({
    update: (fixedDeltaSeconds) => {
      physicsWorld.timestep = fixedDeltaSeconds;
      physicsWorld.step();

      const position = ballBody.translation();
      const rotation = ballBody.rotation();
      ball.position.set(position.x, position.y, position.z);
      ball.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      cube.rotation.x += fixedDeltaSeconds * 0.45;
      cube.rotation.y += fixedDeltaSeconds * 0.75;
    },
    render: () => composer.render(),
  });

  loading.hidden = true;
  canvas.dataset.status = 'ready';
  loop.start();

  return () => {
    loop.stop();
    window.removeEventListener('resize', resize);
    composer.dispose();
    renderer.dispose();
    physicsWorld.free();
  };
}

void startGame().then((dispose) => {
  if (import.meta.hot) import.meta.hot.dispose(dispose);
});
