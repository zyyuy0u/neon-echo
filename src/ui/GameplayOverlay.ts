import type { SteleContent } from '../content/steles';
import type { EndingChoice } from '../systems/ending/EndingState';
import type { InputDevice } from '../systems/input/GamepadSystem';
import type { SubtitleSize } from '../systems/save/SaveSystem';
import type {
  TutorialDefinition,
  TutorialId,
} from '../systems/tutorial/TutorialSystem';
import type { Ability } from '../world/map/types';
import { getVisibleCharacterCount } from '../systems/narrative/typewriter';
import { getLanguage, onLanguageChange, t } from './i18n';

const ABILITIES: readonly Ability[] = ['dash', 'doubleJump', 'glide'];
const ABILITY_KEYS = {
  dash: ['ability.dash', 'ability.dashShort'],
  doubleJump: ['ability.doubleJump', 'ability.doubleJumpShort'],
  glide: ['ability.glide', 'ability.glideShort'],
} as const;

const ENDING_KEYS = {
  awaken: {
    title: 'ending.awakenTitle',
    lines: [
      'ending.awakenLine1',
      'ending.awakenLine2',
      'ending.awakenLine3',
      'ending.awakenLine4',
    ],
  },
  rest: {
    title: 'ending.restTitle',
    lines: [
      'ending.restLine1',
      'ending.restLine2',
      'ending.restLine3',
      'ending.restLine4',
    ],
  },
} as const;

export interface EndingStats {
  shards: number;
  steles: number;
  playtimeSeconds: number;
}

