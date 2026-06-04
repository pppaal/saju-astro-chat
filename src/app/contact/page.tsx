'use client'

import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { SUPPORT_EMAIL } from '@/lib/config/contact'
import styles from './contact.module.css'

const INQUIRY_TYPES_KO = [
  { tag: '01', label: '일반 문의', description: '서비스 이용 관련 질문' },
  { tag: '02', label: '기술 지원', description: '오류나 버그 신고' },
  { tag: '03', label: '결제·환불', description: '결제 전 환불정책을 먼저 확인해 주세요' },
  { tag: '04', label: '개인정보', description: '개인정보처리방침 §12 의 보호책임자에게 문의' },
  { tag: '05', label: '피드백', description: '서비스 개선 제안' },
  { tag: '06', label: '제휴 문의', description: '비즈니스 협력 제안' },
]

const INQUIRY_TYPES_EN = [
  { tag: '01', label: 'General', description: 'Questions about using the service' },
  { tag: '02', label: 'Technical Support', description: 'Bug reports and errors' },
  { tag: '03', label: 'Billing & Refund', description: 'Please review our Refund Policy first' },
  { tag: '04', label: 'Privacy', description: 'Contact the Privacy Officer listed in Privacy Policy §12' },
  { tag: '05', label: 'Feedback', description: 'Service improvement suggestions' },
  { tag: '06', label: 'Partnership', description: 'Business collaboration proposals' },
]

export default function ContactPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const inquiryTypes = isKo ? INQUIRY_TYPES_KO : INQUIRY_TYPES_EN

  return (
    <div className={styles.container}>
      <div className={styles.wrap}>
        {/* Header */}
        <header className={styles.header}>
          <p className={styles.eyebrow}>DestinyPal · {isKo ? '연락처' : 'Contact'}</p>
          <h1 className={styles.title}>{isKo ? '말을 건네 주세요' : 'Get in touch'}</h1>
          <p className={styles.subtitle}>
            {isKo
              ? '궁금한 점이나 의견을 이메일로 보내 주세요. 영업일 기준 2일 안에 답변드리도록 노력합니다.'
              : 'Send your questions or feedback by email. We aim to respond within two business days.'}
          </p>
        </header>

        {/* Primary email card */}
        <section className={styles.emailCard} aria-labelledby="contact-email-heading">
          <span className={styles.emailIcon} aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 7l9 6 9-6M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7a2 2 0 012-2h14a2 2 0 012 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p id="contact-email-heading" className={styles.emailLabel}>
            {isKo ? '이메일' : 'Email'}
          </p>
          <a
            className={styles.emailLink}
            href={`mailto:${SUPPORT_EMAIL}`}
            aria-label={isKo ? `이메일 보내기: ${SUPPORT_EMAIL}` : `Send email to ${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          <p className={styles.emailHint}>
            {isKo
              ? '제목에 문의 유형을 적어 주시면 빠르게 도와드릴 수 있어요.'
              : 'Mention the inquiry type in the subject line so we can help faster.'}
          </p>
        </section>

        {/* Quick info grid — response time + privacy timeline */}
        <div className={styles.grid}>
          <div className={styles.tile}>
            <p className={styles.tileLabel}>{isKo ? '응답 시간' : 'Response time'}</p>
            <h3 className={styles.tileTitle}>{isKo ? '영업일 2일 내' : 'Within 2 business days'}</h3>
            <p className={styles.tileBody}>
              {isKo
                ? '평일 기준이며, 주말·공휴일은 다음 영업일에 회신합니다.'
                : 'On weekdays. Replies to weekend or holiday inquiries arrive the next business day.'}
            </p>
          </div>
          <div className={styles.tile}>
            <p className={styles.tileLabel}>{isKo ? '개인정보 문의' : 'Privacy requests'}</p>
            <h3 className={styles.tileTitle}>{isKo ? '법정 10일 이내' : 'Within 10 days'}</h3>
            <p className={styles.tileBody}>
              {isKo
                ? '개인정보 보호법에 따라 개인정보 관련 요청은 10일 이내 회신합니다.'
                : 'Per the Korean Personal Information Protection Act, privacy-related requests are answered within 10 days.'}
            </p>
          </div>
        </div>

        {/* Inquiry types */}
        <section className={styles.section} aria-labelledby="contact-inquiry-heading">
          <div className={styles.sectionHead}>
            <h2 id="contact-inquiry-heading" className={styles.sectionTitle}>
              {isKo ? '문의 유형' : 'Inquiry types'}
            </h2>
            <span className={styles.sectionMeta}>06 · {isKo ? '카테고리' : 'Categories'}</span>
          </div>
          <ul className={styles.inquiryList}>
            {inquiryTypes.map((type) => (
              <li key={type.tag} className={styles.inquiryItem}>
                <span className={styles.inquiryBullet} aria-hidden>
                  {type.tag}
                </span>
                <div className={styles.inquiryText}>
                  <p className={styles.inquiryLabel}>{type.label}</p>
                  <p className={styles.inquiryDesc}>{type.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Related policies */}
        <section className={styles.section} aria-labelledby="contact-policy-heading">
          <div className={styles.sectionHead}>
            <h2 id="contact-policy-heading" className={styles.sectionTitle}>
              {isKo ? '관련 정책' : 'Related policies'}
            </h2>
            <span className={styles.sectionMeta}>{isKo ? '먼저 살펴보기' : 'Try first'}</span>
          </div>
          <div className={styles.linkRow}>
            <Link href="/faq" className={styles.policyLink}>
              <span>{isKo ? '자주 묻는 질문 (FAQ)' : 'Frequently Asked Questions'}</span>
              <span className={styles.policyLinkArrow} aria-hidden>
                →
              </span>
            </Link>
            <Link href="/policy/refund" className={styles.policyLink}>
              <span>{isKo ? '환불 정책' : 'Refund Policy'}</span>
              <span className={styles.policyLinkArrow} aria-hidden>
                →
              </span>
            </Link>
            <Link href="/policy/privacy" className={styles.policyLink}>
              <span>{isKo ? '개인정보처리방침' : 'Privacy Policy'}</span>
              <span className={styles.policyLinkArrow} aria-hidden>
                →
              </span>
            </Link>
            <Link href="/policy/terms" className={styles.policyLink}>
              <span>{isKo ? '이용약관 · 사업자 정보' : 'Terms · Business info'}</span>
              <span className={styles.policyLinkArrow} aria-hidden>
                →
              </span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            {isKo
              ? '시간을 내어 주셔서 감사합니다.'
              : 'Thank you for taking the time to reach out.'}
          </p>
        </footer>
      </div>

      <ScrollToTop label={isKo ? '맨 위로' : 'Top'} />
    </div>
  )
}
