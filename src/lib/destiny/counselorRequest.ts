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
