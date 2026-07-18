import { INPUT_ACTIONS, type InputAction } from '../systems/input/bindings';
import type { GameSettings } from '../systems/save/SaveSystem';
import type { GamepadMenuAction } from '../systems/input/GamepadSystem';
import type { WarpAnchor } from '../systems/warp/WarpSystem';
import { onLanguageChange, t } from './i18n';

export type MenuName =
  'main' | 'pause' | 'warp' | 'settings' | 'controls' | 'none';

export interface WarpMenuEntry {
  anchor: WarpAnchor;
  unlocked: boolean;
}

export interface MenuCallbacks {
  canContinue: () => boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onResume: () => void;
  onMap: () => void;
  onMainMenu: () => void;
  getWarpEntries: () => readonly WarpMenuEntry[];
  onWarp: (anchor: WarpAnchor) => void;
  onUiSound: (event: 'uiMove' | 'uiConfirm' | 'uiBack') => void;
  onSettingsChange: (settings: GameSettings) => void;
}

const ACTION_LABELS: Readonly<Record<InputAction, string>> = {
  moveForward: 'settings.moveForward',
  moveBackward: 'settings.moveBackward',
  moveLeft: 'settings.moveLeft',
  moveRight: 'settings.moveRight',
  jump: 'settings.jump',
  dash: 'settings.dash',
  interact: 'settings.interact',
};

export class MenuSystem {
  private readonly root = document.createElement('div');
  private readonly panel = document.createElement('section');
  private current: MenuName = 'main';
  private settingsOrigin: 'main' | 'pause' = 'main';
  private settings: GameSettings;
  private rebinding: InputAction | undefined;
  private readonly unsubscribeLanguage: () => void;

  public constructor(
    settings: GameSettings,
    private readonly callbacks: MenuCallbacks,
  ) {
    this.settings = structuredClone(settings);
    this.root.id = 'menu-layer';
    this.root.addEventListener('keydown', this.onKeyDown);
    this.panel.className = 'menu-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.root.append(this.panel);
    document.body.append(this.root);
    this.unsubscribeLanguage = onLanguageChange(() => this.render());
    this.open('main');
  }

  public get name(): MenuName {
    return this.current;
  }

  public open(name: MenuName): void {
    this.current = name;
    this.rebinding = undefined;
    this.root.dataset.menu = name;
    this.root.hidden = name === 'none';
    if (name !== 'none') {
      this.render();
      this.panel.classList.remove('is-opening');
      void this.panel.offsetWidth;
      this.panel.classList.add('is-opening');
    } else if (
      document.activeElement instanceof HTMLElement &&
      this.root.contains(document.activeElement)
    ) {
      // Move focus out of the hidden layer so gameplay receives keyboard events.
      document.activeElement.blur();
    }
  }

  public setSettings(settings: GameSettings): void {
    this.settings = structuredClone(settings);
    if (this.current !== 'none') this.render();
  }

