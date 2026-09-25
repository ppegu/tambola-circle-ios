import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalog } from '../src/i18n/messages';
import { isLanguage, translate, translateKnown } from '../src/i18n/core';

const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();

describe('bundled translations', () => {
  it('provides Assamese and Hindi with exactly the same interpolation values as English', () => {
    for (const [english, translations] of Object.entries(catalog)) {
      expect(translations, english).toHaveLength(2);
      for (const text of translations) {
        expect(text.trim(), english).not.toBe('');
        expect(placeholders(text), english).toEqual(placeholders(english));
      }
    }
  });
  it('keeps user content and game numbers intact, without recursively translating values', () => {
    const name = 'Play online {v1} & মীনা';
    expect(translate('hi', 'Hi, {name}!', { name })).toBe('नमस्ते, ' + name + '!');
    expect(translate('as', 'Ticket {v0} of {v1}', { v0: 2, v1: 6 })).toBe('6খনৰ টিকট 2');
    expect(translate('en', '{v0} coins', { v0: 0 })).toBe('0 coins');
    expect(translateKnown('hi', 'Unknown server detail')).toBe('Unknown server detail');
    expect(translateKnown('hi', '__proto__')).toBe('__proto__');
  });
  it('supports only the three intended locale codes', () => {
    expect(['en', 'as', 'hi'].every(isLanguage)).toBe(true);
    expect(['bn', 'fr', null, '', 'EN', {}].some(isLanguage)).toBe(false);
  });
});

describe('language selection persistence', () => {
  beforeEach(() => { vi.resetModules(); storage.getItem.mockReset(); storage.setItem.mockReset().mockResolvedValue(undefined); });
  it('defaults to English but leaves first-run selection pending', async () => {
    storage.getItem.mockResolvedValue(null);
    const i18n = await import('../src/i18n');
    await i18n.initializeLanguage();
    expect(i18n.languageStore.getState()).toEqual({ language: 'en', selected: false, hydrated: true });
  });
  it.each(['en', 'as', 'hi'] as const)('restores a saved %s selection without prompting again', async language => {
    storage.getItem.mockResolvedValue(language);
    const i18n = await import('../src/i18n');
    await Promise.all([i18n.initializeLanguage(), i18n.initializeLanguage()]);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(i18n.languageStore.getState()).toEqual({ language, selected: true, hydrated: true });
  });
  it.each(['invalid', null])('keeps the choice open for unsupported or missing storage: %s', async saved => {
    storage.getItem.mockResolvedValue(saved);
    const i18n = await import('../src/i18n'); await i18n.initializeLanguage();
    expect(i18n.languageStore.getState().selected).toBe(false);
  });
  it('allows recovery from storage read and write failures without losing the picker', async () => {
    storage.getItem.mockRejectedValue(new Error('storage unavailable'));
    const i18n = await import('../src/i18n'); await i18n.initializeLanguage();
    storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(i18n.selectLanguage('hi')).rejects.toThrow('disk full');
    expect(i18n.languageStore.getState().selected).toBe(false);
    await i18n.selectLanguage('as');
    expect(i18n.languageStore.getState().language).toBe('as');
    expect(storage.setItem).toHaveBeenLastCalledWith('tambola.circle.language.v1', 'as');
  });
  it('does not let slow hydration overwrite a newer selection', async () => {
    let finish!: (saved: string) => void;
    storage.getItem.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const i18n = await import('../src/i18n'); const loading = i18n.initializeLanguage();
    await i18n.selectLanguage('hi'); finish('as'); await loading;
    expect(i18n.languageStore.getState().language).toBe('hi');
  });
});
