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
import { getRenderPixelRatio } from './render/resolution';
import { createSynthwaveSky } from './render/sky';
import { ThirdPersonCamera } from './systems/camera/ThirdPersonCamera';
import {
  advanceDayPhase,
  getDayMood,
  normalizeDayPhase,
} from './systems/mood/dayCycle';
import { AbilityState } from './systems/abilities/AbilityState';
import { AudioSystem } from './systems/audio/AudioSystem';
import { CharacterController } from './systems/character/CharacterController';
import { CollectibleState } from './systems/collectibles/CollectibleState';
import { EndingState, type EndingChoice } from './systems/ending/EndingState';
import { InputSystem } from './systems/input/InputSystem';
import { GamepadSystem, type InputDevice } from './systems/input/GamepadSystem';
import { PuzzleState, type PuzzleId } from './systems/puzzles/PuzzleState';
import {
  ObjectiveTracker,
  resolveTrackedObjective,
  type TrackedObjective,
} from './systems/objectives/ObjectiveTracker';
import type { ObjectiveProgress } from './systems/objectives/objectives';
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
import {
  TutorialSystem,
  type TutorialDefinition,
} from './systems/tutorial/TutorialSystem';
import { DevTuningPanel } from './ui/DevTuningPanel';
import { CompassBar, type CompassTarget } from './ui/CompassBar';
import { GameplayOverlay } from './ui/GameplayOverlay';
import { setLanguage, t } from './ui/i18n';
import { MenuSystem, type MenuName } from './ui/MenuSystem';
import { getMapTarget, MapScreen, type MapScreenData } from './ui/MapScreen';
import { WARP_ANCHORS } from './systems/warp/anchors';
import { isWarpUnlocked, type WarpAnchor } from './systems/warp/WarpSystem';
import { GameplayWorld } from './world/GameplayWorld';
import { WorldBuilder } from './world/WorldBuilder';
import { WORLD_ZONES } from './world/map/graph';
import type { Ability, ZoneId } from './world/map/types';
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

const PUZZLE_ABILITY: Readonly<Record<PuzzleId, Ability>> = {
  pulseTrack: 'dash',
  lightBridge: 'doubleJump',
  windWell: 'glide',
};

