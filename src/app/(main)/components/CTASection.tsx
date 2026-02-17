import Link from 'next/link'

type CSSModule = Record<string, string>

interface CTASectionProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
}

export default function CTASection({ translate, styles }: CTASectionProps) {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaContent}>
        <h2 className={styles.ctaTitle}>
          {translate('landing.ctaTitle', 'Make better decisions')}
        </h2>
        <p className={styles.ctaSubtitle}>
          {translate('landing.ctaSubtitle', 'AI helps you reflect and choose with confidence.')}
        </p>
        <Link href="/destiny-map" className={styles.ctaButton}>
          {translate('landing.ctaButton', 'Get started ->')}
        </Link>
      </div>
    </section>
  )
}
