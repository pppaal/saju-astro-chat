'use client'

import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { SUPPORT_EMAIL } from '@/lib/config/contact'
import styles from './contact.module.css'

const INQUIRY_TYPES_KO = [
  { label: '일반 문의', description: '서비스 이용 관련 질문' },
  { label: '기술 지원', description: '오류나 버그 신고' },
  { label: '결제·환불', description: '결제 전 환불정책을 먼저 확인해 주세요' },
  { label: '개인정보', description: '개인정보처리방침 §12 의 보호책임자에게 문의' },
  { label: '피드백', description: '서비스 개선 제안' },
  { label: '제휴 문의', description: '비즈니스 협력 제안' },
]

const INQUIRY_TYPES_EN = [
  { label: 'General', description: 'Questions about using the service' },
  { label: 'Technical Support', description: 'Bug reports and errors' },
  { label: 'Billing & Refund', description: 'Please review our Refund Policy first' },
  { label: 'Privacy', description: 'Contact the Privacy Officer listed in Privacy Policy §12' },
  { label: 'Feedback', description: 'Service improvement suggestions' },
  { label: 'Partnership', description: 'Business collaboration proposals' },
]

export default function ContactPage() {
  const { locale } = useI18n()
  const isKorean = locale === 'ko'
  const inquiryTypes = isKorean ? INQUIRY_TYPES_KO : INQUIRY_TYPES_EN

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>{isKorean ? '문의하기' : 'Contact Us'}</h1>
            <p className={styles.subtitle}>
              {isKorean
                ? '궁금한 점이나 피드백을 보내주세요'
                : 'Send us your questions or feedback'}
            </p>
          </div>
          <div className={styles.content}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? '이메일' : 'Email'}</h2>
              <p className={styles.sectionBody}>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={styles.emailLink}
                  aria-label={
                    isKorean ? `이메일 보내기: ${SUPPORT_EMAIL}` : `Send email to ${SUPPORT_EMAIL}`
                  }
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? '문의 유형' : 'Inquiry Types'}</h2>
              <ul className={styles.inquiryList}>
                {inquiryTypes.map((type, index) => (
                  <li key={index}>
                    <strong>{type.label}</strong>: {type.description}
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? '응답 시간' : 'Response Time'}</h2>
              <p className={styles.sectionBody}>
                {isKorean
                  ? '영업일 기준 2일 내 답변드리도록 노력합니다. 개인정보 관련 요청은 개인정보 보호법에 따라 10일 이내 회신합니다.'
                  : 'We aim to respond within 2 business days. Privacy-related requests are handled within 10 days per the Korean Personal Information Protection Act.'}
              </p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{isKorean ? '관련 정책' : 'Related Policies'}</h2>
              <p className={styles.sectionBody}>
                {isKorean
                  ? '사업자 정보(대표자·사업자등록번호·통신판매업 신고번호)는 이용약관 하단에서 확인하실 수 있어요.'
                  : 'Business information (operator, registration numbers) is listed at the bottom of the Terms of Service.'}
              </p>
              <ul className={styles.inquiryList}>
                <li>
                  <Link href="/policy/terms">
                    {isKorean ? '이용약관 (사업자 정보 포함)' : 'Terms of Service (business info)'}
                  </Link>
                </li>
                <li>
                  <Link href="/policy/privacy">
                    {isKorean
                      ? '개인정보처리방침 (보호책임자·권익침해 신고)'
                      : 'Privacy Policy (Privacy Officer & complaints)'}
                  </Link>
                </li>
                <li>
                  <Link href="/policy/refund">{isKorean ? '환불 정책' : 'Refund Policy'}</Link>
                </li>
                <li>
                  <Link href="/faq">{isKorean ? '자주 묻는 질문' : 'FAQ'}</Link>
                </li>
              </ul>
            </section>
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {isKorean
                ? 'DestinyPal을 이용해 주셔서 감사합니다.'
                : 'Thank you for using DestinyPal.'}
            </p>
          </div>
        </div>
      </div>
      <ScrollToTop label={isKorean ? '맨 위로' : 'Top'} />
    </div>
  )
}