const LANDMARK_ICONS: Readonly<Record<string, string>> = {
  skylift: '△',
  spire: '┃',
  ring: '◯',
  chasm: '◇',
};

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
  let dayPhase = bootSave.dayPhase;
  let currentMood = getDayMood(dayPhase);
  scene.background = new Color(currentMood.zenith);
  scene.fog = new Fog(currentMood.fog, tuning.worldFogNear, tuning.worldFogFar);
  const ambientLight = new AmbientLight(
    PALETTE.neonCyan,
    currentMood.ambientIntensity,
  );
  scene.add(ambientLight);
  const sky = createSynthwaveSky(scene);
  sky.setMood(currentMood);

  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(
    getRenderPixelRatio(window.devicePixelRatio, settings.resolutionScale),
  );

  const physicsWorld = new World({ x: 0, y: -tuning.gravity, z: 0 });
  const abilities = new AbilityState();
  const puzzles = new PuzzleState(abilities);
  const ending = new EndingState();
  const shardPlacements = WORLD_ZONES.flatMap((zone) => zone.shards);
  const stelePlacements = WORLD_ZONES.flatMap((zone) => zone.steles);
  const collectibles = new CollectibleState(shardPlacements);
  const audio = new AudioSystem(settings.musicVolume, settings.sfxVolume);
  audio.bindGestureUnlock(window);
  const particles = createParticleSystem(
    scene,
    settings.reducedMotion,
    (choice, waveIndex) => audio.playEndingWave(choice, waveIndex),
  );
  const worldBuilder = new WorldBuilder(scene, physicsWorld);
  let handlePuzzleProgress = (_id: PuzzleId, completed: boolean): void =>
    audio.play(completed ? 'puzzleComplete' : 'puzzleProgress');
  const gameplayWorld = new GameplayWorld(scene, physicsWorld, puzzles, {
    onPuzzleProgress: (id, completed) => handlePuzzleProgress(id, completed),
  });
  const character = new CharacterController(physicsWorld, scene, abilities);
  const tutorials = new TutorialSystem();
  const objectiveTracker = new ObjectiveTracker(bootSave.objectiveTracking);
  const overlay = new GameplayOverlay();
  let inputDevice: InputDevice = 'keyboard';
  const setInputDevice = (device: InputDevice): void => {
    if (device === inputDevice) return;
    inputDevice = device;
    overlay.setInputDevice(device);
  };
  const input = new InputSystem(canvas, settings.bindings, () =>
    setInputDevice('keyboard'),
  );
  const gamepad = new GamepadSystem(undefined, {
    onConnected: (name) => overlay.showToast('gamepad.connected', { name }),
    onDisconnected: (name) =>
      overlay.showToast('gamepad.disconnected', { name }),
    onInput: setInputDevice,
  });
  const compass = new CompassBar();
  overlay.attachHudElement(compass.element);
  overlay.setSubtitleSize(settings.subtitleSize);
  const thirdPersonCamera = new ThirdPersonCamera(physicsWorld, character);
  thirdPersonCamera.setAutoBehindEnabled(settings.autoCameraBehind);
  character.setReducedMotion(settings.reducedMotion);
  worldBuilder.setReducedMotion(settings.reducedMotion);
  const camera = thirdPersonCamera.camera;
  thirdPersonCamera.update(1 / 60);

  const postfx = createPostProcessing(renderer, scene, camera);
  postfx.setBloom(settings.bloomEnabled, settings.bloomIntensity);
  thirdPersonCamera.setBaseFieldOfView(settings.fieldOfView);
  overlay.setFpsVisible(settings.showFps);

  const devPanel = import.meta.env.DEV
    ? new DevTuningPanel(renderer)
    : undefined;

  let sessionStarted = false;
  let controlsEnabled = false;
  let activeTutorial: TutorialDefinition | undefined;
  let readSteleIds = new Set<string>();
  let lastPuzzleSignature = JSON.stringify(puzzles.getAll());
  let playtimeSeconds = bootSave.playtimeSeconds;
  let shardStreak = 0;
  let lastShardPickupPlaytime = Number.NEGATIVE_INFINITY;
  let discoveredZoneIds = new Set<ZoneId>();
  let fanfareActive = false;
  let sanctuaryUnlockInProgress = false;
  let warpActive = false;
  let fanfareTimer: number | undefined;

  const getObjectiveProgress = (): ObjectiveProgress => ({
    puzzles: puzzles.getAll(),
    abilities: abilities.getAll(),
    shardCount: collectibles.count,
    endingChoice: ending.getChoice() ?? null,
  });

  const getCurrentObjective = (): TrackedObjective =>
    resolveTrackedObjective(
      getObjectiveProgress(),
      objectiveTracker.getSnapshot(),
      getMapTarget,
    );

  const refreshCompassTargets = (): void => {
    const targets: CompassTarget[] = WORLD_ZONES.flatMap((zone) => {
      if (!zone.landmark) return [];
      const [x, y, z] = zone.landmark.position;
      return [
        {
          id: zone.landmark.id,
          labelKey: `compass.landmark.${zone.id}`,
          kind: 'landmark' as const,
          icon: LANDMARK_ICONS[zone.id] ?? '◇',
          position: { x, y, z },
        },
      ];
    });
    for (const zone of WORLD_ZONES) {
      if (!zone.sanctuary || !discoveredZoneIds.has(zone.id)) continue;
      const [x, y, z] = zone.sanctuary.position;
      targets.push({
        id: `compass-${zone.sanctuary.id}`,
        labelKey: `compass.sanctuary.${zone.id}`,
        kind: 'sanctuary',
        icon: '✦',
        position: { x, y, z },
      });
    }
    if (abilities.getAll().length === 3) {
      const core = WORLD_ZONES.find((zone) => zone.id === 'chasm')?.landmark;
      if (core) {
        const [x, y, z] = core.position;
        targets.push({
          id: 'compass-north-core',
          labelKey: 'compass.core',
          kind: 'core',
          icon: '◈',
          position: { x, y, z },
        });
      }
    }
    const currentObjective = getCurrentObjective();
    const trackedMapTarget = getMapTarget(currentObjective.targetId);
    if (
      trackedMapTarget &&
      !targets.some((target) => target.id === trackedMapTarget.id)
    ) {
      targets.push({
        id: trackedMapTarget.id,
        labelKey: trackedMapTarget.labelKey,
        kind: 'custom',
        icon: trackedMapTarget.icon,
        position: trackedMapTarget.position,
      });
    }
    compass.setTargets(targets);
    compass.setTrackedTarget(currentObjective.targetId);
    overlay.setObjective(
      currentObjective.id,
      currentObjective.labelKey,
      currentObjective.mode === 'custom',
    );
  };

  const discoverZoneAt = (
    position: Readonly<{ x: number; z: number }>,
  ): void => {
    const discovered = WORLD_ZONES.find((zone) => {
      if (zone.id === 'plaza' || discoveredZoneIds.has(zone.id)) return false;
      const centerX = (zone.bounds.min[0] + zone.bounds.max[0]) / 2;
      const centerZ = (zone.bounds.min[2] + zone.bounds.max[2]) / 2;
      return (
        Math.hypot(position.x - centerX, position.z - centerZ) <=
        zone.discoveryRadius
      );
    });
    if (!discovered) return;
    discoveredZoneIds.add(discovered.id);
    refreshCompassTargets();
    if (sessionStarted) persist();
  };

  const getSnapshot = (): SaveData => {
    const position = character.getPosition();
    return {
      version: SAVE_VERSION,
      abilities: [...abilities.getAll()],
      collectedShardIds: [...collectibles.getAll()],
      readSteleIds: [...readSteleIds],
      discoveredZoneIds: [...discoveredZoneIds],
      puzzles: puzzles.getAll(),
      playerPosition: { x: position.x, y: position.y, z: position.z },
      settings: structuredClone(settings),
      tutorialFlags: tutorials.getFlags(),
      objectiveTracking: objectiveTracker.getSnapshot(),
      ending: { choice: ending.getChoice() ?? null },
      playtimeSeconds,
      dayPhase,
    };
  };

  const persist = (): void => {
    if (sessionStarted) saveData(getSnapshot());
    else saveData({ ...loadSaveData(), settings: structuredClone(settings) });
  };

  const getMapScreenData = (): MapScreenData => ({
    discoveredZoneIds,
    collectedShardIds: new Set(collectibles.getAll()),
    puzzles: puzzles.getAll(),
    playerPosition: character.getPosition(),
    playerHeading: thirdPersonCamera.getCompassHeading(),
    tracking: objectiveTracker.getSnapshot(),
  });

  const closeMap = (): void => {
    if (!mapScreen.isOpen) return;
    mapScreen.close();
    overlay.setActive(true);
    loop.setPaused(false);
    controlsEnabled = true;
    canvas.dataset.controls = 'ready';
  };
  const openMap = (): boolean => {
    if (
      !sessionStarted ||
      (menu.name !== 'pause' && !controlsEnabled) ||
      fanfareActive ||
      warpActive ||
      mapScreen.isOpen
    ) {
      return false;
    }
    controlsEnabled = false;
    canvas.dataset.controls = 'locked';
    loop.setPaused(true);
    overlay.setActive(false);
    menu.open('none');
    if (document.pointerLockElement) void document.exitPointerLock();
    mapScreen.open(getMapScreenData());
    return true;
  };
  const mapScreen = new MapScreen({
    onClose: closeMap,
    onTrackingChange: (targetId) => {
      objectiveTracker.setCustomTarget(targetId);
      refreshCompassTargets();
      mapScreen.update(getMapScreenData());
      persist();
    },
  });
  mapScreen.setReducedMotion(settings.reducedMotion);

  abilities.onUnlock(({ ability }) => {
    overlay.showUnlock(ability);
    if (!sanctuaryUnlockInProgress) {
      audio.play('abilityUnlock');
      particles.unlockHalo(character.getPosition());
    }
    refreshCompassTargets();
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
    audio.play('shardTick');
    refreshCompassTargets();
    if (sessionStarted) persist();
  });

  const completeSanctuary = (id: PuzzleId): void => {
    if (puzzles.get(id).altarActivated) return;
    const zone = WORLD_ZONES.find(
      (candidate) => candidate.sanctuary?.grants === PUZZLE_ABILITY[id],
    );
    if (!zone?.sanctuary) return;
    sanctuaryUnlockInProgress = true;
    const activated = puzzles.activateAltar(id);
    sanctuaryUnlockInProgress = false;
    if (!activated) return;
    const [x, y, z] = zone.sanctuary.position;
    audio.play('shrineFanfare');
    particles.sanctuaryFanfare({ x, y, z });
    if (!settings.reducedMotion) {
      fanfareActive = true;
      controlsEnabled = false;
      canvas.dataset.controls = 'locked';
      window.clearTimeout(fanfareTimer);
      fanfareTimer = window.setTimeout(() => {
        fanfareActive = false;
        if (!warpActive && sessionStarted) {
          controlsEnabled = true;
          canvas.dataset.controls = 'ready';
        }
      }, 1200);
    }
    persist();
  };

  handlePuzzleProgress = (id, completed): void => {
    if (completed) completeSanctuary(id);
    else audio.play('puzzleProgress');
  };

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

  const applyDayPhase = (phase: number): void => {
    dayPhase = normalizeDayPhase(phase);
    currentMood = getDayMood(dayPhase);
    sky.setMood(currentMood);
    if (scene.background instanceof Color) {
      scene.background.set(currentMood.zenith);
    }
    if (scene.fog instanceof Fog) scene.fog.color.set(currentMood.fog);
    ambientLight.intensity = currentMood.ambientIntensity;
  };

  const tryInteraction = (): void => {
    if (overlay.isSteleTyping()) {
      overlay.skipStele();
      return;
    }
    if (overlay.closeStele()) {
      thirdPersonCamera.setSteleFocus(false, settings.reducedMotion);
      return;
    }
    const position = character.getPosition();
    const nearbyStele = stelePlacements.find((placement) => {
      const [x, y, z] = placement.position;
      return distanceTo(position, { x, y, z }) <= tuning.interactionRadius;
    });
    if (nearbyStele) {
      const content = STELES.find((entry) => entry.id === nearbyStele.id);
      if (content) {
        overlay.showStele(content, settings.reducedMotion, () =>
          audio.play('steleBlip'),
        );
        thirdPersonCamera.setSteleFocus(true, settings.reducedMotion);
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
      const pointerDelta = input.consumePointerDelta();
      if (controlsEnabled) {
        thirdPersonCamera.applyPointerDelta(pointerDelta);
        thirdPersonCamera.applyGamepadAxes(
          gamepad.getLookAxes(),
          fixedDeltaSeconds,
        );
      }
      const steleSkipped =
        overlay.isSteleTyping() &&
        (input.hasAnyPressed() || gamepad.hasAnyPressed())
          ? overlay.skipStele()
          : false;
      const keyboardMovement = input.getMovementAxes();
      const gamepadMovement = gamepad.getMovementAxes();
      const combinedX = keyboardMovement.x + gamepadMovement.x;
      const combinedY = keyboardMovement.y + gamepadMovement.y;
      const combinedLength = Math.hypot(combinedX, combinedY);
      const movementAxes = controlsEnabled
        ? combinedLength > 1
          ? { x: combinedX / combinedLength, y: combinedY / combinedLength }
          : { x: combinedX, y: combinedY }
        : { x: 0, y: 0 };
      const move = thirdPersonCamera.getMovementDirection(movementAxes);
      const jumpPressed =
        controlsEnabled &&
        !steleSkipped &&
        (input.wasActionPressed('jump') || gamepad.wasActionPressed('jump'));
      const jumpReleased =
        controlsEnabled &&
        (input.wasActionReleased('jump') || gamepad.wasActionReleased('jump'));
      const dashPressed =
        controlsEnabled &&
        !steleSkipped &&
        (input.wasActionPressed('dash') || gamepad.wasActionPressed('dash'));
      const interactPressed =
        controlsEnabled &&
        !steleSkipped &&
        (input.wasActionPressed('interact') ||
          gamepad.wasActionPressed('interact'));
      const positionBeforeMove = character.getPosition();
      const locomotion = character.update(fixedDeltaSeconds, {
        move,
        jumpPressed,
        jumpHeld:
          controlsEnabled &&
          (input.isActionHeld('jump') || gamepad.isActionHeld('jump')),
        jumpReleased,
        dashPressed,
        inUpdraft: gameplayWorld.isInUpdraft(positionBeforeMove),
      });
      if (locomotion.jumped) audio.play('jump');
      if (locomotion.doubleJumped) audio.play('doubleJump');
      if (locomotion.dashStarted) audio.play('dash');
      if (interactPressed) {
        character.triggerInteraction();
        tryInteraction();
      }
      if (
        activeTutorial &&
        ((activeTutorial.action === 'jump' && jumpPressed) ||
          (activeTutorial.action === 'dash' && dashPressed) ||
          (activeTutorial.action === 'interact' && interactPressed))
      ) {
        overlay.dismissTutorial(activeTutorial.id);
        activeTutorial = undefined;
      }
      if (!steleSkipped && input.wasPressed('Backquote')) devPanel?.toggle();
      input.endFixedStep();
      gamepad.endFixedStep();

      physicsWorld.timestep = fixedDeltaSeconds;
      physicsWorld.step();
      character.syncVisual();
      const position = character.getPosition();
      discoverZoneAt(position);
      const landingSpeed = character.consumeLandingSpeed();
      if (landingSpeed !== undefined) {
        thirdPersonCamera.triggerLanding(landingSpeed);
        particles.landingDust(position, landingSpeed);
        audio.playLanding(landingSpeed);
      }
      audio.updateFootsteps(
        character.getRunCyclePhase(),
        character.getHorizontalSpeed(),
        character.isGrounded(),
      );
      if (sessionStarted) {
        playtimeSeconds = advancePlaytime(playtimeSeconds, fixedDeltaSeconds);
        applyDayPhase(advanceDayPhase(dayPhase, fixedDeltaSeconds));
      }
      collectibles.collectNearest(position, tuning.shardPickupRadius);
      gameplayWorld.update(fixedDeltaSeconds, position);
      const puzzleSignature = JSON.stringify(puzzles.getAll());
      if (puzzleSignature !== lastPuzzleSignature) {
        lastPuzzleSignature = puzzleSignature;
        if (sessionStarted) persist();
      }
      if (controlsEnabled) {
        const tutorial = tutorials.trigger({
          position,
          moving: character.getHorizontalSpeed() > 0.05,
          abilities: new Set(abilities.getAll()),
        });
        if (tutorial) {
          activeTutorial = tutorial;
          overlay.showTutorial(tutorial);
          persist();
        }
      }
      thirdPersonCamera.update(fixedDeltaSeconds, {
        horizontalVelocity: character.getHorizontalVelocity(),
        sprinting: locomotion.dashStarted || locomotion.state.dashRemaining > 0,
      });
      compass.update(position, thirdPersonCamera.getCompassHeading());
      worldBuilder.update(fixedDeltaSeconds);
      particles.update(fixedDeltaSeconds);
      audio.update(fixedDeltaSeconds, position);
      sky.update(fixedDeltaSeconds, camera.position);
    },
    render: () => {
      gamepad.update();
      if (mapScreen.isOpen) {
        if (gamepad.consumeSelectPressed()) closeMap();
        else {
          const axes = gamepad.getLookAxes();
          mapScreen.panBy(-axes.x * 9, -axes.y * 9);
        }
        gamepad.endFixedStep();
      } else if (menu.name === 'none') {
        if (
          gamepad.consumeSelectPressed() &&
          sessionStarted &&
          !fanfareActive &&
          !warpActive
        ) {
          openMap();
        } else if (
          gamepad.consumeStartPressed() &&
          sessionStarted &&
          !fanfareActive &&
          !warpActive
        ) {
          openMenu('pause');
        }
      } else {
        menu.handleGamepadActions(gamepad.consumeMenuActions());
        gamepad.endFixedStep();
      }
      postfx.render();
      overlay.recordFrame();
      devPanel?.recordFrame();
    },
  });

  const applySettings = (nextSettings: GameSettings): void => {
    settings = structuredClone(nextSettings);
    setLanguage(settings.language);
    canvas.setAttribute('aria-label', t('game.canvasLabel'));
    input.setBindings(settings.bindings);
    overlay.setSubtitleSize(settings.subtitleSize);
    overlay.setReducedMotion(settings.reducedMotion);
    audio.setVolumes(settings.musicVolume, settings.sfxVolume);
    particles.setReducedMotion(settings.reducedMotion);
    character.setReducedMotion(settings.reducedMotion);
    worldBuilder.setReducedMotion(settings.reducedMotion);
    compass.setReducedMotion(settings.reducedMotion);
    mapScreen.setReducedMotion(settings.reducedMotion);
    thirdPersonCamera.setAutoBehindEnabled(settings.autoCameraBehind);
    thirdPersonCamera.setBaseFieldOfView(settings.fieldOfView);
    const pixelRatio = getRenderPixelRatio(
      window.devicePixelRatio,
      settings.resolutionScale,
    );
    renderer.setPixelRatio(pixelRatio);
    postfx.resize(window.innerWidth, window.innerHeight);
    postfx.setBloom(settings.bloomEnabled, settings.bloomIntensity);
    overlay.setFpsVisible(settings.showFps);
    thirdPersonCamera.setSteleFocus(
      overlay.isSteleOpen(),
      settings.reducedMotion,
    );
    tuning.cameraSensitivity =
      DEFAULT_CAMERA_SENSITIVITY * settings.mouseSensitivity;
    applyReducedMotion(settings.reducedMotion);
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  };

  const restoreSnapshot = (snapshot: SaveData): void => {
    activeTutorial = undefined;
    abilities.restore(snapshot.abilities);
    collectibles.restore(snapshot.collectedShardIds);
    puzzles.restore(snapshot.puzzles);
    tutorials.restore(snapshot.tutorialFlags);
    objectiveTracker.restore(snapshot.objectiveTracking);
    ending.restore(snapshot.ending.choice);
    playtimeSeconds = snapshot.playtimeSeconds;
    applyDayPhase(snapshot.dayPhase);
    readSteleIds = new Set(snapshot.readSteleIds);
    discoveredZoneIds = new Set(snapshot.discoveredZoneIds);
    worldBuilder.setCollectedShards(snapshot.collectedShardIds);
    character.teleport(
      snapshot.playerPosition.x,
      snapshot.playerPosition.y,
      snapshot.playerPosition.z,
    );
    thirdPersonCamera.update(1 / 60);
    overlay.setAbilities(snapshot.abilities);
    overlay.setShardCount(snapshot.collectedShardIds.length);
    refreshCompassTargets();
    if (snapshot.ending.choice) particles.triggerEnding(snapshot.ending.choice);
    applySettings(snapshot.settings);
    lastPuzzleSignature = JSON.stringify(puzzles.getAll());
  };

  const startSession = (snapshot: SaveData, showOpening = false): void => {
    restoreSnapshot(snapshot);
    sessionStarted = true;
    overlay.setActive(true);
    loop.setPaused(false);
    if (showOpening) {
      controlsEnabled = false;
      canvas.dataset.controls = 'locked';
      thirdPersonCamera.startOpening(settings.reducedMotion);
      overlay.showOpening(settings.reducedMotion, () => {
        controlsEnabled = true;
        canvas.dataset.controls = 'ready';
      });
    } else {
      controlsEnabled = true;
      canvas.dataset.controls = 'ready';
    }
  };

  const startNewGame = (): void => {
    clearSaveData();
    const freshSave = createDefaultSaveData();
    startSession(freshSave, true);
    saveData(getSnapshot());
    menu.setSettings(settings);
  };

  const openMenu = (name: MenuName): void => {
    if (name === 'none') {
      if (!sessionStarted) startNewGame();
      overlay.setActive(true);
      loop.setPaused(false);
    } else {
      controlsEnabled = false;
      canvas.dataset.controls = 'locked';
      loop.setPaused(true);
      overlay.setActive(false);
    }
    menu.open(name);
  };

  const performWarp = (anchor: WarpAnchor): void => {
    if (!isWarpUnlocked(anchor, puzzles.getAll()) || warpActive) return;
    warpActive = true;
    controlsEnabled = false;
    canvas.dataset.controls = 'locked';
    openMenu('none');
    void overlay
      .playWarp(settings.reducedMotion, () => {
        const [x, y, z] = anchor.warpPoint;
        character.teleport(x, y, z);
        thirdPersonCamera.update(1 / 60);
        persist();
      })
      .then(() => {
        warpActive = false;
        if (!fanfareActive) {
          controlsEnabled = true;
          canvas.dataset.controls = 'ready';
        }
      });
  };

  const menu = new MenuSystem(settings, {
    canContinue: () => sessionStarted || hasSaveData(),
    onContinue: () => {
      if (!sessionStarted) startSession(loadSaveData());
      else {
        overlay.setActive(true);
        loop.setPaused(false);
        controlsEnabled = true;
        canvas.dataset.controls = 'ready';
      }
    },
    onNewGame: startNewGame,
    onResume: () => {
      overlay.setActive(true);
      loop.setPaused(false);
      controlsEnabled = true;
      canvas.dataset.controls = 'ready';
    },
    onMap: () => {
      openMap();
    },
    onMainMenu: () => {
      if (sessionStarted) persist();
      overlay.setActive(false);
      loop.setPaused(true);
    },
    getWarpEntries: () =>
      WARP_ANCHORS.map((anchor) => ({
        anchor,
        unlocked: isWarpUnlocked(anchor, puzzles.getAll()),
      })),
    onWarp: performWarp,
    onUiSound: (event) => audio.play(event),
    onSettingsChange: (nextSettings) => {
      applySettings(nextSettings);
      persist();
    },
  });

  const onEscape = (event: KeyboardEvent): void => {
    if (
      event.code === 'Escape' &&
      menu.name === 'none' &&
      !mapScreen.isOpen &&
      sessionStarted &&
      !fanfareActive &&
      !warpActive
    ) {
      openMenu('pause');
    }
  };
  const onMapHotkey = (event: KeyboardEvent): void => {
    if (
      event.code === 'KeyM' &&
      menu.name === 'none' &&
      !mapScreen.isOpen &&
      sessionStarted &&
      !fanfareActive &&
      !warpActive
    ) {
      event.preventDefault();
      openMap();
    }
  };
  const onPointerLockChange = (): void => {
    if (
      document.pointerLockElement === null &&
      menu.name === 'none' &&
      !mapScreen.isOpen &&
      sessionStarted &&
      !fanfareActive &&
      !warpActive
    ) {
      openMenu('pause');
    }
  };
  window.addEventListener('keydown', onMapHotkey);
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
        getCharacterInfo: () => character.getCharacterInfo(),
        getRenderStats: () => ({
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        }),
        getRenderInfo: () => ({
          pixelRatio: renderer.getPixelRatio(),
          resolutionScale: settings.resolutionScale,
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
        debugCompletePuzzle: (id: string) => {
          const puzzleId = normalizePuzzleId(id);
          if (!puzzleId || !puzzles.complete(puzzleId)) return false;
          handlePuzzleProgress(puzzleId, true);
          return true;
        },
        getObjective: () => {
          const objective = getCurrentObjective();
          return {
            ...objective,
            label:
              objective.mode === 'custom'
                ? t('objective.custom', { target: t(objective.labelKey) })
                : t(objective.labelKey),
          };
        },
        openMap: () => openMap(),
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
          fogHex:
            scene.fog instanceof Fog
              ? `#${scene.fog.color.getHexString()}`
              : null,
          skyZenithHex: currentMood.zenith,
          skyHorizonHex: currentMood.horizon,
          sunIntensity: currentMood.sunIntensity,
          ambientIntensity: ambientLight.intensity,
          dayPhase,
          skyEnabled: scene.getObjectByName('synthwave-sky') !== undefined,
          ...postfx.getState(),
        }),
        getSaveData: () =>
          structuredClone(sessionStarted ? getSnapshot() : loadSaveData()),
        getAudioState: () => audio.getState(),
        setLanguage: (language: 'zh-TW' | 'en') => {
          applySettings({ ...settings, language });
          menu.setSettings(settings);
          persist();
        },
        setDayPhase: (phase: number) => {
          applyDayPhase(phase);
          persist();
        },
        openMenu: (name: MenuName) => {
          openMenu(name);
          // 測試入口：若開場演出正在播，跳過並立即交還控制權。
          if (name === 'none' && overlay.skipOpening()) {
            thirdPersonCamera.startOpening(true);
            controlsEnabled = true;
            canvas.dataset.controls = 'ready';
          }
        },
      },
    });
  }

  loading.hidden = true;
  canvas.dataset.status = 'ready';
  canvas.dataset.controls = 'locked';
  loop.start();
  loop.setPaused(true);

  return () => {
    loop.stop();
    window.clearTimeout(fanfareTimer);
    window.clearInterval(autoSaveInterval);
    window.removeEventListener('keydown', onMapHotkey);
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
    compass.dispose();
    mapScreen.dispose();
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
