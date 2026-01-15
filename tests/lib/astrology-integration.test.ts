import { describe, it, expect } from 'vitest';
import path from 'path';
import { existsSync, readFileSync } from 'fs';

const resolveModuleFile = (modulePath: string) => {
  const basePath = path.join(process.cwd(), 'src', modulePath);
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const readModule = (modulePath: string) => {
  const filePath = resolveModuleFile(modulePath);
  if (!filePath) {
    throw new Error(`Missing module file for ${modulePath}`);
  }
  return readFileSync(filePath, 'utf8');
};

const assertNamedExports = (modulePath: string, exportNames: string[]) => {
  const content = readModule(modulePath);
  exportNames.forEach((name) => {
    expect(content).toMatch(new RegExp(`\\b${name}\\b`));
  });
};

describe('Astrology Integration', () => {
  it('should expose foundation exports', () => {
    assertNamedExports('lib/astrology/foundation/astrologyService', ['calculateNatalChart']);
    assertNamedExports('lib/astrology/foundation/aspects', ['findAspects']);
    assertNamedExports('lib/astrology/foundation/houses', ['calcHouses']);
    assertNamedExports('lib/astrology/foundation/transit', ['findMajorTransits']);
    assertNamedExports('lib/astrology/foundation/progressions', ['calculateSecondaryProgressions']);
    assertNamedExports('lib/astrology/foundation/synastry', ['calculateSynastry']);
  });

  it('should expose advanced exports', () => {
    assertNamedExports('lib/astrology/foundation/returns', ['calculateSolarReturn']);
    assertNamedExports('lib/astrology/foundation/eclipses', ['getUpcomingEclipses']);
    assertNamedExports('lib/astrology/foundation/harmonics', ['calculateHarmonicChart']);
    assertNamedExports('lib/astrology/foundation/midpoints', ['calculateMidpoints']);
    assertNamedExports('lib/astrology/foundation/asteroids', ['calculateAllAsteroids']);
    assertNamedExports('lib/astrology/foundation/fixedStars', ['findFixedStarConjunctions']);
    assertNamedExports('lib/astrology/foundation/draconic', ['calculateDraconicChart']);
    assertNamedExports('lib/astrology/foundation/electional', ['findBestDates']);
    assertNamedExports('lib/astrology/foundation/rectification', ['generateRectificationGuide']);
  });

  it('should expose utility exports', () => {
    assertNamedExports('lib/astrology/foundation/utils', ['normalize360']);
    readModule('lib/astrology/foundation/shared');
    readModule('lib/astrology/foundation/ephe');
  });

  it('should expose advanced options exports', () => {
    readModule('lib/astrology/advanced/meta');
    readModule('lib/astrology/advanced/options');
  });

  it('should expose main astrology index exports', () => {
    const content = readModule('lib/astrology/index');
    expect(content).toMatch(/export\s+/);
    expect(content).toMatch(/\bcalculateNatalChart\b/);
  });

  it('should normalize angles correctly', async () => {
    const { normalize360 } = await import('@/lib/astrology/foundation/utils');

    expect(normalize360(370)).toBe(10);
    expect(normalize360(-10)).toBe(350);
    expect(normalize360(180)).toBe(180);
    expect(normalize360(0)).toBe(0);
    expect(normalize360(360)).toBe(0);
  });
});
