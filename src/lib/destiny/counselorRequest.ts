/**
 * 운명상담사 요청의 교차 관심사(언어·시간대)를 한 곳에서 확정하는 단일 출처.
 *
 * 배경: 예전엔 realtime 라우트 · warm 라우트 · ensureCounselorContext 가 각자
 * 손으로 lang/userTz 를 도출했다. 그래서 서로 어긋났다 —
 *   · warm 은 쿠키 폴백 없이 body.lang 만 봐서, 쿠키-EN 사용자가 ko 로 워밍 →
 *     realtime(en)과 캐시 키가 달라 워밍이 통째로 빗나감.
 *   · lang 이 캐시 키에 빠져 ko/en 컨텍스트가 섞여 서빙됨.
 * "모르면 각자 알아서 기본값을 찍는" 패턴이 드리프트의 뿌리였다. 도출을 이
 * 모듈 하나로 모으면 호출부가 늘어도 같은 규칙을 공유해 어긋날 수가 없다.
 */
import type { NextRequest } from 'next/server'

export type CounselorLang = 'ko' | 'en'

/**
 * 답변 언어 확정. 우선순위: body.lang(명시) → locale 쿠키 폴백 → ko.
 * realtime · warm 양쪽이 *반드시* 이 함수를 거쳐야 캐시 키가 일치한다.
 */
export function resolveCounselorLang(
  body: { lang?: unknown } | null | undefined,
  req: Pick<NextRequest, 'cookies'>
): CounselorLang {
  const bodyLang = body?.lang
  if (bodyLang === 'en' || bodyLang === 'ko') return bodyLang
  return req.cookies.get('locale')?.value === 'en' ? 'en' : 'ko'
}

/**
 * "오늘"/일진 기준이 되는 사용자 기기 시간대.
 * 우선순위: userTimezone(기기) → timezone(출생지) → 서울.
 */
export function resolveUserTz(body: { userTimezone?: string; timezone?: string }): string {
  return body.userTimezone || body.timezone || 'Asia/Seoul'
}

/**
 * 운명상담사가 이번 답변에 사용할 데이터 소스 — 사용자가 체크박스로
 * 사주만/점성만/둘 다를 고를 수 있다. 선택 안 된 시스템은 컨텍스트 빌드에서
 * 통째로 빠지고(토큰·연산 절약), 시스템 프롬프트도 "그 시스템은 언급·창작
 * 금지"로 바뀐다. realtime · warm 이 *반드시* 이 함수를 거쳐야 캐시 키가 일치한다.
 */
export interface DestinySources {
  saju: boolean
  astro: boolean
}

/**
 * 요청 body 의 sources 를 정규화. 누락/구버전 클라 → 둘 다(기존 동작). 명시적
 * false 만 해당 소스를 끈다. 둘 다 false 면 빈 컨텍스트가 되므로 둘 다로 폴백.
 */
export function resolveCounselorSources(
  body: { sources?: unknown } | null | undefined
): DestinySources {
  const raw = (body?.sources ?? null) as { saju?: unknown; astro?: unknown } | null
  if (raw && typeof raw === 'object') {
    const saju = raw.saju !== false
    const astro = raw.astro !== false
    if (!saju && !astro) return { saju: true, astro: true }
    return { saju, astro }
  }
  return { saju: true, astro: true }
}

/**
 * 현재 턴 맨앞에 박는 "이번 답변 범위" 한 줄. 시스템 프롬프트에도 scope/balance
 * 가드가 있지만, priorTurns 로 *직전 답변이 그대로 재생*되면 모델이 그걸 이어가기
 * 쉽다(도중 토글 전환 시) — 가장 가중치 높은 현재 user 턴에서 재차단/재지시한다.
 *
 * ★ 둘 다(both) 도 반드시 한 줄을 박는다. 예전엔 single-source 만 scopeLine 을
 * 가졌고 both 는 빈 값('')이라, "점성만 답한 직후 → 둘 다 전환" 시 현재 턴에 아무
 * 지시가 없어 직전 점성 답변의 recency 로 점성만 이어가는 버그가 있었다(ko/en 공통).
 */
export function buildScopeLine(sources: DestinySources, lang: CounselorLang): string {
  const both = sources.saju && sources.astro
  if (both) {
    return lang === 'en'
      ? `[Scope for THIS answer] Use BOTH Saju and astrology — even if an earlier turn answered with only one of them, weave the two together now (at least one signal from each).\n\n`
      : `[이번 답변 범위] 사주·점성 둘 다 사용. 이전 턴에서 한쪽만 답했더라도 지금은 두 시스템을 함께 엮어서 답해 — 각각 최소 하나씩.\n\n`
  }
  if (sources.astro) {
    return lang === 'en'
      ? `[Scope for THIS answer] Astrology only. Even if Saju (day master, five elements, ten gods, daeun) appeared earlier in this chat, do NOT continue it — answer using astrology (planets, signs, houses, aspects, transits) only, and don't use Saju terms.\n\n`
      : `[이번 답변 범위] 점성만 사용. 이전 대화에 사주(일간·오행·십성·대운)가 나왔더라도 지금은 이어가지 말고, 점성(행성·별자리·하우스·각·트랜짓)만으로 답해. 사주 용어를 꺼내지 마.\n\n`
  }
  return lang === 'en'
    ? `[Scope for THIS answer] Saju only. Even if astrology (planets, signs, houses) appeared earlier in this chat, do NOT continue it — answer using Saju (day master, five elements, ten gods, daeun, sewoon, iljin) only, and don't use astrology terms.\n\n`
    : `[이번 답변 범위] 사주만 사용. 이전 대화에 점성(행성·별자리·하우스)이 나왔더라도 지금은 이어가지 말고, 사주(일간·오행·십성·대운·세운·일진)만으로 답해. 점성 용어를 꺼내지 마.\n\n`
}
