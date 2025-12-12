"use client";

import { useI18n } from "@/i18n/I18nProvider";
import BackButton from "@/components/ui/BackButton";
import styles from "../policy/policy.module.css";

const CONTACT_EMAIL = "rheeco88@gmail.com";

export default function ContactPage() {
  const { locale } = useI18n();
  const isKorean = locale === "ko";

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.backButtonContainer}>
          <BackButton />
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{isKorean ? "문의하기" : "Contact Us"}</h1>
            <p className={styles.effectiveDate}>
              {isKorean ? "궁금한 점이나 피드백을 보내주세요" : "Send us your questions or feedback"}
            </p>
          </div>
          <div className={styles.content}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? "이메일" : "Email"}</h2>
              <p className={styles.sectionBody} style={{ whiteSpace: "pre-wrap" }}>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  style={{ color: "#60a5fa", textDecoration: "underline", fontSize: "1.1rem" }}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? "문의 유형" : "Inquiry Types"}</h2>
              <pre className={styles.sectionBody}>
{isKorean
  ? `• 일반 문의: 서비스 이용 관련 질문
• 기술 지원: 오류나 버그 신고
• 결제 문의: 구독 및 환불 관련
• 피드백: 서비스 개선 제안
• 제휴 문의: 비즈니스 협력 제안`
  : `• General: Questions about using the service
• Technical Support: Bug reports and errors
• Billing: Subscription and refund inquiries
• Feedback: Service improvement suggestions
• Partnership: Business collaboration proposals`}
              </pre>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? "응답 시간" : "Response Time"}</h2>
              <p className={styles.sectionBody} style={{ whiteSpace: "pre-wrap" }}>
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
    </div>
  );
}
