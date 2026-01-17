import { describe, it, expect } from 'vitest';

describe('I18n Extensions Module', () => {
  it('should export allExtensions', async () => {
    const { allExtensions } = await import('@/lib/i18n/extensions');

    expect(allExtensions).toBeDefined();
    expect(typeof allExtensions).toBe('object');
  });

  it('should export dailyRitualExtension', async () => {
    const { dailyRitualExtension } = await import('@/lib/i18n/extensions');

    expect(dailyRitualExtension).toBeDefined();
    expect(typeof dailyRitualExtension).toBe('object');
  });

  it('should export psychologyExtension', async () => {
    const { psychologyExtension } = await import('@/lib/i18n/extensions');

    expect(psychologyExtension).toBeDefined();
    expect(typeof psychologyExtension).toBe('object');
  });

  it('should export meditationExtension', async () => {
    const { meditationExtension } = await import('@/lib/i18n/extensions');

    expect(meditationExtension).toBeDefined();
    expect(typeof meditationExtension).toBe('object');
  });

  it('should have ko and en locales in allExtensions', async () => {
    const { allExtensions } = await import('@/lib/i18n/extensions');

    expect(allExtensions).toHaveProperty('ko');
    expect(allExtensions).toHaveProperty('en');
  });

  it('should have ko locale in dailyRitualExtension', async () => {
    const { dailyRitualExtension } = await import('@/lib/i18n/extensions');

    expect(dailyRitualExtension).toHaveProperty('ko');
    expect(dailyRitualExtension).toHaveProperty('en');
  });

  it('should have ko locale in psychologyExtension', async () => {
    const { psychologyExtension } = await import('@/lib/i18n/extensions');

    expect(psychologyExtension).toHaveProperty('ko');
    expect(psychologyExtension).toHaveProperty('en');
  });

  it('should have ko locale in meditationExtension', async () => {
    const { meditationExtension } = await import('@/lib/i18n/extensions');

    expect(meditationExtension).toHaveProperty('ko');
    expect(meditationExtension).toHaveProperty('en');
  });

  it('should merge all extensions properly', async () => {
    const { allExtensions, dailyRitualExtension, psychologyExtension, meditationExtension } =
      await import('@/lib/i18n/extensions');

    const allKoNamespaces = Object.keys(allExtensions.ko || {});
    const ritualKoNamespaces = Object.keys(dailyRitualExtension.ko || {});
    const psychKoNamespaces = Object.keys(psychologyExtension.ko || {});
    const meditationKoNamespaces = Object.keys(meditationExtension.ko || {});

    const expectedNamespaces = new Set([
      ...ritualKoNamespaces,
      ...psychKoNamespaces,
      ...meditationKoNamespaces,
    ]);

    expect(allKoNamespaces.length).toBeGreaterThanOrEqual(expectedNamespaces.size);
  });
});

describe('Daily Ritual Extension', () => {
  it('should have translations structure', async () => {
    const { dailyRitualExtension } = await import('@/lib/i18n/extensions/dailyRitual');

    const koLocale = dailyRitualExtension.ko;
    expect(koLocale).toBeDefined();
    expect(typeof koLocale).toBe('object');
  });
});

describe('Psychology Extension', () => {
  it('should have translations structure', async () => {
    const { psychologyExtension } = await import('@/lib/i18n/extensions/psychology');

    const koLocale = psychologyExtension.ko;
    expect(koLocale).toBeDefined();
    expect(typeof koLocale).toBe('object');
  });
});

describe('Meditation Extension', () => {
  it('should have translations structure', async () => {
    const { meditationExtension } = await import('@/lib/i18n/extensions/meditation');

    const koLocale = meditationExtension.ko;
    expect(koLocale).toBeDefined();
    expect(typeof koLocale).toBe('object');
  });
});
