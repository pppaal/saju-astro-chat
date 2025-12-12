// src/lib/i18n/extensions/psychology.ts
// Psychology 통합 기능 번역

import type { LocaleExtension } from "../types";

export const psychologyExtension: LocaleExtension = {
  en: {
    psychology: {
      title: "Psychological Analysis",
      subtitle: "Understand your mind through validated frameworks",
      mbti: {
        title: "MBTI Personality",
        description: "16 personality types based on cognitive functions",
        takeTest: "Take MBTI Test",
        yourType: "Your Type",
      },
      big5: {
        title: "Big Five Traits",
        description: "Scientific personality model",
        openness: "Openness",
        conscientiousness: "Conscientiousness",
        extraversion: "Extraversion",
        agreeableness: "Agreeableness",
        neuroticism: "Neuroticism",
        takeTest: "Take Big 5 Test",
      },
      integration: {
        title: "Integrated Analysis",
        sajuConnection: "Your Saju {element} element correlates with",
        astrologyConnection: "Your {planet} placement suggests",
        recommendation: "Based on your psychological profile",
      },
    },
  },
  ko: {
    psychology: {
      title: "심리 분석",
      subtitle: "검증된 프레임워크로 당신의 마음을 이해하세요",
      mbti: {
        title: "MBTI 성격유형",
        description: "인지 기능 기반 16가지 성격 유형",
        takeTest: "MBTI 테스트 하기",
        yourType: "당신의 유형",
      },
      big5: {
        title: "Big Five 성격특성",
        description: "과학적 성격 모델",
        openness: "개방성",
        conscientiousness: "성실성",
        extraversion: "외향성",
        agreeableness: "친화성",
        neuroticism: "신경성",
        takeTest: "Big 5 테스트 하기",
      },
      integration: {
        title: "통합 분석",
        sajuConnection: "당신의 사주 {element} 기운은 다음과 연관됩니다",
        astrologyConnection: "당신의 {planet} 배치는 다음을 시사합니다",
        recommendation: "심리 프로필에 기반한 추천",
      },
    },
  },
  ja: {
    psychology: {
      title: "心理分析",
      subtitle: "検証されたフレームワークで心を理解する",
      mbti: {
        title: "MBTI性格タイプ",
        description: "認知機能に基づく16の性格タイプ",
        takeTest: "MBTIテストを受ける",
        yourType: "あなたのタイプ",
      },
      big5: {
        title: "ビッグファイブ特性",
        description: "科学的性格モデル",
        openness: "開放性",
        conscientiousness: "誠実性",
        extraversion: "外向性",
        agreeableness: "協調性",
        neuroticism: "神経症傾向",
        takeTest: "ビッグ5テストを受ける",
      },
    },
  },
  zh: {
    psychology: {
      title: "心理分析",
      subtitle: "通过验证的框架理解您的内心",
      mbti: {
        title: "MBTI人格类型",
        description: "基于认知功能的16种人格类型",
        takeTest: "进行MBTI测试",
        yourType: "您的类型",
      },
      big5: {
        title: "大五人格特质",
        description: "科学人格模型",
        openness: "开放性",
        conscientiousness: "尽责性",
        extraversion: "外向性",
        agreeableness: "宜人性",
        neuroticism: "神经质",
        takeTest: "进行大五测试",
      },
    },
  },
};
