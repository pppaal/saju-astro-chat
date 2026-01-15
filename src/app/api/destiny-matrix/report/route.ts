// src/app/api/destiny-matrix/report/route.ts
// Destiny Fusion Matrix™ - User-Friendly Report API v2.0
// 완전한 검증, 에러 처리, 캐싱 적용

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDestinyMatrix,
  FusionReportGenerator,
  validateReportRequest,
  DestinyMatrixError,
  ErrorCodes,
  wrapError,
  matrixCache,
  generateInputHash,
  performanceMonitor,
} from '@/lib/destiny-matrix';
import type { InsightDomain, MatrixCalculationInput, MatrixCell } from '@/lib/destiny-matrix';
import { logger } from '@/lib/logger';

// ===========================
// POST - 리포트 생성
// ===========================

export async function POST(req: NextRequest) {
  const end = performanceMonitor.start('generateReport');

  try {
    // 1. 요청 본문 파싱
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
        message: 'Invalid JSON in request body',
        lang: 'en',
      });
    }

    // 2. Zod 스키마로 입력 검증
    const validation = validateReportRequest(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: '입력 데이터 검증에 실패했습니다.',
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const validatedInput = validation.data!;
    const { queryDomain, maxInsights, includeVisualizations, includeDetailedData, ...rest } = validatedInput;

    // Zod가 검증을 완료했으므로 타입 캐스팅으로 변환
    // (Zod 스키마 타입과 기존 인터페이스의 미세한 차이 해결)
    const matrixInput = rest as unknown as MatrixCalculationInput;

    // 3. 캐시 키 생성
    const inputHash = generateInputHash(matrixInput);
    const cacheKey = `${inputHash}_${queryDomain ?? 'all'}_${maxInsights}`;

    // 4. 캐시 체크
    const cachedReport = matrixCache.getReport(cacheKey);
    if (cachedReport) {
      end(true); // cache hit
      return NextResponse.json({
        success: true,
        cached: true,
        report: cachedReport,
      });
    }

    // 5. 매트릭스 계산 (캐시 또는 새로 계산)
    let matrix = matrixCache.getMatrix(inputHash);
    if (!matrix) {
      matrix = calculateDestinyMatrix(matrixInput);
      matrixCache.setMatrix(inputHash, matrix);
    }

    // 6. 레이어 셀 추출
    const layerResults = extractAllLayerCells(matrix as MatrixLayers);

    // 7. 리포트 생성
    const generator = new FusionReportGenerator({
      lang: rest.lang ?? 'ko',
      maxTopInsights: maxInsights ?? 5,
      includeVisualizations: includeVisualizations ?? true,
      includeDetailedData: includeDetailedData ?? false,
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

    const report = generator.generateReport(matrixInput, layerResults, queryDomain as InsightDomain | undefined);

    // 8. 캐시에 저장
    matrixCache.setReport(cacheKey, report);

    end(false); // cache miss

    return NextResponse.json({
      success: true,
      cached: false,
      report,
    });

  } catch (error) {
    end(false);

    // 에러를 DestinyMatrixError로 래핑
    const wrappedError = wrapError(error);

    logger.error('Destiny Matrix Report Error:', {
      code: wrappedError.code,
      message: wrappedError.message,
      details: wrappedError.details,
    });

    return NextResponse.json(wrappedError.toJSON(), {
      status: wrappedError.getHttpStatus(),
    });
  }
}

// ===========================
// GET - API 문서 및 상태
// ===========================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  // 성능 통계 요청
  if (format === 'stats') {
    return NextResponse.json({
      cache: matrixCache.getStats(),
      performance: performanceMonitor.getStats(),
    });
  }

  // OpenAPI 스타일 문서
  return NextResponse.json({
    openapi: '3.0.0',
    info: {
      title: 'Destiny Fusion Matrix™ Report API',
      version: '2.0.0',
      description: '동양 사주와 서양 점성술을 융합한 운명 분석 리포트 API',
      contact: {
        name: 'Destiny Fusion Matrix Support',
      },
    },
    servers: [
      { url: '/api/destiny-matrix/report', description: 'Report API' },
    ],
    paths: {
      '/': {
        post: {
          summary: '운명 융합 리포트 생성',
          description: '사주 데이터와 점성 데이터를 입력받아 사용자 친화적 리포트를 생성합니다.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReportRequest' },
                example: {
                  dayMasterElement: '목',
                  geokguk: 'jeonggwan',
                  yongsin: '화',
                  sibsinDistribution: { '정관': 2, '정인': 1 },
                  shinsalList: ['천을귀인', '역마'],
                  planetHouses: { Sun: 10, Moon: 4 },
                  activeTransits: ['jupiterReturn'],
                  lang: 'ko',
                  queryDomain: 'career',
                },
              },
            },
          },
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ReportResponse' },
                },
              },
            },
            '400': {
              description: '검증 오류',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '500': {
              description: '서버 오류',
            },
          },
        },
        get: {
          summary: 'API 문서 및 상태',
          parameters: [
            {
              name: 'format',
              in: 'query',
              description: 'stats: 성능 통계 반환',
              schema: { type: 'string', enum: ['stats'] },
            },
          ],
        },
      },
    },
    components: {
      schemas: {
        ReportRequest: {
          type: 'object',
          required: ['dayMasterElement'],
          properties: {
            dayMasterElement: {
              type: 'string',
              enum: ['목', '화', '토', '금', '수'],
              description: '일간 오행 (필수)',
            },
            geokguk: {
              type: 'string',
              description: '격국 (19종)',
            },
            yongsin: {
              type: 'string',
              enum: ['목', '화', '토', '금', '수'],
              description: '용신 오행',
            },
            sibsinDistribution: {
              type: 'object',
              description: '십신 분포',
            },
            shinsalList: {
              type: 'array',
              items: { type: 'string' },
              description: '신살 목록',
            },
            planetHouses: {
              type: 'object',
              description: '행성별 하우스 (예: { Sun: 10 })',
            },
            planetSigns: {
              type: 'object',
              description: '행성별 별자리',
            },
            activeTransits: {
              type: 'array',
              items: { type: 'string' },
              description: '활성 트랜짓/역행',
            },
            lang: {
              type: 'string',
              enum: ['ko', 'en'],
              default: 'ko',
            },
            queryDomain: {
              type: 'string',
              enum: ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'],
              description: '특정 도메인 집중 분석',
            },
            maxInsights: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              default: 5,
            },
            includeVisualizations: {
              type: 'boolean',
              default: true,
            },
            includeDetailedData: {
              type: 'boolean',
              default: false,
            },
          },
        },
        ReportResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            cached: { type: 'boolean' },
            report: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                overallScore: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    grade: { type: 'string', enum: ['S', 'A', 'B', 'C', 'D'] },
                  },
                },
                topInsights: { type: 'array' },
                domainAnalysis: { type: 'array' },
                timingAnalysis: { type: 'object' },
                visualizations: { type: 'object' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'DFM_1000' },
                message: { type: 'string' },
                details: { type: 'array' },
              },
            },
          },
        },
      },
    },
  });
}

