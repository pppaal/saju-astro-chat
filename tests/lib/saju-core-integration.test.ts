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

describe('Saju Core Integration', () => {
  it('should expose core saju exports', () => {
    assertNamedExports('lib/Saju/saju', ['calculateSajuData']);
    assertNamedExports('lib/Saju/pillarLookup', [
      'getYearPillar',
      'getPillarInfo',
      'getPillarByIndex',
      'getGongmang',
    ]);
    assertNamedExports('lib/Saju/relations', ['analyzeRelations', 'toAnalyzeInputFromSaju']);
    assertNamedExports('lib/Saju/strengthScore', ['calculateStrengthScore']);
    assertNamedExports('lib/Saju/sibsinAnalysis', ['analyzeSibsinComprehensive']);
    assertNamedExports('lib/Saju/unse', ['getDaeunCycles', 'getAnnualCycles', 'getMonthlyCycles']);
  });

  it('should expose supporting modules', () => {
    assertNamedExports('lib/Saju/textGenerator', ['generateFortuneText']);
    assertNamedExports('lib/Saju/compatibilityEngine', ['analyzeComprehensiveCompatibility']);
    assertNamedExports('lib/Saju/sajuCache', ['getSajuFromCache', 'setSajuToCache']);
    assertNamedExports('lib/Saju/visualizationData', ['generateElementDistribution']);
  });

  it('should calculate saju data with basic inputs', async () => {
    const { calculateSajuData } = await import('@/lib/Saju/saju');

    const result = calculateSajuData(
      '1990-01-15',
      '14:30',
      'male',
      'solar',
      'Asia/Seoul'
    );

    expect(result).toBeDefined();
    expect(result.pillars).toHaveProperty('year');
    expect(result.pillars).toHaveProperty('month');
    expect(result.pillars).toHaveProperty('day');
    expect(result.pillars).toHaveProperty('time');
    expect(result.fiveElements).toHaveProperty('wood');
    expect(result.fiveElements).toHaveProperty('fire');
    expect(result.fiveElements).toHaveProperty('earth');
    expect(result.fiveElements).toHaveProperty('metal');
    expect(result.fiveElements).toHaveProperty('water');
  });

  it('should list all core module files', () => {
    const modules = [
      'lib/Saju/saju',
      'lib/Saju/pillarLookup',
      'lib/Saju/relations',
      'lib/Saju/strengthScore',
      'lib/Saju/sibsinAnalysis',
      'lib/Saju/unse',
      'lib/Saju/unseAnalysis',
      'lib/Saju/textGenerator',
      'lib/Saju/compatibilityEngine',
      'lib/Saju/sajuCache',
      'lib/Saju/visualizationData',
      'lib/Saju/geokguk',
      'lib/Saju/tonggeun',
      'lib/Saju/healthCareer',
      'lib/Saju/familyLineage',
      'lib/Saju/patternMatcher',
      'lib/Saju/aiPromptGenerator',
      'lib/Saju/advancedSajuCore',
      'lib/Saju/comprehensiveReport',
      'lib/Saju/fortuneSimulator',
    ];

    expect(modules.length).toBe(20);
    modules.forEach((modulePath) => {
      readModule(modulePath);
    });
  });
});
