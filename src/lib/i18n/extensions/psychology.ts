// src/lib/i18n/extensions/psychology.ts
// Psychology 통합 기능 번역

import type { LocaleExtension } from '../types'

export const psychologyExtension: LocaleExtension = {
  en: {
    psychology: {
      title: 'Psychological Analysis',
      subtitle: 'Understand your mind through validated frameworks',
      mbti: {
        title: 'MBTI Personality',
        description: '16 personality types based on cognitive functions',
        takeTest: 'Take MBTI Test',
        yourType: 'Your Type',
      },
      big5: {
        title: 'Big Five Traits',
        description: 'Scientific personality model',
        openness: 'Openness',
        conscientiousness: 'Conscientiousness',
        extraversion: 'Extraversion',
        agreeableness: 'Agreeableness',
        neuroticism: 'Neuroticism',
        takeTest: 'Take Big 5 Test',
      },
      integration: {
        title: 'Integrated Analysis',
        sajuConnection: 'Your Saju {element} element correlates with',
        astrologyConnection: 'Your {planet} placement suggests',
        recommendation: 'Based on your psychological profile',
      },
    },
  },
  ko: {
    psychology: {
      title: '심리 분석',
      subtitle: '검증된 프레임워크로 당신의 마음을 이해하세요',
      mbti: {
        title: 'MBTI 성격유형',
        description: '인지 기능 기반 16가지 성격 유형',
        takeTest: 'MBTI 테스트 하기',
        yourType: '당신의 유형',
      },
      big5: {
        title: 'Big Five 성격특성',
        description: '과학적 성격 모델',
        openness: '개방성',
        conscientiousness: '성실성',
        extraversion: '외향성',
        agreeableness: '친화성',
        neuroticism: '신경성',
        takeTest: 'Big 5 테스트 하기',
      },
      integration: {
        title: '통합 분석',
        sajuConnection: '당신의 사주 {element} 기운은 다음과 연관됩니다',
        astrologyConnection: '당신의 {planet} 배치는 다음을 시사합니다',
        recommendation: '심리 프로필에 기반한 추천',
      },
    },
  },
}