  public handleGamepadActions(actions: readonly GamepadMenuAction[]): void {
    for (const action of actions) {
      if (action === 'up' || action === 'down') {
        this.moveFocus(action === 'up' ? -1 : 1);
        continue;
      }
      if (action === 'confirm') {
        if (document.activeElement instanceof HTMLButtonElement) {
          document.activeElement.click();
        }
        continue;
      }
      const key = 'Escape';
      const target =
        document.activeElement instanceof HTMLElement &&
        this.root.contains(document.activeElement)
          ? document.activeElement
          : this.panel;
      target.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key, code: key }),
      );
    }
  }

  public dispose(): void {
    this.unsubscribeLanguage();
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  private render(): void {
    this.panel.setAttribute('role', 'dialog');
    this.panel.replaceChildren();
    if (this.current === 'main') this.renderMain();
    if (this.current === 'pause') this.renderPause();
    if (this.current === 'warp') this.renderWarp();
    if (this.current === 'settings') this.renderSettings();
    if (this.current === 'controls') this.renderControls();
  }

  private renderMain(): void {
    const title = document.createElement('h1');
    title.textContent = t('menu.title');
    const nav = document.createElement('nav');
    const continueButton = this.createButton(t('menu.continue'), () => {
      this.callbacks.onContinue();
      this.open('none');
    });
    continueButton.disabled = !this.callbacks.canContinue();
    const newGameButton = this.createButton(t('menu.newGame'), () => {
      if (this.callbacks.canContinue()) this.renderOverwriteConfirmation();
      else this.startNewGame();
    });
    const settingsButton = this.createButton(t('menu.settings'), () => {
      this.settingsOrigin = 'main';
      this.open('settings');
    });
    const controlsButton = this.createButton(t('menu.controls'), () =>
      this.open('controls'),
    );
    nav.append(continueButton, newGameButton, settingsButton, controlsButton);
    const version = document.createElement('small');
    version.className = 'menu-version';
    version.textContent = t('menu.version');
    this.panel.append(title, nav, version);
    if (this.callbacks.canContinue()) continueButton.focus();
    else newGameButton.focus();
  }

  private renderPause(): void {
    const title = document.createElement('h1');
    title.textContent = t('menu.pauseTitle');
    const nav = document.createElement('nav');
    const resume = this.createButton(t('menu.resume'), () => {
      this.callbacks.onResume();
      this.open('none');
    });
    const warp = this.createButton(t('menu.warp'), () => this.open('warp'));
    const map = this.createButton(t('menu.map'), () => this.callbacks.onMap());
    const settings = this.createButton(t('menu.settings'), () => {
      this.settingsOrigin = 'pause';
      this.open('settings');
    });
    const main = this.createButton(t('menu.mainMenu'), () => {
      this.callbacks.onMainMenu();
      this.open('main');
    });
    nav.append(resume, settings, warp, map, main);
    this.panel.append(title, nav);
    resume.focus();
  }

  private renderWarp(): void {
    const title = document.createElement('h1');
    title.textContent = t('warp.title');
    const description = document.createElement('p');
    description.textContent = t('warp.description');
    const list = document.createElement('nav');
    list.className = 'warp-list';
    const entries = this.callbacks.getWarpEntries();
    for (const { anchor, unlocked } of entries) {
      const button = this.createButton(
        unlocked ? t(anchor.nameKey) : t('warp.locked'),
        () => this.callbacks.onWarp(anchor),
      );
      button.disabled = !unlocked;
      button.dataset.warpId = anchor.id;
      list.append(button);
    }
    const back = this.createButton(
      t('menu.back'),
      () => this.open('pause'),
      'uiBack',
    );
    back.className = 'menu-back';
    this.panel.append(title, description, list, back);
    list.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }

  private renderSettings(): void {
    const title = document.createElement('h1');
    title.textContent = t('settings.title');
    const form = document.createElement('div');
    form.className = 'settings-grid';

    const sensitivity = this.createRange(
      'settings.sensitivity',
      0.5,
      2,
      0.1,
      this.settings.mouseSensitivity,
      (value) => this.updateSettings({ mouseSensitivity: value }),
    );
    sensitivity.input.dataset.setting = 'sensitivity';

    const languageLabel = document.createElement('label');
    languageLabel.textContent = t('settings.language');
    const language = document.createElement('select');
    language.dataset.setting = 'language';
    const zh = document.createElement('option');
    zh.value = 'zh-TW';
    zh.textContent = t('settings.languageZh');
    const en = document.createElement('option');
    en.value = 'en';
    en.textContent = t('settings.languageEn');
    language.append(zh, en);
    language.value = this.settings.language;
    language.addEventListener('change', () => {
      const nextLanguage = language.value === 'en' ? 'en' : 'zh-TW';
      this.updateSettings({ language: nextLanguage });
    });
    languageLabel.append(language);

    const reducedLabel = document.createElement('label');
    reducedLabel.className = 'toggle-setting';
    const reduced = document.createElement('input');
    reduced.type = 'checkbox';
    reduced.checked = this.settings.reducedMotion;
    reduced.addEventListener('change', () =>
      this.updateSettings({ reducedMotion: reduced.checked }),
    );
    const reducedText = document.createElement('span');
    reducedText.textContent = t('settings.reducedMotion');
    const reducedHint = document.createElement('small');
    reducedHint.textContent = t('settings.reducedMotionHint');
    reducedLabel.append(reduced, reducedText, reducedHint);

    const autoBehindLabel = document.createElement('label');
    autoBehindLabel.className = 'toggle-setting';
    const autoBehind = document.createElement('input');
    autoBehind.type = 'checkbox';
    autoBehind.dataset.setting = 'auto-camera-behind';
    autoBehind.checked = this.settings.autoCameraBehind;
    autoBehind.addEventListener('change', () =>
      this.updateSettings({ autoCameraBehind: autoBehind.checked }),
    );
    const autoBehindText = document.createElement('span');
    autoBehindText.textContent = t('settings.autoCameraBehind');
    const autoBehindHint = document.createElement('small');
    autoBehindHint.textContent = t('settings.autoCameraBehindHint');
    autoBehindLabel.append(autoBehind, autoBehindText, autoBehindHint);

    const graphicsTitle = document.createElement('h2');
    graphicsTitle.textContent = t('settings.graphics');

    const resolutionLabel = document.createElement('label');
    resolutionLabel.textContent = t('settings.resolutionScale');
    const resolution = document.createElement('select');
    resolution.dataset.setting = 'resolution-scale';
    for (const scale of [0.5, 0.75, 1] as const) {
      const option = document.createElement('option');
      option.value = String(scale);
      option.textContent = `${scale * 100}%`;
      resolution.append(option);
    }
    resolution.value = String(this.settings.resolutionScale);
    resolution.addEventListener('change', () => {
      const value = Number(resolution.value);
      if (value === 0.5 || value === 0.75 || value === 1) {
        this.updateSettings({ resolutionScale: value });
      }
    });
    resolutionLabel.append(resolution);

    const bloom = this.createToggle(
      'settings.bloom',
      this.settings.bloomEnabled,
      (checked) => this.updateSettings({ bloomEnabled: checked }),
    );
    bloom.input.dataset.setting = 'bloom-enabled';

    const bloomIntensity = this.createRange(
      'settings.bloomIntensity',
      0.5,
      1.5,
      0.05,
      this.settings.bloomIntensity,
      (value) => this.updateSettings({ bloomIntensity: value }),
    );
    bloomIntensity.input.dataset.setting = 'bloom-intensity';

    const fieldOfView = this.createRange(
      'settings.fieldOfView',
      60,
      100,
      1,
      this.settings.fieldOfView,
      (value) => this.updateSettings({ fieldOfView: value }),
    );
    fieldOfView.input.dataset.setting = 'fov';

    const showFps = this.createToggle(
      'settings.showFps',
      this.settings.showFps,
      (checked) => this.updateSettings({ showFps: checked }),
    );
    showFps.input.dataset.setting = 'show-fps';

    const audioTitle = document.createElement('h2');
    audioTitle.textContent = t('settings.audio');
    const musicVolume = this.createRange(
      'settings.musicVolume',
      0,
      1,
      0.05,
      this.settings.musicVolume,
      (value) => this.updateSettings({ musicVolume: value }),
    );
    musicVolume.input.dataset.setting = 'music-volume';
    const sfxVolume = this.createRange(
      'settings.sfxVolume',
      0,
      1,
      0.05,
      this.settings.sfxVolume,
      (value) => this.updateSettings({ sfxVolume: value }),
    );
    sfxVolume.input.dataset.setting = 'sfx-volume';

    const subtitleLabel = document.createElement('label');
    subtitleLabel.textContent = t('settings.subtitleSize');
    const subtitle = document.createElement('select');
    for (const size of ['small', 'medium', 'large'] as const) {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = t(
        `settings.subtitle${size[0]?.toUpperCase()}${size.slice(1)}`,
      );
      subtitle.append(option);
    }
    subtitle.value = this.settings.subtitleSize;
    subtitle.addEventListener('change', () => {
      const value = subtitle.value;
      if (value === 'small' || value === 'medium' || value === 'large') {
        this.updateSettings({ subtitleSize: value });
      }
    });
    subtitleLabel.append(subtitle);

    const bindingTitle = document.createElement('h2');
    bindingTitle.textContent = t('settings.bindings');
    const bindings = document.createElement('div');
    bindings.className = 'binding-grid';
    for (const action of INPUT_ACTIONS) {
      const label = document.createElement('span');
      label.textContent = t(ACTION_LABELS[action]);
      const button = this.createButton(
        this.rebinding === action
          ? t('settings.rebindPrompt')
          : this.settings.bindings[action],
        () => {
          this.rebinding = action;
          this.render();
          this.panel
            .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
            ?.focus();
        },
      );
      button.dataset.action = action;
      bindings.append(label, button);
    }
    const conflict = document.createElement('p');
    conflict.className = 'binding-conflict';
    conflict.setAttribute('role', 'alert');

    const back = this.createButton(
      t('menu.back'),
      () => this.open(this.settingsOrigin),
      'uiBack',
    );
    back.className = 'menu-back';
    form.append(
      sensitivity.label,
      languageLabel,
      reducedLabel,
      autoBehindLabel,
      subtitleLabel,
      graphicsTitle,
      resolutionLabel,
      bloom.label,
      bloomIntensity.label,
      fieldOfView.label,
      showFps.label,
      audioTitle,
      musicVolume.label,
      sfxVolume.label,
      bindingTitle,
      bindings,
      conflict,
      back,
    );
    this.panel.append(title, form);
    sensitivity.input.focus();
  }

  private renderControls(): void {
    const title = document.createElement('h1');
    title.textContent = t('controls.title');
    const movement = document.createElement('p');
    movement.textContent = t('controls.movement');
    const actions = document.createElement('p');
    actions.textContent = t('controls.actions');
    const pause = document.createElement('p');
    pause.textContent = t('controls.pause');
    const gamepad = document.createElement('p');
    gamepad.textContent = t('controls.gamepad');
    const back = this.createButton(
      t('menu.back'),
      () => this.open('main'),
      'uiBack',
    );
    this.panel.append(title, movement, actions, pause, gamepad, back);
    back.focus();
  }

  private renderOverwriteConfirmation(): void {
    this.panel.replaceChildren();
    this.panel.setAttribute('role', 'alertdialog');
    const title = document.createElement('h1');
    title.textContent = t('menu.overwriteTitle');
    const body = document.createElement('p');
    body.textContent = t('menu.overwriteBody');
    const confirm = this.createButton(t('menu.confirm'), () =>
      this.startNewGame(),
    );
    const cancel = this.createButton(
      t('menu.cancel'),
      () => this.render(),
      'uiBack',
    );
    this.panel.append(title, body, confirm, cancel);
    cancel.focus();
  }

  private startNewGame(): void {
    this.callbacks.onNewGame();
    this.open('none');
  }

  private updateSettings(change: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...change };
    this.callbacks.onSettingsChange(structuredClone(this.settings));
  }

  private createButton(
    label: string,
    onClick: () => void,
    sound: 'uiConfirm' | 'uiBack' = 'uiConfirm',
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      this.callbacks.onUiSound(sound);
      onClick();
    });
    return button;
  }

  private createRange(
    key: string,
    minimum: number,
    maximum: number,
    step: number,
    value: number,
    onInput: (value: number) => void,
  ): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement('label');
    label.textContent = t(key);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(minimum);
    input.max = String(maximum);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => onInput(Number(input.value)));
    label.append(input);
    return { label, input };
  }

  private createToggle(
    key: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement('label');
    label.className = 'toggle-setting';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const text = document.createElement('span');
    text.textContent = t(key);
    label.append(input, text);
    return { label, input };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    event.stopPropagation();
    if (this.rebinding && event.key !== 'Escape') {
      event.preventDefault();
      const conflict = INPUT_ACTIONS.find(
        (action) =>
          action !== this.rebinding &&
          this.settings.bindings[action] === event.code,
      );
      if (conflict) {
        const message =
          this.panel.querySelector<HTMLElement>('.binding-conflict');
        if (message) {
          message.textContent = `${t('settings.keyConflict')} ${t(ACTION_LABELS[conflict])}`;
        }
        return;
      }
      this.updateSettings({
        bindings: { ...this.settings.bindings, [this.rebinding]: event.code },
      });
      this.rebinding = undefined;
      this.render();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.callbacks.onUiSound('uiBack');
      if (this.current === 'pause') {
        this.callbacks.onResume();
        this.open('none');
      } else if (this.current === 'settings') this.open(this.settingsOrigin);
      else if (this.current === 'warp') this.open('pause');
      else if (this.current === 'controls') this.open('main');
      return;
    }
    const isTab = event.key === 'Tab';
    const isArrow = event.key === 'ArrowDown' || event.key === 'ArrowUp';
    if (!isTab && !isArrow) return;
    if (
      isArrow &&
      (event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLInputElement)
    ) {
      return;
    }
    event.preventDefault();
    const direction: -1 | 1 =
      event.key === 'ArrowUp' || (isTab && event.shiftKey) ? -1 : 1;
    this.moveFocus(direction);
  };

  private moveFocus(direction: -1 | 1): void {
    const controls = [
      ...this.panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
      ),
    ];
    if (controls.length === 0) return;
    const currentIndex = controls.indexOf(
      document.activeElement as HTMLElement,
    );
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : controls.length - 1
        : (currentIndex + direction + controls.length) % controls.length;
    controls[nextIndex]?.focus();
    this.callbacks.onUiSound('uiMove');
  }
}
