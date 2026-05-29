/**
 * Resend 발송 점검용 일회성 스크립트.
 *
 * RESEND_API_KEY / EMAIL_FROM 가 실제로 메일을 내보낼 수 있는지(키 유효 +
 * 도메인 verified) 결제 없이 바로 확인한다. 앱의 emailService 를 거치지 않고
 * resend 패키지를 직접 호출 → prisma/EmailLog 의존성 없이 단독 실행 가능.
 *
 * 사용:
 *   RESEND_API_KEY=re_xxx EMAIL_FROM="DestinyPal <noreply@destinypal.com>" \
 *     node scripts/send-test-email.mjs you@example.com
 *
 * EMAIL_FROM 생략 시 앱 기본값(noreply@destinypal.me)을 쓴다 — 단, 그 도메인이
 * Resend 에서 verified 돼 있어야 발송된다.
 */
import { Resend } from 'resend'

const to = process.argv[2]
if (!to) {
  console.error('사용법: node scripts/send-test-email.mjs <받는주소>')
  process.exit(1)
}

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('RESEND_API_KEY 가 설정돼 있지 않습니다.')
  process.exit(1)
}

const from = process.env.EMAIL_FROM || 'DestinyPal <noreply@destinypal.me>'
const resend = new Resend(apiKey)

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: '[DestinyPal] 메일 발송 점검',
  html: '<p>이 메일이 보이면 Resend 키와 발송 도메인이 정상입니다. ✅</p>',
})

if (error) {
  console.error('발송 실패:', error)
  process.exit(1)
}
console.log('발송 성공. messageId =', data?.id, '| from =', from, '| to =', to)
