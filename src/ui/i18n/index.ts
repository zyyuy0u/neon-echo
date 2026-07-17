import { en } from './en';
import { zh, type TranslationKey } from './zh';

export type Language = 'zh-TW' | 'en';

export const dictionaries: Readonly<
  Record<Language, Readonly<Record<TranslationKey, string>>>
> = { 'zh-TW': zh, en };

let language: Language = 'zh-TW';
const warnedMissingKeys = new Set<string>();

export function getLanguage(): Language {
  return language;
}

export function setLanguage(nextLanguage: Language): void {
  language = nextLanguage;
  if (typeof document !== 'undefined') document.documentElement.lang = nextLanguage;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<Language>('neon-language-change', {
        detail: nextLanguage,
      }),
    );
  }
}

export function t(key: TranslationKey | string, values: Readonly<Record<string, string | number>> = {}): string {
  const dictionary = dictionaries[language] as Readonly<Record<string, string>>;
  const translated = dictionary[key];
  if (translated === undefined) {
    if (!warnedMissingKeys.has(key)) {
      warnedMissingKeys.add(key);
      console.warn(`Missing translation: ${key}`);
    }
    return key;
  }
  return translated.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    values[name] === undefined ? placeholder : String(values[name]),
  );
}

export function onLanguageChange(listener: (language: Language) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handle = (event: Event): void => {
    listener((event as CustomEvent<Language>).detail);
  };
  window.addEventListener('neon-language-change', handle);
  return () => window.removeEventListener('neon-language-change', handle);
}

export function resetI18nWarningsForTests(): void {
  warnedMissingKeys.clear();
}
