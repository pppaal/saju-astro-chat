// src/lib/saju/myungGung.ts
//
// 명궁 (命宮 / Life Palace) 계산 — 자평진전 / 명리정종 표준식.
//
// 명궁은 12지지 중 하나로, "나의 운명을 지배하는 자리". 사주 4기둥 외의
// 5번째 표상으로 자아·운명·내적 중심을 가리킨다 (점성술 ASC 와 같은 결).
//
// 공식 (가장 널리 쓰이는 식 — 자평진전 기준):
//   1) 月지 번호 + 時지 번호 합산  (지지 번호: 子=1, 丑=2, ..., 亥=12)
//   2) 합이 14 이하 → 명궁지 번호 = 14 - 합
//   3) 합이 14 초과 → 명궁지 번호 = 26 - 합
//   4) 0 이하면 +12 보정.
//
// 결과: 子~亥 중 하나의 지지.
//
// 사용처 (예정): 통합 명식 리포트 "명궁 × ASC" 교차 (natalCross 추가),
//                DestinyPal 본명 시그널 #6 후보.

const BRANCH_INDEX_MAP: Record<string, number> = {
  '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6,
  '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12,
}

const INDEX_BRANCH_MAP: Record<number, string> = {
  1: '子', 2: '丑', 3: '寅', 4: '卯', 5: '辰', 6: '巳',
  7: '午', 8: '未', 9: '申', 10: '酉', 11: '戌', 12: '亥',
}

export interface MyungGungResult {
  /** 명궁 지지 (子~亥). */
  branch: string
  /** 1~12 인덱스 (子=1). 디버깅·표시 보조. */
  index: number
  /** 영문 라벨 (예: 'Pisces' style 비유로 점성 ASC 와 매핑할 때 사용 가능). */
  branchKo: string
}

const BRANCH_KO_NAMES: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
}

/**
 * 월지 + 시지로 명궁 지지 계산.
 *
 * @param monthBranch - 월지 (子~亥)
 * @param hourBranch  - 시지 (子~亥)
 * @returns MyungGungResult, 또는 입력이 잘못되면 null
 *
 * @example
 *   computeMyungGung('卯', '辰')
 *   // → { branch: '亥', index: 12, branchKo: '해' }
 */
export function computeMyungGung(
  monthBranch: string | undefined,
  hourBranch: string | undefined,
): MyungGungResult | null {
  if (!monthBranch || !hourBranch) return null
  const monthIdx = BRANCH_INDEX_MAP[monthBranch]
  const hourIdx = BRANCH_INDEX_MAP[hourBranch]
  if (!monthIdx || !hourIdx) return null

  const sum = monthIdx + hourIdx
  let gungIdx = sum <= 14 ? 14 - sum : 26 - sum
  if (gungIdx <= 0) gungIdx += 12
  if (gungIdx > 12) gungIdx -= 12

  const branch = INDEX_BRANCH_MAP[gungIdx]
  return {
    branch,
    index: gungIdx,
    branchKo: BRANCH_KO_NAMES[branch],
  }
}
