/**
 * 사주 용어 → 사용자 친화적 설명 변환
 *
 * 이 모듈은 사주 예측 결과의 전문 용어를 일반 사용자가 이해하기 쉬운
 * 친화적인 설명으로 변환합니다.
 */

/**
 * 이벤트 타입별 사주 용어 변환 매핑
 */
export const REASON_TRANSLATIONS: Record<string, Record<string, string>> = {
  // 십신 관련
  investment: {
    '정재운': '💰 재물운이 안정되어 재테크하기 좋은 시기',
    '편재운': '💸 뜻밖의 재물운, 투자 수익 기대',
    '식신운': '🌱 꾸준한 수입 증가 흐름',
    '상관운': '💡 창의적 아이디어로 수익 창출 가능',
    '정관운': '📊 체계적인 자산 관리에 유리',
    '편관운': '⚡ 과감한 투자 결정에 좋은 시기',
    '정인운': '📚 재테크 학습과 정보 수집 최적기',
    '편인운': '🔮 직감적인 투자 판단력 상승',
    '비견운': '🤝 동업이나 공동 투자에 유리',
    '겁재운': '⚠️ 경쟁이 있지만 기회도 있는 시기',
  },
  marriage: {
    '정재운': '💕 안정적인 만남의 기회',
    '편재운': '💘 뜻밖의 인연 발생 가능',
    '정관운': '💍 정식 교제나 결혼에 매우 유리',
    '편관운': '❤️‍🔥 강렬한 만남의 시기',
    '정인운': '🏠 가정적인 분위기, 결혼 결심에 좋음',
    '식신운': '😊 편안한 만남, 자연스러운 인연',
  },
  career: {
    '정관운': '👔 승진이나 직장 내 인정받기 좋은 시기',
    '편관운': '⚡ 도전적인 이직이나 새로운 기회',
    '식신운': '🌱 실력 발휘와 성과 인정 시기',
    '상관운': '💡 창의적인 업무에서 두각',
    '정재운': '💰 급여 상승이나 보너스 기대',
    '정인운': '📚 자기계발과 역량 향상 최적기',
    '편인운': '🔮 전문성 강화에 좋은 시기',
  },
  study: {
    '정인운': '📖 학습 능력 최고조, 합격운 상승',
    '편인운': '🧠 직관력과 암기력 향상',
    '식신운': '✍️ 꾸준한 노력이 결실로',
    '상관운': '💡 창의적 사고력 발휘',
    '정관운': '📋 체계적인 학습에 유리',
  },
  move: {
    '역마': '🚗 이동과 변화에 최적의 시기',
    '정재운': '🏠 좋은 집을 찾기 유리한 시기',
    '정인운': '🏡 안정적인 정착에 좋은 시기',
  },
  health: {
    '식신운': '💪 체력 회복과 건강 관리에 최적',
    '정인운': '🧘 심신 안정과 치유의 시기',
    '비견운': '🏃 운동 효과가 좋은 시기',
  },
  relationship: {
    '정재운': '💕 안정적인 연애 시작에 좋음',
    '편재운': '💘 새로운 만남의 기회',
    '식신운': '😊 자연스러운 인연 발전',
    '상관운': '💬 적극적인 표현이 효과적',
  },
};

/**
 * 공통 사주 용어 변환 매핑
 */
export const COMMON_TRANSLATIONS: Record<string, string> = {
  // 12운성
  '건록 - 에너지 상승기': '🔥 에너지가 충만한 시기, 적극적 행동 권장',
  '제왕 - 에너지 상승기': '👑 운세 최고조! 무엇이든 시작하기 좋은 때',
  '관대 - 에너지 상승기': '✨ 성장과 발전의 기운이 강한 시기',
  '장생 - 에너지 상승기': '🌱 새로운 시작에 좋은 기운',
  '목욕 - 에너지 상승기': '🌊 변화와 정화의 시기',

  // 오행 조화
  '화 기운 - 조화': '🔥 열정과 추진력이 높아지는 시기',
  '수 기운 - 조화': '💧 지혜와 통찰력이 빛나는 시기',
  '목 기운 - 조화': '🌳 성장과 발전의 에너지',
  '금 기운 - 조화': '⚔️ 결단력과 실행력 상승',
  '토 기운 - 조화': '🏔️ 안정과 신뢰의 기운',

  // 용신
  '용신 월': '⭐ 당신에게 가장 유리한 기운의 달',
  '용신일': '⭐ 당신에게 가장 유리한 기운의 날',

  // 귀인
  '천을귀인': '🌟 귀인의 도움을 받을 수 있는 날',

  // 특수 관계
  '대운 건록 - 장기적 지원': '📈 장기적인 운세 상승 흐름',
  '대운 제왕 - 장기적 지원': '👑 10년 대운 중 최고의 시기',
};

/**
 * 사주 용어를 사용자 친화적 설명으로 변환
 *
 * @param reasons - 변환할 사주 용어 배열
 * @param eventType - 이벤트 타입 (investment, marriage, career 등)
 * @returns 변환된 사용자 친화적 설명 배열
 *
 * @example
 * ```ts
 * const reasons = ['정재운', '용신 월'];
 * const translated = translateReasons(reasons, 'investment');
 * // ['💰 재물운이 안정되어 재테크하기 좋은 시기', '⭐ 당신에게 가장 유리한 기운의 달']
 * ```
 */
export function translateReasons(reasons: string[], eventType: string): string[] {
  const eventTranslations = REASON_TRANSLATIONS[eventType] || {};

  return reasons.map(reason => {
    // 이벤트 타입별 변환 먼저 확인
    for (const [key, translation] of Object.entries(eventTranslations)) {
      if (reason.includes(key)) {
        return translation;
      }
    }

    // 공통 변환 확인
    if (COMMON_TRANSLATIONS[reason]) {
      return COMMON_TRANSLATIONS[reason];
    }

    // 부분 매치 시도
    for (const [key, translation] of Object.entries(COMMON_TRANSLATIONS)) {
      if (reason.includes(key.split(' - ')[0])) {
        return translation;
      }
    }

    // 합/충 관계는 간략화
    if (reason.includes('육합') || reason.includes('삼합')) {
      const match = reason.match(/([가-힣]+) 기운/);
      if (match) {
        const element = match[1];
        const elementDescriptions: Record<string, string> = {
          '화': '🔥 열정의 기운 결합',
          '수': '💧 지혜의 기운 결합',
          '목': '🌳 성장의 기운 결합',
          '금': '⚔️ 결단의 기운 결합',
          '토': '🏔️ 안정의 기운 결합',
        };
        return elementDescriptions[element] || `✨ ${element} 기운 활성화`;
      }
      return '✨ 긍정적인 기운 결합';
    }

    // 절기는 간략화
    if (reason.includes('절기')) {
      return '🌸 계절 에너지와 조화';
    }

    // 변환 불가시 원본 유지 (앞에 ✦ 제거하고 이모지 추가)
    return `✨ ${reason.replace(/^✦\s*/, '')}`;
  });
}
