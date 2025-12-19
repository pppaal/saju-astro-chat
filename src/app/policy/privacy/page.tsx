"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "../policy.module.css";

type Section = { title: string; body: string };

const CONTROLLER_NAME = "Paul Rhee (individual)";
const CONTACT_EMAIL = "rheeco88@gmail.com";
const EFFECTIVE_DATE = "2025-12-12";

const sections: Section[] = [
  {
    title: "1. Overview",
    body: "DestinyPal ('we', 'us', 'our') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services. We comply with applicable privacy laws including PIPA (Korea), GDPR (EU), CCPA (California), and other relevant data protection regulations."
  },
  {
    title: "2. Information We Collect",
    body: "Account Information: Email address, password (encrypted), display name, profile picture\n\nAuthentication Data: Social login profile data (Google OAuth) within your consent. OAuth access/refresh/id tokens are revoked after login and scrubbed (or encrypted in transit) so they are not stored for reuse\n\nPayment Information: Transaction identifiers and billing information processed securely through Stripe. We never store full credit card numbers on our servers\n\nService Usage Data: Birth date, birth time, birth location, and other information you provide for astrology, Saju, tarot, and other divination services\n\nTechnical Data: IP address, browser type, device information, operating system, cookies, log files\n\nCommunication Data: Support inquiries, feedback, correspondence with us",
  },
  {
    title: "3. How We Collect Information",
    body: "Direct Input: Information you provide when creating an account, making purchases, or using our services\n\nAutomatic Collection: Cookies, web beacons, analytics tools track usage patterns and technical information (disabled until you grant consent)\n\nThird-party Services: Payment processors (Stripe), authentication providers (Google OAuth), analytics services, and advertising networks (Google AdSense). We block Google Analytics/AdSense until consent is granted via our CMP banner"
  },
  {
    title: "4. How We Use Your Information",
    body: "Service Delivery: Provide astrology readings, Saju analysis, tarot readings, and other divination services\n\nAccount Management: Authenticate users, manage subscriptions, process payments\n\nCommunication: Send service updates, promotional materials (with consent), support responses\n\nImprovement: Analyze usage patterns to enhance features and user experience (only after consent to analytics)\n\nLegal Compliance: Comply with applicable laws, prevent fraud, enforce our Terms of Service\n\nAdvertising: Display personalized advertisements through Google AdSense based on your interests and usage patterns (ads/gtag are blocked until consent is granted)",
  },
  {
    title: "5. Data Retention",
    body: "Account Data: Retained until account deletion or as required by law (typically 5 years for financial records)\n\nPayment Records: Kept for 5 years as required by tax and financial regulations\n\nLog Files: Retained for up to 2 years for security and analysis purposes\n\nService Data: Birth information and reading history retained while account is active\n\nMarketing Preferences: Until you withdraw consent or delete your account"
  },
  {
    title: "6. Information Sharing and Third Parties",
    body: "We do not sell your personal information to third parties. We share data only with:\n\nService Providers:\n- Supabase: Database hosting and backend infrastructure\n- Stripe: Payment processing (PCI-DSS compliant)\n- OpenAI: AI-powered interpretation and content generation\n- Google: OAuth authentication and AdSense advertising\n- Email Services: Transactional and marketing emails (Resend/SendGrid)\n\nLegal Requirements: When required by law, court order, or government regulations\n\nBusiness Transfers: In case of merger, acquisition, or asset sale (users will be notified)\n\nAdvertising Partners: Google AdSense may use cookies and tracking technologies to serve personalized ads. You can opt out of personalized advertising at https://www.google.com/settings/ads",
  },
  {
    title: "7. International Data Transfers",
    body: "Your information may be transferred to and processed in countries outside your country of residence, including the United States and other regions where our service providers operate. We ensure appropriate safeguards through:\n\n- Standard Contractual Clauses (SCCs) for EU data transfers\n- Data Processing Agreements (DPAs) with all processors\n- Compliance with cross-border data transfer regulations\n- Adequate security measures regardless of processing location"
  },
  {
    title: "8. Your Privacy Rights",
    body: `You have the following rights regarding your personal information:\n\nAccess: Request a copy of your personal data\nCorrection: Update or correct inaccurate information\nDeletion: Request deletion of your account and associated data\nRestriction: Limit processing of your information\nPortability: Receive your data in a structured, machine-readable format (GDPR)\nObject: Opt out of marketing communications and certain data processing\nWithdraw Consent: Revoke previously given consent at any time\n\nTo exercise these rights, contact us at: ${CONTACT_EMAIL}\n\nEU residents have additional rights under GDPR, including the right to lodge a complaint with supervisory authorities.\nCalifornia residents have rights under CCPA including the right to opt out of sale of personal information (we do not sell personal information).`
  },
  {
    title: "9. Cookies and Tracking Technologies",
    body: "We use cookies and similar technologies for:\n\nEssential Cookies: Required for login, session management, security\nAnalytical Cookies: Understand usage patterns and improve services (loaded only after consent)\nAdvertising Cookies: Google AdSense uses cookies to serve personalized ads based on your interests (blocked until consent)\nPreference Cookies: Remember your language and display preferences\n\nYou can control cookies through your browser settings. Note that disabling cookies may limit service functionality.\n\nThird-party Advertising: Google AdSense may use cookies and web beacons to collect information about your browsing activities. Learn more at https://policies.google.com/technologies/ads\n\nConsent Banner: Our CMP defaults to no analytics/ads until you choose Accept; rejecting keeps gtag/AdSense disabled"
  },
  {
    title: "10. Data Security",
    body: "We implement industry-standard security measures:\n\n- Encryption: TLS/SSL for data in transit, AES-256 for data at rest\n- Access Control: Role-based access, multi-factor authentication for staff\n- Monitoring: Continuous security monitoring and intrusion detection\n- Secure Infrastructure: Hosted on secure, compliant cloud platforms\n- Payment Security: Stripe handles all payment processing with PCI-DSS Level 1 compliance\n- Regular Audits: Periodic security assessments and penetration testing\n- Incident Response: Established procedures for data breach notification\n\nWhile we implement robust security measures, no system is 100% secure. Users are responsible for maintaining the confidentiality of their account credentials."
  },
  {
    title: "11. Children's Privacy",
    body: `Our services are not intended for children under 14 years of age (or 16 in EU, or other applicable age of consent). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately at ${CONTACT_EMAIL} and we will take steps to delete such information.`
  },
  {
    title: "12. Data Controller and Contact",
    body: `Data Controller: ${CONTROLLER_NAME}\nEmail: ${CONTACT_EMAIL}\nResponse Time: We aim to respond to privacy inquiries within 30 days\n\nFor EU users: You have the right to lodge a complaint with your local data protection authority if you believe your rights have been violated.\n\nFor California users: You may contact us to exercise your CCPA rights including access, deletion, and opt-out rights.`
  },
  {
    title: "13. Google AdSense",
    body: "We use Google AdSense to display advertisements on our service. Google uses cookies and other tracking technologies to:\n\n- Serve ads based on your interests and prior visits to our website\n- Measure ad effectiveness and engagement\n- Prevent fraudulent clicks and impressions\n\nGoogle's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the Internet.\n\nConsent First: AdSense and Google Analytics scripts are blocked by default and only load after you accept in the consent banner. Rejecting keeps ads/analytics disabled.\n\nYou may opt out of personalized advertising by visiting Google Ads Settings: https://www.google.com/settings/ads\n\nFor more information about Google's privacy practices, visit: https://policies.google.com/privacy"
  },
  {
    title: "14. Changes to Privacy Policy",
    body: `We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. Material changes will be announced with at least 7 days' notice (30 days for significant changes affecting your rights).\n\nContinued use of our services after policy changes constitutes acceptance of the updated policy.\n\nLast Updated: ${EFFECTIVE_DATE}`
  },
];

function SectionView({ s }: { s: Section }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{s.title}</h2>
      <pre className={styles.sectionBody}>{s.body}</pre>
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
              <SectionView key={`${s.title}-${i}`} s={s} />
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
