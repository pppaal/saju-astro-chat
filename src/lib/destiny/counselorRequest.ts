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