// ===========================
// 헬퍼 함수들
// ===========================

type MatrixLayer = Record<string, unknown>;
type MatrixLayers = {
  layer1_elementCore: MatrixLayer;
  layer2_sibsinPlanet: MatrixLayer;
  layer3_sibsinHouse: MatrixLayer;
  layer4_timing: MatrixLayer;
  layer5_relationAspect: MatrixLayer;
  layer6_stageHouse: MatrixLayer;
  layer7_advanced: MatrixLayer;
  layer8_shinsalPlanet: MatrixLayer;
  layer9_asteroidHouse: MatrixLayer;
  layer10_extraPointElement: MatrixLayer;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function extractAllLayerCells(matrix: MatrixLayers): Record<string, Record<string, MatrixCell>> {
  return {
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
}

function extractLayerCells(
  layerData: Record<string, unknown>,
  layerNum: number
): Record<string, MatrixCell> {
  const cells: Record<string, MatrixCell> = {};

  for (const [cellKey, cellData] of Object.entries(layerData || {})) {
    if (isRecord(cellData)) {
      // 새 Computed 형식: { interaction: {...}, sajuBasis: "...", astroBasis: "..." }
      if (isRecord(cellData.interaction) && 'level' in cellData.interaction) {
        const sajuBasis = typeof cellData.sajuBasis === 'string'
          ? cellData.sajuBasis
          : getSajuBasis(cellKey, layerNum);
        const astroBasis = typeof cellData.astroBasis === 'string'
          ? cellData.astroBasis
          : getAstroBasis(cellKey, layerNum);
        cells[cellKey] = {
          interaction: cellData.interaction as MatrixCell["interaction"],
          sajuBasis,
          astroBasis,
        };
      }
      // 레거시 중첩 형식 (하위 호환성): { "목": { "earth": { level: ... } } }
      else {
        for (const [colKey, interaction] of Object.entries(cellData)) {
          if (isRecord(interaction) && 'level' in interaction) {
            const nestedCellKey = `${cellKey}_${colKey}`;
            cells[nestedCellKey] = {
              interaction: interaction as MatrixCell["interaction"],
              sajuBasis: getSajuBasis(cellKey, layerNum),
              astroBasis: getAstroBasis(colKey, layerNum),
            };
          }
        }
      }
    }
  }

  return cells;
}

function getSajuBasis(key: string, layer: number): string {
  const bases: Record<number, (k: string) => string> = {
    1: k => `오행 ${k}`,
    2: k => `십신 ${k}`,
    3: k => `십신 ${k}`,
    4: k => k === 'daeunTransition' ? '대운 전환기' : k === 'wolun' ? '월운' : k === 'ilun' ? '일운' : `세운 ${k}`,
    5: k => `지지관계 ${k}`,
    6: k => `십이운성 ${k}`,
    7: k => k.startsWith('yongsin') ? `용신 ${k.replace('yongsin_', '')}` : `격국 ${k}`,
    8: k => `신살 ${k}`,
    9: k => `소행성 ${k}`,
    10: k => `엑스트라포인트 ${k}`,
  };
  return bases[layer]?.(key) || key;
}

function getAstroBasis(key: string, layer: number): string {
  const bases: Record<number, (k: string) => string> = {
    1: k => `서양 ${k} 원소`,
    2: k => `행성 ${k}`,
    3: k => `H${k}`,
    4: k => k.includes('Retrograde') ? `${k.replace('Retrograde', '')} 역행` : k,
    5: k => `애스펙트 ${k}`,
    6: k => `H${k}`,
    7: k => `프로그레션 ${k}`,
    8: k => `행성 ${k}`,
    9: k => /^\d+$/.test(k) ? `H${k}` : `오행 ${k}`,
    10: k => `오행/십신 ${k}`,
  };
  return bases[layer]?.(key) || key;
}
