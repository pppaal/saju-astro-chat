"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import ScrollToTop from "@/components/ui/ScrollToTop";
import styles from "./faq.module.css";

interface FaqItem {
  q: string;
  qKo: string;
  a: string;
  aKo: string;
  icon: string;
}

const faqs: FaqItem[] = [
  {
    icon: "🎯",
    q: "How accurate is DestinyPal?",
    qKo: "DestinyPal은 얼마나 정확한가요?",
    a: "We combine Saju (Four Pillars), Western Astrology, Tarot, and advanced AI to provide integrated readings. Our Destiny Fusion Matrix™ cross-references Eastern and Western systems for deeper insights. Remember, this is guidance for self-reflection—not a substitute for professional advice.",
    aKo: "사주, 서양 점성술, 타로, 그리고 고급 AI를 결합하여 통합 리딩을 제공합니다. Destiny Fusion Matrix™가 동서양 체계를 교차 참조하여 더 깊은 통찰을 제공합니다. 이는 자기 성찰을 위한 가이드이며, 전문적인 조언을 대체하지 않습니다.",
  },
  {
    icon: "📚",
    q: "Can I access my previous readings?",
    qKo: "이전 리딩을 다시 볼 수 있나요?",
    a: "Yes! Log in to your account and visit 'My Journey' to see all your saved readings, insights, and personal growth history. Premium members enjoy unlimited storage.",
    aKo: "네! 계정에 로그인한 후 'My Journey'에서 저장된 모든 리딩, 인사이트, 성장 기록을 확인할 수 있습니다. 프리미엄 회원은 무제한 저장이 가능합니다.",
  },
  {
    icon: "🔒",
    q: "Is my data secure?",
    qKo: "제 데이터는 안전한가요?",
    a: "Absolutely. We store only what's needed, encrypt all sensitive data with industry-standard protocols (AES-256), and never share your information without explicit consent. Payment processing is handled securely through Stripe (PCI-DSS Level 1 certified).",
    aKo: "물론입니다. 필요한 데이터만 저장하고, 모든 민감한 데이터는 산업 표준 프로토콜(AES-256)로 암호화합니다. 명시적 동의 없이는 정보를 공유하지 않으며, 결제는 Stripe(PCI-DSS Level 1 인증)를 통해 안전하게 처리됩니다.",
  },
  {
    icon: "🔮",
    q: "How often should I get a reading?",
    qKo: "리딩은 얼마나 자주 받는 게 좋나요?",
    a: "It depends on your needs! Daily readings work well for general guidance. For deeper questions about life changes, career, or relationships, weekly or monthly consultations may be more meaningful. Trust your intuition.",
    aKo: "필요에 따라 다릅니다! 일상적인 가이드로는 매일 리딩이 좋습니다. 인생 변화, 커리어, 관계에 대한 깊은 질문은 주간 또는 월간 상담이 더 의미 있을 수 있습니다. 직감을 믿으세요.",
  },
  {
    icon: "💳",
    q: "What payment methods are accepted?",
    qKo: "어떤 결제 방법을 지원하나요?",
    a: "We accept all major credit/debit cards (Visa, Mastercard, AMEX) through Stripe. Local payment methods may be available depending on your region. All transactions are secure and encrypted.",
    aKo: "Stripe를 통해 모든 주요 신용/체크카드(Visa, Mastercard, AMEX)를 지원합니다. 지역에 따라 현지 결제 방법도 사용 가능할 수 있습니다. 모든 거래는 안전하게 암호화됩니다.",
  },
  {
    icon: "🔄",
    q: "Can I get a refund?",
    qKo: "환불받을 수 있나요?",
    a: "Credit packs are refundable within 7 days if completely unused. Subscriptions have a 7-day guarantee for first-time subscribers. AI readings are non-refundable once generated. See our Refund Policy for details.",
    aKo: "크레딧 팩은 완전히 미사용 상태로 7일 이내 환불 가능합니다. 구독은 최초 가입자에게 7일 보장이 있습니다. AI 리딩은 생성 후 환불 불가입니다. 자세한 내용은 환불 정책을 참조하세요.",
  },
  {
    icon: "🌟",
    q: "What's the difference between free and premium?",
    qKo: "무료와 프리미엄의 차이는 무엇인가요?",
    a: "Free users get limited daily readings. Premium subscribers enjoy unlimited readings, advanced Destiny Map analysis, priority AI responses, reading history storage, and exclusive features like compatibility reports.",
    aKo: "무료 사용자는 제한된 일일 리딩을 받습니다. 프리미엄 구독자는 무제한 리딩, 고급 Destiny Map 분석, 우선 AI 응답, 리딩 기록 저장, 궁합 리포트 같은 독점 기능을 즐길 수 있습니다.",
  },
  {
    icon: "🌍",
    q: "Is DestinyPal available in my language?",
    qKo: "DestinyPal은 어떤 언어를 지원하나요?",
    a: "Currently we fully support English and Korean. AI responses can understand and respond in many languages. We're continuously expanding language support.",
    aKo: "현재 영어와 한국어를 완벽히 지원합니다. AI 응답은 다양한 언어를 이해하고 답변할 수 있습니다. 지속적으로 언어 지원을 확대하고 있습니다.",
  },
];

