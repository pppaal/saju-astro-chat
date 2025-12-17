// src/app/api/destiny-matrix/route.ts
// Destiny Fusion Matrix™ API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDestinyMatrix,
  getElementCoreInteraction,
  getSibsinPlanetInteraction,
  getSibsinHouseInteraction,
  getTimingInteraction,
  getRelationAspectInteraction,
  getStageHouseInteraction,
  getAdvancedAnalysisInteraction,
  getShinsalPlanetInteraction,
  getAsteroidHouseInteraction,
  getExtraPointElementInteraction,
  ELEMENT_CORE_GRID,
  SIBSIN_PLANET_MATRIX,
  SIBSIN_HOUSE_MATRIX,
  TIMING_OVERLAY_MATRIX,
  RELATION_ASPECT_MATRIX,
  TWELVE_STAGE_HOUSE_MATRIX,
  ADVANCED_ANALYSIS_MATRIX,
  SHINSAL_PLANET_MATRIX,
  SHINSAL_INFO,
  ASTEROID_HOUSE_MATRIX,
  ASTEROID_ELEMENT_MATRIX,
  ASTEROID_INFO,
  EXTRAPOINT_ELEMENT_MATRIX,
  EXTRAPOINT_SIBSIN_MATRIX,
  EXTRAPOINT_INFO,
  SIGN_TO_ELEMENT,
  PLANET_KEYWORDS,
  SIBSIN_KEYWORDS,
  HOUSE_KEYWORDS,
  TRANSIT_CYCLE_INFO,
  LUCK_CYCLE_INFO,
  RETROGRADE_SCHEDULE,
  RETROGRADE_INTERPRETATION,
  BRANCH_RELATION_INFO,
  ASPECT_INFO,
  TWELVE_STAGE_INFO,
  GEOKGUK_INFO,
  PROGRESSION_INFO,
  HARMONICS_SAJU_MAPPING,
} from '@/lib/destiny-matrix';

