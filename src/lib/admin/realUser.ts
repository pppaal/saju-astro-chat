/**
 * 어드민 집계 공용 "실제 회원" 필터.
 *
 * prod User 테이블엔 앱 가입 경로(next-auth createUser) 외에 출처 불명의 대량
 * 레코드(약 41,500행)가 섞여 있다 — OAuth Account 도 passwordHash 도 없어
 * 로그인 자체가 불가능한 껍데기(과거 외부 임포트로 추정). `prisma.user.count()`
 * 를 그대로 쓰면 이 껍데기까지 회원으로 집계돼 ~41,709 처럼 부풀려진다.
 *
 * 그래서 어드민의 모든 회원 집계는 "로그인 수단이 있는 행"(OAuth Account 연결
 * 또는 passwordHash 보유)만 회원으로 센다. overview·users-by·funnel 등 여러
 * 라우트가 동일 기준을 써야 카드 숫자가 서로 어긋나지 않으므로 한 곳에 둔다.
 */

import type { Prisma } from '@prisma/client'

export const realUserWhere: Prisma.UserWhereInput = {
  OR: [{ accounts: { some: {} } }, { passwordHash: { not: null } }],
}