function FaqAccordion({ item, isOpen, onClick, isKo }: {
  item: FaqItem;
  isOpen: boolean;
  onClick: () => void;
  isKo: boolean;
}) {
  return (
    <div className={`${styles.accordion} ${isOpen ? styles.open : ""}`}>
      <button className={styles.accordionHeader} onClick={onClick}>
        <span className={styles.accordionIcon}>{item.icon}</span>
        <span className={styles.accordionQuestion}>{isKo ? item.qKo : item.q}</span>
        <span className={styles.accordionToggle}>{isOpen ? "−" : "+"}</span>
      </button>
      <div className={styles.accordionContent}>
        <p className={styles.accordionAnswer}>{isKo ? item.aKo : item.a}</p>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const { locale } = useI18n();
  const isKo = locale === "ko";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className={styles.container}>
      <div className={styles.backgroundGlow} />

      <div className={styles.backButtonContainer}>
        <Link href="/" className={styles.backButton}>
          <span className={styles.backArrow}>←</span>
          <span>{isKo ? "홈으로" : "Home"}</span>
        </Link>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroIcon}>?</div>
        <p className={styles.eyebrow}>DestinyPal FAQ</p>
        <h1 className={styles.title}>
          {isKo ? "자주 묻는 질문" : "Frequently Asked Questions"}
        </h1>
        <p className={styles.subtitle}>
          {isKo
            ? "궁금한 점이 있으시면 아래에서 찾아보세요"
            : "Find answers to common questions below"}
        </p>
      </section>

      <section className={styles.faqSection}>
        {faqs.map((item, idx) => (
          <FaqAccordion
            key={idx}
            item={item}
            isOpen={openIndex === idx}
            onClick={() => handleToggle(idx)}
            isKo={isKo}
          />
        ))}
      </section>

      <section className={styles.contactSection}>
        <div className={styles.contactCard}>
          <div className={styles.contactIcon}>💬</div>
          <h3 className={styles.contactTitle}>
            {isKo ? "더 궁금한 점이 있으신가요?" : "Still have questions?"}
          </h3>
          <p className={styles.contactDesc}>
            {isKo
              ? "언제든지 문의해 주세요. 48시간 내 답변드립니다."
              : "Feel free to reach out. We respond within 48 hours."}
          </p>
          <Link href="/contact" className={styles.contactButton}>
            {isKo ? "문의하기" : "Contact Us"}
          </Link>
        </div>
      </section>

      <ScrollToTop label={isKo ? "맨 위로" : "Top"} />
    </main>
  );
}
