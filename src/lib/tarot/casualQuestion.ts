/**
 * 캐주얼 질문 감지 — 사주·점성 raw 컨텍스트를 LLM 에 보낼지 결정하는 게이트.
 *
 * 짧은 일상 질문 ("낼 뭐 먹어", "오늘 입을 거") 은 raw 데이터 인용 안 함.
 * 무거운 질문 ("이직할까…", "인생 방향") 은 풀 컨텍스트 전송.
 */

const CASUAL_PATTERN =
  /^(오늘|내일|모레|이번주|주말|낼|뭐|어디|언제|누구|뭐 ?먹|뭐 ?입|뭐 ?사|뭐 ?신|뭐 ?할|어디 ?가)/i

/** 캐주얼이면 true → 훅이 saju/astroContext 차단. */
export function isCasualQuestion(question: string): boolean {
  const q = (question || '').trim()
  if (q.length === 0) return false
  // 매우 짧으면 무조건 캐주얼
  if (q.length <= 12) return true
  // 25자 이하 + 일상 키워드로 시작하면 캐주얼
  if (q.length <= 25 && CASUAL_PATTERN.test(q)) return true
  return false
}
