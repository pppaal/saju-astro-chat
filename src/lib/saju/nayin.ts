// src/lib/saju/nayin.ts
//
// 납음오행 (納音五行) — 60갑자(60甲子) 별 음양오행 룩업.
//
// 납음은 천간+지지 결합을 5가지 자연 비유로 묶은 고전 분류:
//   해중금(海中金)·노중화(爐中火)·대림목(大林木)·노방토(路傍土)·검봉금(劍鋒金) …
//   사주 통변에서 "오행 비유" 로 인물·환경을 묘사할 때 쓰임.
//
// 본 모듈은 60갑자 풀 룩업 테이블 + 헬퍼.
// 데이터 소스: 자평진전·三命通會·韓國 명리 표준.

export type NayinElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export interface NayinResult {
  /** 60갑자 (예: "甲子"). */
  ganji: string
  /** 납음 한자 (예: "海中金"). */
  nayin: string
  /** 한글 (예: "해중금"). */
  nayinKo: string
  /** 5원소. */
  element: NayinElement
}

// 60갑자 → 납음. 표준 30 쌍(짝수 2개씩 같은 납음) 으로 정리.
//
// 쌍 패턴: 甲子+乙丑 = 海中金, 丙寅+丁卯 = 爐中火 ... 식으로 60갑자 가 두
// 개씩 같은 납음 을 공유. 표준 韓國 명리 출처 그대로.
const NAYIN_PAIRS: Array<{ pair: [string, string]; nayin: string; nayinKo: string; element: NayinElement }> = [
  { pair: ['甲子', '乙丑'], nayin: '海中金', nayinKo: '해중금', element: 'metal' },
  { pair: ['丙寅', '丁卯'], nayin: '爐中火', nayinKo: '노중화', element: 'fire' },
  { pair: ['戊辰', '己巳'], nayin: '大林木', nayinKo: '대림목', element: 'wood' },
  { pair: ['庚午', '辛未'], nayin: '路傍土', nayinKo: '노방토', element: 'earth' },
  { pair: ['壬申', '癸酉'], nayin: '劍鋒金', nayinKo: '검봉금', element: 'metal' },
  { pair: ['甲戌', '乙亥'], nayin: '山頭火', nayinKo: '산두화', element: 'fire' },
  { pair: ['丙子', '丁丑'], nayin: '澗下水', nayinKo: '간하수', element: 'water' },
  { pair: ['戊寅', '己卯'], nayin: '城頭土', nayinKo: '성두토', element: 'earth' },
  { pair: ['庚辰', '辛巳'], nayin: '白蠟金', nayinKo: '백랍금', element: 'metal' },
  { pair: ['壬午', '癸未'], nayin: '楊柳木', nayinKo: '양류목', element: 'wood' },
  { pair: ['甲申', '乙酉'], nayin: '泉中水', nayinKo: '천중수', element: 'water' },
  { pair: ['丙戌', '丁亥'], nayin: '屋上土', nayinKo: '옥상토', element: 'earth' },
  { pair: ['戊子', '己丑'], nayin: '霹靂火', nayinKo: '벽력화', element: 'fire' },
  { pair: ['庚寅', '辛卯'], nayin: '松柏木', nayinKo: '송백목', element: 'wood' },
  { pair: ['壬辰', '癸巳'], nayin: '長流水', nayinKo: '장류수', element: 'water' },
  { pair: ['甲午', '乙未'], nayin: '沙中金', nayinKo: '사중금', element: 'metal' },
  { pair: ['丙申', '丁酉'], nayin: '山下火', nayinKo: '산하화', element: 'fire' },
  { pair: ['戊戌', '己亥'], nayin: '平地木', nayinKo: '평지목', element: 'wood' },
  { pair: ['庚子', '辛丑'], nayin: '壁上土', nayinKo: '벽상토', element: 'earth' },
  { pair: ['壬寅', '癸卯'], nayin: '金箔金', nayinKo: '금박금', element: 'metal' },
  { pair: ['甲辰', '乙巳'], nayin: '覆燈火', nayinKo: '복등화', element: 'fire' },
  { pair: ['丙午', '丁未'], nayin: '天河水', nayinKo: '천하수', element: 'water' },
  { pair: ['戊申', '己酉'], nayin: '大驛土', nayinKo: '대역토', element: 'earth' },
  { pair: ['庚戌', '辛亥'], nayin: '釵釧金', nayinKo: '차천금', element: 'metal' },
  { pair: ['壬子', '癸丑'], nayin: '桑柘木', nayinKo: '상자목', element: 'wood' },
  { pair: ['甲寅', '乙卯'], nayin: '大溪水', nayinKo: '대계수', element: 'water' },
  { pair: ['丙辰', '丁巳'], nayin: '沙中土', nayinKo: '사중토', element: 'earth' },
  { pair: ['戊午', '己未'], nayin: '天上火', nayinKo: '천상화', element: 'fire' },
  { pair: ['庚申', '辛酉'], nayin: '石榴木', nayinKo: '석류목', element: 'wood' },
  { pair: ['壬戌', '癸亥'], nayin: '大海水', nayinKo: '대해수', element: 'water' },
]

// 평면 60-key 룩업 맵 (런타임 O(1)).
const GANJI_TO_NAYIN: Record<string, NayinResult> = {}
for (const entry of NAYIN_PAIRS) {
  for (const ganji of entry.pair) {
    GANJI_TO_NAYIN[ganji] = {
      ganji,
      nayin: entry.nayin,
      nayinKo: entry.nayinKo,
      element: entry.element,
    }
  }
}

/**
 * 천간 + 지지 → 납음오행 정보.
 *
 * @param stem   - 천간 (甲~癸)
 * @param branch - 지지 (子~亥)
 * @returns NayinResult, 또는 60갑자 조합이 아니면 null
 *
 * @example
 *   getNayin('甲', '子')   // → { ganji: '甲子', nayin: '海中金', nayinKo: '해중금', element: 'metal' }
 *   getNayin('壬', '戌')   // → { ganji: '壬戌', nayin: '大海水', nayinKo: '대해수', element: 'water' }
 */
export function getNayin(stem: string | undefined, branch: string | undefined): NayinResult | null {
  if (!stem || !branch) return null
  return GANJI_TO_NAYIN[`${stem}${branch}`] ?? null
}

/**
 * 사주 4기둥 전체의 납음 목록 — 통변 보조.
 */
export function getNayinForPillars(pillars: {
  year: { stem: string; branch: string }
  month: { stem: string; branch: string }
  day: { stem: string; branch: string }
  time: { stem: string; branch: string }
}): { year: NayinResult | null; month: NayinResult | null; day: NayinResult | null; time: NayinResult | null } {
  return {
    year: getNayin(pillars.year.stem, pillars.year.branch),
    month: getNayin(pillars.month.stem, pillars.month.branch),
    day: getNayin(pillars.day.stem, pillars.day.branch),
    time: getNayin(pillars.time.stem, pillars.time.branch),
  }
}
