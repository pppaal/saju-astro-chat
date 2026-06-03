'use client'

import PolicyDocument, {
  type PolicyQuickSummary,
  type PolicySection,
} from '../_components/PolicyDocument'
import { SUPPORT_EMAIL } from '@/lib/config/contact'

const PSP_NAME = 'Stripe'
const EFFECTIVE_DATE = '2026-05-27'

const QUICK_SUMMARY: PolicyQuickSummary = {
  en: [
    'A credit pack with zero credits used is refundable within 7 days of purchase (the payment-processing fee is withheld).',
    'Once any credit has been used, the credit pack is non-refundable.',
    'If a reading fails due to a system issue on our side, the deducted credit is automatically restored to your balance.',
  ],
  ko: [
    '크레딧을 하나도 사용하지 않은 팩은 구매 후 7일 이내 환불 가능합니다 (결제수수료 차감 후 환불).',
    '크레딧을 하나라도 사용한 팩은 환불되지 않습니다.',
    '당사 시스템 장애로 리딩 제공이 실패한 경우, 차감된 크레딧을 자동으로 복구해 드립니다.',
  ],
}

const sections: PolicySection[] = [
  {
    id: 'overview',
    title: '1. Overview',
    titleKo: '1. 개요',
    body: `This Refund and Payment Policy governs all credit pack purchases made through DestinyPal. By making a purchase, you agree to these terms. All payments are processed securely through ${PSP_NAME}, a PCI-DSS Level 1 certified payment processor. DestinyPal does not offer recurring subscriptions; all purchases are one-time credit packs.`,
    bodyKo: `본 환불 및 결제 정책은 DestinyPal에서 이루어지는 모든 크레딧 팩 구매에 적용됩니다. 구매를 완료함으로써 귀하는 본 약관에 동의하게 됩니다. 모든 결제는 PCI-DSS Level 1 인증 결제 처리업체인 ${PSP_NAME}을 통해 안전하게 처리됩니다. DestinyPal은 정기 구독을 제공하지 않으며, 모든 결제는 일회성 크레딧 팩 구매입니다.`,
  },
  {
    id: 'credit-pack-purchases',
    title: '2. Credit Pack Purchases',
    titleKo: '2. 크레딧 팩 구매',
    body: `Credit Pack Types: We offer credit packs in several sizes (Mini, Standard, Plus, Mega, Ultimate), each with different credit quantities and pricing.

IMPORTANT - Credit Pack Refund Policy:

A) UNUSED Credits (within 7 days of purchase):
- A refund is available only if zero credits have been used.
- The refund request must be submitted within 7 days of the purchase date.
- After 7 days, even unused credits are non-refundable.
- The payment-processing fee (~3.5% + ₩300) is withheld from the refund. This fee is not
  returned by the payment processor (Stripe) on refunds.

B) PARTIALLY USED Credits:
- Partially used credit packs are non-refundable.
- Once even a single credit has been consumed, the entire pack becomes non-refundable.
- Example: if you purchase a 50-credit Plus Pack and use 1 credit, the remaining 49 credits are not refundable.

C) Credit Validity and Expiration:
- Purchased credits are valid for 3 months from the purchase date.
- Expired credits cannot be refunded, extended, or restored.
- No reminder emails are sent before expiration.

D) Credit Usage Tracking:
- Credits are deducted at the time the service is requested, not when it completes.
- Automatic credit restoration — if a reading fails due to a system issue on our side, including:
  • LLM provider unavailable or rate-limited
  • Generation error or empty/invalid AI response
  • Both participants' generations failing in a couple/compatibility reading (both deducted credits are restored)
  the consumed credit(s) are returned to your balance automatically. No support request is needed.
- Credits consumed due to user error (incomplete input, refreshing the page before submitting, abandoning the session, etc.) are not restored.
- Credits used on a reading that you disagree with, find unsatisfactory, or interpret differently are not restored — see Section 3.`,
    bodyKo: `크레딧 팩 종류: 미니, 스탠다드, 플러스, 메가, 얼티밋 등 다양한 수량과 가격의 크레딧 팩을 제공합니다.

중요 - 크레딧 팩 환불 정책:

A) 미사용 크레딧 (구매 후 7일 이내):
- 크레딧을 하나도 사용하지 않은 경우에만 환불이 가능합니다.
- 환불 요청은 구매일로부터 7일 이내에 접수해 주셔야 합니다.
- 7일이 지난 후에는 사용하지 않은 크레딧도 환불되지 않습니다.
- 환불 시 결제수수료(약 3.5% + ₩300)는 차감 후 환불됩니다. 이는 Stripe 등 결제대행사가 환불 시
  돌려주지 않는 비용으로, 부득이한 비용(전자상거래법 제17조 단서)에 해당합니다.

B) 일부 사용한 크레딧:
- 크레딧을 하나라도 사용한 팩은 환불되지 않습니다.
- 단 1개라도 사용하면 해당 팩 전체가 환불 대상에서 제외됩니다.
- 예시: 50크레딧 플러스팩을 구매한 후 1개를 사용했다면, 남은 49개에 대해서도 환불받을 수 없습니다.

C) 크레딧 유효기간 및 만료:
- 구매한 크레딧은 구매일로부터 3개월간 유효합니다.
- 만료된 크레딧은 환불·연장·복구할 수 없습니다.
- 만료 전 별도의 알림 이메일은 발송되지 않습니다.

D) 크레딧 사용 추적:
- 크레딧은 서비스 완료 시점이 아닌 요청 시점에 차감됩니다.
- 자동 크레딧 복구 — 다음과 같이 당사 시스템 측 문제로 리딩이 실패한 경우 차감된 크레딧이 자동으로 잔액에 복구되며, 별도 문의는 필요하지 않습니다:
  • LLM 공급자 비가용 또는 호출 제한
  • 생성 오류 또는 빈/유효하지 않은 AI 응답
  • 커플/궁합 리딩에서 양측 생성이 모두 실패한 경우 (차감된 두 크레딧 모두 복구)
- 사용자 측 오류(입력 미완료, 제출 전 페이지 새로고침, 세션 이탈 등)로 소진된 크레딧은 복구되지 않습니다.
- 결과에 동의하지 않거나 만족스럽지 않은 리딩, 해석이 다르다고 느끼는 리딩에 사용된 크레딧은 복구되지 않습니다 — 제3조 참조.`,
  },
  {
    id: 'ai-reading-no-refunds',
    title: '3. AI Reading Services - No Refunds',
    titleKo: '3. AI 리딩 서비스 - 환불 불가',
    body: `IMPORTANT: AI reading outputs are final and non-refundable once generated.

This applies to AI-generated outputs across our main products, including the Destiny Counselor, Tarot Counselor, Compatibility analysis, and Fortune Calendar insights.

Reason: these services involve immediate AI computation and delivery of personalized digital content. Once the output has been generated, the service is considered fully rendered.

No refunds are issued for:
- Readings you disagree with or find inaccurate
- Readings you did not fully read or understand
- Readings based on incorrect birth information that you provided
- Duplicate readings requested by mistake
- Accidental purchases (please review carefully before confirming)

By using our reading services, you acknowledge that:
1. AI readings are provided for entertainment and self-reflection purposes.
2. Results may vary and are subject to interpretation.
3. You accept the reading as-is once it has been generated.`,
    bodyKo: `중요: AI 리딩 결과물은 생성 즉시 최종 제공되며 환불되지 않습니다.

이 원칙은 운명 상담사, 타로 상담사, 궁합 분석, 일·월·년 운세 캘린더 인사이트를 포함한 당사의 주요 AI 결과물 전반에 적용됩니다.

이유: 본 서비스는 즉각적인 AI 연산과 맞춤형 디지털 콘텐츠 제공이 핵심이며, 결과가 생성된 시점에 서비스 제공이 완료된 것으로 간주됩니다.

다음의 경우에는 환불되지 않습니다:
- 결과에 동의하지 않거나 부정확하다고 생각되는 리딩
- 끝까지 읽지 않았거나 이해하지 못한 리딩
- 귀하가 잘못 입력한 생년월일 정보를 바탕으로 생성된 리딩
- 실수로 중복 요청한 리딩
- 실수로 결제한 구매 (결제 확정 전 반드시 확인해 주세요)

리딩 서비스를 이용함으로써 귀하는 다음 사항에 동의한 것으로 간주됩니다:
1. AI 리딩은 오락 및 자기 성찰 목적으로 제공됩니다.
2. 결과는 사람마다 다를 수 있으며 해석의 여지가 있습니다.
3. 생성된 리딩을 있는 그대로 수용합니다.`,
  },
  {
    id: 'exceptions',
    title: '4. Limited Refund Exceptions',
    titleKo: '4. 제한적 환불 예외 사항',
    body: `Refunds will only be considered in the following exceptional cases:

A) Duplicate Charges:
- Multiple charges for the same transaction due to a technical error
- Proof required: bank statement showing the duplicate charges
- Must be reported within 7 days of the charge

B) Unauthorized Transactions:
- Payments made without your authorization
- Subject to fraud investigation (may take 30+ days)
- False claims will result in account termination and legal action.

C) Complete Service Failure:
- The service entirely failed to deliver due to a technical issue on our side
- Must be reported within 48 hours
- We will first attempt to resolve the issue before processing a refund.
- Partial service delivery does not qualify.

D) Processing Time:
- Approved refunds: 5-10 business days (depending on the card issuer; international cards may take slightly longer)
- Refund method: original payment method only
- Currency: original currency (exchange-rate differences are not compensated)
- Payment-processor fees (e.g., Stripe) are non-refundable and are deducted from the refund amount.

To request an exception refund, email ${SUPPORT_EMAIL} with:
- Account email
- Transaction ID or receipt
- Bank statement (for duplicate charges)
- Detailed explanation
- Screenshots, if applicable

We reserve the right to deny any request that does not meet these criteria.`,
    bodyKo: `다음의 예외적인 경우에 한해 환불을 검토합니다:

A) 중복 청구:
- 기술적 오류로 동일 거래에 대해 여러 번 청구된 경우
- 필요 증빙: 중복 청구가 표시된 은행 명세서
- 청구일로부터 7일 이내에 신고해 주셔야 합니다.

B) 무단 거래:
- 귀하의 승인 없이 이루어진 결제
- 사기 조사 대상이며 30일 이상 소요될 수 있습니다.
- 허위 신고가 확인될 경우 계정 해지 및 법적 조치가 이루어질 수 있습니다.

C) 완전한 서비스 실패:
- 당사의 기술적 문제로 서비스가 전혀 제공되지 않은 경우
- 48시간 이내에 신고해 주셔야 합니다.
- 환불 처리에 앞서 먼저 문제 해결을 시도합니다.
- 부분적으로라도 서비스가 제공된 경우에는 해당되지 않습니다.

D) 처리 시간:
- 승인된 환불: 영업일 기준 5-10일 소요됩니다 (카드사 처리 일정에 따라 다르며, 해외 결제의 경우 조금 더 걸릴 수 있습니다).
- 환불 방법: 원래 결제 수단으로만 처리됩니다.
- 통화: 원래 결제된 통화로 환불되며, 환율 차이는 보상되지 않습니다.
- 결제 처리 수수료(예: Stripe)는 환불되지 않으며, 환불 금액에서 차감됩니다.

예외 환불 요청 — ${SUPPORT_EMAIL}로 다음 내용을 함께 보내주세요:
- 계정 이메일
- 거래 ID 또는 영수증
- 은행 명세서 (중복 청구의 경우)
- 상세 사유 설명
- 관련 스크린샷 (해당하는 경우)

위 기준을 충족하지 않는 요청은 거부될 수 있습니다.`,
  },
  {
    id: 'chargebacks',
    title: '5. Chargebacks and Fraud Prevention',
    titleKo: '5. 지불거절(차지백) 및 사기 방지',
    strict: true,
    body: `IMPORTANT: please contact us before disputing charges with your bank.

Chargeback consequences:
- Immediate account suspension
- Permanent ban from all services
- Collection action for valid charges
- Legal action for fraudulent chargebacks
- Reporting to fraud-prevention networks

Friendly fraud warning:
Filing a chargeback for a legitimate purchase you made is considered fraud. We maintain detailed logs of:
- Account activity and IP addresses
- Service-delivery confirmations
- Credit-consumption records
- Device fingerprints

These records will be provided to your bank and, if necessary, to law enforcement.

Proper dispute process:
1. Contact ${SUPPORT_EMAIL} first.
2. Provide transaction details.
3. Allow 48 hours for a response.
4. Work with us to resolve the issue.
5. Only dispute with your bank if we fail to respond.

Good-faith resolution:
We are committed to fair resolution. Most issues can be resolved through direct communication, without involving banks or legal action.`,
    bodyKo: `중요: 은행에 이의를 제기하기 전에 먼저 당사에 연락해 주세요.

차지백 신청 시 결과:
- 즉시 계정 정지
- 모든 서비스에서 영구 차단
- 유효한 청구에 대한 추심 조치
- 사기성 차지백에 대한 법적 조치
- 사기 방지 네트워크에 신고 등록

프렌들리 프로드(Friendly Fraud) 경고:
정당하게 결제한 구매에 대해 차지백을 신청하는 행위는 사기로 간주됩니다. 당사는 다음과 같은 상세 기록을 보관합니다:
- 계정 활동 및 IP 주소
- 서비스 제공 확인 내역
- 크레딧 소비 기록
- 기기 지문(Device Fingerprint)

이러한 기록은 귀하의 은행에 제공되며, 필요한 경우 법 집행 기관에도 제출됩니다.

올바른 이의 제기 절차:
1. 먼저 ${SUPPORT_EMAIL}로 연락해 주세요.
2. 거래 세부 정보를 제공해 주세요.
3. 답변을 받으실 때까지 48시간 정도 기다려 주세요.
4. 문제 해결을 위해 당사와 협력해 주세요.
5. 당사가 응답하지 않는 경우에 한해 은행에 이의를 제기해 주세요.

선의의 해결:
당사는 공정한 해결을 위해 노력합니다. 대부분의 문제는 은행이나 법적 절차 없이 직접 소통을 통해 해결할 수 있습니다.`,
  },
  {
    id: 'termination',
    title: '6. Account Termination and Forfeiture',
    titleKo: '6. 계정 해지 및 권리 상실',
    strict: true,
    body: `Voluntary account deletion:
- Unused credits are forfeited when you delete your account.
- No refund is issued for the remaining credits.
- This action is irreversible.

Termination by DestinyPal:
If your account is terminated for a policy violation:
- All credits are immediately forfeited.
- No refund of any kind will be issued.

Inactivity:
- Accounts inactive for 2 or more years may be deleted.
- Credits and data cannot be recovered after deletion.
- We recommend using all of your credits before any extended absence.`,
    bodyKo: `자발적 계정 삭제:
- 계정을 삭제하면 미사용 크레딧은 소멸됩니다.
- 남은 크레딧에 대한 환불은 제공되지 않습니다.
- 이 작업은 되돌릴 수 없습니다.

DestinyPal에 의한 해지:
정책 위반으로 계정이 해지된 경우:
- 모든 크레딧이 즉시 소멸됩니다.
- 어떠한 형태의 환불도 제공되지 않습니다.

장기 미사용:
- 2년 이상 활동이 없는 계정은 삭제될 수 있습니다.
- 삭제 후에는 크레딧과 데이터를 복구할 수 없습니다.
- 장기간 이용하지 않으실 예정이라면 미리 크레딧을 모두 사용하시기를 권장합니다.`,
  },
  {
    id: 'price-changes',
    title: '7. Price Changes',
    titleKo: '7. 가격 변경',
    body: `Price modifications:
- We may change prices at any time.
- New prices apply only to purchases made after the change takes effect.

No price protection:
- Credit packs are billed at the price shown at checkout.
- No refund or additional credits will be issued if prices drop later.
- No retroactive discounts apply to previously purchased packs.`,
    bodyKo: `가격 변경:
- 당사는 언제든지 가격을 변경할 수 있습니다.
- 변경된 가격은 변경 시점 이후의 구매에만 적용됩니다.

가격 보호 없음:
- 크레딧 팩은 결제 시점에 표시된 가격으로 청구됩니다.
- 이후 가격이 인하되더라도 환불이나 추가 크레딧이 제공되지 않습니다.
- 이미 구매한 팩에 대해서는 소급 할인이 적용되지 않습니다.`,
  },
  {
    id: 'consumer-rights',
    title: '8. Consumer Rights by Region',
    titleKo: '8. 지역별 소비자 권리',
    body: `Korean Consumers (대한민국):
- Per the Korean Act on Consumer Protection in Electronic Commerce (전자상거래법) §17 ②항 5호, the right of withdrawal for digital content is limited once provision has begun
- Before content delivery starts: withdrawal possible within 7 days of purchase
- After content delivery starts: withdrawal is restricted by law
- The 7-day refund window in this policy goes beyond the statutory minimum as a voluntary courtesy (limited to unused credit packs)

Minor protection (민법 §5): purchases made by a minor without legal-guardian consent may be revoked by the guardian. Contact ${SUPPORT_EMAIL} with proof of guardianship and the transaction ID.

Dispute resolution channels for Korean residents:
- Korea Consumer Agency (한국소비자원) — 1372 consumer counseling: kca.go.kr
- Consumer Dispute Mediation Committee (소비자분쟁조정위원회): ccn.go.kr
- Korea Fair Trade Commission (공정거래위원회) — ftc.go.kr

EU Consumers:
- Digital content: 14-day withdrawal right does not apply once download/streaming begins with consumer consent
- By purchasing, you consent to immediate delivery and waive withdrawal right

US Consumers:
- Varies by state
- We comply with applicable state consumer protection laws
- California residents: Additional rights under CCPA

Other Jurisdictions:
- Local mandatory consumer protection laws apply
- This policy does not limit your statutory rights`,
    bodyKo: `대한민국 소비자:
- 전자상거래법 제17조 ②항 5호에 따라 디지털 콘텐츠는 제공이 개시된 이후 청약철회가 제한됩니다.
- 콘텐츠 제공 시작 전: 구매 후 7일 이내 청약철회 가능
- 콘텐츠 제공 시작 후: 법령상 청약철회 제한
- 본 정책의 7일 환불 보장(미사용 크레딧 팩 한정)은 법적 의무를 초과하는 자발적 혜택입니다.

미성년자 보호 (민법 제5조): 미성년자가 법정대리인의 동의 없이 한 결제는 법정대리인이 취소할 수 있습니다. ${SUPPORT_EMAIL} 으로 보호자 관계 증빙 및 거래 ID 와 함께 요청해 주세요.

분쟁 해결 안내 (한국 거주자):
- 한국소비자원 1372 소비자상담센터: kca.go.kr
- 소비자분쟁조정위원회: ccn.go.kr
- 공정거래위원회: ftc.go.kr

EU 소비자:
- 디지털 콘텐츠는 소비자의 동의 하에 다운로드 또는 스트리밍이 시작되면 14일 철회권이 적용되지 않습니다.
- 구매 시 즉시 제공에 동의하고 철회권을 포기하시는 것으로 간주됩니다.

미국 소비자:
- 적용되는 규정은 주마다 다릅니다.
- 당사는 해당 주의 소비자 보호법을 준수합니다.
- 캘리포니아 거주자: CCPA에 따른 추가 권리가 보장됩니다.

기타 관할권:
- 현지의 강행 소비자 보호법이 적용됩니다.
- 본 정책은 귀하의 법적 권리를 제한하지 않습니다.`,
  },
  {
    id: 'contact',
    title: '9. Contact Information',
    titleKo: '9. 연락처',
    body: `For refund requests and billing inquiries:

Email: ${SUPPORT_EMAIL}
Response Time: within 2 business days. Privacy-related requests are handled within 10 days per the Korean Personal Information Protection Act.

Related pages:
- Contact (/contact) — general inquiry routing
- Privacy Policy §12 (/policy/privacy) — Privacy Officer and complaint channels
- Terms of Service (/policy/terms) — business operator information (전상법 §13)

Required Information for Refund Requests:
- Account email address
- Transaction ID or Stripe receipt
- Purchase date
- Reason for refund request
- Number of credits used (if applicable)
- Bank statement for duplicate charge claims

Please allow full processing time before following up.
Keep all receipts and confirmation emails for your records.`,
    bodyKo: `환불 요청 및 결제 문의:

이메일: ${SUPPORT_EMAIL}
응답 시간: 영업일 기준 2일 이내에 회신드립니다. 개인정보 관련 요청은 개인정보 보호법에 따라 10일 이내에 처리합니다.

관련 페이지:
- 문의하기 (/contact) — 일반 문의 라우팅
- 개인정보처리방침 §12 (/policy/privacy) — 개인정보 보호책임자 및 권익침해 신고
- 이용약관 (/policy/terms) — 사업자 정보 (전자상거래법 §13)

환불 요청 시 필요 정보:
- 계정 이메일 주소
- 거래 ID 또는 Stripe 영수증
- 구매 날짜
- 환불 요청 사유
- 사용한 크레딧 수 (해당하는 경우)
- 중복 청구를 주장하는 경우 은행 명세서

후속 문의는 처리 기간이 모두 경과한 뒤에 보내주시기 바랍니다.
모든 영수증과 확인 이메일은 기록을 위해 보관해 주세요.`,
  },
]

export default function RefundPage() {
  return (
    <PolicyDocument
      titleKey="policy.refund.title"
      titleFallbackEn="Refund and Payment Policy"
      titleFallbackKo="환불 및 결제 정책"
      effectiveKey="policy.refund.effective"
      effectiveDate={EFFECTIVE_DATE}
      footerKey="policy.refund.footer"
      contactEmail={SUPPORT_EMAIL}
      sections={sections}
      quickSummary={QUICK_SUMMARY}
    />
  )
}
