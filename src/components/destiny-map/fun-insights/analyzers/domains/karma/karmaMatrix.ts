// Karma Domain: Matrix Analysis
// Analyzes karmic patterns through soul patterns, node axis, and past life hints

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import { EXTRAPOINT_ELEMENT_MATRIX } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import type { AdvancedAnalysisRow, ShinsalKind, BranchRelation } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../../types';
import { KARMA_SHINSALS } from '../../shared';
import type { MatrixFusion } from '../../types';
import type { KarmaMatrixResult } from '../../types/specialized.types';

// Element mapping helper
const mapSajuElementToKo = (el: string): FiveElement => {
  const map: Record<string, FiveElement> = {
    'wood': '목', 'fire': '화', 'earth': '토', 'metal': '금', 'water': '수'
  };
  return map[el] || '목';
};

// Extended Saju data type for internal use
interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  advancedAnalysis?: {
    geokguk?: {
      name?: string;
      type?: string;
    };
    hyungChungHoeHap?: {
      hap?: unknown[];
      harmony?: unknown[];
      chung?: unknown[];
      conflicts?: unknown[];
    };
    sinsal?: {
      luckyList?: Array<{ name?: string } | string>;
      unluckyList?: Array<{ name?: string } | string>;
    };
  };
}

/**
 * Analyzes karmic patterns through matrix combinations
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Karma matrix analysis result or null
 */
