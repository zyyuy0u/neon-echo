import type { SteleContent } from '../content/steles';
import type { Ability } from '../world/map/types';
import type { EndingChoice } from '../systems/ending/EndingState';

const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  dash: '衝刺 DASH',
  doubleJump: '二段跳 DOUBLE JUMP',
  glide: '滑翔 GLIDE',
};

const ENDINGS: Readonly<
  Record<EndingChoice, { title: string; lines: readonly string[] }>
> = {
  awaken: {
    title: '晨光重啟 · CITY AWAKENED',
    lines: [
      '你將全城殘響重新接入仍然呼吸的街道。',
      '招牌先亮起，接著是久違的人聲與清晨電車。',
      '沒有人忘記那場風暴，也沒有人被迫原諒。',
      '城市帶著裂痕醒來，而你成為它第一位見證者。',
    ],
  },
  rest: {
    title: '靜夜安眠 · ECHOES AT REST',
    lines: [
      '你解除封存，讓四十萬道殘響化作城市上空的微光。',
      '最後一聲告別沒有恐懼，只有被允許結束的平靜。',
      'AURORA 關閉核心，第一次停止計算正確答案。',
      '空城仍在，而你帶著所有人的名字走向黎明。',
    ],
  },
};

export class GameplayOverlay {
  private readonly root = document.createElement('div');
  private readonly shardCounter = document.createElement('div');
  private readonly message = document.createElement('div');
  private readonly stele = document.createElement('section');
  private readonly ending = document.createElement('section');

  public constructor() {
    this.root.id = 'gameplay-ui';
    this.shardCounter.className = 'shard-counter';
    this.message.className = 'gameplay-message';
    this.stele.className = 'stele-overlay';
    this.ending.className = 'ending-overlay';
    this.stele.hidden = true;
    this.ending.hidden = true;
    this.root.append(this.shardCounter, this.message, this.stele, this.ending);
    document.body.append(this.root);
    this.setShardCount(0);
  }

  public setShardCount(count: number): void {
    this.shardCounter.textContent = `殘響碎片 ${count} / 40`;
  }

  public showUnlock(ability: Ability): void {
    this.message.textContent = `能力解鎖 · ${ABILITY_LABELS[ability]}`;
    this.message.classList.add('is-visible');
    window.setTimeout(() => this.message.classList.remove('is-visible'), 2400);
  }

  public showStele(content: SteleContent): void {
    this.stele.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = '記憶碑文 · MEMORY STELE';
    const zh = document.createElement('p');
    zh.textContent = content.zh;
    const en = document.createElement('p');
    en.lang = 'en';
    en.textContent = content.en;
    const hint = document.createElement('small');
    hint.textContent = '按 E 關閉';
    this.stele.append(title, zh, en, hint);
    this.stele.hidden = false;
  }

  public closeStele(): boolean {
    if (this.stele.hidden) return false;
    this.stele.hidden = true;
    return true;
  }

  public showEndingChoice(onChoose: (choice: EndingChoice) => void): void {
    this.ending.replaceChildren();
    const title = document.createElement('h1');
    title.textContent = '決定殘響的黎明';
    const prompt = document.createElement('p');
    prompt.textContent = 'AURORA 將最後的選擇交給唯一醒著的人。';
    const awaken = document.createElement('button');
    awaken.type = 'button';
    awaken.textContent = '喚醒城市';
    awaken.addEventListener('click', () => onChoose('awaken'), { once: true });
    const rest = document.createElement('button');
    rest.type = 'button';
    rest.textContent = '讓殘響安眠';
    rest.addEventListener('click', () => onChoose('rest'), { once: true });
    this.ending.append(title, prompt, awaken, rest);
    this.ending.hidden = false;
    awaken.focus();
  }

  public showEnding(choice: EndingChoice, shardCount: number): void {
    const content = ENDINGS[choice];
    this.ending.replaceChildren();
    const title = document.createElement('h1');
    title.textContent = content.title;
    this.ending.append(title);
    for (const line of content.lines) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      this.ending.append(paragraph);
    }
    const stats = document.createElement('strong');
    stats.textContent = `收集統計：殘響碎片 ${shardCount} / 40`;
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.textContent = '繼續探索';
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
    this.root.remove();
  }
}
