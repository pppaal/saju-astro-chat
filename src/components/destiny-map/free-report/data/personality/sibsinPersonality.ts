/**
 * 십신 카테고리별 성격 특성.
 * personalityAnalyzer.ts 인라인 표를 데이터 레이어로 분리.
 */

import type { BilingualText, SibsinCategory } from '../../types/core';

export interface SibsinPersonalityEntry {
  description: BilingualText;
  trait: BilingualText;
}

export const SIBSIN_PERSONALITY: Record<SibsinCategory, SibsinPersonalityEntry> = {
  비겁: {
    description: {
      ko: '자기 주장이 강하고 독립적이에요. 경쟁심이 있고 자존심이 높아요.',
      en: 'Strong self-assertion and independent. Competitive with high self-esteem.',
    },
    trait: { ko: '독립성', en: 'Independence' },
  },
  식상: {
    description: {
      ko: '표현력이 뛰어나고 창의적이에요. 말과 글에 재능이 있어요.',
      en: 'Excellent expression and creativity. Talented in speaking and writing.',
    },
    trait: { ko: '창의성', en: 'Creativity' },
  },
  재성: {
    description: {
      ko: '현실적이고 실용적이에요. 재물과 관계에 민감해요.',
      en: 'Realistic and practical. Sensitive to wealth and relationships.',
    },
    trait: { ko: '현실감각', en: 'Practicality' },
  },
  관성: {
    description: {
      ko: '책임감이 강하고 규율을 중시해요. 사회적 성취를 추구해요.',
      en: 'Strong responsibility and values discipline. Pursues social achievement.',
    },
    trait: { ko: '책임감', en: 'Responsibility' },
  },
  인성: {
    description: {
      ko: '학습 능력이 뛰어나고 사려 깊어요. 보호본능이 강해요.',
      en: 'Excellent learning ability and thoughtful. Strong protective instincts.',
    },
    trait: { ko: '사려깊음', en: 'Thoughtfulness' },
  },
};
