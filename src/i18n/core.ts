import { catalog } from './messages';

export const languages = ['en', 'as', 'hi'] as const;
export type Language = typeof languages[number];
export type MessageKey = keyof typeof catalog;
export type Values = Record<string, string | number | undefined>;
export const languageNames: Record<Language, string> = { en: 'English', as: 'অসমীয়া', hi: 'हिन्दी' };
export function isLanguage(value: unknown): value is Language { return languages.includes(value as Language); }
/** Only explicit UI copy is translated. Interpolated player names and table data stay intact. */
export function translate(language: Language, key: MessageKey, values: Values = {}): string {
  const row = catalog[key];
  const copy = language === 'en' ? key : row?.[language === 'as' ? 0 : 1] || key;
  return copy.replace(/\{(\w+)\}/g, (placeholder, name: string) => Object.hasOwn(values, name) ? String(values[name] ?? '') : placeholder);
}
/** For known server error copy and bundled voice metadata, never player or table names. */
export function translateKnown(language: Language, copy: string) {
  return Object.hasOwn(catalog, copy) ? translate(language, copy as MessageKey) : copy;
}
