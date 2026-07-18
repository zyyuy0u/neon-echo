import {
  init as initializeRapierModule,
  World,
} from '@dimforge/rapier3d-compat';
import { AmbientLight, Color, Fog, Scene, WebGLRenderer } from 'three';

import { GameLoop } from './core/GameLoop';
import {
  applyReducedMotion,
  DEFAULT_CAMERA_SENSITIVITY,
  tuning,
} from './core/tuning';
import { STELES } from './content/steles';
import { PALETTE } from './render/palette';
import { createParticleSystem } from './render/particles';
import { createPostProcessing } from './render/postfx';
import { createSynthwaveSky } from './render/sky';
import { ThirdPersonCamera } from './systems/camera/ThirdPersonCamera';
import { AbilityState } from './systems/abilities/AbilityState';
import { AudioSystem } from './systems/audio/AudioSystem';
import { CharacterController } from './systems/character/CharacterController';
import { CollectibleState } from './systems/collectibles/CollectibleState';
import { EndingState, type EndingChoice } from './systems/ending/EndingState';
import { InputSystem } from './systems/input/InputSystem';
import { PuzzleState, type PuzzleId } from './systems/puzzles/PuzzleState';
import {
  advancePlaytime,
  clearSaveData,
  createDefaultSaveData,
  hasSaveData,
  loadSaveData,
  SAVE_VERSION,
  saveData,
  type GameSettings,
  type SaveData,
} from './systems/save/SaveSystem';
import { DevTuningPanel } from './ui/DevTuningPanel';
import { GameplayOverlay } from './ui/GameplayOverlay';
import { setLanguage, t } from './ui/i18n';
import { MenuSystem, type MenuName } from './ui/MenuSystem';
import { GameplayWorld } from './world/GameplayWorld';
import { WorldBuilder } from './world/WorldBuilder';
import { WORLD_ZONES } from './world/map/graph';
import type { Ability } from './world/map/types';
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
    await initializeRapierModule();
  } finally {
    console.warn = warn;
  }
}

