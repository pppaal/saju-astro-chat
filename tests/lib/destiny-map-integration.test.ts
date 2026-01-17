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

describe('Destiny Map Integration', () => {
  it('should expose core destiny map exports', () => {
    assertNamedExports('lib/destiny-map/destinyCalendar', ['calculateYearlyImportantDates']);
    assertNamedExports('lib/destiny-map/reportService', ['generateReport']);
    assertNamedExports('lib/destiny-map/astrologyengine', ['computeDestinyMap']);
  });

  it('should expose destiny matrix exports', () => {
    assertNamedExports('lib/destiny-matrix/engine', ['calculateDestinyMatrix']);
    assertNamedExports('lib/destiny-matrix/cache', ['getCachedMatrix', 'setCachedMatrix']);
    assertNamedExports('lib/destiny-matrix/house-system', ['getHouseSystem']);
    assertNamedExports('lib/destiny-matrix/interpreter/insight-generator', ['generateInsights']);
  });

  it('should expose report helpers and local generator', () => {
    readModule('lib/destiny-map/report-helpers');
    assertNamedExports('lib/destiny-map/local-report-generator', ['generateLocalReport']);
  });

  it('should expose fortune prompt modules', () => {
    readModule('lib/destiny-map/prompt/fortune/base/data-extractors');
    readModule('lib/destiny-map/prompt/fortune/base/formatter-utils');
    readModule('lib/destiny-map/prompt/fortune/base/prompt-template');
    readModule('lib/destiny-map/prompt/fortune/base/theme-sections');
  });

  it('should expose calendar scoring modules', () => {
    assertNamedExports('lib/destiny-map/calendar/category-scoring', [
      'calculateAreaScoresForCategories',
      'getBestAreaCategory',
    ]);
    assertNamedExports('lib/destiny-map/calendar/grading', ['calculateGrade']);
    readModule('lib/destiny-map/calendar/daily-fortune-helpers');
  });

  it('should calculate grade from score', async () => {
    const { calculateGrade } = await import('@/lib/destiny-map/calendar/grading-optimized');

    expect(calculateGrade(80)).toBe(0);
    expect(calculateGrade(65)).toBe(1);
    expect(calculateGrade(45)).toBe(2);
    expect(calculateGrade(30)).toBe(3);
    expect(calculateGrade(20)).toBe(4);
  });
});