export function formatPlaytime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export class GameplayOverlay {
  private readonly root = document.createElement('div');
  private readonly hud = document.createElement('div');
  private readonly abilityList = document.createElement('div');
  private readonly shardCounter = document.createElement('div');
  private readonly shardValue = document.createElement('strong');
  private readonly message = document.createElement('div');
  private readonly fps = document.createElement('div');
  private readonly toast = document.createElement('div');
  private readonly opening = document.createElement('div');
  private readonly openingText = document.createElement('span');
  private readonly warpTransition = document.createElement('div');
  private readonly stele = document.createElement('section');
  private readonly ending = document.createElement('section');
  private readonly unlocked = new Set<Ability>();
  private shardCount = 0;
  private hideTimer: number | undefined;
  private messageTimer: number | undefined;
  private toastTimer: number | undefined;
  private fpsVisible = false;
  private fpsFrameCount = 0;
  private fpsWindowStarted = 0;
  private inputDevice: InputDevice = 'keyboard';
  private currentTutorial: TutorialDefinition | undefined;
  private openingTimer: number | undefined;
  private warpTimers: number[] = [];
  private currentStele: SteleContent | undefined;
  private steleText = '';
  private steleVisibleCharacters = 0;
  private steleStartedAt = 0;
  private steleFrame: number | undefined;
  private steleBlipGroups = 0;
  private steleBlip: (() => void) | undefined;
  private steleReducedMotion = false;
  private subtitleSize: SubtitleSize = 'medium';
  private readonly unsubscribeLanguage: () => void;

  public constructor() {
    this.root.id = 'gameplay-ui';
    this.root.hidden = true;
    this.hud.className = 'hud';
    this.hud.setAttribute('aria-label', t('hud.abilities'));
    this.abilityList.className = 'ability-list';
    this.shardCounter.className = 'shard-counter';
    this.shardCounter.append(this.shardValue);
    this.message.className = 'gameplay-message';
    this.message.setAttribute('role', 'status');
    this.fps.className = 'fps-hud';
    this.fps.hidden = true;
    this.fps.setAttribute('aria-live', 'off');
    this.toast.className = 'connection-toast';
    this.toast.setAttribute('role', 'status');
    this.toast.hidden = true;
    this.stele.className = 'stele-overlay';
    this.ending.className = 'ending-overlay';
    this.stele.hidden = true;
    this.ending.hidden = true;
    this.opening.className = 'opening-sequence';
    this.opening.hidden = true;
    this.opening.setAttribute('role', 'status');
    this.opening.append(this.openingText);
    this.warpTransition.className = 'warp-transition';
    this.warpTransition.hidden = true;
    this.warpTransition.setAttribute('aria-hidden', 'true');
    this.hud.append(this.abilityList, this.shardCounter);
    this.root.append(
      this.hud,
      this.fps,
      this.message,
      this.stele,
      this.ending,
      this.opening,
      this.warpTransition,
    );
    document.body.append(this.root);
    document.body.append(this.toast);
    this.renderHud();
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.renderHud();
      if (this.currentTutorial) this.renderCurrentTutorial();
      if (this.currentStele) this.startSteleTypewriter();
    });
  }

  public setActive(active: boolean): void {
    this.root.hidden = !active;
    if (active) this.showHudEvent();
  }

  public setAbilities(abilities: readonly Ability[]): void {
    this.unlocked.clear();
    for (const ability of abilities) this.unlocked.add(ability);
    this.renderHud();
  }

  public attachHudElement(element: HTMLElement): void {
    this.hud.append(element);
  }

  public setShardCount(count: number, animate = false): void {
    this.shardCount = count;
    this.shardValue.textContent = `${count} / 40`;
    this.shardCounter.setAttribute(
      'aria-label',
      `${t('hud.shards')} ${count} / 40`,
    );
    if (animate) {
      this.shardCounter.classList.remove('is-pulsing');
      void this.shardCounter.offsetWidth;
      this.shardCounter.classList.add('is-pulsing');
      this.showHudEvent();
    }
  }

  public setSubtitleSize(size: SubtitleSize): void {
    this.subtitleSize = size;
    this.stele.dataset.size = size;
  }

  public setInputDevice(device: InputDevice): void {
    if (this.inputDevice === device) return;
    this.inputDevice = device;
    if (this.currentTutorial) this.renderCurrentTutorial();
  }

  public setFpsVisible(visible: boolean): void {
    this.fpsVisible = visible;
    this.fps.hidden = !visible;
    this.fpsFrameCount = 0;
    this.fpsWindowStarted = performance.now();
  }

  public recordFrame(now = performance.now()): void {
    if (!this.fpsVisible) return;
    this.fpsFrameCount += 1;
    const elapsed = now - this.fpsWindowStarted;
    if (elapsed < 500) return;
    const framesPerSecond = Math.round((this.fpsFrameCount * 1000) / elapsed);
    this.fps.textContent = t('hud.fps', { value: framesPerSecond });
    this.fpsFrameCount = 0;
    this.fpsWindowStarted = now;
  }

  public showToast(key: string, values: Readonly<Record<string, string>>): void {
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = t(key, values);
    this.toast.hidden = false;
    this.toast.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove('is-visible');
      this.toast.hidden = true;
    }, 2600);
  }

  public showUnlock(ability: Ability): void {
    this.unlocked.add(ability);
    this.renderHud(ability);
    this.showMessage(
      `${t('overlay.unlock')} · ${t(ABILITY_KEYS[ability][0])}`,
      2400,
    );
    this.showHudEvent();
  }

  public showTutorial(definition: TutorialDefinition): void {
    this.showMessage(t(definition.messageKeys[this.inputDevice]), 4000);
    this.currentTutorial = definition;
    this.message.dataset.tutorial = definition.id;
  }

  public dismissTutorial(id: TutorialId): void {
    if (this.message.dataset.tutorial !== id) return;
    window.clearTimeout(this.messageTimer);
    this.message.classList.remove('is-visible');
    delete this.message.dataset.tutorial;
    this.currentTutorial = undefined;
  }

  public showOpening(reducedMotion: boolean, onComplete: () => void): void {
    window.clearTimeout(this.openingTimer);
    this.openingText.textContent = t('opening.wake');
    this.opening.hidden = false;
    this.opening.classList.toggle('is-reduced', reducedMotion);
    this.opening.classList.remove('is-playing');
    void this.opening.offsetWidth;
    this.opening.classList.add('is-playing');
    this.openingTimer = window.setTimeout(
      () => {
        this.opening.hidden = true;
        this.opening.classList.remove('is-playing');
        onComplete();
      },
      reducedMotion ? 500 : 3500,
    );
  }

  /** 供 dev/e2e 測試入口跳過開場演出；回傳原本是否正在播放。 */
  public skipOpening(): boolean {
    if (this.opening.hidden) return false;
    window.clearTimeout(this.openingTimer);
    this.opening.hidden = true;
    this.opening.classList.remove('is-playing');
    return true;
  }

  public playWarp(
    reducedMotion: boolean,
    onMidpoint: () => void,
  ): Promise<void> {
    for (const timer of this.warpTimers) window.clearTimeout(timer);
    const duration = reducedMotion ? 200 : 800;
    this.warpTransition.hidden = false;
    this.warpTransition.classList.toggle('is-reduced', reducedMotion);
    this.warpTransition.classList.remove('is-playing');
    void this.warpTransition.offsetWidth;
    this.warpTransition.classList.add('is-playing');
    return new Promise((resolve) => {
      this.warpTimers = [
        window.setTimeout(onMidpoint, duration / 2),
        window.setTimeout(() => {
          this.warpTransition.hidden = true;
          this.warpTransition.classList.remove('is-playing');
          this.warpTimers = [];
          resolve();
        }, duration),
      ];
    });
  }

  public showStele(
    content: SteleContent,
    reducedMotion: boolean,
    onBlip: () => void,
  ): void {
    this.currentStele = content;
    this.steleReducedMotion = reducedMotion;
    this.steleBlip = onBlip;
    this.startSteleTypewriter();
    this.stele.hidden = false;
    this.showHudEvent();
  }

  public isSteleTyping(): boolean {
    return (
      !this.stele.hidden &&
      this.steleVisibleCharacters < this.steleText.length
    );
  }

  public isSteleOpen(): boolean {
    return !this.stele.hidden;
  }

  public setReducedMotion(reducedMotion: boolean): void {
    this.steleReducedMotion = reducedMotion;
    if (reducedMotion) this.skipStele();
  }

  public skipStele(): boolean {
    if (!this.isSteleTyping()) return false;
    this.steleVisibleCharacters = getVisibleCharacterCount(
      this.steleText,
      0,
      true,
    );
    window.cancelAnimationFrame(this.steleFrame ?? 0);
    this.steleFrame = undefined;
    this.renderSteleText();
    return true;
  }

  public closeStele(): boolean {
    if (this.stele.hidden || this.isSteleTyping()) return false;
    window.cancelAnimationFrame(this.steleFrame ?? 0);
    this.steleFrame = undefined;
    this.stele.hidden = true;
    this.currentStele = undefined;
    this.steleText = '';
    this.steleBlip = undefined;
    return true;
  }

  public showEndingChoice(onChoose: (choice: EndingChoice) => void): void {
    delete this.ending.dataset.choice;
    this.ending.replaceChildren();
    const title = document.createElement('h1');
    title.textContent = t('ending.choiceTitle');
    const prompt = document.createElement('p');
    prompt.textContent = t('ending.choicePrompt');
    const awaken = document.createElement('button');
    awaken.type = 'button';
    awaken.textContent = t('ending.awakenAction');
    awaken.addEventListener('click', () => onChoose('awaken'), { once: true });
    const rest = document.createElement('button');
    rest.type = 'button';
    rest.textContent = t('ending.restAction');
    rest.addEventListener('click', () => onChoose('rest'), { once: true });
    this.ending.append(title, prompt, awaken, rest);
    this.ending.hidden = false;
    awaken.focus();
  }

  public showEnding(choice: EndingChoice, endingStats: EndingStats): void {
    const content = ENDING_KEYS[choice];
    this.ending.dataset.choice = choice;
    this.ending.replaceChildren();
    const title = document.createElement('h1');
    title.textContent = t(content.title);
    this.ending.append(title);
    for (const key of content.lines) {
      const paragraph = document.createElement('p');
      paragraph.textContent = t(key);
      this.ending.append(paragraph);
    }
    const stats = document.createElement('strong');
    stats.className = 'ending-stats';
    stats.textContent = t('ending.stats', {
      shards: endingStats.shards,
      steles: endingStats.steles,
      playtime: formatPlaytime(endingStats.playtimeSeconds),
    });
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.textContent = t('ending.continue');
    continueButton.addEventListener(
      'click',
      () => {
        this.ending.hidden = true;
      },
      { once: true },
    );
    this.ending.append(stats, continueButton);
    continueButton.focus();
  }

  public dispose(): void {
    window.clearTimeout(this.hideTimer);
    window.clearTimeout(this.messageTimer);
    window.clearTimeout(this.toastTimer);
    window.clearTimeout(this.openingTimer);
    window.cancelAnimationFrame(this.steleFrame ?? 0);
    for (const timer of this.warpTimers) window.clearTimeout(timer);
    this.unsubscribeLanguage();
    this.root.remove();
    this.toast.remove();
  }

  private renderHud(flash?: Ability): void {
    this.hud.setAttribute('aria-label', t('hud.abilities'));
    this.abilityList.replaceChildren();
    for (const ability of ABILITIES) {
      const icon = document.createElement('span');
      icon.className = 'ability-icon';
      icon.classList.toggle('is-unlocked', this.unlocked.has(ability));
      icon.classList.toggle('is-unlocking', flash === ability);
      icon.textContent = t(ABILITY_KEYS[ability][1]);
      icon.title = t(ABILITY_KEYS[ability][0]);
      icon.setAttribute('aria-label', t(ABILITY_KEYS[ability][0]));
      this.abilityList.append(icon);
    }
    this.setShardCount(this.shardCount);
  }

  private renderStele(): void {
    if (!this.currentStele) return;
    this.stele.replaceChildren();
    this.stele.dataset.size = this.subtitleSize;
    const title = document.createElement('h2');
    title.textContent = t('stele.title');
    const text = document.createElement('p');
    text.dataset.fullText = this.steleText;
    text.dataset.typing = String(this.isSteleTyping());
    text.lang = getLanguage();
    text.textContent = this.steleText.slice(0, this.steleVisibleCharacters);
    const hint = document.createElement('small');
    hint.textContent = t('stele.close');
    this.stele.append(title, text, hint);
  }

  private startSteleTypewriter(): void {
    window.cancelAnimationFrame(this.steleFrame ?? 0);
    if (!this.currentStele) return;
    this.steleText =
      this.currentStele[getLanguage() === 'en' ? 'en' : 'zh'];
    this.steleBlipGroups = 0;
    this.steleStartedAt = performance.now();
    this.steleVisibleCharacters = this.steleReducedMotion
      ? this.steleText.length
      : 0;
    this.renderStele();
    if (this.steleReducedMotion) {
      this.steleBlip?.();
      return;
    }
    const update = (now: number): void => {
      this.steleVisibleCharacters = getVisibleCharacterCount(
        this.steleText,
        now - this.steleStartedAt,
      );
      const blipGroups = Math.floor(this.steleVisibleCharacters / 3);
      while (this.steleBlipGroups < blipGroups) {
        this.steleBlip?.();
        this.steleBlipGroups += 1;
      }
      this.renderSteleText();
      if (this.steleVisibleCharacters < this.steleText.length) {
        this.steleFrame = window.requestAnimationFrame(update);
      } else {
        this.steleFrame = undefined;
      }
    };
    this.steleFrame = window.requestAnimationFrame(update);
  }

  private renderSteleText(): void {
    const text = this.stele.querySelector<HTMLParagraphElement>('p');
    if (!text) return;
    text.textContent = this.steleText.slice(0, this.steleVisibleCharacters);
    text.dataset.typing = String(this.isSteleTyping());
  }

  private showHudEvent(): void {
    this.hud.classList.remove('is-idle');
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(
      () => this.hud.classList.add('is-idle'),
      4000,
    );
  }

  private showMessage(text: string, duration: number): void {
    window.clearTimeout(this.messageTimer);
    delete this.message.dataset.tutorial;
    this.currentTutorial = undefined;
    this.message.textContent = text;
    this.message.classList.add('is-visible');
    this.messageTimer = window.setTimeout(() => {
      this.message.classList.remove('is-visible');
      delete this.message.dataset.tutorial;
      this.currentTutorial = undefined;
    }, duration);
  }

  private renderCurrentTutorial(): void {
    if (!this.currentTutorial) return;
    this.message.textContent = t(
      this.currentTutorial.messageKeys[this.inputDevice],
    );
  }
}
