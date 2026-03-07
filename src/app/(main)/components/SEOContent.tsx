import Link from 'next/link'

type CSSModule = Record<string, string>

interface SEOContentProps {
  translate: (key: string, fallback: string) => string
  styles: CSSModule
}

export default function SEOContent({ translate, styles }: SEOContentProps) {
  const serviceLinks = [
    {
      href: '/destiny-map',
      title: translate('landing.seo.destinyMapTitle', 'Destiny Map'),
      description: translate(
        'landing.seo.destinyMapDesc',
        'Integrated Saju and astrology guidance for core tendencies, timing, and major decisions.'
      ),
    },
    {
      href: '/tarot',
      title: translate('landing.seo.tarotShortTitle', 'AI Tarot Reading'),
      description: translate(
        'landing.seo.tarotShortDesc',
        'Ask focused questions about love, work, and next steps through spread-based tarot interpretation.'
      ),
    },
    {
      href: '/calendar',
      title: translate('landing.seo.calendarShortTitle', 'Destiny Calendar'),
      description: translate(
        'landing.seo.calendarShortDesc',
        'Daily timing guidance, strong windows, caution windows, and action plans based on your chart.'
      ),
    },
    {
      href: '/compatibility',
      title: translate('landing.seo.compatibilityShortTitle', 'Compatibility'),
      description: translate(
        'landing.seo.compatibilityShortDesc',
        'Relationship analysis for attraction, communication, routine friction, and long-term fit.'
      ),
    },
    {
      href: '/premium-reports',
      title: translate('landing.seo.reportsShortTitle', 'AI Reports'),
      description: translate(
        'landing.seo.reportsShortDesc',
        'Free and premium reports that turn destiny signals into readable narrative and concrete guidance.'
      ),
    },
    {
      href: '/blog',
      title: translate('landing.seo.blogShortTitle', 'Guides and Insights'),
      description: translate(
        'landing.seo.blogShortDesc',
        'Learn how Saju, tarot, astrology, and timing systems work with practical articles and examples.'
      ),
    },
  ]

  const faqItems = [
    {
      question: translate('landing.seo.faq1q', 'What is DestinyPal?'),
      answer: translate(
        'landing.seo.faq1a',
        'DestinyPal is an AI fortune platform that connects Saju, astrology, tarot, compatibility, and timing tools into one practical reading flow.'
      ),
    },
    {
      question: translate('landing.seo.faq2q', 'What can I do on DestinyPal?'),
      answer: translate(
        'landing.seo.faq2a',
        'You can generate Destiny Map readings, ask tarot questions, check timing through the Destiny Calendar, review compatibility, and read AI reports.'
      ),
    },
    {
      question: translate('landing.seo.faq3q', 'Is DestinyPal only for Korean fortune reading?'),
      answer: translate(
        'landing.seo.faq3a',
        'No. DestinyPal starts from Korean Saju and expands into astrology, tarot, and cross-system interpretation for broader self-understanding.'
      ),
    },
  ]

  return (
    <section className={styles.seoContentSection}>
      <div className={styles.seoContentContainer}>
        <article className={styles.seoArticle}>
          <div className={styles.seoHeader}>
            <h2 className={styles.seoHeading}>
              {translate(
                'landing.seo.whatIsDestinyPal',
                'DestinyPal is the home for AI Saju, Tarot, Astrology, and Timing Guidance'
              )}
            </h2>
            <p className={styles.seoIntro}>
              {translate(
                'landing.seo.intro',
                'DestinyPal helps you move from vague curiosity to concrete guidance. It combines Korean Saju, Western astrology, tarot, compatibility analysis, and AI reports so you can understand your patterns, choose better timing, and make decisions with more context.'
              )}
            </p>
          </div>

          <div className={styles.seoFeatureGrid}>
            {serviceLinks.map((item) => (
              <Link key={item.href} href={item.href} className={styles.seoFeatureCard}>
                <h3 className={styles.seoFeatureTitle}>{item.title}</h3>
                <p className={styles.seoFeatureDesc}>{item.description}</p>
                <span className={styles.seoFeatureLink}>
                  {translate('landing.seo.openService', 'Open service')}
                </span>
              </Link>
            ))}
          </div>

          <div className={styles.seoFaqSection}>
            <h3 className={styles.seoFaqTitle}>
              {translate('landing.seo.faqTitle', 'Frequently asked questions about DestinyPal')}
            </h3>
            <div className={styles.seoFaqList}>
              {faqItems.map((item) => (
                <div key={item.question} className={styles.seoFaqItem}>
                  <h4 className={styles.seoFaqQuestion}>{item.question}</h4>
                  <p className={styles.seoFaqAnswer}>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.seoKeywords}>
            <div className={styles.seoKeywordsHeader}>
              <h4 className={styles.seoKeywordsTitle}>
                {translate('landing.seo.keyTopics', 'Core topics on DestinyPal')}
              </h4>
            </div>
            <p className={styles.seoKeywordsList}>
              {translate(
                'landing.seo.keywordsList',
                'DestinyPal, AI fortune reading, Saju, Korean fortune telling, astrology, tarot, compatibility, destiny map, fortune calendar, timing guide, AI report, relationship analysis, life direction, self-understanding'
              )}
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}
