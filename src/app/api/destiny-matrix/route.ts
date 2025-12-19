// src/app/api/destiny-matrix/route.ts
// Destiny Fusion Matrix™ API Endpoint
// © 2024 All Rights Reserved. Proprietary Technology.

import { NextRequest, NextResponse } from 'next/server';
import { calculateDestinyMatrix } from '@/lib/destiny-matrix';
import type { MatrixCalculationInput } from '@/lib/destiny-matrix';

/**
 * GET - Returns only summary metadata (NO raw matrix data)
 * Protected: Does not expose proprietary matrix cell data
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'summary';

  try {
    // Only return summary - NEVER expose raw data
    if (format === 'summary' || format === 'full') {
      return NextResponse.json({
        name: 'Destiny Fusion Matrix™',
        version: '2.0',
        copyright: '© 2024 All Rights Reserved',
        layers: [
          { layer: 1, name: 'Element Core Grid', nameKo: '기운핵심격자', cells: 20 },
          { layer: 2, name: 'Sibsin-Planet Matrix', nameKo: '십신-행성 매트릭스', cells: 100 },
          { layer: 3, name: 'Sibsin-House Matrix', nameKo: '십신-하우스 매트릭스', cells: 120 },
          { layer: 4, name: 'Timing Overlay Matrix', nameKo: '타이밍 오버레이 매트릭스', cells: 108 },
          { layer: 5, name: 'Relation-Aspect Matrix', nameKo: '형충회합-애스펙트 매트릭스', cells: 72 },
          { layer: 6, name: 'TwelveStage-House Matrix', nameKo: '십이운성-하우스 매트릭스', cells: 144 },
          { layer: 7, name: 'Advanced Analysis Matrix', nameKo: '고급분석 매트릭스', cells: 144 },
          { layer: 8, name: 'Shinsal-Planet Matrix', nameKo: '신살-행성 매트릭스', cells: 340 },
          { layer: 9, name: 'Asteroid-House Matrix', nameKo: '소행성-하우스 매트릭스', cells: 68 },
          { layer: 10, name: 'ExtraPoint-Element Matrix', nameKo: '엑스트라포인트 매트릭스', cells: 90 },
        ],
        totalCells: 1206,
        interactionLevels: [
          { level: 'extreme', meaning: '극강 시너지', scoreRange: '9-10' },
          { level: 'amplify', meaning: '증폭/강화', scoreRange: '7-8' },
          { level: 'balance', meaning: '균형/안정', scoreRange: '5-6' },
          { level: 'clash', meaning: '충돌/주의', scoreRange: '3-4' },
          { level: 'conflict', meaning: '갈등/위험', scoreRange: '1-2' },
        ],
        // NO raw data exposed - only metadata
        notice: 'Raw matrix data is proprietary and not publicly accessible.',
      });
    }

    return NextResponse.json({
      error: 'Invalid format parameter',
      validFormats: ['summary'],
    }, { status: 400 });

  } catch (error) {
    console.error('Destiny Matrix GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve matrix info' },
      { status: 500 }
    );
  }
}

/**
 * POST - Process user data and return ONLY final results
 * Protected: Calculations happen server-side, only results are returned
 */
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

      // Shinsal data (Layer 8)
      shinsalList = [],

      // Astrology data
      dominantWesternElement,
      planetHouses = {},
      planetSigns = {},
      aspects = [],
      activeTransits = [],

      // Asteroid data (Layer 9)
      asteroidHouses = {},

      // Extra Point data (Layer 10)
      extraPointSigns = {},

      // Options
      lang = 'ko',
    } = body as Partial<MatrixCalculationInput> & { lang?: 'ko' | 'en' };

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

    // Calculate matrix (server-side only)
    const matrix = calculateDestinyMatrix(input);

    // Count matched cells per layer
    const cellCounts = {
      layer1: Object.keys(matrix.layer1_elementCore).length,
      layer2: Object.keys(matrix.layer2_sibsinPlanet).length,
      layer3: Object.keys(matrix.layer3_sibsinHouse).length,
      layer4: Object.keys(matrix.layer4_timing).length,
      layer5: Object.keys(matrix.layer5_relationAspect).length,
      layer6: Object.keys(matrix.layer6_stageHouse).length,
      layer7: Object.keys(matrix.layer7_advanced).length,
      layer8: Object.keys(matrix.layer8_shinsalPlanet).length,
      layer9: Object.keys(matrix.layer9_asteroidHouse).length,
      layer10: Object.keys(matrix.layer10_extraPointElement).length,
    };
    const totalCells = Object.values(cellCounts).reduce((a, b) => a + b, 0);

    // Return ONLY processed results - NOT raw matrix data
    return NextResponse.json({
      success: true,
      summary: {
        totalScore: matrix.summary.totalScore,
        layersProcessed: Object.keys(cellCounts).filter(k => cellCounts[k as keyof typeof cellCounts] > 0).length,
        cellsMatched: totalCells,
        strengthCount: matrix.summary.strengthPoints?.length || 0,
        cautionCount: matrix.summary.cautionPoints?.length || 0,
      },
      // Return only high-level highlights, not raw cell data
      highlights: {
        strengths: matrix.summary.strengthPoints?.slice(0, 3).map(h => ({
          layer: h.layer,
          keyword: h.cell.interaction.keyword,
          score: h.cell.interaction.score,
        })),
        cautions: matrix.summary.cautionPoints?.slice(0, 3).map(h => ({
          layer: h.layer,
          keyword: h.cell.interaction.keyword,
          score: h.cell.interaction.score,
        })),
      },
      synergies: matrix.summary.topSynergies?.slice(0, 3),
      // Copyright notice
      copyright: '© 2024 Destiny Fusion Matrix™. All Rights Reserved.',
    });

  } catch (error) {
    console.error('Destiny Matrix POST error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate matrix' },
      { status: 500 }
    );
  }
}
