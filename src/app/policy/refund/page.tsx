"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "../policy.module.css";

type Section = { title: string; titleKo: string; body: string; bodyKo: string };

const PSP_NAME = "Stripe";
const CONTACT_EMAIL = "rheeco88@gmail.com";
const EFFECTIVE_DATE = "2025-12-16";

const sections: Section[] = [
  {
    title: "1. Overview",
    titleKo: "1. 개요",
    body: `This Refund and Payment Policy governs all purchases made through DestinyPal, including subscriptions and credit packs. By making a purchase, you agree to these terms. All payments are processed securely through ${PSP_NAME}, a PCI-DSS Level 1 certified payment processor.`,
    bodyKo: `본 환불 및 결제 정책은 구독 및 크레딧 팩을 포함하여 DestinyPal을 통해 이루어지는 모든 구매에 적용됩니다. 구매를 완료함으로써 귀하는 본 약관에 동의하게 됩니다. 모든 결제는 PCI-DSS Level 1 인증 결제 처리업체인 ${PSP_NAME}을 통해 안전하게 처리됩니다.`
  },
  {
    title: "2. Credit Pack Purchases",
    titleKo: "2. 크레딧 팩 구매",
    body: `Credit Pack Types: We offer various credit packs (Mini, Standard, Plus, Mega, Ultimate) with different quantities and pricing.

IMPORTANT - Credit Pack Refund Policy:

A) UNUSED Credits (within 7 days of purchase):
- Full refund available ONLY if zero (0) credits have been used
- Refund request must be made within 7 days of purchase date
- After 7 days, unused credits are NON-REFUNDABLE

B) PARTIALLY USED Credits:
- NO REFUND for partially used credit packs
- Once even 1 credit has been consumed, the entire pack becomes non-refundable
- Example: If you purchase a 30-credit Plus Pack and use 1 credit, you cannot receive any refund for the remaining 29 credits

C) Credit Validity and Expiration:
- Purchased credits are valid for 1 year from purchase date
- Expired credits cannot be refunded, extended, or restored
- No reminder emails will be sent before expiration

D) Credit Usage Tracking:
- Credits are consumed at the time of service request, not service completion
- If a reading fails due to technical issues on our end, the credit will be automatically restored
- Credits consumed due to user error (incomplete input, page refresh, etc.) are NOT restored`,
    bodyKo: `크레딧 팩 종류: 미니, 스탠다드, 플러스, 메가, 얼티밋 등 다양한 수량과 가격의 크레딧 팩을 제공합니다.

중요 - 크레딧 팩 환불 정책:

A) 미사용 크레딧 (구매 후 7일 이내):
- 크레딧을 단 한 개도(0개) 사용하지 않은 경우에만 전액 환불 가능
- 환불 요청은 구매일로부터 7일 이내에 해야 함
- 7일 이후에는 미사용 크레딧도 환불 불가

B) 부분 사용된 크레딧:
- 일부라도 사용한 크레딧 팩은 환불 불가
- 크레딧 1개라도 사용하면 전체 팩이 환불 불가능
- 예시: 30크레딧 플러스팩 구매 후 1개 사용 시, 남은 29개에 대해 환불받을 수 없음

C) 크레딧 유효기간 및 만료:
- 구매한 크레딧은 구매일로부터 1년간 유효
- 만료된 크레딧은 환불, 연장 또는 복구 불가
- 만료 전 알림 이메일이 발송되지 않음

D) 크레딧 사용 추적:
- 크레딧은 서비스 완료 시점이 아닌 요청 시점에 차감됨
- 당사의 기술적 문제로 리딩이 실패한 경우 크레딧이 자동 복구됨
- 사용자 오류(입력 미완료, 페이지 새로고침 등)로 소진된 크레딧은 복구되지 않음`
  },
  {
    title: "3. Subscription Refund Policy",
    titleKo: "3. 구독 환불 정책",
    body: `Subscription Plans: We offer Starter, Pro, and Premium subscription plans with monthly and annual billing options.

A) New Subscription - 7 Day Guarantee:
- Full refund available within 7 days of initial subscription purchase
- This applies ONLY to first-time subscribers
- If you've used any premium features during this period, refund amount may be prorated
- Monthly credits used will be deducted at the Mini Pack rate (₩633/credit) from the refund

B) Subscription Renewal:
- Renewal charges are NON-REFUNDABLE
- Cancel at least 24 hours before renewal to avoid charges
- Once renewed, you must wait until the end of the billing period

C) Subscription Cancellation:
- You may cancel anytime through account settings
- No refund for remaining period after cancellation
- Access continues until the end of the paid billing period
- Monthly credits do not carry over after cancellation

D) Annual Subscription Early Termination:
- No partial refunds for annual subscriptions
- By choosing annual billing, you commit to the full year
- Cancellation stops future renewal but does not refund remaining months`,
    bodyKo: `구독 플랜: 스타터, 프로, 프리미엄 구독 플랜을 월간 및 연간 결제 옵션으로 제공합니다.

A) 신규 구독 - 7일 보장:
- 최초 구독 구매 후 7일 이내 전액 환불 가능
- 이는 최초 구독자에게만 적용됨
- 이 기간 동안 프리미엄 기능을 사용한 경우 환불액이 비례 차감될 수 있음
- 사용한 월간 크레딧은 미니팩 기준 가격(₩633/크레딧)으로 환불액에서 차감됨

B) 구독 갱신:
- 갱신 결제는 환불 불가
- 요금 청구를 피하려면 갱신 최소 24시간 전에 취소해야 함
- 갱신된 후에는 결제 기간 종료까지 기다려야 함

C) 구독 취소:
- 계정 설정에서 언제든지 취소 가능
- 취소 후 남은 기간에 대한 환불 없음
- 결제된 청구 기간이 끝날 때까지 접근 유지
- 취소 후 월간 크레딧은 이월되지 않음

D) 연간 구독 조기 해지:
- 연간 구독에 대한 부분 환불 없음
- 연간 결제를 선택하면 1년 전체에 대한 약정임
- 취소는 향후 갱신을 중지하지만 남은 개월에 대한 환불은 없음`
  },
  {
    title: "4. AI Reading Services - No Refunds",
    titleKo: "4. AI 리딩 서비스 - 환불 불가",
    body: `IMPORTANT: All AI reading services are FINAL and NON-REFUNDABLE once generated.

This includes:
- Destiny Map analysis
- Saju (Four Pillars) readings
- Tarot card readings
- Astrology chart interpretations
- Dream analysis
- I Ching readings
- Numerology reports
- Compatibility analyses

Reason: Our services involve immediate AI computation and delivery of personalized digital content. Once generated, the service has been fully rendered.

No Refunds For:
- Readings you disagree with or find inaccurate
- Readings you didn't fully read or understand
- Readings based on incorrect birth information you provided
- Duplicate readings requested by mistake
- Accidental purchases (please review before confirming)

By using our reading services, you acknowledge:
1. AI readings are for entertainment and self-reflection purposes
2. Results may vary and are subject to interpretation
3. You accept the reading as-is upon generation`,
    bodyKo: `중요: 모든 AI 리딩 서비스는 생성된 후 최종이며 환불이 불가합니다.

해당 서비스:
- 운명 지도 분석
- 사주(명리) 리딩
- 타로 카드 리딩
- 점성술 차트 해석
- 해몽 분석
- 주역 리딩
- 수비학 리포트
- 궁합 분석

이유: 당사 서비스는 즉각적인 AI 연산과 맞춤형 디지털 콘텐츠 제공을 포함합니다. 생성된 후에는 서비스가 완전히 제공된 것으로 간주됩니다.

다음의 경우 환불 불가:
- 동의하지 않거나 부정확하다고 생각되는 리딩
- 완전히 읽지 않았거나 이해하지 못한 리딩
- 귀하가 제공한 잘못된 생년월일 정보 기반 리딩
- 실수로 요청한 중복 리딩
- 실수로 한 구매 (확인 전 검토 바람)

리딩 서비스 이용 시 귀하는 다음을 인정합니다:
1. AI 리딩은 오락 및 자기 성찰 목적임
2. 결과는 다를 수 있으며 해석의 여지가 있음
3. 생성 시 리딩을 있는 그대로 수락함`
  },
  {
    title: "5. Limited Refund Exceptions",
    titleKo: "5. 제한적 환불 예외 사항",
    body: `Refunds will ONLY be considered in these exceptional cases:

A) Duplicate Charges:
- Multiple charges for the same transaction due to technical error
- Proof required: Bank statement showing duplicate charges
- Must report within 7 days of charge

B) Unauthorized Transactions:
- Payment made without your authorization
- Subject to fraud investigation (may take 30+ days)
- False claims will result in account termination and legal action

C) Complete Service Failure:
- Service entirely failed to deliver due to our technical issues
- Must be reported within 48 hours
- We will first attempt to resolve the issue before processing refund
- Partial service delivery does not qualify

D) Processing Time:
- Approved refunds: 7-10 business days
- Refund method: Original payment method only
- Currency: Original currency (exchange rate differences not compensated)

To Request Exception Refund - Email ${CONTACT_EMAIL} with:
- Account email
- Transaction ID/receipt
- Bank statement (for duplicate charges)
- Detailed explanation
- Screenshots if applicable

We reserve the right to deny any request not meeting these criteria.`,
    bodyKo: `다음의 예외적인 경우에만 환불이 고려됩니다:

A) 중복 청구:
- 기술적 오류로 동일 거래에 대해 여러 번 청구된 경우
- 필요 증빙: 중복 청구가 표시된 은행 명세서
- 청구 후 7일 이내 신고해야 함

B) 무단 거래:
- 귀하의 승인 없이 이루어진 결제
- 사기 조사 대상 (30일 이상 소요될 수 있음)
- 허위 신고 시 계정 해지 및 법적 조치

C) 완전한 서비스 실패:
- 당사의 기술적 문제로 서비스가 전혀 제공되지 않은 경우
- 48시간 이내에 신고해야 함
- 환불 처리 전 문제 해결을 먼저 시도함
- 부분적 서비스 제공은 해당되지 않음

D) 처리 시간:
- 승인된 환불: 영업일 기준 7-10일
- 환불 방법: 원래 결제 수단으로만 가능
- 통화: 원래 통화 (환율 차이 보상 없음)

예외 환불 요청 - ${CONTACT_EMAIL}로 이메일:
- 계정 이메일
- 거래 ID/영수증
- 은행 명세서 (중복 청구의 경우)
- 상세 설명
- 해당되는 경우 스크린샷

위 기준을 충족하지 않는 요청은 거부될 수 있습니다.`
  },
  {
    title: "6. Chargebacks and Fraud Prevention",
    titleKo: "6. 지불거절(차지백) 및 사기 방지",
    body: `IMPORTANT: Contact us before disputing charges with your bank.

Chargeback Consequences:
- Immediate account suspension
- Permanent ban from all services
- Collection action for valid charges
- Legal action for fraudulent chargebacks
- Reporting to fraud prevention networks

Friendly Fraud Warning:
Filing a chargeback for a legitimate purchase you made is considered fraud. We maintain detailed logs of:
- Account activity and IP addresses
- Service delivery confirmations
- Credit consumption records
- Device fingerprints

These records will be provided to your bank and, if necessary, law enforcement.

Proper Dispute Process:
1. Contact ${CONTACT_EMAIL} first
2. Provide transaction details
3. Allow 48 hours for response
4. Work with us to resolve the issue
5. Only dispute with bank if we fail to respond

Good Faith Resolution:
We are committed to fair resolution. Most issues can be resolved through direct communication without involving banks or legal action.`,
    bodyKo: `중요: 은행에 이의를 제기하기 전에 먼저 저희에게 연락하세요.

차지백 시 결과:
- 즉시 계정 정지
- 모든 서비스에서 영구 차단
- 유효한 청구에 대한 추심 조치
- 사기성 차지백에 대한 법적 조치
- 사기 방지 네트워크에 보고

프렌들리 프로드(Friendly Fraud) 경고:
귀하가 한 정당한 구매에 대해 차지백을 신청하는 것은 사기로 간주됩니다. 당사는 다음의 상세 기록을 유지합니다:
- 계정 활동 및 IP 주소
- 서비스 제공 확인
- 크레딧 소비 기록
- 기기 지문

이러한 기록은 귀하의 은행에 제공되며, 필요시 법 집행 기관에도 제공됩니다.

올바른 이의 제기 절차:
1. 먼저 ${CONTACT_EMAIL}로 연락
2. 거래 세부 정보 제공
3. 답변까지 48시간 대기
4. 문제 해결을 위해 저희와 협력
5. 저희가 응답하지 않는 경우에만 은행에 이의 제기

선의의 해결:
당사는 공정한 해결을 위해 노력합니다. 대부분의 문제는 은행이나 법적 조치 없이 직접 소통을 통해 해결할 수 있습니다.`
  },
  {
    title: "7. Account Termination and Forfeiture",
    titleKo: "7. 계정 해지 및 권리 상실",
    body: `Voluntary Account Deletion:
- Unused credits are forfeited upon account deletion
- Active subscriptions must be canceled before deletion
- No refund for remaining credits or subscription time
- This action is irreversible

Termination by DestinyPal:
If your account is terminated for policy violation:
- All credits are immediately forfeited
- No refund of any kind will be issued
- Active subscriptions are terminated without refund

Inactivity:
- Accounts inactive for 2+ years may be deleted
- Credits and data are not recoverable after deletion
- We recommend using all credits before extended absence`,
    bodyKo: `자발적 계정 삭제:
- 미사용 크레딧은 계정 삭제 시 소멸됨
- 활성 구독은 삭제 전에 취소해야 함
- 남은 크레딧이나 구독 기간에 대한 환불 없음
- 이 작업은 되돌릴 수 없음

DestinyPal에 의한 해지:
정책 위반으로 계정이 해지된 경우:
- 모든 크레딧이 즉시 소멸됨
- 어떠한 종류의 환불도 이루어지지 않음
- 활성 구독이 환불 없이 해지됨

비활성:
- 2년 이상 비활성 계정은 삭제될 수 있음
- 삭제 후 크레딧과 데이터는 복구 불가
- 장기 부재 전 모든 크레딧 사용 권장`
  },
  {
    title: "8. Price Changes and Grandfathering",
    titleKo: "8. 가격 변경 및 기존 가격 유지",
    body: `Price Modifications:
- We may change prices at any time
- New prices apply immediately to new purchases
- Existing subscribers: 30 days advance notice

No Price Protection:
- Credit packs purchased are based on pricing at time of purchase
- No refund or additional credits if prices drop later
- No retroactive discounts

Annual Subscription Lock:
- Annual subscribers keep their rate until renewal
- Price changes apply at next renewal date`,
    bodyKo: `가격 변경:
- 당사는 언제든지 가격을 변경할 수 있음
- 새 가격은 신규 구매에 즉시 적용됨
- 기존 구독자: 30일 전 사전 통지

가격 보호 없음:
- 구매한 크레딧 팩은 구매 시점의 가격 기준
- 이후 가격 인하 시 환불이나 추가 크레딧 없음
- 소급 할인 없음

연간 구독 가격 고정:
- 연간 구독자는 갱신 시까지 현재 가격 유지
- 가격 변경은 다음 갱신일에 적용됨`
  },
  {
    title: "9. Consumer Rights by Region",
    titleKo: "9. 지역별 소비자 권리",
    body: `Korean Consumers (대한민국):
- 전자상거래법에 따라 디지털 콘텐츠는 제공 시작 후 청약철회가 제한됩니다
- 콘텐츠 제공 시작 전: 7일 이내 청약철회 가능
- 콘텐츠 제공 시작 후: 청약철회 불가
- 본 정책의 7일 환불 보장은 법적 의무를 초과하는 자발적 혜택입니다

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
- 전자상거래법에 따라 디지털 콘텐츠는 제공 시작 후 청약철회가 제한됩니다
- 콘텐츠 제공 시작 전: 7일 이내 청약철회 가능
- 콘텐츠 제공 시작 후: 청약철회 불가
- 본 정책의 7일 환불 보장은 법적 의무를 초과하는 자발적 혜택입니다

EU 소비자:
- 디지털 콘텐츠: 소비자 동의 하에 다운로드/스트리밍이 시작되면 14일 철회권이 적용되지 않음
- 구매 시 즉시 제공에 동의하고 철회권을 포기함

미국 소비자:
- 주마다 다름
- 해당 주의 소비자 보호법을 준수함
- 캘리포니아 거주자: CCPA에 따른 추가 권리

기타 관할권:
- 현지 강행 소비자 보호법 적용
- 본 정책은 귀하의 법적 권리를 제한하지 않음`
  },
  {
    title: "10. Contact Information",
    titleKo: "10. 연락처",
    body: `For refund requests and billing inquiries:

Email: ${CONTACT_EMAIL}
Response Time: Within 48 business hours

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

이메일: ${CONTACT_EMAIL}
응답 시간: 영업일 기준 48시간 이내

환불 요청 시 필요 정보:
- 계정 이메일 주소
- 거래 ID 또는 Stripe 영수증
- 구매 날짜
- 환불 요청 사유
- 사용한 크레딧 수 (해당되는 경우)
- 중복 청구 주장의 경우 은행 명세서

후속 문의 전 전체 처리 시간을 기다려 주세요.
모든 영수증과 확인 이메일을 기록으로 보관하세요.`
  },
];

function SectionView({ s, isKo }: { s: Section; isKo: boolean }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{isKo ? s.titleKo : s.title}</h2>
      <pre className={styles.sectionBody}>{isKo ? s.bodyKo : s.body}</pre>
    </section>
  );
}

export default function RefundPage() {
  const { t, locale } = useI18n();
  const isKo = locale === "ko";

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {isKo ? "환불 및 결제 정책" : "Refund and Payment Policy"}
            </h1>
            <p className={styles.effectiveDate}>
              {isKo ? "시행일" : "Effective date"}: {EFFECTIVE_DATE}
            </p>
          </div>
          <div className={styles.content}>
            {sections.map((s: Section, i: number) => (
              <SectionView key={`${s.title}-${i}`} s={s} isKo={isKo} />
            ))}
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {isKo ? "부칙" : "Addendum"}: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>
      </div>
      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </div>
  );
}
