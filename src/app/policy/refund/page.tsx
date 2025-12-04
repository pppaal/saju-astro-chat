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

const PSP_NAME = "Stripe";
const CONTACT_EMAIL = "rheeco88@gmail.com";

const sections: Section[] = [
  {
    title: "1. Overview",
    body: `This Refund and Payment Policy governs all purchases made through DestinyPal. By making a purchase, you agree to these terms. All payments are processed securely through ${PSP_NAME}, a PCI-DSS Level 1 certified payment processor.`
  },
  {
    title: "2. Payment Methods and Processing",
    body: `Accepted Payment Methods: Credit cards (Visa, MasterCard, American Express), debit cards, and other payment methods supported by ${PSP_NAME}\n\nPayment Security: All payment information is processed and stored by ${PSP_NAME}. We never store full credit card numbers on our servers\n\nPricing: All prices are displayed in your local currency at checkout. Prices include applicable taxes unless otherwise stated\n\nBilling Cycles: Subscription billing cycles (monthly, annual) are clearly displayed at checkout and in your account settings\n\nPayment Confirmation: You will receive email confirmation for all successful transactions`
  },
  {
    title: "3. NO REFUND POLICY - Digital Services",
    body: "IMPORTANT: All purchases of digital services, readings, and content are FINAL and NON-REFUNDABLE once the service has been delivered or access has been granted.\n\nThis includes but is not limited to:\n- Astrology readings and charts\n- Saju (Four Pillars) analysis\n- Tarot readings\n- Destiny Map services\n- Dream interpretations\n- Numerology reports\n- Compatibility analyses\n- Any other divination or reading services\n- Subscription fees (monthly or annual)\n- Premium features and add-ons\n\nReason for No Refunds: Our services involve immediate delivery of digital content and personalized AI-generated interpretations. Once you receive your reading or gain access to premium features, the service has been fully rendered.\n\nBy completing your purchase, you acknowledge and agree that:\n1. You understand the nature of the digital service being purchased\n2. You waive any right of withdrawal or refund once service delivery begins\n3. Access to the service constitutes complete delivery of the purchased item"
  },
  {
    title: "4. Exceptions - Limited Refund Cases",
    body: `Refunds will ONLY be issued in the following exceptional circumstances:\n\nDuplicate Charges: If you were charged multiple times for the same transaction due to a technical error\n\nUnauthorized Transactions: If your payment method was used without your authorization (subject to verification and fraud investigation)\n\nService Failure: If we completely fail to deliver the purchased service due to technical issues on our end, and the issue cannot be resolved within 48 hours\n\nProcessing Time: Approved refunds will be processed within 7-10 business days and credited to your original payment method\n\nTo Request a Refund: Contact ${CONTACT_EMAIL} with:\n- Your account email address\n- Transaction ID or receipt\n- Detailed explanation of the qualifying issue\n- Supporting documentation (if applicable)\n\nWe reserve the right to deny refund requests that do not meet the above criteria.`
  },
  {
    title: "5. Subscriptions and Auto-Renewal",
    body: "Automatic Renewal: All subscriptions automatically renew at the end of each billing period unless canceled\n\nCancellation Policy: You may cancel your subscription at any time through your account settings. Cancellation must be completed at least 24 hours before the next renewal date to avoid being charged\n\nNo Partial Refunds: Canceling a subscription does not entitle you to a refund for the current billing period. You will retain access until the end of the paid period\n\nRenewal Notifications: We will send email reminders before your subscription renews (at least 7 days in advance)\n\nPrice Changes: If subscription prices increase, existing subscribers will be notified at least 30 days in advance. The new price applies from the next renewal date"
  },
  {
    title: "6. Chargebacks and Disputes",
    body: "Chargeback Policy: If you initiate a chargeback or payment dispute with your bank without first contacting us, we reserve the right to:\n- Immediately suspend or terminate your account\n- Deny future service access\n- Pursue legal remedies for fraudulent chargebacks\n\nDispute Resolution: Please contact us first at " + CONTACT_EMAIL + " if you have any billing concerns. We are committed to resolving issues fairly and promptly\n\nFraud Prevention: We actively monitor for fraudulent transactions. Suspected fraudulent activity may result in account suspension and referral to law enforcement"
  },
  {
    title: "7. Free Trials and Promotional Offers",
    body: "Trial Periods: Free trials (if offered) automatically convert to paid subscriptions unless canceled before the trial ends\n\nPromo Code Terms: Promotional discounts and coupon codes are subject to specific terms and expiration dates. They cannot be combined unless explicitly stated\n\nTrial Cancellation: You may cancel during the trial period without charge. Failure to cancel before trial expiration results in automatic billing"
  },
  {
    title: "8. Taxes and Additional Fees",
    body: "Sales Tax: Applicable sales tax, VAT, GST, or other statutory taxes will be calculated and added at checkout based on your location\n\nCurrency Conversion: If your bank or card issuer charges currency conversion fees, those are your responsibility\n\nTransaction Fees: We do not charge additional transaction fees. However, your payment provider may impose their own fees"
  },
  {
    title: "9. Price Changes",
    body: "Right to Modify Prices: We reserve the right to change service prices at any time\n\nAdvance Notice: Existing subscribers will receive at least 30 days' notice of price increases\n\nEffective Date: Price changes apply to new purchases immediately and to renewals after the notice period\n\nNo Retroactive Changes: Price changes do not affect already-completed transactions"
  },
  {
    title: "10. Account Credits and Virtual Currency",
    body: "Non-Refundable Credits: Any account credits, virtual currency, or prepaid balances are non-refundable and have no cash value\n\nExpiration: Credits may expire according to terms disclosed at the time of issuance\n\nTransferability: Account credits are non-transferable and may not be sold or gifted to other users"
  },
  {
    title: "11. Consumer Rights and Legal Compliance",
    body: "Jurisdiction-Specific Rights: This policy is designed to comply with applicable consumer protection laws. However, some jurisdictions may grant additional rights that cannot be waived:\n\nEU Consumers: While EU law typically provides a 14-day withdrawal right for online purchases, this right does not apply to digital content that has been fully delivered with your consent\n\nKorean Consumers: Korean consumer protection law allows withdrawal within 7 days for distance sales, except for digital content that has been used or delivered\n\nUS Consumers: Consumer protection laws vary by state. This policy complies with applicable state regulations\n\nNothing in this policy limits your statutory consumer rights under mandatory local law."
  },
  {
    title: "12. Contact and Support",
    body: `For billing questions, payment issues, or refund requests (in qualifying circumstances):\n\nEmail: ${CONTACT_EMAIL}\nResponse Time: We aim to respond within 48 hours (business days)\nRequired Information: Include your account email, transaction ID/receipt, and detailed description of the issue\n\nPayment Processor: For payment processing questions, you may also contact ${PSP_NAME} support directly\n\nDocumentation: Keep your transaction receipts and confirmation emails for your records`
  },
];

const base = {
  title: "Refunds and Billing Policy",
  effective: "Effective date: 2025-01-01",
  sections,
  footer: "Addendum: Effective 2025-01-01",
};

const refundsData: Record<Locale, typeof base> = {
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

export default function RefundPage() {
  const { locale } = useI18n();
  const L = refundsData[asLocale(locale)];
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
