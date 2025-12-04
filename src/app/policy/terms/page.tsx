"use client";
import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "../policy.module.css";

type Locale = "en" | "ko" | "zh" | "ar" | "es";
type Section = { title: string; body: string };

function asLocale(l: string): Locale {
  const list: Locale[] = ["en", "ko", "zh", "ar", "es"];
  return (list as readonly string[]).includes(l) ? (l as Locale) : "en";
}

const CONTACT_EMAIL = "rheeco88@gmail.com";
const OPERATOR = "Operator: Paul Rhee (individual)";

const sections: Section[] = [
  {
    title: "1. Agreement to Terms",
    body: "Welcome to DestinyPal. These Terms of Service ('Terms') constitute a legally binding agreement between you ('User', 'you', 'your') and Paul Rhee (individual) ('DestinyPal', 'we', 'us', 'our') governing your access to and use of our website, mobile applications, and services (collectively, the 'Service').\n\nBy accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Service.\n\nService Operator: Paul Rhee (individual)\nEmail: " + CONTACT_EMAIL + "\nEffective Date: 2025-01-01"
  },
  {
    title: "2. Definitions",
    body: "For purposes of these Terms:\n\n'Service' means the DestinyPal platform including all websites, mobile applications, features, content, and services offered by us\n\n'User' or 'Member' means any individual who creates an account or uses the Service\n\n'Content' means all information, data, text, software, music, sound, photographs, graphics, video, messages, readings, interpretations, or other materials\n\n'User Content' means Content that you submit, upload, or transmit through the Service\n\n'Paid Services' means premium features, subscriptions, individual readings, or other services requiring payment\n\n'Account' means your registered user account on the Service"
  },
  {
    title: "3. Eligibility and Account Registration",
    body: "Age Requirement: You must be at least 14 years old (or 16 in EU, or the age of consent in your jurisdiction) to use the Service. If you are under 18, you confirm you have parental or guardian consent.\n\nAccount Creation: To access certain features, you must create an account by providing accurate, current, and complete information including:\n- Valid email address\n- Secure password\n- Display name\n- Optional: birth information for personalized readings\n\nAccount Security: You are responsible for:\n- Maintaining the confidentiality of your login credentials\n- All activities that occur under your account\n- Notifying us immediately of unauthorized access\n- Not sharing your account with others\n\nAccount Accuracy: You agree to provide truthful information and update it as necessary. We may suspend or terminate accounts with false or misleading information.\n\nThird-party Authentication: You may register using Google OAuth or other supported authentication providers. Your use of third-party authentication is subject to their terms and privacy policies."
  },
  {
    title: "4. Description of Service",
    body: "DestinyPal provides AI-powered divination and self-reflection services including:\n\n- Astrology: Birth charts, planetary positions, transit analysis, compatibility readings\n- Saju (Four Pillars): Traditional Korean fortune-telling based on birth date and time\n- Tarot: Card readings and interpretations for various life questions\n- Destiny Map: Integrated analysis combining multiple divination systems\n- Dream Interpretation: AI analysis of dream symbolism\n- Numerology: Numeric pattern analysis and life path readings\n- Compatibility: Relationship analysis between individuals\n- I Ching: Traditional Chinese divination guidance\n\nService Nature: All readings, interpretations, and advice provided through the Service are:\n- Generated using artificial intelligence (OpenAI) combined with traditional divination systems\n- For entertainment, self-reflection, and personal growth purposes only\n- Not professional advice (medical, legal, financial, psychological, or therapeutic)\n- Based on information you provide; accuracy depends on input quality"
  },
  {
    title: "5. Acceptable Use Policy",
    body: "You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:\n\nProhibited Activities:\n- Violate any applicable local, national, or international law\n- Infringe intellectual property rights of DestinyPal or third parties\n- Harass, abuse, threaten, or harm other users\n- Impersonate any person or entity or misrepresent affiliation\n- Use automated systems (bots, scrapers, crawlers) without permission\n- Attempt to gain unauthorized access to systems or accounts\n- Interfere with or disrupt the Service or servers\n- Upload viruses, malware, or malicious code\n- Collect user information without consent\n- Reverse engineer, decompile, or disassemble the Service\n- Use the Service for commercial purposes without authorization\n- Share or resell readings obtained through the Service\n- Bypass paywalls, rate limits, or access restrictions\n\nContent Restrictions:\n- Do not post illegal, defamatory, obscene, or harmful content\n- Do not spam or distribute unsolicited marketing\n- Do not post content that promotes violence or discrimination\n\nViolations may result in immediate account suspension or termination and potential legal action."
  },
  {
    title: "6. Intellectual Property Rights",
    body: "DestinyPal Content: All Content provided through the Service, including but not limited to:\n- Software, algorithms, and AI models\n- Website design, graphics, logos, and trademarks\n- Reading templates and interpretation frameworks\n- Educational content and articles\n- User interface and experience design\n\nare owned by DestinyPal or our licensors and protected by copyright, trademark, patent, and other intellectual property laws.\n\nUser Content License: By submitting User Content (birth information, questions, feedback, posts), you grant DestinyPal a worldwide, non-exclusive, royalty-free, perpetual, irrevocable license to:\n- Use, reproduce, modify, and adapt your User Content\n- Publicly display and distribute User Content\n- Create derivative works for Service improvement\n- Use for training AI models and improving accuracy\n- Use anonymized data for analytics and research\n\nYou retain ownership of your User Content but represent and warrant that you have all necessary rights to grant this license.\n\nUser Content Responsibility: You are solely responsible for your User Content. We do not endorse or guarantee the accuracy of User Content.\n\nReading Results: Personalized readings generated for you are provided for your personal, non-commercial use. You may not redistribute, resell, or publicly share readings without permission.\n\nTrademarks: 'DestinyPal' and associated logos are trademarks of Paul Rhee. You may not use our trademarks without prior written consent."
  },
  {
    title: "7. Paid Services and Billing",
    body: "Payment Processing: All payments are processed securely through Stripe, a PCI-DSS Level 1 certified payment processor. We do not store full credit card information.\n\nPricing: Prices for Paid Services are displayed at checkout in your local currency. Prices may change with 30 days' notice to existing subscribers.\n\nSubscriptions: Subscription plans (monthly, annual) automatically renew until canceled. You may cancel anytime through account settings, but must do so at least 24 hours before renewal to avoid charges.\n\nNo Refunds: All purchases are final and non-refundable once service is delivered. See our Refund Policy for limited exceptions (duplicate charges, service failure, unauthorized transactions).\n\nFree Trials: Free trials (if offered) automatically convert to paid subscriptions unless canceled before trial expiration.\n\nPayment Failures: If payment fails for subscription renewal, we may suspend access to Paid Services. Repeated payment failures may result in account cancellation.\n\nTaxes: You are responsible for all applicable taxes. Taxes will be calculated and added at checkout based on your location."
  },
  {
    title: "8. Disclaimers and Limitation of Liability",
    body: "NOT PROFESSIONAL ADVICE: The Service provides entertainment and self-reflection tools only. Readings and interpretations are NOT:\n- Medical advice or diagnosis\n- Legal advice or counsel\n- Financial or investment advice\n- Psychological or therapeutic treatment\n- Guaranteed predictions of future events\n\nConsult qualified professionals for decisions affecting your health, legal matters, finances, or mental health.\n\nAI Limitations: AI-generated content may contain errors, inconsistencies, or inappropriate responses. We do not guarantee accuracy, completeness, or reliability.\n\nNo Warranties: The Service is provided 'AS IS' and 'AS AVAILABLE' without warranties of any kind, express or implied, including:\n- Merchantability or fitness for particular purpose\n- Non-infringement\n- Uninterrupted or error-free operation\n- Accuracy or reliability of results\n\nLimitation of Liability: To the maximum extent permitted by law:\n- Our total liability is limited to the amount you paid in the last 3 months (or $100, whichever is greater)\n- We are not liable for indirect, incidental, consequential, punitive, or special damages\n- We are not liable for loss of profits, data, goodwill, or opportunities\n- We are not liable for decisions you make based on Service content\n\nForce Majeure: We are not liable for failures due to circumstances beyond our control (natural disasters, wars, pandemics, internet outages, third-party service failures).\n\nJurisdictional Limitations: Some jurisdictions do not allow limitation of liability for certain damages. In such cases, liability is limited to the fullest extent permitted by law."
  },
  {
    title: "9. Third-party Services and Integrations",
    body: "Our Service integrates with third-party services including:\n\n- Stripe: Payment processing (https://stripe.com/legal)\n- Google: OAuth authentication and AdSense advertising (https://policies.google.com)\n- OpenAI: AI model for reading generation (https://openai.com/policies)\n- Supabase: Database and backend infrastructure\n\nThird-party Terms: Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for third-party services.\n\nGoogle AdSense: We display advertisements through Google AdSense. Google may use cookies and tracking technologies to serve personalized ads. You can opt out at https://www.google.com/settings/ads\n\nData Sharing: We may share necessary data with third-party processors as described in our Privacy Policy. We do not sell your personal information.\n\nExternal Links: The Service may contain links to external websites. We are not responsible for the content, accuracy, or practices of external sites."
  },
  {
    title: "10. User Conduct and Community Guidelines",
    body: "Respectful Behavior: Treat all users, staff, and community members with respect. Harassment, hate speech, discrimination, and bullying are strictly prohibited.\n\nCommunity Features: If using forums, comments, or other community features:\n- Keep discussions relevant and constructive\n- Do not share others' private information\n- Report inappropriate content or behavior\n- Follow moderator instructions\n\nFeedback and Suggestions: We welcome feedback, but submission does not create any obligation or confidentiality. We may use suggestions without compensation.\n\nModeration: We reserve the right to remove content, suspend accounts, or ban users who violate these Terms or community standards."
  },
  {
    title: "11. Privacy and Data Protection",
    body: "Your privacy is important to us. Our Privacy Policy (https://destinypal.com/policy/privacy) explains:\n- What information we collect\n- How we use and protect your data\n- Your privacy rights and choices\n- Cookie usage and tracking\n- International data transfers\n- Google AdSense and advertising practices\n\nThe Privacy Policy is incorporated into these Terms by reference. By using the Service, you consent to data collection and processing as described.\n\nData Security: We implement industry-standard security measures, but cannot guarantee absolute security. You are responsible for protecting your account credentials.\n\nData Breach Notification: In the event of a data breach affecting your personal information, we will notify you as required by applicable law."
  },
  {
    title: "12. Termination and Account Deletion",
    body: "Your Right to Terminate: You may delete your account at any time through account settings or by contacting " + CONTACT_EMAIL + "\n\nEffect of Termination:\n- Access to Paid Services ends immediately\n- No refunds for current billing period\n- User Content may be deleted (except as required by law)\n- Some information retained per legal obligations\n\nOur Right to Terminate: We may suspend or terminate your account immediately if:\n- You violate these Terms or applicable laws\n- You engage in fraudulent or abusive behavior\n- Required by law or legal process\n- Service is discontinued\n\nTermination Notice: We will provide advance notice when possible, except for immediate termination due to violations or legal requirements.\n\nSurvival: Sections regarding intellectual property, disclaimers, limitation of liability, and dispute resolution survive termination."
  },
  {
    title: "13. Modifications to Terms and Service",
    body: "Terms Updates: We may modify these Terms at any time. Changes will be effective:\n- Immediately for new users\n- After notice period for existing users:\n  - 7 days for minor changes\n  - 30 days for material changes affecting your rights\n\nNotification: We will notify you of changes via email or prominent Service notice.\n\nAcceptance: Continued use of the Service after the effective date constitutes acceptance of modified Terms. If you disagree, you must stop using the Service.\n\nService Changes: We may:\n- Add, modify, or discontinue features\n- Change pricing for new purchases\n- Temporarily suspend Service for maintenance\n- Permanently discontinue the Service with 60 days' notice\n\nNo Obligation to Maintain: We are not obligated to maintain any specific features or continue the Service indefinitely."
  },
  {
    title: "14. Dispute Resolution and Governing Law",
    body: "Governing Law: These Terms are governed by the laws of the Republic of Korea, without regard to conflict of law principles.\n\nJurisdiction and Venue: Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the Seoul Central District Court, unless mandatory consumer protection laws specify otherwise.\n\nInformal Resolution: Before initiating formal proceedings, please contact us at " + CONTACT_EMAIL + " to attempt good-faith resolution.\n\nClass Action Waiver: To the extent permitted by law, disputes must be brought individually, not as part of class or representative actions.\n\nConsumer Protection: Nothing in these Terms limits your statutory consumer rights under mandatory local law. EU consumers may also bring disputes in their country of residence."
  },
  {
    title: "15. Indemnification",
    body: "You agree to indemnify, defend, and hold harmless DestinyPal, Paul Rhee, and our affiliates, officers, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:\n- Your use or misuse of the Service\n- Your violation of these Terms\n- Your violation of third-party rights\n- Your User Content\n- Your decisions based on Service readings\n\nWe reserve the right to assume exclusive defense of any matter subject to indemnification, at your expense."
  },
  {
    title: "16. Miscellaneous Provisions",
    body: "Entire Agreement: These Terms, together with the Privacy Policy and Refund Policy, constitute the entire agreement between you and DestinyPal.\n\nSeverability: If any provision is found unenforceable, the remaining provisions remain in full force.\n\nWaiver: Failure to enforce any right does not constitute waiver of that right.\n\nAssignment: You may not assign these Terms. We may assign our rights and obligations to any party without notice.\n\nNo Agency: These Terms do not create any partnership, joint venture, employment, or agency relationship.\n\nLanguage: These Terms are provided in multiple languages for convenience. The English version prevails in case of conflict.\n\nHeadings: Section headings are for convenience only and do not affect interpretation.\n\nContact: For questions about these Terms, contact " + CONTACT_EMAIL
  },
  {
    title: "17. Contact Information",
    body: `Service Operator: ${OPERATOR}\nEmail: ${CONTACT_EMAIL}\nWebsite: https://destinypal.com\n\nFor specific inquiries:\n- Terms of Service questions: ${CONTACT_EMAIL}\n- Privacy concerns: ${CONTACT_EMAIL}\n- Billing issues: ${CONTACT_EMAIL}\n- Technical support: ${CONTACT_EMAIL}\n- Report abuse: ${CONTACT_EMAIL}\n\nResponse Time: We aim to respond to all inquiries within 48 hours (business days).\n\nMailing Address: Available upon request for legal purposes.\n\nLast Updated: 2025-01-01\n\nBy using DestinyPal, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.`
  },
];

const base = {
  title: "Terms of Service",
  effective: "Effective date: 2025-01-01",
  sections,
  footer: "Addendum: Effective 2025-01-01",
};

const termsData: Record<Locale, typeof base> = {
  en: base,
  ko: base,
  zh: base,
  ar: base,
  es: base,
};

function SectionView({ s }: { s: Section }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{s.title}</h2>
      <pre className={styles.sectionBody}>{s.body}</pre>
    </section>
  );
}

export default function TermsPage() {
  const { locale } = useI18n();
  const L = termsData[asLocale(locale)];
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{L.title}</h1>
            <p className={styles.effectiveDate}>{L.effective}</p>
          </div>
          <div className={styles.content}>
            {L.sections.map((s: Section, i: number) => (
              <SectionView key={`${s.title}-${i}`} s={s} />
            ))}
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>{L.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
