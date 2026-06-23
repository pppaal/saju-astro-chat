/**
 * dayStrength — 점수(0~100)를 *세기*(얼마나 또렷한 하루인지)로 옮긴다.
 *
 * 설계(2026-06, 시안 리서치): 숫자 점수는 거짓 정밀(79 vs 82)이라 화면엔 안 쓰고,
 * 막대 수 + 고정 단어 사다리로 "세기"만 보여준다. 세기는 좋/나쁨(tone)과 별개 —
 * 점수가 중립(50)에서 멀수록(좋든 나쁘든) 그날 기운이 *또렷*하다고 본다.
 *
 * 순수 함수, LLM 0번. 같은 입력 → 같은 출력.
 */

export interface DayStrength {
  /** 막대 수 1~5 (UI 강도 표시). */
  level: 1 | 2 | 3 | 4 | 5
  /** 고정 단어(KO) — 사람마다 흔들리지 않게 점수→단어 매핑 고정. */
  ko: string
  /** 고정 단어(EN). */
  en: string
}

// |score-50| 구간 → 세기 단계. 중립(50)에서 멀수록 또렷.
const LADDER: ReadonlyArray<{ min: number; level: DayStrength['level']; ko: string; en: string }> =
  [
    { min: 30, level: 5, ko: '아주 강한 날', en: 'a very strong day' },
    { min: 20, level: 4, ko: '강한 날', en: 'a strong day' },
    { min: 12, level: 3, ko: '또렷한 날', en: 'a clear day' },
    { min: 6, level: 2, ko: '잔잔한 날', en: 'a mild day' },
    { min: 0, level: 1, ko: '고요한 날', en: 'a quiet day' },
  ]

/** 점수(0~100) → 세기(막대 수 + 고정 단어). 범위 밖 점수는 0~100 으로 클램프. */
export function dayStrength(score: number): DayStrength {
  const s = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 50))
  const delta = Math.abs(s - 50)
  const hit = LADDER.find((r) => delta >= r.min) ?? LADDER[LADDER.length - 1]
  return { level: hit.level, ko: hit.ko, en: hit.en }
}