export function getKarmaMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): KarmaMatrixResult | null {
  const _isKo = lang === 'ko';
  if (!saju && !astro) {return null;}

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 영혼 패턴 (L7 - 격국 × 드라코닉)
  let soulPattern: {
    geokguk: string;
    progression: string;
    fusion: MatrixFusion;
    soulTheme: { ko: string; en: string };
  } | null = null;
  const geokgukData = extSaju?.advancedAnalysis?.geokguk;
  const geokgukName = geokgukData?.name || geokgukData?.type || '';

  if (geokgukName) {
    const geokgukToPattern: Record<string, AdvancedAnalysisRow> = {
      '정관격': 'jeonggwan', '정관': 'jeonggwan',
      '편관격': 'pyeongwan', '편관': 'pyeongwan',
      '정인격': 'jeongin', '정인': 'jeongin',
      '편인격': 'pyeongin', '편인': 'pyeongin',
      '식신격': 'siksin', '식신': 'siksin',
      '상관격': 'sanggwan', '상관': 'sanggwan',
      '정재격': 'jeongjae', '정재': 'jeongjae',
      '편재격': 'pyeonjae', '편재': 'pyeonjae',
    };

    const pattern = geokgukToPattern[geokgukName];
    if (pattern) {
      const draconicInteraction = ADVANCED_ANALYSIS_MATRIX[pattern]?.draconic;
      if (draconicInteraction) {
        const soulThemes: Record<string, { ko: string; en: string }> = {
          'jeonggwan': { ko: '정의와 질서를 세우는 영혼', en: 'Soul establishing justice and order' },
          'pyeongwan': { ko: '도전을 통해 성장하는 전사 영혼', en: 'Warrior soul growing through challenges' },
          'jeongin': { ko: '지혜를 나누는 스승 영혼', en: 'Teacher soul sharing wisdom' },
          'pyeongin': { ko: '신비로운 통찰의 영혼', en: 'Soul of mystical insight' },
          'siksin': { ko: '풍요와 창조를 가져오는 영혼', en: 'Soul bringing abundance and creation' },
          'sanggwan': { ko: '혁신과 표현의 천재 영혼', en: 'Genius soul of innovation and expression' },
          'jeongjae': { ko: '안정과 풍요를 쌓는 영혼', en: 'Soul building stability and abundance' },
          'pyeonjae': { ko: '기회를 포착하는 사업가 영혼', en: 'Entrepreneur soul seizing opportunities' },
        };

        soulPattern = {
          geokguk: geokgukName,
          progression: 'draconic',
          fusion: {
            level: draconicInteraction.level,
            score: draconicInteraction.score,
            icon: draconicInteraction.icon,
            color: getInteractionColor(draconicInteraction.level),
            keyword: { ko: draconicInteraction.keyword, en: draconicInteraction.keywordEn },
            description: { ko: `${geokgukName} × 드라코닉`, en: `${geokgukName} × Draconic` },
          },
          soulTheme: soulThemes[pattern] || { ko: '고유한 영혼의 여정', en: 'Unique soul journey' },
        };
      }
    }
  }

  // 2. 노드 축 분석 (L10)
  let nodeAxis: {
    northNode: {
      element: FiveElement;
      fusion: MatrixFusion;
      direction: { ko: string; en: string };
      lesson: { ko: string; en: string };
    };
    southNode: {
      element: FiveElement;
      fusion: MatrixFusion;
      pastPattern: { ko: string; en: string };
      release: { ko: string; en: string };
    };
  } | null = null;
  const northNodeInteraction = EXTRAPOINT_ELEMENT_MATRIX['NorthNode']?.[sajuEl];
  const southNodeInteraction = EXTRAPOINT_ELEMENT_MATRIX['SouthNode']?.[sajuEl];

  if (northNodeInteraction && southNodeInteraction) {
    const nodeDirections: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '새로운 시작과 성장을 향해', en: 'Towards new beginnings and growth' },
      '화': { ko: '열정과 자기 표현을 향해', en: 'Towards passion and self-expression' },
      '토': { ko: '안정과 책임감을 향해', en: 'Towards stability and responsibility' },
      '금': { ko: '결단력과 정리를 향해', en: 'Towards decisiveness and organization' },
      '수': { ko: '지혜와 깊은 이해를 향해', en: 'Towards wisdom and deep understanding' },
    };

    const nodeLessons: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '도전하고 성장하는 법을 배워요', en: 'Learn to challenge and grow' },
      '화': { ko: '자신을 드러내고 빛나는 법을 배워요', en: 'Learn to shine and express yourself' },
      '토': { ko: '기반을 다지고 책임지는 법을 배워요', en: 'Learn to build foundation and take responsibility' },
      '금': { ko: '선택하고 결단하는 법을 배워요', en: 'Learn to choose and decide' },
      '수': { ko: '흐름을 따르고 지혜를 얻는 법을 배워요', en: 'Learn to flow and gain wisdom' },
    };

    const pastPatterns: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '과거에 너무 많이 시작만 했어요', en: 'In the past, you only started too many things' },
      '화': { ko: '과거에 열정에만 의존했어요', en: 'In the past, you relied only on passion' },
      '토': { ko: '과거에 안전지대에만 머물렀어요', en: 'In the past, you stayed only in comfort zones' },
      '금': { ko: '과거에 너무 냉철했어요', en: 'In the past, you were too cold' },
      '수': { ko: '과거에 생각만 하고 행동하지 않았어요', en: 'In the past, you only thought without action' },
    };

    nodeAxis = {
      northNode: {
        element: sajuEl,
        fusion: {
          level: northNodeInteraction.level,
          score: northNodeInteraction.score,
          icon: northNodeInteraction.icon,
          color: getInteractionColor(northNodeInteraction.level),
          keyword: { ko: northNodeInteraction.keyword, en: northNodeInteraction.keywordEn },
          description: { ko: `노스노드 × ${sajuEl}`, en: `North Node × ${sajuEl}` },
        },
        direction: nodeDirections[sajuEl],
        lesson: nodeLessons[sajuEl],
      },
      southNode: {
        element: sajuEl,
        fusion: {
          level: southNodeInteraction.level,
          score: southNodeInteraction.score,
          icon: southNodeInteraction.icon,
          color: getInteractionColor(southNodeInteraction.level),
          keyword: { ko: southNodeInteraction.keyword, en: southNodeInteraction.keywordEn },
          description: { ko: `사우스노드 × ${sajuEl}`, en: `South Node × ${sajuEl}` },
        },
        pastPattern: pastPatterns[sajuEl],
        release: { ko: '과거의 패턴을 인식하고 내려놓으세요', en: 'Recognize and release past patterns' },
      },
    };
  }

  // 3. 카르마적 관계 패턴 (L5)
  const karmicRelations: Array<{
    relation: string;
    aspect: string;
    fusion: MatrixFusion;
    meaning: { ko: string; en: string };
  }> = [];
  const hyungChungHoeHap = extSaju?.advancedAnalysis?.hyungChungHoeHap;

  const relationMeanings: Record<string, { ko: string; en: string }> = {
    'samhap': { ko: '전생부터 이어진 깊은 인연', en: 'Deep connection from past life' },
    'yukhap': { ko: '자연스럽게 맺어진 인연', en: 'Naturally formed connection' },
    'chung': { ko: '갈등을 통해 배우는 카르마', en: 'Karma learned through conflict' },
    'hyeong': { ko: '시련을 통해 성장하는 관계', en: 'Relationship growing through trials' },
  };

  const karmicRelationTypes: BranchRelation[] = [];
  if (hyungChungHoeHap?.hap?.length) {karmicRelationTypes.push('samhap');}
  if (hyungChungHoeHap?.harmony?.length) {karmicRelationTypes.push('yukhap');}
  if (hyungChungHoeHap?.chung?.length || hyungChungHoeHap?.conflicts?.length) {karmicRelationTypes.push('chung');}

  for (const rel of karmicRelationTypes.slice(0, 3)) {
    const conjunctionInteraction = RELATION_ASPECT_MATRIX[rel]?.conjunction;
    if (conjunctionInteraction) {
      karmicRelations.push({
        relation: rel,
        aspect: 'conjunction',
        fusion: {
          level: conjunctionInteraction.level,
          score: conjunctionInteraction.score,
          icon: conjunctionInteraction.icon,
          color: getInteractionColor(conjunctionInteraction.level),
          keyword: { ko: conjunctionInteraction.keyword, en: conjunctionInteraction.keywordEn },
          description: { ko: `${rel} × 합`, en: `${rel} × Conjunction` },
        },
        meaning: relationMeanings[rel] || { ko: '인연의 패턴', en: 'Connection pattern' },
      });
    }
  }

  // 4. 전생 힌트 (L8)
  const pastLifeHints: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    hint: { ko: string; en: string };
  }> = [];
  const allShinsals = [
    ...(extSaju?.advancedAnalysis?.sinsal?.luckyList || []),
    ...(extSaju?.advancedAnalysis?.sinsal?.unluckyList || []),
  ];

  const userKarmaShinsals: ShinsalKind[] = [];
  for (const s of allShinsals) {
    const name = typeof s === 'string' ? s : (s as { name?: string })?.name;
    if (name && KARMA_SHINSALS.includes(name as ShinsalKind)) {
      userKarmaShinsals.push(name as ShinsalKind);
    }
  }

  const karmaHintMessages: Record<string, { ko: string; en: string }> = {
    '원진': { ko: '전생에서 해결하지 못한 원한이 있어요', en: 'There is unresolved resentment from past life' },
    '역마': { ko: '전생에서 여행자/탐험가였어요', en: 'You were a traveler/explorer in past life' },
    '화개': { ko: '전생에서 영적 수행자였어요', en: 'You were a spiritual practitioner in past life' },
    '천라지망': { ko: '전생에서 큰 시련을 겪었어요', en: 'You experienced great trials in past life' },
    '공망': { ko: '전생에서 무언가를 잃었어요', en: 'You lost something in past life' },
  };

  for (const shinsal of userKarmaShinsals.slice(0, 3)) {
    const plutoInteraction = SHINSAL_PLANET_MATRIX[shinsal]?.Pluto;
    if (plutoInteraction) {
      pastLifeHints.push({
        shinsal,
        planet: 'Pluto',
        fusion: {
          level: plutoInteraction.level,
          score: plutoInteraction.score,
          icon: plutoInteraction.icon,
          color: getInteractionColor(plutoInteraction.level),
          keyword: { ko: plutoInteraction.keyword, en: plutoInteraction.keywordEn },
          description: { ko: `${shinsal} × 명왕성`, en: `${shinsal} × Pluto` },
        },
        hint: karmaHintMessages[shinsal] || { ko: '전생의 에너지가 남아있어요', en: 'Energy from past life remains' },
      });
    }
  }

  // 5. 카르마 점수 계산
  let karmaScore = 50;
  if (soulPattern) {karmaScore += soulPattern.fusion?.score ? soulPattern.fusion.score * 2 : 0;}
  if (nodeAxis) {karmaScore += (nodeAxis.northNode?.fusion?.score || 0) + (nodeAxis.southNode?.fusion?.score || 0);}
  karmaScore += karmicRelations.length * 5;
  karmaScore += pastLifeHints.length * 5;
  karmaScore = Math.min(100, Math.max(30, karmaScore));

  // Generate karma message based on score
  const karmaMessage = {
    ko: karmaScore >= 80 ? '카르마 에너지가 매우 강력합니다' :
        karmaScore >= 60 ? '카르마 패턴이 분명히 나타납니다' :
        '카르마 에너지가 잠재되어 있습니다',
    en: karmaScore >= 80 ? 'Very strong karmic energy' :
        karmaScore >= 60 ? 'Clear karmic patterns present' :
        'Latent karmic energy'
  };

  return {
    karmaScore: Math.round(karmaScore),
    soulPattern,
    nodeAxis,
    karmicRelations,
    pastLifeHints,
    karmaMessage,
  };
}
