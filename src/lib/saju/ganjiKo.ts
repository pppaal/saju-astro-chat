/**
 * 한자 간지(干支) → 한글 음 변환 (클라이언트 안전).
 *
 * 갑자/신미 같은 한글 음은 적어도 한국어 사용자가 읽을 수 있다 — UI 칩·배지에
 * 노출되던 raw 한자(甲子, 辛未, 子午)를 한글로 바꿔 "읽을 수 없는 글자" 장벽 제거.
 * (의미 풀이까지는 아님 — 음만 변환. 본문 narrative 가 의미를 담당.)
 */

export const STEM_KO: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}

export const BRANCH_KO: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

/**
 * 문자열 안의 천간·지지 한자를 한글 음으로 치환. 그 외 문자는 그대로 둠.
 * 예: '辛未' → '신미', '甲戌' → '갑술', '子午' → '자오', '갑자' → '갑자'.
 */
export function ganjiToKorean(input: string | null | undefined): string {
  if (!input) return ''
  let out = ''
  for (const ch of input) {
    out += STEM_KO[ch] ?? BRANCH_KO[ch] ?? ch
  }
  return out
}

// 영문 사용자에겐 한자(乙亥)가 읽히지 않는다 — 개정 로마자 음으로 치환해
// 라틴 문자로라도 읽히게 한다(의미는 본문이 담당).
const STEM_ROMAN: Record<string, string> = {
  甲: 'gap', 乙: 'eul', 丙: 'byeong', 丁: 'jeong', 戊: 'mu',
  己: 'gi', 庚: 'gyeong', 辛: 'sin', 壬: 'im', 癸: 'gye',
}
const BRANCH_ROMAN: Record<string, string> = {
  子: 'ja', 丑: 'chuk', 寅: 'in', 卯: 'myo', 辰: 'jin', 巳: 'sa',
  午: 'o', 未: 'mi', 申: 'sin', 酉: 'yu', 戌: 'sul', 亥: 'hae',
}

/**
 * 천간+지지 한자 → 로마자 음 (예: '乙亥' → 'Eulhae'). 첫 글자만 대문자.
 * 못 푸는 글자는 그대로 둔다.
 */
export function ganjiToRoman(stem: string, branch: string): string {
  const s = STEM_ROMAN[stem] ?? ''
  const b = BRANCH_ROMAN[branch] ?? ''
  const joined = `${s}${b}`
  return joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : `${stem}${branch}`
}
