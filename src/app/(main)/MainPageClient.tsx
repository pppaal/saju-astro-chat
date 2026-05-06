'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { useEffect, useState } from 'react'
import styles from './main-page.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from '@/i18n/utils'
import { ParticleCanvas } from './components'
import PrefetchLinks from '@/components/PrefetchLinks'
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher'
import SideDrawer from './components/SideDrawer'
import HomeChatInput from './components/HomeChatInput'
import RecommendationChips from './components/RecommendationChips'
import ServicesRail from './components/ServicesRail'
import BirthInfoModal from './components/BirthInfoModal'
import { getStoredBirthInfo, type StoredBirthInfo } from './birthInfoStorage'

type Locale = 'en' | 'ko'

interface MainPageClientProps {
  initialLocale: Locale
  initialMessages: I18nMessages
}

export default function MainPageClient({ initialLocale, initialMessages }: MainPageClientProps) {
  const { locale: activeLocale, hydrated, t } = useI18n()
  const locale = (activeLocale || initialLocale) as Locale
  void t

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [birthModalOpen, setBirthModalOpen] = useState(false)
  const [birthInfo, setBirthInfo] = useState<StoredBirthInfo | null>(null)

  // Hydrate birth info from localStorage after mount.
  useEffect(() => {
    setBirthInfo(getStoredBirthInfo())
  }, [])

  // Initial-server-message helpers retained for parity with other pages,
  // but the home screen now leans on the LanguageSwitcher / inline locale
  // checks instead of a translate() helper. Keep for future copy needs.
  void getPathValue
  void isPlaceholderTranslation
  void toSafeFallbackText
  void initialMessages
  void hydrated
  void t

  const handleSaved = (info: StoredBirthInfo) => {
    setBirthInfo(info)
    setBirthModalOpen(false)
  }

  return (
    <main className={`${styles.container} ${styles.homeContainer}`}>
      <ParticleCanvas />

      <div className={styles.homeTopBar}>
        <button
          type="button"
          className={styles.homeTopBarHamburger}
          onClick={() => setDrawerOpen(true)}
          aria-label={locale === 'ko' ? '메뉴 열기' : 'Open menu'}
        >
          <span className={styles.homeTopBarHamburgerBar} />
          <span className={styles.homeTopBarHamburgerBar} />
          <span className={styles.homeTopBarHamburgerBar} />
        </button>
        <span className={styles.homeTopBarLogo}>DestinyPal</span>
        <div className={styles.homeTopBarRight}>
          <LanguageSwitcher />
        </div>
      </div>

      <div className={styles.homeBody}>
        <section className={styles.homeHero} aria-labelledby="home-headline">
          <div className={styles.homeOrnament} aria-hidden="true">
            ✦
          </div>
          <h1 id="home-headline" className={styles.homeHeadline}>
            {locale === 'ko' ? 'AI와 사주·점성을 함께 풀어드려요' : 'Saju × Astrology, fused by AI'}
          </h1>
          <p className={styles.homeSubline}>
            {locale === 'ko'
              ? '사주 · 점성 · 캘린더 · 타로 · 궁합'
              : 'Saju · Astrology · Calendar · Tarot · Compatibility'}
          </p>
        </section>

        <ServicesRail
          birthInfo={birthInfo}
          onOpenBirthModal={() => setBirthModalOpen(true)}
          locale={locale}
        />

        <RecommendationChips
          birthInfo={birthInfo}
          onOpenBirthModal={() => setBirthModalOpen(true)}
          locale={locale}
        />

        <HomeChatInput
          birthInfo={birthInfo}
          onOpenBirthModal={() => setBirthModalOpen(true)}
          locale={locale}
        />
      </div>

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={locale}
        birthInfo={birthInfo}
      />

      <BirthInfoModal
        open={birthModalOpen}
        initial={birthInfo}
        onClose={() => setBirthModalOpen(false)}
        onSaved={handleSaved}
      />

      <PrefetchLinks />
      <SpeedInsights />
    </main>
  )
}
