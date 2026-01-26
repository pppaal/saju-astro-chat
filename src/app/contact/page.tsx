"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "./contact.module.css";

const CONTACT_EMAIL = "rheeco88@gmail.com";

const INQUIRY_TYPES_KO = [
  { label: "일반 문의", description: "서비스 이용 관련 질문" },
  { label: "기술 지원", description: "오류나 버그 신고" },
  { label: "결제 문의", description: "구독 및 환불 관련" },
  { label: "피드백", description: "서비스 개선 제안" },
  { label: "제휴 문의", description: "비즈니스 협력 제안" },
];

const INQUIRY_TYPES_EN = [
  { label: "General", description: "Questions about using the service" },
  { label: "Technical Support", description: "Bug reports and errors" },
  { label: "Billing", description: "Subscription and refund inquiries" },
  { label: "Feedback", description: "Service improvement suggestions" },
  { label: "Partnership", description: "Business collaboration proposals" },
];

export default function ContactPage() {
  const { locale } = useI18n();
  const isKorean = locale === "ko";
  const inquiryTypes = isKorean ? INQUIRY_TYPES_KO : INQUIRY_TYPES_EN;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{isKorean ? "문의하기" : "Contact Us"}</h1>
            <p className={styles.subtitle}>
              {isKorean ? "궁금한 점이나 피드백을 보내주세요" : "Send us your questions or feedback"}
            </p>
          </div>
          <div className={styles.content}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? "이메일" : "Email"}</h2>
              <p className={styles.sectionBody}>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className={styles.emailLink}
                  aria-label={isKorean ? `이메일 보내기: ${CONTACT_EMAIL}` : `Send email to ${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? "문의 유형" : "Inquiry Types"}</h2>
              <ul className={styles.inquiryList}>
                {inquiryTypes.map((type, index) => (
                  <li key={index}>
                    <strong>{type.label}</strong>: {type.description}
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? "응답 시간" : "Response Time"}</h2>
              <p className={styles.sectionBody}>
                {isKorean
                  ? "영업일 기준 48시간 내 답변드립니다."
                  : "We aim to respond within 48 business hours."}
              </p>
            </section>
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {isKorean
                ? "DestinyPal을 이용해 주셔서 감사합니다."
                : "Thank you for using DestinyPal."}
            </p>
          </div>
        </div>
      </div>
      <ScrollToTop label={isKorean ? "맨 위로" : "Top"} />
    </div>
  );
}
