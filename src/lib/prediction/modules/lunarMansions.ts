// src/lib/prediction/modules/lunarMansions.ts
// 28수 (Lunar Mansions) 계산 모듈

import type { LunarMansion, LunarPhase } from './types'

// ============================================================
// 28수 데이터
// ============================================================

const LUNAR_MANSIONS: Omit<LunarMansion, 'index'>[] = [
  {
    name: '角',
    nameKo: '각',
    element: '목',
    animal: '교룡',
    isAuspicious: true,
    goodFor: ['건축', '결혼'],
    badFor: ['장례'],
  },
  {
    name: '亢',
    nameKo: '항',
    element: '금',
    animal: '용',
    isAuspicious: false,
    goodFor: ['수리'],
    badFor: ['결혼', '이사'],
  },
  {
    name: '氐',
    nameKo: '저',
    element: '토',
    animal: '담비',
    isAuspicious: true,
    goodFor: ['결혼', '계약'],
    badFor: [],
  },
  {
    name: '房',
    nameKo: '방',
    element: '수',
    animal: '토끼',
    isAuspicious: true,
    goodFor: ['결혼', '개업', '건축'],
    badFor: [],
  },
  {
    name: '心',
    nameKo: '심',
    element: '화',
    animal: '여우',
    isAuspicious: false,
    goodFor: [],
    badFor: ['결혼', '장례'],
  },
  {
    name: '尾',
    nameKo: '미',
    element: '화',
    animal: '호랑이',
    isAuspicious: true,
    goodFor: ['결혼', '건축', '개업'],
    badFor: [],
  },
  {
    name: '箕',
    nameKo: '기',
    element: '수',
    animal: '표범',
    isAuspicious: true,
    goodFor: ['이사', '개업'],
    badFor: ['결혼'],
  },
  {
    name: '斗',
    nameKo: '두',
    element: '목',
    animal: '해',
    isAuspicious: true,
    goodFor: ['토목', '건축'],
    badFor: [],
  },
  {
    name: '牛',
    nameKo: '우',
    element: '금',
    animal: '소',
    isAuspicious: false,
    goodFor: [],
    badFor: ['결혼', '계약'],
  },
  {
    name: '女',
    nameKo: '여',
    element: '토',
    animal: '박쥐',
    isAuspicious: false,
    goodFor: [],
    badFor: ['결혼', '장례'],
  },
  {
    name: '虛',
    nameKo: '허',
    element: '수',
    animal: '쥐',
    isAuspicious: false,
    goodFor: ['수행'],
    badFor: ['결혼', '계약', '건축'],
  },
  {
    name: '危',
    nameKo: '위',
    element: '화',
    animal: '제비',
    isAuspicious: false,
    goodFor: [],
    badFor: ['대부분'],
  },
  {
    name: '室',
    nameKo: '실',
    element: '화',
    animal: '돼지',
    isAuspicious: true,
    goodFor: ['결혼', '건축', '이사'],
    badFor: [],
  },
  {
    name: '壁',
    nameKo: '벽',
    element: '수',
    animal: '유',
    isAuspicious: true,
    goodFor: ['결혼', '건축', '학업'],
    badFor: [],
  },
  {
    name: '奎',
    nameKo: '규',
    element: '목',
    animal: '늑대',
    isAuspicious: true,
    goodFor: ['결혼', '개업', '건축'],
    badFor: [],
  },
  {
    name: '婁',
    nameKo: '루',
    element: '금',
    animal: '개',
    isAuspicious: true,
    goodFor: ['결혼', '건축', '개업'],
    badFor: [],
  },
  {
    name: '胃',
    nameKo: '위',
    element: '토',
    animal: '꿩',
    isAuspicious: true,
    goodFor: ['개업', '이사'],
    badFor: [],
  },
  {
    name: '昴',
    nameKo: '묘',
    element: '수',
    animal: '닭',
    isAuspicious: false,
    goodFor: [],
    badFor: ['대부분'],
  },
  {
    name: '畢',
    nameKo: '필',
    element: '화',
    animal: '오리',
    isAuspicious: true,
    goodFor: ['건축', '결혼'],
    badFor: [],
  },
  {
    name: '觜',
    nameKo: '자',
    element: '화',
    animal: '원숭이',
    isAuspicious: false,
    goodFor: [],
    badFor: ['결혼'],
  },
  {
    name: '参',
    nameKo: '삼',
    element: '수',
    animal: '원숭이',
    isAuspicious: true,
    goodFor: ['개업', '계약'],
    badFor: ['결혼'],
  },
  {
    name: '井',
    nameKo: '정',
    element: '목',
    animal: '말',
    isAuspicious: true,
    goodFor: ['결혼', '개업'],
    badFor: [],
  },
  {
    name: '鬼',
    nameKo: '귀',
    element: '금',
    animal: '양',
    isAuspicious: false,
    goodFor: ['제사'],
    badFor: ['대부분'],
  },
  {
    name: '柳',
    nameKo: '류',
    element: '토',
    animal: '사슴',
    isAuspicious: false,
    goodFor: [],
    badFor: ['대부분'],
  },
  {
    name: '星',
    nameKo: '성',
    element: '수',
    animal: '말',
    isAuspicious: true,
    goodFor: ['결혼', '개업', '건축'],
    badFor: [],
  },
  {
    name: '張',
    nameKo: '장',
    element: '화',
    animal: '사슴',
    isAuspicious: true,
    goodFor: ['결혼', '개업', '건축'],
    badFor: [],
  },
  {
    name: '翼',
    nameKo: '익',
    element: '화',
    animal: '뱀',
    isAuspicious: true,
    goodFor: ['건축', '학업'],
    badFor: ['결혼'],
  },
  {
    name: '軫',
    nameKo: '진',
    element: '수',
    animal: '지렁이',
    isAuspicious: true,
    goodFor: ['결혼', '이사', '개업'],
    badFor: [],
  },
]

// ============================================================
// 28수 계산 함수
// ============================================================

/**
 * 특정 날짜의 28수 계산
 * 기준: 1900년 1월 1일 = 氐宿 (3번째 수)
 */
export function getLunarMansion(date: Date): LunarMansion {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(1900, 0, 1)
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24))
  const index = ((diffDays + 2) % 28) + 1 // 1-28

  const mansion = LUNAR_MANSIONS[index - 1]
  return {
    index,
    ...mansion,
  }
}

// ============================================================
// 달 위상 계산 함수
// ============================================================

/**
 * 달 위상 계산 (음력 일자 기반)
 */
export function getLunarPhase(lunarDay: number): LunarPhase {
  if (lunarDay === 1) {
    return 'new_moon'
  } else if (lunarDay <= 7) {
    return 'waxing_crescent'
  } else if (lunarDay <= 8) {
    return 'first_quarter'
  } else if (lunarDay <= 14) {
    return 'waxing_gibbous'
  } else if (lunarDay <= 16) {
    return 'full_moon'
  } else if (lunarDay <= 22) {
    return 'waning_gibbous'
  } else if (lunarDay <= 23) {
    return 'last_quarter'
  } else {
    return 'waning_crescent'
  }
}

/**
 * 달 위상 이름 (한글)
 */
export function getLunarPhaseName(phase: LunarPhase): string {
  const names: Record<LunarPhase, string> = {
    new_moon: '삭 (朔)',
    waxing_crescent: '초승달',
    first_quarter: '상현달',
    waxing_gibbous: '상현망',
    full_moon: '보름달 (望)',
    waning_gibbous: '하현망',
    last_quarter: '하현달',
    waning_crescent: '그믐달',
  }
  return names[phase]
}
