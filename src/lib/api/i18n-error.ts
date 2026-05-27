/**
 * API 응답 메시지 localizer.
 *
 * destiny-match / tarot couple-reading 등 일부 라우트가 에러/안내 메시지를
 * 한국어로 하드코딩하고 있어 영문 사용자가 못 읽는 회귀가 있었음 (출시 직전
 * audit #4 발견). 신규 코드는 localizeMessage 로 ko/en 둘 다 명시.
 *
 * 사용법:
 *   const msg = localizeMessage(req, {
 *     ko: '먼저 매칭 프로필을 설정해주세요',
 *     en: 'Please set up your match profile first',
 *   })
 *   return apiError(ErrorCodes.BAD_REQUEST, msg)
 */
import { extractLocale } from './middleware'

export function localizeMessage(req: Request, messages: { ko: string; en: string }): string {
  const locale = extractLocale(req)
  // 현재는 ko/en 만 지원. ja/zh 는 영문 fallback (추후 확장 시 여기에 추가).
  return locale === 'ko' ? messages.ko : messages.en
}
