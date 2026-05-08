/**
 * ganjiMappings.ts - 간지 한글 변환 매핑
 */

export const stemToKorean: Record<string, string> = {
  甲: '갑목(나무+)',
  乙: '을목(나무-)',
  丙: '병화(불+)',
  丁: '정화(불-)',
  戊: '무토(흙+)',
  己: '기토(흙-)',
  庚: '경금(쇠+)',
  辛: '신금(쇠-)',
  壬: '임수(물+)',
  癸: '계수(물-)',
}

export const branchToKorean: Record<string, string> = {
  子: '자(쥐/물)',
  丑: '축(소/흙)',
  寅: '인(호랑이/나무)',
  卯: '묘(토끼/나무)',
  辰: '진(용/흙)',
  巳: '사(뱀/불)',
  午: '오(말/불)',
  未: '미(양/흙)',
  申: '신(원숭이/쇠)',
  酉: '유(닭/쇠)',
  戌: '술(개/흙)',
  亥: '해(돼지/물)',
}

export const zodiacSigns = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const