function distanceTo(
  a: Readonly<{ x: number; y: number; z: number }>,
  b: Readonly<{ x: number; y: number; z: number }>,
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function normalizePuzzleId(id: string): PuzzleId | undefined {
  const aliases: Readonly<Record<string, PuzzleId>> = {
    pulseTrack: 'pulseTrack',
    'pulse-track': 'pulseTrack',
    'sanctuary-dash': 'pulseTrack',
    lightBridge: 'lightBridge',
    'light-bridge': 'lightBridge',
    'sanctuary-double-jump': 'lightBridge',
    windWell: 'windWell',
    'wind-well': 'windWell',
    'sanctuary-glide': 'windWell',
  };
  return aliases[id];
}

async function startGame(): Promise<() => void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const loading = document.querySelector<HTMLElement>('#loading');
  if (!canvas || !loading) {
    throw new Error('Required game elements are missing.');
  }

  await initializeRapier();

  const bootSave = loadSaveData();
  let settings = structuredClone(bootSave.settings);
  setLanguage(settings.language);
  canvas.setAttribute('aria-label', t('game.canvasLabel'));
  const loadingSignal = loading.querySelector<HTMLElement>('.loading-signal');
  if (loadingSignal) loadingSignal.textContent = t('loading.initializing');
  applyReducedMotion(settings.reducedMotion);
  tuning.cameraSensitivity =
    DEFAULT_CAMERA_SENSITIVITY * settings.mouseSensitivity;

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

  const physicsWorld = new World({ x: 0, y: -tuning.gravity, z: 0 });
  const abilities = new AbilityState();
  const puzzles = new PuzzleState(abilities);
  const ending = new EndingState();
  const shardPlacements = WORLD_ZONES.flatMap((zone) => zone.shards);
  const stelePlacements = WORLD_ZONES.flatMap((zone) => zone.steles);
  const collectibles = new CollectibleState(shardPlacements);
  const audio = new AudioSystem(settings.volume);
  audio.bindGestureUnlock(window);
  const particles = createParticleSystem(scene, settings.reducedMotion);
  const worldBuilder = new WorldBuilder(scene, physicsWorld);
  const gameplayWorld = new GameplayWorld(scene, physicsWorld, puzzles, {
    onPuzzleProgress: (_id, completed) =>
      audio.play(completed ? 'puzzleComplete' : 'puzzleProgress'),
  });
  const character = new CharacterController(physicsWorld, scene, abilities);
  const input = new InputSystem(canvas, settings.bindings);
  const overlay = new GameplayOverlay();
  overlay.setSubtitleSize(settings.subtitleSize);
  const thirdPersonCamera = new ThirdPersonCamera(physicsWorld, character);
  const camera = thirdPersonCamera.camera;
  thirdPersonCamera.update(1 / 60);

  const postfx = createPostProcessing(renderer, scene, camera);

  const devPanel = import.meta.env.DEV
    ? new DevTuningPanel(renderer)
    : undefined;

  let sessionStarted = false;
  let readSteleIds = new Set<string>();
  let lastPuzzleSignature = JSON.stringify(puzzles.getAll());
  let playtimeSeconds = bootSave.playtimeSeconds;
  let shardStreak = 0;
  let lastShardPickupPlaytime = Number.NEGATIVE_INFINITY;

  const getSnapshot = (): SaveData => {
    const position = character.getPosition();
    return {
      version: SAVE_VERSION,
      abilities: [...abilities.getAll()],
      collectedShardIds: [...collectibles.getAll()],
      readSteleIds: [...readSteleIds],
      puzzles: puzzles.getAll(),
      playerPosition: { x: position.x, y: position.y, z: position.z },
      settings: structuredClone(settings),
      ending: { choice: ending.getChoice() ?? null },
      playtimeSeconds,
    };
  };

  const persist = (): void => {
    if (sessionStarted) saveData(getSnapshot());
    else saveData({ ...loadSaveData(), settings: structuredClone(settings) });
  };

  abilities.onUnlock(({ ability }) => {
    overlay.showUnlock(ability);
    audio.play('abilityUnlock');
    particles.unlockHalo(character.getPosition());
    if (sessionStarted) persist();
  });
  collectibles.onCollect(({ id, count }) => {
    worldBuilder.setShardCollected(id);
    overlay.setShardCount(count, true);
    const placement = shardPlacements.find((shard) => shard.id === id);
    if (placement) {
      const [x, y, z] = placement.position;
      particles.burstShard({ x, y, z });
    }
    shardStreak =
      playtimeSeconds - lastShardPickupPlaytime <= 4 ? shardStreak + 1 : 1;
    lastShardPickupPlaytime = playtimeSeconds;
    audio.play('shardPickup', { streak: shardStreak });
    if (sessionStarted) persist();
  });

  const chooseEnding = (choice: EndingChoice): void => {
    if (!ending.choose(choice)) return;
    audio.triggerEnding(choice);
    particles.triggerEnding(choice);
    overlay.showEnding(choice, {
      shards: collectibles.count,
      steles: readSteleIds.size,
      playtimeSeconds,
    });
    persist();
  };

  const tryInteraction = (): void => {
    if (overlay.closeStele()) return;
    const position = character.getPosition();
    const nearbyStele = stelePlacements.find((placement) => {
      const [x, y, z] = placement.position;
      return distanceTo(position, { x, y, z }) <= tuning.interactionRadius;
    });
    if (nearbyStele) {
      const content = STELES.find((entry) => entry.id === nearbyStele.id);
      if (content) {
        overlay.showStele(content);
        audio.play('steleOpen');
        readSteleIds.add(content.id);
        persist();
      }
      return;
    }

    const altar = gameplayWorld.getNearbyAltar(
      position,
      tuning.interactionRadius,
    );
    if (altar) {
      puzzles.activateAltar(altar);
      return;
    }

    ending.updateRequirements(collectibles.count, new Set(abilities.getAll()));
    if (
      distanceTo(position, { x: 0, y: -17, z: 350 }) <=
        tuning.interactionRadius + 8 &&
      ending.interact()
    ) {
      overlay.showEndingChoice(chooseEnding);
    }
  };

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
      const positionBeforeMove = character.getPosition();
      const locomotion = character.update(fixedDeltaSeconds, {
        move,
        jumpPressed: input.wasActionPressed('jump'),
        jumpHeld: input.isActionHeld('jump'),
        jumpReleased: input.wasActionReleased('jump'),
        dashPressed: input.wasActionPressed('dash'),
        inUpdraft: gameplayWorld.isInUpdraft(positionBeforeMove),
      });
      if (locomotion.jumped) audio.play('jump');
      if (locomotion.doubleJumped) audio.play('doubleJump');
      if (locomotion.dashStarted) audio.play('dash');
      if (input.wasActionPressed('interact')) tryInteraction();
      if (input.wasPressed('Backquote')) devPanel?.toggle();
      input.endFixedStep();

      physicsWorld.timestep = fixedDeltaSeconds;
      physicsWorld.step();
      character.syncVisual();
      const position = character.getPosition();
      if (sessionStarted) {
        playtimeSeconds = advancePlaytime(playtimeSeconds, fixedDeltaSeconds);
      }
      collectibles.collectNearest(position, tuning.shardPickupRadius);
      gameplayWorld.update(fixedDeltaSeconds, position);
      const puzzleSignature = JSON.stringify(puzzles.getAll());
      if (puzzleSignature !== lastPuzzleSignature) {
        lastPuzzleSignature = puzzleSignature;
        if (sessionStarted) persist();
      }
      thirdPersonCamera.update(fixedDeltaSeconds);
      worldBuilder.update(fixedDeltaSeconds);
      particles.update(fixedDeltaSeconds);
      audio.update(fixedDeltaSeconds, position);
      sky.update(fixedDeltaSeconds, camera.position);
    },
    render: () => {
      postfx.render();
      devPanel?.recordFrame();
    },
  });

  const applySettings = (nextSettings: GameSettings): void => {
    settings = structuredClone(nextSettings);
    setLanguage(settings.language);
    canvas.setAttribute('aria-label', t('game.canvasLabel'));
    input.setBindings(settings.bindings);
    overlay.setSubtitleSize(settings.subtitleSize);
    audio.setVolume(settings.volume);
    particles.setReducedMotion(settings.reducedMotion);
    tuning.cameraSensitivity =
      DEFAULT_CAMERA_SENSITIVITY * settings.mouseSensitivity;
    applyReducedMotion(settings.reducedMotion);
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  };

  const restoreSnapshot = (snapshot: SaveData): void => {
    abilities.restore(snapshot.abilities);
    collectibles.restore(snapshot.collectedShardIds);
    puzzles.restore(snapshot.puzzles);
    ending.restore(snapshot.ending.choice);
    playtimeSeconds = snapshot.playtimeSeconds;
    readSteleIds = new Set(snapshot.readSteleIds);
    worldBuilder.setCollectedShards(snapshot.collectedShardIds);
    character.teleport(
      snapshot.playerPosition.x,
      snapshot.playerPosition.y,
      snapshot.playerPosition.z,
    );
    thirdPersonCamera.update(1 / 60);
    overlay.setAbilities(snapshot.abilities);
    overlay.setShardCount(snapshot.collectedShardIds.length);
    if (snapshot.ending.choice) particles.triggerEnding(snapshot.ending.choice);
    applySettings(snapshot.settings);
    lastPuzzleSignature = JSON.stringify(puzzles.getAll());
  };

  const startSession = (snapshot: SaveData): void => {
    restoreSnapshot(snapshot);
    sessionStarted = true;
    overlay.setActive(true);
    loop.setPaused(false);
  };

  const startNewGame = (): void => {
    clearSaveData();
    const freshSave = createDefaultSaveData();
    startSession(freshSave);
    saveData(getSnapshot());
    menu.setSettings(settings);
  };

  const openMenu = (name: MenuName): void => {
    if (name === 'none') {
      if (!sessionStarted) startNewGame();
      overlay.setActive(true);
      loop.setPaused(false);
    } else {
      loop.setPaused(true);
      overlay.setActive(false);
    }
    menu.open(name);
  };

  const menu = new MenuSystem(settings, {
    canContinue: () => sessionStarted || hasSaveData(),
    onContinue: () => {
      if (!sessionStarted) startSession(loadSaveData());
      else {
        overlay.setActive(true);
        loop.setPaused(false);
      }
    },
    onNewGame: startNewGame,
    onResume: () => {
      overlay.setActive(true);
      loop.setPaused(false);
    },
    onMainMenu: () => {
      if (sessionStarted) persist();
      overlay.setActive(false);
      loop.setPaused(true);
    },
    onSettingsChange: (nextSettings) => {
      applySettings(nextSettings);
      persist();
    },
  });

  const onEscape = (event: KeyboardEvent): void => {
    if (event.code === 'Escape' && menu.name === 'none' && sessionStarted) {
      openMenu('pause');
    }
  };
  const onPointerLockChange = (): void => {
    if (
      document.pointerLockElement === null &&
      menu.name === 'none' &&
      sessionStarted
    ) {
      openMenu('pause');
    }
  };
  window.addEventListener('keydown', onEscape);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  const autoSaveInterval = window.setInterval(() => {
    if (sessionStarted) persist();
  }, 30_000);

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
        grantAbility: (ability: Ability) => abilities.unlock(ability),
        getAbilities: () => abilities.getAll(),
        getShardCount: () => collectibles.count,
        collectNearestShard: () =>
          collectibles.collectNearest(character.getPosition(), Infinity),
        getPuzzleState: (id: string) => {
          const puzzleId = normalizePuzzleId(id);
          return puzzleId ? puzzles.get(puzzleId) : undefined;
        },
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
        getSaveData: () =>
          structuredClone(sessionStarted ? getSnapshot() : loadSaveData()),
        getAudioState: () => audio.getState(),
        setLanguage: (language: 'zh-TW' | 'en') => {
          applySettings({ ...settings, language });
          menu.setSettings(settings);
          persist();
        },
        openMenu,
      },
    });
  }

  loading.hidden = true;
  canvas.dataset.status = 'ready';
  loop.start();
  loop.setPaused(true);

  return () => {
    loop.stop();
    window.clearInterval(autoSaveInterval);
    window.removeEventListener('keydown', onEscape);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    input.dispose();
    menu.dispose();
    devPanel?.dispose();
    character.dispose(scene);
    gameplayWorld.dispose(scene);
    worldBuilder.dispose();
    particles.dispose();
    audio.dispose();
    overlay.dispose();
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
