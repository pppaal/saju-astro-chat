"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "../policy.module.css";

type Section = { title: string; titleKo: string; body: string; bodyKo: string };

const CONTROLLER_NAME = "Paul Rhee (individual)";
const CONTACT_EMAIL = "rheeco88@gmail.com";
const EFFECTIVE_DATE = "2025-12-24";

const sections: Section[] = [
  {
    title: "1. Overview",
    titleKo: "1. 개요",
    body: "DestinyPal ('we', 'us', 'our') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information. We aim to comply with applicable laws including PIPA (Korea), GDPR (EU), CCPA (California), and other relevant regulations.",
    bodyKo: "DestinyPal(“당사”)는 개인정보 보호를 최우선으로 합니다. 본 개인정보처리방침은 정보를 어떻게 수집·이용·공개·보호하는지 설명하며, 한국 개인정보보호법, EU GDPR, 캘리포니아 CCPA 등 적용 법령 준수를 목표로 합니다.",
  },
  {
    title: "2. Information We Collect",
    titleKo: "2. 수집하는 정보",
    body: "Account: email, password (hashed), display name, profile image.\nAuthentication: Social login profile data (Google OAuth) within your consent; OAuth tokens are revoked after login and not retained (or encrypted in transit).\nPayment: Transaction IDs and billing info processed by Stripe; we never store full card numbers.\nService Data: Birth date/time/location and inputs you provide for astrology, saju, tarot, and other readings.\nTechnical: IP, browser/device info, OS, cookies, logs.\nCommunications: Support tickets, feedback, correspondence.",
    bodyKo: "계정: 이메일, 비밀번호(해시 처리), 표시 이름, 프로필 이미지.\n인증: 동의 범위 내 소셜 로그인 프로필 데이터(Google OAuth). OAuth 토큰은 로그인 후 폐기(또는 전송 시 암호화)되며 보관하지 않습니다.\n결제: Stripe가 처리하는 거래 ID 및 청구 정보. 카드 전체 번호는 저장하지 않습니다.\n서비스 데이터: 점성/사주/타로 등 리딩을 위한 생년월일·시간·장소 및 사용자가 입력한 정보.\n기술 정보: IP, 브라우저/디바이스 정보, OS, 쿠키, 로그.\n소통: 지원 문의, 피드백, 당사와의 교신 내용.",
  },
  {
    title: "3. How We Collect Information",
    titleKo: "3. 정보 수집 방법",
    body: "Direct: Information you provide during signup, purchase, or service use.\nAutomatic: Cookies, web beacons, and analytics tools (disabled until consent) track usage patterns and technical data.\nThird Parties: Payment processors (Stripe), authentication providers (Google OAuth), analytics/advertising (Google AdSense). AdSense/Analytics are blocked until you consent via our CMP.",
    bodyKo: "직접 입력: 가입, 결제, 서비스 이용 중 사용자가 제공하는 정보.\n자동 수집: 쿠키·웹 비콘·분석 도구를 통한 이용 패턴/기술 정보(동의 전까지 비활성화).\n제3자: Stripe(결제), Google OAuth(인증), Google AdSense/Analytics(광고/분석) 등. 동의 배너에서 허용하기 전까지 AdSense/Analytics는 로드되지 않습니다.",
  },
  {
    title: "4. How We Use Information",
    titleKo: "4. 정보 이용 목적",
    body: "Service Delivery: Provide astrology/saju/tarot and other readings.\nAccount & Billing: Authenticate users, manage subscriptions, process payments.\nCommunication: Service notices, marketing (with consent), support responses.\nImprovement: Analyze usage to enhance features/UX (after analytics consent).\nCompliance & Safety: Fraud prevention, legal obligations, Terms enforcement.\nAdvertising: Personalized ads via Google AdSense (blocked until consent).",
    bodyKo: "서비스 제공: 점성/사주/타로 등 리딩 제공.\n계정·결제: 인증, 구독 관리, 결제 처리.\n커뮤니케이션: 서비스 알림, 마케팅(동의 시), 고객 지원 응대.\n개선: 동의 후 분석 데이터를 활용해 기능·경험 개선.\n준법·안전: 부정 사용 방지, 법적 의무 이행, 약관 집행.\n광고: Google AdSense를 통한 맞춤형 광고(동의 전까지 차단).",
  },
  {
    title: "5. Data Retention",
    titleKo: "5. 보관 기간",
    body: "Account data: retained until deletion or as required by law.\nPayments: financial/tax records typically 5 years.\nLogs: up to 2 years for security/analysis.\nService data: kept while account is active.\nMarketing preferences: until consent is withdrawn.",
    bodyKo: "계정 정보: 삭제 시까지 또는 법령이 요구하는 기간 보관.\n결제 기록: 세무/회계 목적상 통상 5년 보관.\n로그: 보안·분석 목적으로 최대 2년 보관.\n서비스 데이터: 계정 활성 기간 동안 보관.\n마케팅 동의 설정: 동의 철회 시까지 보관.",
  },
  {
    title: "6. Sharing and Third Parties",
    titleKo: "6. 제3자 제공/위탁",
    body: "We do NOT sell personal information. We share only with service providers:\n- Supabase (hosting/backend)\n- Stripe (payments, PCI-DSS compliant)\n- OpenAI (AI generation)\n- Google (OAuth, AdSense)\n- Email services (transactional/marketing)\nLegal: when required by law/court/government.\nBusiness transfers: in mergers/acquisitions (with notice).\nAdvertising partners: Google AdSense may use cookies; opt out at https://www.google.com/settings/ads.",
    bodyKo: "개인 정보를 판매하지 않습니다. 다음 서비스 제공자와 필요한 범위 내에서만 위탁/공유합니다:\n- Supabase(호스팅/백엔드)\n- Stripe(결제, PCI-DSS 준수)\n- OpenAI(AI 생성)\n- Google(OAuth, AdSense)\n- 이메일 발송 서비스(트랜잭션/마케팅)\n법적 요구: 법원 명령·법령·정부 요청 시.\n사업 이전: 합병·인수·자산 양도 시 사전 안내 후.\n광고 파트너: Google AdSense는 쿠키를 사용할 수 있으며, https://www.google.com/settings/ads 에서 맞춤형 광고를 거부할 수 있습니다.",
  },
  {
    title: "7. International Data Transfers",
    titleKo: "7. 국외 이전",
    body: "Data may be processed outside your country (e.g., US). We use safeguards such as Standard Contractual Clauses, Data Processing Agreements, and security measures regardless of location.",
    bodyKo: "데이터가 거주국 외(예: 미국)에서 처리될 수 있습니다. 표준계약조항(SCC), 처리 위탁 계약(DPA) 등 적정한 보호조치를 적용하며, 위치와 무관하게 보안을 유지합니다.",
  },
  {
    title: "8. Your Privacy Rights",
    titleKo: "8. 이용자 권리",
    body: `You may request: access, correction, deletion, restriction, portability (GDPR), objection, and consent withdrawal. Contact: ${CONTACT_EMAIL}.\nGDPR: right to complain to an EU supervisory authority.\nCCPA: California users may exercise access/deletion/opt-out rights; we do not sell personal info.`,
    bodyKo: `다음 권리를 행사할 수 있습니다: 열람, 정정, 삭제, 처리 제한, 데이터 이동(GDPR), 처리 반대, 동의 철회. 연락처: ${CONTACT_EMAIL}.\nGDPR: EU 감독기관에 불만 제기 권리.\nCCPA: 캘리포니아 이용자는 열람/삭제/옵트아웃 권리를 행사할 수 있으며, 당사는 개인 정보를 판매하지 않습니다.`,
  },
  {
    title: "9. Cookies and Tracking",
    titleKo: "9. 쿠키 및 추적",
    body: "Uses: essential (login/security), analytics (after consent), advertising (AdSense after consent), preferences.\nControl cookies via browser settings; disabling may limit features.\nAdSense/Analytics load only after consent via our CMP; personalized ads can be managed at Google Ads Settings.",
    bodyKo: "용도: 필수 쿠키(로그인/보안), 분석(동의 후), 광고(AdSense 동의 후), 환경설정.\n브라우저 설정에서 쿠키를 제어할 수 있으며, 차단 시 기능이 제한될 수 있습니다.\nAdSense/Analytics는 동의 배너 승인 후에만 로드되며, 맞춤형 광고는 Google Ads 설정에서 관리할 수 있습니다.",
  },
  {
    title: "10. Data Security",
    titleKo: "10. 보안",
    body: "Safeguards: TLS/SSL in transit, encryption at rest (e.g., AES-256 where supported), role-based access, MFA for staff, monitoring, secure cloud, Stripe PCI-DSS Level 1 for payments, periodic security reviews, incident response.\nNo system is 100% secure; protect your credentials.",
    bodyKo: "보안 조치: 전송 구간 TLS/SSL, 저장 시 암호화(AES-256 등 지원되는 경우), 역할 기반 접근제어, 임직원 MFA, 모니터링, 안전한 클라우드, 결제는 Stripe PCI-DSS 1레벨, 주기적 보안 점검, 사고 대응 절차.\n어떤 시스템도 100% 안전할 수 없으므로 계정 정보를 스스로 보호해야 합니다.",
  },
  {
    title: "11. Children's Privacy",
    titleKo: "11. 아동 보호",
    body: "Services are not intended for children under 14 (or 16 in EU/other applicable age). We do not knowingly collect data from children. Contact us to delete any such data.",
    bodyKo: "본 서비스는 만 14세 미만(또는 EU 등 적용 연령 16세 미만) 아동을 대상으로 하지 않습니다. 아동의 정보를 고의로 수집하지 않으며, 관련 정보가 확인되면 삭제를 요청해 주세요.",
  },
  {
    title: "12. Data Controller and Contact",
    titleKo: "12. 개인정보처리자 및 연락처",
    body: `Data Controller: ${CONTROLLER_NAME}\nEmail: ${CONTACT_EMAIL}\nResponse target: within 30 days for privacy inquiries.\nEU: right to lodge a complaint with your local authority.\nCalifornia: CCPA rights may be exercised via the email above.`,
    bodyKo: `개인정보처리자: ${CONTROLLER_NAME}\n이메일: ${CONTACT_EMAIL}\n응답 목표: 개인정보 문의에 영업일 기준 30일 이내 회신\nEU: 거주 감독기관에 불만 제기 가능\n캘리포니아: 상기 이메일로 CCPA 권리를 행사할 수 있습니다.`,
  },
  {
    title: "13. Google AdSense",
    titleKo: "13. Google AdSense",
    body: "We use AdSense to show ads. Google may use cookies/IDs to serve and measure ads and prevent fraud. AdSense loads only after consent. Opt out of personalized ads at https://www.google.com/settings/ads. See Google Privacy Policy for details.",
    bodyKo: "광고 노출을 위해 AdSense를 사용합니다. Google은 쿠키/식별자를 사용해 광고 제공·측정 및 부정 방지를 수행할 수 있습니다. 동의 후에만 로드되며, 맞춤형 광고는 https://www.google.com/settings/ads 에서 거부할 수 있습니다. 자세한 내용은 Google 개인정보처리방침을 참고하세요.",
  },
  {
    title: "14. Changes to this Policy",
    titleKo: "14. 방침 변경",
    body: `We may update this Privacy Policy. Material changes take effect after notice (7 days for minor, 30 days for significant). Continued use after the effective date means acceptance.\nLast Updated: ${EFFECTIVE_DATE}`,
    bodyKo: `본 방침은 변경될 수 있으며, 중대한 변경은 사전 고지 후 효력이 발생합니다(경미 7일, 중대 30일). 시행 이후 계속 이용하면 변경에 동의한 것으로 간주됩니다.\n최종 업데이트: ${EFFECTIVE_DATE}`,
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

export default function PrivacyPage() {
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
            <h1 className={styles.title}>{t("policy.privacy.title", "Privacy Policy")}</h1>
            <p className={styles.effectiveDate}>
              {t("policy.privacy.effective", "Effective date")}: {EFFECTIVE_DATE}
            </p>
          </div>
          <div className={styles.content}>
            {sections.map((s: Section, i: number) => (
              <SectionView key={`${s.title}-${i}`} s={s} isKo={isKo} />
            ))}
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {t("policy.privacy.footer", "Addendum")}: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>
      </div>
      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </div>
  );
}
