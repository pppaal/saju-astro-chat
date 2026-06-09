/**
 * 쉬운말 레이어 — 명리/점성 용어를 일상어로 옮긴다.
 *
 * 정책(2026-06): 화면은 "결론 일상어 먼저, 전문용어는 괄호/툴팁". 구조·데이터는
 * 그대로 두고 이 사전만 입혀 캘린더/리포트 전반을 이해하기 쉽게 만든다.
 *
 * 순수 데이터 + 작은 헬퍼. LLM 0번.
 */

/** 십신 → 생활영역(한 단어) + 한 줄 뜻. */
export const SIBSIN_DOMAIN: Record<string, { area: string; gloss: string }> = {
  비견: { area: '사람·자립', gloss: '내 편·동료, 홀로서기' },
  겁재: { area: '경쟁·사람', gloss: '경쟁과 협력이 같이 오는 인간관계' },
  식신: { area: '표현·재능', gloss: '꾸준히 만들고 표현하는 힘' },
  상관: { area: '재능·자유', gloss: '톡톡 튀는 표현·재능' },
  편재: { area: '돈·현실', gloss: '활동적인 돈·사업 감각' },
  정재: { area: '돈·안정', gloss: '꾸준히 모으는 안정 재물' },
  편관: { area: '일·도전', gloss: '강하게 밀어붙이는 책임·압박' },
  정관: { area: '일·책임', gloss: '원칙·자리·사회적 책임' },
  편인: { area: '공부·사유', gloss: '독자적 배움·생각' },
  정인: { area: '공부·지원', gloss: '배움과 받쳐주는 도움' },
  // 묶음 별
  비겁: { area: '사람·경쟁', gloss: '내 편·경쟁' },
  식상: { area: '표현·재능', gloss: '표현·재능' },
  재성: { area: '돈·현실', gloss: '돈·현실 성취' },
  관성: { area: '일·책임', gloss: '일·책임·자리' },
  인성: { area: '공부·지원', gloss: '배움·지원' },
}

/** 12운성 → 기세 단계 쉬운 한 줄. */
export const TWELVE_STAGE_PLAIN: Record<string, string> = {
  장생: '새싹처럼 막 시작하는 기세',
  목욕: '다듬어지며 흔들리는 기세',
  관대: '막 자리를 잡아가는 기세',
  건록: '제 힘으로 단단히 서는 기세',
  임관: '제 힘으로 단단히 서는 기세',
  제왕: '기세가 절정에 오른 때',
  왕지: '기세가 절정에 오른 때',
  쇠: '정점을 지나 누그러지는 때',
  병: '힘이 빠지며 쉬어가는 때',
  사: '한 막이 닫히는 때',
  묘: '갈무리하고 묻어두는 때',
  절: '끊기고 비워지는 때',
  태: '새로 잉태되는 때',
  양: '조용히 길러지는 때',
}

/** 관계(합충형파) → 쉬운 한 줄. */
export const RELATION_PLAIN: Record<string, string> = {
  육합: '서로 잘 맞물려요',
  삼합: '여럿이 한 방향으로 뭉쳐요',
  방합: '같은 계절끼리 모여요',
  충: '부딪혀 흔들려요',
  형: '갈등·조정이 생겨요',
  파: '깨지거나 어긋나요',
  해: '자잘하게 거슬려요',
  원진: '은근히 안 맞아요',
  공망: '비어서 힘이 덜 실려요',
}

/** 시간 축 용어 → 쉬운 정의 (툴팁용). */
export const SCALE_TERM_PLAIN: Record<string, string> = {
  대운: '10년 단위로 바뀌는 큰 흐름',
  세운: '그 해의 운',
  월운: '그 달의 운',
  일진: '그날의 기운',
  프로펙션: '해마다 한 영역씩 켜지는 점성 주기',
  ZR: '인생을 장(章)으로 나누는 점성 흐름',
  격국: '타고난 기본 성향·구조',
  용신: '나에게 보약이 되는 기운',
  기신: '나에게 부담이 되는 기운',
}

/** 십신명 → 생활영역 단어. 못 찾으면 원어. */
export function sibsinArea(name: string | undefined): string {
  if (!name) return ''
  return SIBSIN_DOMAIN[name]?.area ?? name
}

/** 12운성명 → 쉬운 한 줄. 못 찾으면 원어. */
export function twelveStagePlain(stage: string | undefined): string {
  if (!stage) return ''
  return TWELVE_STAGE_PLAIN[stage] ?? stage
}

/** 관계명(…육합/충 등)에서 종류를 뽑아 쉬운 한 줄. */
export function relationPlain(label: string | undefined): string {
  if (!label) return ''
  for (const key of Object.keys(RELATION_PLAIN)) {
    if (label.includes(key)) return RELATION_PLAIN[key]
  }
  return ''
}
