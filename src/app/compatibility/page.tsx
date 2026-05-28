/**
 * /compatibility — 별도 입력 페이지였는데 picker UI 가 counselor 안에서
 * 인라인 모달로 통합되면서(2026-05) 그냥 counselor 로 redirect.
 *
 * 메인 / 홈 카드 / 헤더 등 외부 링크가 /compatibility 를 가리키고 있을 수
 * 있어서 라우트 자체는 유지하고 서버 사이드 redirect 만 한다.
 */
import { redirect } from 'next/navigation'

export default function CompatibilityEntryRedirect() {
  redirect('/compatibility/counselor')
}