import type { MatrixCalculationInput } from '@/lib/destiny-matrix';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layer = searchParams.get('layer');
  const format = searchParams.get('format') || 'full';

  try {
    // Return specific layer data
    if (layer) {
      const layerNum = parseInt(layer, 10);
      switch (layerNum) {
        case 1:
          return NextResponse.json({
            layer: 1,
            name: 'Element Core Grid',
            nameKo: '기운핵심격자',
            description: '오행 ↔ 4원소 교차 매트릭스',
            data: ELEMENT_CORE_GRID,
            meta: { signToElement: SIGN_TO_ELEMENT },
          });
        case 2:
          return NextResponse.json({
            layer: 2,
            name: 'Sibsin-Planet Matrix',
            nameKo: '십신-행성 매트릭스',
            description: '십신 ↔ 행성 역할 교차 매트릭스',
            data: SIBSIN_PLANET_MATRIX,
            meta: {
              planetKeywords: PLANET_KEYWORDS,
              sibsinKeywords: SIBSIN_KEYWORDS,
            },
          });
        case 3:
          return NextResponse.json({
            layer: 3,
            name: 'Sibsin-House Matrix',
            nameKo: '십신-하우스 매트릭스',
            description: '십신 ↔ 12하우스 생활영역 교차 매트릭스',
            data: SIBSIN_HOUSE_MATRIX,
            meta: {
              houseKeywords: HOUSE_KEYWORDS,
              sibsinKeywords: SIBSIN_KEYWORDS,
            },
          });
        case 4:
          return NextResponse.json({
            layer: 4,
            name: 'Timing Overlay Matrix (Extended)',
            nameKo: '타이밍 오버레이 매트릭스 (확장)',
            description: '대운/세운/월운/일운 ↔ 트랜짓 주기 + 역행 교차 매트릭스',
            data: TIMING_OVERLAY_MATRIX,
            meta: {
              transitCycleInfo: TRANSIT_CYCLE_INFO,
              luckCycleInfo: LUCK_CYCLE_INFO,
              retrogradeSchedule: RETROGRADE_SCHEDULE,
              retrogradeInterpretation: RETROGRADE_INTERPRETATION,
            },
          });
        case 5:
          return NextResponse.json({
            layer: 5,
            name: 'Relation-Aspect Matrix',
            nameKo: '형충회합-애스펙트 매트릭스',
            description: '지지 관계 ↔ 행성 애스펙트 교차 매트릭스',
            data: RELATION_ASPECT_MATRIX,
            meta: {
              branchRelationInfo: BRANCH_RELATION_INFO,
              aspectInfo: ASPECT_INFO,
            },
          });
        case 6:
          return NextResponse.json({
            layer: 6,
            name: 'TwelveStage-House Matrix',
            nameKo: '십이운성-하우스 매트릭스',
            description: '십이운성 ↔ 12하우스 생명력 교차 매트릭스',
            data: TWELVE_STAGE_HOUSE_MATRIX,
            meta: {
              twelveStageInfo: TWELVE_STAGE_INFO,
              houseKeywords: HOUSE_KEYWORDS,
            },
          });
        case 7:
          return NextResponse.json({
            layer: 7,
            name: 'Advanced Analysis Matrix',
            nameKo: '고급분석 매트릭스',
            description: '격국/용신 ↔ Progressions/Returns 교차 매트릭스',
            data: ADVANCED_ANALYSIS_MATRIX,
            meta: {
              geokgukInfo: GEOKGUK_INFO,
              progressionInfo: PROGRESSION_INFO,
              harmonicsSajuMapping: HARMONICS_SAJU_MAPPING,
            },
          });
        case 8:
          return NextResponse.json({
            layer: 8,
            name: 'Shinsal-Planet Matrix',
            nameKo: '신살-행성 매트릭스',
            description: '신살(神殺) ↔ 행성 에너지 교차 매트릭스',
            data: SHINSAL_PLANET_MATRIX,
            meta: {
              shinsalInfo: SHINSAL_INFO,
              planetKeywords: PLANET_KEYWORDS,
            },
          });
        case 9:
          return NextResponse.json({
            layer: 9,
            name: 'Asteroid-House Matrix',
            nameKo: '소행성-하우스 매트릭스',
            description: '4대 소행성 ↔ 12하우스/오행 교차 매트릭스',
            data: {
              asteroidHouse: ASTEROID_HOUSE_MATRIX,
              asteroidElement: ASTEROID_ELEMENT_MATRIX,
            },
            meta: {
              asteroidInfo: ASTEROID_INFO,
              houseKeywords: HOUSE_KEYWORDS,
            },
          });
        case 10:
          return NextResponse.json({
            layer: 10,
            name: 'ExtraPoint-Element Matrix',
            nameKo: '엑스트라포인트-오행/십신 매트릭스',
            description: 'Chiron/Lilith/노드 등 ↔ 오행/십신 교차 매트릭스',
            data: {
              extraPointElement: EXTRAPOINT_ELEMENT_MATRIX,
              extraPointSibsin: EXTRAPOINT_SIBSIN_MATRIX,
            },
            meta: {
              extraPointInfo: EXTRAPOINT_INFO,
              sibsinKeywords: SIBSIN_KEYWORDS,
            },
          });
        default:
          return NextResponse.json(
            { error: 'Invalid layer number. Use 1-10.' },
            { status: 400 }
          );
      }
    }

    // Return all layers summary
    if (format === 'summary') {
      return NextResponse.json({
        layers: [
          { layer: 1, name: 'Element Core Grid', nameKo: '기운핵심격자', rows: 5, cols: 4, cells: 20 },
          { layer: 2, name: 'Sibsin-Planet Matrix', nameKo: '십신-행성 매트릭스', rows: 10, cols: 10, cells: 100 },
          { layer: 3, name: 'Sibsin-House Matrix', nameKo: '십신-하우스 매트릭스', rows: 10, cols: 12, cells: 120 },
          { layer: 4, name: 'Timing Overlay Matrix', nameKo: '타이밍 오버레이 매트릭스 (확장)', rows: 9, cols: 12, cells: 108, extra: '월운/일운 + 역행 5종' },
          { layer: 5, name: 'Relation-Aspect Matrix', nameKo: '형충회합-애스펙트 매트릭스', rows: 8, cols: 9, cells: 72 },
          { layer: 6, name: 'TwelveStage-House Matrix', nameKo: '십이운성-하우스 매트릭스', rows: 12, cols: 12, cells: 144 },
          { layer: 7, name: 'Advanced Analysis Matrix', nameKo: '고급분석 매트릭스 (확장)', rows: 24, cols: 6, cells: 144, extra: '격국 19종 + 용신 5종' },
          { layer: 8, name: 'Shinsal-Planet Matrix', nameKo: '신살-행성 매트릭스', rows: 34, cols: 10, cells: 340 },
          { layer: 9, name: 'Asteroid-House Matrix', nameKo: '소행성-하우스 매트릭스', rows: 4, cols: 12, cells: 48, extra: '+ 오행 20셀' },
          { layer: 10, name: 'ExtraPoint-Element Matrix', nameKo: '엑스트라포인트 매트릭스', rows: 6, cols: 5, cells: 30, extra: '+ 십신 60셀' },
        ],
        totalCells: 1186,
        interactionLevels: [
          { level: 'extreme', colorCode: 'purple', scoreRange: '9-10', icon: '💥', meaning: '극강 시너지' },
          { level: 'amplify', colorCode: 'green', scoreRange: '7-8', icon: '🚀', meaning: '증폭/강화' },
          { level: 'balance', colorCode: 'blue', scoreRange: '5-6', icon: '⚖️', meaning: '균형/안정' },
          { level: 'clash', colorCode: 'yellow', scoreRange: '3-4', icon: '⚡', meaning: '충돌/주의' },
          { level: 'conflict', colorCode: 'red', scoreRange: '1-2', icon: '❌', meaning: '갈등/위험' },
        ],
      });
    }

    // Return all raw data
    return NextResponse.json({
      layer1_elementCore: ELEMENT_CORE_GRID,
      layer2_sibsinPlanet: SIBSIN_PLANET_MATRIX,
      layer3_sibsinHouse: SIBSIN_HOUSE_MATRIX,
      layer4_timing: TIMING_OVERLAY_MATRIX,
      layer5_relationAspect: RELATION_ASPECT_MATRIX,
      layer6_stageHouse: TWELVE_STAGE_HOUSE_MATRIX,
      layer7_advanced: ADVANCED_ANALYSIS_MATRIX,
      layer8_shinsalPlanet: SHINSAL_PLANET_MATRIX,
      layer9_asteroidHouse: ASTEROID_HOUSE_MATRIX,
      layer10_extraPointElement: EXTRAPOINT_ELEMENT_MATRIX,
    });

  } catch (error) {
    console.error('Destiny Matrix GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve matrix data' },
      { status: 500 }
    );
  }
}

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

    // Calculate matrix
    const matrix = calculateDestinyMatrix(input);

    return NextResponse.json({
      success: true,
      matrix,
      input: {
        dayMasterElement,
        geokguk,
        yongsin,
      },
    });

  } catch (error) {
    console.error('Destiny Matrix POST error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate matrix' },
      { status: 500 }
    );
  }
}
