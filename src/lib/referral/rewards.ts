// src/lib/referral/rewards.ts
//
// 추천 보상 액수 SSOT — 서버(referralService)와 클라(ReferralInviteButton 등
// 노출 카피)가 같은 숫자를 읽는다. 순수 상수만 — 클라이언트 번들 안전.
//
// 보상은 친구의 "첫 결제" 시점에 지급된다(가입 아님) — 노출 카피도 이 정책을
// 정직하게 적을 것.

/** 추천인이 받는 크레딧 (친구 첫 결제 시). */
export const REFERRER_CREDITS = 10

/** 친구(피추천자) 본인이 첫 결제 보너스로 받는 크레딧. */
export const REFEREE_CREDITS = 5
