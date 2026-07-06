'use client'

/**
 * ReportInviteTracker — 리포트 바이럴 루프의 랜딩·전환 계측(K 계산용).
 *
 * 공유 링크(/r/{token})의 CTA 는 `/integrated-report?invite={token}` 로 보낸다.
 * 리포트 페이지는 서버 컴포넌트라 생일 게이트 → 결과 사이에 실제 네비게이션이
 * 있어(궁합처럼 한 페이지 state 로 못 잇는다), 초대 플래그를 sessionStorage 에
 * 실어 게이트를 넘어 결과까지 생존시킨다.
 *   - ?invite= 로 처음 들어온 순간: invite_landed 1회 + 토큰 저장.
 *   - 결과가 렌더된 화면(hasResult)에서 저장된 초대가 있으면: invite_converted
 *     1회 후 소진(중복 방지). 다른 유형 링크와 안 섞이게 리포트 전용 키를 쓴다.
 *
 * best-effort — 실패해도 사용자 흐름에 영향 없음(trackFunnel 자체가 흡수).
 */

import { useEffect } from 'react'
import { trackFunnel } from '@/lib/metrics/trackFunnel'

const KEY = 'ir_invite'

export default function ReportInviteTracker({ hasResult }: { hasResult: boolean }) {
  useEffect(() => {
    try {
      const invite = new URL(window.location.href).searchParams.get('invite')
      if (invite && sessionStorage.getItem(KEY) !== invite) {
        // 초대 링크로 처음 진입 — 랜딩 1회 + 결과까지 이어질 플래그 저장.
        sessionStorage.setItem(KEY, invite)
        trackFunnel('integrated_report.invite_landed')
      }
      if (hasResult && sessionStorage.getItem(KEY)) {
        // 초대에서 온 흐름이 자기 리포트를 완주 — 전환 1회 후 소진.
        trackFunnel('integrated_report.invite_converted')
        sessionStorage.removeItem(KEY)
      }
    } catch {
      /* noop — tracking is non-critical */
    }
  }, [hasResult])
  return null
}
