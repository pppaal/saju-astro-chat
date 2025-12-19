// src/app/api/destiny-matrix/ai-report/route.ts
// Destiny Fusion Matrix™ - AI Premium Report API (유료)
// 크레딧 차감 후 AI 리포트 생성 + PDF 다운로드

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import {
  calculateDestinyMatrix,
  FusionReportGenerator,
  validateReportRequest,
  DestinyMatrixError,
  ErrorCodes,
  wrapError,
} from '@/lib/destiny-matrix';
import type { MatrixCalculationInput, InsightDomain } from '@/lib/destiny-matrix';
import {
  generateAIPremiumReport,
  generatePremiumPDF,
} from '@/lib/destiny-matrix/ai-report';
import {
  canUseFeature,
  consumeCredits,
  getCreditBalance,
} from '@/lib/credits/creditService';

// ===========================
// 크레딧 비용 설정
// ===========================

const AI_REPORT_CREDIT_COST = 3; // AI 리포트 1회 = 3크레딧

// ===========================
// POST - AI 리포트 생성 (JSON 응답)
// ===========================

export async function POST(req: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. 기능 권한 확인 (pdfReport 기능)
    const canUsePdf = await canUseFeature(userId, 'pdfReport');
    if (!canUsePdf) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FEATURE_LOCKED',
            message: 'AI 리포트는 Pro 이상 플랜에서 사용 가능합니다.',
            upgrade: true,
          },
        },
        { status: 403 }
      );
    }

    // 3. 크레딧 잔액 확인
    const balance = await getCreditBalance(userId);
    if (balance.remainingCredits < AI_REPORT_CREDIT_COST) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `AI 리포트 생성에 ${AI_REPORT_CREDIT_COST} 크레딧이 필요합니다. (현재: ${balance.remainingCredits})`,
            required: AI_REPORT_CREDIT_COST,
            current: balance.remainingCredits,
          },
        },
        { status: 402 }
      );
    }

    // 4. 요청 파싱 및 검증
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
        message: 'Invalid JSON in request body',
      });
    }

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
    const { queryDomain, maxInsights, ...rest } = validatedInput;
    const matrixInput = rest as unknown as MatrixCalculationInput;

    // 5. 추가 옵션 추출
    const requestBody = body as Record<string, unknown>;
    const name = requestBody.name as string | undefined;
    const birthDate = requestBody.birthDate as string | undefined;
    const format = requestBody.format as 'json' | 'pdf' | undefined;
    const detailLevel = requestBody.detailLevel as 'standard' | 'detailed' | 'comprehensive' | undefined;

    // 6. 기본 매트릭스 계산
    const matrix = calculateDestinyMatrix(matrixInput);
    const layerResults = extractAllLayerCells(matrix as any);

    // 7. 기본 리포트 생성
    const generator = new FusionReportGenerator({
      lang: matrixInput.lang || 'ko',
      maxTopInsights: maxInsights ?? 5,
      includeVisualizations: true,
      includeDetailedData: false,
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

    const baseReport = generator.generateReport(
      matrixInput,
      layerResults,
      queryDomain as InsightDomain | undefined
    );

    // 8. AI 프리미엄 리포트 생성
    const aiReport = await generateAIPremiumReport(matrixInput, baseReport, {
      name,
      birthDate,
      lang: matrixInput.lang || 'ko',
      focusDomain: queryDomain as InsightDomain | undefined,
      detailLevel: detailLevel || 'detailed',
    });

    // 9. 크레딧 차감 (성공한 경우에만)
    const consumeResult = await consumeCredits(userId, 'reading', AI_REPORT_CREDIT_COST);
    if (!consumeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CREDIT_DEDUCTION_FAILED',
            message: '크레딧 차감에 실패했습니다.',
          },
        },
        { status: 500 }
      );
    }

    // 10. PDF 형식 요청인 경우
    if (format === 'pdf') {
      const pdfBytes = await generatePremiumPDF(aiReport);

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="destiny-matrix-report-${aiReport.id}.pdf"`,
          'Content-Length': pdfBytes.length.toString(),
        },
      });
    }

    // 11. JSON 응답
    return NextResponse.json({
      success: true,
      creditsUsed: AI_REPORT_CREDIT_COST,
      remainingCredits: balance.remainingCredits - AI_REPORT_CREDIT_COST,
      report: aiReport,
    });

  } catch (error) {
    const wrappedError = wrapError(error);

    console.error('AI Report Generation Error:', {
      code: wrappedError.code,
      message: wrappedError.message,
    });

    return NextResponse.json(wrappedError.toJSON(), {
      status: wrappedError.getHttpStatus(),
    });
  }
}

// ===========================
// GET - PDF 다운로드 (리포트 ID로)
// ===========================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  // API 문서 반환
  if (format !== 'docs') {
    return NextResponse.json({
      success: false,
      error: { message: 'Use POST to generate reports. Add ?format=docs for API documentation.' },
    }, { status: 400 });
  }

  return NextResponse.json({
    openapi: '3.0.0',
    info: {
      title: 'Destiny Fusion Matrix™ AI Premium Report API',
      version: '1.0.0',
      description: 'AI 기반 프리미엄 운명 분석 리포트 생성 (유료)',
    },
    paths: {
      '/api/destiny-matrix/ai-report': {
        post: {
          summary: 'AI 프리미엄 리포트 생성',
          description: '크레딧을 사용하여 AI 기반 상세 리포트를 생성합니다.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AIReportRequest' },
              },
            },
          },
          responses: {
            '200': { description: '성공 - JSON 또는 PDF 리포트' },
            '401': { description: '인증 필요' },
            '402': { description: '크레딧 부족' },
            '403': { description: '기능 잠금 (플랜 업그레이드 필요)' },
          },
        },
      },
    },
    components: {
      schemas: {
        AIReportRequest: {
          type: 'object',
          required: ['dayMasterElement'],
          properties: {
            dayMasterElement: { type: 'string', enum: ['목', '화', '토', '금', '수'] },
            name: { type: 'string', description: '사용자 이름 (선택)' },
            birthDate: { type: 'string', description: '생년월일 (선택)' },
            format: { type: 'string', enum: ['json', 'pdf'], default: 'json' },
            detailLevel: { type: 'string', enum: ['standard', 'detailed', 'comprehensive'], default: 'detailed' },
            queryDomain: { type: 'string', enum: ['personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'] },
            lang: { type: 'string', enum: ['ko', 'en'], default: 'ko' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
    pricing: {
      creditCost: AI_REPORT_CREDIT_COST,
      description: `AI 리포트 1회 생성 = ${AI_REPORT_CREDIT_COST} 크레딧`,
      availablePlans: ['pro', 'premium'],
    },
  });
}

// ===========================
// 헬퍼 함수
// ===========================

function extractAllLayerCells(matrix: {
  layer1_elementCore: Record<string, any>;
  layer2_sibsinPlanet: Record<string, any>;
  layer3_sibsinHouse: Record<string, any>;
  layer4_timing: Record<string, any>;
  layer5_relationAspect: Record<string, any>;
  layer6_stageHouse: Record<string, any>;
  layer7_advanced: Record<string, any>;
  layer8_shinsalPlanet: Record<string, any>;
  layer9_asteroidHouse: Record<string, any>;
  layer10_extraPointElement: Record<string, any>;
}): Record<string, Record<string, any>> {
  return {
    layer1: extractLayerCells(matrix.layer1_elementCore),
    layer2: extractLayerCells(matrix.layer2_sibsinPlanet),
    layer3: extractLayerCells(matrix.layer3_sibsinHouse),
    layer4: extractLayerCells(matrix.layer4_timing),
    layer5: extractLayerCells(matrix.layer5_relationAspect),
    layer6: extractLayerCells(matrix.layer6_stageHouse),
    layer7: extractLayerCells(matrix.layer7_advanced),
    layer8: extractLayerCells(matrix.layer8_shinsalPlanet),
    layer9: extractLayerCells(matrix.layer9_asteroidHouse),
    layer10: extractLayerCells(matrix.layer10_extraPointElement),
  };
}

function extractLayerCells(layerData: Record<string, any>): Record<string, any> {
  const cells: Record<string, any> = {};

  for (const [cellKey, cellData] of Object.entries(layerData || {})) {
    if (typeof cellData === 'object' && cellData !== null) {
      // 새 Computed 형식: { interaction: {...}, sajuBasis: "...", astroBasis: "..." }
      if ('interaction' in cellData && cellData.interaction && 'level' in cellData.interaction) {
        cells[cellKey] = cellData;
      }
      // 레거시 중첩 형식 (하위 호환성)
      else {
        for (const [colKey, interaction] of Object.entries(cellData)) {
          if (interaction && typeof interaction === 'object' && 'level' in interaction) {
            const nestedCellKey = `${cellKey}_${colKey}`;
            cells[nestedCellKey] = { interaction };
          }
        }
      }
    }
  }

  return cells;
}
