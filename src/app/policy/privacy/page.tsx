'use client'

import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { SUPPORT_EMAIL } from '@/lib/config/contact'
import styles from '../policy.module.css'

type Section = { title: string; titleKo: string; body: string; bodyKo: string }

const CONTROLLER_NAME = 'Paul Rhee (individual)'
// [TODO 사장님: 개인정보 보호책임자 (CPO) 성명·직책·전화번호로 교체]
const CPO_NAME = 'Paul Rhee'
const CPO_TITLE = 'Privacy Officer / Operator'
const CPO_PHONE = '[TODO: +82-10-XXXX-XXXX]'
const EFFECTIVE_DATE = '2026-05-27'

const sections: Section[] = [
  {
    title: '1. Overview',
    titleKo: '1. 개요',
    body: "DestinyPal ('we', 'us', 'our') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information. We aim to comply with applicable laws including PIPA (Korea), GDPR (EU), CCPA (California), and other relevant regulations.",
    bodyKo:
      'DestinyPal(“당사”)는 개인정보 보호를 최우선으로 합니다. 본 개인정보처리방침은 정보를 어떻게 수집·이용·공개·보호하는지 설명하며, 한국 개인정보보호법, EU GDPR, 캘리포니아 CCPA 등 적용 법령 준수를 목표로 합니다.',
  },
  {
    title: '2. Information We Collect',
    titleKo: '2. 수집하는 정보',
    body: 'Account: Google OAuth profile (email, display name, profile image). We do NOT collect or store passwords — authentication is exclusively via Google OAuth.\nAuthentication: OAuth tokens encrypted at rest; used only to maintain your login session.\nPayment: Transaction IDs and billing info processed by Stripe; we never store full card numbers.\nService Data: Birth date/time/location and inputs you provide for astrology, saju, tarot, and other readings; chat/reading messages exchanged with the AI counselors and the AI-generated responses are stored to keep your history. If you submit information about another person (e.g., birth information of a partner for compatibility or couple readings, or shared session data), you confirm that you have obtained their informed consent for us to receive and process such information.\nUploaded Images: Profile and matching photos you choose to upload are stored on Firebase Storage.\nAI Model Training: We do NOT use your inputs or AI responses to train AI models. The Anthropic Claude API used for readings is operated under a commercial agreement that excludes API customer data from training.\nTechnical: IP, browser/device info, OS, cookies, logs.\nCommunications: Support tickets, feedback, correspondence.',
    bodyKo:
      '계정: Google OAuth 프로필 정보(이메일, 표시 이름, 프로필 이미지). **별도의 비밀번호는 수집·저장하지 않습니다** — 인증은 Google OAuth 만 사용합니다.\n인증: OAuth 토큰은 저장 시 암호화되며, 로그인 세션 유지 목적으로만 사용합니다.\n결제: Stripe가 처리하는 거래 ID 및 청구 정보. 카드 전체 번호는 저장하지 않습니다.\n서비스 데이터: 점성/사주/타로 등 리딩을 위한 생년월일·시간·장소 및 사용자 입력 정보, AI 상담사와 주고받은 채팅·리딩 메시지 및 AI 응답이 기록 보관 목적으로 저장됩니다. 궁합·커플 리딩 등에서 타인의 정보(예: 상대방의 출생 정보)나 공유 세션 정보를 제공하는 경우, 귀하는 해당 정보의 수신·처리에 대해 본인의 명시적 동의를 사전에 받은 것임을 확인합니다.\n업로드 이미지: 사용자가 업로드한 프로필·매칭 사진은 Firebase Storage 에 저장됩니다.\n**AI 모델 학습**: 사용자의 입력 데이터와 AI 응답은 AI 모델 학습에 사용되지 않습니다. 리딩에 사용되는 Anthropic Claude API 는 상용 약관에 따라 고객 데이터를 학습에 사용하지 않습니다.\n기술 정보: IP, 브라우저/디바이스 정보, OS, 쿠키, 로그.\n소통: 지원 문의, 피드백, 당사와의 교신 내용.',
  },
  {
    title: '3. How We Collect Information',
    titleKo: '3. 정보 수집 방법',
    body: 'Direct: Information you provide during signup, purchase, or service use.\nAutomatic: Cookies, web beacons, and analytics tools (disabled until consent) track usage patterns and technical data.\nThird Parties: Payment processors (Stripe), authentication providers (Google OAuth), analytics/advertising (Google AdSense). AdSense/Analytics are blocked until you consent via our CMP.',
    bodyKo:
      '직접 입력: 가입, 결제, 서비스 이용 중 사용자가 제공하는 정보.\n자동 수집: 쿠키·웹 비콘·분석 도구를 통한 이용 패턴/기술 정보(동의 전까지 비활성화).\n제3자: Stripe(결제), Google OAuth(인증), Google AdSense/Analytics(광고/분석) 등. 동의 배너에서 허용하기 전까지 AdSense/Analytics는 로드되지 않습니다.',
  },
  {
    title: '4. How We Use Information',
    titleKo: '4. 정보 이용 목적',
    body: 'Service Delivery: Provide astrology/saju/tarot and other readings. [Legal basis (GDPR Art.6): performance of a contract]\nAccount & Billing: Authenticate users, process payments. [Performance of a contract]\nCommunication — service notices, support: [Performance of a contract]\nCommunication — marketing: [Consent — Art.6(1)(a); withdrawable at any time]\nImprovement: Analyze usage to enhance features/UX. [Consent (analytics cookies)]\nCompliance & Safety: Fraud prevention, legal obligations, Terms enforcement. [Legal obligation / legitimate interest]\nAdvertising: Personalized ads via Google AdSense. [Consent — blocked until you accept]',
    bodyKo:
      '서비스 제공: 점성/사주/타로 등 리딩 제공. [법적 근거(GDPR 6조): 계약 이행]\n계정·결제: 인증, 결제 처리. [계약 이행]\n커뮤니케이션 — 서비스 알림·고객 지원: [계약 이행]\n커뮤니케이션 — 마케팅: [동의 — 6조(1)(a); 언제든 철회 가능]\n개선: 이용 분석을 통한 기능·경험 개선. [동의 (분석 쿠키)]\n준법·안전: 부정 사용 방지, 법적 의무 이행, 약관 집행. [법적 의무 / 정당한 이익]\n광고: Google AdSense를 통한 맞춤형 광고. [동의 — 동의 전까지 차단]',
  },
  {
    title: '5. Data Retention',
    titleKo: '5. 보관 기간',
    body: 'On account deletion we destroy your data without delay, except where statute requires longer retention. Itemized:\n- Account profile / display name / email: deleted immediately on account deletion.\n- Birth info, chat/reading records, uploaded images: deleted immediately on account deletion (the user can also delete individual chats or sessions earlier).\n- Payment & transaction records: 5 years (Korean E-Commerce Act §6 / tax records).\n- Records on contracts and withdrawal: 5 years (E-Commerce Act §6).\n- Records on consumer complaints or dispute resolution: 3 years (E-Commerce Act §6).\n- Display/advertising records: 6 months (E-Commerce Act §6).\n- Server access logs: 3 months (Communications Privacy Act §15-2).\n- Marketing consent settings: until consent is withdrawn.',
    bodyKo:
      '계정 탈퇴 시 데이터는 지체 없이 파기합니다. 단, 다음과 같이 관계 법령상 보존 의무가 있는 경우 해당 기간 동안 보관 후 파기합니다:\n- 계정 프로필 / 이름 / 이메일: 계정 삭제 즉시 파기.\n- 출생 정보, 채팅·리딩 기록, 업로드 이미지: 계정 삭제 즉시 파기 (개별 대화·세션 단위로도 사용자가 직접 삭제 가능).\n- 결제 및 거래 기록: 5년 (전자상거래법 제6조 / 세무 관련 법령).\n- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법 제6조).\n- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법 제6조).\n- 표시·광고에 관한 기록: 6개월 (전자상거래법 제6조).\n- 서버 접속 로그: 3개월 (통신비밀보호법 제15조의2).\n- 마케팅 수신 동의 설정: 동의 철회 시까지 보관.',
  },
  {
    title: '6. Sharing and Third Parties',
    titleKo: '6. 제3자 제공/위탁',
    body: 'We do NOT sell personal information. We share only with service providers (processors) used to operate the service:\n- Vercel Inc. (hosting, edge runtime, deployment) — US\n- Anthropic PBC (Claude AI for readings) — US\n- Stripe, Inc. (payment processing, PCI-DSS Level 1) — US\n- Google LLC (OAuth authentication, optional AdSense after consent) — US\n- Database hosting provider for Postgres (Neon / Vercel Postgres) — US\n- Google LLC — Firebase Storage (image uploads for profile/matching photos) — US\n- Sentry (error monitoring, if enabled) — US\n- Resend (transactional email delivery) — US\nLegal: when required by law/court/government.\nBusiness transfers: in mergers/acquisitions (with notice).\nAdvertising partners: Google AdSense may use cookies; opt out at https://www.google.com/settings/ads.',
    bodyKo:
      '개인정보를 판매하지 않습니다. 서비스 운영을 위해 다음 수탁자(처리위탁)에게 필요한 범위 내에서만 위탁합니다:\n- Vercel Inc. (호스팅, 엣지 런타임, 배포) — 미국\n- Anthropic PBC (Claude AI를 통한 리딩 생성) — 미국\n- Stripe, Inc. (결제 처리, PCI-DSS Level 1) — 미국\n- Google LLC (OAuth 인증, 동의 시 AdSense) — 미국\n- Postgres 데이터베이스 호스팅 제공자 (Neon / Vercel Postgres) — 미국\n- Google LLC — Firebase Storage (프로필·매칭 사진 업로드 저장) — 미국\n- Sentry (오류 모니터링, 사용 시) — 미국\n- Resend (트랜잭션 이메일 발송) — 미국\n법적 요구: 법원 명령·법령·정부 요청 시.\n사업 이전: 합병·인수·자산 양도 시 사전 안내 후.\n광고 파트너: Google AdSense는 쿠키를 사용할 수 있으며, https://www.google.com/settings/ads 에서 맞춤형 광고를 거부할 수 있습니다.',
  },
  {
    title: '7. International Data Transfers',
    titleKo: '7. 국외 이전',
    body: "Data may be processed outside your country (primarily the US). We apply safeguards such as Standard Contractual Clauses (SCC), Data Processing Agreements (DPA), and standard security measures regardless of location.\n\nPer Korean PIPA Article 28-8, transfers to overseas processors are summarized as follows (recipient / country / items / method / period):\n- Vercel Inc. / US / account info, IP, request logs, application data / via TLS over the public internet, continuous / retained while account is active and per retention schedule above\n- Anthropic PBC / US / user input messages and birth context for AI reading generation / via TLS HTTPS API call, real-time per request / not retained by Anthropic for training; transient processing only\n- Stripe, Inc. / US / payment-related identifiers and billing info / via TLS HTTPS API, per checkout / 5 years per E-Commerce Act\n- Google LLC (OAuth) / US / OAuth profile info / via TLS HTTPS, per login / retained while account is active\n- Neon / Vercel Postgres / US / all stored application data / via TLS, continuous / per retention schedule above\n- Google LLC (Firebase Storage) / US / uploaded image files / via TLS HTTPS, per upload / retained while account is active\n- Sentry / US / error logs (may include partial request metadata) / via TLS HTTPS, on error / up to 90 days\n- Resend / US / recipient email and message body for transactional mail / via TLS HTTPS API, per send / retained per Resend's data policy",
    bodyKo:
      '데이터가 거주국 외(주로 미국)에서 처리될 수 있습니다. 표준계약조항(SCC), 처리 위탁 계약(DPA) 등 적정한 보호조치를 적용하며, 위치와 무관하게 보안을 유지합니다.\n\n개인정보 보호법 제28조의8에 따른 국외 이전 사항 (이전받는 자 / 국가 / 항목 / 방법 / 보유 기간):\n- Vercel Inc. / 미국 / 계정 정보, IP, 요청 로그, 애플리케이션 데이터 / 인터넷 TLS, 지속적 / 계정 활성 기간 및 위 보관 일정에 따름\n- Anthropic PBC / 미국 / AI 리딩 생성을 위한 사용자 입력 메시지 및 출생 컨텍스트 / TLS HTTPS API, 요청 시 실시간 / Anthropic 학습 비저장, 일시적 처리\n- Stripe, Inc. / 미국 / 결제 식별자 및 청구 정보 / TLS HTTPS API, 결제 시점 / 전자상거래법에 따라 5년\n- Google LLC (OAuth) / 미국 / OAuth 프로필 정보 / TLS HTTPS, 로그인 시점 / 계정 활성 기간\n- Neon / Vercel Postgres / 미국 / 저장되는 모든 애플리케이션 데이터 / TLS, 지속적 / 위 보관 일정에 따름\n- Google LLC (Firebase Storage) / 미국 / 업로드 이미지 파일 / TLS HTTPS, 업로드 시점 / 계정 활성 기간\n- Sentry / 미국 / 오류 로그 (요청 메타데이터 일부 포함 가능) / TLS HTTPS, 오류 발생 시 / 최대 90일\n- Resend / 미국 / 트랜잭션 메일을 위한 수신자 이메일 및 메일 본문 / TLS HTTPS API, 발송 시점 / Resend 데이터 정책에 따름',
  },
  {
    title: '8. Your Privacy Rights',
    titleKo: '8. 이용자 권리',
    body: `You may request: access, correction, deletion, restriction, portability (GDPR), objection, and consent withdrawal. Contact: ${SUPPORT_EMAIL}.\nResponse time: within 10 days (Korean residents — PIPA), within 30 days (other regions). Data portability requests are fulfilled by email export in a machine-readable format on request.\nGDPR: right to complain to an EU supervisory authority.\nCCPA: California users may exercise access, deletion, and opt-out rights; we do not sell or share personal information for cross-context behavioral advertising. We will not discriminate against you (e.g., deny service, charge different prices, provide a lower quality of service) for exercising your CCPA rights — "Right to Non-Discrimination" (Cal. Civ. Code §1798.125).`,
    bodyKo: `다음 권리를 행사할 수 있습니다: 열람, 정정, 삭제, 처리 제한, 데이터 이동(GDPR), 처리 반대, 동의 철회. 연락처: ${SUPPORT_EMAIL}.\n응답 기한: 한국 거주자는 10일 이내(개인정보 보호법), 그 외 지역은 30일 이내. 데이터 이동(portability) 요청 시 이메일로 기계가독 형식의 사본을 제공합니다.\nGDPR: EU 감독기관에 불만 제기 권리.\nCCPA: 캘리포니아 이용자는 열람·삭제·옵트아웃 권리를 행사할 수 있으며, 당사는 개인 정보를 판매하지 않고 교차 맥락 행동 광고를 위해 공유하지도 않습니다. CCPA 권리 행사를 이유로 차별 (서비스 거부, 다른 가격 청구, 품질 저하 등) 하지 않습니다 — 차별 금지권 (Cal. Civ. Code §1798.125).`,
  },
  {
    title: '9. Cookies and Tracking',
    titleKo: '9. 쿠키 및 추적',
    body: 'Uses: essential (login/security), analytics (after consent), advertising (AdSense after consent), preferences.\nControl cookies via browser settings; disabling may limit features.\nAdSense/Analytics load only after consent via our CMP; personalized ads can be managed at Google Ads Settings.',
    bodyKo:
      '용도: 필수 쿠키(로그인/보안), 분석(동의 후), 광고(AdSense 동의 후), 환경설정.\n브라우저 설정에서 쿠키를 제어할 수 있으며, 차단 시 기능이 제한될 수 있습니다.\nAdSense/Analytics는 동의 배너 승인 후에만 로드되며, 맞춤형 광고는 Google Ads 설정에서 관리할 수 있습니다.',
  },
  {
    title: '10. Data Security',
    titleKo: '10. 보안',
    body: 'Safeguards: TLS/SSL in transit, encryption at rest (e.g., AES-256 where supported), role-based access, MFA for staff, monitoring, secure cloud, Stripe PCI-DSS Level 1 for payments, periodic security reviews, incident response.\nNo system is 100% secure; protect your credentials.',
    bodyKo:
      '보안 조치: 전송 구간 TLS/SSL, 저장 시 암호화(AES-256 등 지원되는 경우), 역할 기반 접근제어, 임직원 MFA, 모니터링, 안전한 클라우드, 결제는 Stripe PCI-DSS 1레벨, 주기적 보안 점검, 사고 대응 절차.\n어떤 시스템도 100% 안전할 수 없으므로 계정 정보를 스스로 보호해야 합니다.',
  },
  {
    title: "11. Children's Privacy",
    titleKo: '11. 아동 보호',
    body: `Sign-up is restricted to users aged 14 or above (or 16 or above where the applicable jurisdiction sets a higher digital-consent age, such as parts of the EU). We do not knowingly collect personal information from anyone below the applicable age threshold. If we discover that an account belongs to such a child, we will delete the account and any associated data without undue delay. Parents or guardians who become aware of such an account may contact us at ${SUPPORT_EMAIL} for immediate removal.`,
    bodyKo: `본 서비스의 가입은 만 14세 이상 (또는 EU 등 디지털 동의 연령이 더 높게 설정된 지역의 경우 해당 연령 이상) 만 가능합니다. 적용 연령 미만의 개인정보는 고의로 수집하지 않으며, 해당 사실이 확인되는 경우 계정 및 관련 데이터를 지체 없이 삭제합니다. 자녀의 가입을 인지한 법정대리인은 ${SUPPORT_EMAIL} 로 연락해 즉시 삭제를 요청할 수 있습니다.`,
  },
  {
    title: '12. Data Controller, Privacy Officer, and Complaints',
    titleKo: '12. 개인정보처리자·보호책임자·권익침해 신고',
    body: `Data Controller: ${CONTROLLER_NAME}\nEmail: ${SUPPORT_EMAIL}\n\nPrivacy Officer (개인정보 보호책임자, PIPA Art.31)\n- Name: ${CPO_NAME}\n- Title: ${CPO_TITLE}\n- Phone: ${CPO_PHONE}\n- Email: ${SUPPORT_EMAIL}\n\nEU Representative (GDPR Art.27): Not designated. DestinyPal is operated by a sole individual in Korea and does not currently meet the thresholds requiring a designated EU representative; we will appoint one if our processing of EU resident data reaches the levels described in GDPR Art.27.\n\nResponse target: within 10 days for Korean residents (PIPA), within 30 days for other regions.\n\nKorean users — to report a privacy infringement or seek mediation, you may contact:\n- Personal Information Protection Commission (PIPC): privacy.go.kr / 1833-6972\n- KISA Privacy Infringement Report Center: privacy.kisa.or.kr / 118\n- Personal Information Dispute Mediation Committee: kopico.go.kr / 1833-6972\n- Supreme Prosecutors' Office Cybercrime Center: spo.go.kr / 1301\n- National Police Agency Cyber Bureau: ecrm.police.go.kr / 182\n\nEU users: right to lodge a complaint with your local data protection authority.\nCalifornia users: CCPA rights may be exercised via the email above.`,
    bodyKo: `개인정보처리자: ${CONTROLLER_NAME}\n이메일: ${SUPPORT_EMAIL}\n\n개인정보 보호책임자 (개인정보 보호법 제31조)\n- 성명: ${CPO_NAME}\n- 직책: ${CPO_TITLE}\n- 연락처: ${CPO_PHONE}\n- 이메일: ${SUPPORT_EMAIL}\n\nEU 대리인 (GDPR 제27조): 별도 지정되어 있지 않습니다. DestinyPal 은 한국 1인 사업자가 운영하며, 현재 GDPR 제27조의 EU 대리인 지정 의무 요건에 해당하지 않습니다. EU 거주자 데이터 처리 규모가 해당 요건에 이르면 대리인을 지정하겠습니다.\n\n응답 기한: 한국 거주자 10일 이내(개인정보 보호법), 그 외 지역 30일 이내.\n\n한국 이용자 — 개인정보 침해 신고·상담·분쟁 조정은 아래 기관을 이용할 수 있습니다:\n- 개인정보보호위원회: privacy.go.kr / 1833-6972\n- 개인정보침해신고센터 (KISA): privacy.kisa.or.kr / 118\n- 개인정보분쟁조정위원회: kopico.go.kr / 1833-6972\n- 대검찰청 사이버범죄수사단: spo.go.kr / 1301\n- 경찰청 사이버수사국: ecrm.police.go.kr / 182\n\nEU 이용자: 거주 감독기관에 불만 제기 가능.\n캘리포니아 이용자: 상기 이메일로 CCPA 권리를 행사할 수 있습니다.`,
  },
  {
    title: '13. Google AdSense',
    titleKo: '13. Google AdSense',
    body: 'We use AdSense to show ads. Google may use cookies/IDs to serve and measure ads and prevent fraud. AdSense loads only after consent. Opt out of personalized ads at https://www.google.com/settings/ads. See Google Privacy Policy for details.',
    bodyKo:
      '광고 노출을 위해 AdSense를 사용합니다. Google은 쿠키/식별자를 사용해 광고 제공·측정 및 부정 방지를 수행할 수 있습니다. 동의 후에만 로드되며, 맞춤형 광고는 https://www.google.com/settings/ads 에서 거부할 수 있습니다. 자세한 내용은 Google 개인정보처리방침을 참고하세요.',
  },
  {
    title: '14. Changes to this Policy',
    titleKo: '14. 방침 변경',
    body: `We may update this Privacy Policy. Material changes take effect after notice (7 days for minor, 30 days for significant). Continued use after the effective date means acceptance.\nLast Updated: ${EFFECTIVE_DATE}`,
    bodyKo: `본 방침은 변경될 수 있으며, 중대한 변경은 사전 고지 후 효력이 발생합니다(경미 7일, 중대 30일). 시행 이후 계속 이용하면 변경에 동의한 것으로 간주됩니다.\n최종 업데이트: ${EFFECTIVE_DATE}`,
  },
]

function SectionView({ s, isKo }: { s: Section; isKo: boolean }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{isKo ? s.titleKo : s.title}</h2>
      <pre className={styles.sectionBody}>{isKo ? s.bodyKo : s.body}</pre>
    </section>
  )
}

export default function PrivacyPage() {
  const { t, locale } = useI18n()
  const isKo = locale === 'ko'

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t('policy.privacy.title', 'Privacy Policy')}</h1>
            <p className={styles.effectiveDate}>
              {t('policy.privacy.effective', 'Effective date')}: {EFFECTIVE_DATE}
            </p>
          </div>
          <div className={styles.content}>
            {sections.map((s: Section, i: number) => (
              <SectionView key={`${s.title}-${i}`} s={s} isKo={isKo} />
            ))}
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {t('policy.privacy.footer', 'Addendum')}: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>
      </div>
      <ScrollToTop label={isKo ? '맨 위로' : 'Top'} />
    </div>
  )
}
