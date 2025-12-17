// src/app/api/destiny-matrix/report/route.ts
// Destiny Fusion Matrix™ - User-Friendly Report API
// 특허 가능 엔드포인트: 사용자 친화적 융합 리포트 생성

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDestinyMatrix,
  FusionReportGenerator,
  reportGenerator,
} from '@/lib/destiny-matrix';
import type { MatrixCalculationInput, InsightDomain } from '@/lib/destiny-matrix';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      // Saju data
      dayMasterElement,
      pillarElements = [],
      sibsinDistribution = {},
      twelveStages = {},
      relations = [],
      geokguk,
      yongsin,
      currentDaeunElement,
      currentSaeunElement,

      // Shinsal data
      shinsalList = [],

      // Astrology data
      dominantWesternElement,
      planetHouses = {},
      planetSigns = {},
      aspects = [],
      activeTransits = [],

      // Asteroid data
      asteroidHouses = {},

      // Extra Point data
      extraPointSigns = {},

      // Options
      lang = 'ko',
      queryDomain,
      maxInsights = 5,
      includeVisualizations = true,
      includeDetailedData = false,
    } = body as Partial<MatrixCalculationInput> & {
      queryDomain?: InsightDomain;
      maxInsights?: number;
      includeVisualizations?: boolean;
      includeDetailedData?: boolean;
    };

    // Validate required fields
    if (!dayMasterElement) {
      return NextResponse.json(
        { error: 'dayMasterElement is required' },
        { status: 400 }
      );
    }

    // Build input
    const input: MatrixCalculationInput = {
      dayMasterElement,
      pillarElements,
      sibsinDistribution,
      twelveStages,
      relations,
      geokguk,
      yongsin,
      currentDaeunElement,
      currentSaeunElement,
      shinsalList,
      dominantWesternElement,
      planetHouses,
      planetSigns,
      aspects,
      activeTransits,
      asteroidHouses,
      extraPointSigns,
      lang,
    };

    // Calculate raw matrix
    const matrix = calculateDestinyMatrix(input);

    // Generate layer results for interpreter
    const layerResults: Record<string, Record<string, any>> = {
      layer1: extractLayerCells(matrix.layer1_elementCore, 1),
      layer2: extractLayerCells(matrix.layer2_sibsinPlanet, 2),
      layer3: extractLayerCells(matrix.layer3_sibsinHouse, 3),
      layer4: extractLayerCells(matrix.layer4_timing, 4),
      layer5: extractLayerCells(matrix.layer5_relationAspect, 5),
      layer6: extractLayerCells(matrix.layer6_stageHouse, 6),
      layer7: extractLayerCells(matrix.layer7_advanced, 7),
      layer8: extractLayerCells(matrix.layer8_shinsalPlanet, 8),
      layer9: extractLayerCells(matrix.layer9_asteroidHouse, 9),
      layer10: extractLayerCells(matrix.layer10_extraPointElement, 10),
    };

    // Create custom report generator with options
    const generator = new FusionReportGenerator({
      lang,
      maxTopInsights: maxInsights,
      includeVisualizations,
      includeDetailedData,
      weightConfig: {
        baseWeights: {
          layer1_elementCore: 1.0,
          layer2_sibsinPlanet: 0.9,
          layer3_sibsinHouse: 0.85,
          layer4_timing: 0.95,
          layer5_relationAspect: 0.8,
          layer6_stageHouse: 0.75,
          layer7_advanced: 0.7,
          layer8_shinsal: 0.65,
          layer9_asteroid: 0.5,
          layer10_extraPoint: 0.55,
        },
        contextModifiers: [],
        temporalModifiers: [],
      },
      narrativeStyle: 'friendly',
    });

    // Generate user-friendly report
    const report = generator.generateReport(input, layerResults, queryDomain);

    return NextResponse.json({
      success: true,
      report,
    });

  } catch (error) {
    console.error('Destiny Matrix Report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 레이어 데이터를 MatrixCell 형식으로 변환
 */
function extractLayerCells(
  layerData: Record<string, any>,
  layerNum: number
): Record<string, any> {
  const cells: Record<string, any> = {};

  for (const [rowKey, rowData] of Object.entries(layerData || {})) {
    if (typeof rowData === 'object' && rowData !== null) {
      for (const [colKey, interaction] of Object.entries(rowData)) {
        if (interaction && typeof interaction === 'object' && 'level' in interaction) {
          const cellKey = `${rowKey}_${colKey}`;
          cells[cellKey] = {
            interaction,
            sajuBasis: getSajuBasis(rowKey, layerNum),
            astroBasis: getAstroBasis(colKey, layerNum),
          };
        }
      }
    }
  }

  return cells;
}

/**
 * 사주 기반 설명 생성
 */
function getSajuBasis(key: string, layer: number): string {
  switch (layer) {
    case 1: return `오행 ${key}`;
    case 2:
    case 3: return `십신 ${key}`;
    case 4: return key === 'daeunTransition' ? '대운 전환기' : `세운 ${key}`;
    case 5: return `지지관계 ${key}`;
    case 6: return `십이운성 ${key}`;
    case 7: return key.startsWith('yongsin') ? `용신 ${key.replace('yongsin_', '')}` : `격국 ${key}`;
    case 8: return `신살 ${key}`;
    case 9: return `소행성 ${key}`;
    case 10: return `엑스트라포인트 ${key}`;
    default: return key;
  }
}

/**
 * 점성 기반 설명 생성
 */
function getAstroBasis(key: string, layer: number): string {
  switch (layer) {
    case 1: return `서양 ${key} 원소`;
    case 2: return `행성 ${key}`;
    case 3: return `H${key}`;
    case 4: return key.includes('Retrograde') ? `${key.replace('Retrograde', '')} 역행` : key;
    case 5: return `애스펙트 ${key}`;
    case 6: return `H${key}`;
    case 7: return `프로그레션 ${key}`;
    case 8: return `행성 ${key}`;
    case 9: return Number.isInteger(parseInt(key)) ? `H${key}` : `오행 ${key}`;
    case 10: return `오행/십신 ${key}`;
    default: return key;
  }
}

// GET endpoint for quick examples
export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: 'Destiny Fusion Matrix™ Report API',
    version: '2.0.0',
    description: '사용자 친화적 운명 융합 분석 리포트 API',
    endpoints: {
      POST: {
        description: '전체 리포트 생성',
        requiredFields: ['dayMasterElement'],
        optionalFields: [
          'pillarElements', 'sibsinDistribution', 'twelveStages', 'relations',
          'geokguk', 'yongsin', 'currentDaeunElement', 'currentSaeunElement',
          'shinsalList', 'dominantWesternElement', 'planetHouses', 'planetSigns',
          'aspects', 'activeTransits', 'asteroidHouses', 'extraPointSigns',
          'lang', 'queryDomain', 'maxInsights', 'includeVisualizations', 'includeDetailedData',
        ],
      },
    },
    exampleRequest: {
      dayMasterElement: '목',
      geokguk: 'jeonggwan',
      yongsin: '화',
      sibsinDistribution: { '정관': 2, '정인': 1, '식신': 1 },
      shinsalList: ['천을귀인', '역마'],
      planetHouses: { Sun: 10, Moon: 4, Mercury: 11, Venus: 7, Mars: 1 },
      planetSigns: { Sun: '양자리', Moon: '게자리' },
      activeTransits: ['jupiterReturn'],
      lang: 'ko',
      queryDomain: 'career',
    },
    exampleResponse: {
      success: true,
      report: {
        id: 'report_xxx',
        overallScore: { total: 78, grade: 'A' },
        topInsights: ['...5개의 핵심 인사이트...'],
        domainAnalysis: ['...7개 도메인별 분석...'],
        timingAnalysis: { currentPeriod: { score: 75 } },
        visualizations: { radarChart: {}, heatmap: {}, synergyNetwork: {} },
      },
    },
  });
}
